"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Inbox, Shield, TrendingUp } from "lucide-react";
import type { AnalysisHistoryEntry } from "@/types";
import { getIncidents } from "@/lib/incidents";
import { cn } from "@/lib/utils";
import IncidentHistoryCard from "@/components/IncidentHistoryCard";
import EmergencyAlertBar from "@/components/EmergencyAlertBar";

interface ModuleIncidentsProps {
  incidents: AnalysisHistoryEntry[];
  onIncidentUpdate: () => void;
}

export default function ModuleIncidents({ incidents, onIncidentUpdate }: ModuleIncidentsProps) {
  const [filteredIncidents, setFilteredIncidents] = useState<AnalysisHistoryEntry[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "new" | "assigned" | "critical">("all");

  useEffect(() => {
    let filtered = incidents;

    if (activeFilter === "new") {
      filtered = incidents.filter(i => i.status === "NEW");
    } else if (activeFilter === "assigned") {
      filtered = incidents.filter(i => i.status === "ASSIGNED" || i.status === "EN_ROUTE");
    } else if (activeFilter === "critical") {
      filtered = incidents.filter(i => 
        i.result.rescuePriority === "CRITICAL" || i.result.floodSeverity === "CRITICAL"
      );
    }

    setFilteredIncidents(filtered);
  }, [incidents, activeFilter]);

  const criticalCount = incidents.filter(i => 
    i.result.rescuePriority === "CRITICAL" || i.result.floodSeverity === "CRITICAL"
  ).length;

  const newCount = incidents.filter(i => i.status === "NEW").length;
  const assignedCount = incidents.filter(i => i.status === "ASSIGNED" || i.status === "EN_ROUTE").length;

  const stats = [
    { label: "Total Incidents", value: incidents.length, icon: Shield, color: "blue" },
    { label: "New Incidents", value: newCount, icon: AlertTriangle, color: "yellow" },
    { label: "Assigned", value: assignedCount, icon: TrendingUp, color: "green" },
    { label: "Critical", value: criticalCount, icon: AlertTriangle, color: "red" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30">
          <Shield className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white">Incident Management</h1>
          <p className="text-xs text-slate-500">Track, assign teams, and manage rescue operations</p>
        </div>
      </div>

      {/* Emergency Alert */}
      <EmergencyAlertBar />

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorMap = {
            blue: "bg-blue-500/15 border-blue-500/30 text-blue-400",
            yellow: "bg-yellow-500/15 border-yellow-500/30 text-yellow-400",
            green: "bg-green-500/15 border-green-500/30 text-green-400",
            red: "bg-red-500/15 border-red-500/30 text-red-400",
          };
          
          return (
            <div 
              key={stat.label}
              className={cn(
                "rounded-lg border p-4",
                colorMap[stat.color as keyof typeof colorMap]
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {stat.label}
                </span>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-3xl font-black">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: "all", label: "All Incidents", count: incidents.length },
          { id: "new", label: "New", count: newCount },
          { id: "assigned", label: "Assigned/En Route", count: assignedCount },
          { id: "critical", label: "Critical", count: criticalCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-all whitespace-nowrap",
              activeFilter === tab.id
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                : "bg-slate-800/50 border-slate-700/40 text-slate-400 hover:bg-slate-700/50"
            )}
          >
            {tab.label}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-bold",
              activeFilter === tab.id
                ? "bg-purple-500/30"
                : "bg-slate-700/50"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Incident List */}
      {filteredIncidents.length === 0 ? (
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 px-6 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-slate-400 font-medium mb-1">
            {activeFilter === "all"
              ? "No incidents recorded yet"
              : `No ${activeFilter} incidents`}
          </p>
          <p className="text-slate-600 text-sm">
            {activeFilter === "all"
              ? "Incidents will appear here when analysis results are received"
              : "Change the filter to see other incidents"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((incident) => (
            <IncidentHistoryCard
              key={incident.id}
              incident={incident}
              onUpdate={onIncidentUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}