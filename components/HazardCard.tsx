import {
  Zap,
  Waves,
  Trash2,
  Building2,
  AlertTriangle,
  AlertOctagon,
  Info,
} from "lucide-react";
import type { Hazard, SeverityLevel } from "@/types";
import { getSeverityBg, cn } from "@/lib/utils";

interface HazardCardProps {
  hazard: Hazard;
  index: number;
}

const severityIcons: Record<SeverityLevel, React.ReactNode> = {
  CRITICAL: <AlertOctagon className="w-4 h-4" />,
  HIGH: <AlertTriangle className="w-4 h-4" />,
  MEDIUM: <AlertTriangle className="w-4 h-4" />,
  LOW: <Info className="w-4 h-4" />,
};

function getHazardIcon(name: string): React.ReactNode {
  const lower = name.toLowerCase();
  if (lower.includes("electric") || lower.includes("wire") || lower.includes("utility") || lower.includes("power")) {
    return <Zap className="w-5 h-5" />;
  }
  if (lower.includes("water") || lower.includes("flood") || lower.includes("current") || lower.includes("contamina")) {
    return <Waves className="w-5 h-5" />;
  }
  if (lower.includes("debris") || lower.includes("waste") || lower.includes("rubbish")) {
    return <Trash2 className="w-5 h-5" />;
  }
  if (lower.includes("struct") || lower.includes("building") || lower.includes("collapse") || lower.includes("wall")) {
    return <Building2 className="w-5 h-5" />;
  }
  return <AlertTriangle className="w-5 h-5" />;
}

const severityBorderLeft: Record<SeverityLevel, string> = {
  CRITICAL: "border-l-red-500",
  HIGH: "border-l-orange-500",
  MEDIUM: "border-l-yellow-500",
  LOW: "border-l-green-500",
};

export default function HazardCard({ hazard, index }: HazardCardProps) {
  const icon = getHazardIcon(hazard.name);
  const sevBg = getSeverityBg(hazard.severity);
  const leftBorder = severityBorderLeft[hazard.severity];

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 border-l-4 transition-colors hover:bg-slate-800/80",
        leftBorder
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border",
          sevBg
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-mono">#{index + 1}</span>
            <h4 className="text-sm font-semibold text-slate-100">{hazard.name}</h4>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border",
              sevBg
            )}
          >
            {severityIcons[hazard.severity]}
            {hazard.severity}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          {hazard.description}
        </p>
      </div>
    </div>
  );
}
