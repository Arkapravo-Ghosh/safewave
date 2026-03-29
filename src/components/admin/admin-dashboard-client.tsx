"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ProfileMenu } from "@/components/auth/profile-menu";
import { IncidentCard } from "@/components/crisis/incident-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRealtimeFeed, type RealtimeEvent } from "@/hooks/use-realtime-feed";
import type { IncidentWithDetails } from "@/lib/crisis/types";

interface ResponderItem {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  role: "medical" | "fire" | "security";
  status: "available" | "busy";
  location: string;
  ownerAdminId: string | null;
  createdAt: string;
}

interface AdminDashboardClientProps {
  initialResponders: ResponderItem[];
  initialIncidents: IncidentWithDetails[];
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

export function AdminDashboardClient({ initialResponders, initialIncidents }: AdminDashboardClientProps) {
  const [responders, setResponders] = useState<ResponderItem[]>(initialResponders);
  const [incidents, setIncidents] = useState<IncidentWithDetails[]>(initialIncidents);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"medical" | "fire" | "security">("medical");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const hasSyncedAdminLocationRef = useRef(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("geolocation" in navigator) ||
      hasSyncedAdminLocationRef.current
    ) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (hasSyncedAdminLocationRef.current) {
          return;
        }

        hasSyncedAdminLocationRef.current = true;

        void fetch("/api/profile/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters:
              Number.isFinite(position.coords.accuracy) && position.coords.accuracy >= 0
                ? position.coords.accuracy
                : undefined,
          }),
        });
      },
      () => {
        // Ignore location failures; dashboard remains fully functional.
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 15_000,
      }
    );
  }, []);

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
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
          const responderPayload = (await respondersResponse.json()) as { responders: ResponderItem[] };
          setResponders(responderPayload.responders);
        }
      })();

      return;
    }

    if (event.event === "new_incident") {
      const payload = event.payload as RealtimeIncidentPayload;

      if (!payload.id) {
        return;
      }

      const realtimeIncident = toIncidentFromRealtime(payload);

      if (!realtimeIncident) {
        return;
      }

      setIncidents((previous) => sortByNewest([realtimeIncident, ...previous.filter((item) => item.id !== payload.id)]));

      toast("New emergency reported", {
        description: payload.type ? `Type: ${payload.type}` : undefined,
      });

      return;
    }

    if (event.event === "assignment_update") {
      const payload = event.payload as RealtimeAssignmentPayload;

      if (!payload.incidentId || !payload.responder?.id) {
        return;
      }

      setResponders((previous) =>
        previous.map((responder) =>
          responder.id === payload.responder?.id
            ? {
                ...responder,
                status: "busy",
              }
            : responder
        )
      );

      setIncidents((previous) => {
        const existing = previous.find((incident) => incident.id === payload.incidentId);

        if (!existing) {
          const fallbackIncident = payload.incident ? toIncidentFromRealtime(payload.incident) : null;

          if (!fallbackIncident) {
            return previous;
          }

          return sortByNewest([...previous, mergeAssignment(fallbackIncident, payload)]);
        }

        return previous.map((incident) =>
          incident.id === payload.incidentId ? mergeAssignment(incident, payload) : incident
        );
      });

      if (payload.responder?.role) {
        toast(`${payload.responder.role} responder assigned`, {
          description: payload.responder.name ?? undefined,
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

      if (Array.isArray(payload.responderIds) && payload.responderStatus) {
        const responderIds = new Set(payload.responderIds);
        const nextResponderStatus = payload.responderStatus;

        setResponders((previous) =>
          previous.map((responder) =>
            responderIds.has(responder.id)
              ? {
                  ...responder,
                  status: nextResponderStatus,
                }
              : responder
          )
        );
      }

      toast(`Incident status updated: ${nextStatus.replaceAll("_", " ")}`);
    }
  }, []);

  useRealtimeFeed(handleRealtimeEvent);

  const createResponder = async () => {
    setMessage("");

    const response = await fetch("/api/admin/responders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        location,
      }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(data.error ?? "Failed to create responder account");
      return;
    }

    const successPayload = data as { responder: ResponderItem };

    if (successPayload.responder) {
      setResponders((previous) => {
        const withoutDuplicate = previous.filter(
          (responder) => responder.id !== successPayload.responder.id
        );

        return [successPayload.responder, ...withoutDuplicate];
      });
    }

    setName("");
    setEmail("");
    setPassword("");
    setLocation("");
    setMessage("Responder account created.");
  };

  const responderIds = useMemo(() => new Set(responders.map((responder) => responder.id)), [responders]);

  const ownedIncidents = useMemo(
    () =>
      incidents.filter((incident) =>
        incident.assignedResponders.some((assignedResponder) => responderIds.has(assignedResponder.id))
      ),
    [incidents, responderIds]
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage owned responders and monitor their live operational status.
          </p>
        </div>
        <ProfileMenu />
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Owned Responders</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{responders.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {responders.filter((responder) => responder.status === "available").length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidents Managed</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{ownedIncidents.length}</CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create Responder Account</CardTitle>
          <CardDescription>
            Admins can create responder users and assign crisis specialization and location.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input placeholder="Temporary password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Input placeholder="Location" value={location} onChange={(event) => setLocation(event.target.value)} />
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as "medical" | "fire" | "security")}
          >
            <option value="medical">Medical</option>
            <option value="fire">Fire</option>
            <option value="security">Security</option>
          </select>
          <Button onClick={createResponder}>Create Responder</Button>
          {message ? <p className="text-sm text-muted-foreground sm:col-span-2">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responder Status Board</CardTitle>
          <CardDescription>Live view of responders owned by this admin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {responders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No responders created yet.</p>
          ) : (
            responders.map((responder) => (
              <div key={responder.id} className="rounded-md border border-border/70 p-3 text-sm">
                {responder.name} | {responder.email ?? "-"} | {responder.role} | {responder.location} | {responder.status}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Related Incident Feed</h2>
        {ownedIncidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents linked to your responders yet.</p>
        ) : (
          ownedIncidents.map((incident) => <IncidentCard key={incident.id} incident={incident} />)
        )}
      </section>
    </main>
  );
}
