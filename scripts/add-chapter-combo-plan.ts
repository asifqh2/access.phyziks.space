// scripts/add-chapter-combo-plan.ts
// Inserts the "Chapter Combo — Any 5" plan into the live database.
// Run with: npx tsx scripts/add-chapter-combo-plan.ts

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  console.log('➕ Inserting Chapter Combo plan…\n');

  const plan = await prisma.plan.upsert({
    where: { slug: 'chapter-combo-aed' },
    update: {
      name:        'Chapter Combo — Any 5',
      pricePaise:  40000,
      isActive:    true,
      description: 'Get access to any 5 chapters from one subject. Save 20% vs buying individually. 12-month access.',
      metadata:    { chapterCount: 5, originalPrice: 50000, discountPercent: 20 },
    },
    create: {
      slug:        'chapter-combo-aed',
      name:        'Chapter Combo — Any 5',
      scopeType:   'CHAPTER_COMBO',
      pricePaise:  40000,   // AED 400
      currency:    'AED',
      durationDays: 365,    // 12-month access
      isPermanent: false,
      isActive:    true,
      description: 'Get access to any 5 chapters from one subject. Save 20% vs buying individually. 12-month access.',
      metadata:    { chapterCount: 5, originalPrice: 50000, discountPercent: 20 },
    },
  });

  console.log(`  ✅  ${plan.slug} — AED ${plan.pricePaise / 100} (id: ${plan.id})`);
  console.log('\n✔  Done.');
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
