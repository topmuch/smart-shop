import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import type { PendingAction } from "@/types";

/* ============================================================
   IndexedDB Schema
   ============================================================ */

interface SmartShopDB extends DBSchema {
  "pending-actions": {
    key: number;
    value: PendingAction;
    indexes: { "by-type": string };
  };
  "failed-actions": {
    key: number;
    value: PendingAction & { failedAt: number };
    indexes: { "by-type": string };
  };
}

/* ============================================================
   Constants
   ============================================================ */

const DB_NAME = "smartshop-offline";
const DB_VERSION = 1;
const PENDING_STORE = "pending-actions";
const FAILED_STORE = "failed-actions";

/** Legacy localStorage key used before the IndexedDB migration. */
const LEGACY_STORAGE_KEY = "smartshop_offline_queue";

/* ============================================================
   Database Singleton
   ============================================================ */

let dbPromise: Promise<IDBPDatabase<SmartShopDB>> | null = null;

/**
 * Get (or create) the IndexedDB database connection.
 * Safe to call on the server — returns a rejected promise if
 * `window` is not available.
 */
function getDB(): Promise<IDBPDatabase<SmartShopDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB not available on server"));
  }
  if (!dbPromise) {
    dbPromise = openDB<SmartShopDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          const pendingStore = db.createObjectStore(PENDING_STORE, {
            keyPath: "id",
            autoIncrement: true,
          });
          pendingStore.createIndex("by-type", "type");
        }
        if (!db.objectStoreNames.contains(FAILED_STORE)) {
          const failedStore = db.createObjectStore(FAILED_STORE, {
            keyPath: "id",
            autoIncrement: true,
          });
          failedStore.createIndex("by-type", "type");
        }
      },
    });
  }
  return dbPromise;
}

/* ============================================================
   localStorage → IndexedDB Migration
   ============================================================ */

let migrationDone = false;

/**
 * One-time migration of old localStorage data into IndexedDB.
 * After a successful migration the localStorage key is removed.
 */
async function migrateFromLocalStorage(): Promise<void> {
  if (migrationDone || typeof window === "undefined") return;
  migrationDone = true;

  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;

    const oldActions = JSON.parse(raw) as Array<
      Omit<PendingAction, "id"> & { id: string }
    >;

    if (!Array.isArray(oldActions) || oldActions.length === 0) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    const db = await getDB();
    const tx = db.transaction(PENDING_STORE, "readwrite");

    for (const action of oldActions) {
      // Strip the old string id — IndexedDB will auto-assign a numeric one
      const { id: _oldId, ...rest } = action;
      await tx.store.add(rest as unknown as PendingAction);
    }

    await tx.done;
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Silently fail — the old data stays in localStorage as a last resort
  }
}

/**
 * Initialise the database and run the migration if needed.
 * Every public function should call this first.
 */
async function init(): Promise<IDBPDatabase<SmartShopDB>> {
  const db = await getDB();
  await migrateFromLocalStorage();
  return db;
}

/* ============================================================
   Public API
   ============================================================ */

/**
 * Enqueue an action to the offline queue.
 *
 * @returns The auto-generated numeric ID, or `-1` on failure.
 */
export async function enqueueAction(
  action: Omit<PendingAction, "id" | "createdAt" | "retries">
): Promise<number> {
  try {
    const db = await init();
    const newAction: Omit<PendingAction, "id"> = {
      ...action,
      createdAt: Date.now(),
      retries: 0,
    };
    const id = await db.add(PENDING_STORE, newAction as unknown as PendingAction);
    return id as number;
  } catch {
    return -1;
  }
}

/**
 * Dequeue (remove and return) specific actions by their IDs.
 * If no IDs are provided, returns **all** pending actions **without**
 * removing them (read-only).
 *
 * @param ids - Optional array of action IDs to remove and return.
 * @returns The dequeued (or read) actions.
 */
export async function dequeueActions(
  ids?: number[]
): Promise<PendingAction[]> {
  try {
    const db = await init();

    // No specific IDs → read-only: return everything without deleting
    if (!ids || ids.length === 0) {
      return db.getAll(PENDING_STORE);
    }

    // Remove only the requested IDs and return them
    const actions: PendingAction[] = [];
    const tx = db.transaction(PENDING_STORE, "readwrite");

    for (const id of ids) {
      const action = await tx.store.get(id);
      if (action) {
        actions.push(action);
        await tx.store.delete(id);
      }
    }

    await tx.done;
    return actions;
  } catch {
    return [];
  }
}

/**
 * Remove a specific action from the queue by its ID.
 */
export async function removeAction(id: number): Promise<void> {
  try {
    const db = await init();
    await db.delete(PENDING_STORE, id);
  } catch {
    // Silently fail
  }
}

/**
 * Update an existing action in-place (e.g. increment retries).
 */
export async function updateAction(action: PendingAction): Promise<void> {
  try {
    const db = await init();
    await db.put(PENDING_STORE, action);
  } catch {
    // Silently fail
  }
}

/**
 * Get the number of pending actions in the queue.
 */
export async function getPendingCount(): Promise<number> {
  try {
    const db = await init();
    return db.count(PENDING_STORE);
  } catch {
    return 0;
  }
}

/**
 * Get all pending actions without removing them.
 */
export async function getAllActions(): Promise<PendingAction[]> {
  try {
    const db = await init();
    return db.getAll(PENDING_STORE);
  } catch {
    return [];
  }
}

/**
 * Clear all actions from the pending queue.
 */
export async function clearQueue(): Promise<void> {
  try {
    const db = await init();
    await db.clear(PENDING_STORE);
  } catch {
    // Silently fail
  }
}

/**
 * Move a permanently-failed action to the failed-actions store.
 * Removes it from the pending queue and stores it with a `failedAt` timestamp.
 */
export async function moveToFailed(action: PendingAction): Promise<void> {
  try {
    const db = await init();
    const tx = db.transaction([PENDING_STORE, FAILED_STORE], "readwrite");

    // Add to failed store (IndexedDB auto-assigns a new id)
    const { id: _pendingId, ...rest } = action;
    await tx.objectStore(FAILED_STORE).add({
      ...rest,
      failedAt: Date.now(),
    } as PendingAction & { failedAt: number });

    // Remove from pending store
    await tx.objectStore(PENDING_STORE).delete(action.id);

    await tx.done;
  } catch {
    // Silently fail
  }
}

/**
 * Get all actions that permanently failed after max retries.
 */
export async function getFailedActions(): Promise<
  Array<PendingAction & { failedAt: number }>
> {
  try {
    const db = await init();
    return db.getAll(FAILED_STORE);
  } catch {
    return [];
  }
}

/**
 * Clear all failed actions.
 */
export async function clearFailed(): Promise<void> {
  try {
    const db = await init();
    await db.clear(FAILED_STORE);
  } catch {
    // Silently fail
  }
}
