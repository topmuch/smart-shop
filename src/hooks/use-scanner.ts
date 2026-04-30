"use client";

import { useState, useCallback, useRef } from "react";
import type { ScannedItem, ScanProductInput } from "@/types";
import { enqueueAction } from "@/lib/offline-queue";
import { lookupProduct } from "@/lib/product-database";
import { soundManager } from "@/lib/sound-manager";

/** Duration in ms before a barcode is removed from the duplicate-prevention set. */
const DUPLICATE_WINDOW_MS = 3000;

/**
 * Hook for barcode scanning with double-scan prevention, haptic feedback,
 * offline queue support, and **optimistic offline items**.
 *
 * When offline, `scanProduct()` creates a local optimistic `ScannedItem`
 * (prefilled from the product database) so the user sees the item in their
 * cart immediately. The action is enqueued for later sync and includes the
 * temporary ID for reconciliation when the server responds.
 *
 * @returns An object containing scanning state and methods.
 *
 * @example
 * ```tsx
 * const { lastScan, isScanning, scanProduct, isDuplicate } = useScanner();
 * ```
 */
export function useScanner() {
  const [lastScan, setLastScan] = useState<ScannedItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recentBarcodesRef = useRef<Set<string>>(new Set());

  /**
   * Trigger haptic feedback via the Vibration API if available.
   * Uses a short [50ms] vibration pattern to confirm a successful scan.
   */
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  /**
   * Check if a barcode has been recently scanned (within the duplicate window).
   *
   * @param barcode - The barcode string to check.
   * @returns `true` if the barcode was scanned within the last 3 seconds.
   */
  const isDuplicate = useCallback((barcode: string): boolean => {
    return recentBarcodesRef.current.has(barcode);
  }, []);

  /**
   * Scan a product by posting to the scan API.
   *
   * - Checks for duplicate barcodes within a 3-second window.
   * - Triggers haptic feedback on successful scan.
   * - When **offline**, creates an optimistic `ScannedItem` from the local
   *   product database so the item appears in the cart immediately.
   * - The offline action includes a `tempId` so that, when the action syncs
   *   later, the server response can replace the optimistic item.
   * - Automatically clears the barcode from the duplicate set after 3 seconds.
   *
   * @param input - The scan product input containing sessionId, barcode, productName, price, etc.
   * @returns The scanned item on success, or `null` on duplicate / unexpected error.
   */
  const scanProduct = useCallback(
    async (input: ScanProductInput): Promise<ScannedItem | null> => {
      // Double-scan prevention
      if (recentBarcodesRef.current.has(input.barcode)) {
        setError("Ce produit vient d'être scanné. Veuillez patienter.");
        return null;
      }

      // Add to recent barcodes set
      recentBarcodesRef.current.add(input.barcode);

      // Clear barcode from set after the duplicate window
      setTimeout(() => {
        recentBarcodesRef.current.delete(input.barcode);
      }, DUPLICATE_WINDOW_MS);

      setIsScanning(true);
      setError(null);

      try {
        // ── Offline path: optimistic item ──
        if (
          typeof navigator !== "undefined" &&
          !navigator.onLine
        ) {
          const tempId = `offline_${Date.now()}`;

          // Try to pre-fill from the local product database
          const lookup = lookupProduct(input.barcode);
          const productName = lookup?.name ?? input.productName;
          const price = lookup?.price ?? input.price;
          const category = lookup?.category ?? input.category ?? "Autre";

          const optimisticItem: ScannedItem = {
            id: tempId,
            sessionId: input.sessionId,
            barcode: input.barcode,
            productName,
            price,
            category,
            quantity: input.quantity ?? 1,
            imageUrl: null,
            scannedAt: new Date().toISOString(),
            isOffline: true,
          };

          // Enqueue action with tempId for later reconciliation
          await enqueueAction({
            type: "scan",
            payload: {
              ...input,
              productName,
              price,
              category,
              tempId,
            },
            maxRetries: 3,
          });

          setLastScan(optimisticItem);
          triggerHaptic();
          soundManager.playSuccess();
          soundManager.vibrate(50);
          setIsScanning(false);
          return optimisticItem;
        }

        // ── Online path ──
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error ?? "Failed to scan product"
          );
        }

        const json = await res.json();
        const scannedItem = (json.item ?? json) as ScannedItem;
        setLastScan(scannedItem);
        triggerHaptic();
        soundManager.playSuccess();
        soundManager.vibrate(50);
        return scannedItem;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors du scan"
        );
        return null;
      } finally {
        setIsScanning(false);
      }
    },
    [triggerHaptic]
  );

  /**
   * Clear the current error state.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset the scanner state (clear last scan and error).
   */
  const reset = useCallback(() => {
    setLastScan(null);
    setError(null);
    setIsScanning(false);
    recentBarcodesRef.current.clear();
  }, []);

  return {
    lastScan,
    isScanning,
    error,
    recentBarcodes: recentBarcodesRef.current,
    scanProduct,
    isDuplicate,
    clearError,
    reset,
  };
}
