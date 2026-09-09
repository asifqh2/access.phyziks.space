/**
 * prisma/scripts/set-12-month-access.ts
 *
 * One-time migration script: update all paid Plan rows to use
 * 12-month access (durationDays = 365, isPermanent = false).
 *
 * Also updates any existing ACTIVE entitlements that were created
 * as permanent so they get an expiresAt 12 months from today.
 *
 * Run once after deploying the code changes:
 *
 *   npx tsx prisma/scripts/set-12-month-access.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  console.log('=== 12-month access migration ===\n');

  // ── 1. Update all non-free paid Plan rows ──────────────────────────────────
  // Free plans have pricePaise = 0 — leave them alone.
  const planResult = await prisma.plan.updateMany({
    where: { pricePaise: { gt: 0 } },
    data: {
      durationDays: 365,
      isPermanent:  false,
    },
  });
  console.log(`✓ Updated ${planResult.count} paid Plan row(s) → durationDays=365, isPermanent=false`);

  // ── 2. Fix any existing permanent ACTIVE entitlements ─────────────────────
  // These were created before the policy change. Give them 12 months from today
  // so existing users are not immediately locked out.
  const twelveMonthsFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const entitlementResult = await prisma.entitlement.updateMany({
    where: {
      isPermanent: true,
      status:      'ACTIVE',
    },
    data: {
      isPermanent: false,
      expiresAt:   twelveMonthsFromNow,
    },
  });
  console.log(
    `✓ Migrated ${entitlementResult.count} permanent Entitlement row(s) → ` +
    `isPermanent=false, expiresAt=${twelveMonthsFromNow.toISOString().slice(0, 10)}`,
  );

  console.log('\nMigration complete.');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
