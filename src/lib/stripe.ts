import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: null as unknown as undefined,
  typescript: true,
});

export const PLANS = {
  free: {
    name: 'Gratuit',
    priceId: process.env.STRIPE_FREE_PRICE_ID || '',
    maxLists: 3,
    maxScansPerSession: 20,
    historyDays: 30,
    pdfExport: false,
    csvExport: false,
    advancedDashboard: false,
  },
  premium: {
    name: 'Premium',
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || '',
    maxLists: Infinity,
    maxScansPerSession: Infinity,
    historyDays: Infinity,
    pdfExport: true,
    csvExport: true,
    advancedDashboard: true,
  },
  family: {
    name: 'Famille',
    priceId: process.env.STRIPE_FAMILY_PRICE_ID || '',
    maxLists: Infinity,
    maxScansPerSession: Infinity,
    historyDays: Infinity,
    pdfExport: true,
    csvExport: true,
    advancedDashboard: true,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getFeatureFlags(plan: string) {
  const key = (plan || 'free') as PlanKey;
  const p = PLANS[key] || PLANS.free;
  return {
    maxLists: p.maxLists,
    maxScansPerSession: p.maxScansPerSession,
    historyDays: p.historyDays,
    pdfExport: p.pdfExport,
    csvExport: p.csvExport,
    advancedDashboard: p.advancedDashboard,
  };
}

export function isFeatureAllowed(plan: string, feature: 'pdfExport' | 'csvExport' | 'advancedDashboard'): boolean {
  const flags = getFeatureFlags(plan);
  return flags[feature] === true;
}
