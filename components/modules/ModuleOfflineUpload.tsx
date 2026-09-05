"use client";

import { useEffect, useState } from "react";
import { Cloud, MapPin, AlertCircle, Check, RotateCw, Loader } from "lucide-react";
import type { PendingCapture } from "@/lib/offlineStorage";
import { getAllPendingCaptures } from "@/lib/offlineStorage";
import { getSeverityBg, getSeverityColor, formatTimestamp } from "@/lib/utils";
import { formatCoordinates } from "@/lib/geo";
import { subscribeToStateChanges } from "@/lib/offlineSync";
import OfflineCaptureModal from "@/components/OfflineCaptureModal";
import Button from "@/components/ui/Button";

export default function ModuleOfflineUpload() {
  const [captures, setCapturesState] = useState<PendingCapture[]>([]);
  const [selectedCapture, setSelectedCapture] = useState<PendingCapture | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load offline captures from IndexedDB
  const loadCaptures = async () => {
    try {
      const allCaptures = await getAllPendingCaptures();
      // Sort by timestamp descending (newest first)
      const sorted = allCaptures.sort((a, b) =>
        new Date(b.captureTimestamp).getTime() - new Date(a.captureTimestamp).getTime()
      );
      setCapturesState(sorted);
    } catch (err) {
      console.error("[ModuleOfflineUpload] Failed to load captures:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCaptures();

    // Subscribe to sync state changes and refresh captures when sync completes
    const unsubscribe = subscribeToStateChanges((state) => {
      // When sync finishes (whether complete or with errors), refresh the capture list
      // This allows pending → completed status changes to be reflected in the UI
      if (state.syncState === "idle" && state.pendingCount >= 0) {
        console.log("[ModuleOfflineUpload] Sync state changed, refreshing captures");
        loadCaptures();
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/30",
          text: "text-yellow-300",
          label: "Pending",
          icon: AlertCircle,
        };
      case "syncing":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-300",
          label: "Uploading",
          icon: Loader,
        };
      case "completed":
        return {
          bg: "bg-green-500/10",
          border: "border-green-500/30",
          text: "text-green-300",
          label: "Synced",
          icon: Check,
        };
      case "failed":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-300",
          label: "Failed",
          icon: AlertCircle,
        };
      default:
        return {
          bg: "bg-slate-500/10",
          border: "border-slate-500/30",
          text: "text-slate-300",
          label: "Unknown",
          icon: AlertCircle,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
            <Cloud className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Offline Upload & Detection</h1>
            <p className="text-xs text-slate-500">Loading offline captures…</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-8 flex items-center justify-center">
          <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
          <Cloud className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white">Offline Upload & Detection</h1>
          <p className="text-xs text-slate-500">
            {captures.length === 0
              ? "No offline captures stored"
              : `${captures.length} capture${captures.length !== 1 ? "s" : ""} available`}
          </p>
        </div>
      </div>

      {/* ── Captures grid ─────────────────────────────────────── */}
      {captures.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 overflow-hidden shadow-lg shadow-slate-950/20">
          <div className="p-8 flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/50 border border-slate-700/50">
              <Cloud className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">No offline captures yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Offline captures will appear here when you capture images without network connection.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {captures.map((capture) => {
            const statusInfo = getStatusBadge(capture.uploadStatus);
            const StatusIcon = statusInfo.icon;
            const hasAnalysis = capture.analysisResult !== undefined;
            const result = capture.analysisResult;

            return (
              <button
                key={capture.id}
                onClick={() => setSelectedCapture(capture)}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-700/40 bg-gradient-to-b from-slate-800/40 to-slate-900/60 overflow-hidden transition-all duration-200 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                {/* Image preview */}
                <div className="relative w-full h-40 bg-slate-900/60 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capture.imageData}
                    alt="Offline capture"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Status badge overlay */}
                  <div
                    className={`absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${statusInfo.bg} ${statusInfo.border}`}
                  >
                    <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.text}`} />
                    <span className={`text-xs font-semibold ${statusInfo.text}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  {/* Syncing animation */}
                  {capture.uploadStatus === "syncing" && (
                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
                  )}
                </div>

                {/* Card content */}
                <div className="flex flex-col gap-2 px-4 pb-4">
                  {/* Timestamp */}
                  <div className="text-xs text-slate-400">
                    {formatTimestamp(capture.captureTimestamp)}
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">
                      {capture.latitude && capture.longitude
                        ? formatCoordinates(capture.latitude, capture.longitude)
                        : "Location unavailable"}
                    </span>
                  </div>

                  {/* Analysis summary */}
                  {hasAnalysis && result ? (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-700/40">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-500">People</span>
                          <span className="font-semibold text-slate-200">
                            {result.peopleDetected}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-500">Teams</span>
                          <span className="font-semibold text-slate-200">
                            {Math.ceil(result.peopleDetected / 2)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-500">Disaster</span>
                          <span className="font-semibold text-slate-200 truncate">
                            {result.disasterType}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-500">Severity</span>
                          <span
                            className={`font-semibold truncate ${getSeverityColor(
                              result.floodSeverity
                            )}`}
                          >
                            {result.floodSeverity}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/40 text-xs text-slate-400">
                      <Loader className="w-3 h-3 animate-spin" />
                      Analysis pending
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────── */}
      {selectedCapture && (
        <OfflineCaptureModal
          capture={selectedCapture}
          onClose={() => setSelectedCapture(null)}
        />
      )}
    </div>
  );
}
