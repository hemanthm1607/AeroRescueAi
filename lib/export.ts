/**
 * Export and report utilities for incident analysis data
 * Handles JSON export, report generation, and statistics calculation
 */

import type { AnalysisResult, AnalysisHistoryEntry } from "@/types";

export interface IncidentReport {
  incidentId: string;
  timestamp: string;
  location: {
    latitude?: number;
    longitude?: number;
    name?: string;
  };
  analysis: AnalysisResult;
  inputMode: "upload" | "drone";
  generatedAt: string;
}

export interface StatisticsData {
  totalIncidents: number;
  averagePeopleDetected: number;
  totalPeople: number;
  criticalCases: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  highSeverityCases: number;
  commonDisasterTypes: { [key: string]: number };
  averageRescueTeamsRequired: number;
  incidentsWithLocation: number;
  totalUrgent: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
}

/**
 * Generate a comprehensive report for a single analysis
 */
export function generateReport(
  entry: AnalysisHistoryEntry,
  incident: { id: string; locationName?: string }
): IncidentReport {
  return {
    incidentId: incident.id || entry.incidentId || "UNKNOWN",
    timestamp: entry.timestamp,
    location: {
      latitude: entry.latitude,
      longitude: entry.longitude,
      name: incident.locationName || entry.locationName,
    },
    analysis: entry.result,
    inputMode: entry.inputMode,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Export analysis data as JSON
 * Converts a single entry or array of entries to JSON string
 */
export function exportAsJSON(
  data: AnalysisHistoryEntry | AnalysisHistoryEntry[]
): string {
  const entries = Array.isArray(data) ? data : [data];
  const reports = entries.map((entry) =>
    generateReport(entry, {
      id: entry.incidentId || "UNKNOWN",
      locationName: entry.locationName,
    })
  );
  return JSON.stringify(reports, null, 2);
}

/**
 * Trigger download of JSON data as a file
 */
export function downloadJSON(
  data: AnalysisHistoryEntry | AnalysisHistoryEntry[],
  filename?: string
): void {
  const jsonStr = exportAsJSON(data);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `incident-report-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Calculate statistics from a collection of analysis entries
 */
export function calculateStats(
  entries: AnalysisHistoryEntry[]
): StatisticsData {
  if (entries.length === 0) {
    return {
      totalIncidents: 0,
      averagePeopleDetected: 0,
      totalPeople: 0,
      criticalCases: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      highSeverityCases: 0,
      commonDisasterTypes: {},
      averageRescueTeamsRequired: 0,
      incidentsWithLocation: 0,
      totalUrgent: 0,
      dateRange: {
        earliest: "N/A",
        latest: "N/A",
      },
    };
  }

  const disasterCounts: { [key: string]: number } = {};
  let totalPeople = 0;
  let totalUrgent = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let totalTeams = 0;
  let incidentsWithLocation = 0;

  entries.forEach((entry) => {
    const result = entry.result;

    // Count people
    totalPeople += result.peopleDetected;
    totalUrgent += result.urgentPeople || 0;

    // Check for location
    if (entry.latitude !== undefined && entry.longitude !== undefined) {
      incidentsWithLocation++;
    }

    // Count severity levels
    if (result.rescuePriority === "CRITICAL") {
      criticalCount++;
    } else if (result.rescuePriority === "HIGH") {
      highCount++;
    } else if (result.rescuePriority === "MEDIUM") {
      mediumCount++;
    } else if (result.rescuePriority === "LOW") {
      lowCount++;
    }

    // Count disaster types
    const dtype = result.disasterType || "Unknown";
    disasterCounts[dtype] = (disasterCounts[dtype] || 0) + 1;

    // Calculate teams (basic formula)
    const teamsNeeded = Math.ceil(result.peopleDetected / 5) || 1;
    totalTeams += teamsNeeded;
  });

  const timestamps = entries
    .map((e) => new Date(e.timestamp).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  return {
    totalIncidents: entries.length,
    averagePeopleDetected: Math.round(totalPeople / entries.length),
    totalPeople,
    criticalCases: criticalCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    highSeverityCases: highCount,
    commonDisasterTypes: disasterCounts,
    averageRescueTeamsRequired: Math.round(totalTeams / entries.length),
    incidentsWithLocation,
    totalUrgent,
    dateRange: {
      earliest:
        timestamps.length > 0
          ? new Date(timestamps[0]).toISOString()
          : "N/A",
      latest:
        timestamps.length > 0
          ? new Date(timestamps[timestamps.length - 1]).toISOString()
          : "N/A",
    },
  };
}

/**
 * Export statistics as JSON
 */
export function exportStatsAsJSON(
  entries: AnalysisHistoryEntry[]
): string {
  const stats = calculateStats(entries);
  return JSON.stringify(stats, null, 2);
}

/**
 * Trigger download of statistics as a file
 */
export function downloadStats(
  entries: AnalysisHistoryEntry[],
  filename?: string
): void {
  const jsonStr = exportStatsAsJSON(entries);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `incident-statistics-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
