// src/app/api/studio/exams/[examId]/route.ts
//
// GET    /api/studio/exams/:examId  → fetch exam + questions
// PATCH  /api/studio/exams/:examId  → update exam metadata
// DELETE /api/studio/exams/:examId  → delete exam (cascades questions + attempts)

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
      questions: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { attempts: true } },
    },
  });
  if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
  return NextResponse.json(exam);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { examId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const existing = await prisma.exam.findUnique({ where: { id: examId } });
  if (!existing) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

  const { title, description, format, caseStudyImageUrl, timeLimit, passingScore, shuffleQuestions, isActive, sortOrder } =
    body as Record<string, unknown>;

  const VALID_FORMATS = ['STANDARD', 'ASSERTION_BASED', 'CASE_STUDY_BASED'];

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: {
      ...(typeof title            === 'string'  && { title:            title.trim()            }),
      ...(typeof description      === 'string'  && { description:      description.trim() || null }),
      ...(typeof format           === 'string'  && VALID_FORMATS.includes(format) && {
            format: format as 'STANDARD' | 'ASSERTION_BASED' | 'CASE_STUDY_BASED',
          }),
      ...(typeof caseStudyImageUrl === 'string' && { caseStudyImageUrl: caseStudyImageUrl.trim() || null }),
      ...(typeof timeLimit        === 'number'  && { timeLimit                                 }),
      ...(typeof passingScore     === 'number'  && { passingScore                              }),
      ...(typeof shuffleQuestions === 'boolean' && { shuffleQuestions                          }),
      ...(typeof isActive         === 'boolean' && { isActive                                  }),
      ...(typeof sortOrder        === 'number'  && { sortOrder                                 }),
    },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { attempts: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { examId } = await params;
  const existing = await prisma.exam.findUnique({ where: { id: examId } });
  if (!existing) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

  await prisma.exam.delete({ where: { id: examId } });
  return NextResponse.json({ deleted: true });
}
