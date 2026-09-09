// src/lib/entitlement.ts
//
// CENTRAL AUTHORIZATION SERVICE
// ─────────────────────────────────────────────────────────────────────────────
// This is the single source of truth for paid-content access decisions.
// ALL server-side authorization for paid content MUST go through these
// functions. Never duplicate this logic in pages or API routes.
//
// Principle:
//   Clerk  → proves WHO the user is (authentication)
//   This   → proves WHAT the user may access (authorization)
//
// Access policy:
//   All paid plans grant 12 months (365 days) of access from purchase date.
//   After 12 months the entitlement expires, access is blocked, and the
//   entitlement + order records are hard-deleted by the nightly cron job.
//   The user must purchase again to regain access.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';
import type {
  EntitlementCheckResult,
  EntitlementAllowReason,
  EntitlementDenyReason,
} from '@/types/lms';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Build a "denied" result with consistent shape */
function deny(reason: EntitlementDenyReason): EntitlementCheckResult {
  return { allowed: false, reason, entitlementId: null, expiresAt: null, isPermanent: false };
}

/** Build an "allowed" result */
function allow(
  reason: EntitlementAllowReason,
  entitlementId: string,
  expiresAt: Date | null,
  isPermanent: boolean,
): EntitlementCheckResult {
  return { allowed: true, reason, entitlementId, expiresAt, isPermanent };
}

/** Returns true when an entitlement row is currently valid */
function isEntitlementActive(e: {
  status: string;
  isPermanent: boolean;
  expiresAt: Date | null;
}): boolean {
  if (e.status !== 'ACTIVE') return false;
  if (e.isPermanent) return true;
  if (!e.expiresAt) return false; // misconfigured — treat as inactive
  return e.expiresAt > new Date();
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS_DURATION_DAYS
// ─────────────────────────────────────────────────────────────────────────────
// All paid plan purchases grant exactly 12 months of access (365 days).
// isPermanent is never set to true for paid plans.
export const ACCESS_DURATION_DAYS = 365;

// ─────────────────────────────────────────────────────────────────────────────
// checkEntitlement
// ─────────────────────────────────────────────────────────────────────────────
//
// Generic entitlement check.
// resourceType = 'CHAPTER' | 'SUBJECT'
// resourceId   = the chapter/subject DB id
//
// Resolution order (first match wins):
//   1. Content is free (Chapter.isFree)
//   2. COMPLETE entitlement that covers this resource (time-limited)
//   3. SUBJECT entitlement matching the subject (time-limited)
//   4. CHAPTER entitlement matching the chapter (time-limited)
//   5. EXPIRED entitlement found (user had access, now lapsed)
//   6. No entitlement at all

export async function checkEntitlement(
  clerkUserId: string | null | undefined,
  resourceType: 'CHAPTER' | 'SUBJECT',
  resourceId: string,
): Promise<EntitlementCheckResult> {
  // ── 1. Authentication check ───────────────────────────────────────────────
  if (!clerkUserId) return deny('UNAUTHENTICATED');

  // ── 2. Admin bypass — admins have permanent access to all content ─────────
  if (await isAdmin()) return allow('FREE', 'admin', null, true);

  // ── 2. Free-content check ─────────────────────────────────────────────────
  if (resourceType === 'CHAPTER') {
    const chapter = await prisma.chapter.findUnique({
      where: { id: resourceId },
      select: { isFree: true, subjectId: true },
    });
    if (!chapter) return deny('NO_ENTITLEMENT');
    if (chapter.isFree) {
      return allow('FREE', 'free', null, true);
    }
    return checkChapterAccess(clerkUserId, resourceId, chapter.subjectId);
  }

  if (resourceType === 'SUBJECT') {
    return checkSubjectAccess(clerkUserId, resourceId);
  }

  return deny('NO_ENTITLEMENT');
}

// ─────────────────────────────────────────────────────────────────────────────
// checkChapterAccess  (internal)
// ─────────────────────────────────────────────────────────────────────────────

async function checkChapterAccess(
  clerkUserId: string,
  chapterId: string,
  subjectId: string,
): Promise<EntitlementCheckResult> {
  // Single query: fetch ACTIVE + REVOKED in one round-trip.
  // This eliminates the second DB call that previously checked for revoked rows.
  const entitlements = await prisma.entitlement.findMany({
    where: {
      clerkUserId,
      status: { in: ['ACTIVE', 'REVOKED'] },
    },
    select: {
      id:          true,
      scopeType:   true,
      chapterId:   true,
      subjectId:   true,
      isPermanent: true,
      expiresAt:   true,
      status:      true,
      plan: {
        select: {
          completePackageItems: {
            where: {
              OR: [
                { chapterId },
                { subjectId },
              ],
            },
            select: { id: true },
          },
        },
      },
    },
  });

  // Separate revoked rows out immediately so the priority loop is clean
  const revokedExists = entitlements.some((e) => e.status === 'REVOKED');
  const active = entitlements.filter((e) => e.status === 'ACTIVE');

  let hadExpiredEntitlement = false;

  // ── Priority 1: COMPLETE entitlement covering this chapter/subject ──────
  for (const e of active) {
    if (e.scopeType === 'COMPLETE') {
      if (!isEntitlementActive(e)) { hadExpiredEntitlement = true; continue; }
      if ((e.plan.completePackageItems ?? []).length > 0) {
        return allow('COMPLETE_ENTITLEMENT', e.id, e.expiresAt, false);
      }
    }
  }

  // ── Priority 2: SUBJECT entitlement (time-limited) ───────────────────────
  for (const e of active) {
    if (e.scopeType === 'SUBJECT' && e.subjectId === subjectId) {
      if (!isEntitlementActive(e)) { hadExpiredEntitlement = true; continue; }
      return allow('SUBJECT_TEMPORARY', e.id, e.expiresAt, false);
    }
  }

  // ── Priority 3: CHAPTER entitlement (time-limited) ───────────────────────
  for (const e of active) {
    if (e.scopeType === 'CHAPTER' && e.chapterId === chapterId) {
      if (!isEntitlementActive(e)) { hadExpiredEntitlement = true; continue; }
      return allow('CHAPTER_TEMPORARY', e.id, e.expiresAt, false);
    }
  }

  // ── Deny with correct reason ──────────────────────────────────────────────
  if (revokedExists)           return deny('ENTITLEMENT_REVOKED');
  if (hadExpiredEntitlement)   return deny('ENTITLEMENT_EXPIRED');
  return deny('NO_ENTITLEMENT');
}

// ─────────────────────────────────────────────────────────────────────────────
// checkSubjectAccess  (internal)
// ─────────────────────────────────────────────────────────────────────────────

async function checkSubjectAccess(
  clerkUserId: string,
  subjectId: string,
): Promise<EntitlementCheckResult> {
  // Single query covers ACTIVE + REVOKED — no second round-trip needed.
  const entitlements = await prisma.entitlement.findMany({
    where: { clerkUserId, status: { in: ['ACTIVE', 'REVOKED'] } },
    select: {
      id:          true,
      scopeType:   true,
      subjectId:   true,
      isPermanent: true,
      expiresAt:   true,
      status:      true,
      plan: {
        select: {
          completePackageItems: {
            where: { subjectId },
            select: { id: true },
          },
        },
      },
    },
  });

  const revokedExists = entitlements.some((e) => e.status === 'REVOKED');
  const active = entitlements.filter((e) => e.status === 'ACTIVE');
  let hadExpiredEntitlement = false;

  for (const e of active) {
    if (e.scopeType === 'COMPLETE') {
      if (!isEntitlementActive(e)) { hadExpiredEntitlement = true; continue; }
      if ((e.plan.completePackageItems ?? []).length > 0) {
        return allow('COMPLETE_ENTITLEMENT', e.id, e.expiresAt, false);
      }
    }
  }

  for (const e of active) {
    if (e.scopeType === 'SUBJECT' && e.subjectId === subjectId) {
      if (!isEntitlementActive(e)) { hadExpiredEntitlement = true; continue; }
      return allow('SUBJECT_TEMPORARY', e.id, e.expiresAt, false);
    }
  }

  if (revokedExists)         return deny('ENTITLEMENT_REVOKED');
  if (hadExpiredEntitlement) return deny('ENTITLEMENT_EXPIRED');
  return deny('NO_ENTITLEMENT');
}

// ─────────────────────────────────────────────────────────────────────────────
// canAccessChapter / canAccessSubject  (convenience wrappers)
// ─────────────────────────────────────────────────────────────────────────────

export async function canAccessChapter(
  clerkUserId: string | null | undefined,
  chapterId: string,
): Promise<EntitlementCheckResult> {
  return checkEntitlement(clerkUserId, 'CHAPTER', chapterId);
}

export async function canAccessSubject(
  clerkUserId: string | null | undefined,
  subjectId: string,
): Promise<EntitlementCheckResult> {
  return checkEntitlement(clerkUserId, 'SUBJECT', subjectId);
}

// ─────────────────────────────────────────────────────────────────────────────
// createEntitlementsForOrder
// ─────────────────────────────────────────────────────────────────────────────
// Called ONLY from the webhook handler after payment is confirmed.
// Creates the correct Entitlement row(s) for the order's plan.

export async function createEntitlementsForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      plan: {
        include: {
          completePackageItems: true,
        },
      },
    },
  });

  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.status !== 'SUCCESS') {
    throw new Error(`Order ${orderId} is not SUCCESS (${order.status})`);
  }

  const { plan } = order;
  const now = new Date();
  // All paid plans grant exactly 12 months (365 days) of access.
  // isPermanent is never set — users must repurchase after expiry.
  const expiresAt = new Date(now.getTime() + ACCESS_DURATION_DAYS * 24 * 60 * 60 * 1000);

  // Idempotency: if entitlements already exist for this order, skip
  const existing = await prisma.entitlement.findFirst({
    where: { orderId },
  });
  if (existing) return;

  switch (plan.scopeType) {
    case 'CHAPTER': {
      if (!order.chapterId) throw new Error(`Order ${orderId} is CHAPTER plan but has no chapterId`);
      // Get the chapter's subjectId for the index
      const chapter = await prisma.chapter.findUnique({
        where: { id: order.chapterId },
        select: { subjectId: true },
      });
      await prisma.entitlement.create({
        data: {
          clerkUserId: order.clerkUserId,
          orderId,
          planId: plan.id,
          scopeType: 'CHAPTER',
          chapterId: order.chapterId,
          subjectId: chapter?.subjectId ?? null,
          startsAt: now,
          expiresAt,
          isPermanent: false,
          status: 'ACTIVE',
        },
      });
      break;
    }

    case 'CHAPTER_COMBO': {
      // Create one CHAPTER entitlement per selected chapter stored in order.metadata.chapterIds
      const meta = order.metadata as Record<string, unknown> | null;
      const ids: string[] = Array.isArray(meta?.chapterIds) ? (meta.chapterIds as string[]) : [];
      if (ids.length === 0) throw new Error(`Order ${orderId} is CHAPTER_COMBO but has no chapterIds in metadata`);

      await prisma.entitlement.createMany({
        data: ids.map((cid) => ({
          clerkUserId: order.clerkUserId,
          orderId,
          planId: plan.id,
          scopeType: 'CHAPTER' as const,
          chapterId: cid,
          subjectId: order.subjectId ?? null,
          startsAt: now,
          expiresAt,
          isPermanent: false,
          status: 'ACTIVE' as const,
        })),
        skipDuplicates: true,
      });
      break;
    }

    case 'SUBJECT': {
      if (!order.subjectId) throw new Error(`Order ${orderId} is SUBJECT plan but has no subjectId`);      await prisma.entitlement.create({
        data: {
          clerkUserId: order.clerkUserId,
          orderId,
          planId: plan.id,
          scopeType: 'SUBJECT',
          subjectId: order.subjectId,
          startsAt: now,
          expiresAt,
          isPermanent: false,
          status: 'ACTIVE',
        },
      });
      break;
    }

    case 'COMPLETE':
    case 'CONFIGURABLE': {
      // One COMPLETE-scoped entitlement; CompletePackageItems define the coverage.
      // classId is stored so the dashboard can show which class the user purchased.
      await prisma.entitlement.create({
        data: {
          clerkUserId: order.clerkUserId,
          orderId,
          planId:      plan.id,
          scopeType:   'COMPLETE',
          classId:     order.classId ?? null,
          startsAt:    now,
          expiresAt,
          isPermanent: false,
          status:      'ACTIVE',
        },
      });
      break;
    }

    case 'TEST_PANEL': {
      // A single global TEST_PANEL entitlement — covers all chapters on the platform.
      await prisma.entitlement.create({
        data: {
          clerkUserId: order.clerkUserId,
          orderId,
          planId:      plan.id,
          scopeType:   'TEST_PANEL',
          startsAt:    now,
          expiresAt,
          isPermanent: false,
          status:      'ACTIVE',
        },
      });
      break;
    }

    default:
      throw new Error(`Unknown plan scopeType: ${plan.scopeType}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// purgeExpiredEntitlements
// ─────────────────────────────────────────────────────────────────────────────
// Called from the nightly cron job.
//
// Step 1: Find all entitlements that have passed their expiresAt date.
// Step 2: Hard-delete those entitlement rows.
// Step 3: Hard-delete the associated Order rows so payment history is erased.
//         Only orders whose ALL entitlements have been deleted are removed
//         (guards against partial-combo edge cases).
//
// Returns the count of entitlements deleted.
//
// NOTE: The real-time isEntitlementActive() guard in checkEntitlement already
// blocks access as soon as expiresAt passes, so access is denied even before
// this job runs. This job cleans up the data entirely.

export async function purgeExpiredEntitlements(): Promise<{ entitlements: number; orders: number }> {
  const now = new Date();

  // ── 1. Find all expired entitlement IDs ───────────────────────────────────
  const expired = await prisma.entitlement.findMany({
    where: {
      isPermanent: false,
      expiresAt: { lt: now },
    },
    select: { id: true, orderId: true },
  });

  if (expired.length === 0) return { entitlements: 0, orders: 0 };

  const expiredIds  = expired.map((e) => e.id);
  const orderIds    = [...new Set(expired.map((e) => e.orderId))];

  // ── 2. Hard-delete the expired entitlement rows ───────────────────────────
  const { count: entitlementCount } = await prisma.entitlement.deleteMany({
    where: { id: { in: expiredIds } },
  });

  // ── 3. Delete orders that now have zero entitlements remaining ────────────
  // (All entitlements for the order have expired and been deleted.)
  const ordersWithRemainingEntitlements = await prisma.entitlement.findMany({
    where: { orderId: { in: orderIds } },
    select: { orderId: true },
  });
  const stillActiveOrderIds = new Set(ordersWithRemainingEntitlements.map((e) => e.orderId));
  const orderIdsToDelete = orderIds.filter((id) => !stillActiveOrderIds.has(id));

  let orderCount = 0;
  if (orderIdsToDelete.length > 0) {
    const { count } = await prisma.order.deleteMany({
      where: { id: { in: orderIdsToDelete } },
    });
    orderCount = count;
  }

  return { entitlements: entitlementCount, orders: orderCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// expireStaleEntitlements  (kept for backwards-compat; delegates to purge)
// ─────────────────────────────────────────────────────────────────────────────
// @deprecated Use purgeExpiredEntitlements instead.
export async function expireStaleEntitlements(): Promise<number> {
  const { entitlements } = await purgeExpiredEntitlements();
  return entitlements;
}
