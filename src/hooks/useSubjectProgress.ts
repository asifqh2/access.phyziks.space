'use client';

// src/hooks/useSubjectProgress.ts
//
// Fetches and manages completion state across ALL chapters in a subject.
//
// Usage:
//   const { completedTopicIds, completedSubtopicIds, markComplete, markIncomplete, pct } =
//     useSubjectProgress({ subjectId, sidebarChapters });
//
// - completedTopicIds / completedSubtopicIds: Sets of completed IDs (subject-wide)
// - pct:            0–100 completion percentage across every topic + subtopic in the subject
// - completedCount: number of completed items across the whole subject
// - totalCount:     total topics + subtopics across the whole subject
// - markComplete / markIncomplete: optimistic updates + API call

import { useState, useEffect, useCallback } from 'react';
import type { SidebarChapter } from '@/app/courses/[slug]/ChapterSidebar';

interface UseSubjectProgressOptions {
  subjectId:      string;
  sidebarChapters: SidebarChapter[];
}

interface UseSubjectProgressResult {
  completedTopicIds:    Set<string>;
  completedSubtopicIds: Set<string>;
  /** 0–100 percentage across the whole subject */
  pct:                  number;
  completedCount:       number;
  totalCount:           number;
  loading:              boolean;
  markComplete:         (item: { topicId?: string; subtopicId?: string }) => void;
  markIncomplete:       (item: { topicId?: string; subtopicId?: string }) => void;
}

export function useSubjectProgress({
  subjectId,
  sidebarChapters,
}: UseSubjectProgressOptions): UseSubjectProgressResult {
  const [completedTopicIds,    setCompletedTopicIds]    = useState<Set<string>>(new Set());
  const [completedSubtopicIds, setCompletedSubtopicIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // ── Total counts across the whole subject ─────────────────────────────────

  const totalTopics    = sidebarChapters.reduce((acc, ch) => acc + ch.topics.length, 0);
  const totalSubtopics = sidebarChapters.reduce(
    (acc, ch) => acc + ch.topics.reduce((a, t) => a + t.subtopics.length, 0),
    0,
  );
  const totalCount = totalTopics + totalSubtopics;

  // ── Initial fetch — subject-wide ──────────────────────────────────────────

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);

    fetch(`/api/lms/progress?subjectId=${encodeURIComponent(subjectId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setCompletedTopicIds(new Set<string>(data.completedTopicIds ?? []));
        setCompletedSubtopicIds(new Set<string>(data.completedSubtopicIds ?? []));
      })
      .catch(() => { /* silently ignore — progress is best-effort */ })
      .finally(() => setLoading(false));
  }, [subjectId]);

  // ── Mark complete (optimistic) ────────────────────────────────────────────

  const markComplete = useCallback(
    ({ topicId, subtopicId }: { topicId?: string; subtopicId?: string }) => {
      // Optimistic update
      if (topicId) {
        setCompletedTopicIds((prev) => new Set([...prev, topicId]));
      } else if (subtopicId) {
        setCompletedSubtopicIds((prev) => new Set([...prev, subtopicId]));
      }

      // Persist to server (fire-and-forget; rollback on error)
      fetch('/api/lms/progress', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ topicId, subtopicId }),
      }).then((r) => {
        if (!r.ok) {
          if (topicId) {
            setCompletedTopicIds((prev) => { const n = new Set(prev); n.delete(topicId); return n; });
          } else if (subtopicId) {
            setCompletedSubtopicIds((prev) => { const n = new Set(prev); n.delete(subtopicId); return n; });
          }
        }
      }).catch(() => {
        if (topicId) {
          setCompletedTopicIds((prev) => { const n = new Set(prev); n.delete(topicId); return n; });
        } else if (subtopicId) {
          setCompletedSubtopicIds((prev) => { const n = new Set(prev); n.delete(subtopicId); return n; });
        }
      });
    },
    [],
  );

  // ── Mark incomplete (optimistic) ─────────────────────────────────────────

  const markIncomplete = useCallback(
    ({ topicId, subtopicId }: { topicId?: string; subtopicId?: string }) => {
      // Optimistic update
      if (topicId) {
        setCompletedTopicIds((prev) => { const n = new Set(prev); n.delete(topicId); return n; });
      } else if (subtopicId) {
        setCompletedSubtopicIds((prev) => { const n = new Set(prev); n.delete(subtopicId); return n; });
      }

      // Persist
      fetch('/api/lms/progress', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ topicId, subtopicId }),
      }).then((r) => {
        if (!r.ok) {
          // Rollback — re-add the item
          if (topicId) {
            setCompletedTopicIds((prev) => new Set([...prev, topicId]));
          } else if (subtopicId) {
            setCompletedSubtopicIds((prev) => new Set([...prev, subtopicId]));
          }
        }
      }).catch(() => {
        if (topicId) {
          setCompletedTopicIds((prev) => new Set([...prev, topicId]));
        } else if (subtopicId) {
          setCompletedSubtopicIds((prev) => new Set([...prev, subtopicId]));
        }
      });
    },
    [],
  );

  // ── Derived values ────────────────────────────────────────────────────────

  const completedCount = completedTopicIds.size + completedSubtopicIds.size;
  const pct            = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    completedTopicIds,
    completedSubtopicIds,
    pct,
    completedCount,
    totalCount,
    loading,
    markComplete,
    markIncomplete,
  };
}
