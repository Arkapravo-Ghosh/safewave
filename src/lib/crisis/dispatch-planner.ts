import "server-only";

import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

import { classifyCrisis } from "@/lib/crisis/classifier";
import type {
  CrisisDispatchPlan,
  DispatchTeamRequirement,
  IncidentType,
  ResponderRole,
} from "@/lib/crisis/types";

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
const MAX_RESPONDERS_PER_ROLE = 4;

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

const ROLE_KEYWORDS: Record<ResponderRole, string[]> = {
  fire: ["fire", "smoke", "flame", "burn", "burning", "gas leak", "explosion"],
  medical: [
    "injury",
    "injured",
    "bleeding",
    "unconscious",
    "medical",
    "fainted",
    "heart",
    "not breathing",
  ],
  security: [
    "intruder",
    "weapon",
    "fight",
    "violence",
    "threat",
    "theft",
    "gun",
    "knife",
    "attack",
  ],
};

const ESCALATION_KEYWORDS: Record<ResponderRole, string[]> = {
  fire: ["apartment", "building", "trapped", "spreading", "thick smoke", "evacuate"],
  medical: ["critical", "severe", "multiple injured", "heavily bleeding", "collapse"],
  security: ["hostage", "armed", "shots", "riot", "ongoing", "aggressive"],
};

const aiPlanSchema = z.object({
  primaryType: z.enum(["medical", "fire", "security", "custom"]),
  confidence: z.number().min(0).max(1),
  summary: z.string().max(260),
  teams: z
    .array(
      z.object({
        role: z.enum(["medical", "fire", "security"]),
        count: z.number().int().min(1).max(MAX_RESPONDERS_PER_ROLE),
        rationale: z.string().max(260),
      })
    )
    .min(1)
    .max(3),
});

let cachedClient: GoogleGenAI | null | undefined;

function clampTeamCount(count: number) {
  return Math.min(MAX_RESPONDERS_PER_ROLE, Math.max(1, Math.round(count)));
}

function extractPeopleCount(text: string) {
  const numericMatch = text.match(/\b(\d{1,2})\s+(people|person|victims?|injured|patients?)\b/);

  if (numericMatch) {
    const value = Number(numericMatch[1]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    const regex = new RegExp(`\\b${word}\\s+(people|person|victims?|injured|patients?)\\b`);
    if (regex.test(text)) {
      return value;
    }
  }

  if (text.includes("multiple people") || text.includes("multiple injured")) {
    return 3;
  }

  return 1;
}

function estimateRoleCount(role: ResponderRole, text: string) {
  let count = 1;

  if (ESCALATION_KEYWORDS[role].some((keyword) => text.includes(keyword))) {
    count += 1;
  }

  const peopleCount = extractPeopleCount(text);

  if (role === "medical" && peopleCount >= 2) {
    count += Math.min(2, Math.ceil(peopleCount / 2) - 1);
  }

  if (role === "fire" && peopleCount >= 4) {
    count += 1;
  }

  if (role === "security" && (peopleCount >= 4 || text.includes("crowd"))) {
    count += 1;
  }

  return clampTeamCount(count);
}

function normalizeTeams(
  teams: DispatchTeamRequirement[],
  fallbackTeams: DispatchTeamRequirement[]
): DispatchTeamRequirement[] {
  const aggregate = new Map<ResponderRole, DispatchTeamRequirement>();

  for (const team of teams) {
    const existing = aggregate.get(team.role);

    if (!existing) {
      aggregate.set(team.role, {
        role: team.role,
        count: clampTeamCount(team.count),
        rationale: team.rationale.trim() || `Dispatch ${team.role} unit`,
      });
      continue;
    }

    existing.count = clampTeamCount(Math.max(existing.count, team.count));

    if (!existing.rationale && team.rationale.trim()) {
      existing.rationale = team.rationale.trim();
    }
  }

  const normalized = [...aggregate.values()];
  return normalized.length > 0 ? normalized : fallbackTeams;
}

function getGeminiClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

function buildRuleBasedPlan(description: string, requestedType?: IncidentType): CrisisDispatchPlan {
  const normalized = description.trim().toLowerCase();
  const classification = classifyCrisis(normalized);

  let primaryType = classification.type;

  if (requestedType && requestedType !== "custom" && classification.confidence < 0.55) {
    primaryType = requestedType;
  }

  const teams: DispatchTeamRequirement[] = [];

  (Object.keys(ROLE_KEYWORDS) as ResponderRole[]).forEach((role) => {
    if (ROLE_KEYWORDS[role].some((keyword) => normalized.includes(keyword))) {
      teams.push({
        role,
        count: estimateRoleCount(role, normalized),
        rationale: `Keyword match indicates ${role} response`,
      });
    }
  });

  if (teams.length === 0) {
    if (primaryType !== "custom") {
      teams.push({
        role: primaryType,
        count: 1,
        rationale: `Primary classification is ${primaryType}`,
      });
    } else {
      teams.push({
        role: "security",
        count: 1,
        rationale: "No clear type; send nearest available responder",
      });
    }
  }

  return {
    primaryType,
    confidence: classification.confidence,
    summary: normalized
      ? "Rule-based dispatch estimate generated"
      : "No details provided; dispatching minimal response",
    teams,
    source: "rules",
  };
}

function buildDispatchPrompt(description: string, requestedType?: IncidentType) {
  const typeHint = requestedType ? `User-supplied type hint: ${requestedType}.` : "No user type hint provided.";

  return [
    "You are an emergency dispatch triage planner.",
    "Analyze the report and decide required responder teams and how many responders per team.",
    "Allowed team roles: fire, medical, security.",
    "Return JSON only and keep counts realistic (1 to 4 per role).",
    "Do not include markdown fences or explanatory text outside the JSON object.",
    "Include multiple roles if the report suggests combined emergencies (for example fire + injuries).",
    "Use security for threats, violence, intrusions, weapons, evacuation/crowd risk, or scene safety support.",
    typeHint,
    `Emergency report: ${description || "No details provided"}`,
  ].join("\n");
}

function supportsNativeJsonMode(modelName: string) {
  const normalized = modelName.toLowerCase();
  return normalized.includes("gemini") && !normalized.includes("gemma");
}

function parseJsonPayload(raw: string) {
  const candidates: string[] = [raw.trim()];

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(raw.slice(firstBrace, lastBrace + 1).trim());
  }

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Keep trying alternate extraction candidates.
    }
  }

  return null;
}

const dispatchResponseSchema = {
  type: Type.OBJECT,
  required: ["primaryType", "confidence", "summary", "teams"],
  properties: {
    primaryType: {
      type: Type.STRING,
      enum: ["medical", "fire", "security", "custom"],
    },
    confidence: {
      type: Type.NUMBER,
      minimum: 0,
      maximum: 1,
    },
    summary: {
      type: Type.STRING,
    },
    teams: {
      type: Type.ARRAY,
      minItems: "1",
      maxItems: "3",
      items: {
        type: Type.OBJECT,
        required: ["role", "count", "rationale"],
        properties: {
          role: {
            type: Type.STRING,
            enum: ["medical", "fire", "security"],
          },
          count: {
            type: Type.INTEGER,
            minimum: 1,
            maximum: MAX_RESPONDERS_PER_ROLE,
          },
          rationale: {
            type: Type.STRING,
          },
        },
      },
    },
  },
};

export async function planIncidentDispatch(input: {
  description: string;
  requestedType?: IncidentType;
}): Promise<CrisisDispatchPlan> {
  const normalizedDescription = input.description.trim();
  const fallback = buildRuleBasedPlan(normalizedDescription, input.requestedType);
  const client = getGeminiClient();

  if (!client || normalizedDescription.length === 0) {
    return fallback;
  }

  try {
    const useNativeJsonMode = supportsNativeJsonMode(GEMINI_MODEL);
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildDispatchPrompt(normalizedDescription, input.requestedType),
      config: useNativeJsonMode
        ? {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: dispatchResponseSchema,
          }
        : {
            temperature: 0.2,
          },
    });

    const raw = response.text?.trim();

    if (!raw) {
      return fallback;
    }

    const payload = parseJsonPayload(raw);

    if (!payload) {
      return fallback;
    }

    const parsed = aiPlanSchema.parse(payload);

    return {
      primaryType: parsed.primaryType,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      summary: parsed.summary.trim() || fallback.summary,
      teams: normalizeTeams(parsed.teams, fallback.teams),
      source: "ai",
    };
  } catch (error) {
    console.error("SafeWave AI dispatch planning failed", error);
    return fallback;
  }
}
