// Usage:  npx tsx scripts/get-topic-id.ts "topic name"
// Searches topics and subtopics by name (case-insensitive).
// Prints the id, parent chapter id (needed for the B2 path), and hierarchy.

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg }     from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const search = process.argv[2] ?? '';
  if (!search) {
    console.error('Usage: npx tsx scripts/get-topic-id.ts "topic name"');
    process.exit(1);
  }

  // ── Topics ──────────────────────────────────────────────────────────────
  const topics = await prisma.topic.findMany({
    where: { title: { contains: search, mode: 'insensitive' } },
    select: {
      id:      true,
      title:   true,
      slug:    true,
      chapter: {
        select: {
          id:      true,
          name:    true,
          subject: { select: { name: true, class: { select: { name: true } } } },
        },
      },
    },
  });

  // ── Subtopics ────────────────────────────────────────────────────────────
  const subtopics = await prisma.subtopic.findMany({
    where: { title: { contains: search, mode: 'insensitive' } },
    select: {
      id:    true,
      title: true,
      slug:  true,
      topic: {
        select: {
          id:      true,
          title:   true,
          chapter: {
            select: {
              id:      true,
              name:    true,
              subject: { select: { name: true, class: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (topics.length === 0 && subtopics.length === 0) {
    console.log(`No topics or subtopics found matching "${search}"`);
    return;
  }

  if (topics.length > 0) {
    console.log('\n── Topics ──────────────────────────────────────────────');
    for (const t of topics) {
      console.log(JSON.stringify({
        type:      'topic',
        id:        t.id,
        title:     t.title,
        chapterId: t.chapter.id,
        chapter:   t.chapter.name,
        subject:   t.chapter.subject.name,
        class:     t.chapter.subject.class.name,
        // B2 upload path:
        b2Path:    `videos/${t.chapter.id}/topics/${t.id}/master.m3u8`,
      }, null, 2));
    }
  }

  if (subtopics.length > 0) {
    console.log('\n── Subtopics ───────────────────────────────────────────');
    for (const s of subtopics) {
      console.log(JSON.stringify({
        type:      'subtopic',
        id:        s.id,
        title:     s.title,
        topicId:   s.topic.id,
        topic:     s.topic.title,
        chapterId: s.topic.chapter.id,
        chapter:   s.topic.chapter.name,
        subject:   s.topic.chapter.subject.name,
        class:     s.topic.chapter.subject.class.name,
        // B2 upload path:
        b2Path:    `videos/${s.topic.chapter.id}/subtopics/${s.id}/master.m3u8`,
      }, null, 2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
