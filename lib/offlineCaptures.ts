/**
 * IndexedDB utility for storing offline captures on the phone.
 * Each capture stores: imageBase64, timestamp, GPS location (if available), and pending status.
 */

export interface OfflineCapture {
  id: string;
  imageDataUrl: string; // Store complete data URL including header
  capturedAt: string; // ISO timestamp
  latitude: number | null;
  longitude: number | null;
  status: "pending";
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
      console.log("[IDB] Reusing existing database connection");
      resolve(dbInstance);
      return;
    }

    console.log("[IDB] Opening database...");
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("[IDB] Database open FAILED:", request.error);
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log("[IDB] Database opened successfully");
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      console.log("[IDB] Database upgrade needed - creating object store");
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        console.log("[IDB] Object store created successfully");
      }
    };
  });
}

/**
 * Save a captured frame to IndexedDB.
 */
export async function saveOfflineCapture(
  imageDataUrl: string,
  capturedAt: string,
  latitude: number | null,
  longitude: number | null
): Promise<string> {
  console.log("[IDB] saveOfflineCapture called");
  console.log(`[IDB] imageDataUrl length = ${imageDataUrl?.length || 0}`);
  console.log(`[IDB] capturedAt = ${capturedAt}`);
  console.log(`[IDB] latitude = ${latitude}`);
  console.log(`[IDB] longitude = ${longitude}`);

  // Validate image data
  if (!imageDataUrl || imageDataUrl.length < 1000) {
    const error = `Invalid image data: length = ${imageDataUrl?.length || 0}`;
    console.error(`[IDB] ${error}`);
    throw new Error(error);
  }

  console.log("[IDB] Opening database for save...");
  const db = await initDb();
  
  const id = `capture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const capture: OfflineCapture = {
    id,
    imageDataUrl,
    capturedAt,
    latitude,
    longitude,
    status: "pending",
  };

  console.log(`[IDB] Creating capture record with id: ${id}`);
  console.log(`[IDB] Starting transaction...`);

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      
      console.log("[IDB] Adding capture to store...");
      const request = store.add(capture);

      request.onerror = () => {
        console.error("[IDB] Save FAILED:", request.error);
        reject(new Error(`Failed to save capture: ${request.error?.message || "unknown"}`));
      };

      request.onsuccess = () => {
        console.log(`[IDB] Save successful: ${id}`);
        resolve(id);
      };

      tx.oncomplete = () => {
        console.log(`[IDB] Transaction completed for ${id}`);
      };

      tx.onerror = () => {
        console.error("[IDB] Transaction FAILED:", tx.error);
        reject(new Error(`Transaction failed: ${tx.error?.message || "unknown"}`));
      };
    } catch (err) {
      console.error("[IDB] Unexpected error:", err);
      reject(err instanceof Error ? err : new Error("Unknown error"));
    }
  });
}

/**
 * Get all pending captures from IndexedDB.
 */
export async function getPendingCaptures(): Promise<OfflineCapture[]> {
  console.log("[IDB] getPendingCaptures called");

  try {
    const db = await initDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("status");
      const request = index.getAll("pending");

      request.onerror = () => {
        console.error("[IDB] Get pending FAILED:", request.error);
        reject(new Error("Failed to get pending captures"));
      };

      request.onsuccess = () => {
        const result = request.result as OfflineCapture[];
        console.log(`[IDB] Found ${result.length} pending captures`);
        resolve(result);
      };

      tx.onerror = () => {
        console.error("[IDB] Transaction FAILED:", tx.error);
        reject(new Error("Transaction failed"));
      };
    });
  } catch (err) {
    console.error("[IDB] Failed to read pending captures:", err);
    return [];
  }
}

/**
 * Get count of pending captures.
 */
export async function getPendingCaptureCount(): Promise<number> {
  try {
    const captures = await getPendingCaptures();
    const count = captures.length;
    console.log(`[IDB] Pending count: ${count}`);
    return count;
  } catch (err) {
    console.error("[IDB] Failed to get pending count:", err);
    return 0;
  }
}

/**
 * Delete a capture from IndexedDB.
 */
export async function deleteCapture(captureId: string): Promise<void> {
  console.log(`[IDB] Deleting capture: ${captureId}`);

  const db = await initDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(captureId);

    request.onerror = () => {
      console.error("[IDB] Delete FAILED:", request.error);
      reject(new Error("Failed to delete capture"));
    };

    request.onsuccess = () => {
      console.log(`[IDB] Deleted: ${captureId}`);
      resolve();
    };

    tx.onerror = () => {
      console.error("[IDB] Transaction FAILED:", tx.error);
      reject(new Error("Transaction failed"));
    };
  });
}
