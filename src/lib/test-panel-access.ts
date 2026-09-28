// src/lib/test-panel-access.ts
//
// Central access check for the Test Panel feature.
//
// A student may access test/exam content if ANY of the following is true:
//   1. Admin (bypass)
//   2. The chapter is free (isFree = true)
//   3. They have a content entitlement for the chapter/subject/class
//      (i.e., checkEntitlement returns allowed = true)
//   4. They have a standalone TEST_PANEL entitlement (plan slug 'test-panel-aed')
//
// This keeps the test panel access decoupled from content access — a student
// can buy tests without buying the video content, or get both.

import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';
import { checkEntitlement } from '@/lib/entitlement';
import type { EntitlementCheckResult } from '@/types/lms';

export type TestPanelAccessResult =
  | { allowed: true;  reason: string }
  | { allowed: false; reason: string };

/**
 * Check whether `clerkUserId` can access the test panel for the given `chapterId`.
 */
export async function checkTestPanelAccess(
  clerkUserId: string | null | undefined,
  chapterId: string,
): Promise<TestPanelAccessResult> {
  if (!clerkUserId) return { allowed: false, reason: 'UNAUTHENTICATED' };

  // Admin bypass
  if (await isAdmin()) return { allowed: true, reason: 'ADMIN' };

  // Check 1: content entitlement (existing logic covers free + paid)
  const contentResult: EntitlementCheckResult = await checkEntitlement(
    clerkUserId, 'CHAPTER', chapterId,
  );
  if (contentResult.allowed) return { allowed: true, reason: contentResult.reason };

  // Check 2: standalone TEST_PANEL entitlement
  const testPanelEnt = await prisma.entitlement.findFirst({
    where: {
      clerkUserId,
      scopeType: 'TEST_PANEL',
      status:    'ACTIVE',
    },
    select: { id: true, isPermanent: true, expiresAt: true, status: true },
  });

  if (testPanelEnt) {
    const isActive =
      testPanelEnt.status === 'ACTIVE' &&
      (testPanelEnt.isPermanent || (testPanelEnt.expiresAt ? testPanelEnt.expiresAt > new Date() : false));

    if (isActive) return { allowed: true, reason: 'TEST_PANEL_ENTITLEMENT' };
  }

  return { allowed: false, reason: 'NO_ENTITLEMENT' };
}
