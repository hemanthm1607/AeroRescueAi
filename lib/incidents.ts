import type { AnalysisHistoryEntry, IncidentStatus, RescueTeam, EmergencyAlert } from "@/types";
import { generateId } from "./utils";

const INCIDENTS_KEY = "aerorescue_incidents";
const ALERTS_KEY = "aerorescue_alerts";

// All available rescue teams
const AVAILABLE_TEAMS: RescueTeam[] = ["Team 01", "Team 02", "Team 03", "Team 04"];

/**
 * Calculate rescue teams required based on analysis result
 */
function rescueTeamsRequired(result: any): number {
  // No people = no rescue teams needed
  if (result.peopleDetected <= 0) return 0;
  
  // Check if this is an actual disaster/emergency situation
  const isDisaster = 
    result.rescuePriority === "HIGH" || 
    result.rescuePriority === "CRITICAL" ||
    result.floodSeverity === "HIGH" ||
    result.floodSeverity === "CRITICAL" ||
    (result.hazards && result.hazards.length > 0);
  
  // Normal indoor/non-disaster scene with people = 0 teams
  if (!isDisaster) return 0;
  
  // Actual disaster: calculate based on people count
  if (result.peopleDetected <= 5) return 1;
  if (result.peopleDetected <= 10) return 3;
  return 5; // Return 5 for 10+ people, will be capped at 4 available teams
}

/**
 * Get exactly N available teams that haven't been assigned to other open incidents
 */
function getAvailableTeams(count: number, currentIncidentId?: string): RescueTeam[] {
  if (count <= 0) return [];
  
  const incidents = getIncidents();
  
  // Get all teams currently assigned to OTHER incidents
  const assignedTeams = new Set<RescueTeam>();
  incidents.forEach(incident => {
    // Don't count teams assigned to the current incident or closed incidents
    if (incident.incidentId !== currentIncidentId && incident.assignedTeams) {
      // Only count teams in open/active incidents (not RESCUED)
      if (incident.status !== "RESCUED") {
        incident.assignedTeams.forEach(team => assignedTeams.add(team));
      }
    }
  });
  
  // Get available teams (not in assignedTeams set)
  const available = AVAILABLE_TEAMS.filter(team => !assignedTeams.has(team));
  
  // Return exactly 'count' teams, capped at 4 (max available teams)
  return available.slice(0, Math.min(count, 4));
}

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
    // Initialize assignedTeams if not present
    if (!incident.assignedTeams) {
      incident.assignedTeams = [];
    }
    // Add team if not already assigned
    if (!incident.assignedTeams.includes(team)) {
      incident.assignedTeams.push(team);
    }
    // Auto-update status when team is assigned
    if (incident.status === "NEW") {
      incident.status = "ASSIGNED";
    }
    saveIncidents(incidents);
  }
}

export function removeTeamAssignment(incidentId: string, team?: RescueTeam): void {
  const incidents = getIncidents();
  const incident = incidents.find(i => i.incidentId === incidentId);
  if (incident) {
    if (team) {
      // Remove specific team
      if (incident.assignedTeams) {
        incident.assignedTeams = incident.assignedTeams.filter(t => t !== team);
      }
    } else {
      // Remove all teams
      incident.assignedTeams = [];
    }
    // Revert status if no teams assigned
    if (!incident.assignedTeams || incident.assignedTeams.length === 0) {
      if (incident.status === "ASSIGNED") {
        incident.status = "NEW";
      }
    }
    saveIncidents(incidents);
  }
}

export function deleteIncident(incidentId: string): void {
  const incidents = getIncidents();
  const filteredIncidents = incidents.filter(i => i.incidentId !== incidentId);
  saveIncidents(filteredIncidents);
  
  // Also remove associated alerts
  const alerts = getEmergencyAlerts();
  const filteredAlerts = alerts.filter(a => a.incidentId !== incidentId);
  saveAlerts(filteredAlerts);
}

export function addOrUpdateIncident(entry: AnalysisHistoryEntry): void {
  const incidents = getIncidents();
  
  // Check if incident already exists by ID
  const existingIndex = incidents.findIndex(i => 
    i.incidentId === entry.incidentId && entry.incidentId
  );
  
  if (existingIndex >= 0) {
    // Update existing incident but preserve status and team assignments
    const existing = incidents[existingIndex];
    incidents[existingIndex] = {
      ...entry,
      status: existing.status,
      assignedTeams: existing.assignedTeams
    };
  } else {
    // Add new incident with automatic team assignment
    const teamsRequired = rescueTeamsRequired(entry.result);
    const availableTeams = getAvailableTeams(teamsRequired, entry.incidentId);
    
    // Automatically assign all required teams
    const newIncident: AnalysisHistoryEntry = {
      ...entry,
      status: availableTeams.length > 0 ? "ASSIGNED" : "NEW",
      assignedTeams: availableTeams.length > 0 ? availableTeams : undefined
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