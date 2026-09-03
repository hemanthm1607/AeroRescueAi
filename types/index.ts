export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Hazard {
  name: string;
  description: string;
  severity: SeverityLevel;
}

export interface AnalysisResult {
  peopleDetected: number;
  urgentPeople: number;
  floodSeverity: SeverityLevel;
  waterCondition: string;
  rescuePriority: SeverityLevel;
  hazards: Hazard[];
  recommendations: string[];
  summary: string;
  disasterType: string;
  // New fields for incident tracking and location
  incidentId?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export type IncidentStatus = "NEW" | "ASSIGNED" | "EN_ROUTE" | "RESCUED";
export type RescueTeam = "Team 01" | "Team 02" | "Team 03" | "Team 04";

export interface AnalysisHistoryEntry {
  id: string;
  incidentId?: string;
  timestamp: string;
  imageThumbnail: string;
  result: AnalysisResult;
  inputMode: "upload" | "drone";
  latitude?: number;
  longitude?: number;
  locationName?: string;
  // New incident management fields
  status?: IncidentStatus;
  assignedTeam?: RescueTeam;
}

export interface DroneLocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface EmergencyAlert {
  id: string;
  incidentId: string;
  type: "HIGH_PRIORITY" | "CRITICAL_PRIORITY" | "HIGH_FLOOD" | "CRITICAL_FLOOD";
  reason: string;
  timestamp: string;
  dismissed: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export type InputMode = "upload" | "drone";

export interface ApiAnalyzeRequest {
  imageBase64: string;
  mimeType: string;
}

export interface ApiAnalyzeResponse {
  success: boolean;
  result?: AnalysisResult;
  error?: string;
}
