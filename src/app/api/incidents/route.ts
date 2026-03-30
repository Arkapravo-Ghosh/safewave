import { z } from "zod";

import { getApiSession } from "@/lib/auth/api-session";
import {
  createIncident,
  listIncidentsForResponderUser,
  listIncidentsForResponderUserPage,
  listIncidentsWithDetails,
  listIncidentsWithDetailsPage,
} from "@/lib/crisis/incidents";
import { ensureRealtimeServer } from "@/lib/realtime/ws-server";

export const runtime = "nodejs";

const INCIDENT_HISTORY_MAX_LIMIT = 50;

const createIncidentSchema = z.object({
  description: z.string().max(600).optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracyMeters: z.number().min(0).max(10_000).optional(),
    })
    .optional(),
});

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

export async function GET(request: Request) {
  ensureRealtimeServer();
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const requestedLimit = parsePositiveInt(requestUrl.searchParams.get("limit"), -1);
  const requestedOffset = parsePositiveInt(requestUrl.searchParams.get("offset"), 0);
  const usePagination = requestedLimit > 0;
  const limit = Math.max(1, Math.min(requestedLimit, INCIDENT_HISTORY_MAX_LIMIT));
  const offset = Math.max(0, requestedOffset);

  if (usePagination) {
    if (session.role === "user") {
      const page = await listIncidentsWithDetailsPage({
        triggeredByUserId: session.sub,
        limit,
        offset,
      });

      return Response.json(page);
    }

    if (session.role === "responder") {
      const page = await listIncidentsForResponderUserPage(session.sub, {
        limit,
        offset,
      });

      return Response.json(page);
    }

    const page = await listIncidentsWithDetailsPage({ limit, offset });
    return Response.json(page);
  }

  let incidents;

  if (session.role === "user") {
    incidents = await listIncidentsWithDetails({ triggeredByUserId: session.sub });
  } else if (session.role === "responder") {
    incidents = await listIncidentsForResponderUser(session.sub);
  } else {
    incidents = await listIncidentsWithDetails();
  }

  return Response.json({ incidents });
}

export async function POST(request: Request) {
  ensureRealtimeServer();
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "user") {
    return Response.json({ error: "Only users can trigger incidents" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createIncidentSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const incident = await createIncident({
    ...parsed.data,
    triggeredByUserId: session.sub,
  });
  return Response.json({ incident }, { status: 201 });
}
