"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  LogOut,
  User,
  ChevronDown,
  LayoutDashboard,
  ImageUp,
  Video,
  BatteryMedium,
  History,
  Info,
  AlertCircle,
  Menu,
  X,
} from "lucide-react";
import { logout } from "@/lib/auth";
import type { User as UserType } from "@/types";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  user: UserType;
  onLogout: () => void;
  activeIncidents?: number;
  activeSection: string;
  onNavClick: (section: string) => void;
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-slate-300" },
  { id: "upload", label: "Upload Image", icon: ImageUp, color: "text-blue-400" },
  { id: "drone", label: "Drone Camera", icon: Video, color: "text-purple-400" },
  { id: "battery", label: "Battery", icon: BatteryMedium, color: "text-green-400" },
  { id: "history", label: "History", icon: History, color: "text-amber-400" },
  { id: "ourapp", label: "Our App", icon: Info, color: "text-cyan-400" },
];

export default function DashboardHeader({
  user,
  onLogout,
  activeIncidents = 0,
  activeSection,
  onNavClick,
}: DashboardHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  return (
    <header className="sticky top-0 z-40 bg-[#080e1a]/95 backdrop-blur-md border-b border-slate-700/50 shadow-xl shadow-slate-950/60">
      {/* Emergency top stripe */}
      <div className="h-0.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

        {/* ── LEFT: Brand ── */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400/30 shadow-lg shadow-blue-900/40">
            <Shield className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-extrabold text-white tracking-tight leading-none">
              Aero<span className="text-blue-400">Ai</span>Rescue
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-0.5">
              AI-Powered Disaster Response
            </p>
          </div>
        </div>

        {/* ── CENTER: Nav (desktop) ── */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-1" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, icon: Icon, color }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => onNavClick(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-slate-700/80 text-white border border-slate-600/60 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? color : "")} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* ── RIGHT: Actions ── */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Live clock — desktop */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-mono text-slate-300">{timeStr}</span>
          </div>

          {/* Emergency button */}
          <button
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors",
              activeIncidents > 0
                ? "bg-red-600/20 border-red-500/50 text-red-300 animate-pulse"
                : "bg-slate-800/50 border-slate-700/40 text-slate-400 hover:border-slate-500 hover:text-slate-300"
            )}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {activeIncidents > 0 ? `${activeIncidents} Alert${activeIncidents > 1 ? "s" : ""}` : "All Clear"}
          </button>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-150",
                profileOpen
                  ? "bg-slate-700 border-slate-500 text-slate-100"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700/60 hover:text-slate-100"
              )}
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="hidden sm:block text-xs font-medium leading-none max-w-[100px] truncate">
                {user.name}
              </span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-slate-400 transition-transform",
                  profileOpen && "rotate-180"
                )}
              />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 z-40 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-slate-950/70 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700/50">
                    <p className="text-sm font-semibold text-slate-100">{user.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300 font-medium">
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

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-700/50 bg-[#080e1a]/98 px-4 py-3">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon, color }) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => { onNavClick(id); setMobileMenuOpen(false); }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                    isActive
                      ? "bg-slate-700/80 text-white border border-slate-600/60"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                  )}
                >
                  <Icon className={cn("w-4 h-4", color)} />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
