// src/lib/content-access.ts
//
// Access check for the JSON-based blog/post content system.
//
// These posts predate the DB-backed LMS hierarchy (Chapter/Subject/Entitlement).
// They carry a legacy `requiredPlan` string field ('free' | 'pro' | 'premium').
//
// Migration path:
//   When a post is linked to a real Chapter/Subject DB record, use AccessGate
//   or checkEntitlement() directly with the chapter/subject ID instead.
//
// Current behaviour for posts with requiredPlan !== 'free':
//   The new entitlement system doesn't have a direct mapping from the old
//   plan slugs to DB plans. Rather than silently deny all access (breaking
//   existing paying users) or silently grant all access (insecure), we check
//   whether the authenticated user has ANY active entitlement in the new system.
//   If yes → grant access (they are a paying user).
//   If no  → deny and redirect to /pricing.
//
//   This is intentionally permissive during the migration window. Once all
//   posts are migrated to reference Chapter/Subject IDs, delete this file.

import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// ─────────────────────────────────────────────────────────────────────────────
// canCurrentUserAccessContent
// ─────────────────────────────────────────────────────────────────────────────
// Returns true when:
//   - The content is free (requiredPlan is falsy or 'free')
//   - OR the user is authenticated AND has at least one ACTIVE entitlement
//     in the new system (i.e., they are a current paying subscriber).
//
// Returns false when:
//   - The content is paid and the user is not signed in.
//   - The content is paid and the user has no active entitlements.

export async function canCurrentUserAccessContent(
  requiredPlan: string | undefined | null,
): Promise<boolean> {
  // Free content is always accessible
  if (!requiredPlan || requiredPlan === 'free') return true;

  // Paid content requires authentication
  const { userId } = await auth();
  if (!userId) return false;

  // Check if the user has any active entitlement in the new system.
  // Uses the correct Prisma model name — the old paymentEntitlement table has
  // been renamed to LegacyPaymentEntitlement and should not be queried here.
  const activeEntitlement = await prisma.entitlement.findFirst({
    where: {
      clerkUserId: userId,
      status: 'ACTIVE',
      OR: [
        { isPermanent: true },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: { id: true },
  });

  return activeEntitlement !== null;
}
