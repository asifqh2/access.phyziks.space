// src/app/api/payments/verify/route.ts
//
// POST /api/payments/verify
//
// Called by the Razorpay checkout modal after the user completes payment.
// This route verifies the payment signature, marks the order SUCCESS, and
// creates entitlements immediately so the user lands on the dashboard with
// access already active.
//
// The webhook (/api/webhooks/razorpay) is still the authoritative path for
// production reliability — it handles retries, fires asynchronously, and is
// idempotent. If the webhook fires after this route, createEntitlementsForOrder
// is a no-op because of its orderId idempotency guard.
//
// Security: signature is verified server-side with HMAC. The price and scope
// come from the DB order, never from the client.

import { NextResponse } from 'next/server';
import { verifyOrderSignature } from '@/lib/razorpay';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createEntitlementsForOrder } from '@/lib/entitlement';

export async function POST(request: Request) {
  // ── 1. Authenticate — user must be signed in ──────────────────────────────
  const { userId, error: authError } = await requireUser();
  if (authError) return authError;

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json(
      { error: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.' },
      { status: 400 },
    );
  }

  // ── 3. Verify Razorpay signature ──────────────────────────────────────────
  const valid = verifyOrderSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid payment signature.' }, { status: 400 });
  }

  // ── 4. Find the internal order and verify it belongs to this user ─────────
  // Guards against IDOR — a user cannot verify someone else's order.
  const order = await prisma.order.findUnique({
    where: { gatewayOrderId: razorpay_order_id },
    select: { id: true, clerkUserId: true, status: true },
  });

  if (!order) {
    // Timing edge case — order not found; proceed to dashboard and let webhook handle it
    return NextResponse.json({ ok: true, redirectTo: '/dashboard?payment=success' });
  }

  if (order.clerkUserId !== userId) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // ── 5. Mark order SUCCESS and record payment ID ───────────────────────────
  // Only update if still PENDING — idempotent if webhook already fired first.
  if (order.status === 'PENDING') {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status:           'SUCCESS',
        gatewayPaymentId: razorpay_payment_id,
      },
    });
  }

  // ── 6. Create entitlements immediately ───────────────────────────────────
  // createEntitlementsForOrder is idempotent — safe to call even if the
  // webhook already ran and created the entitlement first.
  try {
    await createEntitlementsForOrder(order.id);
  } catch (err) {
    // Log but don't fail the response — the user paid successfully.
    // The webhook will retry entitlement creation if needed.
    console.error('[payments/verify] createEntitlementsForOrder failed:', err);
  }

  // ── 7. Return redirect target ─────────────────────────────────────────────
  return NextResponse.json({ ok: true, redirectTo: '/dashboard?payment=success' });
}
