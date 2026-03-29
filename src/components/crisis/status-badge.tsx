import { Badge } from "@/components/ui/badge";
import type { IncidentStatus } from "@/lib/crisis/types";

const LABELS: Record<IncidentStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const VARIANTS: Record<IncidentStatus, "secondary" | "default" | "outline"> = {
  pending: "secondary",
  in_progress: "default",
  resolved: "outline",
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
