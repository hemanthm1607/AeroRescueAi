"use client";

import {
  Droplets,
  ShieldCheck,
  TriangleAlert,
  ChevronDown,
  ChevronUp,
  ScanSearch,
} from "lucide-react";
import { useState } from "react";
import type { AnalysisResult as AnalysisResultType } from "@/types";
import { getSeverityBg, getSeverityColor, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, SeverityDot } from "@/components/ui/Badge";
import HazardCard from "@/components/HazardCard";
import RescuePriority from "@/components/RescuePriority";
import { Divider } from "@/components/ui/Divider";

interface AnalysisResultProps {
  result: AnalysisResultType;
  previewUrl: string;
  inputMode: "upload" | "drone";
  timestamp: string;
}

export default function AnalysisResult({
  result,
  previewUrl,
  inputMode,
  timestamp,
}: AnalysisResultProps) {
  const [hazardsExpanded, setHazardsExpanded] = useState(true);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Section header */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30">
          <ScanSearch className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">AI Analysis Complete</h2>
          <p className="text-xs text-slate-500">
            {inputMode === "drone" ? "Drone frame" : "Uploaded image"} · {timestamp}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant="severity" severity={result.rescuePriority} pulse={result.rescuePriority === "CRITICAL"}>
            <SeverityDot severity={result.rescuePriority} size="sm" />
            {result.rescuePriority}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Scene preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Analyzed Scene
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Analyzed flood scene"
                className="w-full max-h-60 object-cover rounded-b-xl"
              />
            </CardContent>
          </Card>

          {/* Flood conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-400" />
                Flood Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Flood severity */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Flood Severity</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border",
                      getSeverityBg(result.floodSeverity)
                    )}
                  >
                    <SeverityDot severity={result.floodSeverity} size="sm" />
                    {result.floodSeverity}
                  </span>
                </div>
                {/* Severity bar */}
                <SeverityBar severity={result.floodSeverity} />
              </div>

              <Divider />

              {/* Water condition */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1.5">
                  Water Condition
                </p>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {result.waterCondition}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Rescue Priority */}
          <Card glow={result.rescuePriority === "CRITICAL"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TriangleAlert className={cn("w-4 h-4", getSeverityColor(result.rescuePriority))} />
                Rescue Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RescuePriority
                priority={result.rescuePriority}
                peopleDetected={result.peopleDetected}
                urgentPeople={result.urgentPeople}
                recommendations={result.recommendations}
                summary={result.summary}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hazards — full width */}
      {result.hazards.length > 0 && (
        <Card>
          <CardHeader>
            <button
              onClick={() => setHazardsExpanded((v) => !v)}
              className="w-full flex items-center justify-between text-left group"
              aria-expanded={hazardsExpanded}
            >
              <CardTitle className="flex items-center gap-2">
                <TriangleAlert className="w-4 h-4 text-orange-400" />
                Hazards Detected
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/30 text-xs font-bold text-orange-300">
                  {result.hazards.length}
                </span>
              </CardTitle>
              <span className="text-slate-400 group-hover:text-slate-200 transition-colors">
                {hazardsExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </span>
            </button>
          </CardHeader>

          {hazardsExpanded && (
            <CardContent className="flex flex-col gap-3">
              {result.hazards.map((hazard, i) => (
                <HazardCard key={i} hazard={hazard} index={i} />
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {result.hazards.length === 0 && (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-sm text-slate-300">
              No additional hazards identified in this scene.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SeverityBar({ severity }: { severity: string }) {
  const levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const activeIndex = levels.indexOf(severity);

  const segmentColors = [
    "bg-green-500",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-red-500",
  ];

  return (
    <div className="flex gap-1 h-2" role="meter" aria-label={`Flood severity: ${severity}`}>
      {levels.map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-full transition-all",
            i <= activeIndex ? segmentColors[i] : "bg-slate-700"
          )}
        />
      ))}
    </div>
  );
}
