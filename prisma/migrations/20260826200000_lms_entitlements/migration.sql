-- LMS Entitlement System Migration
-- Renames the existing PaymentEntitlement table to _LegacyPaymentEntitlement
-- and creates the full new entitlement schema.
-- All existing live data is preserved in the legacy table.

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE "PlanScopeType" AS ENUM ('CHAPTER', 'SUBJECT', 'COMPLETE', 'CONFIGURABLE');
CREATE TYPE "OrderStatus"   AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "EntitlementScope"  AS ENUM ('CHAPTER', 'SUBJECT', 'COMPLETE');
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "PackageItemScope"  AS ENUM ('CLASS', 'SUBJECT', 'CHAPTER');

-- ─────────────────────────────────────────────────────────────────────────────
-- PRESERVE LEGACY DATA
-- Rename PaymentEntitlement → _LegacyPaymentEntitlement
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS "PaymentEntitlement"
  RENAME TO "_LegacyPaymentEntitlement";

-- ─────────────────────────────────────────────────────────────────────────────
-- LMS CONTENT HIERARCHY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "LmsClass" (
    "id"        TEXT        NOT NULL,
    "name"      TEXT        NOT NULL,
    "slug"      TEXT        NOT NULL,
    "isActive"  BOOLEAN     NOT NULL DEFAULT true,
    "sortOrder" INTEGER     NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LmsClass_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LmsClass_slug_key" ON "LmsClass"("slug");

CREATE TABLE "Subject" (
    "id"        TEXT        NOT NULL,
    "classId"   TEXT        NOT NULL,
    "name"      TEXT        NOT NULL,
    "slug"      TEXT        NOT NULL,
    "isActive"  BOOLEAN     NOT NULL DEFAULT true,
    "sortOrder" INTEGER     NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subject_classId_slug_key" ON "Subject"("classId", "slug");
CREATE INDEX "Subject_classId_idx" ON "Subject"("classId");

CREATE TABLE "Chapter" (
    "id"        TEXT        NOT NULL,
    "subjectId" TEXT        NOT NULL,
    "name"      TEXT        NOT NULL,
    "slug"      TEXT        NOT NULL,
    "isActive"  BOOLEAN     NOT NULL DEFAULT true,
    "sortOrder" INTEGER     NOT NULL DEFAULT 0,
    "isFree"    BOOLEAN     NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Chapter_subjectId_slug_key" ON "Chapter"("subjectId", "slug");
CREATE INDEX "Chapter_subjectId_idx" ON "Chapter"("subjectId");

-- ─────────────────────────────────────────────────────────────────────────────
-- PLANS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Plan" (
    "id"           TEXT            NOT NULL,
    "name"         TEXT            NOT NULL,
    "slug"         TEXT            NOT NULL,
    "scopeType"    "PlanScopeType" NOT NULL,
    "pricePaise"   INTEGER         NOT NULL,
    "currency"     TEXT            NOT NULL DEFAULT 'INR',
    "durationDays" INTEGER,
    "isPermanent"  BOOLEAN         NOT NULL DEFAULT false,
    "isActive"     BOOLEAN         NOT NULL DEFAULT true,
    "description"  TEXT,
    "metadata"     JSONB,
    "createdAt"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");
CREATE INDEX "Plan_isActive_idx"  ON "Plan"("isActive");
CREATE INDEX "Plan_scopeType_idx" ON "Plan"("scopeType");

CREATE TABLE "CompletePackageItem" (
    "id"        TEXT              NOT NULL,
    "planId"    TEXT              NOT NULL,
    "scope"     "PackageItemScope" NOT NULL,
    "classId"   TEXT,
    "subjectId" TEXT,
    "chapterId" TEXT,
    "createdAt" TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompletePackageItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CompletePackageItem_planId_idx"           ON "CompletePackageItem"("planId");
CREATE INDEX "CompletePackageItem_planId_classId_idx"   ON "CompletePackageItem"("planId", "classId");
CREATE INDEX "CompletePackageItem_planId_subjectId_idx" ON "CompletePackageItem"("planId", "subjectId");
CREATE INDEX "CompletePackageItem_planId_chapterId_idx" ON "CompletePackageItem"("planId", "chapterId");

-- ─────────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Order" (
    "id"               TEXT          NOT NULL,
    "clerkUserId"      TEXT          NOT NULL,
    "planId"           TEXT          NOT NULL,
    "classId"          TEXT,
    "subjectId"        TEXT,
    "chapterId"        TEXT,
    "amountPaise"      INTEGER       NOT NULL,
    "currency"         TEXT          NOT NULL DEFAULT 'INR',
    "status"           "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayOrderId"   TEXT          NOT NULL,
    "gatewayPaymentId" TEXT,
    "webhookProcessed" BOOLEAN       NOT NULL DEFAULT false,
    "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Order_gatewayOrderId_key"         ON "Order"("gatewayOrderId");
CREATE INDEX "Order_clerkUserId_idx"                   ON "Order"("clerkUserId");
CREATE INDEX "Order_clerkUserId_status_idx"            ON "Order"("clerkUserId", "status");
CREATE INDEX "Order_gatewayOrderId_idx"                ON "Order"("gatewayOrderId");
CREATE INDEX "Order_status_idx"                        ON "Order"("status");

-- ─────────────────────────────────────────────────────────────────────────────
-- ENTITLEMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Entitlement" (
    "id"          TEXT                NOT NULL,
    "clerkUserId" TEXT                NOT NULL,
    "orderId"     TEXT                NOT NULL,
    "planId"      TEXT                NOT NULL,
    "scopeType"   "EntitlementScope"  NOT NULL,
    "classId"     TEXT,
    "subjectId"   TEXT,
    "chapterId"   TEXT,
    "startsAt"    TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"   TIMESTAMP(3),
    "isPermanent" BOOLEAN             NOT NULL DEFAULT false,
    "status"      "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt"   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)        NOT NULL,
    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Entitlement_clerkUserId_idx"            ON "Entitlement"("clerkUserId");
CREATE INDEX "Entitlement_clerkUserId_status_idx"     ON "Entitlement"("clerkUserId", "status");
CREATE INDEX "Entitlement_clerkUserId_chapterId_idx"  ON "Entitlement"("clerkUserId", "chapterId");
CREATE INDEX "Entitlement_clerkUserId_subjectId_idx"  ON "Entitlement"("clerkUserId", "subjectId");
CREATE INDEX "Entitlement_expiresAt_idx"              ON "Entitlement"("expiresAt");
CREATE INDEX "Entitlement_orderId_idx"                ON "Entitlement"("orderId");

-- ─────────────────────────────────────────────────────────────────────────────
-- FOREIGN KEYS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Subject"
  ADD CONSTRAINT "Subject_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "LmsClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Chapter"
  ADD CONSTRAINT "Chapter_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompletePackageItem"
  ADD CONSTRAINT "CompletePackageItem_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompletePackageItem"
  ADD CONSTRAINT "CompletePackageItem_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "LmsClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompletePackageItem"
  ADD CONSTRAINT "CompletePackageItem_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompletePackageItem"
  ADD CONSTRAINT "CompletePackageItem_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "LmsClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Entitlement"
  ADD CONSTRAINT "Entitlement_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Entitlement"
  ADD CONSTRAINT "Entitlement_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Entitlement"
  ADD CONSTRAINT "Entitlement_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "LmsClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Entitlement"
  ADD CONSTRAINT "Entitlement_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Entitlement"
  ADD CONSTRAINT "Entitlement_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
