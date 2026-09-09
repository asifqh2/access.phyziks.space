'use client';

// src/components/SubjectAccordion.tsx
//
// Client component that renders the "My Courses" subject list as a collapsible
// accordion. Only one subject is expanded at a time per class group.
// Fully responsive — stacks cleanly on mobile and tablet.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle, Lock, PlayCircle, AlertTriangle, ChevronDown, BookOpen,
} from 'lucide-react';
import type { MyEntitlementItem } from '@/types/lms';

// ─────────────────────────────────────────────────────────────────────────────
// Progress types
// ─────────────────────────────────────────────────────────────────────────────

export interface SubjectProgress {
  /** Total topics + subtopics across all chapters in this subject */
  total:     number;
  /** How many the user has marked complete */
  completed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// useNow — returns a Date that updates every minute so expiry badges stay live
// ─────────────────────────────────────────────────────────────────────────────

function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ─────────────────────────────────────────────────────────────────────────────
// Serialisable types (no Prisma Date objects — page.tsx serialises to ISO)
// ─────────────────────────────────────────────────────────────────────────────

export interface AccordionChapter {
  id:      string;
  name:    string;
  slug:    string;
  isFree:  boolean;
}

export interface AccordionSubject {
  id:       string;
  name:     string;
  chapters: AccordionChapter[];
}

export interface AccordionClass {
  id:       string;
  name:     string;
  subjects: AccordionSubject[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SubjectAccordionProps {
  classes:      AccordionClass[];
  active:       MyEntitlementItem[];
  expired:      MyEntitlementItem[];
  isAdmin?:     boolean;
  /** chapterId → topic count, used to show "N topics" in each chapter row */
  topicCounts?: Record<string, number>;
  /** True when no user is signed in — replaces "Unlock" with "Sign in" CTA */
  isGuest?:     boolean;
  /**
   * subjectId → { completed, total }
   * Pre-computed server-side so the accordion needs no extra fetches.
   */
  progressMap?: Record<string, SubjectProgress>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function SubjectAccordion({
  classes,
  active,
  expired,
  isAdmin   = false,
  topicCounts = {},
  isGuest   = false,
  progressMap = {},
}: SubjectAccordionProps) {
  // One open subject ID per class — key = classId, value = subjectId | null
  const [openSubject, setOpenSubject] = useState<Record<string, string | null>>({});

  // Live clock — updates every minute so expiry badges don't go stale
  const now = useNow();

  function toggle(classId: string, subjectId: string) {
    setOpenSubject((prev) => ({
      ...prev,
      [classId]: prev[classId] === subjectId ? null : subjectId,
    }));
  }

  return (
    <div className="space-y-8">
      {classes.map((cls) => (
        <div key={cls.id}>
          {/* Class label */}
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">
            {cls.name}
          </p>

          <div className="space-y-3">
            {cls.subjects.map((subject) => {
              const hasSubjectAccess = isAdmin || active.some(
                (e) =>
                  (e.scopeType === 'SUBJECT' && e.subject?.id === subject.id) ||
                  e.scopeType === 'COMPLETE',
              );

              const isOpen = openSubject[cls.id] === subject.id;
              const chapterCount = subject.chapters.length;
              const accessedCount = subject.chapters.filter((ch) =>
                isAdmin ||
                ch.isFree ||
                active.some(
                  (e) =>
                    (e.scopeType === 'CHAPTER' && e.chapter?.id === ch.id) ||
                    (e.scopeType === 'SUBJECT' && e.subject?.id === subject.id) ||
                    e.scopeType === 'COMPLETE',
                ),
              ).length;

              return (
                <div
                  key={subject.id}
                  className={`rounded-2xl border bg-white overflow-hidden shadow-sm transition-shadow duration-200 ${
                    isOpen ? 'border-indigo-200 shadow-indigo-100' : 'border-slate-200'
                  }`}
                >
                  {/* ── Subject header (toggle button) ── */}
                  <button
                    type="button"
                    onClick={() => toggle(cls.id, subject.id)}
                    className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left transition-colors duration-150 ${
                      isOpen ? 'bg-indigo-50' : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                    aria-expanded={isOpen}
                    aria-controls={`subject-chapters-${subject.id}`}
                  >
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isOpen ? 'bg-indigo-100' : 'bg-white border border-slate-200'
                      }`}
                    >
                      <BookOpen
                        className={`h-4 w-4 ${isOpen ? 'text-indigo-600' : 'text-slate-400'}`}
                      />
                    </div>

                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-bold text-sm sm:text-base truncate ${
                          isOpen ? 'text-indigo-900' : 'text-slate-900'
                        }`}
                      >
                        {subject.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}
                        {accessedCount > 0 && (
                          <span className="ml-2 text-indigo-500 font-medium">
                            · {accessedCount} accessible
                          </span>
                        )}
                      </p>

                      {/* ── Subject progress bar ── */}
                      {(() => {
                        const prog = progressMap[subject.id];
                        if (!prog || prog.total === 0) return null;
                        const pct = Math.round((prog.completed / prog.total) * 100);
                        return (
                          <div className="mt-2 space-y-0.5">
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                  pct === 100
                                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                    : 'bg-gradient-to-r from-indigo-400 to-indigo-600'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className={`text-[10px] font-semibold tabular-nums ${
                              pct === 100 ? 'text-emerald-600' : 'text-indigo-500'
                            }`}>
                              {prog.completed} / {prog.total} topics completed · {pct}%
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Right: access badge + chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {hasSubjectAccess ? (
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                          <CheckCircle className="h-3 w-3" />
                          Access active
                        </span>
                      ) : (
                        <span
                          onClick={(e) => e.stopPropagation()}
                          className="hidden sm:inline-block"
                        >
                          <Link
                            href={`/pricing?subjectId=${subject.id}`}
                            className="text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap"
                          >
                            Buy access →
                          </Link>
                        </span>
                      )}
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Mobile-only access row (shown below header when collapsed too) */}
                  {!hasSubjectAccess && (
                    <div className="sm:hidden border-t border-slate-100 px-4 py-2 bg-slate-50 flex items-center justify-between">
                      <span className="text-xs text-slate-400">No full access</span>
                      <Link
                        href={`/pricing?subjectId=${subject.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Buy access →
                      </Link>
                    </div>
                  )}
                  {hasSubjectAccess && (
                    <div className="sm:hidden border-t border-slate-100 px-4 py-2 bg-emerald-50 flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">Access active</span>
                    </div>
                  )}

                  {/* ── Chapter list (collapsible panel) ── */}
                  <div
                    id={`subject-chapters-${subject.id}`}
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <ul className="divide-y divide-slate-100">
                      {subject.chapters.map((chapter) => {
                        const chapterEntitlement = active.find(
                          (e) =>
                            (e.scopeType === 'CHAPTER' && e.chapter?.id === chapter.id) ||
                            (e.scopeType === 'SUBJECT' && e.subject?.id === subject.id) ||
                            e.scopeType === 'COMPLETE',
                        );
                        const hasAccess = isAdmin || chapter.isFree || !!chapterEntitlement;
                        const expiredEntitlement =
                          !hasAccess &&
                          expired.find(
                            (e) =>
                              (e.scopeType === 'CHAPTER' && e.chapter?.id === chapter.id) ||
                              (e.scopeType === 'SUBJECT' && e.subject?.id === subject.id),
                          );

                        return (
                          <li
                            key={chapter.id}
                            className={`flex items-center justify-between gap-3 px-4 sm:px-5 py-3 ${
                              hasAccess ? 'hover:bg-slate-50' : ''
                            } transition-colors`}
                          >
                            {/* Left: icon + name */}
                            <div className="flex items-center gap-3 min-w-0">
                              {hasAccess ? (
                                <PlayCircle className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                              ) : (
                                <Lock className="h-5 w-5 text-slate-300 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p
                                  className={`text-sm font-medium truncate ${
                                    hasAccess ? 'text-slate-900' : 'text-slate-400'
                                  }`}
                                >
                                  {chapter.name}
                                </p>
                                {/* Topic count + expired warning */}
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {(topicCounts[chapter.id] ?? 0) > 0 && (
                                    <span className="text-xs text-slate-400">
                                      {topicCounts[chapter.id]} topic{topicCounts[chapter.id] !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {expiredEntitlement && (
                                    <p className="text-xs text-amber-600 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                      Access expired
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: badge + action */}
                            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 text-right">
                              {hasAccess ? (
                                <>
                                  {isAdmin && !chapter.isFree && !chapterEntitlement ? (
                                    <span className="text-xs font-medium text-violet-600">Admin</span>
                                  ) : (
                                    <ChapterAccessBadge
                                      entitlement={chapterEntitlement}
                                      isFree={chapter.isFree}
                                      now={now}
                                    />
                                  )}
                                  <Link
                                    href={`/courses/${chapter.slug}`}
                                    className="text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap"
                                  >
                                    {chapter.isFree ? 'Watch free →' : 'Continue →'}
                                  </Link>
                                </>
                              ) : isGuest ? (
                                <Link
                                  href={`/sign-in?redirect_url=/courses/${chapter.slug}`}
                                  className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 hover:underline whitespace-nowrap"
                                >
                                  Sign in
                                </Link>
                              ) : (
                                <Link
                                  href={`/pricing?chapterId=${chapter.id}`}
                                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:underline whitespace-nowrap"
                                >
                                  {expiredEntitlement ? 'Renew' : 'Unlock'}
                                </Link>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChapterAccessBadge
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ChapterAccessBadge
// Shows live remaining time, recalculated every minute via the `now` prop.
// Urgency tiers mirror ExpiryCountdown in dashboard/page.tsx.
// ─────────────────────────────────────────────────────────────────────────────

function ChapterAccessBadge({
  entitlement,
  isFree,
  now,
}: {
  entitlement: MyEntitlementItem | undefined;
  isFree: boolean;
  now: Date;
}) {
  if (isFree) {
    return <span className="text-xs font-medium text-slate-400">Free</span>;
  }
  if (!entitlement) return null;

  // Legacy rows with no expiresAt (should be rare after migration)
  if (!entitlement.expiresAt) {
    return <span className="text-xs font-medium text-indigo-600">Active</span>;
  }

  const diffMs    = new Date(entitlement.expiresAt).getTime() - now.getTime();

  // Already expired in real time (before the page refreshes)
  if (diffMs <= 0) {
    return <span className="text-xs font-semibold text-red-500">Expired</span>;
  }

  const diffDays   = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);

  // ≤ 7 days → red, show exact days
  if (diffDays <= 7) {
    return (
      <span className="text-xs font-semibold text-red-600">
        {diffDays}d left
      </span>
    );
  }

  // ≤ 30 days → amber, show exact days
  if (diffDays <= 30) {
    return (
      <span className="text-xs font-semibold text-amber-600">
        {diffDays}d left
      </span>
    );
  }

  // ≤ 60 days → amber, show weeks
  if (diffDays <= 60) {
    const diffWeeks = Math.floor(diffDays / 7);
    return (
      <span className="text-xs font-medium text-amber-600">
        {diffWeeks}w left
      </span>
    );
  }

  // > 60 days → indigo, show months (+ leftover days if < full month)
  const remainderDays = diffDays - diffMonths * 30;
  const label = remainderDays > 0
    ? `${diffMonths}mo ${remainderDays}d`
    : `${diffMonths}mo`;

  return (
    <span className="text-xs font-medium text-indigo-600">
      {label} left
    </span>
  );
}
