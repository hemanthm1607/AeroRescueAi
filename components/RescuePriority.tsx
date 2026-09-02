import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle,
  Users,
  Siren,
  Navigation,
  ShieldAlert,
} from "lucide-react";
import type { SeverityLevel } from "@/types";
import { cn, getSeverityBg } from "@/lib/utils";

interface RescuePriorityProps {
  priority: SeverityLevel;
  peopleDetected: number;
  urgentPeople: number;
  recommendations: string[];
  summary: string;
}

const priorityConfig: Record<
  SeverityLevel,
  {
    icon: React.ReactNode;
    label: string;
    description: string;
    bannerClass: string;
    ringClass: string;
  }
> = {
  CRITICAL: {
    icon: <AlertOctagon className="w-6 h-6" />,
    label: "CRITICAL PRIORITY",
    description: "Immediate rescue required — life-threatening situation detected.",
    bannerClass:
      "bg-red-950/60 border-red-500/50 shadow-lg shadow-red-950/40",
    ringClass: "ring-red-500/30 bg-red-500/15 text-red-300 border-red-500/40",
  },
  HIGH: {
    icon: <AlertTriangle className="w-6 h-6" />,
    label: "HIGH PRIORITY",
    description: "Urgent response needed — significant risk to life detected.",
    bannerClass:
      "bg-orange-950/60 border-orange-500/50 shadow-lg shadow-orange-950/30",
    ringClass:
      "ring-orange-500/30 bg-orange-500/15 text-orange-300 border-orange-500/40",
  },
  MEDIUM: {
    icon: <AlertTriangle className="w-6 h-6" />,
    label: "MEDIUM PRIORITY",
    description: "Response recommended — conditions require monitoring and action.",
    bannerClass:
      "bg-yellow-950/60 border-yellow-500/50",
    ringClass:
      "ring-yellow-500/30 bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  },
  LOW: {
    icon: <Info className="w-6 h-6" />,
    label: "LOW PRIORITY",
    description: "Situation is manageable — standard response protocols apply.",
    bannerClass:
      "bg-green-950/60 border-green-500/50",
    ringClass:
      "ring-green-500/30 bg-green-500/15 text-green-300 border-green-500/40",
  },
};

// Deterministic rescue team calculation — never calls the AI
function rescueTeamsRequired(people: number): number {
  if (people <= 0) return 0;
  if (people <= 5) return 1;
  if (people <= 10) return 3;
  return 5;
}

export default function RescuePriority({
  priority,
  peopleDetected,
  urgentPeople,
  recommendations,
  summary,
}: RescuePriorityProps) {
  const config = priorityConfig[priority];
  const isPulsing = priority === "CRITICAL" || priority === "HIGH";

  return (
    <div className="flex flex-col gap-4">
      {/* Priority Banner */}
      <div
        className={cn(
          "flex items-center gap-4 p-4 rounded-xl border",
          config.bannerClass
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center w-14 h-14 rounded-full border-2 ring-4 shrink-0",
            config.ringClass,
            isPulsing && "animate-pulse"
          )}
        >
          {config.icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">
            Rescue Priority
          </p>
          <h3 className="text-xl font-black tracking-tight text-slate-100 leading-tight">
            {config.label}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">{config.description}</p>
        </div>
      </div>

      {/* Stats row — people detected + rescue teams required */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">People Detected</p>
            <p className="text-2xl font-bold text-slate-100 leading-tight">
              {peopleDetected}
            </p>
            <p className="text-xs text-slate-400">
              {peopleDetected === 1 ? "person" : "people"} in scene
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="w-9 h-9 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0">
            <Siren className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Rescue Teams</p>
            <p className="text-2xl font-bold text-orange-300 leading-tight">
              {rescueTeamsRequired(peopleDetected)}
            </p>
            <p className="text-xs text-slate-400">teams required</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
          Situation Summary
        </p>
        <p className="text-sm text-slate-200 leading-relaxed">{summary}</p>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            Recommended Actions
          </p>
          <ul className="flex flex-col gap-1.5">
            {recommendations.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-sm text-slate-200 leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
