import { z } from "zod";

import { getApiSession } from "@/lib/auth/api-session";
import { createIncident, listIncidentsForResponderUser, listIncidentsWithDetails } from "@/lib/crisis/incidents";
import { ensureRealtimeServer } from "@/lib/realtime/ws-server";

export const runtime = "nodejs";

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

export async function GET() {
  ensureRealtimeServer();
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
