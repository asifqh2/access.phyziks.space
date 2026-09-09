// src/app/api/admin/plans/[id]/route.ts
//
// GET    /api/admin/plans/:id  — get a single plan with package items
// PUT    /api/admin/plans/:id  — update plan fields
// DELETE /api/admin/plans/:id  — soft-delete (sets isActive=false)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';
import { Prisma } from '../../../../../../generated/prisma/client';
import type { UpdatePlanRequest } from '@/types/lms';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      completePackageItems: {
        include: {
          class: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          chapter: { select: { id: true, name: true } },
        },
      },
      _count: { select: { orders: true, entitlements: true } },
    },
  });

  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  let body: UpdatePlanRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });

  // Validate slug uniqueness if being changed
  if (body.slug && body.slug !== plan.slug) {
    const conflict = await prisma.plan.findUnique({ where: { slug: body.slug } });
    if (conflict) {
      return NextResponse.json(
        { error: `A plan with slug "${body.slug}" already exists.` },
        { status: 409 },
      );
    }
  }

  const validScopes = ['CHAPTER', 'SUBJECT', 'COMPLETE', 'CONFIGURABLE', 'CHAPTER_COMBO'];
  if (body.scopeType && !validScopes.includes(body.scopeType)) {
    return NextResponse.json({ error: `Invalid scopeType.` }, { status: 400 });
  }

  const updated = await prisma.plan.update({
    where: { id },
    data: {
      ...(body.name        != null && { name:        body.name }),
      ...(body.slug        != null && { slug:        body.slug }),
      ...(body.scopeType   != null && { scopeType:   body.scopeType }),
      ...(body.pricePaise  != null && { pricePaise:  body.pricePaise }),
      ...(body.currency    != null && { currency:    body.currency }),
      ...(body.isPermanent != null && { isPermanent: body.isPermanent }),
      ...(body.isActive    != null && { isActive:    body.isActive }),
      ...(body.description != null && { description: body.description }),
      ...(body.metadata    != null && { metadata: body.metadata as Prisma.InputJsonValue }),
      // durationDays can be set to null (permanent) or a number
      ...('durationDays' in body && { durationDays: body.durationDays ?? null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });

  // Check if any active orders reference this plan before deactivating
  const activeOrders = await prisma.order.count({
    where: { planId: id, status: { in: ['PENDING', 'SUCCESS'] } },
  });

  if (activeOrders > 0) {
    // Soft-delete only — cannot hard-delete plans with orders
    await prisma.plan.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({
      message: `Plan deactivated. ${activeOrders} order(s) reference this plan; hard delete is not permitted.`,
    });
  }

  await prisma.plan.delete({ where: { id } });
  return NextResponse.json({ message: 'Plan deleted.' });
}
