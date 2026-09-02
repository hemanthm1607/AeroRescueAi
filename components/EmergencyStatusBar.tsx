"use client";

import { Activity, Users, AlertOctagon, Satellite, BatteryMedium } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent: "blue" | "red" | "orange" | "green" | "slate" | "purple" | "amber";
  children?: React.ReactNode;
}

const accentMap: Record<StatCardProps["accent"], { border: string; bg: string; icon: string }> = {
  blue:   { border: "border-blue-500/25",   bg: "bg-blue-500/8",   icon: "text-blue-400"   },
  red:    { border: "border-red-500/25",    bg: "bg-red-500/8",    icon: "text-red-400"    },
  orange: { border: "border-orange-500/25", bg: "bg-orange-500/8", icon: "text-orange-400" },
  green:  { border: "border-green-500/25",  bg: "bg-green-500/8",  icon: "text-green-400"  },
  slate:  { border: "border-slate-500/25",  bg: "bg-slate-500/8",  icon: "text-slate-400"  },
  purple: { border: "border-purple-500/25", bg: "bg-purple-500/8", icon: "text-purple-400" },
  amber:  { border: "border-amber-500/25",  bg: "bg-amber-500/8",  icon: "text-amber-400"  },
};

function StatCard({ icon, label, value, sub, accent, children }: StatCardProps) {
  const a = accentMap[accent];
  return (
    <div className={cn("rounded-xl border p-4 flex flex-col gap-3", a.border, a.bg)}>
      <div className="flex items-center gap-2.5">
        <div className={cn("shrink-0", a.icon)}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider leading-none font-semibold">{label}</p>
          <p className="text-xl font-bold text-slate-100 leading-tight mt-0.5">{value}</p>
          {sub && <p className="text-xs text-slate-400 leading-none mt-0.5">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

interface BatteryBarProps {
  percent: number;
}

function BatteryBar({ percent }: BatteryBarProps) {
  const color =
    percent >= 60 ? "bg-green-500" :
    percent >= 30 ? "bg-amber-500" :
    "bg-red-500";

  const statusLabel =
    percent >= 80 ? "Excellent" :
    percent >= 60 ? "Good" :
    percent >= 30 ? "Moderate" :
    "Low — recharge soon";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{percent}% · {statusLabel}</span>
      </div>
      {/* Battery shell */}
      <div className="flex items-center gap-1">
        <div className="flex-1 h-3 bg-slate-700/60 rounded-md overflow-hidden border border-slate-600/40 relative">
          <div
            className={cn("h-full rounded-md transition-all duration-500", color)}
            style={{ width: `${percent}%` }}
          />
          {/* Tick marks */}
          {[25, 50, 75].map((tick) => (
            <div
              key={tick}
              className="absolute top-0 bottom-0 w-px bg-slate-900/60"
              style={{ left: `${tick}%` }}
            />
          ))}
        </div>
        {/* Battery tip */}
        <div className="w-1.5 h-2 rounded-r-sm bg-slate-600/60 shrink-0" />
      </div>
    </div>
  );
}

interface EmergencyStatusBarProps {
  totalAnalyses: number;
  totalPeopleDetected: number;
  criticalIncidents: number;
  dronesOnline: number;
  batteryPercent?: number;
}

export default function EmergencyStatusBar({
  totalAnalyses,
  totalPeopleDetected,
  criticalIncidents,
  dronesOnline,
  batteryPercent = 85,
}: EmergencyStatusBarProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
      <StatCard
        icon={<Activity className="w-5 h-5" />}
        label="Analyses"
        value={totalAnalyses}
        sub="This session"
        accent="blue"
      />
      <StatCard
        icon={<Users className="w-5 h-5" />}
        label="People Detected"
        value={totalPeopleDetected}
        sub="Across all scenes"
        accent="orange"
      />
      <StatCard
        icon={<AlertOctagon className="w-5 h-5" />}
        label="Critical Alerts"
        value={criticalIncidents}
        sub={criticalIncidents > 0 ? "Immediate action" : "All clear"}
        accent={criticalIncidents > 0 ? "red" : "green"}
      />
      <StatCard
        icon={<Satellite className="w-5 h-5" />}
        label="Drones Online"
        value={dronesOnline}
        sub="Ready to deploy"
        accent="purple"
      />
      {/* Battery card — spans 2 cols on xl so it lines up as the 5th item */}
      <div className="col-span-2 xl:col-span-1 rounded-xl border border-green-500/25 bg-green-500/8 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <BatteryMedium className="w-5 h-5 text-green-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider leading-none font-semibold">Battery Status</p>
            <p className="text-xl font-bold text-slate-100 leading-tight mt-0.5">{batteryPercent}%</p>
          </div>
        </div>
        <BatteryBar percent={batteryPercent} />
      </div>
    </div>
  );
}
