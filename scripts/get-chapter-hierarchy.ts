// Lists all topics and subtopics for a given chapter ID.
// Usage: npx tsx scripts/get-chapter-hierarchy.ts <chapterId>

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg }     from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const chapterId = process.argv[2] ?? 'cmtafsmbb0006ngvfqu75vson';

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id:   true,
      name: true,
      topics: {
        where:   { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id:        true,
          title:     true,
          subtopics: {
            where:   { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select:  { id: true, title: true },
          },
        },
      },
    },
  });

  if (!chapter) { console.error('Chapter not found'); process.exit(1); }

  console.log(`\nChapter: ${chapter.name} (${chapter.id})\n`);

  for (const t of chapter.topics) {
    console.log(`  TOPIC: ${t.title}`);
    console.log(`    id:     ${t.id}`);
    console.log(`    b2Path: videos/${chapterId}/topics/${t.id}/`);
    for (const s of t.subtopics) {
      console.log(`\n    SUBTOPIC: ${s.title}`);
      console.log(`      id:     ${s.id}`);
      console.log(`      b2Path: videos/${chapterId}/subtopics/${s.id}/`);
    }
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
