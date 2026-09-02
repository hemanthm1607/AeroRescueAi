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

  // Read the role param synchronously during render — window is available
  // in "use client" components after hydration, but we need it before.
  // We derive isDroneMode from a ref-like pattern: read once at mount.
  const [isDroneMode] = useState<boolean>(() => {
    // During SSR this runs on the server where window is undefined — default false.
    // On the client this runs synchronously before the first paint.
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("role") === "drone";
  });

  useEffect(() => {
    // Drone mode needs no session check — skip auth entirely.
    if (!isDroneMode) {
      setUser(getSession());
    }
    setHydrated(true);
  }, [isDroneMode]);

  // Show spinner until client-side state is ready.
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  // Drone/phone mode — no login required, full-screen camera UI.
  if (isDroneMode) {
    return <DronePage />;
  }

  // Control station (laptop) mode — requires login.
  if (!user) {
    return <LoginPage onLogin={(u) => setUser(u)} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
