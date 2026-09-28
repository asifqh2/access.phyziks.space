'use client';

// src/app/courses/[slug]/MobileChapterDrawer.tsx
//
// Mobile (<lg) curriculum panel.
// Always shows: prev/next chapter buttons + chapter progress bar + current chapter name.
// Tap to expand the full topic/subtopic list for the current chapter.

import { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CurrentChapterTopics } from './ChapterSidebar';
import type { SidebarChapter } from './ChapterSidebar';
import type { ActiveItem } from './ActiveSubtopicContext';

interface MobileChapterDrawerProps {
  chapters:             SidebarChapter[];
  currentChapterId:     string;
  subjectName:          string;
  activeItem:           ActiveItem | null;
  onSetItem:            (item: ActiveItem | null) => void;
  // Progress props
  completedTopicIds:    Set<string>;
  completedSubtopicIds: Set<string>;
  pct:                  number;
  completedCount:       number;
  totalCount:           number;
  onMarkComplete:       (item: { topicId?: string; subtopicId?: string }) => void;
  onMarkIncomplete:     (item: { topicId?: string; subtopicId?: string }) => void;
}

export default function MobileChapterDrawer({
  chapters,
  currentChapterId,
  subjectName,
  activeItem,
  onSetItem,
  completedTopicIds,
  completedSubtopicIds,
  pct,
  completedCount,
  totalCount,
  onMarkComplete,
  onMarkIncomplete,
}: MobileChapterDrawerProps) {
  const [open, setOpen] = useState(false);

  const currentIndex = chapters.findIndex((c) => c.id === currentChapterId);
  const current      = chapters[currentIndex];
  const prev         = currentIndex > 0                   ? chapters[currentIndex - 1] : null;
  const next         = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  if (!current) return null;

  return (
    <div>
      {/* ── Always-visible bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">

        {/* Prev */}
        {prev ? (
          <Link
            href={`/courses/${prev.slug}`}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg
              text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            title={prev.name}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline truncate max-w-[6rem]">{prev.name}</span>
          </Link>
        ) : (
          <span className="flex-shrink-0 px-2 py-1.5 text-xs text-slate-300 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
        )}

        {/* Current chapter label + topics toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 min-w-0 flex items-center justify-between gap-2
            px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
              {subjectName} · Ch {currentIndex + 1}/{chapters.length}
            </p>
            <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
              {current.name}
            </p>
            {/* Mini progress bar */}
            {totalCount > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-slate-200 rounded-full h-1 overflow-hidden">
                  <div
                    className="h-1 rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-[10px] font-bold tabular-nums flex-shrink-0
                  ${pct === 100 ? 'text-emerald-600' : 'text-indigo-500'}`}>
                  {pct}%
                </span>
              </div>
            )}
          </div>
          {open
            ? <ChevronUp   className="h-4 w-4 text-slate-400 flex-shrink-0" />
            : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
          }
        </button>

        {/* Next */}
        {next ? (
          <Link
            href={`/courses/${next.slug}`}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg
              text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            title={next.name}
          >
            <span className="hidden sm:inline truncate max-w-[6rem]">{next.name}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="flex-shrink-0 px-2 py-1.5 text-xs text-slate-300 flex items-center gap-1">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {/* ── Expandable topic list ──────────────────────────────────────────── */}
      {open && (
        <div
          className="max-h-[60vh] overflow-y-auto overflow-x-hidden overscroll-contain border-b border-slate-100 bg-white"
        >
          {/* Chapter overview row — tap to go back to chapter level */}
          <button
            type="button"
            onClick={() => { onSetItem({ kind: 'chapter' }); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors border-b border-slate-100
              ${activeItem?.kind === 'chapter' || activeItem === null
                ? 'bg-indigo-100'
                : 'hover:bg-indigo-50'
              }`}
          >
            <span className="text-xs font-semibold text-indigo-600">▲ Chapter Overview</span>
          </button>
          <CurrentChapterTopics
            chapter={current}
            chapterIndex={currentIndex}
            activeItem={activeItem}
            onSetItem={(item) => { onSetItem(item); setOpen(false); }}
            completedTopicIds={completedTopicIds}
            completedSubtopicIds={completedSubtopicIds}
            onMarkComplete={onMarkComplete}
            onMarkIncomplete={onMarkIncomplete}
          />
        </div>
      )}
    </div>
  );
}
