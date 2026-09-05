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
import type { AnalysisResult, DroneTelemetry } from "@/types";
import { DRONE_CHANNEL, EVENT_ANALYSIS, EVENT_HEARTBEAT, EVENT_LOCATION, EVENT_TELEMETRY } from "@/lib/ablyConfig";
import { getLocationName } from "@/lib/geo";
import {
  initializeOfflineSync,
  getOfflineSyncState,
  subscribeToStateChanges,
  storePendingCapture,
  syncPendingCaptures,
  updatePendingCount,
  registerAnalyzeCallback,
  storeAnalysisResultForCapture,
} from "@/lib/offlineSync";
import { isIndexedDBAvailable } from "@/lib/offlineStorage";

interface DroneLocationPayload {
  latitude: number;
  longitude: number;
  timestamp: string;
  locationName?: string;
}

type ConnStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "analyzing"
  | "publishing"
  | "sent"
  | "error"
  | "offline";

type OfflineState = "online" | "offline";

/** Payload sent over Ably to the laptop */
interface DroneAnalysisMessage {
  result: AnalysisResult;
  /** data: URL of the captured frame (resized to ≤ 200px wide for preview) */
  previewDataUrl: string;
  capturedAt: string;
  latitude?: number;
  longitude?: number;
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

/** Collect real telemetry from device: battery, GPS, camera status, connection status */
async function collectDeviceTelemetry(
  gpsLocation: { latitude: number; longitude: number } | null,
  cameraActive: boolean,
  ablyConnected: boolean
): Promise<DroneTelemetry> {
  const telemetry: DroneTelemetry = {
    timestamp: new Date().toISOString(),
    camera: { active: cameraActive },
    comms: { connected: ablyConnected },
  };

  // Collect battery data if available
  try {
    if (navigator && (navigator as any).getBattery) {
      const battery = await ((navigator as any).getBattery() as Promise<any>);
      telemetry.battery = {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
        health: "Unavailable", // Battery API doesn't provide health
      };
    }
  } catch {
    // Battery API not available
  }

  // Include GPS location if available
  if (gpsLocation) {
    telemetry.gps = gpsLocation;
    
    // Try to get altitude and speed from geolocation (if browser provides them)
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          if (position.coords.altitude !== null) {
            telemetry.altitude = Math.round(position.coords.altitude);
          }
          if (position.coords.speed !== null) {
            telemetry.speed = Math.round(position.coords.speed * 3.6); // m/s to km/h
          }
        });
      }
    } catch {
      // Geolocation not available
    }
  }

  return telemetry;
}

export default function DronePage() {
  const [connStatus, setConnStatus] = useState<ConnStatus>("connecting");
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [offlineState, setOfflineState] = useState<OfflineState>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const ablyRef = useRef<Realtime | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gpsWatcherRef = useRef<number | null>(null);
  const cameraActiveRef = useRef(false);
  const telemetryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentGpsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const offlineSyncCleanupRef = useRef<(() => void) | undefined>(undefined);
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);
  const offlineStateRef = useRef<OfflineState>("online");

  // ── Connect to Ably on mount ──────────────────────────────────────────────
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_ABLY_KEY;
    if (!key) {
      console.error("[DronePage] NEXT_PUBLIC_ABLY_KEY is not set");
      setConnStatus("error");
      setStatusMessage("Ably API key is not configured.");
      return;
    }

    // Initialize offline sync system
    if (isIndexedDBAvailable()) {
      offlineSyncCleanupRef.current = initializeOfflineSync({
        onStateChange: (state: any) => {
          setOfflineState(state.offlineState as OfflineState);
          offlineStateRef.current = state.offlineState as OfflineState;
          setPendingCount(state.pendingCount);
          setLastSyncAt(state.lastSyncAt);
          setSyncInProgress(state.syncState === "syncing");
        },
        onSyncError: (error: any) => {
          console.error("[DronePage] Sync error:", error);
        },
        onSyncComplete: () => {
          console.log("[DronePage] Sync completed");
        },
      }) || undefined;

      // Subscribe to state changes
      unsubscribeRef.current = subscribeToStateChanges((state: any) => {
        setOfflineState(state.offlineState as OfflineState);
        offlineStateRef.current = state.offlineState as OfflineState;
        setPendingCount(state.pendingCount);
        setLastSyncAt(state.lastSyncAt);
        setSyncInProgress(state.syncState === "syncing");
      }) || undefined;

      // Update pending count on mount
      updatePendingCount();
    } else {
      console.warn("[DronePage] IndexedDB not available, offline mode disabled");
    }

    const ably = new Realtime({ key, autoConnect: true });
    ablyRef.current = ably;

    const startGPSWatch = () => {
      if (navigator.geolocation && !gpsWatcherRef.current) {
        console.log("[DronePage] Starting GPS watch");
        gpsWatcherRef.current = navigator.geolocation.watchPosition(
          async (position) => {
            const locPayload: DroneLocationPayload = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: new Date().toISOString(),
            };
            
            // Store GPS for telemetry
            currentGpsRef.current = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            // Resolve location name in background (non-blocking)
            try {
              const locationName = await getLocationName(
                position.coords.latitude,
                position.coords.longitude,
                3000 // 3 second timeout for reverse geocoding
              );
              if (locationName) {
                locPayload.locationName = locationName;
              }
            } catch (err) {
              console.log("[DronePage] Location name resolution skipped");
              // Continue without location name - it's optional
            }
            
            const ch = channelRef.current;
            if (ch) {
              ch.publish(EVENT_LOCATION, locPayload).catch((err) => {
                console.error("[DronePage] Location publish failed:", err);
              });
            }
          },
          (error) => {
            console.log("[DronePage] GPS error:", error.message);
            // Continue trying - user may grant permission later
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 5000, // Allow up to 5s old position
          }
        );
      }
    };

    ably.connection.on("connected", () => {
      console.log("[DronePage] Ably connected");
      setConnStatus("connected");
      setStatusMessage("");
      
      const ch = ably.channels.get(DRONE_CHANNEL);
      channelRef.current = ch;
      
      // Publish initial heartbeat AFTER connected is established
      ch.publish(EVENT_HEARTBEAT, { online: true }).catch((err) => {
        console.error("[DronePage] Initial heartbeat publish failed:", err);
      });
      
      // Start GPS watch only after Ably is connected
      startGPSWatch();
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

    // Periodic heartbeat so laptop knows phone is still connected
    const hbId = setInterval(() => {
      const ch = channelRef.current;
      if (ch) {
        ch.publish(EVENT_HEARTBEAT, { online: true }).catch((err) => {
          console.error("[DronePage] Heartbeat publish failed:", err);
        });
      }
    }, 5_000);

    // Periodic telemetry publishing when camera is active
    const telId = setInterval(async () => {
      if (cameraActiveRef.current && channelRef.current) {
        const telemetry = await collectDeviceTelemetry(
          currentGpsRef.current,
          cameraActiveRef.current,
          ably.connection.state === "connected"
        );
        channelRef.current.publish(EVENT_TELEMETRY, telemetry).catch((err) => {
          console.error("[DronePage] Telemetry publish failed:", err);
        });
      }
    }, 2_000); // Every 2 seconds

    return () => {
      clearInterval(hbId);
      clearInterval(telId);
      if (gpsWatcherRef.current) {
        navigator.geolocation.clearWatch(gpsWatcherRef.current);
        gpsWatcherRef.current = null;
      }
      const ch = channelRef.current;
      if (ch) {
        ch.publish(EVENT_HEARTBEAT, { online: false }).catch(() => {});
      }
      ably.close();
      if (offlineSyncCleanupRef.current) {
        offlineSyncCleanupRef.current();
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // ── Handle camera capture — analyze + publish ────────────────────────────
  const handleDroneAnalyze = useCallback(async (
    base64: string,
    mimeType: string,
    previewDataUrl: string,
    latitude?: number,
    longitude?: number,
  ) => {
    // Read current offline state from ref instead of closure to avoid stale state
    const isOffline = offlineStateRef.current === "offline";
    
    // If offline, store for later sync
    if (isOffline) {
      setConnStatus("offline");
      setStatusMessage("Offline — saving to local storage…");
      
      try {
        const id = `pending-${Date.now()}`;
        await storePendingCapture(id, base64, mimeType, latitude, longitude);
        await updatePendingCount();
        setStatusMessage("Saved offline. Will upload when network returns.");
        setTimeout(() => { setConnStatus("connected"); setStatusMessage(""); }, 5000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to save offline";
        console.error("[DronePage] Offline storage error:", msg);
        setConnStatus("error");
        setStatusMessage(`Storage error: ${msg}`);
        setTimeout(() => { setConnStatus("connected"); setStatusMessage(""); }, 6000);
      }
      return;
    }

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
      latitude,
      longitude,
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

  // Register the analyze callback for offline sync
  useEffect(() => {
    registerAnalyzeCallback(async (base64, mimeType, previewDataUrl, latitude, longitude, pendingId) => {
      console.log(`[DronePage] Syncing offline capture ${pendingId}`);
      // Run analysis using the same flow as normal online capture
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Analysis failed.");
      }
      const result = data.result as AnalysisResult;

      // Store the analysis result in IndexedDB before publishing
      if (pendingId) {
        await storeAnalysisResultForCapture(pendingId, result);
      }

      // Publish to Ably using the same flow
      let smallPreview = previewDataUrl;
      try {
        smallPreview = await resizeForPreview(previewDataUrl);
      } catch {
        // non-fatal
      }

      const ch = channelRef.current;
      if (!ch) {
        throw new Error("Not connected to Ably");
      }

      const payload: DroneAnalysisMessage = {
        result,
        previewDataUrl: smallPreview,
        capturedAt: new Date().toISOString(),
        latitude,
        longitude,
      };

      await ch.publish(EVENT_ANALYSIS, payload);
      console.log(`[DronePage] Synced offline capture ${pendingId} to Ably`);
    });
  }, []);

  // ── Handle camera state changes (start/stop) ──────────────────────────────
  const handleCameraStateChange = useCallback((isActive: boolean) => {
    cameraActiveRef.current = isActive;
    console.log(`[DronePage] Camera state changed: ${isActive ? "active" : "inactive"}`);
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
        <div className="flex items-center gap-2">
          {offlineState === "offline" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold bg-red-500/15 border-red-500/40 text-red-300">
              <WifiOff className="w-3 h-3" />
              Offline Mode
            </div>
          ) : null}
          <ConnectionPill status={connStatus} />
        </div>
      </header>

      <main className="flex-1 px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto w-full">
        <StatusBanner
          status={connStatus}
          lastSentAt={lastSentAt}
          message={statusMessage}
        />

        {/* Offline Status Widget */}
        {offlineState === "offline" && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20">
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
              </div>
              <span className="text-sm font-bold text-red-300">Offline Mode Active</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-900/40 px-3 py-2">
                <p className="text-slate-400 uppercase tracking-wide">Pending Uploads</p>
                <p className="text-red-300 font-semibold mt-1">{pendingCount}</p>
              </div>
              <div className="rounded-lg bg-slate-900/40 px-3 py-2">
                <p className="text-slate-400 uppercase tracking-wide">Status</p>
                <p className="text-yellow-300 font-semibold mt-1">{syncInProgress ? "Syncing…" : "Ready"}</p>
              </div>
              {lastSyncAt && (
                <div className="col-span-2 rounded-lg bg-slate-900/40 px-3 py-2">
                  <p className="text-slate-400 uppercase tracking-wide">Last Sync</p>
                  <p className="text-slate-300 font-semibold mt-1 text-[10px]">{lastSyncAt}</p>
                </div>
              )}
            </div>
            <p className="text-[11px] text-red-300/70 mt-3 leading-snug">
              📷 Photos will be saved locally and automatically uploaded when network returns.
            </p>
          </div>
        )}

        {/* Online Status Widget */}
        {offlineState === "online" && pendingCount > 0 && (
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
              </div>
              <span className="text-sm font-bold text-orange-300">Syncing Offline Captures</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-900/40 px-3 py-2">
                <p className="text-slate-400 uppercase tracking-wide">Pending</p>
                <p className="text-orange-300 font-semibold mt-1">{pendingCount}</p>
              </div>
              <div className="rounded-lg bg-slate-900/40 px-3 py-2">
                <p className="text-slate-400 uppercase tracking-wide">Progress</p>
                <p className="text-blue-300 font-semibold mt-1">{syncInProgress ? "Uploading…" : "Ready"}</p>
              </div>
            </div>
          </div>
        )}

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
              onCameraStateChange={handleCameraStateChange}
              offlineMode={offlineState === "offline"}
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
    offline:     { cls: "bg-red-500/15 border-red-500/40 text-red-300",          label: "Offline",        pulse: false },
  };
  const c = cfg[status];
  const Icon = status === "disconnected" || status === "error" || status === "offline" ? WifiOff : Wifi;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${c.cls}`}>
      {c.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      <Icon className="w-3 h-3" />
      {c.label}
    </div>
  );
}

function StatusBanner({ status, lastSentAt, message }: { status: ConnStatus; lastSentAt: string | null; message: string }) {
  if (status === "offline") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25">
        <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
        <p className="text-sm font-semibold text-red-300">{message || "Offline — changes saved locally"}</p>
      </div>
    );
  }
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
