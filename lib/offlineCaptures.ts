/**
 * IndexedDB utility for storing offline captures on the phone.
 * Each capture stores: imageBase64, timestamp, GPS location (if available), and pending status.
 */

export interface OfflineCapture {
  id: string; // unique capture ID
  imageBase64: string;
  mimeType: string;
  capturedAt: string; // ISO timestamp
  latitude: number | null;
  longitude: number | null;
  status: "pending" | "sent";
}

const DB_NAME = "AeroRescueAiOffline";
const DB_VERSION = 1;
const STORE_NAME = "captures";

let dbInstance: IDBDatabase | null = null;

/**
 * Validate that base64 image data is valid and contains actual image content.
 */
function validateImageBase64(base64: string, mimeType: string): { valid: boolean; reason?: string } {
  if (!base64 || typeof base64 !== "string") {
    return { valid: false, reason: "base64 is empty or not a string" };
  }

  if (base64.length < 100) {
    return { valid: false, reason: `base64 too short: ${base64.length} bytes` };
  }

  // Check if it looks like valid base64
  const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
  if (!base64Pattern.test(base64)) {
    return { valid: false, reason: "base64 contains invalid characters" };
  }

  // For data URLs, check for common image patterns
  if (mimeType && !mimeType.startsWith("image/")) {
    return { valid: false, reason: `invalid MIME type: ${mimeType}` };
  }

  return { valid: true };
}

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
      console.error("[OFFLINE] IndexedDB ERROR: DB open failed -", request.error);
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log("[OFFLINE] IndexedDB initialized");
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        console.log("[OFFLINE] IndexedDB object store created");
      }
    };
  });
}

/**
 * Save a captured frame to IndexedDB with offline status.
 * Returns the capture ID on success, throws on failure.
 */
export async function saveOfflineCapture(
  imageBase64: string,
  mimeType: string,
  latitude: number | null,
  longitude: number | null
): Promise<string> {
  // Validate image data before saving
  const validation = validateImageBase64(imageBase64, mimeType);
  if (!validation.valid) {
    const reason = validation.reason || "unknown";
    console.error("[OFFLINE] IndexedDB ERROR: Invalid image data -", reason);
    throw new Error(`Invalid image data: ${reason}`);
  }

  console.log(`[OFFLINE] Saving capture to IndexedDB (${imageBase64.length} bytes, ${mimeType})`);

  const db = await initDb();
  const id = `capture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const capture: OfflineCapture = {
    id,
    imageBase64,
    mimeType,
    capturedAt: new Date().toISOString(),
    latitude,
    longitude,
    status: "pending",
  };

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(capture);

      request.onerror = () => {
        console.error("[OFFLINE] IndexedDB ERROR: Save failed -", request.error);
        reject(new Error("Failed to save capture to IndexedDB"));
      };

      request.onsuccess = () => {
        console.log(`[OFFLINE] Capture saved successfully: ${id}`);
        resolve(id);
      };

      tx.onerror = () => {
        console.error("[OFFLINE] IndexedDB ERROR: Transaction failed -", tx.error);
        reject(new Error("Transaction failed"));
      };
    } catch (err) {
      console.error("[OFFLINE] IndexedDB ERROR: Unexpected error -", err);
      reject(err instanceof Error ? err : new Error("Unknown error"));
    }
  });
}

/**
 * Get all pending captures from IndexedDB.
 */
export async function getPendingCaptures(): Promise<OfflineCapture[]> {
  console.log("[OFFLINE] Reading pending captures from IndexedDB");

  try {
    const db = await initDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("status");
      const request = index.getAll("pending");

      request.onerror = () => {
        console.error("[OFFLINE] IndexedDB ERROR: Get pending failed -", request.error);
        reject(new Error("Failed to get pending captures"));
      };

      request.onsuccess = () => {
        const result = request.result as OfflineCapture[];
        console.log(`[OFFLINE] Found ${result.length} pending captures`);
        resolve(result);
      };

      tx.onerror = () => {
        console.error("[OFFLINE] IndexedDB ERROR: Transaction failed -", tx.error);
        reject(new Error("Transaction failed"));
      };
    });
  } catch (err) {
    console.error("[OFFLINE] IndexedDB ERROR: Failed to read pending captures -", err);
    return [];
  }
}

/**
 * Mark a capture as sent.
 */
export async function markCaptureSent(captureId: string): Promise<void> {
  console.log(`[OFFLINE] Marking capture as sent: ${captureId}`);

  const db = await initDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(captureId);

    request.onerror = () => {
      console.error("[OFFLINE] IndexedDB ERROR: Mark sent failed -", request.error);
      reject(new Error("Failed to mark capture as sent"));
    };

    request.onsuccess = () => {
      const capture = request.result as OfflineCapture;
      if (capture) {
        capture.status = "sent";
        const updateRequest = store.put(capture);

        updateRequest.onerror = () => {
          console.error("[OFFLINE] IndexedDB ERROR: Update failed -", updateRequest.error);
          reject(new Error("Failed to update capture status"));
        };

        updateRequest.onsuccess = () => {
          console.log(`[OFFLINE] Capture marked as sent: ${captureId}`);
          resolve();
        };
      } else {
        console.error(`[OFFLINE] IndexedDB ERROR: Capture not found: ${captureId}`);
        reject(new Error("Capture not found"));
      }
    };

    tx.onerror = () => {
      console.error("[OFFLINE] IndexedDB ERROR: Transaction failed -", tx.error);
      reject(new Error("Transaction failed"));
    };
  });
}

/**
 * Delete a capture from IndexedDB (after successful send and cleanup).
 */
export async function deleteCapture(captureId: string): Promise<void> {
  console.log(`[OFFLINE] Deleting capture: ${captureId}`);

  const db = await initDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(captureId);

    request.onerror = () => {
      console.error("[OFFLINE] IndexedDB ERROR: Delete failed -", request.error);
      reject(new Error("Failed to delete capture"));
    };

    request.onsuccess = () => {
      console.log(`[OFFLINE] Capture deleted: ${captureId}`);
      resolve();
    };

    tx.onerror = () => {
      console.error("[OFFLINE] IndexedDB ERROR: Transaction failed -", tx.error);
      reject(new Error("Transaction failed"));
    };
  });
}

/**
 * Get count of pending captures.
 */
export async function getPendingCaptureCount(): Promise<number> {
  try {
    const captures = await getPendingCaptures();
    console.log(`[OFFLINE] Pending count: ${captures.length}`);
    return captures.length;
  } catch (err) {
    console.error("[OFFLINE] Failed to get pending count:", err);
    return 0;
  }
}

/**
 * Clear all captures from IndexedDB (for testing/reset).
 */
export async function clearAllCaptures(): Promise<void> {
  console.log("[OFFLINE] Clearing all captures");

  const db = await initDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => {
      console.error("[OFFLINE] IndexedDB ERROR: Clear failed -", request.error);
      reject(new Error("Failed to clear captures"));
    };

    request.onsuccess = () => {
      console.log("[OFFLINE] All captures cleared");
      resolve();
    };

    tx.onerror = () => {
      console.error("[OFFLINE] IndexedDB ERROR: Transaction failed -", tx.error);
      reject(new Error("Transaction failed"));
    };
  });
}
