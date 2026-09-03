import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SeverityLevel } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case "CRITICAL":
      return "text-red-400";
    case "HIGH":
      return "text-orange-400";
    case "MEDIUM":
      return "text-yellow-400";
    case "LOW":
      return "text-green-400";
    default:
      return "text-gray-400";
  }
}

export function getSeverityBg(severity: SeverityLevel): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500/20 border-red-500/40 text-red-300";
    case "HIGH":
      return "bg-orange-500/20 border-orange-500/40 text-orange-300";
    case "MEDIUM":
      return "bg-yellow-500/20 border-yellow-500/40 text-yellow-300";
    case "LOW":
      return "bg-green-500/20 border-green-500/40 text-green-300";
    default:
      return "bg-gray-500/20 border-gray-500/40 text-gray-300";
  }
}

export function getSeverityRing(severity: SeverityLevel): string {
  switch (severity) {
    case "CRITICAL":
      return "ring-red-500";
    case "HIGH":
      return "ring-orange-500";
    case "MEDIUM":
      return "ring-yellow-500";
    case "LOW":
      return "ring-green-500";
    default:
      return "ring-gray-500";
  }
}

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateIncidentId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AR-${dateStr}-${randomStr}`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix: "data:<mime>;base64,"
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(",")[1] ?? "";
}

export function getMimeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : "image/jpeg";
}

export function validateImageFile(file: File): string | null {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return "Please upload a valid image file (JPEG, PNG, WEBP, or GIF).";
  }
  const maxMb = 10;
  if (file.size > maxMb * 1024 * 1024) {
    return `Image size must be under ${maxMb}MB.`;
  }
  return null;
}

export function formatCoordinates(
  latitude: number,
  longitude: number
): string {
  const latDir = latitude >= 0 ? "N" : "S";
  const lonDir = longitude >= 0 ? "E" : "W";

  const latAbs = Math.abs(latitude).toFixed(4);
  const lonAbs = Math.abs(longitude).toFixed(4);

  return `${latAbs}°${latDir}, ${lonAbs}°${lonDir}`;
}
