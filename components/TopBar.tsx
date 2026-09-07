"use client";

import { useState, useEffect } from "react";
import {
  User,
  ChevronDown,
  LogOut,
  AlertCircle,
  Clock,
} from "lucide-react";
import { logout } from "@/lib/auth";
import type { User as UserType } from "@/types";
import type { ModuleId } from "@/components/Sidebar";
import { cn } from "@/lib/utils";

const MODULE_LABELS: Record<ModuleId, { title: string; sub: string }> = {
  detection: { title: "Upload & Live Detection", sub: "AI-powered flood scene analysis" },
  battery:   { title: "Drone Battery & Flight Status", sub: "Simulation data — no physical drone connected" },
  incidents: { title: "Incident Management", sub: "Track, assign teams, and manage rescue operations" },
  history:   { title: "Analysis History", sub: "Past flood scene analyses" },
  ourapp:    { title: "About AeroAiRescue", sub: "AI-Powered Disaster Response Platform" },
  resources: { title: "Resource Allocation", sub: "Rescue team calculation & requirements" },
  stats:     { title: "Incident Statistics", sub: "Trends and disaster response analytics" },
};

interface TopBarProps {
  user: UserType;
  onLogout: () => void;
  activeModule: ModuleId;
  criticalCount: number;
}

export default function TopBar({ user, onLogout, activeModule, criticalCount }: TopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function handleLogout() {
    logout();
    onLogout();
  }

  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const { title, sub } = MODULE_LABELS[activeModule];

  return (
    <header className="h-14 bg-[#080e1a]/95 backdrop-blur-md border-b border-slate-800/70 flex items-center px-4 sm:px-6 gap-4 shrink-0 z-20 relative">
      {/* Emergency top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-red-600/60 via-orange-500/60 to-red-600/60" />

      {/* Module title — left (push right for mobile hamburger) */}
      <div className="flex-1 min-w-0 pl-10 lg:pl-0">
        <h2 className="text-sm font-bold text-slate-100 leading-none truncate">{title}</h2>
        <p className="text-[10px] text-slate-500 leading-none mt-0.5 truncate">{sub}</p>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/50 border border-slate-700/40">
          <Clock className="w-3 h-3 text-slate-500" />
          <span className="text-xs font-mono text-slate-400">{timeStr}</span>
        </div>

        {/* Emergency pill */}
        <div
          className={cn(
            "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold",
            criticalCount > 0
              ? "bg-red-600/15 border-red-500/40 text-red-300 animate-pulse"
              : "bg-slate-800/40 border-slate-700/40 text-slate-500"
          )}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {criticalCount > 0 ? `${criticalCount} Critical` : "All Clear"}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all",
              profileOpen
                ? "bg-slate-700 border-slate-500 text-slate-100"
                : "bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-700/60"
            )}
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center">
              <User className="w-3 h-3 text-blue-400" />
            </div>
            <span className="hidden sm:block font-medium max-w-[90px] truncate">{user.name}</span>
            <ChevronDown
              className={cn("w-3 h-3 text-slate-400 transition-transform", profileOpen && "rotate-180")}
            />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-52 z-40 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-700/50">
                  <p className="text-sm font-semibold text-slate-100">{user.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
