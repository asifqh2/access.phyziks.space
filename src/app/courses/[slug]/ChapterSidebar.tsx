'use client';

// src/app/courses/[slug]/ChapterSidebar.tsx
//
// LMS sidebar:
//
//   ┌─ Header: subject name + chapter progress bar ───────┐
//   │  Chapter 3 of 20 · 4/12 completed · ████░░░░ 33%   │
//   ├─ Current chapter (expanded, full topic list) ────────┤
//   │    ✓ Topic 1  ▶                                     │
//   │      · ✓ Subtopic 1.1  ▶                            │
//   │      · ○ Subtopic 1.2  ▶                            │
//   │    ○ Topic 2  ▶                                     │
//   ├─ Other chapters (compact — name + link only) ────────┤
//   │  Ch 1  Introduction                                 │
//   │  Ch 2  …                                            │
//   ├──────────────────────────────────────────────────────┤
//   │  ← Prev Chapter          Next Chapter →             │
//   └──────────────────────────────────────────────────────┘

import Link from 'next/link';
import {
  PlayCircle, ChevronRight, CheckCircle2,
  ArrowLeft, ArrowRight, CheckCircle, ClipboardList,
} from 'lucide-react';
import type { ActiveItem } from './ActiveSubtopicContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SidebarSubtopic {
  id:             string;
  title:          string;
  youtubeVideoId: string | null;
  isFree:         boolean;
}

export interface SidebarTopic {
  id:             string;
  title:          string;
  youtubeVideoId: string | null;
  isFree:         boolean;
  subtopics:      SidebarSubtopic[];
}

export interface SidebarChapter {
  id:               string;
  name:             string;
  slug:             string;
  isFree:           boolean;
  testPanelEnabled: boolean;
  topics:           SidebarTopic[];
}

export interface ChapterSidebarProps {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function isActiveItem(item: ActiveItem | null, kind: 'topic' | 'subtopic', id: string) {
  return !!item && item.kind === kind && 'id' in item && item.id === id;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Topic + subtopic tree ─────────────────────────────────────────────────────
// Exported so MobileChapterDrawer can reuse it.

export interface CurrentChapterTopicsProps {
  chapter:              SidebarChapter;
  chapterIndex:         number;
  activeItem:           ActiveItem | null;
  onSetItem:            (item: ActiveItem | null) => void;
  completedTopicIds:    Set<string>;
  completedSubtopicIds: Set<string>;
  onMarkComplete:       (item: { topicId?: string; subtopicId?: string }) => void;
  onMarkIncomplete:     (item: { topicId?: string; subtopicId?: string }) => void;
}

export function CurrentChapterTopics({
  chapter,
  chapterIndex,
  activeItem,
  onSetItem,
  completedTopicIds,
  completedSubtopicIds,
  onMarkComplete,
  onMarkIncomplete,
}: CurrentChapterTopicsProps) {
  if (chapter.topics.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-slate-400 italic">
        No topics added yet.
      </p>
    );
  }

  return (
    <ul>
      {chapter.topics.map((topic, ti) => {
        const topicActive    = isActiveItem(activeItem, 'topic', topic.id);
        const hasTopicVideo  = !!topic.youtubeVideoId;
        const topicDone      = completedTopicIds.has(topic.id);

        return (
          <li key={topic.id}>
            {/* Topic row */}
            <div className={`
              flex items-center gap-2 pl-2 pr-2 py-2.5 transition-colors
              ${topicActive
                ? 'bg-indigo-600'
                : 'hover:bg-slate-100'
              }
            `}>
              {/* Completion tick — click to toggle */}
              <button
                type="button"
                title={topicDone ? 'Mark incomplete' : 'Mark complete'}
                onClick={(e) => {
                  e.stopPropagation();
                  topicDone
                    ? onMarkIncomplete({ topicId: topic.id })
                    : onMarkComplete({ topicId: topic.id });
                }}
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                  ${topicDone
                    ? topicActive
                      ? 'border-white bg-white'
                      : 'border-emerald-500 bg-emerald-500'
                    : topicActive
                    ? 'border-indigo-300 bg-transparent hover:border-white'
                    : 'border-slate-300 bg-transparent hover:border-indigo-400'
                  }`}
                aria-label={topicDone ? 'Mark as incomplete' : 'Mark as complete'}
              >
                {topicDone && (
                  <CheckCircle className={`h-3 w-3 ${topicActive ? 'text-indigo-600' : 'text-white'}`} />
                )}
              </button>

              <span className={`flex-shrink-0 text-[10px] font-mono w-5 text-right
                ${topicActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                {chapterIndex + 1}.{ti + 1}
              </span>

              {/* Clickable label area */}
              <button
                type="button"
                onClick={() => onSetItem({ kind: 'topic', id: topic.id })}
                className="flex-1 min-w-0 flex items-center gap-1.5 text-left cursor-pointer"
              >
                {hasTopicVideo
                  ? <PlayCircle className={`h-3.5 w-3.5 flex-shrink-0
                      ${topicActive ? 'text-white' : 'text-indigo-400'}`} />
                  : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                }
                <span className={`flex-1 min-w-0 text-xs font-semibold leading-snug break-words
                  ${topicActive ? 'text-white' : topicDone ? 'text-slate-500' : 'text-slate-800'}`}>
                  {topic.title}
                </span>
              </button>
            </div>

            {/* Subtopic rows */}
            {topic.subtopics.map((sub, si) => {
              const subActive  = isActiveItem(activeItem, 'subtopic', sub.id);
              const hasVideo   = !!sub.youtubeVideoId;
              const subDone    = completedSubtopicIds.has(sub.id);

              return (
                <div
                  key={sub.id}
                  className={`
                    flex items-center gap-2 pl-6 pr-2 py-2 transition-colors
                    border-t border-slate-100/80
                    ${subActive
                      ? 'bg-indigo-500'
                      : 'hover:bg-indigo-50'
                    }
                  `}
                >
                  {/* Completion tick */}
                  <button
                    type="button"
                    title={subDone ? 'Mark incomplete' : 'Mark complete'}
                    onClick={(e) => {
                      e.stopPropagation();
                      subDone
                        ? onMarkIncomplete({ subtopicId: sub.id })
                        : onMarkComplete({ subtopicId: sub.id });
                    }}
                    className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
                      ${subDone
                        ? subActive
                          ? 'border-white bg-white'
                          : 'border-emerald-500 bg-emerald-500'
                        : subActive
                        ? 'border-indigo-300 bg-transparent hover:border-white'
                        : 'border-slate-300 bg-transparent hover:border-indigo-400'
                      }`}
                    aria-label={subDone ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {subDone && (
                      <CheckCircle className={`h-2.5 w-2.5 ${subActive ? 'text-indigo-500' : 'text-white'}`} />
                    )}
                  </button>

                  <span className={`flex-shrink-0 text-[10px] font-mono w-7 text-right
                    ${subActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {chapterIndex + 1}.{ti + 1}.{si + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => onSetItem({ kind: 'subtopic', id: sub.id })}
                    className="flex-1 min-w-0 flex items-center gap-1.5 text-left cursor-pointer"
                    aria-pressed={subActive}
                    title={!hasVideo ? 'No video yet' : undefined}
                  >
                    <PlayCircle className={`h-3 w-3 flex-shrink-0
                      ${subActive ? 'text-white' : hasVideo ? 'text-indigo-300' : 'text-slate-300'}`} />
                    <span className={`flex-1 min-w-0 text-xs leading-snug break-words
                      ${subActive ? 'font-medium text-white' : subDone ? 'text-slate-400' : 'text-slate-600'}`}>
                      {sub.title}
                    </span>
                  </button>
                </div>
              );
            })}
          </li>
        );
      })}
    </ul>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export default function ChapterSidebar({
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
}: ChapterSidebarProps) {
  const currentIndex = chapters.findIndex((c) => c.id === currentChapterId);
  const current      = chapters[currentIndex];
  const prevChapter  = currentIndex > 0                   ? chapters[currentIndex - 1] : null;
  const nextChapter  = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  if (!current) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col max-h-[calc(100dvh-5rem)]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-3 bg-slate-50 border-b border-slate-100 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 truncate">
          {subjectName}
        </p>
        <p className="text-sm font-semibold text-slate-700">
          Chapter {currentIndex + 1}
          <span className="font-normal text-slate-400"> of {chapters.length}</span>
        </p>

        {/* Progress bar — only shown when there are items to track */}
        {totalCount > 0 && (
          <div className="space-y-1">
            <ProgressBar pct={pct} />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {completedCount} / {totalCount} completed
              </span>
              <span className={`text-[10px] font-bold tabular-nums
                ${pct === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                {pct}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────────── */}
      <div className="overflow-y-auto flex-1 overscroll-contain">

        {/* Current chapter — highlighted header + full topic list */}
        <div className="border-b border-slate-100">
          <button
            type="button"
            onClick={() => onSetItem({ kind: 'chapter' })}
            className={`w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors
              ${activeItem?.kind === 'chapter' || activeItem === null
                ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-200'
                : 'bg-indigo-50 hover:bg-indigo-100'
              }`}
            title="View chapter overview"
          >
            <span className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center
              ${activeItem?.kind === 'chapter' || activeItem === null
                ? 'bg-indigo-700'
                : 'bg-indigo-600'
              }`}>
              <CheckCircle2 className="h-3 w-3 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">
                Now studying
              </p>
              <p className="text-sm font-bold text-indigo-800 leading-snug break-words mt-0.5">
                {current.name}
              </p>
              {current.topics.length > 0 && (
                <p className="text-[10px] text-indigo-400 mt-1">
                  {current.topics.length} topic{current.topics.length !== 1 ? 's' : ''}
                  {' · '}
                  {current.topics.reduce((a, t) => a + t.subtopics.length, 0)} subtopics
                </p>
              )}
              {/* Take Test button — only shown when instructor has enabled the panel */}
              {current.testPanelEnabled && (
                <Link
                  href={`/courses/${current.slug}/exam`}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-violet-700 transition-colors"
                >
                  <ClipboardList className="h-3 w-3" />
                  Take Test
                </Link>
              )}
            </div>
          </button>

          <CurrentChapterTopics
            chapter={current}
            chapterIndex={currentIndex}
            activeItem={activeItem}
            onSetItem={onSetItem}
            completedTopicIds={completedTopicIds}
            completedSubtopicIds={completedSubtopicIds}
            onMarkComplete={onMarkComplete}
            onMarkIncomplete={onMarkIncomplete}
          />
        </div>

      </div>

      {/* ── Prev / Next navigation ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-slate-100 grid grid-cols-2 divide-x divide-slate-100">
        {prevChapter ? (
          <Link
            href={`/courses/${prevChapter.slug}`}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold
              text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors
              group truncate"
            title={prevChapter.name}
          >
            <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0 group-hover:text-indigo-500" />
            <span className="truncate">{prevChapter.name}</span>
          </Link>
        ) : (
          <span className="px-3 py-2.5 text-xs text-slate-300 flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            First chapter
          </span>
        )}

        {nextChapter ? (
          <Link
            href={`/courses/${nextChapter.slug}`}
            className="flex items-center justify-end gap-1.5 px-3 py-2.5 text-xs font-semibold
              text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors
              group truncate"
            title={nextChapter.name}
          >
            <span className="truncate text-right">{nextChapter.name}</span>
            <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 group-hover:text-indigo-500" />
          </Link>
        ) : (
          <span className="px-3 py-2.5 text-xs text-slate-300 flex items-center justify-end gap-1.5">
            Last chapter
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

    </div>
  );
}
