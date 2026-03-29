import type { CrisisClassification, IncidentType } from "@/lib/crisis/types";

const KEYWORD_MODEL: Record<Exclude<IncidentType, "custom">, string[]> = {
  fire: ["fire", "smoke", "burn", "flame", "explosion", "gas leak"],
  medical: ["injury", "injured", "bleeding", "fainted", "unconscious", "heart", "medical"],
  security: ["theft", "intruder", "weapon", "fight", "violence", "security", "threat"],
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function classifyCrisis(text: string): CrisisClassification {
  const normalized = normalize(text);

  if (!normalized) {
    return {
      type: "custom",
      confidence: 0,
      matchedKeywords: [],
    };
  }

  const tokenHits = Object.entries(KEYWORD_MODEL).map(([type, keywords]) => {
    const hits = keywords.filter((keyword) => normalized.includes(keyword));
    return { type: type as IncidentType, hits };
  });

  const winner = tokenHits.sort((a, b) => b.hits.length - a.hits.length)[0];

  if (!winner || winner.hits.length === 0) {
    return {
      type: "custom",
      confidence: 0.35,
      matchedKeywords: [],
    };
  }

  const confidence = Math.min(0.99, 0.45 + winner.hits.length * 0.18);

  return {
    type: winner.type,
    confidence,
    matchedKeywords: winner.hits,
  };
}
