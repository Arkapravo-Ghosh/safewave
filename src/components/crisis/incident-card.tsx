import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/crisis/status-badge";
import { formatUtcDateTime } from "@/lib/date";
import type { IncidentWithDetails } from "@/lib/crisis/types";

interface IncidentCardProps {
  incident: IncidentWithDetails;
  actionSlot?: ReactNode;
}

function formatDuration(ms: number | null) {
  if (ms === null) {
    return "-";
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function IncidentCard({ incident, actionSlot }: IncidentCardProps) {
  const responderSummary =
    incident.assignedResponders.length > 0
      ? incident.assignedResponders
          .map((responder) => `${responder.name} (${responder.role})`)
          .join(", ")
      : "Unassigned";

  const coordinateSummary = incident.locationCoordinates
    ? formatCoordinates(incident.locationCoordinates.latitude, incident.locationCoordinates.longitude)
    : "Unavailable";

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base capitalize">{incident.type} Incident</CardTitle>
          <CardDescription>
            Created <time dateTime={incident.createdAt}>{formatUtcDateTime(incident.createdAt)}</time>
          </CardDescription>
        </div>
        <StatusBadge status={incident.status} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-foreground/90">{incident.description}</p>
        <div className="grid gap-2 text-muted-foreground sm:grid-cols-2">
          <div>
            <span className="font-medium text-foreground">Responders:</span> {responderSummary}
          </div>
          <div>
            <span className="font-medium text-foreground">Confidence:</span>{" "}
            {(incident.classificationConfidence * 100).toFixed(0)}%
          </div>
          <div>
            <span className="font-medium text-foreground">Coordinates:</span> {coordinateSummary}
          </div>
          <div>
            <span className="font-medium text-foreground">Response Time:</span>{" "}
            {formatDuration(incident.analytics.responseTimeMs)}
          </div>
          <div>
            <span className="font-medium text-foreground">Resolution Time:</span>{" "}
            {formatDuration(incident.analytics.resolutionTimeMs)}
          </div>
        </div>
        {actionSlot}
      </CardContent>
    </Card>
  );
}
