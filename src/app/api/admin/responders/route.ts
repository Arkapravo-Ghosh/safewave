import { z } from "zod";

import { getApiSession } from "@/lib/auth/api-session";
import {
  createAdminOwnedResponder,
  listAdminOwnedResponders,
  listAdminsWithMeta,
} from "@/lib/auth/management";
import { broadcastRealtime } from "@/lib/realtime/ws-server";

export const runtime = "nodejs";

const createResponderSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8),
  role: z.enum(["medical", "fire", "security"]),
  location: z.string().trim().min(2).max(120),
});

export async function GET() {
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const responders = await listAdminOwnedResponders(session.sub);
  return Response.json({ responders });
}

export async function POST(request: Request) {
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createResponderSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const responder = await createAdminOwnedResponder({
      adminId: session.sub,
      ...parsed.data,
    });

    const admins = await listAdminsWithMeta();

    broadcastRealtime("overview_update", {
      admins,
      message: `Responder ${responder.name} was created by admin ${session.name}.`,
    });

    return Response.json({ responder }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create responder";
    return Response.json({ error: message }, { status: 400 });
  }
}
