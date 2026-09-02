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
