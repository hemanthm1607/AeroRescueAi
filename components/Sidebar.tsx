"use client";

import { useState } from "react";
import { Shield, ScanSearch, BatteryCharging, History, Info, Menu, X, ChevronRight, Zap, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleId = "detection" | "battery" | "incidents" | "history" | "resources" | "stats" | "ourapp";

interface NavItem {
  id: ModuleId;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  accent: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  activeIconColor: string;
}

const NAV: NavItem[] = [
  {
    id: "detection",
    label: "Upload & Detection",
    sublabel: "Image + Live Detection",
    icon: ScanSearch,
    accent: "blue",
    activeBg: "bg-blue-500/10",
    activeBorder: "border-l-blue-500",
    activeText: "text-blue-300",
    activeIconColor: "text-blue-400",
  },
  {
    id: "battery",
    label: "Drone Battery",
    sublabel: "Flight Status",
    icon: BatteryCharging,
    accent: "green",
    activeBg: "bg-green-500/10",
    activeBorder: "border-l-green-500",
    activeText: "text-green-300",
    activeIconColor: "text-green-400",
  },
  {
    id: "incidents",
    label: "Incidents",
    sublabel: "Active Cases",
    icon: Shield,
    accent: "purple",
    activeBg: "bg-purple-500/10",
    activeBorder: "border-l-purple-500",
    activeText: "text-purple-300",
    activeIconColor: "text-purple-400",
  },
  {
    id: "history",
    label: "History",
    sublabel: "Past Analyses",
    icon: History,
    accent: "amber",
    activeBg: "bg-amber-500/10",
    activeBorder: "border-l-amber-500",
    activeText: "text-amber-300",
    activeIconColor: "text-amber-400",
  },
  {
    id: "resources",
    label: "Resources",
    sublabel: "Rescue Allocation",
    icon: Zap,
    accent: "orange",
    activeBg: "bg-orange-500/10",
    activeBorder: "border-l-orange-500",
    activeText: "text-orange-300",
    activeIconColor: "text-orange-400",
  },
  {
    id: "stats",
    label: "Statistics",
    sublabel: "Incident Trends",
    icon: TrendingUp,
    accent: "purple",
    activeBg: "bg-purple-500/10",
    activeBorder: "border-l-purple-500",
    activeText: "text-purple-300",
    activeIconColor: "text-purple-400",
  },
  {
    id: "ourapp",
    label: "Our App",
    sublabel: "About AeroAiRescue",
    icon: Info,
    accent: "cyan",
    activeBg: "bg-cyan-500/10",
    activeBorder: "border-l-cyan-500",
    activeText: "text-cyan-300",
    activeIconColor: "text-cyan-400",
  },
];

interface SidebarProps {
  active: ModuleId;
  onChange: (id: ModuleId) => void;
}

export default function Sidebar({ active, onChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleClick(id: ModuleId) {
    onChange(id);
    setMobileOpen(false);
  }

  return (
    <>
      {/* ─── Mobile hamburger toggle ─────────────────────────── */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 shadow-lg"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* ─── Mobile overlay ──────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Sidebar panel ───────────────────────────────────── */}
      <aside
        className={cn(
          // Base layout
          "fixed top-0 left-0 h-full z-40 flex flex-col",
          "w-64 bg-[#070d1a] border-r border-slate-800/80",
          "shadow-2xl shadow-slate-950/60",
          // Mobile: slide in/out
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible
          "lg:translate-x-0 lg:static lg:shadow-none"
        )}
      >
        {/* ── Brand ───────────────────────────────────────────── */}
        <div className="px-5 pt-6 pb-5 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400/30 shadow-lg shadow-blue-900/50 shrink-0">
              <Shield className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-white tracking-tight leading-none">
                Aero<span className="text-blue-400">Ai</span>Rescue
              </h1>
              <p className="text-[10px] text-slate-500 leading-none mt-1 tracking-wide">
                AI-Powered Disaster Response
              </p>
            </div>
          </div>
        </div>

        {/* ── Nav label ───────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            Navigation
          </p>
        </div>

        {/* ── Nav items ───────────────────────────────────────── */}
        <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto" aria-label="Module navigation">
          {NAV.map((item) => {
            const isActive = active === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150",
                  "border-l-2 group",
                  isActive
                    ? `${item.activeBg} ${item.activeBorder} shadow-sm`
                    : "border-l-transparent hover:bg-slate-800/50 hover:border-l-slate-600"
                )}
              >
                {/* Icon box */}
                <div
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg border shrink-0 transition-colors",
                    isActive
                      ? `${item.activeBg} border-${item.accent}-500/40`
                      : "bg-slate-800/60 border-slate-700/50 group-hover:bg-slate-700/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4.5 h-4.5 transition-colors",
                      isActive ? item.activeIconColor : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold leading-none transition-colors",
                      isActive ? item.activeText : "text-slate-400 group-hover:text-slate-200"
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="text-[11px] text-slate-600 leading-none mt-1">
                    {item.sublabel}
                  </p>
                </div>
                {/* Active chevron */}
                {isActive && (
                  <ChevronRight className={cn("w-4 h-4 shrink-0", item.activeIconColor)} />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-slate-600">System Online · v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
