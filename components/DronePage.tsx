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
import type { RealtimeChannel } from "ably";
import DroneCamera from "@/components/DroneCamera";
import type { AnalysisResult, DroneTelemetry } from "@/types";
import { DRONE_CHANNEL, EVENT_ANALYSIS, EVENT_HEARTBEAT, EVENT_LOCATION, EVENT_TELEMETRY } from "@/lib/ablyConfig";
import { getLocationName } from "@/lib/geo";
import {
  saveOfflineCapture,
  getPendingCaptures,
  deleteCapture,
  getPendingCount,
  updateCaptureStatus,
  type OfflineCaptureV2,
} from "@/lib/offlineCaptureV2";

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
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingCaptureCount, setPendingCaptureCount] = useState<number>(0);
  const [isSendingPending, setIsSendingPending] = useState<boolean>(false);
  const [sendProgress, setSendProgress] = useState<{ sent: number; total: number } | null>(null);
  const ablyRef = useRef<Realtime | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gpsWatcherRef = useRef<number | null>(null);
  const cameraActiveRef = useRef(false);
  const currentGpsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // ── Load pending count on mount ──────────────────────────────────────────
  useEffect(() => {
    getPendingCount()
      .then((count) => {
        setPendingCaptureCount(count);
      })
      .catch((err) => {
        console.error("Failed to load pending count:", err);
      });
  }, []);

  // ── Monitor online/offline status ──────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // When coming online, refresh pending count
      getPendingCount()
        .then((count) => {
          setPendingCaptureCount(count);
        })
        .catch((err) => {
          console.error("Failed to refresh pending count on online:", err);
        });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnStatus("offline");
      // When going offline, ensure we have current count
      getPendingCount()
        .then((count) => {
          setPendingCaptureCount(count);
        })
        .catch((err) => {
          console.error("Failed to refresh pending count on offline:", err);
        });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ── Connect to Ably when online ──────────────────────────────────────────
  useEffect(() => {
    // If offline, skip Ably connection attempt
    if (!isOnline) {
      setConnStatus("offline");
      return;
    }

    const key = process.env.NEXT_PUBLIC_ABLY_KEY;
    if (!key) {
      console.error("[DronePage] NEXT_PUBLIC_ABLY_KEY is not set");
      setConnStatus("error");
      setStatusMessage("Ably API key is not configured.");
      return;
    }

    const ably = new Realtime({ key, autoConnect: true });
    ablyRef.current = ably;

    const startGPSWatch = () => {
      if (navigator.geolocation && !gpsWatcherRef.current) {
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
    };
  }, [isOnline]);

  // ── Handle offline capture (callback from DroneCamera when offline) ────────
  const handleOfflineCapture = useCallback(async (imageDataUrl: string) => {
    console.log("[DEBUG-C] handleOfflineCapture called with data length:", imageDataUrl?.length || 0);
    
    try {
      // Save to IndexedDB
      console.log("[DEBUG-D] INDEXEDDB SAVE START");
      await saveOfflineCapture(imageDataUrl);
      console.log("[DEBUG-E] INDEXEDDB SAVE SUCCESS");
      
      // Update pending count
      const count = await getPendingCount();
      console.log("[DEBUG-F] PENDING COUNT =", count);
      setPendingCaptureCount(count);
      
      // Show feedback
      setStatusMessage(`📦 Saved Offline (${count} pending)`);
      setTimeout(() => {
        setStatusMessage("");
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[DEBUG-E] INDEXEDDB SAVE FAILED:", errorMsg);
      setStatusMessage("Failed to save capture locally");
      setTimeout(() => {
        setStatusMessage("");
      }, 2000);
    }
  }, []);

  // ── Handle online camera capture — analyze + publish ─────────────────────
  const handleDroneAnalyze = useCallback(async (
    base64: string,
    mimeType: string,
    previewDataUrl: string,
    latitude?: number,
    longitude?: number,
  ) => {
    console.log(`[DronePage] Online analysis started`);

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

  // ── Handle camera state changes (start/stop) ──────────────────────────
  const handleCameraStateChange = useCallback((isActive: boolean) => {
    cameraActiveRef.current = isActive;
    console.log(`[DronePage] Camera state changed: ${isActive ? "active" : "inactive"}`);
  }, []);

  // ── Send pending offline captures (manual button) ──────────────────────
  const handleSendPendingCaptures = useCallback(async () => {
    // Check if internet is available
    if (!isOnline) {
      setStatusMessage("📡 Internet connection required to send pending captures");
      setTimeout(() => {
        setStatusMessage("");
      }, 3000);
      return;
    }

    setIsSendingPending(true);
    setSendProgress({ sent: 0, total: 0 });

    try {
      // Get all pending captures
      const captures = await getPendingCaptures();
      
      if (captures.length === 0) {
        setIsSendingPending(false);
        setSendProgress(null);
        return;
      }

      setSendProgress({ sent: 0, total: captures.length });
      let successCount = 0;

      // Process each capture one at a time
      for (let i = 0; i < captures.length; i++) {
        const capture = captures[i];
        
        try {
          // Mark as sending
          await updateCaptureStatus(capture.id, "sending");
          
          // Extract base64 from data URL
          const base64 = capture.imageDataUrl.split(",")[1] || capture.imageDataUrl;
          const mimeMatch = capture.imageDataUrl.match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
          
          // Step 1: Send to Gemini API
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error ?? "Analysis failed");
          }

          const result: AnalysisResult = data.result;

          // Step 2: Resize preview
          let smallPreview = capture.imageDataUrl;
          try {
            smallPreview = await resizeForPreview(capture.imageDataUrl);
          } catch {
            // Use full preview if resize fails
          }

          // Step 3: Publish to Ably
          const ch = channelRef.current;
          if (!ch) {
            throw new Error("Not connected to Ably");
          }

          const payload: DroneAnalysisMessage = {
            result,
            previewDataUrl: smallPreview,
            capturedAt: capture.capturedAt,
          };

          await ch.publish(EVENT_ANALYSIS, payload);

          // Step 4: Delete from IndexedDB only after successful send
          await deleteCapture(capture.id);
          
          successCount++;
          setSendProgress({ sent: successCount, total: captures.length });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          console.error(`Failed to send capture ${i + 1}:`, msg);
          // Keep the capture pending, continue with next one
        }
      }

      // Update UI with results
      if (successCount === captures.length) {
        setStatusMessage(`✅ ${successCount} pending captures sent successfully`);
      } else {
        const remaining = captures.length - successCount;
        setStatusMessage(`✅ ${successCount} sent, ${remaining} still pending`);
      }

      // Refresh pending count
      const remainingCount = await getPendingCount();
      setPendingCaptureCount(remainingCount);

      setTimeout(() => {
        setStatusMessage("");
        setIsSendingPending(false);
        setSendProgress(null);
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Send pending error:", msg);
      setStatusMessage("❌ Failed to send pending captures");

      setTimeout(() => {
        setStatusMessage("");
        setIsSendingPending(false);
        setSendProgress(null);
      }, 3000);
    }
  }, [isOnline]);

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
        <ConnectionPill status={connStatus} isOffline={!isOnline} />
      </header>

      <main className="flex-1 px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto w-full">
        <StatusBanner
          status={connStatus}
          lastSentAt={lastSentAt}
          message={statusMessage}
        />

        {/* DEBUG PANEL - TEMPORARY */}
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
          <p className="text-xs font-mono text-slate-400 mb-2">
            <span className="text-blue-300">Offline pipeline:</span>
          </p>
          <p className="text-xs font-mono text-slate-400 mb-2">
            A: {isOnline ? "⏸" : "🔴"} | B: {isOnline ? "⏸" : "?"} | C: {pendingCaptureCount > 0 ? "✓" : "?"} | D: {pendingCaptureCount > 0 ? "✓" : "?"} | E: {pendingCaptureCount > 0 ? "✓" : "?"}
          </p>
          <p className="text-xs font-mono text-orange-300">
            Pending: {pendingCaptureCount}
          </p>
        </div>

        {/* Offline captures section */}
        {pendingCaptureCount > 0 && (
          <OfflineCapturesSection
            pendingCount={pendingCaptureCount}
            isSending={isSendingPending}
            sendProgress={sendProgress}
            onSendClick={handleSendPendingCaptures}
          />
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
              isOnline={isOnline}
              onOfflineCapture={handleOfflineCapture}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            {!isOnline ? (
              <>
                <span className="text-red-300 font-semibold">Offline Mode:</span> Captures will be stored
                locally when offline mode is enabled.
              </>
            ) : (
              <>
                <span className="text-slate-300 font-semibold">Drone mode</span> — capture a frame and tap{" "}
                <span className="text-purple-300 font-semibold">Analyze Captured Frame</span>. The AI result
                is sent to the Control Station automatically.
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConnectionPill({ status, isOffline }: { status: ConnStatus; isOffline: boolean }) {
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
  const Icon = isOffline || status === "disconnected" || status === "error" ? WifiOff : Wifi;
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

// ── Offline Captures Section Component ──────────────────────────────────────

function OfflineCapturesSection({
  pendingCount,
  isSending,
  sendProgress,
  onSendClick,
}: {
  pendingCount: number;
  isSending: boolean;
  sendProgress: { sent: number; total: number } | null;
  onSendClick: () => void;
}) {
  return (
    <div className="rounded-xl border border-orange-500/25 bg-gradient-to-b from-orange-950/20 to-orange-950/10 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📦</span>
          <span className="text-sm font-bold text-orange-300">Offline Captures</span>
        </div>
        <span className="text-xs font-semibold text-orange-300 bg-orange-950/40 px-2 py-1 rounded">
          {pendingCount} pending
        </span>
      </div>

      {isSending && sendProgress ? (
        <div className="space-y-2">
          <div className="text-xs text-slate-300">
            Sending {sendProgress.sent}/{sendProgress.total}...
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
              style={{
                width: `${(sendProgress.sent / sendProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={onSendClick}
          className="w-full px-3 py-2 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30 transition-colors text-sm font-medium"
        >
          📤 Send Pending Captures
        </button>
      )}
    </div>
  );
}
