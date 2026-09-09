// src/app/courses/[slug]/exam/page.tsx
//
// Student Exam Window — server entry page.
//
// Route: /courses/:chapterSlug/exam
//
// This server component:
//   1. Verifies the user is signed in
//   2. Looks up the chapter by slug
//   3. Confirms testPanelEnabled = true; otherwise shows a locked state
//   4. Checks test-panel access (content entitlement OR standalone test-panel plan)
//   5. Passes the chapter data to the client ExamWindow component

import { redirect, notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { ChevronRight, Lock } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { checkTestPanelAccess } from '@/lib/test-panel-access';
import ExamWindow from '@/components/ExamWindow';

export const dynamic = 'force-dynamic';

export default async function ExamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/courses/${slug}/exam`)}`);
  }

  const chapter = await prisma.chapter.findFirst({
    where:  { slug, isActive: true },
    select: {
      id:               true,
      name:             true,
      testPanelEnabled: true,
      subject: {
        select: {
          id:   true,
          name: true,
          class: { select: { name: true } },
        },
      },
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
  });

  if (!chapter) notFound();

  // ── Locked: instructor has not enabled test panel for this chapter ─────────
  if (!chapter.testPanelEnabled) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <ExamBreadcrumb chapter={chapter} slug={slug} />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Lock className="h-7 w-7 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Test Panel Not Available</h2>
            <p className="mt-2 text-slate-500 text-sm">
              The instructor has not enabled the test panel for this chapter yet.
              Check back later or contact your instructor.
            </p>
            <Link
              href={`/courses/${slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Back to Chapter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Access check ──────────────────────────────────────────────────────────
  const { allowed, reason } = await checkTestPanelAccess(userId, chapter.id);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <ExamBreadcrumb chapter={chapter} slug={slug} />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
              <Lock className="h-7 w-7 text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Access Required</h2>
            <p className="mt-2 text-slate-500 text-sm">
              To access the Test Panel, you need either a content plan for this chapter
              or the standalone <strong>Test Panel — Practice Exams</strong> plan.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
              >
                View Plans
              </Link>
              <Link
                href={`/courses/${slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 transition-colors"
              >
                Back to Chapter
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  void reason; // access granted — reason logged for debugging

  return (
    <div className="min-h-screen bg-slate-50">
      <ExamBreadcrumb chapter={chapter} slug={slug} />
      <ExamWindow
        chapterId={chapter.id}
        chapterName={chapter.name}
        chapterSlug={slug}
        topics={chapter.topics}
      />
    </div>
  );
}

// ── Breadcrumb (server) ───────────────────────────────────────────────────────

function ExamBreadcrumb({
  chapter,
  slug,
}: {
  chapter: { name: string; subject: { name: string; class: { name: string } } };
  slug: string;
}) {
  return (
    <div className="bg-white border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-1.5 text-sm text-slate-500 flex-wrap">
        <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="text-slate-400">{chapter.subject.class.name}</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="text-slate-400">{chapter.subject.name}</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <Link href={`/courses/${slug}`} className="hover:text-indigo-600 transition-colors line-clamp-1">
          {chapter.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="font-medium text-violet-700">Test Panel</span>
      </div>
    </div>
  );
}
