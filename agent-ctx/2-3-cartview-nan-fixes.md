# Task 2-3: Fix NaN/Invalid Date Bugs & Create CartView

## Summary

### What was done:

1. **Created `src/components/smart-shop/CartView.tsx`** — A standalone cart tab view that:
   - Fetches active session using `useSession(userId)` hook
   - Shows empty state when no session is active ("Aucune session en cours...")
   - When session exists: displays BudgetBar in a card, scanned items list with scan order numbers, total summary, and finish/abandon session buttons
   - Uses `parseMoney()` and `formatCurrency()` from `@/lib/safe-helpers` for all calculations and displays
   - Supports item removal and session refresh
   - Proper loading, error, and empty states with spinner and error alert
   - Responsive layout with Cards and proper spacing

2. **Updated `src/app/page.tsx`**:
   - Added import for `CartView` from `@/components/smart-shop/CartView`
   - Changed the "cart" tab case from `<ScannerView>` to `<CartView>`

3. **Updated `src/components/smart-shop/CartPanel.tsx`**:
   - Removed local `formatCurrency` function
   - Added import of `formatCurrency` and `parseMoney` from `@/lib/safe-helpers`
   - `totalSpent` now uses `parseMoney()` for item.price and item.quantity
   - `totalItems` now uses `parseMoney()` for item.quantity
   - `subtotal` calculation now uses `parseMoney()` for safety

4. **Updated `src/components/smart-shop/BudgetBar.tsx`**:
   - Removed local `formatCurrency` function
   - Added import of `formatCurrency` and `parseMoney` from `@/lib/safe-helpers`
   - `percentage` calculation now uses `parseMoney()` for both `spent` and `limit`
   - `remaining` calculation now uses `parseMoney()` for both values

5. **Updated `src/components/smart-shop/DashboardView.tsx`**:
   - Removed local `formatCurrency` function
   - Added import of `formatCurrency`, `formatSafeDateShort`, and `parseMoney` from `@/lib/safe-helpers`
   - `avgBudget` calculation now uses `parseMoney()` for `s.total`
   - Date display replaced `new Date(session.date).toLocaleDateString()` with `formatSafeDateShort(session.date)`
   - Replaced `formatCurrency: fmtCurrency` from `useDashboard` with direct use of safe-helpers `formatCurrency`

### Verification:
- ESLint passes with zero errors
- Dev server compiles successfully with no issues
