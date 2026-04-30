/**
 * Currency utilities - all prices stored as cents (Int) in the database
 */

/** Convert cents to display string: 129 → "1,29 €" */
export function centsToDisplay(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

/** Convert display string to cents: "1.29" → 129 */
export function displayToCents(value: string): number {
  const parsed = parseFloat(value.replace(',', '.'));
  return Math.round(parsed * 100);
}

/** Convert euros (number) to cents: 1.29 → 129 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/** Convert cents to euros: 129 → 1.29 */
export function centsToEuros(cents: number): number {
  return cents / 100;
}
