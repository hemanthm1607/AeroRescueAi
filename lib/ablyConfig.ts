/**
 * Shared Ably configuration constants.
 * Import from here instead of repeating strings in components.
 */

/** The Ably channel both phone and laptop use. */
export const DRONE_CHANNEL = "aerorescue-drone";

/** Event name for a completed analysis result published by the phone. */
export const EVENT_ANALYSIS = "analysis-result";

/** Event name for phone heartbeat / connection status. */
export const EVENT_HEARTBEAT = "heartbeat";

/** Event name for drone location updates */
export const EVENT_LOCATION = "drone-location";

/** Event name for incident updates */
export const EVENT_INCIDENT_UPDATE = "incident-update";

/** Event name for drone telemetry (battery, GPS, camera status, connection status) */
export const EVENT_TELEMETRY = "drone-telemetry";
