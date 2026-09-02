"use client";

import { useState, useEffect } from "react";
import { getSession } from "@/lib/auth";
import type { User } from "@/types";
import LoginPage from "@/components/LoginPage";
import Dashboard from "@/components/Dashboard";
import DronePage from "@/components/DronePage";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isDroneMode, setIsDroneMode] = useState(false);

  useEffect(() => {
    // Detect device role from URL: ?role=drone → phone/drone mode
    const params = new URLSearchParams(window.location.search);
    setIsDroneMode(params.get("role") === "drone");

    const session = getSession();
    setUser(session);
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  // Drone/phone mode — no login required, full-screen camera UI
  if (isDroneMode) {
    return <DronePage />;
  }

  // Control station (laptop) mode — requires login
  if (!user) {
    return <LoginPage onLogin={(u) => setUser(u)} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
