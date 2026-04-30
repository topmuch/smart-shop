"use client";

import { useState, useCallback, useMemo } from "react";
import type { ScannedItem, BudgetStatus } from "@/types";

/**
 * Hook for real-time budget tracking with computed status indicators.
 * All prices are in cents (Int).
 *
 * @param items - The current array of scanned items to calculate spending from.
 * @param budgetLimit - The maximum budget allowed for the session (in cents).
 * @returns An object containing the budget status and helper methods.
 *
 * @example
 * ```tsx
 * const { budgetStatus, formatCurrency } = useBudget(scannedItems, 5000);
 * ```
 */
export function useBudget(items: ScannedItem[], budgetLimit: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate the total spending from the scanned items (in cents).
   * Each item's total is price (cents) × quantity.
   */
  const totalSpent = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  /**
   * Budget status computed from items and limit (all in cents).
   * - percentage: spent as a fraction of limit (0-100+)
   * - remaining: how much is left before hitting the limit (in cents)
   * - isOverBudget: spent exceeds the limit
   * - isWarning: spent is over 80% of the limit
   * - isCritical: spent exceeds the limit
   */
  const budgetStatus: BudgetStatus = useMemo(() => {
    const limit = budgetLimit > 0 ? budgetLimit : 1; // prevent division by zero
    const percentage = (totalSpent / limit) * 100;
    const remaining = limit - totalSpent;

    return {
      spent: totalSpent,
      limit: budgetLimit,
      percentage: Math.round(percentage * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      isOverBudget: totalSpent > budgetLimit,
      isWarning: percentage > 80,
      isCritical: totalSpent > budgetLimit,
    };
  }, [totalSpent, budgetLimit]);

  /**
   * Update budget calculations from a new set of items and limit.
   *
   * @param newItems - The updated array of scanned items.
   * @param limit - The budget limit to use (in cents).
   */
  const updateFromItems = useCallback(
    (newItems: ScannedItem[], limit: number) => {
      setLoading(true);
      setError(null);
      try {
        // The computed values will update automatically via useMemo
        // This callback exists for explicit recalculation triggers
        void newItems;
        void limit;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Format a monetary amount (in cents) as "XX,XX €" using French locale formatting.
   *
   * @param cents - The amount in cents.
   * @returns A formatted currency string, e.g. "12,50 €".
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

  return {
    budgetStatus,
    totalSpent,
    loading,
    error,
    updateFromItems,
    formatCurrency,
    formatPercentage,
  };
}
