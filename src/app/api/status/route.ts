import { z } from "zod";

import { getApiSession } from "@/lib/auth/api-session";
import { updateIncidentStatus } from "@/lib/crisis/incidents";
import { findResponderByUserId } from "@/lib/crisis/responders";
import { ensureRealtimeServer } from "@/lib/realtime/ws-server";

export const runtime = "nodejs";

const statusSchema = z.object({
  incidentId: z.string().uuid(),
  status: z.enum(["pending", "in_progress", "resolved"]),
  responderId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  ensureRealtimeServer();
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["responder", "admin", "superadmin"].includes(session.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let responderId = parsed.data.responderId;

  if (session.role === "responder") {
    const responder = await findResponderByUserId(session.sub);

    if (!responder) {
      return Response.json({ error: "Responder profile not found" }, { status: 404 });
    }

    responderId = responder.id;
  }

  const incidents = await updateIncidentStatus({
    incidentId: parsed.data.incidentId,
    status: parsed.data.status,
    responderId,
  });
  return Response.json({ incidents });
}
