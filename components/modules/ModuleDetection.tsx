"use client";

import {
  ScanSearch,
  Droplets,
  ShieldAlert,
  TriangleAlert,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  ImageUp,
  AlertCircle,
} from "lucide-react";
import type { AnalysisResult, InputMode } from "@/types";
import type { ErrorType } from "@/components/ErrorState";
import { getSeverityBg, getSeverityColor, cn } from "@/lib/utils";
import ImageUploader from "@/components/ImageUploader";
import DroneStatusWidget from "@/components/DroneStatusWidget";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import { SeverityDot } from "@/components/ui/Badge";
import { useState } from "react";

interface ModuleDetectionProps {
  isAnalyzing: boolean;
  currentAnalysis: {
    result: AnalysisResult;
    previewUrl: string;
    inputMode: InputMode;
    timestamp: string;
  } | null;
  analysisError: { type: ErrorType; message: string } | null;
  onUploadAnalyze: (b64: string, mime: string, preview: string) => void;
  /** Called when the drone phone delivers a pre-analyzed result via Ably */
  onDroneResult: (result: AnalysisResult, previewDataUrl: string, capturedAt: string) => void;
  onClearError: () => void;
}

export default function ModuleDetection({
  isAnalyzing,
  currentAnalysis,
  analysisError,
  onUploadAnalyze,
  onDroneResult,
  onClearError,
}: ModuleDetectionProps) {
  const [hazardsOpen, setHazardsOpen] = useState(true);

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30">
          <ScanSearch className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white">Upload Image + Live Detection</h1>
          <p className="text-xs text-slate-500">Upload a flood image or connect the drone phone, then run AI analysis.</p>
        </div>
      </div>

      {/* ── Two input cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* CARD 1 — Upload Flood Image (unchanged) */}
        <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-b from-blue-950/20 to-[#080e1a] overflow-hidden shadow-lg shadow-blue-950/20">
          <div className="flex items-center gap-3 px-5 py-4 bg-blue-950/30 border-b border-blue-500/15">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/35 shrink-0">
              <ImageUp className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-100 leading-none">Upload Flood Image</h2>
              <p className="text-xs text-blue-300/60 mt-0.5">Drag & drop or browse · JPEG, PNG, WEBP</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[10px] text-blue-300 font-bold uppercase tracking-wide shrink-0">
              Image
            </span>
          </div>
          <div className="p-5">
            <ImageUploader onAnalyze={onUploadAnalyze} isAnalyzing={isAnalyzing} />
          </div>
        </div>

        {/* CARD 2 — Drone Connection Status (receives analyzed results from phone via Ably) */}
        <DroneStatusWidget
          onResultReceived={onDroneResult}
          isAnalyzing={isAnalyzing}
        />
      </div>

      {/* ── Analysis output ───────────────────────────────────── */}
      {(isAnalyzing || analysisError || currentAnalysis) && (
        <div id="detection-results" className="flex flex-col gap-5">

          {/* Section divider */}
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-5 rounded-full bg-blue-500" />
            <Activity className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Analysis Output</h2>
            <div className="flex-1 h-px bg-slate-800/60" />
          </div>

          {/* Loading */}
          {isAnalyzing && (
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 overflow-hidden">
              <LoadingState />
            </div>
          )}

          {/* Error */}
          {!isAnalyzing && analysisError && (
            <div className="rounded-2xl border border-red-800/30 bg-slate-900/40 p-5">
              <ErrorState
                type={analysisError.type}
                message={analysisError.message}
                onRetry={onClearError}
              />
            </div>
          )}

          {/* Results */}
          {!isAnalyzing && !analysisError && currentAnalysis && (
            <ResultCards
              result={currentAnalysis.result}
              previewUrl={currentAnalysis.previewUrl}
              inputMode={currentAnalysis.inputMode}
              timestamp={currentAnalysis.timestamp}
              hazardsOpen={hazardsOpen}
              onToggleHazards={() => setHazardsOpen((v) => !v)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Result cards ─────────────────────────────────────────────────────────────

interface ResultCardsProps {
  result: AnalysisResult;
  previewUrl: string;
  inputMode: InputMode;
  timestamp: string;
  hazardsOpen: boolean;
  onToggleHazards: () => void;
}

// Deterministic rescue team count — not calculated by AI
function rescueTeamsRequired(people: number): number {
  if (people <= 0) return 0;
  if (people <= 5) return 1;
  if (people <= 10) return 3;
  return 5;
}

function ResultCards({ result, previewUrl, inputMode, timestamp, hazardsOpen, onToggleHazards }: ResultCardsProps) {
  const teams = rescueTeamsRequired(result.peopleDetected);

  // Helper to truncate text to specified lines
  const truncateText = (text: string, lines: number) => {
    const lineArray = text.split('\n');
    if (lineArray.length > lines) {
      return lineArray.slice(0, lines).join('\n') + '...';
    }
    return text;
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── TOP SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* People Detected */}
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col items-center gap-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">People Detected</p>
          <p className="text-4xl font-black text-blue-300">{result.peopleDetected}</p>
          <p className="text-xs text-slate-500">{result.peopleDetected === 1 ? "person" : "people"} in scene</p>
        </div>

        {/* Rescue Teams */}
        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 flex flex-col items-center gap-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Rescue Teams</p>
          <p className="text-4xl font-black text-orange-300">{teams}</p>
          <p className="text-xs text-slate-500">{teams === 1 ? "team" : "teams"} required</p>
        </div>

        {/* Disaster Type */}
        <div className="rounded-lg border border-slate-600/40 bg-slate-800/50 p-4 flex flex-col items-center gap-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Disaster Type</p>
          <p className="text-2xl font-black text-slate-100">{result.disasterType}</p>
          <p className="text-xs text-slate-500">from image</p>
        </div>
      </div>

      {/* ── SCENE PREVIEW ── */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 overflow-hidden">
        <img src={previewUrl} alt="Analysed scene" className="w-full h-32 object-cover" />
        <div className="px-3 py-2 border-t border-slate-700/40 bg-slate-950/50">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">
            {inputMode === "drone" ? "Drone frame" : "Uploaded image"} · {timestamp}
          </p>
        </div>
      </div>

      {/* ── FLOOD SEVERITY ── */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Flood Severity</span>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase border", getSeverityBg(result.floodSeverity))}>
            <SeverityDot severity={result.floodSeverity} />
            {result.floodSeverity}
          </span>
        </div>
        <SeverityBar severity={result.floodSeverity} />
        <p className="text-xs text-slate-300 mt-2 line-clamp-2">{result.waterCondition}</p>
      </div>

      {/* ── RESCUE PRIORITY ── */}
      <div className={cn("rounded-lg border p-4", getSeverityBg(result.rescuePriority))}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className={cn("w-4 h-4", getSeverityColor(result.rescuePriority))} />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Rescue Priority</span>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase border", getSeverityBg(result.rescuePriority))}>
            <SeverityDot severity={result.rescuePriority} />
            {result.rescuePriority}
          </span>
        </div>
        <p className="text-xs text-slate-200 line-clamp-2">{truncateText(result.summary, 2)}</p>
      </div>

      {/* ── SITUATION SUMMARY ── */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Situation Summary</span>
        </div>
        <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{truncateText(result.summary, 3)}</p>
      </div>

      {/* ── RECOMMENDED ACTIONS ── */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Recommended Actions</span>
        </div>
        <div className="flex flex-col gap-2">
          {result.recommendations.length === 0 ? (
            <p className="text-xs text-slate-500">No specific recommendations.</p>
          ) : (
            result.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-green-400 text-xs font-bold shrink-0">✓</span>
                <p className="text-xs text-slate-300 line-clamp-1">{rec}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── HAZARDS DETECTED ── */}
      <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 overflow-hidden">
        <button
          onClick={onToggleHazards}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-500/10 transition-colors"
          aria-expanded={hazardsOpen}
        >
          <TriangleAlert className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex-1">
            Hazards Detected
          </span>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/30 text-xs font-bold text-orange-300 shrink-0">
            {result.hazards.length}
          </span>
          {hazardsOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </button>

        {hazardsOpen && (
          <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
            {result.hazards.length === 0 ? (
              <div className="flex items-center gap-2 py-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <p className="text-xs text-slate-400">No hazards detected.</p>
              </div>
            ) : (
              result.hazards.map((h, i) => (
                <div key={i} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-bold text-slate-200">{h.name}</p>
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold uppercase border shrink-0", getSeverityBg(h.severity))}>
                      <SeverityDot severity={h.severity} />
                      {h.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{h.description}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SeverityBar({ severity }: { severity: string }) {
  const levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const idx = levels.indexOf(severity);
  const colors = ["bg-green-500", "bg-yellow-500", "bg-orange-500", "bg-red-500"];
  return (
    <div className="flex gap-1 h-1.5">
      {levels.map((_, i) => (
        <div key={i} className={cn("flex-1 rounded-full", i <= idx ? colors[i] : "bg-slate-700")} />
      ))}
    </div>
  );
}