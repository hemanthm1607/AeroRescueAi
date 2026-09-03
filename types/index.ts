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
