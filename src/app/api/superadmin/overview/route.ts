import { getApiSession } from "@/lib/auth/api-session";
import { listAdminsWithMeta } from "@/lib/auth/management";
import { getIncidentStats } from "@/lib/crisis/incidents";

export const runtime = "nodejs";

export async function GET() {
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "superadmin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [admins, stats] = await Promise.all([listAdminsWithMeta(), getIncidentStats()]);

  return Response.json({
    admins,
    stats,
  });
}
