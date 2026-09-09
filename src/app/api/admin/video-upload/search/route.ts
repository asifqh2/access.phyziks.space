// src/app/api/admin/video-upload/search/route.ts
//
// GET /api/admin/video-upload/search?q=<query>
//
// Searches chapters, topics, and subtopics by name.
// Returns a unified list so the UI can let the admin pick any level.
//
// Response shape:
//   [{ kind, id, label, chapterId, topicId?, b2Path, hasVideo }]

import { NextResponse }  from 'next/server';
import { prisma }        from '@/lib/prisma';
import { requireAdmin }  from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const [chapters, topics, subtopics] = await Promise.all([
    // Chapters
    prisma.chapter.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      select: {
        id:         true,
        name:       true,
        b2VideoKey: true,
        subject: { select: { name: true, class: { select: { name: true } } } },
      },
      take: 10,
    }),

    // Topics
    prisma.topic.findMany({
      where: {
        isActive: true,
        title: { contains: q, mode: 'insensitive' },
      },
      select: {
        id:         true,
        title:      true,
        b2VideoKey: true,
        chapter: {
          select: {
            id:   true,
            name: true,
            subject: { select: { name: true, class: { select: { name: true } } } },
          },
        },
      },
      take: 10,
    }),

    // Subtopics
    prisma.subtopic.findMany({
      where: {
        isActive: true,
        title: { contains: q, mode: 'insensitive' },
      },
      select: {
        id:         true,
        title:      true,
        b2VideoKey: true,
        topic: {
          select: {
            id:    true,
            title: true,
            chapter: {
              select: {
                id:   true,
                name: true,
                subject: { select: { name: true, class: { select: { name: true } } } },
              },
            },
          },
        },
      },
      take: 10,
    }),
  ]);

  const results = [
    ...chapters.map((c) => ({
      kind:       'chapter' as const,
      id:         c.id,
      label:      `${c.subject.class.name} › ${c.subject.name} › ${c.name}`,
      chapterId:  c.id,
      topicId:    null,
      subtopicId: null,
      b2Path:     `videos/${c.id}/master.m3u8`,
      hasVideo:   !!c.b2VideoKey,
    })),

    ...topics.map((t) => ({
      kind:       'topic' as const,
      id:         t.id,
      label:      `${t.chapter.subject.class.name} › ${t.chapter.subject.name} › ${t.chapter.name} › ${t.title}`,
      chapterId:  t.chapter.id,
      topicId:    t.id,
      subtopicId: null,
      b2Path:     `videos/${t.chapter.id}/topics/${t.id}/master.m3u8`,
      hasVideo:   !!t.b2VideoKey,
    })),

    ...subtopics.map((s) => ({
      kind:       'subtopic' as const,
      id:         s.id,
      label:      `${s.topic.chapter.subject.class.name} › ${s.topic.chapter.subject.name} › ${s.topic.chapter.name} › ${s.topic.title} › ${s.title}`,
      chapterId:  s.topic.chapter.id,
      topicId:    s.topic.id,
      subtopicId: s.id,
      b2Path:     `videos/${s.topic.chapter.id}/subtopics/${s.id}/master.m3u8`,
      hasVideo:   !!s.b2VideoKey,
    })),
  ];

  return NextResponse.json(results);
}
