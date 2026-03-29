"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ProfileMenu } from "@/components/auth/profile-menu";
import { IncidentCard } from "@/components/crisis/incident-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";
import { useRealtimeFeed, type RealtimeEvent } from "@/hooks/use-realtime-feed";
import type { CrisisDispatchPlan, IncidentWithDetails } from "@/lib/crisis/types";

interface DashboardClientProps {
  initialIncidents: IncidentWithDetails[];
  userName: string;
  userId: string;
}

type GpsStatus = "requesting" | "ready" | "denied" | "unsupported" | "error";

interface BrowserGpsLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
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
  triggeredByUserId?: string | null;
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
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
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

function mergeResponderAssignment(
  incident: IncidentWithDetails,
  assignment: RealtimeAssignmentPayload
): IncidentWithDetails {
  if (!assignment.responder?.id || !assignment.responder.name || !assignment.responder.role) {
    return incident;
  }

  const alreadyAssigned = incident.assignedResponders.some(
    (responder) => responder.id === assignment.responder?.id
  );

  if (alreadyAssigned) {
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

export function DashboardClient({ initialIncidents, userName, userId }: DashboardClientProps) {
  const [incidents, setIncidents] = useState<IncidentWithDetails[]>(initialIncidents);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [previewPending, setPreviewPending] = useState(false);
  const [dispatchPreview, setDispatchPreview] = useState<CrisisDispatchPlan | null>(null);
  const [gpsLocation, setGpsLocation] = useState<BrowserGpsLocation | null>(null);
  const {
    notify: notifyBrowser,
    permission: notificationPermission,
    requestPermission: requestNotificationPermission,
  } = useBrowserNotifications();
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("requesting");
  const hasSyncedProfileLocationRef = useRef(false);

  const syncProfileLocation = useCallback(async (location: BrowserGpsLocation) => {
    const response = await fetch("/api/profile/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters ?? undefined,
      }),
    });

    if (!response.ok) {
      hasSyncedProfileLocationRef.current = false;
    }
  }, []);

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    if (event.event === "system") {
      void (async () => {
        const response = await fetch("/api/incidents", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { incidents: IncidentWithDetails[] };
        setIncidents(payload.incidents);
      })();

      return;
    }

    if (event.event === "new_incident") {
      const payload = event.payload as RealtimeIncidentPayload;

      if (!payload.id || payload.triggeredByUserId !== userId) {
        return;
      }

      const realtimeIncident = toIncidentFromRealtime(payload);

      if (!realtimeIncident) {
        return;
      }

      setIncidents((previous) => sortByNewest([realtimeIncident, ...previous.filter((item) => item.id !== payload.id)]));
      return;
    }

    if (event.event === "assignment_update") {
      const payload = event.payload as RealtimeAssignmentPayload;

      if (payload.triggeredByUserId !== userId || !payload.incidentId || !payload.responder) {
        return;
      }

      setIncidents((previous) => {
        const existingIncident = previous.find((incident) => incident.id === payload.incidentId);

        if (!existingIncident) {
          const fallbackIncident = payload.incident ? toIncidentFromRealtime(payload.incident) : null;

          if (!fallbackIncident) {
            return previous;
          }

          return sortByNewest([...previous, mergeResponderAssignment(fallbackIncident, payload)]);
        }

        return previous.map((incident) =>
          incident.id === payload.incidentId ? mergeResponderAssignment(incident, payload) : incident
        );
      });

      if (payload.responder.role) {
        toast(`${payload.responder.role} agent is on the way`);

        notifyBrowser("SafeWave Dispatch Update", {
          body: `${payload.responder.role} agent is on the way to your location.`,
          tag: `assignment-${payload.incidentId}`,
        });
      }

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
    }
  }, [notifyBrowser, userId]);

  useRealtimeFeed(handleRealtimeEvent);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsStatus("unsupported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters:
            Number.isFinite(position.coords.accuracy) && position.coords.accuracy >= 0
              ? position.coords.accuracy
              : null,
        } satisfies BrowserGpsLocation;

        setGpsLocation({
          latitude: nextLocation.latitude,
          longitude: nextLocation.longitude,
          accuracyMeters: nextLocation.accuracyMeters,
        });
        setGpsStatus("ready");

        if (!hasSyncedProfileLocationRef.current) {
          hasSyncedProfileLocationRef.current = true;
          void syncProfileLocation(nextLocation);
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus("denied");
          return;
        }

        setGpsStatus("error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [syncProfileLocation]);

  const gpsStatusText = useMemo(() => {
    if (gpsStatus === "ready" && gpsLocation) {
      return `GPS ready: ${formatCoordinate(gpsLocation.latitude)}, ${formatCoordinate(gpsLocation.longitude)}`;
    }

    if (gpsStatus === "requesting") {
      return "Requesting GPS permission for exact SOS location...";
    }

    if (gpsStatus === "denied") {
      return "GPS permission denied. Allow location access in your browser to send SOS.";
    }

    if (gpsStatus === "unsupported") {
      return "This browser does not support geolocation.";
    }

    return "Unable to fetch GPS location. Please retry or check device settings.";
  }, [gpsLocation, gpsStatus]);

  const notificationStatusText = useMemo(() => {
    if (notificationPermission === "unsupported") {
      return "Browser notifications are not supported on this device.";
    }

    if (notificationPermission === "granted") {
      return "Browser notifications are enabled for assignment updates.";
    }

    if (notificationPermission === "denied") {
      return "Browser notifications are blocked. Enable them in browser settings for live dispatch alerts.";
    }

    return "Use Review SOS once to allow browser notifications for live dispatch alerts.";
  }, [notificationPermission]);

  const reviewEmergency = async () => {
    setMessage("");

    if (notificationPermission === "default") {
      void requestNotificationPermission();
    }

    if (!gpsLocation) {
      setMessage(
        gpsStatus === "denied"
          ? "GPS permission is required to review and send SOS."
          : "Waiting for GPS coordinates. Please try again in a moment."
      );
      return;
    }

    setPreviewPending(true);

    try {
      const normalizedDescription = description.trim();

      const response = await fetch("/api/incidents/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: normalizedDescription || undefined,
        }),
      });

      if (!response.ok) {
        setMessage("Failed to generate AI dispatch preview. Please try again.");
        return;
      }

      const data = (await response.json()) as { plan: CrisisDispatchPlan };
      setDispatchPreview(data.plan);
      setConfirmOpen(true);
    } finally {
      setPreviewPending(false);
    }
  };

  const submitEmergency = async () => {
    setPending(true);
    setMessage("");

    if (!gpsLocation) {
      setMessage(
        gpsStatus === "denied"
          ? "GPS permission is required to send SOS with exact coordinates."
          : "Waiting for GPS coordinates. Please try again in a moment."
      );
      setPending(false);
      return;
    }

    if (!dispatchPreview) {
      setMessage("Gemini dispatch preview is required before sending SOS.");
      setPending(false);
      return;
    }

    setConfirmOpen(false);

    const normalizedDescription = description.trim();

    const response = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: normalizedDescription || undefined,
        location: {
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          accuracyMeters: gpsLocation.accuracyMeters ?? undefined,
        },
      }),
    });

    if (!response.ok) {
      setMessage("Failed to send SOS. Please try again.");
      setPending(false);
      return;
    }

    setDescription("");
    setDispatchPreview(null);
    setMessage("SOS sent. AI dispatch is assigning responders now.");
    setPending(false);
  };

  const stats = useMemo(() => {
    let pendingCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;

    for (const incident of incidents) {
      if (incident.status === "pending") {
        pendingCount += 1;
      }

      if (incident.status === "in_progress") {
        inProgressCount += 1;
      }

      if (incident.status === "resolved") {
        resolvedCount += 1;
      }
    }

    return {
      triggered: incidents.length,
      pending: pendingCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
    };
  }, [incidents]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">User Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, {userName}. Trigger incidents and track your emergency history.
          </p>
        </div>
        <ProfileMenu />
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Triggered</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.triggered}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.pending}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.inProgress}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolved</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.resolved}</CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Trigger Emergency</CardTitle>
          <CardDescription>Describe what is happening. SafeWave AI will auto-select responder teams.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Example: There's a fire in my apartment and two people are injured"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{gpsStatusText}</p>
          <p className="text-xs text-muted-foreground">{notificationStatusText}</p>
          <Button
            onClick={reviewEmergency}
            disabled={pending || previewPending || !gpsLocation}
            className="w-full"
          >
            {previewPending ? "Analyzing with Gemini..." : pending ? "Sending SOS..." : "Review SOS"}
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Confirm Emergency Dispatch</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              SafeWave AI will choose responder teams and how many responders to send.
            </p>
            <div className="mt-3 rounded-md border border-border/70 bg-muted/40 p-3 text-sm text-foreground/90">
              {description.trim() || "No details provided."}
            </div>
            <div className="mt-3 rounded-md border border-border/70 bg-muted/40 p-3 text-sm text-foreground/90">
              {dispatchPreview ? (
                <>
                  <p className="font-medium">
                    AI plan: {dispatchPreview.primaryType} ({Math.round(dispatchPreview.confidence * 100)}% confidence)
                  </p>
                  <p className="mt-1 text-muted-foreground">{dispatchPreview.summary}</p>
                  <div className="mt-2 grid gap-1">
                    {dispatchPreview.teams.map((team) => (
                      <p key={team.role}>
                        {team.role} x{team.count} | {team.rationale}
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                "Gemini dispatch preview unavailable"
              )}
            </div>
            <div className="mt-3 rounded-md border border-border/70 bg-muted/40 p-3 text-sm text-foreground/90">
              {gpsLocation
                ? `Coordinates: ${formatCoordinate(gpsLocation.latitude)}, ${formatCoordinate(gpsLocation.longitude)}`
                : "Coordinates unavailable"}
              {gpsLocation?.accuracyMeters !== null && gpsLocation?.accuracyMeters !== undefined
                ? ` (accuracy ${Math.round(gpsLocation.accuracyMeters)}m)`
                : ""}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={submitEmergency}
                disabled={pending || !gpsLocation || !dispatchPreview}
              >
                {pending ? "Sending..." : "Send SOS"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your Incident History</h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents triggered yet.</p>
        ) : (
          incidents.map((incident) => <IncidentCard key={incident.id} incident={incident} />)
        )}
      </section>
    </main>
  );
}
