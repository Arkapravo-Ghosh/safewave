"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ProfileMenu } from "@/components/auth/profile-menu";
import { IncidentCard } from "@/components/crisis/incident-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRole } from "@/lib/auth/constants";
import type { IncidentWithDetails } from "@/lib/crisis/types";

interface HistoryFeedClientProps {
  initialIncidents: IncidentWithDetails[];
  initialHasMore: boolean;
  initialNextOffset: number | null;
  role: UserRole;
}

const HISTORY_PAGE_LIMIT = 12;

const ROLE_HOME_ROUTE: Record<UserRole, string> = {
  user: "/dashboard",
  responder: "/responder",
  admin: "/admin",
  superadmin: "/superadmin",
};

export function HistoryFeedClient({
  initialIncidents,
  initialHasMore,
  initialNextOffset,
  role,
}: HistoryFeedClientProps) {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const dashboardRoute = ROLE_HOME_ROUTE[role];

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || nextOffset === null) {
      return;
    }

    setLoadingMore(true);

    try {
      const response = await fetch(`/api/incidents?limit=${HISTORY_PAGE_LIMIT}&offset=${nextOffset}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        toast("Failed to load more incidents", {
          description: "Please retry in a moment.",
        });
        return;
      }

      const payload = (await response.json()) as {
        incidents?: IncidentWithDetails[];
        hasMore?: boolean;
        nextOffset?: number | null;
      };

      const nextIncidents = payload.incidents ?? [];

      setIncidents((previous) => {
        const previousIds = new Set(previous.map((incident) => incident.id));
        const uniqueNew = nextIncidents.filter((incident) => !previousIds.has(incident.id));

        return [...previous, ...uniqueNew];
      });

      setHasMore(Boolean(payload.hasMore));
      setNextOffset(payload.nextOffset ?? null);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextOffset]);

  useEffect(() => {
    if (!hasMore || loadingMore) {
      return;
    }

    const node = sentinelRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore, loadingMore]);

  const statusText = useMemo(() => {
    if (loadingMore) {
      return "Loading more incidents...";
    }

    if (hasMore) {
      return "Scroll down to load older incidents.";
    }

    if (incidents.length === 0) {
      return "No incidents found yet.";
    }

    return "You have reached the end of the incident history.";
  }, [hasMore, incidents.length, loadingMore]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Incident History</h1>
          <p className="text-sm text-muted-foreground">
            Full timeline of incidents with infinite scrolling across your role scope.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={dashboardRoute} />}>
            Back to Dashboard
          </Button>
          <ProfileMenu />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>History Feed</CardTitle>
          <CardDescription>
            Loaded incidents: {incidents.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incident history available yet.</p>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-4 text-center text-sm text-muted-foreground">
        <p>{statusText}</p>
        {hasMore ? (
          <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        ) : null}
        <div ref={sentinelRef} className="h-2 w-full" aria-hidden />
      </div>
    </main>
  );
}
