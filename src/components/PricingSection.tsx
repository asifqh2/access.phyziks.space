// src/components/PricingSection.tsx
//
// Server component — fetches active AED plans from the database and passes
// them to PricingCardsClient for rendering.
//
// All prices are in AED (UAE dirhams). Payment is via Stripe.

import { prisma } from '@/lib/prisma';
import PricingCardsClient from '@/components/PricingCardsClient';
import type { PlanData } from '@/types/lms';

interface PricingSectionProps {
  showClassTabs?: boolean;
}

export default async function PricingSection({ showClassTabs = false }: PricingSectionProps) {
  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
      currency: 'AED',
    },
    orderBy: [{ pricePaise: 'asc' }],
    select: {
      id:           true,
      name:         true,
      slug:         true,
      scopeType:    true,
      pricePaise:   true,
      currency:     true,
      durationDays: true,
      isPermanent:  true,
      description:  true,
      metadata:     true,
    },
  });

  return (
    <PricingCardsClient
      plans={plans.map((p) => ({
        ...p,
        metadata: p.metadata as PlanData['metadata'],
      }))}
      showClassTabs={showClassTabs}
    />
  );
}
