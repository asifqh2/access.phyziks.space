// src/app/dashboard/report-card/page.tsx
//
// Student Report Card — server component.
// Queries the DB directly (same logic as the API route) to avoid an
// internal HTTP round-trip that would lose the Clerk auth cookie.

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, BarChart2, Lock } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';
import ReportCard from '@/components/ReportCard';
import type { ReportCardData, SubjectReport } from '@/app/api/dashboard/report-card/route';
import type { Prisma } from '../../../../generated/prisma/client';

export const dynamic = 'force-dynamic';

// ── Plan-gated scope resolution ───────────────────────────────────────────────
export type AllowedScope = 'subtopic' | 'topic' | 'subject' | 'multi' | 'all';

function resolveAllowedScopes(scopeTypes: string[], subjectCount: number): AllowedScope[] {
  const has = (t: string) => scopeTypes.includes(t);
  const scopes: AllowedScope[] = ['subtopic', 'topic'];
  if (has('SUBJECT') || has('COMPLETE') || has('CONFIGURABLE')) scopes.push('subject');
  if (has('COMPLETE') || has('CONFIGURABLE') || subjectCount >= 2) scopes.push('multi');
  if (has('COMPLETE') || subjectCount >= 3) scopes.push('all');
  return scopes;
}

// ── Aggregate helper ──────────────────────────────────────────────────────────
function aggregate(attempts: { percentage: number; passed: boolean; examId: string }[]) {
  if (attempts.length === 0) return { examCount: 0, attemptCount: 0, avgPct: 0, bestPct: 0, passRate: 0 };
  const examIds   = new Set(attempts.map((a) => a.examId));
  const total     = attempts.length;
  const sumPct    = attempts.reduce((s, a) => s + a.percentage, 0);
  const best      = Math.max(...attempts.map((a) => a.percentage));
  const passCount = attempts.filter((a) => a.passed).length;
  return {
    examCount:    examIds.size,
    attemptCount: total,
    avgPct:       Math.round(sumPct / total),
    bestPct:      Math.round(best),
    passRate:     Math.round((passCount / total) * 100),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default async function ReportCardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/dashboard/report-card');

  const now        = new Date();
  const adminUser  = await isAdmin();

  // ── 1. Resolve accessible subjects ───────────────────────────────────────
  const subjectExpiryMap = new Map<string, Date | null>();
  let dataWindowStart: Date | null = null;
  let dataWindowEnd:   Date | null = null;
  let accessibleSubjectIds: string[] | null = null; // null = admin (all)
  let allowedScopes: AllowedScope[]         = ['subtopic', 'topic', 'subject', 'multi', 'all'];

  if (!adminUser) {
    const entitlements = await prisma.entitlement.findMany({
      where: {
        clerkUserId: userId,
        status: 'ACTIVE',
        OR: [{ isPermanent: true }, { expiresAt: { gt: now } }],
      },
      include: {
        plan: { include: { completePackageItems: { select: { subjectId: true } } } },
        subject: { select: { id: true } },
        chapter: { select: { id: true, subjectId: true } },
      },
    });

    if (entitlements.length === 0) return <NoPlanGate />;

    const subjectIdSet = new Set<string>();
    for (const e of entitlements) {
      const expiry = e.expiresAt;
      if (e.scopeType === 'SUBJECT' && e.subjectId) {
        subjectIdSet.add(e.subjectId);
        subjectExpiryMap.set(e.subjectId, expiry);
      } else if (e.scopeType === 'CHAPTER' && e.chapter?.subjectId) {
        const sid = e.chapter.subjectId;
        subjectIdSet.add(sid);
        const existing = subjectExpiryMap.get(sid);
        if (!existing || (expiry && expiry > existing)) subjectExpiryMap.set(sid, expiry);
      } else if (e.scopeType === 'COMPLETE' || e.scopeType === 'CONFIGURABLE') {
        for (const item of e.plan.completePackageItems) {
          if (item.subjectId) {
            subjectIdSet.add(item.subjectId);
            const existing = subjectExpiryMap.get(item.subjectId);
            if (!existing || (e.expiresAt && e.expiresAt > existing)) {
              subjectExpiryMap.set(item.subjectId, e.expiresAt);
            }
          }
        }
      }
      if (!dataWindowStart || e.startsAt < dataWindowStart) dataWindowStart = e.startsAt;
      if (e.expiresAt && (!dataWindowEnd || e.expiresAt > dataWindowEnd)) dataWindowEnd = e.expiresAt;
    }

    accessibleSubjectIds = [...subjectIdSet];
    if (accessibleSubjectIds.length === 0) return <NoPlanGate />;

    const scopeTypes = [...new Set(entitlements.map((e) => e.scopeType))];
    allowedScopes    = resolveAllowedScopes(scopeTypes, subjectIdSet.size);
  }

  // ── 2. Load subject/chapter/topic/subtopic tree ────────────────────────
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

  // ── 3. Load exam IDs within scope ─────────────────────────────────────────
  const chapterIds  = subjects.flatMap((s) => s.chapters.map((c) => c.id));
  const topicIds    = subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => t.id)));
  const subtopicIds = subjects.flatMap((s) =>
    s.chapters.flatMap((c) => c.topics.flatMap((t) => t.subtopics.map((st) => st.id))),
  );

  const exams = await prisma.exam.findMany({
    where: {
      isActive: true,
      OR: [
        { chapterId:  { in: chapterIds  } },
        { topicId:    { in: topicIds    } },
        { subtopicId: { in: subtopicIds } },
      ],
    },
    select: { id: true, chapterId: true, topicId: true, subtopicId: true },
  });

  const examIds = exams.map((e) => e.id);

  // ── 4. Load attempts (within data window) ────────────────────────────────
  type AttemptRow = { id: string; examId: string; percentage: number; passed: boolean; completedAt: Date };
  const attemptFilter: Prisma.ExamAttemptWhereInput = {
    clerkUserId: userId,
    examId:      { in: examIds },
    ...(dataWindowStart ? { completedAt: { gte: dataWindowStart } } : {}),
  };
  const attempts: AttemptRow[] = await prisma.examAttempt.findMany({
    where:  attemptFilter,
    select: { id: true, examId: true, percentage: true, passed: true, completedAt: true },
  });

  // ── 5. Build lookup maps ──────────────────────────────────────────────────
  const examScopeMap = new Map(exams.map((e) => [e.id, e]));
  type Attempt = { examId: string; percentage: number; passed: boolean };

  const byChapter  = new Map<string, Attempt[]>();
  const byTopic    = new Map<string, Attempt[]>();
  const bySubtopic = new Map<string, Attempt[]>();

  for (const a of attempts) {
    const scope = examScopeMap.get(a.examId);
    if (!scope) continue;
    const entry: Attempt = { examId: a.examId, percentage: a.percentage, passed: a.passed };
    if (scope.chapterId)  { if (!byChapter.has(scope.chapterId))   byChapter.set(scope.chapterId, []);   byChapter.get(scope.chapterId)!.push(entry);  }
    if (scope.topicId)    { if (!byTopic.has(scope.topicId))       byTopic.set(scope.topicId, []);       byTopic.get(scope.topicId)!.push(entry);      }
    if (scope.subtopicId) { if (!bySubtopic.has(scope.subtopicId)) bySubtopic.set(scope.subtopicId, []); bySubtopic.get(scope.subtopicId)!.push(entry); }
  }

  // ── 6. Assemble report ────────────────────────────────────────────────────
  const subjectReports: SubjectReport[] = subjects.map((subject) => {
    const chapterReports = subject.chapters.map((chapter) => {
      const topicReports = chapter.topics.map((topic) => {
        const subtopicReports = topic.subtopics.map((st) => ({
          subtopicId:    st.id,
          subtopicTitle: st.title,
          ...aggregate(bySubtopic.get(st.id) ?? []),
        }));
        return { topicId: topic.id, topicTitle: topic.title, ...aggregate(byTopic.get(topic.id) ?? []), subtopics: subtopicReports };
      });
      return { chapterId: chapter.id, chapterName: chapter.name, ...aggregate(byChapter.get(chapter.id) ?? []), topics: topicReports };
    });

    const allSubjectAttempts: Attempt[] = [];
    for (const ch of subject.chapters) {
      allSubjectAttempts.push(...(byChapter.get(ch.id) ?? []));
      for (const t of ch.topics) {
        allSubjectAttempts.push(...(byTopic.get(t.id) ?? []));
        for (const st of t.subtopics) allSubjectAttempts.push(...(bySubtopic.get(st.id) ?? []));
      }
    }

    return {
      subjectId:   subject.id,
      subjectName: subject.name,
      className:   subject.class.name,
      expiresAt:   subjectExpiryMap.get(subject.id)?.toISOString() ?? null,
      ...aggregate(allSubjectAttempts),
      chapters: chapterReports,
    };
  });

  const reportData: ReportCardData = {
    subjects:        subjectReports,
    dataWindowStart: dataWindowStart?.toISOString() ?? null,
    dataWindowEnd:   dataWindowEnd?.toISOString()   ?? null,
  };

  const hasAnyAttempts = subjectReports.some((s) => s.attemptCount > 0);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-700 to-indigo-800 text-white py-10">
        <div className="container mx-auto max-w-6xl px-4">
          <nav className="flex items-center gap-1.5 text-violet-300 text-sm mb-4 flex-wrap">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white font-semibold">Report Card</span>
          </nav>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 flex-shrink-0">
              <BarChart2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold">My Report Card</h1>
              <p className="mt-1 text-violet-200 text-sm max-w-xl">
                Performance summary across all your exams — broken down by subtopic, topic, subject, and more.
              </p>
            </div>
          </div>

          {reportData.dataWindowStart && reportData.dataWindowEnd && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-violet-100">
              <BarChart2 className="h-4 w-4 flex-shrink-0" />
              Data window:{' '}
              <span className="font-semibold">
                {new Date(reportData.dataWindowStart).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </span>
              {' → '}
              <span className="font-semibold">
                {new Date(reportData.dataWindowEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </span>
              <span className="text-violet-300 text-xs ml-1">(12-month access period)</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-6xl px-4 mt-8">
        {!hasAnyAttempts ? (
          <NoAttemptsState />
        ) : (
          <ReportCard data={reportData} allowedScopes={allowedScopes} />
        )}
      </div>
    </main>
  );
}

// ── Gate: no active plan ──────────────────────────────────────────────────────

function NoPlanGate() {
  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-800 text-white py-10">
        <div className="container mx-auto max-w-6xl px-4">
          <nav className="flex items-center gap-1.5 text-violet-300 text-sm mb-4">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white font-semibold">Report Card</span>
          </nav>
          <h1 className="text-3xl font-extrabold">My Report Card</h1>
        </div>
      </div>
      <div className="container mx-auto max-w-6xl px-4 mt-20 flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 mb-5">
          <Lock className="h-9 w-9 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Active Plan</h2>
        <p className="text-slate-500 max-w-md">
          Your report card becomes available once you purchase a plan. Exam performance is
          tracked throughout your 12-month access period and displayed here.
        </p>
        <Link
          href="/pricing"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          View Plans
        </Link>
      </div>
    </main>
  );
}

// ── Empty state: plan active but no exam attempts yet ────────────────────────

function NoAttemptsState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
      <BarChart2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-slate-700 mb-1">No exam attempts yet</h3>
      <p className="text-slate-400 text-sm max-w-sm mx-auto">
        Complete some exams in your chapters and your performance will appear here.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        Go to My Courses
      </Link>
    </div>
  );
}
