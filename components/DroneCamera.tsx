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
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface DroneCameraProps {
  onAnalyze: (base64: string, mimeType: string, previewUrl: string) => void;
  isAnalyzing: boolean;
}

type CameraState = "idle" | "requesting" | "active" | "error" | "captured";

export default function DroneCamera({ onAnalyze, isAnalyzing }: DroneCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoLoopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAutoAnalyzingRef = useRef(false);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  // Clean up stream and auto-loop on unmount
  useEffect(() => {
    return () => {
      if (autoLoopIntervalRef.current) clearInterval(autoLoopIntervalRef.current);
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
  }

  function captureAndAnalyzeFrame() {
    if (isAutoAnalyzingRef.current || isAnalyzing) return; // Prevent simultaneous analyses
    if (!videoRef.current || !canvasRef.current) return;

    isAutoAnalyzingRef.current = true;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      isAutoAnalyzingRef.current = false;
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    const base64 = dataUrlToBase64(dataUrl);
    const mime = getMimeFromDataUrl(dataUrl);
    onAnalyze(base64, mime, dataUrl);

    isAutoAnalyzingRef.current = false;
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
      }

      setCameraState("active");

      // Start automatic 10-second analysis loop
      if (autoLoopIntervalRef.current) clearInterval(autoLoopIntervalRef.current);
      autoLoopIntervalRef.current = setInterval(() => {
        captureAndAnalyzeFrame();
      }, 10_000);
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
    stopStream();
    setCameraState("idle");
    setCapturedFrame(null);
    setErrorMessage("");
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
    onAnalyze(base64, mime, capturedFrame);
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

        {/* Captured frame actions */}
        {cameraState === "captured" && (
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
