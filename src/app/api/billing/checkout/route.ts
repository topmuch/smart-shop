import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripe, PLANS } from '@/lib/stripe';
import { requireAuth } from '@/lib/session';

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout Session for subscription upgrade.
 * Uses x-user-id from middleware for authentication.
 *
 * Body: { priceId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (typeof auth !== 'string') return auth;
    const userId = auth;

    const body = await request.json();
    const { priceId } = body;

    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json(
        { error: 'priceId is required' },
        { status: 400 }
      );
    }

    // Verify the priceId matches a known plan
    const planEntry = Object.values(PLANS).find((p) => p.priceId === priceId);
    if (!planEntry) {
      return NextResponse.json(
        { error: 'Invalid priceId' },
        { status: 400 }
      );
    }

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

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Save the Stripe customer ID to the user record
      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create the Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/?checkout=cancel`,
      metadata: {
        userId: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[POST /api/billing/checkout] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
