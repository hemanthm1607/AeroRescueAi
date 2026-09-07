"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Cpu,
  Video,
  VideoOff,
  Camera,
  X,
  CheckCircle2,
  ScanSearch,
  CircleDot,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { dataUrlToBase64, getMimeFromDataUrl } from "@/lib/utils";
import { requestGeoLocation } from "@/lib/geo";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface DroneCameraProps {
  onAnalyze: (
    base64: string,
    mimeType: string,
    previewUrl: string,
    latitude?: number,
    longitude?: number
  ) => void;
  isAnalyzing: boolean;
  onCameraStateChange?: (isActive: boolean) => void;
  isOnline?: boolean;
  onOfflineCapture?: (imageDataUrl: string) => Promise<void> | void;
  onDebugCountersChange?: (counters: { timerFired: number; frameCaptured: number; offlineCallback: number }) => void;
}

type CameraState = "idle" | "requesting" | "active" | "error" | "captured";

export default function DroneCamera({ onAnalyze, isAnalyzing, onCameraStateChange, isOnline = true, onOfflineCapture, onDebugCountersChange }: DroneCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoLoopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAutoAnalyzingRef = useRef(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const batteryWatcherRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCameraStateChangeRef = useRef(onCameraStateChange);
  const isOnlineRef = useRef(isOnline);
  const onOfflineCaptureRef = useRef(onOfflineCapture);
  const onAnalyzeRef = useRef(onAnalyze);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // DEBUG COUNTERS
  const [debugTimerFired, setDebugTimerFired] = useState(0);
  const [debugFrameCaptured, setDebugFrameCaptured] = useState(0);
  const [debugOfflineCallback, setDebugOfflineCallback] = useState(0);

  // Update ref when onCameraStateChange changes
  useEffect(() => {
    onCameraStateChangeRef.current = onCameraStateChange;
  }, [onCameraStateChange]);

  // Update ref when isOnline changes
  useEffect(() => {
    console.log("[OFFLINE-3] isOnline changed to:", isOnline);
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // Update ref when onOfflineCapture changes
  useEffect(() => {
    onOfflineCaptureRef.current = onOfflineCapture;
  }, [onOfflineCapture]);

  // Update ref when onAnalyze changes
  useEffect(() => {
    onAnalyzeRef.current = onAnalyze;
  }, [onAnalyze]);

  // Notify parent of debug counter changes
  useEffect(() => {
    onDebugCountersChange?.({
      timerFired: debugTimerFired,
      frameCaptured: debugFrameCaptured,
      offlineCallback: debugOfflineCallback,
    });
  }, [debugTimerFired, debugFrameCaptured, debugOfflineCallback, onDebugCountersChange]);

  // Clean up stream and auto-loop on unmount
  useEffect(() => {
    return () => {
      if (autoLoopIntervalRef.current) clearInterval(autoLoopIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (batteryWatcherRef.current) clearInterval(batteryWatcherRef.current);
      stopStream();
    };
  }, []);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (batteryWatcherRef.current) {
      clearInterval(batteryWatcherRef.current);
      batteryWatcherRef.current = null;
    }
  }

  function startBatteryMonitoring() {
    // Request Battery Status API if available
    if (navigator && (navigator as any).getBattery) {
      ((navigator as any).getBattery() as Promise<any>).then((battery: any) => {
        const updateBatteryStatus = () => {
          onCameraStateChangeRef.current?.(true);
        };
        battery.addEventListener("levelchange", updateBatteryStatus);
        battery.addEventListener("chargingchange", updateBatteryStatus);
        updateBatteryStatus();
      }).catch(() => {
        // Battery API not available
      });
    }
    
    // Also poll for updates periodically (some browsers update infrequently)
    if (batteryWatcherRef.current) {
      clearInterval(batteryWatcherRef.current);
    }
    batteryWatcherRef.current = setInterval(() => {
      onCameraStateChangeRef.current?.(true);
    }, 5000); // Every 5 seconds
  }

  // Capture the current video frame - returns data URL or null on failure
  function captureCurrentFrame(): string | null {
    if (!videoRef.current || !canvasRef.current) {
      console.log("[DEBUG-B] videoRef or canvasRef is null");
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    console.log(`[DEBUG-B] video.readyState=${video.readyState}, videoWidth=${video.videoWidth}, videoHeight=${video.videoHeight}`);

    // Verify video is ready
    if (video.readyState < 2) {
      console.log("[DEBUG-B] Video not ready (readyState < 2)");
      return null;
    }

    const videoWidth = video.videoWidth || 0;
    const videoHeight = video.videoHeight || 0;

    if (videoWidth === 0 || videoHeight === 0) {
      console.log("[DEBUG-B] Video dimensions are zero");
      return null;
    }

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("[DEBUG-B] Canvas context is null");
      return null;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    if (!dataUrl || dataUrl.length < 1000) {
      console.log(`[DEBUG-B] dataUrl invalid: length=${dataUrl?.length || 0}`);
      return null;
    }

    console.log(`[DEBUG-B] Frame captured: ${dataUrl.length} bytes`);
    setDebugFrameCaptured(prev => prev + 1);
    return dataUrl;
  }

  const handleAutomaticCaptureFnRef = useRef<() => void>(() => {});
  
  // Always update the ref to the latest function
  useEffect(() => {
    handleAutomaticCaptureFnRef.current = () => {
      // CHECK ACTUAL NETWORK STATE AT CAPTURE TIME, NOT STALE PROP
      const capturedWhileOffline = !navigator.onLine;
      console.log("[OFFLINE-FLOW-1] TIMER FIRED");
      console.log(`[OFFLINE-FLOW-3] CAPTURE NETWORK STATUS: ${capturedWhileOffline ? "OFFLINE" : "ONLINE"}`);
      
      setLastAnalysisTime("Just now");

      const dataUrl = captureCurrentFrame();
      console.log("[OFFLINE-FLOW-2] FRAME CAPTURED:", dataUrl ? `${dataUrl.length} bytes` : "NULL");
      
      if (!dataUrl) {
        console.log("[OFFLINE-FLOW-2] Frame capture failed - returning");
        return;
      }

      if (capturedWhileOffline) {
        // OFFLINE PATH - save locally immediately
        console.log("[OFFLINE-FLOW-4] OFFLINE CAPTURE CALLBACK");
        if (onOfflineCaptureRef.current) {
          setDebugOfflineCallback(prev => prev + 1);
          try {
            onOfflineCaptureRef.current(dataUrl);
            console.log("[OFFLINE-FLOW-4] onOfflineCapture callback invoked successfully");
          } catch (error) {
            console.error("[OFFLINE-FLOW-4] onOfflineCapture threw error:", error);
          }
        } else {
          console.error("[OFFLINE-FLOW-4] onOfflineCapture callback is undefined!");
        }
      } else {
        // ONLINE PATH - existing Gemini flow
        console.log("[OFFLINE-FLOW] ONLINE PATH - calling onAnalyze");
        const base64 = dataUrlToBase64(dataUrl);
        const mime = getMimeFromDataUrl(dataUrl);
        
        onAnalyzeRef.current(
          base64,
          mime,
          dataUrl,
          gpsLocation?.latitude,
          gpsLocation?.longitude
        );
      }
    };
  }, []);

  // Handle the 10-second automatic capture (now just calls the ref)
  function handleAutomaticCapture() {
    handleAutomaticCaptureFnRef.current();
  }

  function startCountdown() {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setCountdown(10);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        const next = prev <= 1 ? 10 : prev - 1;
        return next;
      });
    }, 1000);
  }

  const startCamera = useCallback(async () => {
    setErrorMessage("");
    setCapturedFrame(null);
    setCameraState("requesting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        "Camera access is not supported in this browser. Please use Chrome, Firefox, or Safari."
      );
      setCameraState("error");
      return;
    }

    try {
      // Request GPS location in parallel with camera (non-blocking)
      const geoPromise = requestGeoLocation(3000); // 3 second timeout

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Wait for GPS result in background (don't block camera startup)
        geoPromise.then((location) => {
          if (location) {
            setGpsLocation({
              latitude: location.latitude,
              longitude: location.longitude,
            });
          }
        });

        // Wait for video to have valid frame data before starting auto-loop
        const waitForVideoReady = () => {
          const video = videoRef.current;
          if (
            video &&
            video.readyState >= 2 && // HAVE_CURRENT_DATA or better
            video.videoWidth > 0 &&
            video.videoHeight > 0
          ) {
            setCameraState("active");
            setIsAutoMode(true);
            setLastAnalysisTime(null);
            setCountdown(10);

            // Start battery monitoring
            startBatteryMonitoring();

            // Capture immediately on startup
            console.log("[OFFLINE-1] Capturing immediately on startup");
            handleAutomaticCapture();

            // Start countdown timer (visual only)
            startCountdown();

            // Start automatic 10-second capture loop
            if (autoLoopIntervalRef.current) {
              clearInterval(autoLoopIntervalRef.current);
            }
            console.log("[OFFLINE-1] Starting 10-second auto-loop interval");
            autoLoopIntervalRef.current = setInterval(() => {
              console.log("[OFFLINE-1] AUTO TIMER FIRED (interval callback)");
              setDebugTimerFired(prev => prev + 1);
              handleAutomaticCapture();
            }, 10_000);
            console.log("[OFFLINE-1] Auto-loop interval started, ID:", autoLoopIntervalRef.current);
          } else {
            // Video not ready yet, check again soon
            setTimeout(waitForVideoReady, 100);
          }
        };

        waitForVideoReady();
      }
    } catch (err) {
      stopStream();
      const e = err as DOMException;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setErrorMessage(
          "Camera permission denied. Please allow camera access in your browser settings and try again."
        );
      } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
        setErrorMessage(
          "No camera found on this device. Please connect a camera and try again."
        );
      } else if (e.name === "NotReadableError" || e.name === "TrackStartError") {
        setErrorMessage(
          "Camera is already in use by another application. Close other apps using the camera and try again."
        );
      } else {
        setErrorMessage(`Camera error: ${e.message || "Unknown error occurred."}`);
      }
      setCameraState("error");
    }
  }, [facingMode]);

  function stopCamera() {
    if (autoLoopIntervalRef.current) {
      clearInterval(autoLoopIntervalRef.current);
      autoLoopIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    stopStream();
    setCameraState("idle");
    setCapturedFrame(null);
    setErrorMessage("");
    setIsAutoMode(false);
    setCountdown(10);
    setLastAnalysisTime(null);
    setGpsLocation(null);
    onCameraStateChangeRef.current?.(false);
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    setCapturedFrame(dataUrl);
    setCameraState("captured");
    stopStream();
  }

  function discardCapture() {
    setCapturedFrame(null);
    setCameraState("idle");
  }

  function retakeFrame() {
    if (autoLoopIntervalRef.current) {
      clearInterval(autoLoopIntervalRef.current);
      autoLoopIntervalRef.current = null;
    }
    setCapturedFrame(null);
    startCamera();
  }

  function handleAnalyze() {
    if (!capturedFrame) return;
    const base64 = dataUrlToBase64(capturedFrame);
    const mime = getMimeFromDataUrl(capturedFrame);
    // Pass GPS coordinates if available
    onAnalyze(
      base64,
      mime,
      capturedFrame,
      gpsLocation?.latitude,
      gpsLocation?.longitude
    );
  }

  function toggleFacingMode() {
    if (autoLoopIntervalRef.current) {
      clearInterval(autoLoopIntervalRef.current);
      autoLoopIntervalRef.current = null;
    }
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    if (cameraState === "active") {
      stopStream();
      setCameraState("idle");
      onCameraStateChangeRef.current?.(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
            <Cpu className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Drone Camera Feed</h3>
            <p className="text-xs text-slate-400">Live capture · Frame analysis</p>
          </div>
        </div>

        {/* Camera facing toggle */}
        {(cameraState === "idle" || cameraState === "error") && (
          <button
            onClick={toggleFacingMode}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded-lg hover:bg-slate-700/50"
          >
            <RefreshCw className="w-3 h-3" />
            {facingMode === "environment" ? "Rear" : "Front"} cam
          </button>
        )}
      </div>

      {/* Main camera area */}
      <div className="relative rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/60 aspect-video flex items-center justify-center min-h-[200px]">

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live video feed */}
        <video
          ref={videoRef}
          className={cn(
            "w-full h-full object-cover",
            cameraState !== "active" && "hidden"
          )}
          autoPlay
          playsInline
          muted
          aria-label="Live drone camera feed"
        />

        {/* Captured frame preview */}
        {cameraState === "captured" && capturedFrame && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedFrame}
            alt="Captured drone frame"
            className="w-full h-full object-cover"
          />
        )}

        {/* Idle state */}
        {cameraState === "idle" && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
              <Video className="w-8 h-8 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Camera Offline</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Start camera to begin drone feed
              </p>
            </div>
          </div>
        )}

        {/* Requesting permission */}
        {cameraState === "requesting" && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-blue-500/40 flex items-center justify-center animate-pulse">
              <Camera className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Requesting Camera…</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Please allow camera access when prompted
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {cameraState === "error" && (
          <div className="flex flex-col items-center gap-3 p-6 text-center max-w-xs">
            <div className="w-16 h-16 rounded-full border-2 border-red-500/40 bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-300">Camera Unavailable</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Active camera overlays */}
        {cameraState === "active" && (
          <>
            {/* REC indicator */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 backdrop-blur-sm rounded-full border border-red-500/40">
              <CircleDot className="w-3 h-3 text-red-500 animate-pulse" />
              <span className="text-xs text-red-300 font-bold tracking-widest">LIVE</span>
            </div>

            {/* Corner scan lines */}
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-emerald-400/60 rounded-tr-sm" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-emerald-400/60 rounded-bl-sm" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-emerald-400/60 rounded-br-sm" />
          </>
        )}

        {/* Captured frame overlay */}
        {cameraState === "captured" && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 backdrop-blur-sm rounded-full border border-green-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-green-300 font-medium">Frame Captured</span>
          </div>
        )}
      </div>

      {/* Auto mode status indicator */}
      {isAutoMode && cameraState === "active" && (
        <div className="rounded-xl border border-green-500/25 bg-gradient-to-b from-green-950/20 to-green-950/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            </div>
            <span className="text-sm font-bold text-green-300">DRONE CAMERA ACTIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-slate-900/40 px-3 py-2">
              <p className="text-slate-400 uppercase tracking-wide">Automatic Analysis</p>
              <p className="text-green-300 font-semibold mt-1">ON</p>
            </div>
            <div className="rounded-lg bg-slate-900/40 px-3 py-2">
              <p className="text-slate-400 uppercase tracking-wide">Next Analysis</p>
              <p className="text-blue-300 font-mono font-semibold mt-1">{countdown}s</p>
            </div>
            <div className="col-span-2 rounded-lg bg-slate-900/40 px-3 py-2">
              <p className="text-slate-400 uppercase tracking-wide">Last Analysis</p>
              <p className="text-slate-300 font-semibold mt-1">
                {lastAnalysisTime || "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-2">
        {/* Primary controls */}
        {cameraState === "idle" || cameraState === "error" ? (
          <Button
            variant="secondary"
            fullWidth
            onClick={startCamera}
            className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
          >
            <Video className="w-4 h-4 text-emerald-400" />
            Start Drone Camera
          </Button>
        ) : cameraState === "requesting" ? (
          <Button variant="secondary" fullWidth disabled>
            <Camera className="w-4 h-4 animate-pulse" />
            Connecting…
          </Button>
        ) : cameraState === "active" && isAutoMode ? (
          <Button
            variant="danger"
            onClick={stopCamera}
            className="gap-2"
            fullWidth
          >
            <VideoOff className="w-4 h-4" />
            Stop Drone Camera
          </Button>
        ) : cameraState === "active" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="danger"
              onClick={stopCamera}
              className="gap-2"
            >
              <VideoOff className="w-4 h-4" />
              Stop
            </Button>
            <Button
              variant="primary"
              onClick={captureFrame}
              className="gap-2"
            >
              <Camera className="w-4 h-4" />
              Capture Frame
            </Button>
          </div>
        ) : null}

        {/* Captured frame actions - HIDDEN in auto mode */}
        {cameraState === "captured" && !isAutoMode && (
          <>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              loading={isAnalyzing}
            >
              <ScanSearch className="w-4 h-4" />
              {isAnalyzing ? "Analyzing Scene…" : "Analyze Captured Frame"}
            </Button>

            {!isAnalyzing && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={retakeFrame} size="sm">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retake
                </Button>
                <Button variant="ghost" onClick={discardCapture} size="sm">
                  <X className="w-3.5 h-3.5" />
                  Discard
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hint text */}
      {cameraState === "idle" && (
        <p className="text-xs text-slate-500 text-center">
          Simulates a live drone camera feed. Browser will request camera permission.
        </p>
      )}
    </div>
  );
}
