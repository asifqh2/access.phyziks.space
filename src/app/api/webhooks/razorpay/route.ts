// src/app/api/webhooks/razorpay/route.ts
//
// UNIFIED, IDEMPOTENT Razorpay webhook handler.
// Replaces the previous /api/payments/webhook and /api/webhooks/razorpay routes.
//
// Security guarantees:
//   - Signature is verified with timingSafeEqual before any DB work.
//   - Idempotency: Order.webhookProcessed flag prevents double-processing.
//   - Price is verified: Razorpay's reported amount must match the DB order.
//   - Entitlements are created ONLY after all verifications pass.
//   - userId is read from the DB order, never from webhook payload.
//
// Handled events:
//   payment.captured  — one-time order payment confirmed
//   order.paid        — alternative event for one-time orders
//   payment.failed    — mark order as failed

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { razorpay, verifyWebhookSignature } from '@/lib/razorpay';
import { createEntitlementsForOrder } from '@/lib/entitlement';

export async function POST(request: Request) {
  // ── 1. Read raw body and verify HMAC signature ────────────────────────────
  // We must read the raw body before any parsing to verify the signature.
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    console.warn('[webhook/razorpay] Invalid signature — rejecting request.');
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  // ── 2. Parse event ────────────────────────────────────────────────────────
  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Malformed JSON.' }, { status: 400 });
  }

  const eventType = event.event;

  // ── 3. Route by event type ────────────────────────────────────────────────
  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    return handlePaymentCaptured(event);
  }

  if (eventType === 'payment.failed') {
    return handlePaymentFailed(event);
  }

  // Acknowledge all other events without processing
  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// handlePaymentCaptured
// ─────────────────────────────────────────────────────────────────────────────

async function handlePaymentCaptured(event: WebhookEvent): Promise<NextResponse> {
  // Extract Razorpay order ID from the event payload
  const razorpayOrderId =
    event.payload?.payment?.entity?.order_id ??
    event.payload?.order?.entity?.id;

  if (!razorpayOrderId) {
    console.warn('[webhook/razorpay] payment.captured event missing order_id');
    return NextResponse.json({ received: true });
  }

  const razorpayPaymentId = event.payload?.payment?.entity?.id;

  // ── Idempotency check — find our internal Order by Razorpay order ID ──────
  const order = await prisma.order.findUnique({
    where: { gatewayOrderId: razorpayOrderId },
    include: { plan: true },
  });

  if (!order) {
    // Could be a legacy order from before this system; log and acknowledge.
    console.warn(`[webhook/razorpay] Order not found for gatewayOrderId=${razorpayOrderId}`);
    return NextResponse.json({ received: true });
  }

  if (order.webhookProcessed) {
    // Already processed — return 200 to stop Razorpay from retrying.
    console.info(`[webhook/razorpay] Order ${order.id} already processed — skipping.`);
    return NextResponse.json({ received: true });
  }

  if (order.status === 'SUCCESS') {
    // Also idempotent — order already succeeded (e.g., via verify route)
    return NextResponse.json({ received: true });
  }

  // ── Verify amount with Razorpay API (prevent amount manipulation) ─────────
  try {
    const rzpOrder = await razorpay.orders.fetch(razorpayOrderId);
    const rzpAmountPaise = Number(rzpOrder.amount);

    if (rzpAmountPaise !== order.amountPaise) {
      console.error(
        `[webhook/razorpay] Amount mismatch for order ${order.id}: ` +
          `expected ${order.amountPaise}, Razorpay reports ${rzpAmountPaise}`,
      );
      // Mark failed rather than granting access for wrong amount
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED', webhookProcessed: true },
      });
      return NextResponse.json({ received: true });
    }
  } catch (err) {
    console.error('[webhook/razorpay] Failed to verify order with Razorpay API:', err);
    // Don't process — let Razorpay retry
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
  }

  // ── Mark order SUCCESS + record payment ID (atomic-ish) ──────────────────
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'SUCCESS',
      gatewayPaymentId: razorpayPaymentId ?? null,
      webhookProcessed: true,
    },
  });

  // ── Create entitlements ───────────────────────────────────────────────────
  try {
    await createEntitlementsForOrder(order.id);
    console.info(`[webhook/razorpay] Entitlements created for order ${order.id}`);
  } catch (err) {
    // Log but don't re-throw — the order is already marked SUCCESS.
    // The admin can manually grant the entitlement if needed.
    console.error(`[webhook/razorpay] Failed to create entitlements for order ${order.id}:`, err);
  }

  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// handlePaymentFailed
// ─────────────────────────────────────────────────────────────────────────────

async function handlePaymentFailed(event: WebhookEvent): Promise<NextResponse> {
  const razorpayOrderId = event.payload?.payment?.entity?.order_id;
  if (!razorpayOrderId) return NextResponse.json({ received: true });

  await prisma.order.updateMany({
    where: {
      gatewayOrderId: razorpayOrderId,
      status: 'PENDING', // only update if still pending
    },
    data: { status: 'FAILED', webhookProcessed: true },
  });

  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook payload types (narrowed to what we use)
// ─────────────────────────────────────────────────────────────────────────────

interface WebhookEvent {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        status?: string;
      };
    };
    order?: {
      entity?: {
        id?: string;
        amount?: number | string;
        status?: string;
      };
    };
  };
}
