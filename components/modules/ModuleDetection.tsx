"use client";

import {
  ScanSearch,
  Users,
  Droplets,
  ShieldAlert,
  TriangleAlert,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  ImageUp,
  Siren,
  AlertCircle,
} from "lucide-react";
import type { AnalysisResult, InputMode } from "@/types";
import type { ErrorType } from "@/components/ErrorState";
import { getSeverityBg, getSeverityColor, cn } from "@/lib/utils";
import ImageUploader from "@/components/ImageUploader";
import DroneStatusWidget from "@/components/DroneStatusWidget";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import HazardCard from "@/components/HazardCard";
import RescuePriority from "@/components/RescuePriority";
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

  return (
    <div className="flex flex-col gap-4">

      {/* Row 1 — scene preview + 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Scene preview */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden sm:col-span-2 lg:col-span-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Analysed scene" className="w-full h-40 object-cover" />
          <div className="px-3 py-2 border-t border-slate-700/40">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">
              {inputMode === "drone" ? "Drone frame" : "Uploaded image"} · {timestamp}
            </p>
          </div>
        </div>

        {/* People Detected */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">People Detected</span>
          </div>
          <p className="text-5xl font-black text-blue-300 leading-none">{result.peopleDetected}</p>
          <p className="text-xs text-slate-400">{result.peopleDetected === 1 ? "person" : "people"} in scene</p>
        </div>

        {/* Rescue Teams Required */}
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Siren className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Rescue Teams</span>
          </div>
          <p className="text-5xl font-black text-orange-300 leading-none">{teams}</p>
          <p className="text-xs text-slate-400">{teams === 1 ? "team" : "teams"} required</p>
        </div>

        {/* Disaster Type */}
        <div className="rounded-xl border border-slate-600/40 bg-slate-800/50 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Disaster Type</span>
          </div>
          <p className="text-xl font-black text-slate-100 leading-tight">{result.disasterType}</p>
          <p className="text-xs text-slate-500">identified from image</p>
        </div>
      </div>

      {/* Row 2 — Flood Severity + Water Condition */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Flood Severity</span>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-black uppercase border", getSeverityBg(result.floodSeverity))}>
            <SeverityDot severity={result.floodSeverity} />
            {result.floodSeverity}
          </span>
        </div>
        <SeverityBar severity={result.floodSeverity} />
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Water Condition</p>
          <p className="text-xs text-slate-300 leading-relaxed">{result.waterCondition}</p>
        </div>
      </div>

      {/* Rescue priority — full width */}
      <div className={cn("rounded-xl border p-5", getSeverityBg(result.rescuePriority))}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className={cn("w-4 h-4", getSeverityColor(result.rescuePriority))} />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Rescue Priority</span>
        </div>
        <RescuePriority
          priority={result.rescuePriority}
          peopleDetected={result.peopleDetected}
          urgentPeople={result.urgentPeople}
          recommendations={result.recommendations}
          summary={result.summary}
        />
      </div>

      {/* Hazards — collapsible */}
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 overflow-hidden">
        <button
          onClick={onToggleHazards}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-orange-500/5 transition-colors"
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
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </button>

        {hazardsOpen && (
          <div className="px-5 pb-5 flex flex-col gap-3">
            {result.hazards.length === 0 ? (
              <div className="flex items-center gap-2 py-3">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <p className="text-sm text-slate-400">No hazards detected in this scene.</p>
              </div>
            ) : (
              result.hazards.map((h, i) => (
                <HazardCard key={i} hazard={h} index={i} />
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