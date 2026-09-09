'use client';

// src/app/courses/[slug]/CourseLayout.tsx
//
// Owns the "active item" state (what's playing right now) and provides it
// via ActiveSubtopicContext to PlayerWrapper across the server boundary.
// Also owns progress tracking for the current chapter via useChapterProgress.
//
// Layout:
//   [left sidebar — curriculum navigator]  [main — video player]

import { useState, useCallback, useMemo, type ReactNode } from 'react';
import ChapterSidebar, { type SidebarChapter } from './ChapterSidebar';
import MobileChapterDrawer from './MobileChapterDrawer';
import { ActiveSubtopicContext, type ActiveItem } from './ActiveSubtopicContext';
import { useSubjectProgress } from '@/hooks/useSubjectProgress';

export type { SidebarChapter };

// ── Chapter / topic / subtopic data shapes ────────────────────────────────────

/** A single worksheet attached to a topic or subtopic. */
export interface CourseWorksheet {
  id:        string;
  title:     string;
  content:   string; // raw HTML produced by TipTap
  sortOrder: number;
}

export interface CourseSubtopic {
  id:             string;
  title:          string;
  slug:           string;
  description:    string | null;
  youtubeVideoId: string | null;
  b2VideoKey:     string | null;  // non-null when hosted on Backblaze B2 via Cloudflare Worker
  duration:       number | null;
  isFree:         boolean;
  worksheets:     CourseWorksheet[];
}

export interface CourseTopic {
  id:             string;
  title:          string;
  slug:           string;
  description:    string | null;
  youtubeVideoId: string | null;
  b2VideoKey:     string | null;  // non-null when hosted on Backblaze B2 via Cloudflare Worker
  duration:       number | null;
  isFree:         boolean;
  subtopics:      CourseSubtopic[];
  worksheets:     CourseWorksheet[];
}

export interface CourseChapter {
  id:               string;
  name:             string;
  slug:             string;
  description:      string | null;
  isFree:           boolean;
  videoKey:         string | null;
  youtubeUrl:       string | null;
  b2VideoKey:       string | null;  // non-null when hosted on Backblaze B2 via Cloudflare Worker
  testPanelEnabled: boolean;
  topics:           CourseTopic[];
  worksheets:       CourseWorksheet[];
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CourseLayoutProps {
  chapterId:       string;
  subjectId:       string;
  /** Full chapter list with topics+subtopics for the sidebar navigator */
  sidebarChapters: SidebarChapter[];
  subjectName:     string;
  children:        ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CourseLayout({
  chapterId,
  subjectId,
  sidebarChapters,
  subjectName,
  children,
}: CourseLayoutProps) {
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);

  const setItem = useCallback((item: ActiveItem | null) => setActiveItem(item), []);

  const ctx = useMemo(() => ({ activeItem, setItem }), [activeItem, setItem]);

  // Progress tracks the entire subject — all chapters, topics, and subtopics
  const progress = useSubjectProgress({ subjectId, sidebarChapters });

  // When a topic/subtopic is selected, also auto-mark it as complete
  const setItemWithProgress = useCallback(
    (item: ActiveItem | null) => {
      setActiveItem(item);
      if (item?.kind === 'topic') {
        progress.markComplete({ topicId: item.id });
      } else if (item?.kind === 'subtopic') {
        progress.markComplete({ subtopicId: item.id });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress.markComplete],
  );

  return (
    <ActiveSubtopicContext.Provider value={ctx}>

      {/* Mobile drawer */}
      <div className="lg:hidden border-b border-slate-200 bg-white">
        <MobileChapterDrawer
          chapters={sidebarChapters}
          currentChapterId={chapterId}
          subjectName={subjectName}
          activeItem={activeItem}
          onSetItem={setItemWithProgress}
          completedTopicIds={progress.completedTopicIds}
          completedSubtopicIds={progress.completedSubtopicIds}
          pct={progress.pct}
          completedCount={progress.completedCount}
          totalCount={progress.totalCount}
          onMarkComplete={progress.markComplete}
          onMarkIncomplete={progress.markIncomplete}
        />
      </div>

      {/* Two-column body */}
      <div className="mx-auto max-w-7xl px-2 sm:px-4 py-4 lg:py-8 overflow-x-hidden">
        <div className="flex gap-6 items-start">

          {/* Left sidebar — sticky curriculum navigator */}
          <aside className="hidden lg:flex flex-col w-80 flex-shrink-0 self-start sticky top-4">
            <ChapterSidebar
              chapters={sidebarChapters}
              currentChapterId={chapterId}
              subjectName={subjectName}
              activeItem={activeItem}
              onSetItem={setItemWithProgress}
              completedTopicIds={progress.completedTopicIds}
              completedSubtopicIds={progress.completedSubtopicIds}
              pct={progress.pct}
              completedCount={progress.completedCount}
              totalCount={progress.totalCount}
              onMarkComplete={progress.markComplete}
              onMarkIncomplete={progress.markIncomplete}
            />
          </aside>

          {/* Main content — video player only */}
          <div className="min-w-0 flex-1 overflow-x-hidden">
            {children}
          </div>

        </div>
      </div>

    </ActiveSubtopicContext.Provider>
  );
}
