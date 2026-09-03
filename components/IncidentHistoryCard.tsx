"use client";

import { useState } from "react";
import { 
  Calendar, 
  Users, 
  MapPin, 
  Eye, 
  Settings, 
  Download,
  Image as ImageIcon,
  Clock
} from "lucide-react";
import type { AnalysisHistoryEntry, RescueTeam, IncidentStatus } from "@/types";
import { getSeverityBg, formatTimestamp, formatCoordinates, cn } from "@/lib/utils";
import { updateIncidentStatus, assignRescueTeam, removeTeamAssignment } from "@/lib/incidents";
import { exportIncidentToPDF } from "@/lib/pdfExport";
import { SeverityDot } from "@/components/ui/Badge";
import TeamAssignmentModal from "./TeamAssignmentModal";
import IncidentPhotoModal from "./IncidentPhotoModal";

interface IncidentHistoryCardProps {
  incident: AnalysisHistoryEntry;
  onUpdate?: () => void;
}

const STATUS_COLORS: Record<IncidentStatus, string> = {
  NEW: "bg-slate-500/20 border-slate-500/40 text-slate-300",
  ASSIGNED: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  EN_ROUTE: "bg-orange-500/20 border-orange-500/40 text-orange-300",
  RESCUED: "bg-green-500/20 border-green-500/40 text-green-300"
};

export default function IncidentHistoryCard({ 
  incident, 
  onUpdate 
}: IncidentHistoryCardProps) {
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { result, timestamp, incidentId, latitude, longitude, status, assignedTeam } = incident;

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      exportIncidentToPDF(incident);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAssignTeam = (team: RescueTeam) => {
    if (incidentId) {
      assignRescueTeam(incidentId, team);
      onUpdate?.();
    }
  };

  const handleRemoveTeam = () => {
    if (incidentId) {
      removeTeamAssignment(incidentId);
      onUpdate?.();
    }
  };

  const handleUpdateStatus = (newStatus: IncidentStatus) => {
    if (incidentId) {
      updateIncidentStatus(incidentId, newStatus);
      onUpdate?.();
    }
  };

  return (
    <>
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-800/30 border-b border-slate-700/40">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Photo Thumbnail */}
            <button
              onClick={() => setShowPhotoModal(true)}
              className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-slate-600/50 bg-slate-800 hover:border-slate-500 transition-colors group"
            >
              {incident.imageThumbnail ? (
                <img
                  src={incident.imageThumbnail}
                  alt="Incident thumbnail"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-slate-500" />
                </div>
              )}
            </button>

            {/* Incident Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-slate-200 font-mono truncate">
                  {incidentId || `Analysis ${incident.id.slice(-6)}`}
                </h3>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold border",
                  STATUS_COLORS[status || "NEW"]
                )}>
                  {status || "NEW"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimestamp(timestamp)}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {incident.inputMode === "drone" ? "Drone" : "Upload"}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-slate-300 transition-colors"
              title="Export PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowTeamModal(true)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-slate-300 transition-colors"
              title="Manage Team"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-slate-400">People</span>
              </div>
              <p className="text-lg font-bold text-blue-300">{result.peopleDetected}</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-400">Priority</span>
              </div>
              <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border", getSeverityBg(result.rescuePriority))}>
                <SeverityDot severity={result.rescuePriority} />
                {result.rescuePriority}
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-400">Flood</span>
              </div>
              <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border", getSeverityBg(result.floodSeverity))}>
                <SeverityDot severity={result.floodSeverity} />
                {result.floodSeverity}
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-400">Type</span>
              </div>
              <p className="text-sm font-semibold text-slate-200 truncate">
                {result.disasterType}
              </p>
            </div>
          </div>

          {/* Team and Location Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Assigned Team</div>
              {assignedTeam ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-sm font-semibold text-blue-300">{assignedTeam}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-500">Not assigned</span>
              )}
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Location</div>
              {latitude !== undefined && longitude !== undefined ? (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-green-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-slate-300 truncate">
                    {formatCoordinates(latitude, longitude)}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-500">Not available</span>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-2">Situation Summary</div>
            <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
              {result.summary}
            </p>
          </div>

          {/* Hazards if any */}
          {result.hazards.length > 0 && (
            <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-2">Detected Hazards ({result.hazards.length})</div>
              <div className="space-y-1">
                {result.hazards.slice(0, 3).map((hazard, idx) => (
                  <div key={idx} className="text-xs text-slate-300">
                    <span className="font-semibold">{hazard.name}</span>
                    <span className="text-slate-500"> • {hazard.severity}</span>
                  </div>
                ))}
                {result.hazards.length > 3 && (
                  <div className="text-xs text-slate-500">+{result.hazards.length - 3} more hazard{result.hazards.length - 3 !== 1 ? 's' : ''}</div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations if any */}
          {result.recommendations.length > 0 && (
            <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-2">Recommended Actions ({result.recommendations.length})</div>
              <div className="space-y-1">
                {result.recommendations.slice(0, 2).map((rec, idx) => (
                  <div key={idx} className="text-xs text-slate-300">
                    ✓ {rec}
                  </div>
                ))}
                {result.recommendations.length > 2 && (
                  <div className="text-xs text-slate-500">+{result.recommendations.length - 2} more recommendation{result.recommendations.length - 2 !== 1 ? 's' : ''}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showTeamModal && (
        <TeamAssignmentModal
          incidentId={incidentId || incident.id}
          currentTeam={assignedTeam}
          currentStatus={status}
          onAssignTeam={handleAssignTeam}
          onRemoveTeam={handleRemoveTeam}
          onUpdateStatus={handleUpdateStatus}
          onClose={() => setShowTeamModal(false)}
        />
      )}

      {showPhotoModal && (
        <IncidentPhotoModal
          imageUrl={incident.imageThumbnail}
          incidentId={incidentId || incident.id}
          onClose={() => setShowPhotoModal(false)}
        />
      )}
    </>
  );
}