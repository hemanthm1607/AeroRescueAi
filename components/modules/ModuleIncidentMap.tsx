"use client";

import { useState } from "react";
import { Map, MapPin, AlertCircle, Users } from "lucide-react";
import type { AnalysisHistoryEntry } from "@/types";
import { getSeverityColor, getSeverityBg, cn } from "@/lib/utils";
import { formatCoordinates } from "@/lib/geo";

interface ModuleIncidentMapProps {
  entries: AnalysisHistoryEntry[];
}

export default function ModuleIncidentMap({ entries }: ModuleIncidentMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter incidents with GPS coordinates
  const geoIncidents = entries.filter(
    (e) => e.latitude !== undefined && e.longitude !== undefined
  );

  if (geoIncidents.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30">
            <Map className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Incident Map</h1>
            <p className="text-xs text-slate-500">No incidents with location data</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">
            No incidents with GPS coordinates available yet.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Enable geolocation when uploading images to track incident locations.
          </p>
        </div>
      </div>
    );
  }

  // Calculate map bounds for all incidents
  const lats = geoIncidents.map((e) => e.latitude as number);
  const lons = geoIncidents.map((e) => e.longitude as number);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30">
          <Map className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white">Incident Map</h1>
          <p className="text-xs text-slate-500">{geoIncidents.length} incidents with location</p>
        </div>
      </div>

      {/* Map Container (simplified text-based visualization) */}
      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-6">
        <div className="space-y-2 text-center">
          <p className="text-xs text-slate-500">Center: {formatCoordinates(centerLat, centerLon)}</p>
          <p className="text-xs text-slate-400">
            Coverage: {Math.round((maxLat - minLat) * 111)} km N-S × {Math.round((maxLon - minLon) * 111 * Math.cos((centerLat * Math.PI) / 180))} km E-W
          </p>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Incidents ({geoIncidents.length})</p>

        {geoIncidents.map((incident) => (
          <button
            key={incident.id}
            onClick={() => setSelectedId(selectedId === incident.id ? null : incident.id)}
            className={cn(
              "w-full rounded-lg border text-left transition-all",
              selectedId === incident.id
                ? "border-blue-500/40 bg-blue-500/10"
                : "border-slate-700/40 bg-slate-900/50 hover:bg-slate-900/70"
            )}
          >
            {/* Header row */}
            <div className="p-3 flex items-center gap-3">
              <MapPin className={cn("w-4 h-4 shrink-0", getSeverityColor(incident.result.rescuePriority))} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-slate-100 truncate">
                    {incident.incidentId || incident.id}
                  </p>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", getSeverityBg(incident.result.rescuePriority))}>
                    {incident.result.rescuePriority}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Users className="w-3 h-3" />
                  <span>{incident.result.peopleDetected} people</span>
                  <span>·</span>
                  <span>{new Date(incident.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Details when expanded */}
            {selectedId === incident.id && (
              <div className="px-3 pb-3 pt-0 border-t border-slate-700/40 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Location</p>
                    <p className="text-slate-200 font-mono">
                      {incident.latitude !== undefined && incident.longitude !== undefined
                        ? formatCoordinates(incident.latitude, incident.longitude)
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Disaster Type</p>
                    <p className="text-slate-200">{incident.result.disasterType}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">People</p>
                    <p className="text-slate-200">
                      {incident.result.peopleDetected} ({incident.result.urgentPeople} urgent)
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Severity</p>
                    <p className="text-slate-200">{incident.result.floodSeverity}</p>
                  </div>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong>Map Status:</strong> Showing {geoIncidents.length} incident{geoIncidents.length === 1 ? "" : "s"} with GPS coordinates. Click an incident to view details.
        </p>
      </div>
    </div>
  );
}
