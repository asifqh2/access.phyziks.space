// src/app/api/admin/entitlements/route.ts
//
// GET  /api/admin/entitlements  — list entitlements with filters
// POST /api/admin/entitlements  — manually grant an entitlement (admin override)
//
// Manual grants create a synthetic Order with status=SUCCESS so the data
// model remains consistent (every entitlement has an order).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';
import type { GrantEntitlementRequest } from '@/types/lms';

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const userId    = searchParams.get('userId')    ?? undefined;
  const status    = searchParams.get('status')    ?? undefined;
  const scopeType = searchParams.get('scopeType') ?? undefined;
  const page      = Math.max(1, parseInt(searchParams.get('page')     ?? '1',  10));
  const pageSize  = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10)));

  const where = {
    ...(userId    && { clerkUserId: userId }),
    ...(status    && { status:      status as never }),
    ...(scopeType && { scopeType:   scopeType as never }),
  };

  const [total, entitlements] = await Promise.all([
    prisma.entitlement.count({ where }),
    prisma.entitlement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        plan:    { select: { name: true, slug: true } },
        class:   { select: { name: true } },
        subject: { select: { name: true } },
        chapter: { select: { name: true } },
        order:   { select: { gatewayOrderId: true, status: true, amountPaise: true } },
      },
    }),
  ]);

  return NextResponse.json({
    data: entitlements,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(request: Request) {
  const { userId: adminId, error } = await requireAdmin();
  if (error) return error;

  let body: GrantEntitlementRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { clerkUserId, planId, scopeType, classId, subjectId, chapterId, isPermanent, durationDays, note } = body;

  if (!clerkUserId || !planId || !scopeType || isPermanent == null) {
    return NextResponse.json(
      { error: 'clerkUserId, planId, scopeType, and isPermanent are required.' },
      { status: 400 },
    );
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });

  const now = new Date();
  const expiresAt = isPermanent
    ? null
    : durationDays
    ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
    : null;

  // Create a synthetic order so the FK constraint is satisfied
  const syntheticOrder = await prisma.order.create({
    data: {
      clerkUserId,
      planId,
      classId:    classId    ?? null,
      subjectId:  subjectId  ?? null,
      chapterId:  chapterId  ?? null,
      amountPaise: 0,  // admin grant — no charge
      currency: plan.currency,
      status: 'SUCCESS',
      gatewayOrderId: `admin_grant_${Date.now()}_${adminId}`,
      gatewayPaymentId: `admin_grant_by_${adminId}`,
      webhookProcessed: true,
    },
  });

  const entitlement = await prisma.entitlement.create({
    data: {
      clerkUserId,
      orderId:    syntheticOrder.id,
      planId,
      scopeType,
      classId:    classId    ?? null,
      subjectId:  subjectId  ?? null,
      chapterId:  chapterId  ?? null,
      startsAt:   now,
      expiresAt,
      isPermanent,
      status: 'ACTIVE',
    },
    include: {
      plan:    { select: { name: true } },
      subject: { select: { name: true } },
      chapter: { select: { name: true } },
    },
  });

  // Store admin note in order metadata if provided
  if (note) {
    await prisma.order.update({
      where: { id: syntheticOrder.id },
      // metadata is not on Order model — store note as a comment via update
      // We use gatewayPaymentId field as an audit note since it's freeform
      data: { gatewayPaymentId: `admin_grant_by_${adminId}: ${note}` },
    });
  }

  return NextResponse.json(entitlement, { status: 201 });
}
