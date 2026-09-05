/**
 * Offline storage utility using IndexedDB.
 * Stores pending captured images and their metadata for sync when online.
 */

import type { AnalysisResult } from "@/types";

export interface PendingCapture {
  id: string; // Unique local ID
  imageData: string; // base64 or data URL
  mimeType: string;
  captureTimestamp: string; // ISO string
  latitude?: number;
  longitude?: number;
  incidentId?: string;
  uploadStatus: "pending" | "syncing" | "completed" | "failed";
  retryCount: number;
  lastRetryAt?: string; // ISO string
  analysisResult?: AnalysisResult; // Optional: analysis result when available locally
}

const DB_NAME = "AeroRescueOffline";
const DB_VERSION = 1;
const STORE_NAME = "pending_captures";

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database.
 * Safe to call multiple times.
 */
export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("[offlineStorage] Failed to open IndexedDB");
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("uploadStatus", "uploadStatus", { unique: false });
        store.createIndex("captureTimestamp", "captureTimestamp", { unique: false });
      }
    };
  });
}

/**
 * Check if IndexedDB is available in this browser.
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== "undefined" && typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Save a pending capture to IndexedDB.
 */
export async function savePendingCapture(capture: PendingCapture): Promise<string> {
  if (!isIndexedDBAvailable()) {
    throw new Error("IndexedDB is not available in this browser");
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(capture);

    request.onerror = () => {
      console.error("[offlineStorage] Failed to save pending capture");
      reject(new Error("Failed to save pending capture"));
    };

    request.onsuccess = () => {
      console.log(`[offlineStorage] Saved pending capture: ${capture.id}`);
      resolve(capture.id);
    };
  });
}

/**
 * Get all pending captures with a specific status.
 */
export async function getPendingCapturesByStatus(
  status: "pending" | "syncing" | "completed" | "failed"
): Promise<PendingCapture[]> {
  if (!isIndexedDBAvailable()) {
    throw new Error("IndexedDB is not available");
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("uploadStatus");
    const request = index.getAll(status);

    request.onerror = () => {
      console.error("[offlineStorage] Failed to get pending captures");
      reject(new Error("Failed to get pending captures"));
    };

    request.onsuccess = () => {
      resolve(request.result as PendingCapture[]);
    };
  });
}

/**
 * Get a single pending capture by ID.
 */
export async function getPendingCaptureById(id: string): Promise<PendingCapture | null> {
  if (!isIndexedDBAvailable()) {
    throw new Error("IndexedDB is not available");
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => {
      reject(new Error("Failed to get pending capture"));
    };

    request.onsuccess = () => {
      resolve((request.result as PendingCapture) || null);
    };
  });
}

/**
 * Update a pending capture's status and retry count.
 */
export async function updatePendingCaptureStatus(
  id: string,
  status: "pending" | "syncing" | "completed" | "failed",
  retryCount?: number
): Promise<void> {
  if (!isIndexedDBAvailable()) {
    throw new Error("IndexedDB is not available");
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const capture = getRequest.result as PendingCapture | undefined;
      if (!capture) {
        reject(new Error("Pending capture not found"));
        return;
      }

      capture.uploadStatus = status;
      if (retryCount !== undefined) {
        capture.retryCount = retryCount;
      }
      if (status === "syncing" || status === "failed") {
        capture.lastRetryAt = new Date().toISOString();
      }

      const updateRequest = store.put(capture);
      updateRequest.onerror = () => {
        reject(new Error("Failed to update pending capture"));
      };
      updateRequest.onsuccess = () => {
        console.log(`[offlineStorage] Updated capture ${id} to status: ${status}`);
        resolve();
      };
    };

    getRequest.onerror = () => {
      reject(new Error("Failed to fetch pending capture for update"));
    };
  });
}

/**
 * Delete a pending capture by ID.
 */
export async function deletePendingCapture(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    throw new Error("IndexedDB is not available");
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => {
      reject(new Error("Failed to delete pending capture"));
    };

    request.onsuccess = () => {
      console.log(`[offlineStorage] Deleted pending capture: ${id}`);
      resolve();
    };
  });
}

/**
 * Get all pending captures (regardless of status).
 */
export async function getAllPendingCaptures(): Promise<PendingCapture[]> {
  if (!isIndexedDBAvailable()) {
    throw new Error("IndexedDB is not available");
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      reject(new Error("Failed to get all pending captures"));
    };

    request.onsuccess = () => {
      resolve(request.result as PendingCapture[]);
    };
  });
}

/**
 * Get count of pending captures with a specific status.
 */
export async function getPendingCaptureCount(
  status?: "pending" | "syncing" | "completed" | "failed"
): Promise<number> {
  if (!isIndexedDBAvailable()) {
    throw new Error("IndexedDB is not available");
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);

    let request;
    if (status) {
      const index = store.index("uploadStatus");
      request = index.count(status);
    } else {
      request = store.count();
    }

    request.onerror = () => {
      reject(new Error("Failed to count pending captures"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

/**
 * Clear all pending captures from the database.
 */
export async function clearAllPendingCaptures(): Promise<void> {
  if (!isIndexedDBAvailable()) {
    throw new Error("IndexedDB is not available");
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => {
      reject(new Error("Failed to clear pending captures"));
    };

    request.onsuccess = () => {
      console.log("[offlineStorage] Cleared all pending captures");
      resolve();
    };
  });
}
