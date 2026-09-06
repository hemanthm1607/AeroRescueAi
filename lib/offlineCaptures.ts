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
      console.error("[offlineCaptures] DB open error:", request.error);
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log("[offlineCaptures] DB initialized");
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        console.log("[offlineCaptures] Object store created");
      }
    };
  });
}

/**
 * Save a captured frame to IndexedDB with offline status.
 */
export async function saveOfflineCapture(
  imageBase64: string,
  mimeType: string,
  latitude: number | null,
  longitude: number | null
): Promise<string> {
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
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(capture);

    request.onerror = () => {
      console.error("[offlineCaptures] Save error:", request.error);
      reject(new Error("Failed to save capture"));
    };

    request.onsuccess = () => {
      console.log("[offlineCaptures] Capture saved:", id);
      resolve(id);
    };
  });
}

/**
 * Get all pending captures from IndexedDB.
 */
export async function getPendingCaptures(): Promise<OfflineCapture[]> {
  const db = await initDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("status");
    const request = index.getAll("pending");

    request.onerror = () => {
      console.error("[offlineCaptures] Get pending error:", request.error);
      reject(new Error("Failed to get pending captures"));
    };

    request.onsuccess = () => {
      resolve(request.result as OfflineCapture[]);
    };
  });
}

/**
 * Mark a capture as sent.
 */
export async function markCaptureSent(captureId: string): Promise<void> {
  const db = await initDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(captureId);

    request.onerror = () => {
      console.error("[offlineCaptures] Mark sent error:", request.error);
      reject(new Error("Failed to mark capture as sent"));
    };

    request.onsuccess = () => {
      const capture = request.result as OfflineCapture;
      if (capture) {
        capture.status = "sent";
        const updateRequest = store.put(capture);

        updateRequest.onerror = () => {
          reject(new Error("Failed to update capture status"));
        };

        updateRequest.onsuccess = () => {
          console.log("[offlineCaptures] Capture marked as sent:", captureId);
          resolve();
        };
      } else {
        reject(new Error("Capture not found"));
      }
    };
  });
}

/**
 * Delete a capture from IndexedDB (after successful send and cleanup).
 */
export async function deleteCapture(captureId: string): Promise<void> {
  const db = await initDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(captureId);

    request.onerror = () => {
      console.error("[offlineCaptures] Delete error:", request.error);
      reject(new Error("Failed to delete capture"));
    };

    request.onsuccess = () => {
      console.log("[offlineCaptures] Capture deleted:", captureId);
      resolve();
    };
  });
}

/**
 * Get count of pending captures.
 */
export async function getPendingCaptureCount(): Promise<number> {
  const captures = await getPendingCaptures();
  return captures.length;
}

/**
 * Clear all captures from IndexedDB (for testing/reset).
 */
export async function clearAllCaptures(): Promise<void> {
  const db = await initDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => {
      console.error("[offlineCaptures] Clear error:", request.error);
      reject(new Error("Failed to clear captures"));
    };

    request.onsuccess = () => {
      console.log("[offlineCaptures] All captures cleared");
      resolve();
    };
  });
}
