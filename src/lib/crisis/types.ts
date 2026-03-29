export type IncidentType = "medical" | "fire" | "security" | "custom";
export type IncidentStatus = "pending" | "in_progress" | "resolved";
export type ResponderRole = "medical" | "fire" | "security";
export type ResponderStatus = "available" | "busy";

export interface CrisisClassification {
  type: IncidentType;
  confidence: number;
  matchedKeywords: string[];
}

export interface IncidentCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}

export interface AssignedResponderSummary {
  id: string;
  name: string;
  role: ResponderRole;
  location: string;
  assignedAt: string;
}

export interface DispatchTeamRequirement {
  role: ResponderRole;
  count: number;
  rationale: string;
}

export interface CrisisDispatchPlan {
  primaryType: IncidentType;
  confidence: number;
  summary: string;
  teams: DispatchTeamRequirement[];
  source: "ai" | "rules";
}

export interface IncidentRecord {
  id: string;
  type: IncidentType;
  description: string;
  status: IncidentStatus;
  classificationConfidence: number;
  latitude: number | null;
  longitude: number | null;
  locationAccuracyMeters: number | null;
  triggeredByUserId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface ResponderRecord {
  id: string;
  userId: string | null;
  name: string;
  role: ResponderRole;
  status: ResponderStatus;
  location: string;
  lastLatitude: number | null;
  lastLongitude: number | null;
}

export interface AssignmentRecord {
  id: string;
  incidentId: string;
  responderId: string;
  assignedAt: Date;
}

export interface IncidentWithDetails {
  id: string;
  type: IncidentType;
  description: string;
  status: IncidentStatus;
  classificationConfidence: number;
  locationCoordinates: IncidentCoordinates | null;
  triggeredByUserId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  assignedResponders: AssignedResponderSummary[];
  assignedResponder: AssignedResponderSummary | null;
  analytics: {
    responseTimeMs: number | null;
    resolutionTimeMs: number | null;
  };
}
