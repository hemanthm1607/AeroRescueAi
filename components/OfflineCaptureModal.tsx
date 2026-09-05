"use client";

import { X, MapPin, Clock, AlertCircle, CheckCircle2, RotateCw, Loader } from "lucide-react";
import type { PendingCapture } from "@/lib/offlineStorage";
import { getSeverityBg, getSeverityColor, formatTimestamp } from "@/lib/utils";
import { formatCoordinates } from "@/lib/geo";
import HazardCard from "@/components/HazardCard";
import Button from "@/components/ui/Button";

interface OfflineCaptureModalProps {
  capture: PendingCapture;
  onClose: () => void;
}

export default function OfflineCaptureModal({
  capture,
  onClose,
}: OfflineCaptureModalProps) {
  const hasAnalysis = capture.analysisResult !== undefined;
  const result = capture.analysisResult;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: AlertCircle,
          label: "Pending",
          color: "text-yellow-300",
          bg: "bg-yellow-500/10",
          description: "Waiting to upload",
        };
      case "syncing":
        return {
          icon: Loader,
          label: "Uploading",
          color: "text-blue-300",
          bg: "bg-blue-500/10",
          description: "Currently syncing to server",
        };
      case "completed":
        return {
          icon: CheckCircle2,
          label: "Synced",
          color: "text-green-300",
          bg: "bg-green-500/10",
          description: "Successfully uploaded",
        };
      case "failed":
        return {
          icon: AlertCircle,
          label: "Failed",
          color: "text-red-300",
          bg: "bg-red-500/10",
          description: "Upload failed, will retry",
        };
      default:
        return {
          icon: AlertCircle,
          label: "Unknown",
          color: "text-slate-300",
          bg: "bg-slate-500/10",
          description: "Unknown status",
        };
    }
  };

  const statusInfo = getStatusInfo(capture.uploadStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/40 bg-gradient-to-b from-slate-800/60 to-slate-900/80 shadow-2xl shadow-slate-950/60">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-700/40 bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 shrink-0">
              <AlertCircle className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-white leading-none">
                📷 Offline Incident
              </h2>
              <p className="text-xs text-slate-400 mt-1">Local capture details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-700/40 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
          </button>
        </div>

        {/* ── Content ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 p-6">
          {/* ── Image ───────────────────────────────────────────── */}
          <div className="rounded-xl overflow-hidden border border-slate-700/40 bg-slate-900/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capture.imageData}
              alt="Offline incident"
              className="w-full max-h-64 object-cover"
            />
          </div>

          {/* ── Metadata Grid ───────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Captured Time */}
            <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Captured
                </span>
              </div>
              <p className="text-sm text-slate-200">
                {formatTimestamp(capture.captureTimestamp)}
              </p>
            </div>

            {/* Location */}
            <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Location
                </span>
              </div>
              <p className="text-sm text-slate-200">
                {capture.latitude && capture.longitude
                  ? formatCoordinates(capture.latitude, capture.longitude)
                  : "Location unavailable"}
              </p>
            </div>

            {/* Incident ID */}
            {capture.incidentId && (
              <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Incident ID
                </span>
                <p className="text-sm text-slate-200 mt-1 font-mono">
                  {capture.incidentId.substring(0, 16)}…
                </p>
              </div>
            )}

            {/* Upload Status */}
            <div className={`rounded-lg border ${statusInfo.bg} bg-opacity-30 p-3 border-opacity-30`}>
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Status
                </span>
              </div>
              <div>
                <p className={`text-sm font-semibold ${statusInfo.color}`}>
                  {statusInfo.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{statusInfo.description}</p>
              </div>
            </div>
          </div>

          {/* ── Analysis Results ──────────────────────────────────── */}
          {hasAnalysis && result ? (
            <div className="flex flex-col gap-4">
              {/* Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-700/40" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  AI Analysis
                </span>
                <div className="flex-1 h-px bg-slate-700/40" />
              </div>

              {/* People & Rescue Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3 text-center">
                  <span className="text-xs text-slate-500">People Detected</span>
                  <p className="text-2xl font-extrabold text-slate-100 mt-1">
                    {result.peopleDetected}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3 text-center">
                  <span className="text-xs text-slate-500">Urgent</span>
                  <p className="text-2xl font-extrabold text-red-300 mt-1">
                    {result.urgentPeople}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3 text-center">
                  <span className="text-xs text-slate-500">Rescue Teams</span>
                  <p className="text-2xl font-extrabold text-slate-100 mt-1">
                    {Math.ceil(result.peopleDetected / 2)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3 text-center">
                  <span className="text-xs text-slate-500">Disaster Type</span>
                  <p className="text-sm font-extrabold text-slate-100 mt-1 leading-tight">
                    {result.disasterType}
                  </p>
                </div>
              </div>

              {/* Severity & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`rounded-lg border-2 p-3 text-center ${getSeverityBg(
                    result.floodSeverity
                  )}`}
                >
                  <span className={`text-xs font-semibold ${getSeverityColor(result.floodSeverity)}`}>
                    FLOOD SEVERITY
                  </span>
                  <p
                    className={`text-2xl font-extrabold mt-1 ${getSeverityColor(
                      result.floodSeverity
                    )}`}
                  >
                    {result.floodSeverity}
                  </p>
                </div>
                <div
                  className={`rounded-lg border-2 p-3 text-center ${getSeverityBg(
                    result.rescuePriority
                  )}`}
                >
                  <span
                    className={`text-xs font-semibold ${getSeverityColor(result.rescuePriority)}`}
                  >
                    RESCUE PRIORITY
                  </span>
                  <p
                    className={`text-2xl font-extrabold mt-1 ${getSeverityColor(
                      result.rescuePriority
                    )}`}
                  >
                    {result.rescuePriority}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Situation Summary</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Water Condition */}
              <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Water Condition</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {result.waterCondition}
                </p>
              </div>

              {/* Hazards */}
              {result.hazards && result.hazards.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-slate-200">Hazards</h3>
                  <div className="flex flex-col gap-2">
                    {result.hazards.map((hazard, idx) => (
                      <HazardCard key={idx} hazard={hazard} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-slate-200">Recommended Actions</h3>
                  <div className="flex flex-col gap-2">
                    {result.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex gap-3 rounded-lg border border-slate-700/40 bg-slate-800/30 p-3"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700/40 shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-slate-400">•</span>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-8 flex flex-col items-center justify-center gap-3 text-center">
              <Loader className="w-6 h-6 text-slate-400 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-slate-200">Analysis pending</p>
                <p className="text-xs text-slate-400 mt-1">
                  Waiting for network connection to analyze this capture.
                </p>
              </div>
            </div>
          )}

          {/* ── Footer Actions ────────────────────────────────────── */}
          <div className="flex gap-3 pt-4 border-t border-slate-700/40">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={onClose}
              className="gap-2"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
