// Sets b2VideoKey on a Topic or Subtopic after uploading HLS files to B2.
//
// Usage:
//   npx tsx scripts/set-b2-video-key-topic.ts topic    <topicId>
//   npx tsx scripts/set-b2-video-key-topic.ts subtopic <subtopicId>
//
// The b2VideoKey is derived automatically from the id and parent chapter id.
// Run  npx tsx scripts/get-topic-id.ts "name"  first to get the ids.

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg }     from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const [,, kind, id] = process.argv;

  if (!kind || !id || !['topic', 'subtopic'].includes(kind)) {
    console.error('Usage:');
    console.error('  npx tsx scripts/set-b2-video-key-topic.ts topic    <topicId>');
    console.error('  npx tsx scripts/set-b2-video-key-topic.ts subtopic <subtopicId>');
    process.exit(1);
  }

  if (kind === 'topic') {
    // Need the chapterId to build the B2 path
    const topic = await prisma.topic.findUnique({
      where:  { id },
      select: { id: true, title: true, chapterId: true },
    });
    if (!topic) { console.error(`Topic "${id}" not found`); process.exit(1); }

    const b2VideoKey = `videos/${topic.chapterId}/topics/${topic.id}/master.m3u8`;

    const updated = await prisma.topic.update({
      where:  { id },
      data:   { b2VideoKey },
      select: { id: true, title: true, b2VideoKey: true, chapterId: true },
    });
    console.log('✅ Topic updated:', JSON.stringify(updated, null, 2));
    console.log(`\nB2 upload path was: videos/${topic.chapterId}/topics/${topic.id}/`);

  } else {
    // subtopic — need topicId → chapterId
    const subtopic = await prisma.subtopic.findUnique({
      where:  { id },
      select: {
        id:    true,
        title: true,
        topic: { select: { id: true, chapterId: true } },
      },
    });
    if (!subtopic) { console.error(`Subtopic "${id}" not found`); process.exit(1); }

    const chapterId  = subtopic.topic.chapterId;
    const b2VideoKey = `videos/${chapterId}/subtopics/${subtopic.id}/master.m3u8`;

    const updated = await prisma.subtopic.update({
      where:  { id },
      data:   { b2VideoKey },
      select: { id: true, title: true, b2VideoKey: true },
    });
    console.log('✅ Subtopic updated:', JSON.stringify(updated, null, 2));
    console.log(`\nB2 upload path was: videos/${chapterId}/subtopics/${subtopic.id}/`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
