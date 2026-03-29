import { ResponderPanelClient } from "@/components/crisis/responder-panel-client";
import { requireRole } from "@/lib/auth/guards";
import { listIncidentsForResponderUser } from "@/lib/crisis/incidents";
import { findResponderByUserId } from "@/lib/crisis/responders";

export const dynamic = "force-dynamic";

export default async function ResponderPage() {
  const session = await requireRole("responder");

  const [responderProfile, initialIncidents] = await Promise.all([
    findResponderByUserId(session.sub),
    listIncidentsForResponderUser(session.sub),
  ]);

  return (
    <ResponderPanelClient
      initialIncidents={initialIncidents}
      responderProfile={
        responderProfile
          ? {
              id: responderProfile.id,
              name: responderProfile.name,
              role: responderProfile.role,
              status: responderProfile.status,
              location: responderProfile.location,
            }
          : null
      }
    />
  );
}
