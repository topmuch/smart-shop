import { db } from '@/lib/db';
import { getFeatureFlags, isFeatureAllowed } from '@/lib/stripe';

export { getFeatureFlags, isFeatureAllowed };

/**
 * Check if a user has access to a specific feature based on their plan.
 */
export async function checkFeatureAccess(
  userId: string,
  feature: 'pdfExport' | 'csvExport' | 'advancedDashboard'
): Promise<{ allowed: boolean; plan: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = user?.plan || 'free';
  return {
    allowed: isFeatureAllowed(plan, feature),
    plan,
  };
}

/**
 * Check if a user is within their quota for a specific resource.
 */
export async function checkQuota(
  userId: string,
  quotaType: 'maxLists' | 'maxScansPerSession',
  currentCount: number
): Promise<{ allowed: boolean; limit: number; plan: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = user?.plan || 'free';
  const flags = getFeatureFlags(plan);
  const limit = flags[quotaType];

  return {
    allowed: currentCount < limit,
    limit,
    plan,
  };
}
