// src/app/studio/page.tsx
//
// Instructor Studio — admin-only server page.
// Fetches the full LMS hierarchy including topics and subtopics per chapter.
// Chapter.videoKey is never sent to the client (replaced with hasVideo boolean).

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import StudioForm, { type StudioClass } from '@/components/StudioForm';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const { error } = await requireAdmin();
  if (error) {
    const status = (error as Response).status;
    if (status === 401) redirect('/sign-in');
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow p-10 text-center max-w-md">
          <p className="text-2xl font-bold text-slate-900">Access denied</p>
          <p className="mt-3 text-slate-500">The Instructor Studio is only available to administrators.</p>
        </div>
      </main>
    );
  }

  const rawClasses = await prisma.lmsClass.findMany({
    where:   { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      subjects: {
        orderBy: { sortOrder: 'asc' },
        include: {
          chapters: {
            orderBy: { sortOrder: 'asc' },
            include: {
              worksheets: {
                where:   { isActive: true },
                orderBy: { sortOrder: 'asc' },
                select:  { id: true, title: true, content: true, sortOrder: true, isActive: true },
              },
              topics: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  worksheets: {
                    where:   { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                    select:  { id: true, title: true, content: true, sortOrder: true, isActive: true },
                  },
                  subtopics: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                      worksheets: {
                        where:   { isActive: true },
                        orderBy: { sortOrder: 'asc' },
                        select:  { id: true, title: true, content: true, sortOrder: true, isActive: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const classes: StudioClass[] = rawClasses.map((cls) => ({
    id:   cls.id,
    name: cls.name,
    subjects: cls.subjects.map((sub) => ({
      id:   sub.id,
      name: sub.name,
      chapters: sub.chapters.map((ch) => ({
        id:          ch.id,
        name:        ch.name,
        slug:        ch.slug,
        sortOrder:   ch.sortOrder,
        isFree:      ch.isFree,
        isActive:    ch.isActive,
        youtubeUrl:       ch.youtubeUrl,
        description:      ch.description,
        hasVideo:         !!ch.videoKey,
        testPanelEnabled: ch.testPanelEnabled,
        worksheets:  ch.worksheets,
        topics: ch.topics.map((t) => ({
          id:             t.id,
          title:          t.title,
          slug:           t.slug,
          description:    t.description,
          youtubeVideoId: t.youtubeVideoId,
          duration:       t.duration,
          sortOrder:      t.sortOrder,
          isActive:       t.isActive,
          isFree:         t.isFree,
          worksheets:     t.worksheets,
          subtopics: t.subtopics.map((s) => ({
            id:             s.id,
            title:          s.title,
            slug:           s.slug,
            description:    s.description,
            youtubeVideoId: s.youtubeVideoId,
            duration:       s.duration,
            sortOrder:      s.sortOrder,
            isActive:       s.isActive,
            isFree:         s.isFree,
            worksheets:     s.worksheets,
          })),
        })),
      })),
    })),
  }));

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-5xl px-4">
        <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Instructor Studio</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Course content</h1>
        <p className="mt-3 max-w-2xl text-slate-500 text-sm">
          Manage chapters, topics and subtopics. Each topic/subtopic stores a YouTube video ID and duration.
        </p>

        <div className="mt-6 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
            <span>🔓</span> Free — no purchase needed
          </div>
          <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
            <span>🔒</span> Paid — requires entitlement
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 rounded-full px-3 py-1.5">
            <span>📄</span> Draft — hidden from students
          </div>
          {/* Test Paper Builder shortcut */}
          <Link
            href="/studio/test-paper"
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition-colors"
          >
            📋 Test Paper Builder →
          </Link>
        </div>

        <div className="mt-8">
          <StudioForm classes={classes} />
        </div>
      </div>
    </main>
  );
}
