"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Shield,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Send,
} from "lucide-react";
import { Realtime } from "ably";
import type { RealtimeChannel, Message } from "ably";
import DroneCamera from "@/components/DroneCamera";
import type { AnalysisResult } from "@/types";
import { DRONE_CHANNEL, EVENT_ANALYSIS, EVENT_HEARTBEAT } from "@/lib/ablyConfig";

type ConnStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "analyzing"
  | "publishing"
  | "sent"
  | "error";

/** Payload sent over Ably to the laptop */
interface DroneAnalysisMessage {
  result: AnalysisResult;
  /** data: URL of the captured frame (resized to ≤ 200px wide for preview) */
  previewDataUrl: string;
  capturedAt: string;
}

/** Resize a base64/dataURL to max 200px wide, returns a new data URL */
async function resizeForPreview(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX_W = 200;
      const scale = img.width > MAX_W ? MAX_W / img.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(dataUrl); // fallback: send as-is
    img.src = dataUrl;
  });
}

export default function DronePage() {
  const [connStatus, setConnStatus] = useState<ConnStatus>("connecting");
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const ablyRef = useRef<Realtime | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Connect to Ably on mount ──────────────────────────────────────────────
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_ABLY_KEY;
    if (!key) {
      console.error("[DronePage] NEXT_PUBLIC_ABLY_KEY is not set");
      setConnStatus("error");
      setStatusMessage("Ably API key is not configured.");
      return;
    }

    const ably = new Realtime({ key, autoConnect: true });
    ablyRef.current = ably;

    ably.connection.on("connected", () => {
      console.log("[DronePage] Ably connected");
      setConnStatus("connected");
      setStatusMessage("");
      // Publish initial heartbeat AFTER connected is established
      ch.publish(EVENT_HEARTBEAT, { online: true }).catch((err) => {
        console.error("[DronePage] Initial heartbeat publish failed:", err);
      });
    });

    ably.connection.on("disconnected", () => {
      console.log("[DronePage] Ably disconnected");
      setConnStatus("disconnected");
    });

    ably.connection.on("failed", (stateChange) => {
      console.error("[DronePage] Ably connection failed:", stateChange.reason?.message);
      setConnStatus("error");
      setStatusMessage(stateChange.reason?.message ?? "Connection failed.");
    });

    const ch = ably.channels.get(DRONE_CHANNEL);
    channelRef.current = ch;

    // Periodic heartbeat so laptop knows phone is still connected
    const hbId = setInterval(() => {
      ch.publish(EVENT_HEARTBEAT, { online: true }).catch((err) => {
        console.error("[DronePage] Heartbeat publish failed:", err);
      });
    }, 5_000);

    return () => {
      clearInterval(hbId);
      ch.publish(EVENT_HEARTBEAT, { online: false }).catch(() => {});
      ably.close();
    };
  }, []);

  // ── Handle camera capture — analyze + publish ────────────────────────────
  const handleDroneAnalyze = useCallback(async (
    base64: string,
    mimeType: string,
    previewDataUrl: string,
  ) => {
    setConnStatus("analyzing");
    setStatusMessage("Sending to AI…");

    // Step 1: run AI analysis
    let result: AnalysisResult;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Analysis failed.");
      }
      result = data.result as AnalysisResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed.";
      console.error("[DronePage] Analysis error:", msg);
      setConnStatus("error");
      setStatusMessage(msg);
      setTimeout(() => { setConnStatus("connected"); setStatusMessage(""); }, 6_000);
      return;
    }

    // Step 2: resize preview to stay well within Ably's 64KB message limit
    setConnStatus("publishing");
    setStatusMessage("Sending result to Control Station…");
    let smallPreview = previewDataUrl;
    try {
      smallPreview = await resizeForPreview(previewDataUrl);
    } catch {
      // non-fatal — use full dataUrl
    }

    // Step 3: publish over Ably
    const ch = channelRef.current;
    if (!ch) {
      setConnStatus("error");
      setStatusMessage("Not connected to Ably.");
      setTimeout(() => { setConnStatus("connected"); setStatusMessage(""); }, 6_000);
      return;
    }

    const payload: DroneAnalysisMessage = {
      result,
      previewDataUrl: smallPreview,
      capturedAt: new Date().toISOString(),
    };

    try {
      await ch.publish(EVENT_ANALYSIS, payload);
      console.log("[DronePage] Result published to Ably");
      setConnStatus("sent");
      setLastSentAt(new Date().toLocaleTimeString());
      setTimeout(() => { setConnStatus("connected"); setStatusMessage(""); }, 3_000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Publish failed.";
      console.error("[DronePage] Ably publish error:", msg);
      setConnStatus("error");
      setStatusMessage(msg);
      setTimeout(() => { setConnStatus("connected"); setStatusMessage(""); }, 6_000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#060b14] flex flex-col">
      <div className="h-0.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />

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
        <ConnectionPill status={connStatus} />
      </header>

      <main className="flex-1 px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto w-full">
        <StatusBanner
          status={connStatus}
          lastSentAt={lastSentAt}
          message={statusMessage}
        />

        <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-950/20 to-[#080e1a] overflow-hidden shadow-lg shadow-purple-950/20">
          <div className="flex items-center gap-3 px-4 py-3 bg-purple-950/30 border-b border-purple-500/15">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/35 shrink-0">
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-100 leading-none">Drone Camera</h2>
              <p className="text-xs text-purple-300/60 mt-0.5">Capture · Analyse · Send to Control Station</p>
            </div>
          </div>
          <div className="p-4">
            <DroneCamera
              onAnalyze={handleDroneAnalyze}
              isAnalyzing={connStatus === "analyzing" || connStatus === "publishing"}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="text-slate-300 font-semibold">Drone mode</span> — capture a frame and tap{" "}
            <span className="text-purple-300 font-semibold">Analyze Captured Frame</span>. The AI result
            is sent to the Control Station automatically.
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConnectionPill({ status }: { status: ConnStatus }) {
  const cfg: Record<ConnStatus, { cls: string; label: string; pulse: boolean }> = {
    connecting:  { cls: "bg-slate-700/60 border-slate-600 text-slate-400",       label: "Connecting…",    pulse: true  },
    connected:   { cls: "bg-green-500/15 border-green-500/40 text-green-300",    label: "Connected",      pulse: true  },
    disconnected:{ cls: "bg-red-500/15 border-red-500/40 text-red-300",          label: "Disconnected",   pulse: false },
    analyzing:   { cls: "bg-blue-500/15 border-blue-500/40 text-blue-300",       label: "Analysing…",     pulse: true  },
    publishing:  { cls: "bg-blue-500/15 border-blue-500/40 text-blue-300",       label: "Sending…",       pulse: true  },
    sent:        { cls: "bg-green-500/15 border-green-500/40 text-green-300",    label: "Result Sent ✓",  pulse: false },
    error:       { cls: "bg-red-500/15 border-red-500/40 text-red-300",          label: "Error",          pulse: false },
  };
  const c = cfg[status];
  const Icon = status === "disconnected" || status === "error" ? WifiOff : Wifi;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${c.cls}`}>
      {c.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      <Icon className="w-3 h-3" />
      {c.label}
    </div>
  );
}

function StatusBanner({ status, lastSentAt, message }: { status: ConnStatus; lastSentAt: string | null; message: string }) {
  if (status === "sent" || (status === "connected" && lastSentAt)) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/25">
        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-300">Result sent to Control Station</p>
          <p className="text-xs text-slate-400">Sent at {lastSentAt}</p>
        </div>
      </div>
    );
  }
  if (status === "analyzing" || status === "publishing") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/25">
        <Send className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
        <p className="text-sm font-semibold text-blue-300">{message || "Processing…"}</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-300">Error</p>
          <p className="text-xs text-slate-400">{message}</p>
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
