// src/app/api/webhooks/stripe/route.ts
//
// Stripe webhook handler — processes AED / UAE payments.
//
// Security guarantees:
//   - Signature is verified with stripe.webhooks.constructEvent before any DB work.
//   - Idempotency: Order.webhookProcessed flag prevents double-processing.
//   - Amount is verified: Stripe's reported amount must match the DB order.
//   - Entitlements are created ONLY after all verifications pass.
//   - userId is read from the DB order, never from the webhook payload.
//
// Handled events:
//   checkout.session.completed — Stripe Checkout payment confirmed

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { constructStripeEvent } from '@/lib/stripe';
import { createEntitlementsForOrder } from '@/lib/entitlement';
import type Stripe from 'stripe';

// Tell Next.js not to parse the body — we need the raw bytes for signature verification
export const runtime = 'nodejs';

export async function POST(request: Request) {
  // ── 1. Read raw body and verify Stripe signature ──────────────────────────
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.warn('[webhook/stripe] Missing stripe-signature header.');
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(rawBody, signature);
  } catch (err) {
    console.warn('[webhook/stripe] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  // ── 2. Route by event type ────────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  // Acknowledge all other events without processing
  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// handleCheckoutCompleted
// ─────────────────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<NextResponse> {
  // Extract our internal order ID from session metadata
  const internalOrderId = session.metadata?.internalOrderId;

  if (!internalOrderId) {
    console.warn('[webhook/stripe] checkout.session.completed missing internalOrderId in metadata');
    return NextResponse.json({ received: true });
  }

  // ── Idempotency check ─────────────────────────────────────────────────────
  const order = await prisma.order.findUnique({
    where: { id: internalOrderId },
    include: { plan: true },
  });

  if (!order) {
    console.warn(`[webhook/stripe] Order not found for id=${internalOrderId}`);
    return NextResponse.json({ received: true });
  }

  if (order.webhookProcessed) {
    console.info(`[webhook/stripe] Order ${order.id} already processed — skipping.`);
    return NextResponse.json({ received: true });
  }

  if (order.status === 'SUCCESS') {
    return NextResponse.json({ received: true });
  }

  // ── Verify payment status ─────────────────────────────────────────────────
  if (session.payment_status !== 'paid') {
    console.warn(`[webhook/stripe] Session ${session.id} payment_status=${session.payment_status} — not paid.`);
    return NextResponse.json({ received: true });
  }

  // ── Verify amount matches our DB order ───────────────────────────────────
  // session.amount_total is in the currency's smallest unit (fils for AED)
  const stripeAmountFils = session.amount_total ?? 0;
  if (stripeAmountFils !== order.amountPaise) {
    console.error(
      `[webhook/stripe] Amount mismatch for order ${order.id}: ` +
        `expected ${order.amountPaise} fils, Stripe reports ${stripeAmountFils}`,
    );
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'FAILED', webhookProcessed: true },
    });
    return NextResponse.json({ received: true });
  }

  // ── Mark order SUCCESS + record Stripe payment intent ID ─────────────────
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'SUCCESS',
      gatewayPaymentId: session.payment_intent as string | null,
      webhookProcessed: true,
    },
  });

  // ── Create entitlements ───────────────────────────────────────────────────
  try {
    await createEntitlementsForOrder(order.id);
  } catch (err) {
    console.error(`[webhook/stripe] Failed to create entitlements for order ${order.id}:`, err);
    // Don't return 500 — the order is already SUCCESS. Entitlement creation
    // failure needs manual investigation but we shouldn't cause Stripe to retry.
    return NextResponse.json({ received: true });
  }

  console.info(`[webhook/stripe] Order ${order.id} fulfilled via Stripe (${session.id}).`);
  return NextResponse.json({ received: true });
}
