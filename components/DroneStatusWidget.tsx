"use client";

import { useEffect, useState, useRef } from "react";
import { Cpu, Wifi, WifiOff, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface DroneStatusWidgetProps {
  onFrameReceived: (base64: string, mimeType: string) => void;
  isAnalyzing: boolean;
}

export default function DroneStatusWidget({ onFrameReceived, isAnalyzing }: DroneStatusWidgetProps) {
  const [connected, setConnected] = useState(false);
  const [lastFrameAt, setLastFrameAt] = useState<string | null>(null);
  const isAnalyzingRef = useRef(isAnalyzing);

  useEffect(() => { isAnalyzingRef.current = isAnalyzing; }, [isAnalyzing]);

  useEffect(() => {
    let active = true;

    async function poll() {
      if (!active) return;
      try {
        const res = await fetch("/api/drone/status?consume=1");
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;

        setConnected(data.connected ?? false);

        if (data.pendingFrame && !isAnalyzingRef.current) {
          setLastFrameAt(new Date().toLocaleTimeString());
          onFrameReceived(data.pendingFrame.imageBase64, data.pendingFrame.mimeType);
        }
      } catch {
        // network glitch — wait for next poll
      }
    }

    poll();
    const id = setInterval(poll, 2_000);
    return () => { active = false; clearInterval(id); };
  }, [onFrameReceived]);

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      connected
        ? "border-green-500/25 bg-gradient-to-b from-green-950/15 to-[#080e1a]"
        : "border-slate-700/40 bg-slate-900/40"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 px-5 py-4 border-b",
        connected ? "bg-green-950/20 border-green-500/15" : "bg-slate-800/30 border-slate-700/40"
      )}>
        <div className={cn(
          "flex items-center justify-center w-9 h-9 rounded-xl border shrink-0",
          connected ? "bg-green-500/20 border-green-500/35" : "bg-slate-700/40 border-slate-600/40"
        )}>
          <Cpu className={cn("w-5 h-5", connected ? "text-green-400" : "text-slate-500")} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-100 leading-none">Drone Connection</h2>
          <p className="text-xs text-slate-500 mt-0.5">Phone camera → Control Station</p>
        </div>
        {/* Status pill */}
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wide shrink-0",
          connected
            ? "bg-green-500/15 border-green-500/40 text-green-300"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          {connected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <Wifi className="w-3 h-3" />
              Drone Connected
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              Drone Disconnected
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {connected ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-green-400 shrink-0" />
              <p className="text-sm text-slate-200">
                Drone is <span className="text-green-300 font-semibold">live</span> — waiting for captured frame
              </p>
            </div>
            {lastFrameAt && (
              <p className="text-xs text-slate-500">
                Last frame received at{" "}
                <span className="text-slate-300 font-mono">{lastFrameAt}</span>
                {isAnalyzing ? " — analysing…" : " — analysis complete"}
              </p>
            )}
            {isAnalyzing && (
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span className="text-xs text-blue-300 font-medium">AI analysis running…</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-slate-600 shrink-0" />
            <p className="text-sm text-slate-500">
              No drone connected. Open the drone URL on the phone to begin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
