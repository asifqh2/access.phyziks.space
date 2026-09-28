// src/app/api/admin/plans/route.ts
//
// GET  /api/admin/plans        — list all plans
// POST /api/admin/plans        — create a new plan
//
// All endpoints require admin authorization via ADMIN_CLERK_USER_IDS env var.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';
import { Prisma } from '../../../../../generated/prisma/client';
import type { CreatePlanRequest } from '@/types/lms';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const plans = await prisma.plan.findMany({
    orderBy: [{ scopeType: 'asc' }, { pricePaise: 'asc' }],
    include: {
      _count: { select: { orders: true, entitlements: true } },
    },
  });

  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: CreatePlanRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { name, slug, scopeType, pricePaise, currency, durationDays, isPermanent, isActive, description, metadata } = body;

  // Validate required fields
  if (!name || !slug || !scopeType || pricePaise == null || isPermanent == null) {
    return NextResponse.json(
      { error: 'name, slug, scopeType, pricePaise, and isPermanent are required.' },
      { status: 400 },
    );
  }

  const validScopes = ['CHAPTER', 'SUBJECT', 'COMPLETE', 'CONFIGURABLE', 'CHAPTER_COMBO'];
  if (!validScopes.includes(scopeType)) {
    return NextResponse.json({ error: `scopeType must be one of: ${validScopes.join(', ')}` }, { status: 400 });
  }

  if (typeof pricePaise !== 'number' || pricePaise < 0) {
    return NextResponse.json({ error: 'pricePaise must be a non-negative integer.' }, { status: 400 });
  }

  // Validate slug uniqueness
  const existing = await prisma.plan.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: `A plan with slug "${slug}" already exists.` }, { status: 409 });
  }

  const plan = await prisma.plan.create({
    data: {
      name,
      slug,
      scopeType,
      pricePaise,
      currency: currency ?? 'INR',
      durationDays: durationDays ?? null,
      isPermanent,
      isActive: isActive ?? true,
      description: description ?? null,
      metadata: metadata != null ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
