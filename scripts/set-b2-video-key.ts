// Usage:  npx tsx scripts/set-b2-video-key.ts <chapterId>
// Example: npx tsx scripts/set-b2-video-key.ts cmtafsmbb0006ngvfqu75vson

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg }     from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const chapterId = process.argv[2];
  if (!chapterId) {
    console.error('Usage: npx tsx scripts/set-b2-video-key.ts <chapterId>');
    process.exit(1);
  }

  const b2VideoKey = `videos/${chapterId}/master.m3u8`;

  const updated = await prisma.chapter.update({
    where:  { id: chapterId },
    data:   { b2VideoKey },
    select: { id: true, name: true, b2VideoKey: true },
  });

  console.log('✅ Updated:', JSON.stringify(updated, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
