// src/app/api/lms/progress/route.ts
//
// GET  /api/lms/progress?chapterId=<id>
//   Returns completed topicIds and subtopicIds for a single chapter.
//
// GET  /api/lms/progress?subjectId=<id>
//   Returns completed topicIds and subtopicIds across ALL chapters in a subject.
//
// POST /api/lms/progress
//   Body: { topicId?: string; subtopicId?: string }
//   Marks a topic or subtopic as complete (upsert — idempotent).
//
// DELETE /api/lms/progress
//   Body: { topicId?: string; subtopicId?: string }
//   Unmarks a previously completed item (toggle support).

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chapterId = req.nextUrl.searchParams.get('chapterId');
  const subjectId = req.nextUrl.searchParams.get('subjectId');

  if (!chapterId && !subjectId) {
    return NextResponse.json({ error: 'chapterId or subjectId is required' }, { status: 400 });
  }

  // Build the topic/subtopic ID lists depending on scope
  let topicsInScope: { id: string; subtopics: { id: string }[] }[];

  if (subjectId) {
    // All active topics across every active chapter in this subject
    topicsInScope = await prisma.topic.findMany({
      where: {
        isActive: true,
        chapter: { subjectId, isActive: true },
      },
      select: { id: true, subtopics: { where: { isActive: true }, select: { id: true } } },
    });
  } else {
    // Single chapter (original behaviour)
    topicsInScope = await prisma.topic.findMany({
      where: { chapterId: chapterId!, isActive: true },
      select: { id: true, subtopics: { where: { isActive: true }, select: { id: true } } },
    });
  }

  const topicIds    = topicsInScope.map((t) => t.id);
  const subtopicIds = topicsInScope.flatMap((t) => t.subtopics.map((s) => s.id));

  const progress = await prisma.userProgress.findMany({
    where: {
      clerkUserId: userId,
      OR: [
        { topicId:    { in: topicIds    } },
        { subtopicId: { in: subtopicIds } },
      ],
    },
    select: { topicId: true, subtopicId: true },
  });

  const completedTopicIds    = progress.map((p) => p.topicId).filter(Boolean)    as string[];
  const completedSubtopicIds = progress.map((p) => p.subtopicId).filter(Boolean) as string[];

  return NextResponse.json({ completedTopicIds, completedSubtopicIds });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { topicId, subtopicId } = body as { topicId?: string; subtopicId?: string };

  if (!topicId && !subtopicId) {
    return NextResponse.json(
      { error: 'Provide topicId or subtopicId' },
      { status: 400 },
    );
  }

  if (topicId) {
    // Verify the topic exists before recording progress
    const topic = await prisma.topic.findUnique({ where: { id: topicId }, select: { id: true } });
    if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

    await prisma.userProgress.upsert({
      where:  { clerkUserId_topicId: { clerkUserId: userId, topicId } },
      create: { clerkUserId: userId, topicId },
      update: { completedAt: new Date() },
    });
  } else if (subtopicId) {
    const subtopic = await prisma.subtopic.findUnique({ where: { id: subtopicId }, select: { id: true } });
    if (!subtopic) return NextResponse.json({ error: 'Subtopic not found' }, { status: 404 });

    await prisma.userProgress.upsert({
      where:  { clerkUserId_subtopicId: { clerkUserId: userId, subtopicId } },
      create: { clerkUserId: userId, subtopicId },
      update: { completedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { topicId, subtopicId } = body as { topicId?: string; subtopicId?: string };

  if (!topicId && !subtopicId) {
    return NextResponse.json(
      { error: 'Provide topicId or subtopicId' },
      { status: 400 },
    );
  }

  await prisma.userProgress.deleteMany({
    where: {
      clerkUserId: userId,
      ...(topicId    ? { topicId }    : {}),
      ...(subtopicId ? { subtopicId } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
