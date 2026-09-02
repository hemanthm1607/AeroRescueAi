"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  Wifi,
  WifiOff,
  Send,
  CheckCircle2,
  AlertTriangle,
  Cpu,
} from "lucide-react";
import DroneCamera from "@/components/DroneCamera";

// ── Connection status shown on the phone ──────────────────────────────────────
type ConnStatus = "connecting" | "connected" | "disconnected" | "sending" | "sent" | "error";

export default function DronePage() {
  const [connStatus, setConnStatus] = useState<ConnStatus>("connecting");
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string>("");

  // ── Heartbeat — phone announces it's alive every 3 s ─────────────────────
  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch("/api/drone/heartbeat", { method: "POST" });
      if (res.ok) {
        setConnStatus((prev) => (prev === "connecting" || prev === "disconnected" ? "connected" : prev));
      } else {
        setConnStatus("disconnected");
      }
    } catch {
      setConnStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    // First heartbeat immediately
    sendHeartbeat();
    const id = setInterval(sendHeartbeat, 3_000);
    return () => clearInterval(id);
  }, [sendHeartbeat]);

  // ── Handle "Analyze Captured Frame" — sends frame to laptop ──────────────
  async function handleFrameCapture(base64: string, mimeType: string) {
    setConnStatus("sending");
    setSendError("");
    try {
      const res = await fetch("/api/drone/frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConnStatus("sent");
        setLastSentAt(new Date().toLocaleTimeString());
        // Return to "connected" after 3 s
        setTimeout(() => setConnStatus("connected"), 3_000);
      } else {
        setSendError(data.error ?? "Failed to send frame to control station.");
        setConnStatus("error");
        setTimeout(() => setConnStatus("connected"), 5_000);
      }
    } catch {
      setSendError("Network error. Could not reach the control station.");
      setConnStatus("error");
      setTimeout(() => setConnStatus("connected"), 5_000);
    }
  }

  // DroneCamera calls onAnalyze(base64, mime, previewDataUrl)
  // We only need base64 + mime; ignore previewDataUrl
  function handleDroneAnalyze(b64: string, mime: string) {
    handleFrameCapture(b64, mime);
  }

  return (
    <div className="min-h-screen bg-[#060b14] flex flex-col">
      {/* Top stripe */}
      <div className="h-0.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#080e1a]/90 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400/30">
            <Shield className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white leading-none">
              Aero<span className="text-blue-400">Ai</span>Rescue
            </h1>
            <p className="text-[10px] text-purple-300/70 leading-none mt-0.5 flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5" />
              DRONE DEVICE
            </p>
          </div>
        </div>

        {/* Connection pill */}
        <ConnectionPill status={connStatus} />
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto w-full">

        {/* Status banner */}
        <StatusBanner status={connStatus} lastSentAt={lastSentAt} sendError={sendError} />

        {/* Drone camera — reuses existing component unchanged */}
        {/* We override onAnalyze to send to laptop instead of calling /api/analyze directly */}
        <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-950/20 to-[#080e1a] overflow-hidden shadow-lg shadow-purple-950/20">
          <div className="flex items-center gap-3 px-4 py-3 bg-purple-950/30 border-b border-purple-500/15">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/35 shrink-0">
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-100 leading-none">Drone Camera</h2>
              <p className="text-xs text-purple-300/60 mt-0.5">Capture & send to Control Station</p>
            </div>
          </div>
          <div className="p-4">
            <DroneCamera
              onAnalyze={handleDroneAnalyze}
              isAnalyzing={connStatus === "sending"}
            />
          </div>
        </div>

        {/* Instruction */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="text-slate-300 font-semibold">Drone mode</span> — this phone acts as the drone camera.
            Capture a frame and tap{" "}
            <span className="text-purple-300 font-semibold">Analyze Captured Frame</span> to send it to the
            Control Station for AI analysis.
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConnectionPill({ status }: { status: ConnStatus }) {
  const config: Record<ConnStatus, { color: string; label: string; pulse: boolean }> = {
    connecting:   { color: "bg-slate-700/60 border-slate-600 text-slate-400", label: "Connecting…", pulse: true },
    connected:    { color: "bg-green-500/15 border-green-500/40 text-green-300", label: "Connected", pulse: true },
    disconnected: { color: "bg-red-500/15 border-red-500/40 text-red-300", label: "Disconnected", pulse: false },
    sending:      { color: "bg-blue-500/15 border-blue-500/40 text-blue-300", label: "Sending…", pulse: true },
    sent:         { color: "bg-green-500/15 border-green-500/40 text-green-300", label: "Frame Sent ✓", pulse: false },
    error:        { color: "bg-red-500/15 border-red-500/40 text-red-300", label: "Send Failed", pulse: false },
  };
  const c = config[status];
  const Icon = status === "disconnected" || status === "error" ? WifiOff : Wifi;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${c.color}`}>
      {c.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      <Icon className="w-3 h-3" />
      {c.label}
    </div>
  );
}

function StatusBanner({ status, lastSentAt, sendError }: { status: ConnStatus; lastSentAt: string | null; sendError: string }) {
  if (status === "connected" && !lastSentAt) return null;

  if (status === "sent" || (status === "connected" && lastSentAt)) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/25">
        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-300">Frame sent to Control Station</p>
          <p className="text-xs text-slate-400">Sent at {lastSentAt} — AI analysis running on laptop</p>
        </div>
      </div>
    );
  }

  if (status === "sending") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/25">
        <Send className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
        <p className="text-sm font-semibold text-blue-300">Sending frame to Control Station…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-300">Failed to send frame</p>
          <p className="text-xs text-slate-400">{sendError}</p>
        </div>
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25">
        <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
        <p className="text-sm font-semibold text-red-300">Cannot reach Control Station — check network</p>
      </div>
    );
  }

  return null;
}
