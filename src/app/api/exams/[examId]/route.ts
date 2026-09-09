// src/app/api/exams/[examId]/route.ts
//
// GET /api/exams/:examId
// Returns exam metadata + questions for an authenticated student.
// Requires the chapter to have testPanelEnabled = true AND the user to have
// either a content entitlement for that chapter OR a TEST_PANEL entitlement.
//
// Correct answers are NEVER sent to the client — they are validated server-side
// only when an attempt is submitted.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { checkTestPanelAccess } from '@/lib/test-panel-access';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId, isActive: true },
    include: {
      questions: {
        where: {},
        orderBy: { sortOrder: 'asc' },
        select: {
          id:          true,
          question:    true,
          type:        true,
          options:     true,
          // correctAnswer intentionally excluded
          explanation: false,
          marks:       true,
          sortOrder:   true,
        },
      },
      chapter:  { select: { id: true, testPanelEnabled: true, subjectId: true } },
      topic:    { select: { id: true, chapterId: true, chapter: { select: { id: true, testPanelEnabled: true, subjectId: true } } } },
      subtopic: { select: { id: true, topic: { select: { chapterId: true, chapter: { select: { id: true, testPanelEnabled: true, subjectId: true } } } } } },
    },
  });

  if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

  // Resolve the owning chapter (regardless of exam scope level)
  const chapter = exam.chapter
    ?? exam.topic?.chapter
    ?? exam.subtopic?.topic?.chapter;

  if (!chapter?.testPanelEnabled) {
    return NextResponse.json({ error: 'Test panel is not enabled for this chapter' }, { status: 403 });
  }

  const { allowed } = await checkTestPanelAccess(userId, chapter.id);
  if (!allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  // Strip internal fields before returning
  const { chapter: _ch, topic: _t, subtopic: _s, ...safeExam } = exam;

  return NextResponse.json(safeExam);
}
