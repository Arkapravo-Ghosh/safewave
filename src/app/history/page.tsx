import { HistoryFeedClient } from "@/components/crisis/history-feed-client";
import { requireAuth } from "@/lib/auth/guards";
import {
  listIncidentsForResponderUserPage,
  listIncidentsWithDetailsPage,
} from "@/lib/crisis/incidents";

export const dynamic = "force-dynamic";

const INITIAL_HISTORY_PAGE_LIMIT = 12;

export default async function HistoryPage() {
  const session = await requireAuth();

  if (session.role === "user") {
    const page = await listIncidentsWithDetailsPage({
      triggeredByUserId: session.sub,
      limit: INITIAL_HISTORY_PAGE_LIMIT,
      offset: 0,
    });

    return (
      <HistoryFeedClient
        initialIncidents={page.incidents}
        initialHasMore={page.hasMore}
        initialNextOffset={page.nextOffset}
        role={session.role}
      />
    );
  }

  if (session.role === "responder") {
    const page = await listIncidentsForResponderUserPage(session.sub, {
      limit: INITIAL_HISTORY_PAGE_LIMIT,
      offset: 0,
    });

    return (
      <HistoryFeedClient
        initialIncidents={page.incidents}
        initialHasMore={page.hasMore}
        initialNextOffset={page.nextOffset}
        role={session.role}
      />
    );
  }

  const page = await listIncidentsWithDetailsPage({
    limit: INITIAL_HISTORY_PAGE_LIMIT,
    offset: 0,
  });

  return (
    <HistoryFeedClient
      initialIncidents={page.incidents}
      initialHasMore={page.hasMore}
      initialNextOffset={page.nextOffset}
      role={session.role}
    />
  );
}
