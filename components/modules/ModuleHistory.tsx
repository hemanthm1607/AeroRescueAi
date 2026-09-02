"use client";

import { History } from "lucide-react";
import type { AnalysisHistoryEntry } from "@/types";
import AnalysisHistory from "@/components/AnalysisHistory";

interface ModuleHistoryProps {
  entries: AnalysisHistoryEntry[];
  onClear: () => void;
}

export default function ModuleHistory({ entries, onClear }: ModuleHistoryProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30">
          <History className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white">Analysis History</h1>
          <p className="text-xs text-slate-500">All previous AI flood scene analyses stored locally in this browser.</p>
        </div>
        {entries.length > 0 && (
          <div className="ml-auto px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 font-bold">
            {entries.length} {entries.length === 1 ? "record" : "records"}
          </div>
        )}
      </div>

      {/* Delegate to existing AnalysisHistory component — all functionality preserved */}
      <AnalysisHistory entries={entries} onClear={onClear} />
    </div>
  );
}
