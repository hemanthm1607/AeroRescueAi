"use client";

import { useState } from "react";
import { Zap, AlertTriangle, CheckCircle2, Users, MapPin, Clock } from "lucide-react";
import type { AnalysisHistoryEntry, RescueTeam } from "@/types";
import { getSeverityBg, getSeverityColor, cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

const RESCUE_TEAMS: RescueTeam[] = ["Team 01", "Team 02", "Team 03", "Team 04"];

interface ModuleResourcesProps {
  entries: AnalysisHistoryEntry[];
}

export default function ModuleResources({ entries }: ModuleResourcesProps) {
  const [availableTeams, setAvailableTeams] = useState(10);
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});

  // Calculate team statuses based on incident assignments
  const teamStatuses: Record<RescueTeam, { status: string; incidentId?: string; priority?: string; peopleCount?: number }> = {
    "Team 01": { status: "AVAILABLE" },
    "Team 02": { status: "AVAILABLE" },
    "Team 03": { status: "AVAILABLE" },
    "Team 04": { status: "AVAILABLE" },
  };

  // Update team statuses based on assigned incidents
  entries.forEach((entry) => {
    if (entry.assignedTeam && entry.status && entry.status !== "NEW") {
      const statusMap: Record<string, string> = {
        ASSIGNED: "ASSIGNED",
        EN_ROUTE: "EN_ROUTE",
        RESCUED: "COMPLETED",
      };
      teamStatuses[entry.assignedTeam] = {
        status: statusMap[entry.status] || "ASSIGNED",
        incidentId: entry.incidentId,
        priority: entry.result.rescuePriority,
        peopleCount: entry.result.peopleDetected,
      };
    }
  });

  // Count team statuses
  const availableCount = RESCUE_TEAMS.filter((team) => teamStatuses[team].status === "AVAILABLE").length;
  const assignedCount = RESCUE_TEAMS.filter((team) => teamStatuses[team].status === "ASSIGNED").length;
  const enRouteCount = RESCUE_TEAMS.filter((team) => teamStatuses[team].status === "EN_ROUTE").length;
  const completedCount = RESCUE_TEAMS.filter((team) => teamStatuses[team].status === "COMPLETED").length;

  // Sort by priority: CRITICAL > HIGH > MEDIUM > LOW
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sortedIncidents = [...entries].sort(
    (a, b) =>
      priorityOrder[a.result.rescuePriority] - priorityOrder[b.result.rescuePriority]
  );

  // Calculate recommended allocation
  function calculateAllocation(incident: AnalysisHistoryEntry): number {
    const p = incident.result.rescuePriority;
    const people = incident.result.peopleDetected;
    const urgent = incident.result.urgentPeople;

    // Base allocation per severity
    let base = 0;
    if (p === "CRITICAL") base = 4;
    else if (p === "HIGH") base = 3;
    else if (p === "MEDIUM") base = 2;
    else base = 1;

    // Increase if many people involved
    if (people > 20) base += 2;
    else if (people > 10) base += 1;

    // Increase if many urgent
    if (urgent > 5) base += 1;

    return base;
  }

  const allocations = sortedIncidents.map((incident) => ({
    incident,
    recommended: calculateAllocation(incident),
    assigned: customAmounts[incident.id] || calculateAllocation(incident),
  }));

  const totalAssigned = allocations.reduce((sum, a) => sum + a.assigned, 0);
  const remaining = Math.max(0, availableTeams - totalAssigned);

  const criticalCount = allocations.filter((a) => a.incident.result.rescuePriority === "CRITICAL").length;
  const highCount = allocations.filter((a) => a.incident.result.rescuePriority === "HIGH").length;

  // Find recommended team for unassigned high/critical incidents
  const unassignedCritical = entries.filter(
    (e) => (e.result.rescuePriority === "CRITICAL" || e.result.rescuePriority === "HIGH") && !e.assignedTeam
  );
  const recommendedTeam = availableCount > 0 ? RESCUE_TEAMS.find((team) => teamStatuses[team].status === "AVAILABLE") : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30">
          <Zap className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white">Resource Allocation</h1>
          <p className="text-xs text-slate-500">Rescue team recommendation calculator</p>
        </div>
      </div>

      {/* Available Teams Input */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Available Resources</p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">Rescue Teams Available</label>
            <input
              type="number"
              min="0"
              value={availableTeams}
              onChange={(e) => setAvailableTeams(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <p className="text-xs text-slate-500">Teams</p>
            <p className="text-2xl font-black text-blue-300">{availableTeams}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
          <p className="text-xs text-slate-500 mb-1">Assigned</p>
          <p className="text-3xl font-black text-orange-300">{totalAssigned}</p>
          <p className="text-xs text-slate-400 mt-1">{allocations.length} incident{allocations.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
          <p className="text-xs text-slate-500 mb-1">Remaining</p>
          <p className="text-3xl font-black text-green-300">{remaining}</p>
          <p className="text-xs text-slate-400 mt-1">available</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs text-slate-500 mb-1">Critical</p>
          <p className="text-3xl font-black text-red-300">{criticalCount}</p>
          <p className="text-xs text-slate-400 mt-1">incident{criticalCount === 1 ? "" : "s"}</p>
        </div>
      </div>

      {/* Team Status Overview */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Team Status Overview</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Available</span>
              <span className="text-2xl font-black text-green-300">{availableCount}</span>
            </div>
            <p className="text-xs text-slate-600">Ready for deployment</p>
          </div>

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Assigned</span>
              <span className="text-2xl font-black text-blue-300">{assignedCount}</span>
            </div>
            <p className="text-xs text-slate-600">Team dispatched</p>
          </div>

          <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">En Route</span>
              <span className="text-2xl font-black text-orange-300">{enRouteCount}</span>
            </div>
            <p className="text-xs text-slate-600">Traveling to location</p>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Completed</span>
              <span className="text-2xl font-black text-emerald-300">{completedCount}</span>
            </div>
            <p className="text-xs text-slate-600">Rescue complete</p>
          </div>
        </div>
      </div>

      {/* Individual Team Status */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Individual Teams</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RESCUE_TEAMS.map((team) => {
            const teamData = teamStatuses[team];
            const statusColor = {
              AVAILABLE: "bg-green-500/15 border-green-500/30 text-green-300",
              ASSIGNED: "bg-blue-500/15 border-blue-500/30 text-blue-300",
              EN_ROUTE: "bg-orange-500/15 border-orange-500/30 text-orange-300",
              COMPLETED: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
            }[teamData.status];

            return (
              <div key={team} className={cn("rounded-lg border p-3", statusColor)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{team}</p>
                    <p className="text-xs text-slate-400">{teamData.status}</p>
                  </div>
                  <div className={cn("w-3 h-3 rounded-full mt-0.5", {
                    "bg-green-400": teamData.status === "AVAILABLE",
                    "bg-blue-400": teamData.status === "ASSIGNED",
                    "bg-orange-400": teamData.status === "EN_ROUTE",
                    "bg-emerald-400": teamData.status === "COMPLETED",
                  })} />
                </div>
                {teamData.incidentId && (
                  <div className="text-xs space-y-1">
                    <p className="text-slate-300">
                      <span className="text-slate-500">Incident:</span> {teamData.incidentId}
                    </p>
                    {teamData.priority && (
                      <p className="text-slate-300">
                        <span className="text-slate-500">Priority:</span> {teamData.priority}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendation Banner */}
      {unassignedCritical.length > 0 && recommendedTeam && (
        <div className="rounded-lg border-2 border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-sm font-semibold text-yellow-300 mb-2">💡 Recommendation</p>
          <p className="text-sm text-slate-200">
            <span className="font-semibold">{unassignedCritical.length}</span> unassigned HIGH/CRITICAL incident{unassignedCritical.length !== 1 ? "s" : ""}. Consider assigning <span className="font-semibold text-blue-300">{recommendedTeam}</span> to help with response.
          </p>
        </div>
      )}

      {/* Incidents */}
      {allocations.length === 0 ? (
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No incidents to allocate resources for.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Incident Allocation</p>

          {allocations.map(({ incident, recommended, assigned }) => (
            <div key={incident.id} className={cn("rounded-lg border p-4", getSeverityBg(incident.result.rescuePriority))}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-100 truncate">{incident.incidentId || incident.id}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {incident.result.disasterType} · {incident.result.peopleDetected} people ({incident.result.urgentPeople} urgent)
                  </p>
                </div>
                <span className={cn("text-xs font-bold px-2 py-1 rounded border whitespace-nowrap", getSeverityBg(incident.result.rescuePriority))}>
                  {incident.result.rescuePriority}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Recommended</p>
                  <p className="text-lg font-black text-slate-200">{recommended}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Assigned</p>
                  <input
                    type="number"
                    min="0"
                    value={assigned}
                    onChange={(e) =>
                      setCustomAmounts({
                        ...customAmounts,
                        [incident.id]: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-full px-2 py-1.5 bg-slate-800/60 border border-slate-700 rounded text-white text-sm font-bold text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  {assigned >= recommended ? (
                    <div className="flex items-center gap-1 text-green-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-semibold">OK</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-orange-300">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-semibold">Low</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong>Allocation Method:</strong> Resources are recommended based on incident severity, number of people affected, and urgent cases. Adjust teams as needed for your operational capacity.
        </p>
      </div>
    </div>
  );
}
