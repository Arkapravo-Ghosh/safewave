import { SuperadminDashboardClient } from "@/components/superadmin/superadmin-dashboard-client";
import { requireRole } from "@/lib/auth/guards";
import { listAdminsWithMeta } from "@/lib/auth/management";
import { getIncidentStats } from "@/lib/crisis/incidents";

export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  await requireRole("superadmin");
  const [initialAdmins, initialStats] = await Promise.all([
    listAdminsWithMeta(),
    getIncidentStats(),
  ]);

  return (
    <SuperadminDashboardClient
      initialAdmins={initialAdmins}
      initialStats={initialStats}
    />
  );
}
