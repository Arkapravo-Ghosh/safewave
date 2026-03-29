import { getApiSession } from "@/lib/auth/api-session";
import { listAdminOwnedResponders } from "@/lib/auth/management";
import { findResponderByUserId, listResponders } from "@/lib/crisis/responders";
import { ensureRealtimeServer, getPublicWsUrl } from "@/lib/realtime/ws-server";

export const runtime = "nodejs";

export async function GET() {
  ensureRealtimeServer();
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let responders;

  if (session.role === "admin") {
    responders = await listAdminOwnedResponders(session.sub);
  } else if (session.role === "superadmin") {
    responders = await listResponders();
  } else if (session.role === "responder") {
    const responder = await findResponderByUserId(session.sub);
    responders = responder
      ? [
          {
            id: responder.id,
            userId: responder.userId,
            name: responder.name,
            email: session.email,
            role: responder.role,
            status: responder.status,
            location: responder.location,
            ownerAdminId: null,
            createdAt: responder.createdAt.toISOString(),
          },
        ]
      : [];
  } else {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ responders, wsUrl: getPublicWsUrl() });
}
