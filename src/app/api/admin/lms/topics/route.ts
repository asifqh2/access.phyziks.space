// src/app/api/admin/lms/topics/route.ts
//
// GET /api/admin/lms/topics?chapterId=X
//   Returns all topics (with subtopics) for the given chapter.
//   Worksheets are fetched separately via GET /api/admin/lms?resource=worksheets.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const chapterId = searchParams.get('chapterId');

  if (!chapterId)
    return NextResponse.json({ error: 'chapterId is required.' }, { status: 400 });

  if (!await prisma.chapter.findUnique({ where: { id: chapterId } }))
    return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });

  const topics = await prisma.topic.findMany({
    where: { chapterId },
    orderBy: { sortOrder: 'asc' },
    include: {
      subtopics: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  // Return subtopics with an empty worksheets array as placeholder —
  // TopicEditor fetches worksheets separately in parallel to keep this fast.
  return NextResponse.json(
    topics.map((t) => ({
      ...t,
      worksheets: [],
      subtopics: t.subtopics.map((s) => ({ ...s, worksheets: [] })),
    })),
  );
}
