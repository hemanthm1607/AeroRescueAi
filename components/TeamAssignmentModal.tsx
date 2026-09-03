"use client";

import { useState } from "react";
import { X, Users, Check } from "lucide-react";
import type { RescueTeam, IncidentStatus } from "@/types";
import { cn } from "@/lib/utils";

interface TeamAssignmentModalProps {
  incidentId: string;
  currentTeam?: RescueTeam;
  currentStatus?: IncidentStatus;
  onAssignTeam: (team: RescueTeam) => void;
  onRemoveTeam: () => void;
  onUpdateStatus: (status: IncidentStatus) => void;
  onClose: () => void;
}

const RESCUE_TEAMS: RescueTeam[] = ["Team 01", "Team 02", "Team 03", "Team 04"];
const INCIDENT_STATUSES: IncidentStatus[] = ["NEW", "ASSIGNED", "EN_ROUTE", "RESCUED"];

const STATUS_COLORS: Record<IncidentStatus, string> = {
  NEW: "text-slate-400 bg-slate-500/20 border-slate-500/40",
  ASSIGNED: "text-blue-300 bg-blue-500/20 border-blue-500/40",
  EN_ROUTE: "text-orange-300 bg-orange-500/20 border-orange-500/40",
  RESCUED: "text-green-300 bg-green-500/20 border-green-500/40"
};

export default function TeamAssignmentModal({
  incidentId,
  currentTeam,
  currentStatus,
  onAssignTeam,
  onRemoveTeam,
  onUpdateStatus,
  onClose
}: TeamAssignmentModalProps) {
  const [selectedTeam, setSelectedTeam] = useState<RescueTeam | undefined>(currentTeam);
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(currentStatus || "NEW");

  const handleSave = () => {
    if (selectedTeam && selectedTeam !== currentTeam) {
      onAssignTeam(selectedTeam);
    } else if (!selectedTeam && currentTeam) {
      onRemoveTeam();
    }
    
    if (selectedStatus !== currentStatus) {
      onUpdateStatus(selectedStatus);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Manage Rescue Team</h3>
              <p className="text-sm text-slate-400">Incident {incidentId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Team Assignment */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Rescue Team Assignment
            </label>
            <div className="space-y-2">
              {/* No team option */}
              <button
                onClick={() => setSelectedTeam(undefined)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                  !selectedTeam
                    ? "bg-slate-600/30 border-slate-500 text-slate-200"
                    : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50"
                )}
              >
                <span>No team assigned</span>
                {!selectedTeam && <Check className="w-4 h-4 text-green-400" />}
              </button>
              
              {/* Team options */}
              {RESCUE_TEAMS.map((team) => (
                <button
                  key={team}
                  onClick={() => setSelectedTeam(team)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                    selectedTeam === team
                      ? "bg-blue-500/20 border-blue-500 text-blue-300"
                      : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50"
                  )}
                >
                  <span>{team}</span>
                  {selectedTeam === team && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Status Update */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Incident Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INCIDENT_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={cn(
                    "flex items-center justify-center p-3 rounded-lg border text-sm font-medium transition-all",
                    selectedStatus === status
                      ? STATUS_COLORS[status]
                      : "bg-slate-800/50 border-slate-700 text-slate-500 hover:bg-slate-700/50"
                  )}
                >
                  {status}
                  {selectedStatus === status && (
                    <Check className="w-3 h-3 ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}