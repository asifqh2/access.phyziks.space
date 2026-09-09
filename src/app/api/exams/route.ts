// src/app/api/exams/route.ts
//
// GET /api/exams?chapterId=X
// Returns all active exams (with question count) for a chapter, scoped to:
//   - chapter-level exams
//   - topic-level exams within that chapter
//   - subtopic-level exams within that chapter
//
// Also returns the user's best attempt per exam.
// Correct answers are never included.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { checkTestPanelAccess } from '@/lib/test-panel-access';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const chapterId = req.nextUrl.searchParams.get('chapterId');
  if (!chapterId) {
    return NextResponse.json({ error: 'chapterId is required' }, { status: 400 });
  }

  // Verify chapter has test panel enabled
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { testPanelEnabled: true, subjectId: true },
  });
  if (!chapter?.testPanelEnabled) {
    return NextResponse.json({ error: 'Test panel not enabled for this chapter' }, { status: 403 });
  }

  const { allowed } = await checkTestPanelAccess(userId, chapterId);
  if (!allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  // Fetch all topic/subtopic IDs in this chapter for the join
  const topics = await prisma.topic.findMany({
    where: { chapterId, isActive: true },
    select: {
      id: true,
      title: true,
      subtopics: { where: { isActive: true }, select: { id: true, title: true } },
    },
  });

  const topicIds    = topics.map((t) => t.id);
  const subtopicIds = topics.flatMap((t) => t.subtopics.map((s) => s.id));

  // Fetch exams at all three levels
  const exams = await prisma.exam.findMany({
    where: {
      isActive: true,
      OR: [
        { chapterId },
        { topicId:    { in: topicIds    } },
        { subtopicId: { in: subtopicIds } },
      ],
    },
    orderBy: [{ topicId: 'asc' }, { subtopicId: 'asc' }, { sortOrder: 'asc' }],
    select: {
      id:              true,
      chapterId:       true,
      topicId:         true,
      subtopicId:      true,
      title:           true,
      description:     true,
      timeLimit:       true,
      passingScore:    true,
      shuffleQuestions: true,
      sortOrder:       true,
      _count: { select: { questions: true } },
    },
  });

  // Fetch the user's best attempt per exam
  const examIds = exams.map((e) => e.id);
  const attempts = await prisma.examAttempt.findMany({
    where: { clerkUserId: userId, examId: { in: examIds } },
    orderBy: { percentage: 'desc' },
    select: {
      id:          true,
      examId:      true,
      score:       true,
      totalMarks:  true,
      percentage:  true,
      passed:      true,
      completedAt: true,
    },
  });

  // Best attempt per exam (highest percentage)
  const bestAttempt = new Map<string, typeof attempts[0]>();
  for (const a of attempts) {
    if (!bestAttempt.has(a.examId)) bestAttempt.set(a.examId, a);
  }

  // Build topic/subtopic label maps
  const topicMap = new Map(topics.map((t) => [t.id, t.title]));
  const subtopicMap = new Map(
    topics.flatMap((t) => t.subtopics.map((s) => [s.id, s.title])),
  );

  const result = exams.map((exam) => ({
    ...exam,
    questionCount:  exam._count.questions,
    scopeLabel:     exam.chapterId
      ? 'Chapter'
      : exam.topicId
      ? topicMap.get(exam.topicId) ?? 'Topic'
      : subtopicMap.get(exam.subtopicId ?? '') ?? 'Subtopic',
    bestAttempt: bestAttempt.get(exam.id) ?? null,
  }));

  return NextResponse.json(result);
}
