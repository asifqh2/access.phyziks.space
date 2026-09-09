// src/app/api/studio/exams/[examId]/questions/route.ts
//
// POST   /api/studio/exams/:examId/questions  → add a question to an exam

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { examId } = await params;
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { question, type, options, correctAnswer, explanation, marks, sortOrder } =
    body as Record<string, unknown>;

  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'question text is required' }, { status: 400 });
  }
  if (!Array.isArray(options)) {
    return NextResponse.json({ error: 'options must be an array' }, { status: 400 });
  }
  if (correctAnswer === undefined || correctAnswer === null) {
    return NextResponse.json({ error: 'correctAnswer is required' }, { status: 400 });
  }

  // Count existing to auto-assign sortOrder if not provided
  const count = await prisma.examQuestion.count({ where: { examId } });

  const created = await prisma.examQuestion.create({
    data: {
      examId,
      question:      question.trim(),
      type:          (type as 'MCQ' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'MATCHING' | 'NUMERICAL' | 'ASSERTION_REASON') ?? 'MCQ',
      options,
      correctAnswer,
      explanation:   typeof explanation === 'string' ? explanation.trim() || null : null,
      marks:         typeof marks === 'number' ? marks : 1,
      sortOrder:     typeof sortOrder === 'number' ? sortOrder : count,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
