import { z } from "zod";

import { getApiSession } from "@/lib/auth/api-session";
import { assignUserRoleBySuperadmin, listAdminsWithMeta } from "@/lib/auth/management";
import { broadcastRealtime } from "@/lib/realtime/ws-server";

export const runtime = "nodejs";

const assignRoleSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  role: z.enum(["user", "admin"]),
});

export async function POST(request: Request) {
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "superadmin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = assignRoleSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await assignUserRoleBySuperadmin(parsed.data);

    const admins = await listAdminsWithMeta();
    const actionLabel = parsed.data.role === "admin" ? "promoted to admin" : "set to user";

    broadcastRealtime("overview_update", {
      admins,
      message: `${parsed.data.email} was ${actionLabel}.`,
    });

    return Response.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign role";
    return Response.json({ error: message }, { status: 400 });
  }
}
