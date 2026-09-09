// src/app/api/studio/exams/all/route.ts
//
// GET /api/studio/exams/all
//
// Returns every exam on the platform grouped by chapter, including topic
// and subtopic-level exams within each chapter. Used by the Test Paper Builder
// to give admins a global view of all test papers.
//
// Optional filters:
//   ?classId=X    — only chapters belonging to this class
//   ?subjectId=X  — only chapters in this subject
//   ?chapterId=X  — only exams for this specific chapter (all scopes)

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const classId   = searchParams.get('classId')   ?? undefined;
  const subjectId = searchParams.get('subjectId') ?? undefined;
  const chapterId = searchParams.get('chapterId') ?? undefined;

  // Build the chapter filter
  const chapterWhere: Record<string, unknown> = { isActive: true };
  if (chapterId)  chapterWhere.id        = chapterId;
  if (subjectId)  chapterWhere.subjectId = subjectId;
  if (classId)    chapterWhere.subject   = { classId };

  // Fetch chapters matching the filter, with their topics/subtopics
  const chapters = await prisma.chapter.findMany({
    where:   chapterWhere,
    orderBy: [{ subject: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    select: {
      id:               true,
      name:             true,
      slug:             true,
      testPanelEnabled: true,
      subject: {
        select: {
          id:   true,
          name: true,
          class: { select: { id: true, name: true } },
        },
      },
      topics: {
        where:   { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id:    true,
          title: true,
          subtopics: {
            where:   { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select:  { id: true, title: true },
          },
        },
      },
    },
  });

  if (chapters.length === 0) return NextResponse.json([]);

  // Collect all chapter/topic/subtopic IDs
  const chapterIds  = chapters.map((c) => c.id);
  const topicIds    = chapters.flatMap((c) => c.topics.map((t) => t.id));
  const subtopicIds = chapters.flatMap((c) => c.topics.flatMap((t) => t.subtopics.map((s) => s.id)));

  // Fetch all exams across all three scopes in a single query
  const exams = await prisma.exam.findMany({
    where: {
      OR: [
        { chapterId:  { in: chapterIds  } },
        { topicId:    { in: topicIds    } },
        { subtopicId: { in: subtopicIds } },
      ],
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { attempts: true } },
    },
  });

  // Build lookup maps for topic/subtopic titles
  const topicMap    = new Map(chapters.flatMap((c) => c.topics.map((t) => [t.id, t.title])));
  const subtopicMap = new Map(
    chapters.flatMap((c) =>
      c.topics.flatMap((t) => t.subtopics.map((s) => [s.id, s.title])),
    ),
  );

  // Group exams by chapter, enriched with scope label
  const result = chapters.map((ch) => ({
    id:               ch.id,
    name:             ch.name,
    slug:             ch.slug,
    testPanelEnabled: ch.testPanelEnabled,
    subject:          ch.subject,
    topics:           ch.topics,
    exams: exams
      .filter(
        (e) =>
          e.chapterId === ch.id ||
          ch.topics.some(
            (t) =>
              e.topicId === t.id ||
              t.subtopics.some((s) => e.subtopicId === s.id),
          ),
      )
      .map((e) => ({
        ...e,
        scopeLabel: e.chapterId
          ? ch.name
          : e.topicId
          ? (topicMap.get(e.topicId) ?? 'Topic')
          : (subtopicMap.get(e.subtopicId ?? '') ?? 'Subtopic'),
      })),
  }));

  return NextResponse.json(result);
}
