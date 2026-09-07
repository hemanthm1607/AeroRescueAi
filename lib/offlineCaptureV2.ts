/**
 * Offline Capture Storage V2
 *
 * A clean, minimal IndexedDB utility for storing offline captures on the phone.
 * Database: AeroRescueOfflineV2
 * Object Store: captures
 *
 * Each record contains:
 * {
 *   id: string (UUID),
 *   imageDataUrl: string,
 *   capturedAt: string (ISO timestamp),
 *   status: "pending" | "sending" | "sent",
 *   latitude?: number (optional GPS latitude),
 *   longitude?: number (optional GPS longitude),
 *   analysisResult?: AnalysisResult (optional AI analysis data)
 * }
 *
 * No automatic syncing, no service worker, no background retry.
 * Manual send only when user presses SEND PENDING button.
 */

import type { AnalysisResult } from "@/types";

const DB_NAME = "AeroRescueOfflineV2";
const DB_VERSION = 2;
const STORE_NAME = "captures";

export interface OfflineCaptureV2 {
  id: string;
  imageDataUrl: string;
  capturedAt: string;
  status: "pending" | "sending" | "sent";
  capturedWhileOffline: boolean;
  latitude?: number;
  longitude?: number;
  analysisResult?: AnalysisResult;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database.
 */
async function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
      }
    };
  });
}

/**
 * Generate a unique ID for a capture.
 */
function generateCaptureId(): string {
  return `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save a captured frame to IndexedDB.
 * Returns the capture ID.
 */
export async function saveOfflineCapture(imageDataUrl: string, capturedWhileOffline: boolean = true): Promise<string> {
  console.log("[OFFLINE-FLOW-5] INDEXEDDB SAVE START");
  console.log("[OFFLINE-FLOW-5] imageDataUrl length:", imageDataUrl?.length || 0);
  
  if (!imageDataUrl || imageDataUrl.length < 1000) {
    const errorMsg = `Invalid image data: size = ${imageDataUrl?.length || 0} bytes (minimum 1000 required)`;
    console.error("[OFFLINE-FLOW-5] Validation failed:", errorMsg);
    throw new Error(errorMsg);
  }

  console.log("[OFFLINE-FLOW-5] Image validation passed, opening DB...");
  const db = await initDb();
  const id = generateCaptureId();

  const capture: OfflineCaptureV2 = {
    id,
    imageDataUrl,
    capturedAt: new Date().toISOString(),
    status: "pending",
    capturedWhileOffline,
  };

  console.log("[OFFLINE-FLOW-5] Created capture record, ID:", id);

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_NAME], "readwrite");
      console.log("[OFFLINE-FLOW-5] Transaction started");
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(capture);

      request.onerror = () => {
        const errorMsg = `Failed to save capture: ${request.error?.message}`;
        console.error("[OFFLINE-FLOW-5] Request error:", errorMsg);
        reject(new Error(errorMsg));
      };

      request.onsuccess = () => {
        console.log("[OFFLINE-FLOW-6] IndexedDB save SUCCESS, ID:", id);
        resolve(id);
      };

      tx.onerror = () => {
        const errorMsg = `Transaction failed: ${tx.error?.message}`;
        console.error("[OFFLINE-FLOW-5] Transaction error:", errorMsg);
        reject(new Error(errorMsg));
      };

      tx.oncomplete = () => {
        console.log("[OFFLINE-FLOW-7] STORED CAPTURE ID:", id);
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error during save";
      console.error("[OFFLINE-FLOW-5] Exception:", errorMsg);
      reject(err instanceof Error ? err : new Error(errorMsg));
    }
  });
}

/**
 * Get all pending captures from IndexedDB.
 */
export async function getPendingCaptures(): Promise<OfflineCaptureV2[]> {
  try {
    const db = await initDb();

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([STORE_NAME], "readonly");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("status");
        const request = index.getAll("pending");

        request.onerror = () => {
          reject(new Error(`Failed to get pending captures: ${request.error?.message}`));
        };

        request.onsuccess = () => {
          const result = request.result as OfflineCaptureV2[];
          resolve(result);
        };

        tx.onerror = () => {
          reject(new Error(`Transaction failed: ${tx.error?.message}`));
        };
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Unknown error during read"));
      }
    });
  } catch (err) {
    console.error("Error reading pending captures:", err);
    return [];
  }
}

/**
 * Get count of pending captures.
 */
export async function getPendingCount(): Promise<number> {
  try {
    console.log("[DEBUG-F] getPendingCount called");
    const captures = await getPendingCaptures();
    const count = captures.length;
    console.log("[DEBUG-F] getPendingCount result:", count);
    return count;
  } catch (err) {
    console.error("[DEBUG-F] getPendingCount error:", err);
    return 0;
  }
}

/**
 * Get a specific capture by ID.
 */
export async function getCapture(captureId: string): Promise<OfflineCaptureV2 | null> {
  try {
    const db = await initDb();

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([STORE_NAME], "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(captureId);

        request.onerror = () => {
          reject(new Error(`Failed to get capture: ${request.error?.message}`));
        };

        request.onsuccess = () => {
          resolve((request.result as OfflineCaptureV2) || null);
        };

        tx.onerror = () => {
          reject(new Error(`Transaction failed: ${tx.error?.message}`));
        };
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Unknown error during read"));
      }
    });
  } catch (err) {
    console.error("Error getting capture:", err);
    return null;
  }
}

/**
 * Update a capture's status.
 */
export async function updateCaptureStatus(
  captureId: string,
  status: "pending" | "sending" | "sent"
): Promise<void> {
  const db = await initDb();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(captureId);

      getRequest.onsuccess = () => {
        const capture = getRequest.result as OfflineCaptureV2 | undefined;
        if (!capture) {
          reject(new Error(`Capture not found: ${captureId}`));
          return;
        }

        capture.status = status;
        const updateRequest = store.put(capture);

        updateRequest.onerror = () => {
          reject(new Error(`Failed to update capture: ${updateRequest.error?.message}`));
        };

        updateRequest.onsuccess = () => {
          resolve();
        };
      };

      getRequest.onerror = () => {
        reject(new Error(`Failed to get capture for update: ${getRequest.error?.message}`));
      };

      tx.onerror = () => {
        reject(new Error(`Transaction failed: ${tx.error?.message}`));
      };
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Unknown error during update"));
    }
  });
}

/**
 * Delete a capture from IndexedDB.
 */
export async function deleteCapture(captureId: string): Promise<void> {
  const db = await initDb();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(captureId);

      request.onerror = () => {
        reject(new Error(`Failed to delete capture: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(new Error(`Transaction failed: ${tx.error?.message}`));
      };
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Unknown error during delete"));
    }
  });
}

/**
 * Get all captures (pending, sending, and sent) from IndexedDB.
 * Used for displaying the Offline Uploads page.
 */
export async function getAllCaptures(): Promise<OfflineCaptureV2[]> {
  try {
    const db = await initDb();

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([STORE_NAME], "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => {
          reject(new Error(`Failed to get all captures: ${request.error?.message}`));
        };

        request.onsuccess = () => {
          const result = request.result as OfflineCaptureV2[];
          resolve(result);
        };

        tx.onerror = () => {
          reject(new Error(`Transaction failed: ${tx.error?.message}`));
        };
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Unknown error during read"));
      }
    });
  } catch (err) {
    console.error("Error reading all captures:", err);
    return [];
  }
}

/**
 * Update a capture with analysis result and GPS data.
 * Called after successful Gemini analysis and Ably publishing.
 */
export async function updateCaptureWithAnalysis(
  captureId: string,
  analysisResult: AnalysisResult,
  latitude?: number,
  longitude?: number
): Promise<void> {
  const db = await initDb();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(captureId);

      getRequest.onsuccess = () => {
        const capture = getRequest.result as OfflineCaptureV2 | undefined;
        if (!capture) {
          reject(new Error(`Capture not found: ${captureId}`));
          return;
        }

        capture.analysisResult = analysisResult;
        if (latitude !== undefined) {
          capture.latitude = latitude;
        }
        if (longitude !== undefined) {
          capture.longitude = longitude;
        }

        const updateRequest = store.put(capture);

        updateRequest.onerror = () => {
          reject(new Error(`Failed to update capture: ${updateRequest.error?.message}`));
        };

        updateRequest.onsuccess = () => {
          resolve();
        };
      };

      getRequest.onerror = () => {
        reject(new Error(`Failed to get capture for update: ${getRequest.error?.message}`));
      };

      tx.onerror = () => {
        reject(new Error(`Transaction failed: ${tx.error?.message}`));
      };
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Unknown error during update"));
    }
  });
}

/**
 * Process all pending offline captures and send them when online
 * This is called automatically when the device comes back online
 */
export async function processPendingCapturesAuto(
  onProgress?: (sent: number, total: number) => void,
  onAnalyzeCapture?: (captureId: string) => Promise<{ imageDataUrl: string; mimeType: string; base64: string }>,
  onPublishToAbly?: (payload: any) => Promise<void>,
  onError?: (captureId: string, error: string) => void
): Promise<{ successCount: number; totalCount: number; failedIds: string[] }> {
  console.log("[OFFLINE-AUTO-SYNC] Starting automatic sync of pending captures");
  
  try {
    const captures = await getPendingCaptures();
    const totalCount = captures.length;
    
    if (totalCount === 0) {
      console.log("[OFFLINE-AUTO-SYNC] No pending captures found");
      return { successCount: 0, totalCount: 0, failedIds: [] };
    }
    
    console.log(`[OFFLINE-AUTO-SYNC] Pending captures found: ${totalCount}`);
    onProgress?.(0, totalCount);
    
    let successCount = 0;
    const failedIds: string[] = [];
    
    // Process each capture one at a time
    for (let i = 0; i < captures.length; i++) {
      const capture = captures[i];
      
      try {
        console.log(`[OFFLINE-AUTO-SYNC] Processing capture: ${capture.id}`);
        
        // Mark as sending
        await updateCaptureStatus(capture.id, "sending");
        
        // Get image and mime type
        const { base64, mimeType } = {
          base64: capture.imageDataUrl.split(",")[1] || capture.imageDataUrl,
          mimeType: (capture.imageDataUrl.match(/data:([^;]+);/) || [, "image/jpeg"])[1],
        };
        
        // Send to analyze endpoint
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType,
          }),
        });
        
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error ?? "Analysis failed");
        }
        
        const result = data.result as AnalysisResult;
        console.log("[OFFLINE-AUTO-SYNC] Analysis complete");
        
        // Publish to Ably if callback provided
        if (onPublishToAbly) {
          const payload = {
            result,
            previewDataUrl: capture.imageDataUrl,
            capturedAt: capture.capturedAt,
            latitude: capture.latitude,
            longitude: capture.longitude,
          };
          await onPublishToAbly(payload);
          console.log("[OFFLINE-AUTO-SYNC] Published to Ably");
        }
        
        // Update capture with analysis result and mark as sent
        await updateCaptureWithAnalysis(
          capture.id,
          result,
          capture.latitude,
          capture.longitude
        );
        await updateCaptureStatus(capture.id, "sent");
        console.log("[OFFLINE-AUTO-SYNC] Capture marked sent");
        
        successCount++;
        onProgress?.(successCount, totalCount);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[OFFLINE-AUTO-SYNC] Failed to process ${capture.id}: ${msg}`);
        failedIds.push(capture.id);
        
        // Mark as pending again so it can be retried
        try {
          await updateCaptureStatus(capture.id, "pending");
        } catch (e) {
          console.error(`[OFFLINE-AUTO-SYNC] Failed to revert status for ${capture.id}`);
        }
        
        onError?.(capture.id, msg);
      }
    }
    
    console.log(`[OFFLINE-AUTO-SYNC] Complete: ${successCount}/${totalCount} sent`);
    return { successCount, totalCount, failedIds };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[OFFLINE-AUTO-SYNC] Error in auto-sync:", msg);
    return { successCount: 0, totalCount: 0, failedIds: [] };
  }
}


