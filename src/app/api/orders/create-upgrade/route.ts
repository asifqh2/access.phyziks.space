// src/app/api/orders/create-upgrade/route.ts
//
// POST /api/orders/create-upgrade
//
// Creates a discounted Razorpay order for users upgrading from individual
// chapter purchases to full subject access.
//
// Price formula (server-side only — client cannot influence amount):
//   upgrade_price = subject_price - (chapters_in_subject × chapter_price) + 100 fils
//
// Eligibility rules:
//   - User must have 1–7 active CHAPTER entitlements in the given subject
//   - User must NOT already have a SUBJECT or COMPLETE entitlement for that subject
//   - subjectId is required in the request body
//
// Security:
//   - User identity from Clerk auth() — never from request body
//   - All prices read from DB — client cannot influence amount
//   - Chapter count re-counted from DB — client count is ignored

import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';
import { razorpay }     from '@/lib/razorpay';
import { requireUser }  from '@/lib/auth-helpers';

const MAX_CHAPTERS_FOR_UPGRADE = 7;
// +1 AED (100 fils) added to upgrade price as per business rule
const UPGRADE_SURCHARGE_FILS   = 100;

export async function POST(request: Request) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const { userId, error: authError } = await requireUser();
  if (authError) return authError;

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: { subjectId?: string };
  try {
    body = await request.json() as { subjectId?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { subjectId } = body;
  if (!subjectId || typeof subjectId !== 'string') {
    return NextResponse.json({ error: 'subjectId is required.' }, { status: 400 });
  }

  // ── 3. Load plans from DB ─────────────────────────────────────────────────
  const [subjectPlan, chapterPlan, upgradePlan] = await Promise.all([
    prisma.plan.findUnique({ where: { slug: 'subject-aed'          } }),
    prisma.plan.findUnique({ where: { slug: 'chapter-aed'          } }),
    prisma.plan.findUnique({ where: { slug: 'upgrade-subject-aed'  } }),
  ]);

  if (!subjectPlan || !chapterPlan || !upgradePlan) {
    return NextResponse.json(
      { error: 'Upgrade plan configuration is missing. Contact support.' },
      { status: 500 },
    );
  }

  // ── 4. Verify the subject exists ──────────────────────────────────────────
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, name: true, classId: true },
  });
  if (!subject) {
    return NextResponse.json({ error: 'Subject not found.' }, { status: 404 });
  }

  // ── 5. Verify eligibility ─────────────────────────────────────────────────
  // Fetch all active entitlements for this user scoped to this subject.
  const activeEntitlements = await prisma.entitlement.findMany({
    where: { clerkUserId: userId, status: 'ACTIVE' },
    select: { scopeType: true, subjectId: true, chapterId: true },
  });

  // Already has subject or complete access → no upgrade needed
  const alreadyHasBroaderAccess = activeEntitlements.some(
    (e) =>
      (e.scopeType === 'SUBJECT'  && e.subjectId === subjectId) ||
       e.scopeType === 'COMPLETE',
  );
  if (alreadyHasBroaderAccess) {
    return NextResponse.json(
      { error: 'You already have full access to this subject.' },
      { status: 403 },
    );
  }

  // Count chapters purchased specifically in this subject
  // by joining through the chapter's subjectId
  const chaptersInSubject = await prisma.entitlement.findMany({
    where: {
      clerkUserId: userId,
      status:      'ACTIVE',
      scopeType:   'CHAPTER',
      chapter:     { subjectId },
    },
    select: { id: true },
  });

  const chapterCount = chaptersInSubject.length;

  if (chapterCount === 0) {
    return NextResponse.json(
      { error: 'You have no chapter purchases in this subject.' },
      { status: 403 },
    );
  }
  if (chapterCount > MAX_CHAPTERS_FOR_UPGRADE) {
    return NextResponse.json(
      { error: 'Upgrade offer not available — you already own many chapters in this subject.' },
      { status: 403 },
    );
  }

  // ── 6. Compute price ──────────────────────────────────────────────────────
  // subject_price - (N × chapter_price) + 100 fils (AED 1 surcharge)
  const alreadyPaid   = chapterCount * chapterPlan.pricePaise;
  const upgradeFils   = subjectPlan.pricePaise - alreadyPaid + UPGRADE_SURCHARGE_FILS;

  // Safety guard — should never go below surcharge given MAX_CHAPTERS=7
  // (7 × 10000 = 70000 < subject price of 89900, so min = 0 + 100 = 100 fils)
  const finalFils = Math.max(upgradeFils, UPGRADE_SURCHARGE_FILS);

  // ── 7. Create Razorpay order ──────────────────────────────────────────────
  let rzpOrder: { id: string; amount: number | string; currency: string };
  try {
    rzpOrder = await razorpay.orders.create({
      amount:   finalFils,
      currency: 'AED',
      receipt:  `upg_sub_${Date.now()}_${userId.slice(-6)}`,
      notes: {
        planId:       upgradePlan.id,
        subjectId,
        upgradeFrom:  'chapter-purchases',
        chapterCount: String(chapterCount),
        alreadyPaid:  String(alreadyPaid),
      },
    });
  } catch (err) {
    console.error('[orders/create-upgrade] Razorpay order creation failed:', err);
    return NextResponse.json(
      { error: 'Unable to create payment order. Please try again.' },
      { status: 502 },
    );
  }

  // ── 8. Persist pending Order ──────────────────────────────────────────────
  await prisma.order.create({
    data: {
      clerkUserId:    userId,
      planId:         upgradePlan.id,
      subjectId,
      classId:        subject.classId,
      amountPaise:    finalFils,
      currency:       'AED',
      status:         'PENDING',
      gatewayOrderId: rzpOrder.id,
    },
  });

  // ── 9. Return to client ───────────────────────────────────────────────────
  return NextResponse.json({
    razorpayOrderId: rzpOrder.id,
    amount:          finalFils,
    currency:        'AED',
    keyId:           process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? '',
    subjectPrice:    subjectPlan.pricePaise,
    alreadyPaid,
    chapterCount,
  });
}
