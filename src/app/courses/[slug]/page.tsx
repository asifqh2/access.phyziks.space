// src/app/courses/[slug]/page.tsx
//
// Chapter detail page — server component.
//
// Architecture:
//   page.tsx (server)
//     ├─ breadcrumb (server HTML)
//     └─ CourseLayout (client) — provides ActiveSubtopicContext
//          ├─ ChapterSidebar (client) — full curriculum navigator
//          └─ AccessGate (server) — never enters client bundle
//               └─ PlayerWrapper (client) — reads context → ChapterPlayer

import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import AccessGate from '@/components/AccessGate';
import PlayerWrapper from './PlayerWrapper';
import CourseLayout, { type CourseChapter, type SidebarChapter } from './CourseLayout';

export const dynamic = 'force-dynamic';

// ── YouTube ID normalizer ─────────────────────────────────────────────────────
// The studio sometimes saves a full YouTube URL instead of the bare 11-char ID.
// This handles every common format so the embed always works:
//   https://www.youtube.com/watch?v=XXXXXXXXXXX
//   https://youtu.be/XXXXXXXXXXX
//   https://www.youtube.com/embed/XXXXXXXXXXX
//   XXXXXXXXXXX  (bare ID — returned as-is)

function normalizeYtId(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    // youtube.com/watch?v=
    const v = url.searchParams.get('v');
    if (v) return v;
    // youtu.be/<id>  or  youtube.com/embed/<id>
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  } catch {
    // Not a URL — treat as bare ID
  }
  return trimmed || null;
}

// ── Cached sidebar query ──────────────────────────────────────────────────────
// Called with a specific subjectId; the key includes the subjectId so each
// subject gets its own cache entry. TTL 60 s.

function getSidebarChapters(subjectId: string) {
  return unstable_cache(
    async () => {
      const rows = await prisma.chapter.findMany({
        where: { subjectId, isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id:               true,
          name:             true,
          slug:             true,
          isFree:           true,
          testPanelEnabled: true,
          topics: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
              id:             true,
              title:          true,
              youtubeVideoId: true,
              isFree:         true,
              subtopics: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
                select: {
                  id:             true,
                  title:          true,
                  youtubeVideoId: true,
                  isFree:         true,
                },
              },
            },
          },
        },
      });

      return rows.map((ch): SidebarChapter => ({
        id:               ch.id,
        name:             ch.name,
        slug:             ch.slug,
        isFree:           ch.isFree,
        testPanelEnabled: ch.testPanelEnabled,
        topics: ch.topics.map((t) => ({
          id:             t.id,
          title:          t.title,
          youtubeVideoId: normalizeYtId(t.youtubeVideoId),
          isFree:         t.isFree,
          subtopics: t.subtopics.map((s) => ({
            id:             s.id,
            title:          s.title,
            youtubeVideoId: normalizeYtId(s.youtubeVideoId),
            isFree:         s.isFree,
          })),
        })),
      }));
    },
    // Unique key per subject — prevents cross-subject cache collisions
    [`sidebar-chapters-${subjectId}`],
    { revalidate: 60, tags: ['curriculum', `curriculum-${subjectId}`] },
  )();
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/courses/${slug}`)}`);
  }

  // ── Fetch chapter first (need subjectId for the sidebar query) ────────────
  // Then fire both the sidebar cache lookup and nothing else — the chapter
  // query itself is the only sequential dependency.
  const chapter = await prisma.chapter.findFirst({
    where: { slug, isActive: true },
    include: {
      subject: { include: { class: true } },
      worksheets: {
        where:   { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select:  { id: true, title: true, content: true, sortOrder: true },
      },
      topics: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          worksheets: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { id: true, title: true, content: true, sortOrder: true },
          },
          subtopics: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              worksheets: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
                select: { id: true, title: true, content: true, sortOrder: true },
              },
            },
          },
        },
      },
    },
  });

  if (!chapter) notFound();

  // ── Sidebar data is cached — served from memory on repeat visits ──────────
  const sidebarChapters = await getSidebarChapters(chapter.subjectId);

  // Full chapter data for ChapterPlayer — normalize youtubeVideoId in every topic/subtopic
  const courseChapter: CourseChapter = {
    id:               chapter.id,
    name:             chapter.name,
    slug:             chapter.slug,
    description:      chapter.description,
    isFree:           chapter.isFree,
    videoKey:         chapter.videoKey,
    youtubeUrl:       chapter.youtubeUrl,
    b2VideoKey:       chapter.b2VideoKey,
    testPanelEnabled: chapter.testPanelEnabled,
    worksheets:  chapter.worksheets,
    topics: chapter.topics.map((t) => ({
      id:             t.id,
      title:          t.title,
      slug:           t.slug,
      description:    t.description,
      youtubeVideoId: normalizeYtId(t.youtubeVideoId),
      b2VideoKey:     t.b2VideoKey,
      duration:       t.duration,
      isFree:         t.isFree,
      worksheets:     t.worksheets,
      subtopics: t.subtopics.map((s) => ({
        id:             s.id,
        title:          s.title,
        slug:           s.slug,
        description:    s.description,
        youtubeVideoId: normalizeYtId(s.youtubeVideoId),
        b2VideoKey:     s.b2VideoKey,
        duration:       s.duration,
        isFree:         s.isFree,
        worksheets:     s.worksheets,
      })),
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">

      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-2 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-slate-500 overflow-x-auto flex-nowrap">
          <Link href="/dashboard" className="hover:text-indigo-600 transition-colors flex-shrink-0 whitespace-nowrap">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-300 flex-shrink-0" />
          <span className="text-slate-400 flex-shrink-0 whitespace-nowrap">{chapter.subject.class.name}</span>
          <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-300 flex-shrink-0" />
          <span className="text-slate-400 flex-shrink-0 whitespace-nowrap">{chapter.subject.name}</span>
          <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-300 flex-shrink-0" />
          <span className="font-medium text-slate-700 truncate min-w-0">{chapter.name}</span>
        </div>
      </div>

      {/* CourseLayout provides context; AccessGate+PlayerWrapper are children */}
      <CourseLayout
        chapterId={chapter.id}
        subjectId={chapter.subjectId}
        sidebarChapters={sidebarChapters}
        subjectName={chapter.subject.name}
      >
        <AccessGate
          resourceType="CHAPTER"
          resourceId={chapter.id}
          resourceName={chapter.name}
        >
          <PlayerWrapper chapter={courseChapter} />
        </AccessGate>
      </CourseLayout>

    </div>
  );
}
