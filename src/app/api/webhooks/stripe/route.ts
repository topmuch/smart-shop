import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import type Stripe from 'stripe';

/**
 * POST /api/webhooks/stripe
 * Stripe webhook handler — NOT protected by auth middleware.
 * Stripe calls this endpoint directly with event notifications.
 *
 * Handles:
 *  - checkout.session.completed: Activate subscription plan
 *  - customer.subscription.updated: Update subscription record
 *  - customer.subscription.deleted: Downgrade to free plan
 *  - invoice.payment_failed: Mark subscription as past_due
 */
export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Process the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get the subscription from the checkout session
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
          );

          // Get userId from metadata or customer
          const userId = session.metadata?.userId || subscription.metadata?.userId;

          if (!userId) {
            console.error('[Stripe Webhook] No userId in checkout session metadata');
            break;
          }

          // Determine plan from priceId
          const priceId = subscription.items.data[0]?.price?.id;
          let plan = 'free';
          if (priceId) {
            if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
              plan = 'premium';
            } else if (priceId === process.env.STRIPE_FAMILY_PRICE_ID) {
              plan = 'family';
            }
          }

          // Update user plan and create subscription record
          await db.user.update({
            where: { id: userId },
            data: {
              plan,
              stripeSubscriptionId: subscription.id,
            },
          });

          // Upsert subscription record
          const subAny = subscription as unknown as Record<string, unknown>;
          await db.subscription.upsert({
            where: { stripeId: subscription.id },
            create: {
              userId,
              stripeId: subscription.id,
              status: subscription.status,
              plan,
              currentPeriodStart: new Date((subAny.current_period_start as number) * 1000),
              currentPeriodEnd: new Date((subAny.current_period_end as number) * 1000),
              cancelAt: (subAny.cancel_at as number | null)
                ? new Date((subAny.cancel_at as number) * 1000)
                : null,
              canceledAt: (subAny.canceled_at as number | null)
                ? new Date((subAny.canceled_at as number) * 1000)
                : null,
              trialEnd: (subAny.trial_end as number | null)
                ? new Date((subAny.trial_end as number) * 1000)
                : null,
            },
            update: {
              status: subscription.status,
              plan,
              currentPeriodStart: new Date((subAny.current_period_start as number) * 1000),
              currentPeriodEnd: new Date((subAny.current_period_end as number) * 1000),
              cancelAt: (subAny.cancel_at as number | null)
                ? new Date((subAny.cancel_at as number) * 1000)
                : null,
              canceledAt: (subAny.canceled_at as number | null)
                ? new Date((subAny.canceled_at as number) * 1000)
                : null,
              trialEnd: (subAny.trial_end as number | null)
                ? new Date((subAny.trial_end as number) * 1000)
                : null,
            },
          });

          console.log(`[Stripe Webhook] checkout.session.completed: User ${userId} upgraded to ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // Get userId from subscription metadata or look up by stripeId
        const userId = subscription.metadata?.userId;
        const existingSub = await db.subscription.findUnique({
          where: { stripeId: subscription.id },
        });

        if (!userId && !existingSub) {
          console.error('[Stripe Webhook] No userId for subscription update:', subscription.id);
          break;
        }

        // Determine plan from priceId
        const priceId = subscription.items.data[0]?.price?.id;
        let plan = 'free';
        if (priceId) {
          if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
            plan = 'premium';
          } else if (priceId === process.env.STRIPE_FAMILY_PRICE_ID) {
            plan = 'family';
          }
        }

        // Update subscription record
        const subAny = subscription as unknown as Record<string, unknown>;
        await db.subscription.upsert({
          where: { stripeId: subscription.id },
          create: {
            userId: userId || existingSub!.userId,
            stripeId: subscription.id,
            status: subscription.status,
            plan,
            currentPeriodStart: new Date((subAny.current_period_start as number) * 1000),
            currentPeriodEnd: new Date((subAny.current_period_end as number) * 1000),
            cancelAt: (subAny.cancel_at as number | null)
              ? new Date((subAny.cancel_at as number) * 1000)
              : null,
            canceledAt: (subAny.canceled_at as number | null)
              ? new Date((subAny.canceled_at as number) * 1000)
              : null,
            trialEnd: (subAny.trial_end as number | null)
              ? new Date((subAny.trial_end as number) * 1000)
              : null,
          },
          update: {
            status: subscription.status,
            plan,
            currentPeriodStart: new Date((subAny.current_period_start as number) * 1000),
            currentPeriodEnd: new Date((subAny.current_period_end as number) * 1000),
            cancelAt: (subAny.cancel_at as number | null)
              ? new Date((subAny.cancel_at as number) * 1000)
              : null,
            canceledAt: (subAny.canceled_at as number | null)
              ? new Date((subAny.canceled_at as number) * 1000)
              : null,
            trialEnd: (subAny.trial_end as number | null)
              ? new Date((subAny.trial_end as number) * 1000)
              : null,
          },
        });

        // Also update user plan if the subscription is active
        if (subscription.status === 'active' && (userId || existingSub)) {
          await db.user.update({
            where: { id: userId || existingSub!.userId },
            data: { plan },
          });
        }

        console.log(`[Stripe Webhook] customer.subscription.updated: ${subscription.id} → ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Look up the subscription record
        const existingSub = await db.subscription.findUnique({
          where: { stripeId: subscription.id },
        });

        if (!existingSub) {
          console.error('[Stripe Webhook] Subscription not found for deletion:', subscription.id);
          break;
        }

        // Downgrade user to free plan
        await db.user.update({
          where: { id: existingSub.userId },
          data: {
            plan: 'free',
            stripeSubscriptionId: null,
          },
        });

        // Update subscription record
        await db.subscription.update({
          where: { stripeId: subscription.id },
          data: {
            status: 'canceled',
            canceledAt: new Date(),
          },
        });

        console.log(`[Stripe Webhook] customer.subscription.deleted: User ${existingSub.userId} downgraded to free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        // Get subscription ID from the invoice
        const invoiceAny = invoice as unknown as Record<string, unknown>;
        const subscriptionId = typeof invoiceAny.subscription === 'string'
          ? invoiceAny.subscription
          : (invoiceAny.subscription as { id: string } | null)?.id;

        if (!subscriptionId) {
          console.error('[Stripe Webhook] No subscription ID on invoice:', invoice.id);
          break;
        }

        // Mark subscription as past_due
        const existingSub = await db.subscription.findUnique({
          where: { stripeId: subscriptionId },
        });

        if (existingSub) {
          await db.subscription.update({
            where: { stripeId: subscriptionId },
            data: { status: 'past_due' },
          });

          console.log(`[Stripe Webhook] invoice.payment_failed: Subscription ${subscriptionId} marked as past_due`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    // Log errors but don't throw — prevent Stripe retries on app errors
    console.error(`[Stripe Webhook] Error processing event ${event.type}:`, error);
  }

  // Always return 200 for valid webhook events
  return NextResponse.json({ received: true });
}
