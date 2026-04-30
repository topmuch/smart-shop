"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PendingAction } from "@/types";
import {
  getPendingCount,
  getAllActions,
  removeAction,
  updateAction,
  moveToFailed,
} from "@/lib/offline-queue";

/** Maximum number of retry attempts for failed actions. */
const MAX_RETRIES = 3;

/** Base delay in ms for exponential backoff (doubles each retry). */
const BASE_BACKOFF_MS = 1000;

/**
 * Hook for offline synchronization with automatic online detection,
 * periodic pending count checks, and exponential backoff retries.
 *
 * **Queue safety**: actions are read from the queue without removing them.
 * Each action is only removed *after* a successful sync. On failure the
 * action's `retries` counter is incremented in-place. After `MAX_RETRIES`
 * the action is moved to the "failed" store and the user is notified.
 *
 * @returns An object containing the online status, pending action count,
 *          syncing state, and the sync function.
 *
 * @example
 * ```tsx
 * const { isOnline, pendingCount, isSyncing, syncPendingActions } = useOfflineSync();
 * ```
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgressRef = useRef(false);

  /**
   * Determine the correct API endpoint based on the action type.
   */
  const getEndpoint = useCallback(
    (action: PendingAction): string => {
      switch (action.type) {
        case "scan":
          return "/api/scan";
        case "create_session":
          return "/api/session";
        case "finish_session":
          return `/api/session/${(action.payload as { sessionId: string }).sessionId}`;
        case "update_list":
          return `/api/lists/${(action.payload as { listId: string }).listId}`;
        default:
          return "/api/unknown";
      }
    },
    []
  );

  /**
   * Determine the HTTP method based on the action type.
   */
  const getMethod = useCallback((action: PendingAction): string => {
    switch (action.type) {
      case "scan":
      case "create_session":
        return "POST";
      case "finish_session":
      case "update_list":
        return "PATCH";
      default:
        return "POST";
    }
  }, []);

  /**
   * Sync all pending actions from the offline queue.
   *
   * For each action:
   * 1. Read the queue (without removing anything).
   * 2. POST/PATCH to the appropriate endpoint.
   * 3. On success — remove from queue.
   * 4. On failure — increment retries in-place; move to failed store
   *    after MAX_RETRIES and notify the user.
   */
  const syncPendingActions = useCallback(async () => {
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      // Read all actions WITHOUT removing them (safe — no data loss on crash)
      const pending = await getAllActions();
      if (pending.length === 0) {
        setPendingCount(0);
        return;
      }

      for (const action of pending) {
        // Skip actions that have already exceeded max retries (shouldn't happen
        // but acts as a safety net)
        if (action.retries >= MAX_RETRIES) {
          await moveToFailed(action);
          continue;
        }

        const endpoint = getEndpoint(action);
        const method = getMethod(action);

        // Exponential backoff: delay doubles with each retry
        const delay =
          action.retries > 0
            ? BASE_BACKOFF_MS * Math.pow(2, action.retries)
            : 0;

        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        try {
          const res = await fetch(endpoint, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.payload),
          });

          if (res.ok) {
            // Success — remove from queue permanently
            await removeAction(action.id);

            // If this was a scan action with a temp ID, notify the UI
            // so it can replace the optimistic offline item with the server response
            if (action.type === "scan") {
              try {
                const json = await res.json();
                const serverItem = json.item ?? json;
                const payload = action.payload as Record<string, unknown>;
                const tempId = payload.tempId as string | undefined;

                if (tempId && typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("smartshop:scan-synced", {
                      detail: { tempId, serverItem },
                    })
                  );
                }
              } catch {
                // Response body already consumed or not JSON — that's fine
              }
            }
          } else {
            // Server error — increment retries in-place
            const updatedAction: PendingAction = {
              ...action,
              retries: action.retries + 1,
            };

            if (updatedAction.retries >= MAX_RETRIES) {
              await moveToFailed(action);
              // Notify user about permanently failed action
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("smartshop:action-failed", {
                    detail: { action },
                  })
                );
              }
            } else {
              await updateAction(updatedAction);
            }
          }
        } catch {
          // Network error — increment retries in-place
          const updatedAction: PendingAction = {
            ...action,
            retries: action.retries + 1,
          };

          if (updatedAction.retries >= MAX_RETRIES) {
            await moveToFailed(action);
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("smartshop:action-failed", {
                  detail: { action },
                })
              );
            }
          } else {
            await updateAction(updatedAction);
          }
        }
      }

      // Update the pending count after sync
      const remaining = await getPendingCount();
      setPendingCount(remaining);
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [getEndpoint, getMethod]);

  /**
   * Update the pending action count from the queue.
   */
  const refreshPendingCount = useCallback(() => {
    getPendingCount().then(setPendingCount).catch(() => {});
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Set initial state
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncPendingActions();
    }
  }, [isOnline, syncPendingActions]);

  // Periodically check pending queue count (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPendingCount();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshPendingCount]);

  // Initial count
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Listen for permanently-failed actions and show a toast
  useEffect(() => {
    const handler = (e: Event) => {
      const { action } = (e as CustomEvent).detail as {
        action: PendingAction;
      };
      // Import toast lazily to avoid circular deps at module level
      import("sonner").then(({ toast }) => {
        toast.error(
          `Action "${action.type}" a échoué définitivement après ${MAX_RETRIES} tentatives.`
        );
      });
    };

    window.addEventListener("smartshop:action-failed", handler);
    return () =>
      window.removeEventListener("smartshop:action-failed", handler);
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncPendingActions,
    refreshPendingCount,
  };
}
