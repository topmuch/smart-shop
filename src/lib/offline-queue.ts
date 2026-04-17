import type { PendingAction } from "@/types";

const STORAGE_KEY = "smartshop_offline_queue";

/**
 * Read the current queue from localStorage.
 */
function readQueue(): PendingAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingAction[];
  } catch {
    return [];
  }
}

/**
 * Write the queue to localStorage.
 */
function writeQueue(queue: PendingAction[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Enqueue an action to the offline queue.
 */
export function enqueueAction(
  action: Omit<PendingAction, "id" | "createdAt" | "retries">
): void {
  const queue = readQueue();
  const newAction: PendingAction = {
    ...action,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    retries: 0,
  };
  queue.push(newAction);
  writeQueue(queue);
}

/**
 * Dequeue all pending actions (removes them from the queue).
 */
export function dequeueActions(): PendingAction[] {
  const queue = readQueue();
  // Remove all entries from storage
  if (typeof window === "undefined") return [];
  localStorage.removeItem(STORAGE_KEY);
  return queue;
}

/**
 * Remove a specific action from the queue by ID.
 */
export function removeAction(id: string): void {
  const queue = readQueue();
  const filtered = queue.filter((a) => a.id !== id);
  writeQueue(filtered);
}

/**
 * Get the number of pending actions in the queue.
 */
export function getPendingCount(): number {
  return readQueue().length;
}

/**
 * Clear all actions from the queue.
 */
export function clearQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
