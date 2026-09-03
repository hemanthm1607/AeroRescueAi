"use client";

import { TrendingUp, AlertTriangle, Users, MapPin } from "lucide-react";
import type { AnalysisHistoryEntry } from "@/types";
import { calculateStats } from "@/lib/export";
import { cn } from "@/lib/utils";

interface ModuleIncidentStatsProps {
  entries: AnalysisHistoryEntry[];
}

export default function ModuleIncidentStats({ entries }: ModuleIncidentStatsProps) {
  const stats = calculateStats(entries);

  // Group by disaster type
  const disasterTypes: Record<string, number> = {};
  entries.forEach((e) => {
    disasterTypes[e.result.disasterType] = (disasterTypes[e.result.disasterType] || 0) + 1;
  });

  // Group by severity
  const severityGroups = {
    CRITICAL: entries.filter((e) => e.result.rescuePriority === "CRITICAL"),
    HIGH: entries.filter((e) => e.result.rescuePriority === "HIGH"),
    MEDIUM: entries.filter((e) => e.result.rescuePriority === "MEDIUM"),
    LOW: entries.filter((e) => e.result.rescuePriority === "LOW"),
  };

  const maxCount = Math.max(...Object.values(severityGroups).map((g) => g.length), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30">
          <TrendingUp className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white">Incident Statistics</h1>
          <p className="text-xs text-slate-500">Overview of disaster response data</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Incidents</p>
          <p className="text-3xl font-black text-blue-300">{stats.totalIncidents}</p>
          <p className="text-xs text-slate-400 mt-1">analyzed</p>
        </div>

        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs text-slate-500 mb-1">Critical</p>
          <p className="text-3xl font-black text-red-300">{stats.criticalCount}</p>
          <p className="text-xs text-slate-400 mt-1">incidents</p>
        </div>

        <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">People Affected</p>
          <p className="text-3xl font-black text-blue-300">{stats.totalPeople}</p>
          <p className="text-xs text-slate-400 mt-1">detected</p>
        </div>

        <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">GPS Tracked</p>
          <p className="text-3xl font-black text-green-300">{stats.incidentsWithLocation}</p>
          <p className="text-xs text-slate-400 mt-1">with location</p>
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Priority Distribution</p>
        <div className="space-y-3">
          {Object.entries(severityGroups).map(([priority, incidents]) => {
            const percentage = stats.totalIncidents > 0 ? (incidents.length / stats.totalIncidents) * 100 : 0;
            const bgColor = {
              CRITICAL: "bg-red-500",
              HIGH: "bg-orange-500",
              MEDIUM: "bg-yellow-500",
              LOW: "bg-green-500",
            }[priority as keyof typeof severityGroups];

            return (
              <div key={priority}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-300">{priority}</span>
                  <span className="text-xs text-slate-500">{incidents.length} ({percentage.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={cn("h-full transition-all", bgColor)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disaster Types */}
      {Object.keys(disasterTypes).length > 0 && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Disaster Types</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(disasterTypes)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="rounded-lg bg-slate-800/50 border border-slate-700/40 p-3">
                  <p className="text-sm font-semibold text-slate-200">{type}</p>
                  <p className="text-xs text-slate-500 mt-1">{count} incident{count === 1 ? "" : "s"}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Urgency Analysis */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Urgency Analysis</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Total Urgent Cases</p>
            <p className="text-2xl font-black text-orange-300">{stats.totalUrgent}</p>
            <p className="text-xs text-slate-500 mt-1">requiring immediate help</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Avg Per Incident</p>
            <p className="text-2xl font-black text-slate-200">
              {stats.totalIncidents > 0 ? (stats.totalUrgent / stats.totalIncidents).toFixed(1) : "0"}
            </p>
            <p className="text-xs text-slate-500 mt-1">urgent people/incident</p>
          </div>
        </div>
      </div>

      {/* Severity Summary */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Severity Summary</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-xs text-slate-500 mb-1">Critical</p>
            <p className="text-2xl font-black text-red-300">{stats.criticalCount}</p>
          </div>
          <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3">
            <p className="text-xs text-slate-500 mb-1">High</p>
            <p className="text-2xl font-black text-orange-300">{stats.highCount}</p>
          </div>
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
            <p className="text-xs text-slate-500 mb-1">Medium</p>
            <p className="text-2xl font-black text-yellow-300">{stats.mediumCount}</p>
          </div>
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <p className="text-xs text-slate-500 mb-1">Low</p>
            <p className="text-2xl font-black text-green-300">{stats.lowCount}</p>
          </div>
        </div>
      </div>

      {/* Incident Status Summary */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Incident Status</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "New", count: entries.filter(e => e.status === "NEW").length, color: "slate" },
            { label: "Assigned", count: entries.filter(e => e.status === "ASSIGNED").length, color: "blue" },
            { label: "En Route", count: entries.filter(e => e.status === "EN_ROUTE").length, color: "orange" },
            { label: "Rescued", count: entries.filter(e => e.status === "RESCUED").length, color: "green" },
          ].map((item) => {
            const colorMap = {
              slate: "bg-slate-500/10 border-slate-500/20 text-slate-300",
              blue: "bg-blue-500/10 border-blue-500/20 text-blue-300",
              orange: "bg-orange-500/10 border-orange-500/20 text-orange-300",
              green: "bg-green-500/10 border-green-500/20 text-green-300",
            };
            return (
              <div key={item.label} className={cn("rounded-lg border p-3", colorMap[item.color as keyof typeof colorMap])}>
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className="text-2xl font-black">{item.count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Coverage */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Team Coverage</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Assigned", count: entries.filter(e => e.assignedTeam).length, color: "blue" },
            { label: "Unassigned", count: entries.filter(e => !e.assignedTeam).length, color: "slate" },
            { label: "High/Critical", count: entries.filter(e => (e.result.rescuePriority === "HIGH" || e.result.rescuePriority === "CRITICAL")).length, color: "red" },
            { label: "With Location", count: entries.filter(e => e.latitude !== undefined && e.longitude !== undefined).length, color: "green" },
          ].map((item) => {
            const colorMap = {
              slate: "bg-slate-500/10 border-slate-500/20 text-slate-300",
              blue: "bg-blue-500/10 border-blue-500/20 text-blue-300",
              red: "bg-red-500/10 border-red-500/20 text-red-300",
              green: "bg-green-500/10 border-green-500/20 text-green-300",
            };
            return (
              <div key={item.label} className={cn("rounded-lg border p-3", colorMap[item.color as keyof typeof colorMap])}>
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className="text-2xl font-black">{item.count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          These statistics are generated from your incident history. Use this data to understand disaster patterns and allocate resources effectively.
        </p>
      </div>
    </div>
  );
}
