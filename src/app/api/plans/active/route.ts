// src/app/api/plans/active/route.ts
//
// GET /api/plans/active
//
// Returns all active plans from the database.
// Public endpoint — no authentication required (plan data is not sensitive).
// Used by PricingSection (client component) to fetch real DB plan IDs and
// prices so PaymentButton receives accurate PlanData instead of hardcoded slugs.
//
// Security notes:
//   - Only isActive=true plans are returned.
//   - No private fields (internal DB details) are exposed.
//   - Prices come from the DB — they cannot be manipulated by the client.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: [{ scopeType: 'asc' }, { pricePaise: 'asc' }],
    select: {
      id:          true,
      name:        true,
      slug:        true,
      scopeType:   true,
      pricePaise:  true,
      currency:    true,
      durationDays: true,
      isPermanent: true,
      description: true,
      // metadata intentionally omitted — may contain internal admin notes
    },
  });

  return NextResponse.json(plans);
}
