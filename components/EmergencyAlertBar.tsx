"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X, Eye, MapPin, Users, Volume2, VolumeX } from "lucide-react";
import type { EmergencyAlert, AnalysisHistoryEntry } from "@/types";
import { getActiveAlerts, dismissAlert, getIncidents } from "@/lib/incidents";
import { cn } from "@/lib/utils";
import { formatCoordinates } from "@/lib/utils";
import { playEmergencySiren, stopSiren, isSirenPlaying, enableAudioOnUserGesture } from "@/lib/audioAlert";

interface EmergencyAlertBarProps {
  onViewIncident?: (incidentId: string) => void;
}

export default function EmergencyAlertBar({ onViewIncident }: EmergencyAlertBarProps) {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [currentAlert, setCurrentAlert] = useState<EmergencyAlert | null>(null);
  const [incident, setIncident] = useState<AnalysisHistoryEntry | null>(null);
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);

  useEffect(() => {
    const loadAlerts = () => {
      const activeAlerts = getActiveAlerts();
      setAlerts(activeAlerts);
      
      // Show the most recent alert
      if (activeAlerts.length > 0) {
        const latest = activeAlerts[0];
        setCurrentAlert(latest);
        
        // Find the corresponding incident
        const incidents = getIncidents();
        const foundIncident = incidents.find(i => i.incidentId === latest.incidentId);
        setIncident(foundIncident || null);
      } else {
        setCurrentAlert(null);
        setIncident(null);
        setSirenPlaying(false);
      }
    };

    loadAlerts();
    
    // Check for new alerts every 5 seconds
    const interval = setInterval(loadAlerts, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    if (currentAlert) {
      dismissAlert(currentAlert.id);
      setSirenPlaying(false);
      stopSiren();
      
      // Find the next alert
      const remaining = alerts.filter(a => a.id !== currentAlert.id);
      setAlerts(remaining);
      
      if (remaining.length > 0) {
        const nextAlert = remaining[0];
        setCurrentAlert(nextAlert);
        
        const incidents = getIncidents();
        const foundIncident = incidents.find(i => i.incidentId === nextAlert.incidentId);
        setIncident(foundIncident || null);
      } else {
        setCurrentAlert(null);
        setIncident(null);
      }
    }
  };

  const handleViewIncident = () => {
    if (currentAlert && onViewIncident) {
      onViewIncident(currentAlert.incidentId);
    }
  };

  const handleToggleSiren = async () => {
    if (!audioInitialized) {
      enableAudioOnUserGesture();
      setAudioInitialized(true);
    }

    if (sirenPlaying) {
      stopSiren();
      setSirenPlaying(false);
    } else {
      const success = await playEmergencySiren(3000);
      setSirenPlaying(success);
    }
  };

  if (!currentAlert || !incident) {
    return null;
  }

  const getAlertColor = (type: EmergencyAlert["type"]) => {
    if (type.includes("CRITICAL")) {
      return {
        bg: "bg-red-500/20",
        border: "border-red-500/40",
        text: "text-red-300",
        icon: "text-red-400",
        pulse: "bg-red-400"
      };
    }
    return {
      bg: "bg-orange-500/20",
      border: "border-orange-500/40",
      text: "text-orange-300",
      icon: "text-orange-400",
      pulse: "bg-orange-400"
    };
  };

  const colors = getAlertColor(currentAlert.type);
  const { result } = incident;

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 shadow-lg",
      colors.bg,
      colors.border
    )}>
      <div className="flex items-start gap-4">
        {/* Alert Icon - with pulse animation */}
        <div className="flex-shrink-0 relative">
          <div className={cn("w-12 h-12 rounded-xl border-2 flex items-center justify-center", colors.border)}>
            <AlertTriangle className={cn("w-6 h-6", colors.icon)} />
          </div>
          <div className={cn("absolute -top-1 -right-1 w-4 h-4 rounded-full animate-pulse", colors.pulse)} />
        </div>

        {/* Alert Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn("text-lg font-bold", colors.text)}>🚨 EMERGENCY ALERT</h3>
                {alerts.length > 1 && (
                  <span className="px-2 py-1 rounded-full bg-black/20 text-xs font-bold">
                    +{alerts.length - 1} more
                  </span>
                )}
              </div>
              <p className={cn("text-sm font-medium", colors.text)}>
                Immediate rescue attention required
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Siren Toggle Button */}
              <button
                onClick={handleToggleSiren}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  sirenPlaying
                    ? "bg-red-500/30 hover:bg-red-500/40 text-red-300"
                    : "bg-black/20 hover:bg-black/30 text-slate-400 hover:text-white"
                )}
                title={sirenPlaying ? "Mute Siren" : "Play Siren"}
              >
                {sirenPlaying ? (
                  <Volume2 className="w-4 h-4 animate-pulse" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>
              
              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
                title="Dismiss Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Incident Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-black/10 rounded-lg p-3">
              <p className="text-xs text-slate-300 mb-1">INCIDENT</p>
              <p className="font-mono text-sm font-bold">{incident.incidentId}</p>
            </div>
            
            <div className="bg-black/10 rounded-lg p-3">
              <p className="text-xs text-slate-300 mb-1">REASON</p>
              <p className="text-sm font-semibold">{currentAlert.reason}</p>
            </div>
            
            <div className="bg-black/10 rounded-lg p-3">
              <p className="text-xs text-slate-300 mb-1">PRIORITY</p>
              <p className="text-sm font-bold">
                {result.rescuePriority} / {result.floodSeverity}
              </p>
            </div>
          </div>

          {/* Quick Info Row */}
          <div className="flex items-center gap-6 text-sm">
            {result.peopleDetected > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{result.peopleDetected} people</span>
              </div>
            )}
            
            {result.latitude !== undefined && result.longitude !== undefined && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-green-400" />
                <span className="font-mono text-xs">
                  {formatCoordinates(result.latitude, result.longitude)}
                </span>
              </div>
            )}
            
            {incident.assignedTeam && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>{incident.assignedTeam}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>{incident.status || 'NEW'}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0">
          <button
            onClick={handleViewIncident}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-sm transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View Incident
          </button>
        </div>
      </div>

      {/* Photo Preview if available */}
      {incident.imageThumbnail && (
        <div className="mt-4 flex justify-center">
          <img
            src={incident.imageThumbnail}
            alt="Incident preview"
            className="h-24 w-auto rounded-lg border border-white/20 object-cover cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleViewIncident}
          />
        </div>
      )}
    </div>
  );
}