// src/app/api/webhooks/cashfree/route.ts
//
// POST /api/webhooks/cashfree
//
// Idempotent Cashfree webhook handler.
// Cashfree sends a PAYMENT_SUCCESS_WEBHOOK event when a payment is captured.
//
// Security guarantees:
//   - Signature verified with HMAC-SHA256 before any DB work.
//   - Idempotency via Order.webhookProcessed flag.
//   - Amount verified against DB order.
//   - userId read from DB order, never from webhook payload.
//
// Webhook signature:
//   Header x-webhook-signature: base64(HMAC-SHA256(timestamp + rawBody, secret))
//   Header x-webhook-timestamp: unix timestamp string
//
// Register this URL in your Cashfree dashboard:
//   https://<your-domain>/api/webhooks/cashfree

import { NextResponse }               from 'next/server';
import { prisma }                     from '@/lib/prisma';
import { verifyCashfreeWebhookSignature } from '@/lib/cashfree';
import { createEntitlementsForOrder }  from '@/lib/entitlement';

export async function POST(request: Request) {
  // ── 1. Read raw body ──────────────────────────────────────────────────────
  const rawBody  = await request.text();
  const signature = request.headers.get('x-webhook-signature') ?? '';
  const timestamp = request.headers.get('x-webhook-timestamp') ?? '';

  // ── 2. Verify signature ───────────────────────────────────────────────────
  if (!signature || !timestamp || !verifyCashfreeWebhookSignature(rawBody, signature, timestamp)) {
    console.warn('[webhook/cashfree] Invalid signature — rejecting request.');
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  // ── 3. Parse event ────────────────────────────────────────────────────────
  let event: CashfreeWebhookEvent;
  try {
    event = JSON.parse(rawBody) as CashfreeWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Malformed JSON.' }, { status: 400 });
  }

  const eventType = event.type;

  if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
    return handlePaymentSuccess(event);
  }

  if (eventType === 'PAYMENT_FAILED_WEBHOOK') {
    return handlePaymentFailed(event);
  }

  // Acknowledge all other events
  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// handlePaymentSuccess
// ─────────────────────────────────────────────────────────────────────────────

async function handlePaymentSuccess(event: CashfreeWebhookEvent): Promise<NextResponse> {
  // Cashfree sends the order_id we originally created (our receipt string)
  const orderId       = event.data?.order?.order_id;
  const paymentId     = event.data?.payment?.cf_payment_id?.toString();
  const amountRupees  = event.data?.payment?.payment_amount;

  if (!orderId) {
    console.warn('[webhook/cashfree] PAYMENT_SUCCESS_WEBHOOK missing order_id');
    return NextResponse.json({ received: true });
  }

  // ── Find our DB order ─────────────────────────────────────────────────────
  const order = await prisma.order.findUnique({
    where:   { gatewayOrderId: orderId },
    include: { plan: true },
  });

  if (!order) {
    console.warn(`[webhook/cashfree] Order not found for gatewayOrderId=${orderId}`);
    return NextResponse.json({ received: true });
  }

  // ── Idempotency ───────────────────────────────────────────────────────────
  if (order.webhookProcessed || order.status === 'SUCCESS') {
    return NextResponse.json({ received: true });
  }

  // ── Amount verification ───────────────────────────────────────────────────
  if (amountRupees !== undefined) {
    const reportedPaise = Math.round(amountRupees * 100);
    if (reportedPaise !== order.amountPaise) {
      console.error(
        `[webhook/cashfree] Amount mismatch for order ${order.id}: ` +
        `expected ${order.amountPaise}, Cashfree reports ${reportedPaise}`,
      );
      await prisma.order.update({
        where: { id: order.id },
        data:  { status: 'FAILED', webhookProcessed: true },
      });
      return NextResponse.json({ received: true });
    }
  }

  // ── Mark SUCCESS ──────────────────────────────────────────────────────────
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status:           'SUCCESS',
      gatewayPaymentId: paymentId ? `cf_${paymentId}` : null,
      webhookProcessed: true,
    },
  });

  // ── Create entitlements ───────────────────────────────────────────────────
  try {
    await createEntitlementsForOrder(order.id);
    console.info(`[webhook/cashfree] Entitlements created for order ${order.id}`);
  } catch (err) {
    console.error(`[webhook/cashfree] Failed to create entitlements for order ${order.id}:`, err);
  }

  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// handlePaymentFailed
// ─────────────────────────────────────────────────────────────────────────────

async function handlePaymentFailed(event: CashfreeWebhookEvent): Promise<NextResponse> {
  const orderId = event.data?.order?.order_id;
  if (!orderId) return NextResponse.json({ received: true });

  await prisma.order.updateMany({
    where: { gatewayOrderId: orderId, status: 'PENDING' },
    data:  { status: 'FAILED', webhookProcessed: true },
  });

  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook payload types
// ─────────────────────────────────────────────────────────────────────────────

interface CashfreeWebhookEvent {
  type: string;
  data?: {
    order?: {
      order_id?:     string;
      order_amount?: number;
      order_status?: string;
    };
    payment?: {
      cf_payment_id?:   number;
      payment_amount?:  number;
      payment_status?:  string;
      payment_message?: string;
    };
  };
}
