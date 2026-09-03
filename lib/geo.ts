/**
 * Geolocation utilities for GPS incident tracking
 * Handles browser geolocation API, coordinate formatting, and distance calculations
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

/**
 * Request GPS location from the browser using the Geolocation API
 * Returns null if unavailable, denied, or on timeout
 * Gracefully falls back if geolocation is not available
 */
export async function requestGeoLocation(
  timeoutMs: number = 5000
): Promise<GeoLocation | null> {
  // Check if geolocation API is available
  if (!navigator.geolocation) {
    console.log("Geolocation API not available in this browser");
    return null;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(null);
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        console.log("Geolocation error:", error.message);
        resolve(null); // Graceful fallback
      },
      {
        enableHighAccuracy: false,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Format coordinates as a readable string
 * e.g., "40.7128°N, 74.0060°W"
 */
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

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Reverse geocoding stub (placeholder for future integration)
 * In a real implementation, this would call an API to get location name
 * For now, returns null to indicate this feature requires backend integration
 */
export async function getLocationName(
  _latitude: number,
  _longitude: number
): Promise<string | null> {
  // Stub: Real implementation would call an API like Open Street Map
  // Returns null gracefully - locationName is optional
  return null;
}
