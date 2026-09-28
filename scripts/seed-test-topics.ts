// scripts/seed-test-topics.ts
//
// Adds one test topic (with a subtopic) to the first chapter of each subject
// so the Studio and chapter pages can be tested immediately.
// Safe to run multiple times — skips if the topic already exists.

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  console.log('🌱 Seeding test topics…');

  // Get all active subjects with their first chapter
  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      class: { select: { name: true } },
      chapters: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
    },
  });

  for (const subject of subjects) {
    const chapter = subject.chapters[0];
    if (!chapter) {
      console.log(`  ⚠️  ${subject.class.name} → ${subject.name}: no chapters found, skipping`);
      continue;
    }

    // Check if a test topic already exists for this chapter
    const existing = await prisma.topic.findFirst({
      where: { chapterId: chapter.id },
    });

    if (existing) {
      console.log(`  ✓ ${subject.class.name} → ${subject.name} → ${chapter.name}: topic already exists (${existing.title})`);
      continue;
    }

    // Create one test topic
    const topic = await prisma.topic.create({
      data: {
        chapterId:      chapter.id,
        title:          `Introduction to ${subject.name}`,
        slug:           `intro-${subject.slug}`,
        description:    `Overview of ${subject.name} concepts covered in ${chapter.name}.`,
        youtubeVideoId: null,   // add a real YouTube video ID to test playback
        duration:       null,
        sortOrder:      1,
        isActive:       true,
        isFree:         chapter.isFree, // match chapter's free status
      },
    });

    // Add one test subtopic inside that topic
    await prisma.subtopic.create({
      data: {
        topicId:        topic.id,
        title:          `Key Concepts`,
        slug:           `key-concepts`,
        description:    `Core definitions and formulas.`,
        youtubeVideoId: null,
        duration:       null,
        sortOrder:      1,
        isActive:       true,
        isFree:         false,
      },
    });

    console.log(`  ✅ ${subject.class.name} → ${subject.name} → ${chapter.name}: added topic "${topic.title}" + 1 subtopic`);
  }

  console.log('\nDone. Open /studio to see topics in the editor.');
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
