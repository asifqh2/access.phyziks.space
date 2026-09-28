import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set in .env");
    process.exit(1);
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const [userCount, postCount, legacyEntitlementCount, entitlementCount, planCount, orderCount] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.legacyPaymentEntitlement.count(),
      prisma.entitlement.count(),
      prisma.plan.count(),
      prisma.order.count(),
    ]);

    console.log("✅ Connected.");
    console.log(`   Users:                    ${userCount}`);
    console.log(`   Posts:                    ${postCount}`);
    console.log(`   Plans:                    ${planCount}`);
    console.log(`   Orders:                   ${orderCount}`);
    console.log(`   Entitlements:             ${entitlementCount}`);
    console.log(`   LegacyPaymentEntitlements:${legacyEntitlementCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Verification failed:", e);
  process.exit(1);
});
