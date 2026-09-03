import type { DroneLocationUpdate } from "@/types";

const DRONE_LOCATION_KEY = "aerorescue_drone_location";

/**
 * Drone location tracking for live GPS updates
 */

export function getCurrentDroneLocation(): DroneLocationUpdate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRONE_LOCATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DroneLocationUpdate;
  } catch {
    return null;
  }
}

export function updateDroneLocation(location: DroneLocationUpdate): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRONE_LOCATION_KEY, JSON.stringify(location));
  } catch (err) {
    console.error("Failed to save drone location:", err);
  }
}

export function clearDroneLocation(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRONE_LOCATION_KEY);
}

/**
 * Check if drone location is recent (within last 30 seconds)
 */
export function isDroneLocationRecent(): boolean {
  const location = getCurrentDroneLocation();
  if (!location) return false;
  
  const now = Date.now();
  const locationTime = new Date(location.timestamp).getTime();
  const ageMs = now - locationTime;
  
  return ageMs < 30000; // 30 seconds
}