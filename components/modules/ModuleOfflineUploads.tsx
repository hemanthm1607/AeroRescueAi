"use client";

import { useState, useEffect } from "react";
import { Cloud, MapPin, Clock, AlertCircle, RefreshCw } from "lucide-react";
import type { OfflineCaptureV2 } from "@/lib/offlineCaptureV2";
import { getAllCaptures } from "@/lib/offlineCaptureV2";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface ModuleOfflineUploadsProps {
  onSelectCapture: (captureId: string) => void;
}

export default function ModuleOfflineUploads({
  onSelectCapture,
}: ModuleOfflineUploadsProps) {
  const [captures, setCaptures] = useState<OfflineCaptureV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCaptures();
    
    // Refresh captures every 2 seconds to show new offline captures in real-time
    const interval = setInterval(() => {
      loadCaptures();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const loadCaptures = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("[OFFLINE-8] Offline Uploads loading captures...");
      const data = await getAllCaptures();
      console.log("[OFFLINE-8] Offline Uploads loaded", data.length, "captures");
      setCaptures(data);
    } catch (err) {
      console.error("[OFFLINE-8] Error loading offline captures:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load captures"
      );
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
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30">
            <Cloud className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Offline Uploads</h1>
            <p className="text-xs text-slate-500 mt-1">
              Captured images stored locally during offline mode
            </p>
          </div>
        </div>
        <button
          onClick={loadCaptures}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
            isLoading
              ? "border-slate-700 bg-slate-800/50 text-slate-500 cursor-not-allowed"
              : "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Error loading captures</p>
            <p className="text-xs text-red-200/70 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !captures.length && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 animate-pulse">
              <Cloud className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm text-slate-400">Loading offline captures...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && captures.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
              <Cloud className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-base font-semibold text-slate-300 mb-1">
              No offline captures yet
            </p>
            <p className="text-sm text-slate-500 text-center max-w-xs">
              Captures taken while offline will appear here once you go back online
            </p>
          </CardContent>
        </Card>
      )}

      {/* Captures grid */}
      {!isLoading && captures.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {captures.length} Capture{captures.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {captures.map((capture) => (
              <button
                key={capture.id}
                onClick={() => onSelectCapture(capture.id)}
                className="group text-left"
              >
                <Card className="h-full hover:border-indigo-500/40 transition-all hover:shadow-lg hover:shadow-indigo-900/20 cursor-pointer">
                  {/* Image thumbnail */}
                  <div className="relative w-full bg-slate-900 overflow-hidden rounded-t-xl">
                    <img
                      src={capture.imageDataUrl}
                      alt="Offline capture"
                      className="w-full h-40 object-cover group-hover:brightness-110 transition-all"
                    />
                    {/* Status badge overlay */}
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="default"
                        className={cn("text-xs font-bold", getStatusColor(capture.status))}
                      >
                        {getStatusLabel(capture.status)}
                      </Badge>
                    </div>

                    {/* Location indicator */}
                    {capture.latitude !== undefined && capture.longitude !== undefined && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700/50">
                        <MapPin className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-300 font-mono">GPS</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <CardContent className="pt-3 pb-3">
                    {/* Date/Time */}
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-xs text-slate-400">
                        {formatDate(capture.capturedAt)}
                      </span>
                    </div>

                    {/* Analysis status */}
                    {capture.analysisResult ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        Analysis available
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700/30 text-xs font-medium text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        No analysis
                      </div>
                    )}
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats footer */}
      {!isLoading && captures.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total",
              value: captures.length,
              color: "slate",
            },
            {
              label: "Pending",
              value: captures.filter((c) => c.status === "pending").length,
              color: "yellow",
            },
            {
              label: "Sent",
              value: captures.filter((c) => c.status === "sent").length,
              color: "green",
            },
            {
              label: "With GPS",
              value: captures.filter(
                (c) => c.latitude !== undefined && c.longitude !== undefined
              ).length,
              color: "blue",
            },
          ].map((stat) => {
            const colorMap: Record<string, string> = {
              slate: "bg-slate-500/10 border-slate-500/20 text-slate-300",
              yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-300",
              green: "bg-green-500/10 border-green-500/20 text-green-300",
              blue: "bg-blue-500/10 border-blue-500/20 text-blue-300",
            };
            return (
              <div
                key={stat.label}
                className={cn(
                  "rounded-lg border p-3",
                  colorMap[stat.color as keyof typeof colorMap]
                )}
              >
                <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
