"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  SessionSummary,
  ShoppingSession,
  CreateSessionInput,
} from "@/types";

/**
 * Hook for managing shopping sessions including creation, completion,
 * and retrieval of active sessions.
 *
 * @param userId - The ID of the current user. When provided, sessions are auto-fetched on mount.
 * @returns An object containing the sessions state and methods to manage them.
 *
 * @example
 * ```tsx
 * const { sessions, activeSession, createSession, finishSession } = useSession(userId);
 * ```
 */
export function useSession(userId?: string) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<ShoppingSession | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all session summaries for a given user.
   */
  const fetchSessions = useCallback(async (uid?: string) => {
    const targetId = uid ?? userId;
    if (!targetId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/session?userId=${targetId}`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const json = await res.json();
      const data = json.sessions ?? json;
      setSessions(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Create a new shopping session.
   */
  const createSession = useCallback(
    async (input: CreateSessionInput) => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, userId }),
        });
        if (!res.ok) throw new Error("Failed to create session");
        const json = await res.json();
        const newSession = (json.session ?? json) as ShoppingSession;
        setActiveSession(newSession);
        return newSession;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  /**
   * Fetch the active (non-completed, non-abandoned) session for a user.
   * Filters the fetched sessions to find the one with status "active".
   */
  const fetchActiveSession = useCallback(
    async (uid?: string) => {
      const targetId = uid ?? userId;
      if (!targetId) return null;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/session?userId=${targetId}`);
        if (!res.ok) throw new Error("Failed to fetch sessions");

        const json = await res.json();
        const allSessions = (json.sessions ?? json) as SessionSummary[];
        setSessions(allSessions);

        const active = allSessions.find((s) => s.status === "active");
        if (active) {
          // Fetch full session details
          const detailRes = await fetch(`/api/session/${active.id}`);
          if (!detailRes.ok) throw new Error("Failed to fetch session details");
          const detailJson = await detailRes.json();
          const fullSession = (detailJson.session ?? detailJson) as ShoppingSession;
          setActiveSession(fullSession);
          return fullSession;
        }

        setActiveSession(null);
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  /**
   * Mark a session as completed.
   */
  const finishSession = useCallback(
    async (sessionId: string) => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/session/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
        if (!res.ok) throw new Error("Failed to finish session");
        const json = await res.json();
        const completed = (json.session ?? json) as ShoppingSession;
        setActiveSession(null);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, status: "completed" } : s
          )
        );
        return completed;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Mark a session as abandoned.
   */
  const abandonSession = useCallback(
    async (sessionId: string) => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/session/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "abandoned" }),
        });
        if (!res.ok) throw new Error("Failed to abandon session");
        const json = await res.json();
        const abandoned = (json.session ?? json) as ShoppingSession;
        setActiveSession(null);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, status: "abandoned" } : s
          )
        );
        return abandoned;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Refresh a session by fetching its latest state from the server.
   */
  const refreshSession = useCallback(
    async (sessionId: string) => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        if (!res.ok) throw new Error("Failed to refresh session");
        const json = await res.json();
        const session = (json.session ?? json) as ShoppingSession;

        // Update active session if it matches
        setActiveSession((prev) => (prev?.id === sessionId ? session : prev));

        // Also update the summary in sessions array
        const scannedItems = session.scannedItems ?? [];
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  status: session.status,
                  total: session.totalSpent,
                  itemsCount: scannedItems.length,
                }
              : s
          )
        );

        return session;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Clear any active error state.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch sessions on mount when userId is provided
  useEffect(() => {
    if (userId) {
      fetchSessions(userId);
    }
  }, [userId, fetchSessions]);

  return {
    sessions,
    activeSession,
    loading,
    error,
    fetchSessions,
    createSession,
    fetchActiveSession,
    finishSession,
    abandonSession,
    refreshSession,
    clearError,
  };
}
