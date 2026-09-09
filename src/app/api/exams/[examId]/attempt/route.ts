// src/app/api/exams/[examId]/attempt/route.ts
//
// POST /api/exams/:examId/attempt
// Submit a student's answers and receive scored results.
// Body: { answers: Record<questionId, string | string[]>, timeTaken?: number }
//
// Server-side grading: correct answers are fetched from DB here, never exposed
// to the client. Returns per-question feedback and overall score.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { checkTestPanelAccess } from '@/lib/test-panel-access';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId, isActive: true },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } }, // includes correctAnswer
      chapter:   { select: { id: true, testPanelEnabled: true } },
      topic:     { select: { chapterId: true, chapter: { select: { id: true, testPanelEnabled: true } } } },
      subtopic:  { select: { topic: { select: { chapter: { select: { id: true, testPanelEnabled: true } } } } } },
    },
  });

  if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

  const chapter = exam.chapter ?? exam.topic?.chapter ?? exam.subtopic?.topic?.chapter;
  if (!chapter?.testPanelEnabled) {
    return NextResponse.json({ error: 'Test panel not enabled' }, { status: 403 });
  }

  const { allowed } = await checkTestPanelAccess(userId, chapter.id);
  if (!allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { answers, timeTaken } = body as {
    answers: Record<string, string | string[]>;
    timeTaken?: number;
  };

  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'answers object is required' }, { status: 400 });
  }

  // ── Grade each question ────────────────────────────────────────────────────
  let score       = 0;
  let totalMarks  = 0;

  const feedback = exam.questions.map((q) => {
    totalMarks += q.marks;
    const given  = answers[q.id] ?? null;
    const correct = q.correctAnswer;

    let isCorrect = false;

    if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
      isCorrect = String(given).trim().toLowerCase() === String(correct).trim().toLowerCase();
    } else if (q.type === 'MULTI_SELECT') {
      const givenArr  = Array.isArray(given)   ? [...given].sort()   : [];
      const corrArr   = Array.isArray(correct) ? [...correct].sort() : [];
      isCorrect = JSON.stringify(givenArr) === JSON.stringify(corrArr);
    } else if (q.type === 'SHORT_ANSWER' || q.type === 'FILL_IN_BLANK') {
      // Keyword/answer match — case-insensitive substring check
      const keywords = Array.isArray(correct)
        ? correct as string[]
        : [String(correct)];
      const givenStr = String(given ?? '').toLowerCase().trim();
      isCorrect = keywords.some((kw) => givenStr === kw.toLowerCase().trim());
    } else if (q.type === 'MATCHING') {
      // given is a JSON string: { [left]: chosenRight }
      // correct is derived from options: each option is JSON { left, right }
      try {
        const givenMap: Record<string, string> = typeof given === 'string'
          ? JSON.parse(given)
          : {};
        const options = q.options as string[];
        isCorrect = options.every((raw) => {
          const pair = JSON.parse(raw) as { left: string; right: string };
          return (givenMap[pair.left] ?? '').trim().toLowerCase() === pair.right.trim().toLowerCase();
        });
      } catch { isCorrect = false; }
    } else if (q.type === 'NUMERICAL') {
      // correct = [value, tolerance] as string[]
      const corrArr = Array.isArray(correct) ? correct as string[] : [String(correct), '0'];
      const target    = parseFloat(corrArr[0] ?? '0');
      const tolerance = parseFloat(corrArr[1] ?? '0');
      const givenNum  = parseFloat(String(given ?? ''));
      isCorrect = !isNaN(givenNum) && Math.abs(givenNum - target) <= Math.abs(tolerance);
    }

    if (isCorrect) score += q.marks;

    return {
      questionId:    q.id,
      isCorrect,
      earnedMarks:   isCorrect ? q.marks : 0,
      correctAnswer: correct,  // reveal after submission
      explanation:   q.explanation,
    };
  });

  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const passed     = percentage >= exam.passingScore;

  // ── Persist attempt ───────────────────────────────────────────────────────
  const attempt = await prisma.examAttempt.create({
    data: {
      examId,
      clerkUserId: userId,
      answers,
      score,
      totalMarks,
      percentage,
      passed,
      timeTaken: typeof timeTaken === 'number' ? timeTaken : null,
    },
  });

  return NextResponse.json({
    attemptId:  attempt.id,
    score,
    totalMarks,
    percentage,
    passed,
    passingScore: exam.passingScore,
    timeTaken:  attempt.timeTaken,
    completedAt: attempt.completedAt,
    feedback,
  });
}
