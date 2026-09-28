'use client';

// src/hooks/useChapterProgress.ts
//
// Fetches and manages completion state for a single chapter.
//
// Usage:
//   const { completedTopicIds, completedSubtopicIds, markComplete, markIncomplete, pct } =
//     useChapterProgress({ chapterId, totalTopics, totalSubtopics });
//
// - completedTopicIds / completedSubtopicIds: Sets of completed IDs
// - pct: 0-100 completion percentage (topics + subtopics together)
// - markComplete / markIncomplete: optimistic updates + API call

import { useState, useEffect, useCallback } from 'react';

interface UseChapterProgressOptions {
  chapterId:      string;
  totalTopics:    number;
  totalSubtopics: number;
}

interface UseChapterProgressResult {
  completedTopicIds:    Set<string>;
  completedSubtopicIds: Set<string>;
  /** 0–100 percentage of completed items out of all topics + subtopics */
  pct:                  number;
  /** Number of completed items (topics + subtopics) */
  completedCount:       number;
  /** Total items (topics + subtopics) */
  totalCount:           number;
  loading:              boolean;
  markComplete:         (item: { topicId?: string; subtopicId?: string }) => void;
  markIncomplete:       (item: { topicId?: string; subtopicId?: string }) => void;
}

export function useChapterProgress({
  chapterId,
  totalTopics,
  totalSubtopics,
}: UseChapterProgressOptions): UseChapterProgressResult {
  const [completedTopicIds,    setCompletedTopicIds]    = useState<Set<string>>(new Set());
  const [completedSubtopicIds, setCompletedSubtopicIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // ── Initial fetch ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);

    fetch(`/api/lms/progress?chapterId=${encodeURIComponent(chapterId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setCompletedTopicIds(new Set<string>(data.completedTopicIds ?? []));
        setCompletedSubtopicIds(new Set<string>(data.completedSubtopicIds ?? []));
      })
      .catch(() => { /* silently ignore — progress is best-effort */ })
      .finally(() => setLoading(false));
  }, [chapterId]);

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
          // Rollback
          if (topicId) {
            setCompletedTopicIds((prev) => {
              const next = new Set(prev);
              next.delete(topicId);
              return next;
            });
          } else if (subtopicId) {
            setCompletedSubtopicIds((prev) => {
              const next = new Set(prev);
              next.delete(subtopicId);
              return next;
            });
          }
        }
      }).catch(() => {
        // Rollback on network failure
        if (topicId) {
          setCompletedTopicIds((prev) => {
            const next = new Set(prev);
            next.delete(topicId);
            return next;
          });
        } else if (subtopicId) {
          setCompletedSubtopicIds((prev) => {
            const next = new Set(prev);
            next.delete(subtopicId);
            return next;
          });
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
        setCompletedTopicIds((prev) => {
          const next = new Set(prev);
          next.delete(topicId);
          return next;
        });
      } else if (subtopicId) {
        setCompletedSubtopicIds((prev) => {
          const next = new Set(prev);
          next.delete(subtopicId);
          return next;
        });
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
  const totalCount     = totalTopics + totalSubtopics;
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
