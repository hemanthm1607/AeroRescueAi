"use client";

import { useState, useCallback, useEffect } from "react";
import type { User, AnalysisResult, AnalysisHistoryEntry, InputMode } from "@/types";
import type { ErrorType } from "@/components/ErrorState";
import type { ModuleId } from "@/components/Sidebar";
import { generateId, formatTimestamp, generateIncidentId } from "@/lib/utils";
import { addHistoryEntry, getHistory } from "@/lib/history";
import { addOrUpdateIncident, getIncidents } from "@/lib/incidents";
import { requestGeoLocation } from "@/lib/geo";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ModuleDetection from "@/components/modules/ModuleDetection";
import ModuleBattery from "@/components/modules/ModuleBattery";
import ModuleIncidents from "@/components/modules/ModuleIncidents";
import ModuleHistory from "@/components/modules/ModuleHistory";
import ModuleOurApp from "@/components/modules/ModuleOurApp";
import ModuleResources from "@/components/modules/ModuleResources";
import ModuleIncidentStats from "@/components/modules/ModuleIncidentStats";
import DroneLocationWidget from "@/components/DroneLocationWidget";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

interface CurrentAnalysis {
  result: AnalysisResult;
  previewUrl: string;
  inputMode: InputMode;
  timestamp: string;
  incidentId?: string;
  latitude?: number;
  longitude?: number;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeModule, setActiveModule] = useState<ModuleId>("detection");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<CurrentAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<{ type: ErrorType; message: string } | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [incidents, setIncidents] = useState<AnalysisHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
    setIncidents(getIncidents());
  }, []);

  const criticalCount = history.filter((e) => e.result.rescuePriority === "CRITICAL").length;

  // ─── AI Analysis for uploaded images ──────────────────────────────────────
  const handleAnalyze = useCallback(
    async (base64: string, mimeType: string, previewUrl: string, mode: InputMode) => {
      setIsAnalyzing(true);
      setAnalysisError(null);
      setCurrentAnalysis(null);

      try {
        // Get GPS location if available
        const geoLocation = await requestGeoLocation();

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          let errorType: ErrorType = "api";
          if (res.status === 503) {
            const isConfigError = typeof data.error === "string" &&
              (data.error.includes("configured") || data.error.includes("API key"));
            errorType = isConfigError ? "api" : "network";
          }
          if (res.status === 0) errorType = "network";
          if (res.status === 502) errorType = "invalid_response";
          if (res.status === 401) errorType = "api";
          if (res.status === 400) errorType = "api";
          setAnalysisError({ type: errorType, message: data.error ?? "Analysis failed. Please try again." });
          return;
        }

        const timestamp = new Date().toISOString();
        const incidentId = generateIncidentId();
        const analysisResult = data.result as AnalysisResult;

        // Attach location and incident ID to result
        if (geoLocation) {
          analysisResult.latitude = geoLocation.latitude;
          analysisResult.longitude = geoLocation.longitude;
        }
        analysisResult.incidentId = incidentId;

        setCurrentAnalysis({
          result: analysisResult,
          previewUrl,
          inputMode: mode,
          timestamp: formatTimestamp(timestamp),
          incidentId,
          latitude: geoLocation?.latitude,
          longitude: geoLocation?.longitude,
        });

        const entry: AnalysisHistoryEntry = {
          id: generateId(),
          incidentId,
          timestamp,
          imageThumbnail: previewUrl,
          result: analysisResult,
          inputMode: mode,
          latitude: geoLocation?.latitude,
          longitude: geoLocation?.longitude,
        };
        addHistoryEntry(entry);
        setHistory(getHistory());
        
        // Add to incidents with status tracking
        addOrUpdateIncident(entry);
        setIncidents(getIncidents());

        setTimeout(() => {
          document.getElementById("detection-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      } catch (err) {
        console.error("[Dashboard] handleAnalyze fetch error:", err);
        setAnalysisError({ type: "network", message: "Could not reach the analysis server. Check your connection." });
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  // ─── Drone result arrives pre-analyzed from the phone via Ably ────────────
  const handleDroneResult = useCallback((
    result: AnalysisResult,
    previewDataUrl: string,
    capturedAt: string,
    latitude?: number,
    longitude?: number,
  ) => {
    const timestamp = new Date(capturedAt).toISOString();
    const formatted = formatTimestamp(timestamp);
    const incidentId = result.incidentId || generateIncidentId();

    // Attach incident ID if not already present
    if (!result.incidentId) {
      result.incidentId = incidentId;
    }
    if (latitude !== undefined) {
      result.latitude = latitude;
    }
    if (longitude !== undefined) {
      result.longitude = longitude;
    }

    setCurrentAnalysis({
      result,
      previewUrl: previewDataUrl,
      inputMode: "drone",
      timestamp: formatted,
      incidentId,
      latitude,
      longitude,
    });
    setAnalysisError(null);

    const entry: AnalysisHistoryEntry = {
      id: generateId(),
      incidentId,
      timestamp,
      imageThumbnail: previewDataUrl,
      result,
      inputMode: "drone",
      latitude,
      longitude,
    };
    addHistoryEntry(entry);
    setHistory(getHistory());
    
    // Add to incidents with status tracking
    addOrUpdateIncident(entry);
    setIncidents(getIncidents());

    // Switch to detection module and scroll to results
    setActiveModule("detection");
    setTimeout(() => {
      document.getElementById("detection-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#060b14]">

      {/* ── Fixed-width left sidebar ──────────────────────────── */}
      <Sidebar active={activeModule} onChange={setActiveModule} />

      {/* ── Right panel: topbar + scrollable content ─────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Compact top bar */}
        <TopBar
          user={user}
          onLogout={onLogout}
          activeModule={activeModule}
          criticalCount={criticalCount}
        />

        {/* Scrollable module area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

            {/* MODULE 1 — Upload & Detection (default) */}
            {activeModule === "detection" && (
              <div className="space-y-6">
                <ModuleDetection
                  isAnalyzing={isAnalyzing}
                  currentAnalysis={currentAnalysis}
                  analysisError={analysisError}
                  onUploadAnalyze={(b64, mime, preview) => handleAnalyze(b64, mime, preview, "upload")}
                  onDroneResult={handleDroneResult}
                  onClearError={() => setAnalysisError(null)}
                />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex-1 h-px bg-slate-700/40" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Additional Info</span>
                      <div className="flex-1 h-px bg-slate-700/40" />
                    </div>
                  </div>
                  <DroneLocationWidget />
                </div>
              </div>
            )}

            {/* MODULE 2 — Drone Battery */}
            {activeModule === "battery" && <ModuleBattery />}

            {/* MODULE 3 — Incidents */}
            {activeModule === "incidents" && (
              <ModuleIncidents
                incidents={incidents}
                onIncidentUpdate={() => {
                  setIncidents(getIncidents());
                }}
              />
            )}

            {/* MODULE 4 — History */}
            {activeModule === "history" && (
              <ModuleHistory entries={history} onClear={() => setHistory([])} />
            )}

            {/* MODULE 5 — Resource Allocation */}
            {activeModule === "resources" && (
              <ModuleResources entries={history} />
            )}

            {/* MODULE 6 — Incident Statistics */}
            {activeModule === "stats" && (
              <ModuleIncidentStats entries={history} />
            )}

            {/* MODULE 7 — Our App */}
            {activeModule === "ourapp" && <ModuleOurApp />}

          </div>
        </main>
      </div>
    </div>
  );
}
