/**
 * Smart Shop - Type Definitions
 * Complete TypeScript interfaces and types for the application.
 */

/* ============================================================
   User & Subscription Types
   ============================================================ */

/** Supported subscription plans */
export type SubscriptionPlan = "free" | "premium" | "family";

/** Feature flags based on subscription plan */
export interface FeatureFlags {
  isPremium: boolean;
  isFamily: boolean;
  isExportPDF: boolean;
  maxLists: number;
  maxScansPerSession: number;
  historyRetentionDays: number;
}

/** User profile */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  plan: SubscriptionPlan;
  budgetDefault: number;
  avatarUrl: string | null;
  createdAt: string;
}

/* ============================================================
   Shopping List Types
   ============================================================ */

/** Shopping list item */
export interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
  quantity: number;
}

/** Shopping list */
export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  items: ShoppingListItem[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Shopping list creation input */
export interface CreateShoppingListInput {
  name?: string;
  items?: ShoppingListItem[];
}

/** Shopping list update input */
export interface UpdateShoppingListInput {
  name?: string;
  items?: ShoppingListItem[];
  isDefault?: boolean;
}

/* ============================================================
   Shopping Session Types
   ============================================================ */

/** Session status */
export type SessionStatus = "active" | "completed" | "abandoned";

/** Shopping session */
export interface ShoppingSession {
  id: string;
  userId: string;
  listId: string | null;
  budgetLimit: number;
  totalSpent: number;
  status: SessionStatus;
  location: string | null;
  startTime: string;
  endTime: string | null;
  notes: string | null;
  scannedItems: ScannedItem[];
}

/** Session creation input */
export interface CreateSessionInput {
  budgetLimit?: number;
  listId?: string;
  location?: string;
}

/* ============================================================
   Scanned Item Types
   ============================================================ */

/** Scanned product */
export interface ScannedItem {
  id: string;
  sessionId: string;
  barcode: string;
  productName: string;
  price: number;
  category: string;
  quantity: number;
  imageUrl?: string | null;
  scannedAt: string;
  /** When true, this item was created offline and hasn't been synced yet. */
  isOffline?: boolean;
}

/** Scan product input */
export interface ScanProductInput {
  sessionId: string;
  barcode: string;
  productName: string;
  price: number;
  category?: string;
  quantity?: number;
}

/* ============================================================
   Receipt Types
   ============================================================ */

/** Receipt data */
export interface Receipt {
  id: string;
  sessionId: string;
  pdfData?: string | null;
  csvData?: string | null;
  hash: string;
  createdAt: string;
}

/* ============================================================
   Dashboard & Analytics Types
   ============================================================ */

/** Category spending */
export interface CategorySpending {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

/** Monthly spending data point */
export interface MonthlySpending {
  month: string;
  total: number;
  sessions: number;
}

/** Session summary for history */
export interface SessionSummary {
  id: string;
  date: string;
  location: string | null;
  total: number;
  status: SessionStatus;
  itemsCount: number;
}

/** Budget status */
export interface BudgetStatus {
  spent: number;
  limit: number;
  percentage: number;
  remaining: number;
  isOverBudget: boolean;
  isWarning: boolean;
  isCritical: boolean;
}

/* ============================================================
   Offline Queue Types
   ============================================================ */

/** Pending action in offline queue */
export interface PendingAction {
  /** Auto-incremented ID from IndexedDB. */
  id: number;
  type: "scan" | "create_session" | "finish_session" | "update_list";
  payload: unknown;
  createdAt: number;
  retries: number;
  maxRetries: number;
}

/* ============================================================
   Navigation & UI Types
   ============================================================ */

/** App navigation tabs */
export type AppTab = "lists" | "scanner" | "cart" | "dashboard" | "settings";

/** Product category */
export type ProductCategory =
  | "Fruits & Légumes"
  | "Boulangerie"
  | "Produits Laitiers"
  | "Viandes & Poissons"
  | "Épicerie"
  | "Boissons"
  | "Surgelés"
  | "Hygiène & Beauté"
  | "Maison & Entretien"
  | "Autre";

/** Category colors for charts */
export const CATEGORY_COLORS: Record<string, string> = {
  "Fruits & Légumes": "#22c55e",
  "Boulangerie": "#eab308",
  "Produits Laitiers": "#3b82f6",
  "Viandes & Poissons": "#ef4444",
  "Épicerie": "#f97316",
  "Boissons": "#06b6d4",
  "Surgelés": "#8b5cf6",
  "Hygiène & Beauté": "#ec4899",
  "Maison & Entretien": "#6b7280",
  "Autre": "#a3a3a3",
};

/** Default categories list */
export const CATEGORIES: ProductCategory[] = [
  "Fruits & Légumes",
  "Boulangerie",
  "Produits Laitiers",
  "Viandes & Poissons",
  "Épicerie",
  "Boissons",
  "Surgelés",
  "Hygiène & Beauté",
  "Maison & Entretien",
  "Autre",
];
