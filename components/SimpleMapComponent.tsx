"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, AlertCircle } from "lucide-react";
import type { OfflineCaptureV2 } from "@/lib/offlineCaptureV2";
import { cn } from "@/lib/utils";

interface SimpleMapComponentProps {
  captures: OfflineCaptureV2[];
  selectedCaptureId?: string;
  onSelectCapture: (captureId: string) => void;
}

/**
 * Simple SVG-based map for displaying offline capture locations.
 * Shows markers for each capture with GPS coordinates.
 * No external map library dependencies.
 */
export default function SimpleMapComponent({
  captures,
  selectedCaptureId,
  onSelectCapture,
}: SimpleMapComponentProps) {
  const [bounds, setBounds] = useState<{
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } | null>(null);

  // Calculate map bounds from captures with GPS data
  useEffect(() => {
    const capturesWithGps = captures.filter(
      (c) => c.latitude !== undefined && c.longitude !== undefined
    );

    if (capturesWithGps.length === 0) {
      setBounds(null);
      return;
    }

    const lats = capturesWithGps.map((c) => c.latitude as number);
    const lngs = capturesWithGps.map((c) => c.longitude as number);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add 10% padding
    const latPadding = (maxLat - minLat) * 0.1 || 0.01;
    const lngPadding = (maxLng - minLng) * 0.1 || 0.01;

    setBounds({
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding,
    });
  }, [captures]);

  const capturesWithGps = captures.filter(
    (c) => c.latitude !== undefined && c.longitude !== undefined
  );

  if (capturesWithGps.length === 0 || !bounds) {
    return (
      <div className="w-full h-64 bg-slate-900/50 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-8 h-8 text-slate-600" />
        <p className="text-sm text-slate-500">No GPS data available for mapping</p>
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 800 400"
      className="w-full h-auto bg-slate-900/50 rounded-lg border border-slate-700/50"
      style={{ minHeight: "300px" }}
    >
      {/* Grid background */}
      <defs>
        <pattern
          id="grid"
          width="80"
          height="80"
          patternUnits="userSpaceOnUse"
        >
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#334155" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="800" height="400" fill="url(#grid)" />

      {/* Capture markers */}
      {capturesWithGps.map((capture) => {
        if (capture.latitude === undefined || capture.longitude === undefined) {
          return null;
        }

        const isSelected = capture.id === selectedCaptureId;

        // Normalize coordinates to SVG space
        const x =
          ((capture.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) *
          800;
        const y =
          ((bounds.maxLat - capture.latitude) / (bounds.maxLat - bounds.minLat)) *
          400;

        return (
          <g key={capture.id}>
            {/* Marker circle with glow */}
            <circle
              cx={x}
              cy={y}
              r={isSelected ? 16 : 12}
              fill={isSelected ? "#818cf8" : "#6366f1"}
              opacity={0.9}
              className="transition-all"
              style={{ filter: "drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))" }}
            />

            {/* Marker ring */}
            <circle
              cx={x}
              cy={y}
              r={isSelected ? 20 : 16}
              fill="none"
              stroke={isSelected ? "#818cf8" : "#6366f1"}
              strokeWidth="2"
              opacity={0.3}
              className="transition-all"
            />

            {/* Pin icon */}
            <text
              x={x}
              y={y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-xs font-bold"
              fill="white"
            >
              📍
            </text>

            {/* Clickable area */}
            <circle
              cx={x}
              cy={y}
              r={24}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={() => onSelectCapture(capture.id)}
            />
          </g>
        );
      })}

      {/* Axes labels */}
      <g>
        {/* Latitude labels (left side) */}
        {[0, 0.5, 1].map((t, i) => {
          const lat = bounds.maxLat - (bounds.maxLat - bounds.minLat) * t;
          const y = 400 * t;
          return (
            <g key={`lat-${i}`}>
              <text
                x="8"
                y={y + 3}
                fontSize="10"
                fill="#94a3b8"
                textAnchor="start"
              >
                {lat.toFixed(2)}°
              </text>
            </g>
          );
        })}

        {/* Longitude labels (bottom) */}
        {[0, 0.5, 1].map((t, i) => {
          const lng = bounds.minLng + (bounds.maxLng - bounds.minLng) * t;
          const x = 800 * t;
          return (
            <g key={`lng-${i}`}>
              <text
                x={x}
                y="395"
                fontSize="10"
                fill="#94a3b8"
                textAnchor="middle"
              >
                {lng.toFixed(2)}°
              </text>
            </g>
          );
        })}
      </g>

      {/* Legend */}
      <g>
        <rect x="10" y="10" width="180" height="80" fill="#1e293b" opacity="0.9" rx="4" />
        <rect
          x="10"
          y="10"
          width="180"
          height="80"
          fill="none"
          stroke="#475569"
          strokeWidth="1"
          rx="4"
        />

        <text x="20" y="30" fontSize="12" fontWeight="bold" fill="#e2e8f0">
          Offline Captures Map
        </text>

        <circle cx="20" cy="50" r="5" fill="#6366f1" />
        <text x="35" y="55" fontSize="11" fill="#cbd5e1">
          Capture location
        </text>

        <circle cx="20" cy="75" r="7" fill="#818cf8" opacity="0.9" />
        <text x="35" y="80" fontSize="11" fill="#cbd5e1">
          Selected
        </text>
      </g>

      {/* Coordinates display for selected marker */}
      {selectedCaptureId && capturesWithGps.find((c) => c.id === selectedCaptureId) && (
        <g>
          <rect
            x="10"
            y="310"
            width="220"
            height="80"
            fill="#1e293b"
            opacity="0.95"
            rx="4"
          />
          <rect
            x="10"
            y="310"
            width="220"
            height="80"
            fill="none"
            stroke="#475569"
            strokeWidth="1"
            rx="4"
          />

          <text x="20" y="330" fontSize="11" fontWeight="bold" fill="#cbd5e1">
            Selected Capture
          </text>

          {capturesWithGps.find((c) => c.id === selectedCaptureId) && (
            <>
              <text x="20" y="350" fontSize="10" fill="#94a3b8">
                Lat:{" "}
                {capturesWithGps
                  .find((c) => c.id === selectedCaptureId)
                  ?.latitude?.toFixed(6)}
                °
              </text>
              <text x="20" y="370" fontSize="10" fill="#94a3b8">
                Lng:{" "}
                {capturesWithGps
                  .find((c) => c.id === selectedCaptureId)
                  ?.longitude?.toFixed(6)}
                °
              </text>
            </>
          )}
        </g>
      )}
    </svg>
  );
}
