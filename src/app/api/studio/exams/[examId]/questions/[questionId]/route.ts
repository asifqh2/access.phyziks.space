// src/app/api/studio/exams/[examId]/questions/[questionId]/route.ts
//
// PATCH  /api/studio/exams/:examId/questions/:questionId  → update a question
// DELETE /api/studio/exams/:examId/questions/:questionId  → delete a question

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string; questionId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { questionId } = await params;
  const existing = await prisma.examQuestion.findUnique({ where: { id: questionId } });
  if (!existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { question, type, options, correctAnswer, explanation, marks, sortOrder } =
    body as Record<string, unknown>;

  const updated = await prisma.examQuestion.update({
    where: { id: questionId },
    data: {
      ...(typeof question       === 'string'  && { question:      question.trim()                  }),
      ...(typeof type           === 'string'  && { type:          type as 'MCQ' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'MATCHING' | 'NUMERICAL' | 'ASSERTION_REASON' }),
      ...(Array.isArray(options)              && { options:       options as string[]              }),
      ...(correctAnswer !== undefined && correctAnswer !== null && { correctAnswer }),
      ...(typeof explanation    === 'string'  && { explanation:   explanation.trim() || null        }),
      ...(typeof marks          === 'number'  && { marks                                            }),
      ...(typeof sortOrder      === 'number'  && { sortOrder                                        }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string; questionId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { questionId } = await params;
  const existing = await prisma.examQuestion.findUnique({ where: { id: questionId } });
  if (!existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  await prisma.examQuestion.delete({ where: { id: questionId } });
  return NextResponse.json({ deleted: true });
}
