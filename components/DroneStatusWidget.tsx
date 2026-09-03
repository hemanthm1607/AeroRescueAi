"use client";

import { useEffect, useState, useRef } from "react";
import { Cpu, Wifi, WifiOff, Camera } from "lucide-react";
import { Realtime } from "ably";
import type { Message } from "ably";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/types";
import { DRONE_CHANNEL, EVENT_ANALYSIS, EVENT_HEARTBEAT, EVENT_LOCATION } from "@/lib/ablyConfig";
import { updateDroneLocation } from "@/lib/droneLocation";

interface DroneAnalysisMessage {
  result: AnalysisResult;
  previewDataUrl: string;
  capturedAt: string;
  latitude?: number;
  longitude?: number;
}

interface DroneStatusWidgetProps {
  /** Called when the phone has finished analysis and sent results */
  onResultReceived: (result: AnalysisResult, previewDataUrl: string, capturedAt: string, latitude?: number, longitude?: number) => void;
  isAnalyzing: boolean;
}

export default function DroneStatusWidget({ onResultReceived, isAnalyzing }: DroneStatusWidgetProps) {
  const [connected, setConnected] = useState(false);
  const [lastFrameAt, setLastFrameAt] = useState<string | null>(null);
  const [ablyReady, setAblyReady] = useState(false);
  const onResultRef = useRef(onResultReceived);
  const isAnalyzingRef = useRef(isAnalyzing);

  useEffect(() => { onResultRef.current = onResultReceived; }, [onResultReceived]);
  useEffect(() => { isAnalyzingRef.current = isAnalyzing; }, [isAnalyzing]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_ABLY_KEY;
    if (!key) {
      console.error("[DroneStatusWidget] NEXT_PUBLIC_ABLY_KEY is not set");
      return;
    }

    const ably = new Realtime({ key, autoConnect: true });

    ably.connection.on("connected", () => {
      console.log("[DroneStatusWidget] Ably connected");
      setAblyReady(true);
    });

    ably.connection.on("disconnected", () => {
      console.log("[DroneStatusWidget] Ably disconnected");
      setAblyReady(false);
      setConnected(false);
    });

    const ch = ably.channels.get(DRONE_CHANNEL);

    // Listen for heartbeats from the phone
    const heartbeatHandler = (msg: Message) => {
      const online = (msg.data as { online?: boolean })?.online ?? true;
      console.log(`[DroneStatusWidget] Heartbeat received — online=${online}`);
      setConnected(online);
    };

    // Listen for analysis results from the phone
    const analysisHandler = (msg: Message) => {
      const payload = msg.data as DroneAnalysisMessage;
      if (!payload?.result) return;
      console.log("[DroneStatusWidget] Analysis result received from phone");
      setConnected(true);
      setLastFrameAt(new Date().toLocaleTimeString());
      // Always deliver the result regardless of isAnalyzing —
      // the laptop may have started its own analysis via upload; we still
      // want to surface the drone result.
      onResultRef.current(payload.result, payload.previewDataUrl, payload.capturedAt, payload.latitude, payload.longitude);
    };

    ch.subscribe(EVENT_HEARTBEAT, heartbeatHandler);
    ch.subscribe(EVENT_ANALYSIS, analysisHandler);

    // Listen for location updates from drone
    const locationHandler = (msg: Message) => {
      const payload = msg.data as { latitude?: number; longitude?: number; timestamp?: string };
      if (payload.latitude !== undefined && payload.longitude !== undefined) {
        updateDroneLocation({
          latitude: payload.latitude,
          longitude: payload.longitude,
          timestamp: payload.timestamp || new Date().toISOString()
        });
      }
    };

    ch.subscribe(EVENT_LOCATION, locationHandler);

    // Mark phone as disconnected if no heartbeat for 15 s
    let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
    const resetTimer = () => {
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      heartbeatTimer = setTimeout(() => {
        setConnected(false);
        console.log("[DroneStatusWidget] Heartbeat timeout — marking drone disconnected");
      }, 15_000);
    };

    ch.subscribe(EVENT_HEARTBEAT, () => resetTimer());

    return () => {
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      ch.unsubscribe();
      ably.close();
    };
  }, []);

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
          <p className="text-xs text-slate-500 mt-0.5">
            {ablyReady ? "Ably live — phone camera → Control Station" : "Connecting to Ably…"}
          </p>
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
                Last result received at{" "}
                <span className="text-slate-300 font-mono">{lastFrameAt}</span>
                {isAnalyzing ? " — processing…" : " — displayed below"}
              </p>
            )}
            {isAnalyzing && (
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span className="text-xs text-blue-300 font-medium">Updating dashboard…</span>
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
