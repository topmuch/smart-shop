/**
 * Safe Helpers — Defensive utilities for NaN, Invalid Date, and null guards.
 * Use these throughout the application to prevent runtime display errors.
 */

/**
 * Safely parse any value to a finite number.
 * Returns 0 if the input is NaN, null, undefined, or not a valid number.
 *
 * @example
 * parseMoney("12.50")  // 12.50
 * parseMoney(null)      // 0
 * parseMoney("toto")    // 0
 * parseMoney(undefined) // 0
 */
export function parseMoney(value: unknown): number {
  const num = parseFloat(String(value ?? "0"));
  return isNaN(num) ? 0 : num;
}

/**
 * Format cents as EUR currency ("XX,XX €") using French locale.
 * All prices are now stored as cents (Int) in the database.
 * Returns "0,00 €" for any non-finite input.
 */
export function formatCurrency(cents: number | null | undefined): string {
  if (cents == null || isNaN(cents)) return '0,00 €';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

/**
 * Safely format a date input as a human-readable French string.
 * Returns "Date inconnue" for null/undefined/empty.
 * Returns "Date invalide" for strings that don't parse to a valid date.
 *
 * Uses native Intl API — no external dependency needed.
 *
 * @example
 * formatSafeDate("2024-10-24T14:30:00Z")
 * // "24 oct. 2024 à 16:30"
 *
 * formatSafeDate(null)
 * // "Date inconnue"
 */
export function formatSafeDate(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return "Date inconnue";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Date invalide";

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

/**
 * Safely format a date as a short date-only string (no time).
 * Returns "Date inconnue" / "Date invalide" for bad inputs.
 *
 * @example
 * formatSafeDateShort("2024-10-24T14:30:00Z")
 * // "24 oct. 2024"
 */
export function formatSafeDateShort(
  dateInput: string | Date | null | undefined
): string {
  if (!dateInput) return "Date inconnue";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Date invalide";

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Safely compute a percentage (0–100).
 * Returns 0 if the denominator is 0 or any input is NaN.
 */
export function safePercentage(part: unknown, total: unknown): number {
  const p = parseMoney(part);
  const t = parseMoney(total);
  if (t === 0) return 0;
  return Math.round((p / t) * 100);
}
