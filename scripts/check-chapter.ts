import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg }     from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const chapter = await prisma.chapter.findUnique({
    where:  { id: 'cmtafsmbb0006ngvfqu75vson' },
    select: {
      id:         true,
      name:       true,
      isFree:     true,
      isActive:   true,
      b2VideoKey: true,
      videoKey:   true,
      youtubeUrl: true,
    },
  });
  console.log('Chapter state:', JSON.stringify(chapter, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
