import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg }     from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  // Remove the old youtubeUrl so only b2VideoKey is active
  // Also make the chapter free so you can test without needing a purchase
  const updated = await prisma.chapter.update({
    where: { id: 'cmtafsmbb0006ngvfqu75vson' },
    data:  {
      youtubeUrl: null,   // clear old YouTube URL
      isFree:     true,   // temporarily free so you can test the HLS player
    },
    select: { id: true, name: true, isFree: true, b2VideoKey: true, youtubeUrl: true },
  });
  console.log('Updated:', JSON.stringify(updated, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
