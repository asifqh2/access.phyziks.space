// src/app/api/orders/create/route.ts
//
// Creates a pending Order in the database and a gateway order.
// Supports Razorpay (default) and Cashfree.
//
// Security guarantees:
//   - User identity comes from Clerk server-side auth(), never from the request body.
//   - Price comes from the Plan row in the database, never from the client.
//   - Scope (chapterId / subjectId / chapterIds) is validated against the plan's scopeType.
//
// Response shape (Razorpay):
//   { gateway:'razorpay', razorpayOrderId, amount, currency, keyId }
//
// Response shape (Cashfree):
//   { gateway:'cashfree', cfOrderId, paymentSessionId, orderId, amount, currency, appId }
//
// The client uses these to open the respective SDK checkout.
// After payment, the client calls:
//   Razorpay  → POST /api/payments/verify
//   Cashfree  → POST /api/payments/cashfree-verify

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRazorpayClient } from '@/lib/razorpay';
import { createCashfreeOrder } from '@/lib/cashfree';
import { requireUser } from '@/lib/auth-helpers';
import { clerkClient } from '@clerk/nextjs/server';
import { Prisma } from '../../../../../generated/prisma/client';
import type { CreateOrderRequest } from '@/types/lms';

export async function POST(request: Request) {
  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const { userId, error: authError } = await requireUser();
  if (authError) return authError;

  // ── 2. Parse and validate request body ────────────────────────────────────
  let body: CreateOrderRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { planId, chapterId, subjectId, chapterIds, classId, gateway = 'razorpay', customerPhone } = body;

  if (!planId || typeof planId !== 'string') {
    return NextResponse.json({ error: 'planId is required.' }, { status: 400 });
  }

  // ── 3. Load plan from DB ───────────────────────────────────────────────────
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
  }
  if (!plan.isActive) {
    return NextResponse.json({ error: 'This plan is not currently available.' }, { status: 400 });
  }

  // ── 4. Validate scope matches plan type ────────────────────────────────────
  let resolvedChapterId: string | null = null;
  let resolvedSubjectId: string | null = null;
  let resolvedClassId:   string | null = null;
  let orderMetadata:     Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;

  if (plan.scopeType === 'CHAPTER') {
    if (!chapterId || typeof chapterId !== 'string') {
      return NextResponse.json(
        { error: 'chapterId is required for a chapter plan.' },
        { status: 400 },
      );
    }
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { subject: { include: { class: true } } },
    });
    if (!chapter || !chapter.isActive) {
      return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
    }
    resolvedChapterId = chapter.id;
    resolvedSubjectId = chapter.subjectId;
    resolvedClassId   = chapter.subject.classId;

  } else if (plan.scopeType === 'SUBJECT') {
    if (!subjectId || typeof subjectId !== 'string') {
      return NextResponse.json(
        { error: 'subjectId is required for a subject plan.' },
        { status: 400 },
      );
    }
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { class: true },
    });
    if (!subject || !subject.isActive) {
      return NextResponse.json({ error: 'Subject not found.' }, { status: 404 });
    }
    resolvedSubjectId = subject.id;
    resolvedClassId   = subject.classId;

  } else if (plan.scopeType === 'CHAPTER_COMBO') {
    const planMeta      = plan.metadata as Record<string, unknown> | null;
    const requiredCount = typeof planMeta?.chapterCount === 'number' ? planMeta.chapterCount : 5;

    if (!subjectId || typeof subjectId !== 'string') {
      return NextResponse.json(
        { error: 'subjectId is required for a chapter combo plan.' },
        { status: 400 },
      );
    }
    if (!Array.isArray(chapterIds) || chapterIds.length !== requiredCount) {
      return NextResponse.json(
        { error: `Exactly ${requiredCount} chapterIds are required for this plan.` },
        { status: 400 },
      );
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { class: true },
    });
    if (!subject || !subject.isActive) {
      return NextResponse.json({ error: 'Subject not found.' }, { status: 404 });
    }

    const chapters = await prisma.chapter.findMany({
      where: { id: { in: chapterIds }, subjectId, isActive: true },
      select: { id: true },
    });
    if (chapters.length !== requiredCount) {
      return NextResponse.json(
        { error: 'One or more selected chapters are invalid or do not belong to the chosen subject.' },
        { status: 400 },
      );
    }

    resolvedSubjectId = subject.id;
    resolvedClassId   = subject.classId;
    orderMetadata     = { chapterIds } as Prisma.InputJsonValue;
  }

  if (plan.scopeType === 'COMPLETE') {
    if (!classId || typeof classId !== 'string') {
      return NextResponse.json(
        { error: 'classId is required for the Complete Class Package.' },
        { status: 400 },
      );
    }
    const lmsClass = await prisma.lmsClass.findUnique({ where: { id: classId } });
    if (!lmsClass || !lmsClass.isActive) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    }
    resolvedClassId = lmsClass.id;
  }

  const receipt = `rcpt_${Date.now()}_${userId.slice(-6)}`;

  // ── 5a. Razorpay path ──────────────────────────────────────────────────────
  if (gateway === 'razorpay') {
    let rzpOrder: { id: string; amount: number | string; currency: string };
    try {
      rzpOrder = await getRazorpayClient().orders.create({
        amount:   plan.pricePaise,
        currency: plan.currency || 'INR',
        receipt,
        notes: {
          planId,
          ...(resolvedClassId   ? { classId:   resolvedClassId   } : {}),
          ...(resolvedSubjectId ? { subjectId: resolvedSubjectId } : {}),
          ...(resolvedChapterId ? { chapterId: resolvedChapterId } : {}),
        },
      });
    } catch (err) {
      console.error('[orders/create] Razorpay order creation failed:', err);
      return NextResponse.json(
        { error: 'Unable to create payment order. Please try again.' },
        { status: 502 },
      );
    }

    await prisma.order.create({
      data: {
        clerkUserId:    userId,
        planId:         plan.id,
        classId:        resolvedClassId,
        subjectId:      resolvedSubjectId,
        chapterId:      resolvedChapterId,
        metadata:       orderMetadata,
        amountPaise:    plan.pricePaise,
        currency:       plan.currency || 'INR',
        status:         'PENDING',
        gatewayOrderId: rzpOrder.id,
      },
    });

    return NextResponse.json({
      gateway:         'razorpay',
      razorpayOrderId: rzpOrder.id,
      amount:          rzpOrder.amount,
      currency:        rzpOrder.currency,
      keyId:           process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? '',
    });
  }

  // ── 5b. Cashfree path ──────────────────────────────────────────────────────
  // Fetch user details from Clerk for Cashfree customer info
  let customerName  = 'Customer';
  let customerEmail = '';
  let customerPhoneResolved = customerPhone ?? '9999999999';

  try {
    const clerk = await clerkClient();
    const user  = await clerk.users.getUser(userId);
    customerName  = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Customer';
    customerEmail = user.emailAddresses[0]?.emailAddress ?? '';
    if (!customerPhone && user.phoneNumbers[0]?.phoneNumber) {
      customerPhoneResolved = user.phoneNumbers[0].phoneNumber;
    }
  } catch {
    // Non-fatal — Cashfree allows placeholder values
  }

  // Derive the app origin from the incoming request so the return URL always
  // points back to the domain the user is on (cbse.phyziks.space, localhost, etc.)
  const requestOrigin = new URL(request.url).origin;
  const returnUrl     = `${requestOrigin}/dashboard?payment=success&order_id={order_id}`;

  let cfResult: Awaited<ReturnType<typeof createCashfreeOrder>>;
  try {
    cfResult = await createCashfreeOrder({
      orderId:       receipt,
      amountPaise:   plan.pricePaise,
      currency:      plan.currency || 'INR',
      customerName,
      customerEmail,
      customerPhone: customerPhoneResolved,
      returnUrl,
    });
  } catch (err) {
    console.error('[orders/create] Cashfree order creation failed:', err);
    return NextResponse.json(
      { error: 'Unable to create Cashfree payment order. Please try again.' },
      { status: 502 },
    );
  }

  // Store cfOrderId as gatewayOrderId so webhook lookup works
  await prisma.order.create({
    data: {
      clerkUserId:    userId,
      planId:         plan.id,
      classId:        resolvedClassId,
      subjectId:      resolvedSubjectId,
      chapterId:      resolvedChapterId,
      metadata:       orderMetadata,
      amountPaise:    plan.pricePaise,
      currency:       plan.currency || 'INR',
      status:         'PENDING',
      gatewayOrderId: receipt,   // use our receipt as the lookup key
    },
  });

  return NextResponse.json({
    gateway:          'cashfree',
    cfOrderId:        cfResult.cfOrderId,
    paymentSessionId: cfResult.paymentSessionId,
    orderId:          receipt,
    amount:           plan.pricePaise,
    currency:         plan.currency || 'INR',
    appId:            process.env.CASHFREE_APP_ID ?? '',
  });
}
