"use client";

import { useState, useCallback, useEffect } from "react";
import type { User, AnalysisResult, AnalysisHistoryEntry, InputMode } from "@/types";
import type { ErrorType } from "@/components/ErrorState";
import type { ModuleId } from "@/components/Sidebar";
import { generateId, formatTimestamp } from "@/lib/utils";
import { addHistoryEntry, getHistory } from "@/lib/history";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ModuleDetection from "@/components/modules/ModuleDetection";
import ModuleBattery from "@/components/modules/ModuleBattery";
import ModuleHistory from "@/components/modules/ModuleHistory";
import ModuleOurApp from "@/components/modules/ModuleOurApp";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

interface CurrentAnalysis {
  result: AnalysisResult;
  previewUrl: string;
  inputMode: InputMode;
  timestamp: string;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeModule, setActiveModule] = useState<ModuleId>("detection");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<CurrentAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<{ type: ErrorType; message: string } | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const criticalCount = history.filter((e) => e.result.rescuePriority === "CRITICAL").length;

  // ─── AI Analysis (unchanged from original) ─────────────────────────────────
  const handleAnalyze = useCallback(
    async (base64: string, mimeType: string, previewUrl: string, mode: InputMode) => {
      setIsAnalyzing(true);
      setAnalysisError(null);
      setCurrentAnalysis(null);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          let errorType: ErrorType = "api";
          if (res.status === 503) {
            // 503 from our route means either "API key not configured" or network issue
            // If there's a specific error message about configuration, keep "api" type
            // so the ServerCrash icon shows — not "network" (WifiOff)
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
        setCurrentAnalysis({ result: data.result, previewUrl, inputMode: mode, timestamp: formatTimestamp(timestamp) });

        const entry: AnalysisHistoryEntry = {
          id: generateId(),
          timestamp,
          imageThumbnail: previewUrl,
          result: data.result,
          inputMode: mode,
        };
        addHistoryEntry(entry);
        setHistory(getHistory());

        // Scroll to results
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
              <ModuleDetection
                isAnalyzing={isAnalyzing}
                currentAnalysis={currentAnalysis}
                analysisError={analysisError}
                onUploadAnalyze={(b64, mime, preview) => handleAnalyze(b64, mime, preview, "upload")}
                onDroneAnalyze={(b64, mime, preview) => handleAnalyze(b64, mime, preview, "drone")}
                onClearError={() => setAnalysisError(null)}
              />
            )}

            {/* MODULE 2 — Drone Battery */}
            {activeModule === "battery" && <ModuleBattery />}

            {/* MODULE 3 — History */}
            {activeModule === "history" && (
              <ModuleHistory entries={history} onClear={() => setHistory([])} />
            )}

            {/* MODULE 4 — Our App */}
            {activeModule === "ourapp" && <ModuleOurApp />}

          </div>
        </main>
      </div>
    </div>
  );
}
