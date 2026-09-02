/**
 * Drone state — in-process store using globalThis.
 *
 * WHY globalThis AND NOT module-level variables?
 * Next.js hot-reloading re-evaluates modules in development, clearing
 * module-level variables. globalThis survives module re-evaluation within
 * the same Node process, so it acts as a true singleton per process.
 *
 * VERCEL BEHAVIOUR:
 * On Vercel, each serverless function invocation may run on a different
 * compute instance. However, Vercel keeps warm instances alive and tends
 * to route rapid sequential requests (phone heartbeat + laptop poll) to the
 * same warm instance in practice.
 *
 * For this single-session, real-time drone use case this is acceptable:
 * - If a cold instance handles a status poll it simply returns disconnected
 *   and the laptop retries in 2 s when the warm instance answers again.
 * - Frames are re-sent on every capture, so a missed delivery self-corrects.
 *
 * NO external services, NO environment variables, NO new dependencies.
 */

/** Shape of the global drone store */
interface DroneStore {
  /** Unix ms timestamp of last heartbeat from the phone, or null */
  lastHeartbeat: number | null;
  /** Latest frame waiting to be picked up by the laptop */
  pendingFrame: { imageBase64: string; mimeType: string; postedAt: number } | null;
}

/** Extend globalThis so TypeScript is happy */
declare global {
  // eslint-disable-next-line no-var
  var __droneStore: DroneStore | undefined;
}

function getStore(): DroneStore {
  if (!globalThis.__droneStore) {
    globalThis.__droneStore = { lastHeartbeat: null, pendingFrame: null };
  }
  return globalThis.__droneStore;
}

/** Phone considered alive if heartbeat arrived within last 10 s */
const HEARTBEAT_TIMEOUT_MS = 10_000;

// ── Public API — all synchronous (no async needed, no network calls) ──────

export function recordHeartbeat(): void {
  const store = getStore();
  const now = Date.now();
  store.lastHeartbeat = now;
  console.log(`[droneState] Heartbeat recorded — ${new Date(now).toISOString()}`);
}

export function isDroneConnected(): boolean {
  const store = getStore();
  if (store.lastHeartbeat === null) {
    console.log("[droneState] isDroneConnected: no heartbeat → disconnected");
    return false;
  }
  const age = Date.now() - store.lastHeartbeat;
  const connected = age < HEARTBEAT_TIMEOUT_MS;
  console.log(`[droneState] isDroneConnected: heartbeat ${age}ms ago → ${connected ? "CONNECTED" : "DISCONNECTED"}`);
  return connected;
}

export function postFrame(imageBase64: string, mimeType: string): void {
  const store = getStore();
  const now = Date.now();
  store.lastHeartbeat = now; // Posting a frame also counts as a heartbeat
  store.pendingFrame = { imageBase64, mimeType, postedAt: now };
  console.log(`[droneState] Frame stored — mimeType=${mimeType} base64Length=${imageBase64.length}`);
}

/** Consume and clear the pending frame (deliver once to the laptop). */
export function consumeFrame(): { imageBase64: string; mimeType: string } | null {
  const store = getStore();
  const frame = store.pendingFrame;
  if (!frame) {
    console.log("[droneState] consumeFrame: no pending frame");
    return null;
  }
  store.pendingFrame = null;
  console.log(`[droneState] consumeFrame: delivered — mimeType=${frame.mimeType} base64Length=${frame.imageBase64.length}`);
  return { imageBase64: frame.imageBase64, mimeType: frame.mimeType };
}

/** Peek at the pending frame without consuming it. */
export function peekFrame(): { imageBase64: string; mimeType: string; postedAt: number } | null {
  return getStore().pendingFrame;
}
