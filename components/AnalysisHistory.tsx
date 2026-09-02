"use client";

import { useState } from "react";
import {
  History,
  ImageUp,
  Cpu,
  ChevronRight,
  Trash2,
  Clock,
  Users,
  Droplets,
  X,
} from "lucide-react";
import type { AnalysisHistoryEntry } from "@/types";
import { formatTimestamp, getSeverityBg, getSeverityColor, cn } from "@/lib/utils";
import { clearHistory } from "@/lib/history";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SeverityDot } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import AnalysisResult from "@/components/AnalysisResult";

interface AnalysisHistoryProps {
  entries: AnalysisHistoryEntry[];
  onClear: () => void;
}

export default function AnalysisHistory({ entries, onClear }: AnalysisHistoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = entries.find((e) => e.id === selectedId) ?? null;

  function handleClear() {
    clearHistory();
    setSelectedId(null);
    onClear();
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            Analysis History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-700/40 border border-slate-600/40 flex items-center justify-center">
              <History className="w-7 h-7 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">No analyses yet</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Completed analyses will appear here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              Analysis History
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-700 text-xs font-bold text-slate-300 border border-slate-600">
                {entries.length}
              </span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-2">
          <div className="flex flex-col gap-1">
            {entries.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                isSelected={entry.id === selectedId}
                onClick={() =>
                  setSelectedId((prev) => (prev === entry.id ? null : entry.id))
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expanded detail panel */}
      {selected && (
        <div className="relative">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Close detail view"
              className="p-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-5">
            <AnalysisResult
              result={selected.result}
              previewUrl={selected.imageThumbnail}
              inputMode={selected.inputMode}
              timestamp={formatTimestamp(selected.timestamp)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface HistoryRowProps {
  entry: AnalysisHistoryEntry;
  isSelected: boolean;
  onClick: () => void;
}

function HistoryRow({ entry, isSelected, onClick }: HistoryRowProps) {
  const { result, imageThumbnail, timestamp, inputMode } = entry;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-150 text-left group",
        isSelected
          ? "bg-blue-500/10 border border-blue-500/30"
          : "hover:bg-slate-700/40 border border-transparent"
      )}
    >
      {/* Thumbnail */}
      <div className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-700/60 bg-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageThumbnail}
          alt="Analysis thumbnail"
          className="w-full h-full object-cover"
        />
        {/* Input mode badge */}
        <div className="absolute bottom-0 right-0 p-1 bg-slate-900/80 rounded-tl-lg">
          {inputMode === "drone" ? (
            <Cpu className="w-3 h-3 text-emerald-400" />
          ) : (
            <ImageUp className="w-3 h-3 text-blue-400" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Priority + Time */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide border",
              getSeverityBg(result.rescuePriority)
            )}
          >
            <SeverityDot severity={result.rescuePriority} size="sm" />
            {result.rescuePriority}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {formatTimestamp(timestamp)}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-xs text-slate-300">
            <Users className="w-3 h-3 text-slate-400" />
            {result.peopleDetected} detected
          </span>
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              getSeverityColor(result.floodSeverity)
            )}
          >
            <Droplets className="w-3 h-3" />
            {result.floodSeverity} flood
          </span>
          {result.hazards.length > 0 && (
            <span className="text-xs text-orange-400">
              {result.hazards.length} hazard{result.hazards.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight
        className={cn(
          "w-4 h-4 shrink-0 transition-all",
          isSelected
            ? "rotate-90 text-blue-400"
            : "text-slate-600 group-hover:text-slate-400"
        )}
      />
    </button>
  );
}
