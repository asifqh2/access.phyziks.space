// src/app/studio/test-paper/page.tsx
//
// Test Paper Builder — dedicated admin interface.
// Route: /studio/test-paper
//
// Unlike the inline ExamsPanel inside StudioForm, this standalone page gives
// instructors a full two-panel editor: chapter browser on the left, rich
// question editor on the right.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import TestPaperBuilder from '@/components/TestPaperBuilder';

export const dynamic = 'force-dynamic';

export default async function TestPaperPage() {
  const { error } = await requireAdmin();
  if (error) {
    const status = (error as Response).status;
    if (status === 401) redirect('/sign-in');
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow p-10 text-center max-w-md">
          <p className="text-2xl font-bold text-slate-900">Access denied</p>
          <p className="mt-3 text-slate-500">The Test Paper Builder is only available to administrators.</p>
        </div>
      </main>
    );
  }

  // ── Fetch full class hierarchy + all exams ────────────────────────────────
  const rawClasses = await prisma.lmsClass.findMany({
    where:   { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      subjects: {
        orderBy: { sortOrder: 'asc' },
        include: {
          chapters: {
            where:   { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              topics: {
                where:   { isActive: true },
                orderBy: { sortOrder: 'asc' },
                select: {
                  id:    true,
                  title: true,
                  subtopics: {
                    where:   { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                    select:  { id: true, title: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Collect all chapter/topic/subtopic IDs for bulk exam fetch
  const chapterIds  = rawClasses.flatMap((cls) => cls.subjects.flatMap((sub) => sub.chapters.map((ch) => ch.id)));
  const topicIds    = rawClasses.flatMap((cls) => cls.subjects.flatMap((sub) => sub.chapters.flatMap((ch) => ch.topics.map((t) => t.id))));
  const subtopicIds = rawClasses.flatMap((cls) => cls.subjects.flatMap((sub) => sub.chapters.flatMap((ch) => ch.topics.flatMap((t) => t.subtopics.map((s) => s.id)))));

  const allExams = await prisma.exam.findMany({
    where: {
      OR: [
        { chapterId:  { in: chapterIds  } },
        { topicId:    { in: topicIds    } },
        { subtopicId: { in: subtopicIds } },
      ],
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } },
      _count:    { select: { attempts: true } },
    },
  });

  // Build topic/subtopic title lookup maps
  const topicTitleMap = new Map(
    rawClasses.flatMap((cls) =>
      cls.subjects.flatMap((sub) =>
        sub.chapters.flatMap((ch) => ch.topics.map((t) => [t.id, t.title])),
      ),
    ),
  );
  const subtopicTitleMap = new Map(
    rawClasses.flatMap((cls) =>
      cls.subjects.flatMap((sub) =>
        sub.chapters.flatMap((ch) =>
          ch.topics.flatMap((t) => t.subtopics.map((s) => [s.id, s.title])),
        ),
      ),
    ),
  );

  // Group exams by chapter
  const examsByChapter = new Map<string, typeof allExams>();
  for (const exam of allExams) {
    // Determine owning chapter id
    let owningChapterId: string | null = null;
    if (exam.chapterId) {
      owningChapterId = exam.chapterId;
    } else if (exam.topicId) {
      // Find which chapter owns this topic
      for (const cls of rawClasses) {
        for (const sub of cls.subjects) {
          for (const ch of sub.chapters) {
            if (ch.topics.some((t) => t.id === exam.topicId)) {
              owningChapterId = ch.id;
              break;
            }
          }
        }
      }
    } else if (exam.subtopicId) {
      for (const cls of rawClasses) {
        for (const sub of cls.subjects) {
          for (const ch of sub.chapters) {
            if (ch.topics.some((t) => t.subtopics.some((s) => s.id === exam.subtopicId))) {
              owningChapterId = ch.id;
              break;
            }
          }
        }
      }
    }
    if (!owningChapterId) continue;
    const list = examsByChapter.get(owningChapterId) ?? [];
    list.push(exam);
    examsByChapter.set(owningChapterId, list);
  }

  // Build the ClassGroup[] shape for TestPaperBuilder
  const classGroups = rawClasses.map((cls) => ({
    id:   cls.id,
    name: cls.name,
    subjects: cls.subjects.map((sub) => ({
      id:   sub.id,
      name: sub.name,
      chapters: sub.chapters.map((ch) => ({
        id:               ch.id,
        name:             ch.name,
        slug:             ch.slug,
        testPanelEnabled: ch.testPanelEnabled,
        subject: {
          id:    sub.id,
          name:  sub.name,
          class: { id: cls.id, name: cls.name },
        },
        topics: ch.topics.map((t) => ({
          id:    t.id,
          title: t.title,
          subtopics: t.subtopics.map((s) => ({ id: s.id, title: s.title })),
        })),
        exams: (examsByChapter.get(ch.id) ?? []).map((e) => ({
          id:               e.id,
          title:            e.title,
          description:      e.description,
          format:           e.format as 'STANDARD' | 'ASSERTION_BASED' | 'CASE_STUDY_BASED',
          caseStudyImageUrl: e.caseStudyImageUrl,
          timeLimit:        e.timeLimit,
          passingScore:     e.passingScore,
          shuffleQuestions: e.shuffleQuestions,
          isActive:         e.isActive,
          sortOrder:        e.sortOrder,
          chapterId:        e.chapterId,
          topicId:          e.topicId,
          subtopicId:       e.subtopicId,
          scopeLabel: e.chapterId
            ? ch.name
            : e.topicId
            ? (topicTitleMap.get(e.topicId) ?? 'Topic')
            : (subtopicTitleMap.get(e.subtopicId ?? '') ?? 'Subtopic'),
          questions: e.questions.map((q) => ({
            id:            q.id,
            question:      q.question,
            type:          q.type as 'MCQ' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER',
            options:       q.options as string[],
            correctAnswer: q.correctAnswer as string | string[],
            explanation:   q.explanation,
            marks:         q.marks,
            sortOrder:     q.sortOrder,
          })),
          _count: { attempts: e._count.attempts },
        })),
      })),
    })),
  }));

  const totalExams    = allExams.length;
  const totalQuestions = allExams.reduce((s, e) => s + e.questions.length, 0);
  const totalAttempts = allExams.reduce((s, e) => s + e._count.attempts, 0);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-3">
            <Link href="/studio" className="hover:text-indigo-600 transition-colors">
              Instructor Studio
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-slate-700">Test Paper Builder</span>
          </div>

          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Instructor Studio</p>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Test Paper Builder</h1>
              <p className="text-slate-500 text-sm mt-1">
                Create and manage practice exams for any chapter, topic, or subtopic.
              </p>
            </div>

            {/* Global stats */}
            <div className="flex items-center gap-5 text-center flex-shrink-0">
              <div>
                <p className="text-2xl font-extrabold text-violet-700">{totalExams}</p>
                <p className="text-xs text-slate-500">exams</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{totalQuestions}</p>
                <p className="text-xs text-slate-500">questions</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{totalAttempts}</p>
                <p className="text-xs text-slate-500">attempts</p>
              </div>
            </div>
          </div>

          {/* Quick legend */}
          <div className="flex flex-wrap gap-3 mt-4 text-[11px]">
            <span className="flex items-center gap-1.5 bg-violet-50 text-violet-700 rounded-full px-3 py-1 font-semibold">
              <span className="h-2 w-2 rounded-full bg-violet-600 inline-block" />
              Test Panel Enabled
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-600 rounded-full px-3 py-1 font-semibold">
              <span className="h-2 w-2 rounded-full bg-slate-400 inline-block" />
              Test Panel Disabled
            </span>
            <span className="ml-auto text-slate-400">
              Click a chapter in the sidebar → select or create an exam → build questions
            </span>
          </div>
        </div>
      </div>

      {/* Two-panel builder */}
      <div className="mx-auto max-w-[1400px]">
        <TestPaperBuilder classGroups={classGroups} />
      </div>
    </main>
  );
}
