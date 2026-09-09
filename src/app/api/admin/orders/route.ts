// src/app/api/admin/orders/route.ts
//
// GET /api/admin/orders
//   Query params:
//     status   — filter by OrderStatus (e.g. ?status=SUCCESS)
//     userId   — filter by Clerk user ID
//     planId   — filter by plan
//     page     — page number (default 1)
//     pageSize — records per page (default 50, max 200)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status   = searchParams.get('status')   ?? undefined;
  const userId   = searchParams.get('userId')   ?? undefined;
  const planId   = searchParams.get('planId')   ?? undefined;
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10)));

  const validStatuses = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter.' }, { status: 400 });
  }

  const where = {
    ...(status   && { status:      status as never }),
    ...(userId   && { clerkUserId: userId }),
    ...(planId   && { planId }),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        plan:    { select: { name: true, slug: true, scopeType: true } },
        class:   { select: { name: true } },
        subject: { select: { name: true } },
        chapter: { select: { name: true } },
        entitlements: {
          select: { id: true, status: true, isPermanent: true, expiresAt: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    data: orders,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}
