// src/app/api/payments/cashfree-verify/route.ts
//
// POST /api/payments/cashfree-verify
//
// Called by the client after Cashfree checkout completes (redirect / JS callback).
// Verifies the payment by fetching the order from Cashfree API server-side,
// marks the DB order SUCCESS, and creates entitlements immediately.
//
// The webhook (/api/webhooks/cashfree) is the authoritative backup path —
// it handles retries and is idempotent. If it fires first, this route is a no-op.
//
// Security:
//   - User identity from Clerk auth() — never from request body.
//   - Amount verified by re-fetching the order from Cashfree API.
//   - Order ownership verified — user cannot verify another user's order.

import { NextResponse }              from 'next/server';
import { requireUser }               from '@/lib/auth-helpers';
import { prisma }                    from '@/lib/prisma';
import { fetchCashfreeOrder }        from '@/lib/cashfree';
import { createEntitlementsForOrder } from '@/lib/entitlement';

export async function POST(request: Request) {
  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const { userId, error: authError } = await requireUser();
  if (authError) return authError;

  // ── 2. Parse body ──────────────────────────────────────────────────────────
  let body: { orderId?: string; cfOrderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // orderId is the receipt we generated (stored as gatewayOrderId in DB)
  const { orderId } = body;
  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json({ error: 'orderId is required.' }, { status: 400 });
  }

  // ── 3. Find our internal Order ────────────────────────────────────────────
  const order = await prisma.order.findUnique({
    where:   { gatewayOrderId: orderId },
    select:  { id: true, clerkUserId: true, status: true, amountPaise: true, currency: true },
  });

  if (!order) {
    // Order not found yet — may still be created by webhook; redirect anyway
    return NextResponse.json({ ok: true, redirectTo: '/dashboard?payment=success' });
  }

  // ── 4. Ownership check ────────────────────────────────────────────────────
  if (order.clerkUserId !== userId) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // ── 5. Idempotency — already processed ────────────────────────────────────
  if (order.status === 'SUCCESS') {
    return NextResponse.json({ ok: true, redirectTo: '/dashboard?payment=success' });
  }

  // ── 6. Verify payment with Cashfree API ───────────────────────────────────
  let cfOrder: Awaited<ReturnType<typeof fetchCashfreeOrder>>;
  try {
    cfOrder = await fetchCashfreeOrder(orderId);
  } catch (err) {
    console.error('[cashfree-verify] Failed to fetch Cashfree order:', err);
    return NextResponse.json(
      { error: 'Could not verify payment with Cashfree. Please contact support.' },
      { status: 502 },
    );
  }

  if (cfOrder.status !== 'PAID') {
    return NextResponse.json(
      { error: `Payment not completed. Status: ${cfOrder.status}` },
      { status: 400 },
    );
  }

  // ── 7. Amount verification (rupees → paise for comparison) ────────────────
  const reportedPaise = Math.round(cfOrder.amountRupees * 100);
  if (reportedPaise !== order.amountPaise) {
    console.error(
      `[cashfree-verify] Amount mismatch for order ${order.id}: ` +
      `expected ${order.amountPaise}, Cashfree reports ${reportedPaise}`,
    );
    await prisma.order.update({
      where: { id: order.id },
      data:  { status: 'FAILED', webhookProcessed: true },
    });
    return NextResponse.json({ error: 'Payment amount mismatch.' }, { status: 400 });
  }

  // ── 8. Mark order SUCCESS ─────────────────────────────────────────────────
  if (order.status === 'PENDING') {
    await prisma.order.update({
      where: { id: order.id },
      data:  { status: 'SUCCESS', gatewayPaymentId: `cf_${orderId}` },
    });
  }

  // ── 9. Create entitlements immediately ────────────────────────────────────
  try {
    await createEntitlementsForOrder(order.id);
  } catch (err) {
    console.error('[cashfree-verify] createEntitlementsForOrder failed:', err);
    // Non-fatal — webhook will retry
  }

  return NextResponse.json({ ok: true, redirectTo: '/dashboard?payment=success' });
}
