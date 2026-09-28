// src/app/api/studio/exams/[examId]/stats/route.ts
//
// GET /api/studio/exams/:examId/stats
//
// Returns attempt analytics for the Test Paper Builder stats tab:
//   - totalAttempts, passRate, avgPercentage, avgTimeTaken
//   - score distribution (bucketed into 10-point ranges)
//   - per-question accuracy (% correct per question)

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { select: { id: true, type: true } },
      attempts: {
        select: {
          answers:    true,
          score:      true,
          totalMarks: true,
          percentage: true,
          passed:     true,
          timeTaken:  true,
        },
      },
    },
  });

  if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

  const attempts = exam.attempts;
  const total    = attempts.length;

  if (total === 0) {
    return NextResponse.json({
      totalAttempts:  0,
      passRate:       0,
      avgPercentage:  0,
      avgTimeTaken:   null,
      distribution:   [],
      questionStats:  [],
    });
  }

  const passCount  = attempts.filter((a) => a.passed).length;
  const passRate   = Math.round((passCount / total) * 100);
  const avgPct     = Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / total);
  const timeSamples = attempts.filter((a) => a.timeTaken !== null).map((a) => a.timeTaken as number);
  const avgTime    = timeSamples.length > 0
    ? Math.round(timeSamples.reduce((s, t) => s + t, 0) / timeSamples.length)
    : null;

  // Score distribution — 10-point buckets: 0-9, 10-19, …, 90-100
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range:   `${i * 10}–${i === 9 ? 100 : i * 10 + 9}%`,
    count:   0,
    percent: 0,
  }));
  for (const a of attempts) {
    const idx = Math.min(Math.floor(a.percentage / 10), 9);
    buckets[idx].count++;
  }
  for (const b of buckets) {
    b.percent = Math.round((b.count / total) * 100);
  }
  const distribution = buckets.filter((b) => b.count > 0);

  // Per-question accuracy
  const questionCorrect = new Map<string, number>(); // questionId → correct count
  const questionAttempts = new Map<string, number>();

  for (const a of attempts) {
    const answers = a.answers as Record<string, string | string[]>;
    for (const [qId] of Object.entries(answers)) {
      questionAttempts.set(qId, (questionAttempts.get(qId) ?? 0) + 1);
    }
  }

  // Fetch full questions to check correctness
  const questions = await prisma.examQuestion.findMany({
    where: { examId },
    select: { id: true, type: true, correctAnswer: true, options: true },
  });

  for (const a of attempts) {
    const answers = a.answers as Record<string, string | string[]>;
    for (const q of questions) {
      const given   = answers[q.id];
      const correct = q.correctAnswer;
      let isCorrect = false;

      if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
        isCorrect = String(given ?? '').trim().toLowerCase() === String(correct).trim().toLowerCase();
      } else if (q.type === 'MULTI_SELECT') {
        const g = Array.isArray(given)   ? [...given].sort()   : [];
        const c = Array.isArray(correct) ? [...correct].sort() : [];
        isCorrect = JSON.stringify(g) === JSON.stringify(c);
      } else if (q.type === 'SHORT_ANSWER' || q.type === 'FILL_IN_BLANK') {
        const kw = Array.isArray(correct) ? correct as string[] : [String(correct)];
        const givenStr = String(given ?? '').toLowerCase().trim();
        isCorrect = kw.some((k) => givenStr === k.toLowerCase().trim());
      } else if (q.type === 'MATCHING') {
        try {
          const givenMap: Record<string, string> = typeof given === 'string' ? JSON.parse(given) : {};
          const options = q.options as string[];
          isCorrect = options.every((raw) => {
            const pair = JSON.parse(raw) as { left: string; right: string };
            return (givenMap[pair.left] ?? '').trim().toLowerCase() === pair.right.trim().toLowerCase();
          });
        } catch { isCorrect = false; }
      } else if (q.type === 'NUMERICAL') {
        const corrArr   = Array.isArray(correct) ? correct as string[] : [String(correct), '0'];
        const target    = parseFloat(corrArr[0] ?? '0');
        const tolerance = parseFloat(corrArr[1] ?? '0');
        const givenNum  = parseFloat(String(given ?? ''));
        isCorrect = !isNaN(givenNum) && Math.abs(givenNum - target) <= Math.abs(tolerance);
      }

      if (isCorrect) questionCorrect.set(q.id, (questionCorrect.get(q.id) ?? 0) + 1);
    }
  }

  const questionStats = exam.questions.map((q) => {
    const att = questionAttempts.get(q.id) ?? 0;
    const cor = questionCorrect.get(q.id)  ?? 0;
    return {
      questionId: q.id,
      type:       q.type,
      correctPct: att > 0 ? Math.round((cor / att) * 100) : 0,
      attempts:   att,
    };
  });

  return NextResponse.json({
    totalAttempts:  total,
    passRate,
    avgPercentage:  avgPct,
    avgTimeTaken:   avgTime,
    distribution,
    questionStats,
  });
}
