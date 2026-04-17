"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PendingAction } from "@/types";
import {
  getPendingCount,
  dequeueActions,
  removeAction,
  enqueueAction,
} from "@/lib/offline-queue";

/** Maximum number of retry attempts for failed actions. */
const MAX_RETRIES = 3;

/** Base delay in ms for exponential backoff (doubles each retry). */
const BASE_BACKOFF_MS = 1000;

/**
 * Hook for offline synchronization with automatic online detection,
 * periodic pending count checks, and exponential backoff retries.
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
   * 1. POST/PATCH to the appropriate endpoint.
   * 2. On success, remove from queue.
   * 3. On failure, retry with exponential backoff up to MAX_RETRIES times.
   */
  const syncPendingActions = useCallback(async () => {
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const pending = dequeueActions();
      if (pending.length === 0) {
        setPendingCount(0);
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;

      for (const action of pending) {
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
            removeAction(action.id);
            syncedCount++;
          } else {
            // Server error — check if we can retry
            if (action.retries < MAX_RETRIES) {
              const retriedAction: PendingAction = {
                ...action,
                retries: action.retries + 1,
              };
              enqueueAction(retriedAction);
              failedCount++;
            }
            // If max retries exceeded, the action is silently dropped
          }
        } catch {
          // Network error — check if we can retry
          if (action.retries < MAX_RETRIES) {
            const retriedAction: PendingAction = {
              ...action,
              retries: action.retries + 1,
            };
            enqueueAction(retriedAction);
            failedCount++;
          }
        }
      }

      // Update the pending count after sync
      const remaining = getPendingCount();
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
    setPendingCount(getPendingCount());
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

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncPendingActions,
    refreshPendingCount,
  };
}
