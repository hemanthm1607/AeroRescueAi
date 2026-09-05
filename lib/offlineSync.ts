/**
 * Offline detection and sync management.
 * Handles online/offline state, automatic sync triggering, and sync coordination.
 */

import {
  getPendingCapturesByStatus,
  updatePendingCaptureStatus,
  deletePendingCapture,
  getPendingCaptureById,
} from "@/lib/offlineStorage";
import type { PendingCapture } from "@/lib/offlineStorage";

type OfflineState = "online" | "offline";
type SyncState = "idle" | "syncing";

interface OfflineSyncState {
  offlineState: OfflineState;
  syncState: SyncState;
  pendingCount: number;
  lastSyncAt: string | null;
  syncError: string | null;
}

interface OfflineSyncCallbacks {
  onStateChange?: (state: OfflineSyncState) => void;
  onSyncProgress?: (current: number, total: number) => void;
  onSyncComplete?: () => void;
  onSyncError?: (error: string) => void;
}

/**
 * Register the analyze callback for syncing offline captures.
 * Call this from DronePage once it's ready to handle sync requests.
 */
let registeredAnalyzeCallback: ((
  base64: string,
  mimeType: string,
  previewUrl: string,
  latitude?: number,
  longitude?: number,
  pendingId?: string
) => Promise<void>) | null = null;

export function registerAnalyzeCallback(
  callback: (
    base64: string,
    mimeType: string,
    previewUrl: string,
    latitude?: number,
    longitude?: number,
    pendingId?: string
  ) => Promise<void>
) {
  registeredAnalyzeCallback = callback;
  console.log("[offlineSync] Analyze callback registered");
}

/**
 * Get the registered analyze callback.
 */
function getAnalyzeCallback(): ((
  base64: string,
  mimeType: string,
  previewUrl: string,
  latitude?: number,
  longitude?: number,
  pendingId?: string
) => Promise<void>) | undefined {
  return registeredAnalyzeCallback || undefined;
}

let currentState: OfflineSyncState = {
  offlineState: typeof navigator !== "undefined" ? (navigator.onLine ? "online" : "offline") : "online",
  syncState: "idle",
  pendingCount: 0,
  lastSyncAt: null,
  syncError: null,
};

let callbacks: OfflineSyncCallbacks = {};
let syncInProgressRef = { value: false };
let stateChangeListeners: Array<(state: OfflineSyncState) => void> = [];

/**
 * Get current offline/sync state.
 */
export function getOfflineSyncState(): OfflineSyncState {
  return { ...currentState };
}

/**
 * Subscribe to state changes.
 */
export function subscribeToStateChanges(
  listener: (state: OfflineSyncState) => void
): () => void {
  stateChangeListeners.push(listener);
  // Return unsubscribe function
  return () => {
    stateChangeListeners = stateChangeListeners.filter((l) => l !== listener);
  };
}

/**
 * Update state and notify listeners.
 */
function updateState(partial: Partial<OfflineSyncState>) {
  currentState = { ...currentState, ...partial };
  stateChangeListeners.forEach((listener) => listener(currentState));
  callbacks.onStateChange?.(currentState);
}

/**
 * Initialize offline sync system.
 * Sets up online/offline event listeners and periodic sync attempts.
 */
export function initializeOfflineSync(cb?: OfflineSyncCallbacks) {
  if (cb) {
    callbacks = { ...callbacks, ...cb };
  }

  if (typeof window === "undefined") {
    return;
  }

  // Sync when browser comes online
  const handleOnline = async () => {
    console.log("[offlineSync] Browser came online");
    updateState({ offlineState: "online", syncError: null });
    await syncPendingCapturesIfNeeded();
  };

  // Mark offline when connection lost
  const handleOffline = () => {
    console.log("[offlineSync] Browser went offline");
    updateState({ offlineState: "offline" });
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Periodic sync check every 30 seconds when online
  const syncCheckInterval = setInterval(async () => {
    if (currentState.offlineState === "online" && currentState.syncState === "idle") {
      await syncPendingCapturesIfNeeded();
    }
  }, 30_000);

  // Cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    clearInterval(syncCheckInterval);
  };
}

/**
 * Update pending count from storage.
 * Counts "pending", "failed", and "syncing" captures for sync eligibility.
 */
export async function updatePendingCount() {
  try {
    const pending = await getPendingCapturesByStatus("pending");
    const failed = await getPendingCapturesByStatus("failed");
    const syncing = await getPendingCapturesByStatus("syncing");
    const totalCount = pending.length + failed.length + syncing.length;
    updateState({ pendingCount: totalCount });
  } catch (err) {
    console.error("[offlineSync] Failed to update pending count:", err);
  }
}

/**
 * Only attempt sync if online, not already syncing, and there are pending items.
 */
export async function syncPendingCapturesIfNeeded() {
  if (
    currentState.offlineState === "offline" ||
    currentState.syncState === "syncing" ||
    currentState.pendingCount === 0
  ) {
    return;
  }

  const callback = getAnalyzeCallback();
  await syncPendingCaptures(callback);
}

/**
 * Synchronize all pending and failed captures.
 * Processes them one by one. Prevents concurrent sync attempts.
 * Failed captures are retried on subsequent sync attempts.
 */
export async function syncPendingCaptures(
  analyzeCallback?: (
    base64: string,
    mimeType: string,
    previewUrl: string,
    latitude?: number,
    longitude?: number,
    pendingId?: string
  ) => Promise<void>
): Promise<void> {
  // Prevent concurrent syncs
  if (syncInProgressRef.value) {
    console.log("[offlineSync] Sync already in progress, skipping");
    return;
  }

  if (currentState.offlineState === "offline") {
    console.log("[offlineSync] Offline, cannot sync");
    return;
  }

  // Do not process if callback is not registered - captures remain pending for retry
  if (!analyzeCallback) {
    console.log("[offlineSync] Analyze callback not registered, deferring sync");
    return;
  }

  syncInProgressRef.value = true;
  updateState({ syncState: "syncing", syncError: null });

  try {
    // Fetch pending, failed, and syncing captures for retry
    const pendingCaptures = await getPendingCapturesByStatus("pending");
    const failedCaptures = await getPendingCapturesByStatus("failed");
    const syncingCaptures = await getPendingCapturesByStatus("syncing");
    const allToSync = [...pendingCaptures, ...failedCaptures, ...syncingCaptures];

    if (allToSync.length === 0) {
      console.log("[offlineSync] No captures to sync");
      updateState({ syncState: "idle", pendingCount: 0 });
      callbacks.onSyncComplete?.();
      syncInProgressRef.value = false;
      return;
    }

    console.log(`[offlineSync] Starting sync of ${allToSync.length} captures (${pendingCaptures.length} pending, ${failedCaptures.length} failed, ${syncingCaptures.length} syncing)`);

    let successCount = 0;
    for (let i = 0; i < allToSync.length; i++) {
      const capture = allToSync[i];
      callbacks.onSyncProgress?.(i + 1, allToSync.length);

      try {
        // Mark as syncing
        await updatePendingCaptureStatus(capture.id, "syncing");

        try {
          // Use registered callback (from DronePage context)
          // This includes /api/analyze call and Ably publish
          await analyzeCallback(
            capture.imageData,
            capture.mimeType,
            capture.imageData,
            capture.latitude,
            capture.longitude,
            capture.id
          );
          // If callback succeeds, mark as completed and delete
          await updatePendingCaptureStatus(capture.id, "completed");
          await deletePendingCapture(capture.id);
          successCount++;
          console.log(`[offlineSync] Successfully synced capture ${capture.id}`);
        } catch (callbackErr) {
          // Callback failed - restore to failed status so it can be retried
          const errorMsg = callbackErr instanceof Error ? callbackErr.message : "Unknown error";
          console.error(`[offlineSync] Callback failed for ${capture.id}:`, errorMsg);

          const newRetryCount = (capture.retryCount || 0) + 1;
          await updatePendingCaptureStatus(capture.id, "failed", newRetryCount);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[offlineSync] Failed to process capture ${capture.id}:`, errorMsg);

        // Mark as failed with incremented retry count
        const newRetryCount = (capture.retryCount || 0) + 1;
        try {
          await updatePendingCaptureStatus(capture.id, "failed", newRetryCount);
        } catch (updateErr) {
          console.error("[offlineSync] Failed to update status to failed:", updateErr);
        }

        // Continue with next capture instead of failing entire sync
      }
    }

    // Update state
    await updatePendingCount();
    updateState({
      syncState: "idle",
      lastSyncAt: new Date().toISOString(),
      syncError: successCount === allToSync.length ? null : `Synced ${successCount}/${allToSync.length}`,
    });

    if (successCount === allToSync.length) {
      console.log("[offlineSync] Sync completed successfully");
      callbacks.onSyncComplete?.();
    } else {
      const error = `Synced ${successCount}/${allToSync.length} captures`;
      console.warn(`[offlineSync] ${error}`);
      callbacks.onSyncError?.(error);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[offlineSync] Sync failed:", errorMsg);
    updateState({
      syncState: "idle",
      syncError: errorMsg,
    });
    callbacks.onSyncError?.(errorMsg);
  } finally {
    syncInProgressRef.value = false;
  }
}

/**
 * Manually trigger a sync attempt.
 */
export async function triggerSync(): Promise<void> {
  const callback = getAnalyzeCallback();
  await syncPendingCaptures(callback);
}

/**
 * Store a pending capture for later sync.
 */
export async function storePendingCapture(
  id: string,
  imageData: string,
  mimeType: string,
  latitude?: number,
  longitude?: number
): Promise<void> {
  const { savePendingCapture } = await import("@/lib/offlineStorage");

  const capture: PendingCapture = {
    id,
    imageData,
    mimeType,
    captureTimestamp: new Date().toISOString(),
    latitude,
    longitude,
    uploadStatus: "pending",
    retryCount: 0,
  };

  await savePendingCapture(capture);
  await updatePendingCount();
}
