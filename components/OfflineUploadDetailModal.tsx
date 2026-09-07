"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Clock, AlertCircle } from "lucide-react";
import type { OfflineCaptureV2 } from "@/lib/offlineCaptureV2";
import { getCapture } from "@/lib/offlineCaptureV2";
import { formatCoordinates } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import AnalysisResult from "@/components/AnalysisResult";
import SimpleMapComponent from "@/components/SimpleMapComponent";

interface OfflineUploadDetailModalProps {
  captureId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function OfflineUploadDetailModal({
  captureId,
  isOpen,
  onClose,
}: OfflineUploadDetailModalProps) {
  const [capture, setCapture] = useState<OfflineCaptureV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    loadCapture();
  }, [isOpen, captureId]);

  const loadCapture = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCapture(captureId);
      if (!data) {
        setError("Capture not found");
        setCapture(null);
      } else {
        setCapture(data);
      }
    } catch (err) {
      console.error("Error loading capture:", err);
      setError(err instanceof Error ? err.message : "Failed to load capture");
      setCapture(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-300";
      case "sending":
        return "bg-blue-500/10 border-blue-500/30 text-blue-300";
      case "sent":
        return "bg-green-500/10 border-green-500/30 text-green-300";
      default:
        return "bg-slate-500/10 border-slate-500/30 text-slate-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "sending":
        return "Sending";
      case "sent":
        return "Sent";
      default:
        return status;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#070d1a] border border-slate-700/50 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-slate-700/50 bg-[#070d1a]">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Offline Capture Detail</h2>
            <p className="text-xs text-slate-500 mt-1">
              View full image and AI analysis
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 animate-pulse">
                <AlertCircle className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-sm text-slate-400">Loading capture details...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">Error loading capture</p>
                <p className="text-xs text-red-200/70 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Capture details */}
          {!isLoading && capture && (
            <div className="space-y-6">
              {/* Metadata card */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* Status */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                        Status
                      </p>
                      <Badge
                        variant="default"
                        className={cn(
                          "text-xs font-bold",
                          getStatusColor(capture.status)
                        )}
                      >
                        {getStatusLabel(capture.status)}
                      </Badge>
                    </div>

                    {/* Captured date */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                        Captured
                      </p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-300">
                          {formatDate(capture.capturedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                        GPS
                      </p>
                      {capture.latitude !== undefined &&
                      capture.longitude !== undefined ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-green-300 font-mono">
                            Available
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-600" />
                          <span className="text-sm text-slate-500">Unavailable</span>
                        </div>
                      )}
                    </div>

                    {/* Analysis */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                        Analysis
                      </p>
                      {capture.analysisResult ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          Available
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700/30 text-xs font-medium text-slate-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          None
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Capture image */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Captured Image</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <img
                    src={capture.imageDataUrl}
                    alt="Offline capture full image"
                    className="w-full max-h-96 object-contain rounded-b-xl bg-slate-900"
                  />
                </CardContent>
              </Card>

              {/* Location details if available */}
              {capture.latitude !== undefined && capture.longitude !== undefined && (
                <Card>
                  <CardHeader>
                    <button
                      onClick={() => setShowMap(!showMap)}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-400" />
                        GPS Coordinates
                      </CardTitle>
                      <span className="text-sm text-slate-400 group-hover:text-slate-200">
                        {showMap ? "Hide" : "Show"} Map
                      </span>
                    </button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Latitude</p>
                        <p className="text-sm font-mono text-slate-300">
                          {capture.latitude.toFixed(6)}°
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Longitude</p>
                        <p className="text-sm font-mono text-slate-300">
                          {capture.longitude.toFixed(6)}°
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                      <p className="text-xs text-slate-500 mb-2">Formatted</p>
                      <p className="text-sm text-slate-300">
                        {formatCoordinates(capture.latitude, capture.longitude)}
                      </p>
                    </div>

                    {/* Map component */}
                    {showMap && (
                      <div className="mt-4 rounded-lg overflow-hidden border border-slate-700/50">
                        <SimpleMapComponent
                          captures={[capture]}
                          selectedCaptureId={capture.id}
                          onSelectCapture={() => {}}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* AI Analysis Result */}
              {capture.analysisResult && (
                <div>
                  <AnalysisResult
                    result={capture.analysisResult}
                    previewUrl={capture.imageDataUrl}
                    inputMode="drone"
                    timestamp={formatDate(capture.capturedAt)}
                  />
                </div>
              )}

              {/* No analysis message */}
              {!capture.analysisResult && (
                <Card>
                  <CardContent className="flex items-center gap-3 py-6">
                    <AlertCircle className="w-5 h-5 text-slate-500 shrink-0" />
                    <p className="text-sm text-slate-400">
                      This capture has not been analyzed yet. Send it to analyze with
                      AI.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
