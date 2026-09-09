// scripts/update-prices.ts
// One-shot script to update the four AED plan prices.
// Run with: npx tsx scripts/update-prices.ts

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const updates: { slug: string; pricePaise: number; label: string }[] = [
  { slug: 'chapter-aed',            pricePaise: 10000,  label: 'AED 100'  },
  { slug: 'subject-aed',            pricePaise: 89900,  label: 'AED 899'  },
  { slug: 'combo-two-subjects-aed', pricePaise: 150000, label: 'AED 1500' },
  { slug: 'complete-lms-aed',       pricePaise: 399900, label: 'AED 3999' },
];

async function main() {
  console.log('💰 Updating AED plan prices…\n');

  for (const { slug, pricePaise, label } of updates) {
    const plan = await prisma.plan.findUnique({ where: { slug } });
    if (!plan) {
      console.warn(`  ⚠️  Plan not found: ${slug}`);
      continue;
    }
    const oldPrice = `AED ${plan.pricePaise / 100}`;
    await prisma.plan.update({ where: { slug }, data: { pricePaise } });
    console.log(`  ✅  ${slug}: ${oldPrice} → ${label}`);
  }

  console.log('\n✔  Done.');
}
main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
