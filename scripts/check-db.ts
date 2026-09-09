import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg }     from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  // Check VideoToken table exists and b2VideoKey on Chapter
  const chapter = await prisma.chapter.findUnique({
    where:  { id: 'cmtafsmbb0006ngvfqu75vson' },
    select: { id: true, name: true, b2VideoKey: true },
  });
  console.log('Chapter:', JSON.stringify(chapter, null, 2));

  const tokenCount = await prisma.videoToken.count();
  console.log('VideoToken rows:', tokenCount);

  // Check env vars
  console.log('VIDEO_TOKEN_SECRET set:', !!process.env.VIDEO_TOKEN_SECRET);
  console.log('NEXT_PUBLIC_CDN_URL:', process.env.NEXT_PUBLIC_CDN_URL);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
