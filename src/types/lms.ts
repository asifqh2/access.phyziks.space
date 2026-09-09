// src/types/lms.ts
// All TypeScript types for the LMS entitlement system.
// Keep these in sync with prisma/schema.prisma.

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS (mirrored from Prisma schema so they can be used in client components
// without importing from the generated Prisma client)
// ─────────────────────────────────────────────────────────────────────────────

export type PlanScopeType = 'CHAPTER' | 'SUBJECT' | 'COMPLETE' | 'CONFIGURABLE' | 'CHAPTER_COMBO' | 'TEST_PANEL';

export type OrderStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export type EntitlementScope = 'CHAPTER' | 'SUBJECT' | 'COMPLETE' | 'TEST_PANEL';

export type EntitlementStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export type PackageItemScope = 'CLASS' | 'SUBJECT' | 'CHAPTER';

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT HIERARCHY
// ─────────────────────────────────────────────────────────────────────────────

export interface LmsClassData {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectData {
  id: string;
  classId: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  class?: LmsClassData;
}

export interface ChapterData {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  isFree: boolean;
  createdAt: string;
  updatedAt: string;
  subject?: SubjectData;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanData {
  id: string;
  name: string;
  slug: string;
  scopeType: PlanScopeType;
  pricePaise: number;
  currency: string;
  durationDays: number | null;
  isPermanent: boolean;
  isActive: boolean;
  description: string | null;
  metadata: Record<string, unknown> | null;  createdAt: string;
  updatedAt: string;
}

/** Convenience — price in major units (divide pricePaise by 100) */
export function planPriceRupees(plan: Pick<PlanData, 'pricePaise'>): number {
  return plan.pricePaise / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderData {
  id: string;
  clerkUserId: string;
  planId: string;
  classId: string | null;
  subjectId: string | null;
  chapterId: string | null;
  amountPaise: number;
  currency: string;
  status: OrderStatus;
  gatewayOrderId: string;
  gatewayPaymentId: string | null;
  webhookProcessed: boolean;
  createdAt: string;
  updatedAt: string;
  plan?: PlanData;
  class?: LmsClassData | null;
  subject?: SubjectData | null;
  chapter?: ChapterData | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITLEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface EntitlementData {
  id: string;
  clerkUserId: string;
  orderId: string;
  planId: string;
  scopeType: EntitlementScope;
  classId: string | null;
  subjectId: string | null;
  chapterId: string | null;
  startsAt: string;
  expiresAt: string | null;
  isPermanent: boolean;
  status: EntitlementStatus;
  createdAt: string;
  updatedAt: string;
  plan?: PlanData;
  class?: LmsClassData | null;
  subject?: SubjectData | null;
  chapter?: ChapterData | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITLEMENT CHECK RESULT
// Returned by checkEntitlement() — the single source of truth for access.
// ─────────────────────────────────────────────────────────────────────────────

export type EntitlementDenyReason =
  | 'UNAUTHENTICATED'       // user not signed in
  | 'NO_ENTITLEMENT'        // user has no relevant purchase
  | 'ENTITLEMENT_EXPIRED'   // had access but it has lapsed
  | 'ENTITLEMENT_REVOKED';  // admin revoked access

export type EntitlementAllowReason =
  | 'FREE'                  // content is free, no purchase needed
  | 'COMPLETE_ENTITLEMENT'  // user has the complete package
  | 'SUBJECT_PERMANENT'     // permanent subject entitlement
  | 'SUBJECT_TEMPORARY'     // time-limited subject entitlement
  | 'CHAPTER_PERMANENT'     // permanent chapter entitlement
  | 'CHAPTER_TEMPORARY'     // time-limited chapter entitlement
  | 'TEST_PANEL_ENTITLEMENT'; // user has a standalone test-panel plan

export type EntitlementCheckResult =
  | {
      allowed: true;
      reason: EntitlementAllowReason;
      entitlementId: string;
      expiresAt: Date | null;    // null = permanent
      isPermanent: boolean;
    }
  | {
      allowed: false;
      reason: EntitlementDenyReason;
      entitlementId: null;
      expiresAt: null;
      isPermanent: false;
    };

// ─────────────────────────────────────────────────────────────────────────────
// API REQUEST / RESPONSE SHAPES
// ─────────────────────────────────────────────────────────────────────────────

/** POST /api/orders/create */
export interface CreateOrderRequest {
  planId: string;
  // Selected scope — must match the plan's scopeType:
  // CHAPTER plan       → chapterId required
  // SUBJECT plan       → subjectId required
  // CHAPTER_COMBO plan → subjectId + chapterIds (array) required
  // COMPLETE plan      → classId required
  // CONFIGURABLE       → neither required
  classId?:    string;
  chapterId?:  string;
  subjectId?:  string;
  subjectIds?: string[];
  /** Array of chapter IDs for CHAPTER_COMBO plans */
  chapterIds?: string[];
}

export interface CreateOrderResponse {
  stripeCheckoutUrl: string; // Stripe Checkout redirect URL
}

/** GET /api/entitlements/check */
export interface EntitlementCheckQuery {
  resourceType: 'CHAPTER' | 'SUBJECT';
  resourceId: string;
}

/** GET /api/entitlements/mine — one item in the list */
export interface MyEntitlementItem {
  id: string;
  scopeType: EntitlementScope;
  isPermanent: boolean;
  expiresAt: string | null;
  status: EntitlementStatus;
  plan: { name: string; slug: string };
  class: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
  chapter: { id: string; name: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatePlanRequest {
  name: string;
  slug: string;
  scopeType: PlanScopeType;
  pricePaise: number;
  currency?: string;
  durationDays?: number | null;
  isPermanent: boolean;
  isActive?: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePlanRequest extends Partial<CreatePlanRequest> {}

export interface GrantEntitlementRequest {
  clerkUserId: string;
  planId: string;
  scopeType: EntitlementScope;
  classId?: string;
  subjectId?: string;
  chapterId?: string;
  isPermanent: boolean;
  durationDays?: number;
  note?: string; // admin note stored in order metadata
}

export interface RevokeEntitlementRequest {
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD VIEW TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Groups a user's entitlements by subject for the dashboard "My Courses" view */
export interface DashboardSubjectGroup {
  subject: SubjectData;
  class: LmsClassData;
  chapters: Array<{
    chapter: ChapterData;
    access: EntitlementCheckResult;
  }>;
  subjectAccess: EntitlementCheckResult;
}
