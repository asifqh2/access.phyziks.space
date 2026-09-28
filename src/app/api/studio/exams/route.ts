// src/app/api/studio/exams/route.ts
//
// Admin-only CRUD for Exams attached to a chapter, topic, or subtopic.
//
// GET  /api/studio/exams?chapterId=X   → list exams for a chapter (all scopes)
// GET  /api/studio/exams?topicId=X     → list exams for a topic
// GET  /api/studio/exams?subtopicId=X  → list exams for a subtopic
// POST /api/studio/exams               → create an exam

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const chapterId  = searchParams.get('chapterId')  ?? undefined;
  const topicId    = searchParams.get('topicId')    ?? undefined;
  const subtopicId = searchParams.get('subtopicId') ?? undefined;

  if (!chapterId && !topicId && !subtopicId) {
    return NextResponse.json(
      { error: 'Provide chapterId, topicId, or subtopicId' },
      { status: 400 },
    );
  }

  const where = chapterId  ? { chapterId }
              : topicId    ? { topicId }
              : { subtopicId };

  const exams = await prisma.exam.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { attempts: true } },
    },
  });

  return NextResponse.json(exams);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const {
    chapterId, topicId, subtopicId,
    title, description, format, caseStudyImageUrl,
    timeLimit, passingScore, shuffleQuestions, sortOrder,
  } = body as Record<string, unknown>;

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (!chapterId && !topicId && !subtopicId) {
    return NextResponse.json(
      { error: 'Provide chapterId, topicId, or subtopicId' },
      { status: 400 },
    );
  }

  const VALID_FORMATS = ['STANDARD', 'ASSERTION_BASED', 'CASE_STUDY_BASED'];
  const resolvedFormat = typeof format === 'string' && VALID_FORMATS.includes(format)
    ? (format as 'STANDARD' | 'ASSERTION_BASED' | 'CASE_STUDY_BASED')
    : 'STANDARD';

  const exam = await prisma.exam.create({
    data: {
      chapterId:         (chapterId  as string)  ?? null,
      topicId:           (topicId    as string)  ?? null,
      subtopicId:        (subtopicId as string)  ?? null,
      title:             title.trim(),
      description:       typeof description === 'string' ? description.trim() || null : null,
      format:            resolvedFormat,
      caseStudyImageUrl: typeof caseStudyImageUrl === 'string' ? caseStudyImageUrl.trim() || null : null,
      timeLimit:         typeof timeLimit    === 'number' ? timeLimit    : 30,
      passingScore:      typeof passingScore === 'number' ? passingScore : 60,
      shuffleQuestions:  typeof shuffleQuestions === 'boolean' ? shuffleQuestions : false,
      sortOrder:         typeof sortOrder === 'number' ? sortOrder : 0,
    },
    include: {
      questions: true,
      _count: { select: { attempts: true } },
    },
  });

  return NextResponse.json(exam, { status: 201 });
}
