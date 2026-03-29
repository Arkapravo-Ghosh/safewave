import "server-only";

import { and, asc, desc, eq, inArray, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { assignments, incidents, responders } from "@/db/schema";
import { planIncidentDispatch } from "@/lib/crisis/dispatch-planner";
import {
  findResponderByUserId,
  listAvailableResponders,
  pickBestResponder,
  setResponderStatus,
} from "@/lib/crisis/responders";
import type {
  DispatchTeamRequirement,
  IncidentStatus,
  IncidentType,
  IncidentWithDetails,
  ResponderRecord,
  ResponderRole,
} from "@/lib/crisis/types";
import { broadcastRealtime } from "@/lib/realtime/ws-server";

export interface CreateIncidentInput {
  triggerType?: IncidentType;
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  triggeredByUserId?: string;
}

type AssignmentRole = ResponderRole | "any";

interface AssignmentTeamPlan {
  role: AssignmentRole;
  count: number;
  rationale: string;
}

function normalizeLocationHint(text: string) {
  const knownZones = [
    "north wing",
    "south plaza",
    "dock yard",
    "main gate",
    "atrium",
    "warehouse",
    "control room",
    "transit hub",
  ];

  const lowered = text.toLowerCase();
  return knownZones.find((zone) => lowered.includes(zone)) ?? "";
}

function toRealtimeIncidentSnapshot(incident: typeof incidents.$inferSelect) {
  return {
    id: incident.id,
    type: incident.type,
    status: incident.status,
    description: incident.description,
    createdAt: incident.createdAt.toISOString(),
    classificationConfidence: incident.classificationConfidence,
    confidence: incident.classificationConfidence,
    locationCoordinates:
      incident.latitude === null || incident.longitude === null
        ? null
        : {
            latitude: incident.latitude,
            longitude: incident.longitude,
            accuracyMeters: incident.locationAccuracyMeters ?? null,
          },
    triggeredByUserId: incident.triggeredByUserId,
  };
}

function serializeIncidentRows(
  rows: Array<{
    incident: typeof incidents.$inferSelect;
    assignment: typeof assignments.$inferSelect | null;
    responder: typeof responders.$inferSelect | null;
  }>
): IncidentWithDetails[] {
  const map = new Map<string, IncidentWithDetails>();

  for (const row of rows) {
    const { incident, assignment, responder } = row;

    if (!map.has(incident.id)) {
      map.set(incident.id, {
        id: incident.id,
        type: incident.type,
        description: incident.description,
        status: incident.status,
        classificationConfidence: incident.classificationConfidence,
        locationCoordinates:
          incident.latitude === null || incident.longitude === null
            ? null
            : {
                latitude: incident.latitude,
                longitude: incident.longitude,
                accuracyMeters: incident.locationAccuracyMeters ?? null,
              },
        triggeredByUserId: incident.triggeredByUserId,
        createdAt: incident.createdAt.toISOString(),
        resolvedAt: incident.resolvedAt?.toISOString() ?? null,
        assignedResponders: [],
        assignedResponder: null,
        analytics: {
          responseTimeMs: null,
          resolutionTimeMs: null,
        },
      });
    }

    const current = map.get(incident.id)!;

    if (assignment && responder) {
      const alreadyAdded = current.assignedResponders.some((item) => item.id === responder.id);

      if (!alreadyAdded) {
        current.assignedResponders.push({
          id: responder.id,
          name: responder.name,
          role: responder.role,
          location: responder.location,
          assignedAt: assignment.assignedAt.toISOString(),
        });
      }

      current.assignedResponder = current.assignedResponders[0] ?? null;

      const responseTime = Math.max(0, assignment.assignedAt.getTime() - incident.createdAt.getTime());
      current.analytics.responseTimeMs =
        current.analytics.responseTimeMs === null
          ? responseTime
          : Math.min(current.analytics.responseTimeMs, responseTime);
    }

    if (incident.resolvedAt) {
      current.analytics.resolutionTimeMs = Math.max(
        0,
        incident.resolvedAt.getTime() - incident.createdAt.getTime()
      );
    }
  }

  return [...map.values()];
}

export async function listIncidentsWithDetails(options?: {
  triggeredByUserId?: string;
  assignedResponderId?: string;
}) {
  const conditions: SQL[] = [];

  if (options?.triggeredByUserId) {
    conditions.push(eq(incidents.triggeredByUserId, options.triggeredByUserId));
  }

  if (options?.assignedResponderId) {
    conditions.push(eq(assignments.responderId, options.assignedResponderId));
  }

  const rows = await db
    .select({
      incident: incidents,
      assignment: assignments,
      responder: responders,
    })
    .from(incidents)
    .leftJoin(assignments, eq(assignments.incidentId, incidents.id))
    .leftJoin(responders, eq(assignments.responderId, responders.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(incidents.createdAt), asc(assignments.assignedAt));

  return serializeIncidentRows(rows);
}

export async function listIncidentsForResponderUser(userId: string) {
  const responder = await findResponderByUserId(userId);

  if (!responder) {
    return [];
  }

  return listIncidentsWithDetails({ assignedResponderId: responder.id });
}

function buildDefaultAssignmentPlan(incidentType: IncidentType): AssignmentTeamPlan[] {
  if (incidentType === "custom") {
    return [
      {
        role: "any",
        count: 1,
        rationale: "General fallback response",
      },
    ];
  }

  return [
    {
      role: incidentType,
      count: 1,
      rationale: `Primary dispatch for ${incidentType}`,
    },
  ];
}

function normalizeAssignmentPlan(
  incidentType: IncidentType,
  requestedTeams?: DispatchTeamRequirement[]
): AssignmentTeamPlan[] {
  if (!requestedTeams || requestedTeams.length === 0) {
    return buildDefaultAssignmentPlan(incidentType);
  }

  const merged = new Map<AssignmentRole, AssignmentTeamPlan>();

  for (const team of requestedTeams) {
    const count = Math.max(1, Math.min(4, Math.round(team.count)));

    const existing = merged.get(team.role);

    if (!existing) {
      merged.set(team.role, {
        role: team.role,
        count,
        rationale: team.rationale,
      });
      continue;
    }

    existing.count = Math.max(existing.count, count);
    if (!existing.rationale && team.rationale) {
      existing.rationale = team.rationale;
    }
  }

  const normalized = [...merged.values()];
  return normalized.length > 0 ? normalized : buildDefaultAssignmentPlan(incidentType);
}

function pickResponderForTeam(
  availableResponders: ResponderRecord[],
  role: AssignmentRole,
  locationHint: string,
  targetCoordinates?: { latitude: number; longitude: number }
) {
  if (role === "any") {
    return pickBestResponder(availableResponders, "custom", locationHint, targetCoordinates);
  }

  const specialistPool = availableResponders.filter((responder) => responder.role === role);

  if (specialistPool.length > 0) {
    return pickBestResponder(specialistPool, role, locationHint, targetCoordinates);
  }

  return pickBestResponder(availableResponders, "custom", locationHint, targetCoordinates);
}

export async function assignResponderToIncident(
  incidentId: string,
  options?: {
    requestedTeams?: DispatchTeamRequirement[];
    locationHint?: string;
  }
) {
  const existing = await db.select().from(assignments).where(eq(assignments.incidentId, incidentId)).limit(1);

  if (existing[0]) {
    return listIncidentsWithDetails();
  }

  const incident = await db.select().from(incidents).where(eq(incidents.id, incidentId)).limit(1);

  if (!incident[0]) {
    throw new Error("Incident not found");
  }

  const availableResponders = await listAvailableResponders();

  if (availableResponders.length === 0) {
    return listIncidentsWithDetails();
  }

  const assignmentPlan = normalizeAssignmentPlan(incident[0].type, options?.requestedTeams);
  const realtimeIncident = toRealtimeIncidentSnapshot(incident[0]);
  const locationHint = options?.locationHint ?? normalizeLocationHint(incident[0].description);
  const targetCoordinates =
    incident[0].latitude === null || incident[0].longitude === null
      ? undefined
      : {
          latitude: incident[0].latitude,
          longitude: incident[0].longitude,
        };
  const remaining = [...(availableResponders as ResponderRecord[])];
  const selectedResponders: ResponderRecord[] = [];

  for (const team of assignmentPlan) {
    for (let slot = 0; slot < team.count; slot += 1) {
      if (remaining.length === 0) {
        break;
      }

      const picked = pickResponderForTeam(
        remaining,
        team.role,
        locationHint,
        targetCoordinates
      );

      if (!picked) {
        break;
      }

      selectedResponders.push(picked);

      const nextRemaining = remaining.filter((responder) => responder.id !== picked.id);
      remaining.splice(0, remaining.length, ...nextRemaining);
    }
  }

  if (selectedResponders.length === 0) {
    return listIncidentsWithDetails();
  }

  const createdAssignments = await db
    .insert(assignments)
    .values(
      selectedResponders.map((responder) => ({
        incidentId,
        responderId: responder.id,
      }))
    )
    .returning();

  await Promise.all(selectedResponders.map((responder) => setResponderStatus(responder.id, "busy")));

  const assignmentByResponder = new Map(
    createdAssignments.map((assignment) => [assignment.responderId, assignment.assignedAt] as const)
  );

  for (const responder of selectedResponders) {
    const assignedAt = assignmentByResponder.get(responder.id) ?? new Date();

    broadcastRealtime("assignment_update", {
      incidentId,
      triggeredByUserId: incident[0].triggeredByUserId,
      incident: realtimeIncident,
      responder: {
        id: responder.id,
        userId: responder.userId,
        name: responder.name,
        role: responder.role,
        location: responder.location,
      },
      assignedAt: assignedAt.toISOString(),
    });
  }

  return listIncidentsWithDetails();
}

export async function createIncident(input: CreateIncidentInput) {
  const normalizedDescription = (input.description ?? "").trim();
  const normalizedLocation = input.location
    ? {
        latitude: Math.max(-90, Math.min(90, input.location.latitude)),
        longitude: Math.max(-180, Math.min(180, input.location.longitude)),
        accuracyMeters:
          input.location.accuracyMeters === undefined
            ? null
            : Math.max(0, input.location.accuracyMeters),
      }
    : null;

  const dispatchPlan = await planIncidentDispatch({
    description: normalizedDescription,
    requestedType: input.triggerType,
  });

  const incidentRows = await db
    .insert(incidents)
    .values({
      type: dispatchPlan.primaryType,
      description:
        normalizedDescription.length > 0 ? normalizedDescription : "Emergency trigger",
      status: "pending",
      classificationConfidence: dispatchPlan.confidence,
      latitude: normalizedLocation?.latitude,
      longitude: normalizedLocation?.longitude,
      locationAccuracyMeters: normalizedLocation?.accuracyMeters,
      triggeredByUserId: input.triggeredByUserId,
    })
    .returning();

  const incident = incidentRows[0];
  const stats = await getIncidentStats();

  broadcastRealtime("new_incident", {
    ...toRealtimeIncidentSnapshot(incident),
    stats,
    dispatch: {
      source: dispatchPlan.source,
      summary: dispatchPlan.summary,
      teams: dispatchPlan.teams,
    },
  });

  await assignResponderToIncident(incident.id, {
    requestedTeams: dispatchPlan.teams,
    locationHint: normalizeLocationHint(incident.description),
  });

  return incident;
}

export async function updateIncidentStatus(input: {
  incidentId: string;
  status: IncidentStatus;
  responderId?: string;
}) {
  const incidentRows = await db
    .select({
      id: incidents.id,
      triggeredByUserId: incidents.triggeredByUserId,
    })
    .from(incidents)
    .where(eq(incidents.id, input.incidentId))
    .limit(1);

  const incident = incidentRows[0];

  if (!incident) {
    throw new Error("Incident not found");
  }

  const now = new Date();

  await db
    .update(incidents)
    .set({
      status: input.status,
      resolvedAt: input.status === "resolved" ? now : null,
    })
    .where(eq(incidents.id, input.incidentId));

  if (input.responderId) {
    await setResponderStatus(input.responderId, input.status === "resolved" ? "available" : "busy");
  }

  let affectedResponderIds: string[] = [];
  let responderStatus: "available" | "busy" | null = null;

  if (input.status === "resolved") {
    const linkedAssignments = await db
      .select({ responderId: assignments.responderId })
      .from(assignments)
      .where(eq(assignments.incidentId, input.incidentId));

    const responderIds = linkedAssignments.map((item) => item.responderId);
    affectedResponderIds = responderIds;
    responderStatus = "available";

    if (responderIds.length > 0) {
      await db
        .update(responders)
        .set({ status: "available", updatedAt: now })
        .where(inArray(responders.id, responderIds));
    }
  } else if (input.responderId) {
    affectedResponderIds = [input.responderId];
    responderStatus = "busy";
  }

  const stats = await getIncidentStats();

  broadcastRealtime("status_update", {
    incidentId: input.incidentId,
    status: input.status,
    updatedAt: now.toISOString(),
    triggeredByUserId: incident.triggeredByUserId,
    responderIds: affectedResponderIds,
    responderStatus,
    stats,
  });

  return listIncidentsWithDetails();
}

export async function getIncidentStats() {
  const rows = await db.select({ status: incidents.status }).from(incidents);

  const totals = {
    triggered: rows.length,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  };

  for (const row of rows) {
    if (row.status === "pending") {
      totals.pending += 1;
    }

    if (row.status === "in_progress") {
      totals.inProgress += 1;
    }

    if (row.status === "resolved") {
      totals.resolved += 1;
    }
  }

  return totals;
}
