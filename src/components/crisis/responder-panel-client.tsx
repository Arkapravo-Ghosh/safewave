"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { ProfileMenu } from "@/components/auth/profile-menu";
import { IncidentCard } from "@/components/crisis/incident-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";
import { useRealtimeFeed, type RealtimeEvent } from "@/hooks/use-realtime-feed";
import type { IncidentWithDetails } from "@/lib/crisis/types";

interface ResponderPanelClientProps {
  initialIncidents: IncidentWithDetails[];
  responderProfile: {
    id: string;
    name: string;
    role: "medical" | "fire" | "security";
    status: "available" | "busy";
    location: string;
  } | null;
}

interface RealtimeIncidentPayload {
  id?: string;
  type?: IncidentWithDetails["type"];
  status?: IncidentWithDetails["status"];
  description?: string;
  createdAt?: string;
  classificationConfidence?: number;
  confidence?: number;
  locationCoordinates?: IncidentWithDetails["locationCoordinates"];
  triggeredByUserId?: string | null;
}

interface RealtimeAssignmentPayload {
  incidentId?: string;
  incident?: RealtimeIncidentPayload;
  responder?: {
    id?: string;
    name?: string;
    role?: string;
    location?: string;
  };
  assignedAt?: string;
}

interface RealtimeStatusPayload {
  incidentId?: string;
  status?: IncidentWithDetails["status"];
  updatedAt?: string;
  responderIds?: string[];
  responderStatus?: "available" | "busy" | null;
}

interface ResponderListResponse {
  responders: Array<{
    id: string;
    name: string;
    role: "medical" | "fire" | "security";
    status: "available" | "busy";
    location: string;
  }>;
}

function toIncidentFromRealtime(payload: RealtimeIncidentPayload): IncidentWithDetails | null {
  if (!payload.id || !payload.type || !payload.status || !payload.createdAt) {
    return null;
  }

  return {
    id: payload.id,
    type: payload.type,
    description: payload.description ?? "Emergency trigger",
    status: payload.status,
    classificationConfidence: payload.classificationConfidence ?? payload.confidence ?? 0.5,
    locationCoordinates: payload.locationCoordinates ?? null,
    triggeredByUserId: payload.triggeredByUserId ?? null,
    createdAt: payload.createdAt,
    resolvedAt: null,
    assignedResponders: [],
    assignedResponder: null,
    analytics: {
      responseTimeMs: null,
      resolutionTimeMs: null,
    },
  };
}

function mergeAssignment(
  incident: IncidentWithDetails,
  assignment: RealtimeAssignmentPayload
): IncidentWithDetails {
  if (!assignment.responder?.id || !assignment.responder.name || !assignment.responder.role) {
    return incident;
  }

  const exists = incident.assignedResponders.some(
    (responder) => responder.id === assignment.responder?.id
  );

  if (exists) {
    return incident;
  }

  const assignedResponder = {
    id: assignment.responder.id,
    name: assignment.responder.name,
    role: assignment.responder.role as IncidentWithDetails["assignedResponders"][number]["role"],
    location: assignment.responder.location ?? "Unknown",
    assignedAt: assignment.assignedAt ?? new Date().toISOString(),
  };

  const responseTimeMs = Math.max(
    0,
    new Date(assignedResponder.assignedAt).getTime() - new Date(incident.createdAt).getTime()
  );

  return {
    ...incident,
    assignedResponders: [...incident.assignedResponders, assignedResponder],
    assignedResponder: incident.assignedResponder ?? assignedResponder,
    analytics: {
      ...incident.analytics,
      responseTimeMs:
        incident.analytics.responseTimeMs === null
          ? responseTimeMs
          : Math.min(incident.analytics.responseTimeMs, responseTimeMs),
    },
  };
}

function sortByNewest(incidents: IncidentWithDetails[]) {
  return [...incidents].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export function ResponderPanelClient({ initialIncidents, responderProfile }: ResponderPanelClientProps) {
  const [incidents, setIncidents] = useState<IncidentWithDetails[]>(initialIncidents);
  const [profile, setProfile] = useState(responderProfile);
  const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(null);
  const lastToastIncidentId = useRef<string | null>(null);
  const {
    notify: notifyBrowser,
    permission: notificationPermission,
    requestPermission: requestNotificationPermission,
  } = useBrowserNotifications();

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      if (event.event === "system") {
        void (async () => {
          const [incidentsResponse, respondersResponse] = await Promise.all([
            fetch("/api/incidents", { cache: "no-store" }),
            fetch("/api/responders", { cache: "no-store" }),
          ]);

          if (incidentsResponse.ok) {
            const incidentPayload = (await incidentsResponse.json()) as { incidents: IncidentWithDetails[] };
            setIncidents(incidentPayload.incidents);
          }

          if (respondersResponse.ok) {
            const responderPayload = (await respondersResponse.json()) as ResponderListResponse;
            const responder = responderPayload.responders[0];

            setProfile(
              responder
                ? {
                    id: responder.id,
                    name: responder.name,
                    role: responder.role,
                    status: responder.status,
                    location: responder.location,
                  }
                : null
            );
          }
        })();

        return;
      }

      if (event.event === "assignment_update") {
        const payload = event.payload as RealtimeAssignmentPayload;

        if (!profile?.id || payload.responder?.id !== profile.id || !payload.incidentId) {
          return;
        }

        const incidentId = payload.incidentId;

        if (incidentId && lastToastIncidentId.current !== incidentId) {
          lastToastIncidentId.current = incidentId;
          toast("New incident assigned to you", {
            description: payload.incident?.type ? `Type: ${payload.incident.type}` : undefined,
          });

          notifyBrowser("SafeWave Assignment", {
            body: payload.incident?.type
              ? `${payload.incident.type} incident assigned to your team.`
              : "A new incident has been assigned to you.",
            tag: `responder-assignment-${incidentId}`,
          });
        }

        setProfile((previous) =>
          previous
            ? {
                ...previous,
                status: "busy",
              }
            : previous
        );

        setIncidents((previous) => {
          const existing = previous.find((incident) => incident.id === payload.incidentId);

          if (!existing) {
            const realtimeIncident = payload.incident ? toIncidentFromRealtime(payload.incident) : null;

            if (!realtimeIncident) {
              return previous;
            }

            return sortByNewest([...previous, mergeAssignment(realtimeIncident, payload)]);
          }

          return previous.map((incident) =>
            incident.id === payload.incidentId ? mergeAssignment(incident, payload) : incident
          );
        });

        return;
      }

      if (event.event === "status_update") {
        const payload = event.payload as RealtimeStatusPayload;
        const nextStatus = payload.status;

        if (!payload.incidentId || !nextStatus) {
          return;
        }

        setIncidents((previous) =>
          previous.map((incident) => {
            if (incident.id !== payload.incidentId) {
              return incident;
            }

            let resolvedAt: string | null = null;
            let resolutionTimeMs: number | null = null;

            if (nextStatus === "resolved") {
              const resolvedTimestamp =
                payload.updatedAt ?? incident.resolvedAt ?? new Date().toISOString();

              resolvedAt = resolvedTimestamp;
              resolutionTimeMs = Math.max(
                0,
                new Date(resolvedTimestamp).getTime() - new Date(incident.createdAt).getTime()
              );
            }

            return {
              ...incident,
              status: nextStatus,
              resolvedAt,
              analytics: {
                ...incident.analytics,
                resolutionTimeMs,
              },
            };
          })
        );

        if (
          profile?.id &&
          payload.responderStatus &&
          Array.isArray(payload.responderIds) &&
          payload.responderIds.includes(profile.id)
        ) {
          const nextResponderStatus = payload.responderStatus;

          setProfile((previous) =>
            previous
              ? {
                  ...previous,
                  status: nextResponderStatus,
                }
              : previous
          );
        }
      }
    },
    [notifyBrowser, profile?.id]
  );

  useRealtimeFeed(handleRealtimeEvent);

  const activeIncidents = useMemo(
    () => incidents.filter((incident) => incident.status !== "resolved"),
    [incidents]
  );

  const updateStatus = async (incidentId: string, status: "in_progress" | "resolved") => {
    setUpdatingIncidentId(incidentId);

    try {
      const response = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, status }),
      });

      if (!response.ok) {
        toast("Unable to update incident status", {
          description: "Please try again.",
        });
        return;
      }
    } finally {
      setUpdatingIncidentId(null);
    }
  };

  const notificationStatusText = useMemo(() => {
    if (notificationPermission === "unsupported") {
      return "Browser notifications are not supported on this device.";
    }

    if (notificationPermission === "granted") {
      return "Browser notifications are enabled for incoming assignments.";
    }

    if (notificationPermission === "denied") {
      return "Browser notifications are blocked. Enable them in browser settings for new assignment alerts.";
    }

    return "Enable browser notifications to receive assignment alerts.";
  }, [notificationPermission]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Responder Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live incident stream with action controls for assigned emergencies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/history" />}>
            Incident History
          </Button>
          <ProfileMenu />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Responder Profile</CardTitle>
          <CardDescription>Current authenticated responder identity and readiness.</CardDescription>
        </CardHeader>
        <CardContent>
          {profile ? (
            <>
              <p className="text-sm text-muted-foreground">
                {profile.name} | {profile.role} | {profile.location} | {profile.status}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{notificationStatusText}</p>
              {notificationPermission === "default" ? (
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    void requestNotificationPermission();
                  }}
                >
                  Enable Browser Alerts
                </Button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Responder profile is not configured.</p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Live Assigned Incidents</h2>
        {activeIncidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active incidents assigned right now.</p>
        ) : (
          activeIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              actionSlot={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => updateStatus(incident.id, "in_progress")}
                    disabled={incident.status !== "pending" || updatingIncidentId === incident.id}
                  >
                    {incident.status === "pending" ? "Accept Task" : "Accepted"}
                  </Button>
                  <Button
                    onClick={() => updateStatus(incident.id, "resolved")}
                    disabled={updatingIncidentId === incident.id}
                  >
                    {updatingIncidentId === incident.id ? "Updating..." : "Mark Resolved"}
                  </Button>
                </div>
              }
            />
          ))
        )}
      </section>
    </main>
  );
}
