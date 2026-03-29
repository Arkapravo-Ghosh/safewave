import { z } from "zod";

import { getApiSession } from "@/lib/auth/api-session";
import { assignResponderToIncident } from "@/lib/crisis/incidents";
import { ensureRealtimeServer } from "@/lib/realtime/ws-server";

export const runtime = "nodejs";

const assignSchema = z.object({
  incidentId: z.string().uuid(),
});

export async function POST(request: Request) {
  ensureRealtimeServer();
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin" && session.role !== "superadmin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = assignSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const incidents = await assignResponderToIncident(parsed.data.incidentId);
    return Response.json({ incidents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign responder";
    return Response.json({ error: message }, { status: 404 });
  }
}
