import { DashboardClient } from "@/components/crisis/dashboard-client";
import { requireRole } from "@/lib/auth/guards";
import { listIncidentsWithDetails } from "@/lib/crisis/incidents";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireRole("user");
  const initialIncidents = await listIncidentsWithDetails({ triggeredByUserId: session.sub });

  return <DashboardClient initialIncidents={initialIncidents} userName={session.name} userId={session.sub} />;
}
