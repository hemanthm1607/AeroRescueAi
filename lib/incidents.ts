import type { AnalysisHistoryEntry, IncidentStatus, RescueTeam, EmergencyAlert } from "@/types";
import { generateId } from "./utils";

const INCIDENTS_KEY = "aerorescue_incidents";
const ALERTS_KEY = "aerorescue_alerts";

/**
 * Enhanced incident management with status tracking and team assignment
 */

export function getIncidents(): AnalysisHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INCIDENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnalysisHistoryEntry[];
  } catch {
    return [];
  }
}

export function saveIncidents(incidents: AnalysisHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INCIDENTS_KEY, JSON.stringify(incidents));
  } catch (err) {
    console.error("Failed to save incidents:", err);
  }
}

export function updateIncidentStatus(incidentId: string, status: IncidentStatus): void {
  const incidents = getIncidents();
  const incident = incidents.find(i => i.incidentId === incidentId);
  if (incident) {
    incident.status = status;
    saveIncidents(incidents);
  }
}

export function assignRescueTeam(incidentId: string, team: RescueTeam): void {
  const incidents = getIncidents();
  const incident = incidents.find(i => i.incidentId === incidentId);
  if (incident) {
    incident.assignedTeam = team;
    // Auto-update status when team is assigned
    if (incident.status === "NEW") {
      incident.status = "ASSIGNED";
    }
    saveIncidents(incidents);
  }
}

export function removeTeamAssignment(incidentId: string): void {
  const incidents = getIncidents();
  const incident = incidents.find(i => i.incidentId === incidentId);
  if (incident) {
    incident.assignedTeam = undefined;
    // Revert status if it was only assigned
    if (incident.status === "ASSIGNED") {
      incident.status = "NEW";
    }
    saveIncidents(incidents);
  }
}

export function addOrUpdateIncident(entry: AnalysisHistoryEntry): void {
  const incidents = getIncidents();
  
  // Check if incident already exists by ID
  const existingIndex = incidents.findIndex(i => 
    i.incidentId === entry.incidentId && entry.incidentId
  );
  
  if (existingIndex >= 0) {
    // Update existing incident but preserve status and team assignment
    const existing = incidents[existingIndex];
    incidents[existingIndex] = {
      ...entry,
      status: existing.status,
      assignedTeam: existing.assignedTeam
    };
  } else {
    // Add new incident with default status
    const newIncident: AnalysisHistoryEntry = {
      ...entry,
      status: "NEW"
    };
    incidents.unshift(newIncident);
  }
  
  // Limit to 50 incidents
  const limitedIncidents = incidents.slice(0, 50);
  saveIncidents(limitedIncidents);
  
  // Check if this incident should trigger an emergency alert
  checkAndCreateAlert(entry);
}

// Emergency Alert Management
export function getEmergencyAlerts(): EmergencyAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EmergencyAlert[];
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: EmergencyAlert[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  } catch (err) {
    console.error("Failed to save alerts:", err);
  }
}

export function dismissAlert(alertId: string): void {
  const alerts = getEmergencyAlerts();
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.dismissed = true;
    saveAlerts(alerts);
  }
}

export function getActiveAlerts(): EmergencyAlert[] {
  return getEmergencyAlerts().filter(alert => !alert.dismissed);
}

function checkAndCreateAlert(entry: AnalysisHistoryEntry): void {
  const { result } = entry;
  const shouldAlert = 
    result.rescuePriority === "HIGH" || 
    result.rescuePriority === "CRITICAL" ||
    result.floodSeverity === "HIGH" ||
    result.floodSeverity === "CRITICAL";
    
  if (!shouldAlert || !entry.incidentId) return;
  
  // Check if alert already exists for this incident
  const alerts = getEmergencyAlerts();
  const existingAlert = alerts.find(a => a.incidentId === entry.incidentId);
  if (existingAlert) return;
  
  // Determine alert type and reason
  let type: EmergencyAlert["type"];
  let reason: string;
  
  if (result.rescuePriority === "CRITICAL") {
    type = "CRITICAL_PRIORITY";
    reason = "Critical rescue priority detected";
  } else if (result.rescuePriority === "HIGH") {
    type = "HIGH_PRIORITY";
    reason = "High rescue priority detected";
  } else if (result.floodSeverity === "CRITICAL") {
    type = "CRITICAL_FLOOD";
    reason = "Critical flood severity detected";
  } else {
    type = "HIGH_FLOOD";
    reason = "High flood severity detected";
  }
  
  const alert: EmergencyAlert = {
    id: generateId(),
    incidentId: entry.incidentId,
    type,
    reason,
    timestamp: new Date().toISOString(),
    dismissed: false
  };
  
  alerts.unshift(alert);
  // Keep last 20 alerts
  const limitedAlerts = alerts.slice(0, 20);
  saveAlerts(limitedAlerts);
}