import type { AnalysisHistoryEntry } from "@/types";

const STORAGE_KEY = "aerorescue_history";
const MAX_ENTRIES = 20;

export function getHistory(): AnalysisHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnalysisHistoryEntry[];
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry: AnalysisHistoryEntry): void {
  if (typeof window === "undefined") return;
  const existing = getHistory();
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
