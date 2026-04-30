"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  CategorySpending,
  MonthlySpending,
  SessionSummary,
} from "@/types";

/**
 * Hook for fetching and displaying dashboard analytics data including
 * category spending breakdown, monthly trends, and session history.
 * All monetary values from the API are in cents.
 *
 * @param userId - The ID of the current user. When provided, analytics are auto-fetched on mount.
 * @returns An object containing analytics data and helper methods.
 *
 * @example
 * ```tsx
 * const { categorySpending, monthlyTrend, currentMonthTotal, fetchAnalytics } = useDashboard(userId);
 * ```
 */
export function useDashboard(userId?: string) {
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>(
    []
  );
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlySpending[]>([]);
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [previousMonthTotal, setPreviousMonthTotal] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Format a monetary amount (in cents) as "XX,XX €" using French locale formatting.
   *
   * @param cents - The amount in cents.
   * @returns A formatted currency string, e.g. "142,50 €".
   */
  const formatCurrency = useCallback((cents: number): string => {
    if (cents == null || isNaN(cents)) return '0,00 €';
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  }, []);

  /**
   * Format a percentage value as a human-readable string.
   *
   * @param value - The percentage number (e.g. 85.5).
   * @returns A formatted percentage string, e.g. "85,5 %".
   */
  const formatPercentage = useCallback((value: number): string => {
    return new Intl.NumberFormat("fr-FR", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  }, []);

  /**
   * Fetch all analytics data for a given user.
   *
   * Makes two parallel requests:
   * 1. `/api/budget` — Returns category spending, monthly trend, and month totals (in cents).
   * 2. `/api/session` — Returns session history for the dashboard.
   */
  const fetchAnalytics = useCallback(
    async (uid?: string) => {
      const targetId = uid ?? userId;
      if (!targetId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch budget analytics and session history in parallel
        const [budgetRes, sessionRes] = await Promise.all([
          fetch(`/api/budget?userId=${targetId}`),
          fetch(`/api/session?userId=${targetId}`),
        ]);

        if (!budgetRes.ok) throw new Error("Failed to fetch budget analytics");

        const budgetData = await budgetRes.json();

        // Map budget response fields to state
        setCategorySpending(budgetData.categories ?? []);
        setMonthlyTrend(budgetData.monthlyTrend ?? []);
        setCurrentMonthTotal(budgetData.currentMonth?.total ?? 0);
        setPreviousMonthTotal(budgetData.previousMonth?.total ?? 0);

        // Map session history (handle potential fetch failure gracefully)
        if (sessionRes.ok) {
          const sessionJson = await sessionRes.json();
          setSessionHistory(sessionJson.sessions ?? sessionJson);
        } else {
          setSessionHistory([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  /**
   * Compute the month-over-month spending change as a percentage.
   *
   * @returns A number representing the percentage change.
   *          Positive means spending increased, negative means it decreased.
   *          Returns 0 if there is no previous month data.
   */
  const monthOverMonthChange = useCallback((): number => {
    if (previousMonthTotal === 0) return 0;
    return (
      ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
    );
  }, [currentMonthTotal, previousMonthTotal]);

  /**
   * Get the total number of items scanned across all sessions.
   *
   * @returns The sum of all session item counts.
   */
  const totalItemsScanned = useCallback((): number => {
    return sessionHistory.reduce((sum, session) => sum + session.itemsCount, 0);
  }, [sessionHistory]);

  /**
   * Get the total amount spent across all sessions (in cents).
   *
   * @returns The sum of all session totals.
   */
  const totalSpentAllSessions = useCallback((): number => {
    return sessionHistory.reduce((sum, session) => sum + session.total, 0);
  }, [sessionHistory]);

  /**
   * Get the number of completed sessions.
   *
   * @returns The count of sessions with status "completed".
   */
  const completedSessionsCount = useCallback((): number => {
    return sessionHistory.filter((s) => s.status === "completed").length;
  }, [sessionHistory]);

  /**
   * Clear the current error state.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch analytics on mount when userId is provided
  useEffect(() => {
    if (userId) {
      fetchAnalytics(userId);
    }
  }, [userId, fetchAnalytics]);

  return {
    categorySpending,
    monthlyTrend,
    currentMonthTotal,
    previousMonthTotal,
    sessionHistory,
    loading,
    error,
    fetchAnalytics,
    formatCurrency,
    formatPercentage,
    monthOverMonthChange,
    totalItemsScanned,
    totalSpentAllSessions,
    completedSessionsCount,
    clearError,
  };
}
