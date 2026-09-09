// src/app/api/entitlements/mine/route.ts
//
// GET /api/entitlements/mine
//
// Returns all active entitlements for the authenticated user.
// Used by the dashboard to render "My Courses" and expiry information.
// Only returns entitlements belonging to the calling user — no userId
// parameter is accepted from the client.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import type { MyEntitlementItem } from '@/types/lms';

export async function GET() {
  const { userId, error: authError } = await requireUser();
  if (authError) return authError;

  // Fetch all non-revoked entitlements for this user, including related data
  const entitlements = await prisma.entitlement.findMany({
    where: {
      clerkUserId: userId,
      status: { in: ['ACTIVE', 'EXPIRED'] }, // include EXPIRED so dashboard can show "access expired"
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      scopeType: true,
      isPermanent: true,
      expiresAt: true,
      status: true,
      plan: {
        select: { name: true, slug: true },
      },
      class: {
        select: { id: true, name: true },
      },
      subject: {
        select: { id: true, name: true },
      },
      chapter: {
        select: { id: true, name: true },
      },
    },
  });

  // Re-check expiry in real time (in case the cron job hasn't run yet)
  const now = new Date();
  const items: MyEntitlementItem[] = entitlements.map((e) => {
    const isExpiredNow =
      !e.isPermanent && e.expiresAt != null && e.expiresAt <= now;

    return {
      id: e.id,
      scopeType: e.scopeType as MyEntitlementItem['scopeType'],
      isPermanent: e.isPermanent,
      expiresAt: e.expiresAt ? e.expiresAt.toISOString() : null,
      status: isExpiredNow ? 'EXPIRED' : (e.status as MyEntitlementItem['status']),
      plan: e.plan,
      class: e.class,
      subject: e.subject,
      chapter: e.chapter,
    };
  });

  return NextResponse.json(items);
}
