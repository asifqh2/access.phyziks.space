// src/app/api/dashboard/report-card/route.ts
//
// GET /api/dashboard/report-card
//
// Returns a student's full performance report aggregated from ExamAttempt rows.
// Only data within the student's active entitlement window (up to 12 months)
// is included. Expired entitlements are excluded so no data leaks past expiry.
//
// Response shape:
//   {
//     subjects: SubjectReport[]      ← one per accessible subject
//     dataWindowStart: string | null ← earliest entitlement startsAt (ISO)
//     dataWindowEnd:   string | null ← earliest entitlement expiresAt (ISO)
//   }
//
// SubjectReport:
//   { subjectId, subjectName, className, expiresAt, chapters: ChapterReport[] }
//
// ChapterReport:
//   { chapterId, chapterName, examCount, attemptCount, avgPct, bestPct, passRate,
//     topics: TopicReport[] }
//
// TopicReport:
//   { topicId, topicTitle, examCount, attemptCount, avgPct, bestPct, passRate,
//     subtopics: SubtopicReport[] }
//
// SubtopicReport:
//   { subtopicId, subtopicTitle, examCount, attemptCount, avgPct, bestPct, passRate }
//
// All percentage values are 0–100 rounded integers.

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';
import type { Prisma } from '../../../../../generated/prisma/client';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SubtopicReport {
  subtopicId:    string;
  subtopicTitle: string;
  examCount:     number;
  attemptCount:  number;
  avgPct:        number;
  bestPct:       number;
  passRate:      number;
}

interface TopicReport {
  topicId:      string;
  topicTitle:   string;
  examCount:    number;
  attemptCount: number;
  avgPct:       number;
  bestPct:      number;
  passRate:     number;
  subtopics:    SubtopicReport[];
}

interface ChapterReport {
  chapterId:    string;
  chapterName:  string;
  examCount:    number;
  attemptCount: number;
  avgPct:       number;
  bestPct:      number;
  passRate:     number;
  topics:       TopicReport[];
}

export interface SubjectReport {
  subjectId:   string;
  subjectName: string;
  className:   string;
  expiresAt:   string | null;  // ISO — when access to this subject ends
  examCount:   number;
  attemptCount: number;
  avgPct:      number;
  bestPct:     number;
  passRate:    number;
  chapters:    ChapterReport[];
}

export interface ReportCardData {
  subjects:        SubjectReport[];
  dataWindowStart: string | null;
  dataWindowEnd:   string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — aggregate attempts into { examCount, attemptCount, avgPct, bestPct, passRate }
// ─────────────────────────────────────────────────────────────────────────────

function aggregate(attempts: { percentage: number; passed: boolean; examId: string }[]) {
  if (attempts.length === 0) {
    return { examCount: 0, attemptCount: 0, avgPct: 0, bestPct: 0, passRate: 0 };
  }
  const examIds    = new Set(attempts.map((a) => a.examId));
  const total      = attempts.length;
  const sumPct     = attempts.reduce((s, a) => s + a.percentage, 0);
  const best       = Math.max(...attempts.map((a) => a.percentage));
  const passCount  = attempts.filter((a) => a.passed).length;
  return {
    examCount:    examIds.size,
    attemptCount: total,
    avgPct:       Math.round(sumPct / total),
    bestPct:      Math.round(best),
    passRate:     Math.round((passCount / total) * 100),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const adminUser = await isAdmin();

  // ── 1. Resolve accessible subjects from active entitlements ───────────────
  // For admins, include all active subjects. For students, only subjects where
  // their entitlement is still within the 12-month window.

  let accessibleSubjectIds: string[] | null = null; // null = all (admin)
  let dataWindowStart: Date | null = null;
  let dataWindowEnd:   Date | null = null;

  // Map subjectId → expiresAt (the entitlement's expiry)
  const subjectExpiryMap = new Map<string, Date | null>();

  if (!adminUser) {
    const entitlements = await prisma.entitlement.findMany({
      where: {
        clerkUserId: userId,
        status: 'ACTIVE',
        // Only include entitlements still within their window
        OR: [
          { isPermanent: true },
          { expiresAt: { gt: now } },
        ],
      },
      include: {
        plan: {
          include: {
            completePackageItems: {
              select: { subjectId: true, classId: true },
            },
          },
        },
        subject: { select: { id: true } },
        chapter: { select: { id: true, subjectId: true } },
        class:   { select: { id: true } },
      },
    });

    if (entitlements.length === 0) {
      return NextResponse.json({
        subjects:        [],
        dataWindowStart: null,
        dataWindowEnd:   null,
      } satisfies ReportCardData);
    }

    const subjectIdSet = new Set<string>();

    for (const e of entitlements) {
      const expiry = e.expiresAt;

      if (e.scopeType === 'SUBJECT' && e.subjectId) {
        subjectIdSet.add(e.subjectId);
        subjectExpiryMap.set(e.subjectId, expiry);
      } else if (e.scopeType === 'CHAPTER' && e.chapter?.subjectId) {
        subjectIdSet.add(e.chapter.subjectId);
        // Take the latest expiry for a subject (user may have multiple chapters)
        const existing = subjectExpiryMap.get(e.chapter.subjectId);
        if (!existing || (expiry && expiry > existing)) {
          subjectExpiryMap.set(e.chapter.subjectId, expiry);
        }
      } else if (e.scopeType === 'COMPLETE' || e.scopeType === 'CONFIGURABLE') {
        for (const item of e.plan.completePackageItems) {
          if (item.subjectId) {
            subjectIdSet.add(item.subjectId);
            const existing = subjectExpiryMap.get(item.subjectId);
            if (!existing || (expiry && expiry > existing)) {
              subjectExpiryMap.set(item.subjectId, expiry);
            }
          }
        }
      }

      // Track data window
      if (!dataWindowStart || e.startsAt < dataWindowStart) dataWindowStart = e.startsAt;
      if (expiry && (!dataWindowEnd || expiry > dataWindowEnd)) dataWindowEnd = expiry;
    }

    accessibleSubjectIds = [...subjectIdSet];
    if (accessibleSubjectIds.length === 0) {
      return NextResponse.json({
        subjects:        [],
        dataWindowStart: null,
        dataWindowEnd:   null,
      } satisfies ReportCardData);
    }
  }

  // ── 2. Load the full subject/chapter/topic/subtopic tree ─────────────────

  const subjects = await prisma.subject.findMany({
    where: {
      isActive: true,
      ...(accessibleSubjectIds ? { id: { in: accessibleSubjectIds } } : {}),
    },
    orderBy: [{ class: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    include: {
      class: { select: { name: true } },
      chapters: {
        where:   { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          topics: {
            where:   { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
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
  });

  // ── 3. Load all exam attempts for this user within the data window ─────────
  // Collect every exam id reachable from the subject tree first

  const chapterIds  = subjects.flatMap((s) => s.chapters.map((c) => c.id));
  const topicIds    = subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => t.id)));
  const subtopicIds = subjects.flatMap((s) =>
    s.chapters.flatMap((c) => c.topics.flatMap((t) => t.subtopics.map((st) => st.id))),
  );

  // Find all active exams in these chapters/topics/subtopics
  const exams = await prisma.exam.findMany({
    where: {
      isActive: true,
      OR: [
        { chapterId:  { in: chapterIds  } },
        { topicId:    { in: topicIds    } },
        { subtopicId: { in: subtopicIds } },
      ],
    },
    select: {
      id:         true,
      chapterId:  true,
      topicId:    true,
      subtopicId: true,
    },
  });

  const examIds = exams.map((e) => e.id);

  // Fetch attempts — only within the 12-month data window
  const attemptWhere: Prisma.ExamAttemptWhereInput = {
    clerkUserId: userId,
    examId:      { in: examIds },
  };
  if (dataWindowStart) {
    attemptWhere.completedAt = { gte: dataWindowStart };
  }

  const attempts = await prisma.examAttempt.findMany({
    where:   attemptWhere,
    select:  {
      id:          true,
      examId:      true,
      percentage:  true,
      passed:      true,
      completedAt: true,
    },
  });

  // ── 4. Build lookup maps ───────────────────────────────────────────────────

  // examId → { chapterId, topicId, subtopicId }
  const examScopeMap = new Map(exams.map((e) => [e.id, e]));

  // Attempt arrays per scope
  type Attempt = { examId: string; percentage: number; passed: boolean };
  const byChapter   = new Map<string, Attempt[]>();
  const byTopic     = new Map<string, Attempt[]>();
  const bySubtopic  = new Map<string, Attempt[]>();
  const bySubject   = new Map<string, Attempt[]>();

  for (const a of attempts) {
    const scope = examScopeMap.get(a.examId);
    if (!scope) continue;

    const entry: Attempt = { examId: a.examId, percentage: a.percentage, passed: a.passed };

    if (scope.chapterId) {
      if (!byChapter.has(scope.chapterId)) byChapter.set(scope.chapterId, []);
      byChapter.get(scope.chapterId)!.push(entry);
    }
    if (scope.topicId) {
      if (!byTopic.has(scope.topicId)) byTopic.set(scope.topicId, []);
      byTopic.get(scope.topicId)!.push(entry);
    }
    if (scope.subtopicId) {
      if (!bySubtopic.has(scope.subtopicId)) bySubtopic.set(scope.subtopicId, []);
      bySubtopic.get(scope.subtopicId)!.push(entry);
    }
  }

  // ── 5. Assemble report ────────────────────────────────────────────────────

  const subjectReports: SubjectReport[] = subjects.map((subject) => {
    const chapterReports: ChapterReport[] = subject.chapters.map((chapter) => {
      const topicReports: TopicReport[] = chapter.topics.map((topic) => {
        const subtopicReports: SubtopicReport[] = topic.subtopics.map((subtopic) => {
          const stAttempts = bySubtopic.get(subtopic.id) ?? [];
          return {
            subtopicId:    subtopic.id,
            subtopicTitle: subtopic.title,
            ...aggregate(stAttempts),
          };
        });

        const topicAttempts = byTopic.get(topic.id) ?? [];
        return {
          topicId:    topic.id,
          topicTitle: topic.title,
          ...aggregate(topicAttempts),
          subtopics: subtopicReports,
        };
      });

      const chAttempts = byChapter.get(chapter.id) ?? [];
      return {
        chapterId:   chapter.id,
        chapterName: chapter.name,
        ...aggregate(chAttempts),
        topics: topicReports,
      };
    });

    // Subject-level aggregate = all attempts across all chapters/topics/subtopics
    const allSubjectAttempts: Attempt[] = [];
    for (const ch of subject.chapters) {
      allSubjectAttempts.push(...(byChapter.get(ch.id)  ?? []));
      for (const t of ch.topics) {
        allSubjectAttempts.push(...(byTopic.get(t.id)   ?? []));
        for (const st of t.subtopics) {
          allSubjectAttempts.push(...(bySubtopic.get(st.id) ?? []));
        }
      }
    }
    bySubject.set(subject.id, allSubjectAttempts);

    return {
      subjectId:   subject.id,
      subjectName: subject.name,
      className:   subject.class.name,
      expiresAt:   subjectExpiryMap.get(subject.id)?.toISOString() ?? null,
      ...aggregate(allSubjectAttempts),
      chapters: chapterReports,
    };
  });

  return NextResponse.json({
    subjects:        subjectReports,
    dataWindowStart: dataWindowStart?.toISOString() ?? null,
    dataWindowEnd:   dataWindowEnd?.toISOString()   ?? null,
  } satisfies ReportCardData);
}
