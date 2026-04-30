import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { requireAuth } from '@/lib/session';

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal Session for the authenticated user.
 * Uses x-user-id from middleware for authentication.
 *
 * Allows users to manage their subscription, update payment methods, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (typeof auth !== 'string') return auth;
    const userId = auth;

    // Look up the user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer account found. Please subscribe to a plan first.' },
        { status: 400 }
      );
    }

    // Create the Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[POST /api/billing/portal] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
