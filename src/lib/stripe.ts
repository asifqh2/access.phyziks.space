// src/lib/stripe.ts
//
// Stripe client singleton — used for AED / UAE payments.
// The client is created lazily so a missing env var does not crash the module
// at import time (which would white-screen the whole app).

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Returns the Stripe client, throwing only when it is first used
 * (not at import time).
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_live_your_')) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. Add your real Stripe secret key to .env.local.',
    );
  }

  _stripe = new Stripe(key, {
    apiVersion: '2026-08-26.dahlia',
    typescript: true,
  });

  return _stripe;
}

// Keep a named export for direct use in non-critical paths
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string];
  },
});

/**
 * Verify a Stripe webhook signature.
 * Returns the parsed event or throws if invalid.
 */
export function constructStripeEvent(
  rawBody: string,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set.');
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}
