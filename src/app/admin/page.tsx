import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { requireRole } from "@/lib/auth/guards";
import { listAdminOwnedResponders } from "@/lib/auth/management";
import { listIncidentsWithDetails } from "@/lib/crisis/incidents";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireRole("admin");
  const [initialResponders, initialIncidents] = await Promise.all([
    listAdminOwnedResponders(session.sub),
    listIncidentsWithDetails(),
  ]);

  return (
    <AdminDashboardClient
      initialResponders={initialResponders}
      initialIncidents={initialIncidents}
    />
  );
}
