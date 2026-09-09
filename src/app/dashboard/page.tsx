// src/app/dashboard/page.tsx
//
// User dashboard — shows active entitlements, expiry dates, and a
// "My Courses" view grouped by subject/chapter.
//
// All data is fetched server-side. The entitlement check runs on the
// server; no sensitive access data is sent to the client unnecessarily.

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  BookOpen, CheckCircle, Clock,
  Package, Star, BarChart2,
} from 'lucide-react';
import type { MyEntitlementItem, EntitlementStatus } from '@/types/lms';
import SubjectAccordion, { type SubjectProgress } from '@/components/SubjectAccordion';
import { isAdmin } from '@/lib/auth-helpers';
import UpgradeBanner from '@/components/UpgradeBanner';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const params = await searchParams;
  const justPaid = params.payment === 'success';

  const adminUser = await isAdmin();

  // Fetch user's entitlements
  const rawEntitlements = await prisma.entitlement.findMany({
    where: {
      clerkUserId: userId,
      status: { in: ['ACTIVE', 'EXPIRED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      plan:    { select: { name: true, slug: true, scopeType: true } },
      class:   { select: { id: true, name: true, slug: true } },
      subject: { select: { id: true, name: true, slug: true } },
      chapter: { select: { id: true, name: true, slug: true } },
    },
  });

  // Real-time expiry evaluation
  const now = new Date();
  const entitlements: MyEntitlementItem[] = rawEntitlements.map((e) => {
    const isExpiredNow = !e.isPermanent && e.expiresAt != null && e.expiresAt <= now;
    return {
      id: e.id,
      scopeType: e.scopeType as MyEntitlementItem['scopeType'],
      isPermanent: e.isPermanent,
      expiresAt: e.expiresAt?.toISOString() ?? null,
      status: (isExpiredNow ? 'EXPIRED' : e.status) as EntitlementStatus,
      plan: e.plan,
      class: e.class,
      subject: e.subject,
      chapter: e.chapter,
    };
  });

  const active  = entitlements.filter((e) => e.status === 'ACTIVE');
  const expired = entitlements.filter((e) => e.status === 'EXPIRED');

  // ── Per-subject upgrade banner logic ──────────────────────────────────────
  // For each subject where the user has 1–7 active CHAPTER entitlements
  // and NO subject-level or complete access, compute the upgrade price and
  // prepare a banner. Skipped entirely for admins.

  const MAX_CHAPTERS_FOR_UPGRADE  = 7;
  const UPGRADE_SURCHARGE_FILS    = 100; // AED 1

  type SubjectBanner = {
    subjectId:    string;
    subjectName:  string;
    className:    string;
    chapterCount: number;
    upgradePrice: number;
    subjectPrice: number;
  };

  let subjectBanners: SubjectBanner[] = [];

  if (!adminUser) {
    // Subjects where user already has broader access — exclude these
    const broadSubjectIds = new Set(
      active
        .filter((e) => e.scopeType === 'SUBJECT' || e.scopeType === 'COMPLETE')
        .map((e) => e.subject?.id)
        .filter(Boolean) as string[],
    );
    const hasCompleteAccess = active.some((e) => e.scopeType === 'COMPLETE');

    if (!hasCompleteAccess) {
      // Group chapter entitlements by subjectId
      const chaptersBySubject = new Map<string, number>();
      for (const e of active) {
        if (e.scopeType === 'CHAPTER' && e.subject?.id && !broadSubjectIds.has(e.subject.id)) {
          chaptersBySubject.set(
            e.subject.id,
            (chaptersBySubject.get(e.subject.id) ?? 0) + 1,
          );
        }
      }

      // Only proceed if there are qualifying subjects
      if (chaptersBySubject.size > 0) {
        // Fetch plan prices once
        const [subjectPlan, chapterPlan] = await Promise.all([
          prisma.plan.findUnique({ where: { slug: 'subject-aed'  }, select: { pricePaise: true } }),
          prisma.plan.findUnique({ where: { slug: 'chapter-aed'  }, select: { pricePaise: true } }),
        ]);

        if (subjectPlan && chapterPlan) {
          for (const [subjectId, count] of chaptersBySubject) {
            if (count < 1 || count > MAX_CHAPTERS_FOR_UPGRADE) continue;

            // Find subject name + class name from active entitlements
            const ref = active.find(
              (e) => e.scopeType === 'CHAPTER' && e.subject?.id === subjectId,
            );
            const subjectName = ref?.subject?.name ?? 'Subject';
            const className   = ref?.class?.name   ?? '';

            const alreadyPaid   = count * chapterPlan.pricePaise;
            const upgradePrice  = Math.max(
              subjectPlan.pricePaise - alreadyPaid + UPGRADE_SURCHARGE_FILS,
              UPGRADE_SURCHARGE_FILS,
            );

            subjectBanners.push({
              subjectId,
              subjectName,
              className,
              chapterCount: count,
              upgradePrice,
              subjectPrice: subjectPlan.pricePaise,
            });
          }
        }
      }
    }
  }

  // Fetch all classes/subjects/chapters for the "My Courses" view
  const allClasses = await prisma.lmsClass.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      subjects: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          chapters: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  // ── Per-subject progress ───────────────────────────────────────────────────
  // For each subject we need: total (topics + subtopics) and how many the user
  // has completed. We build the map server-side so SubjectAccordion is pure UI.

  const progressMap: Record<string, SubjectProgress> = {};

  if (allClasses.length > 0) {
    // Collect all subject IDs across all classes
    const allSubjectIds = allClasses.flatMap((cls) => cls.subjects.map((s) => s.id));

    // Fetch topics + subtopic counts grouped by subject (via chapter → topic → subtopic)
    const topicsWithSubjects = await prisma.topic.findMany({
      where: {
        isActive: true,
        chapter: {
          isActive:  true,
          subjectId: { in: allSubjectIds },
        },
      },
      select: {
        id:       true,
        chapter:  { select: { subjectId: true } },
        subtopics: {
          where:  { isActive: true },
          select: { id: true },
        },
      },
    });

    // Build subjectId → { topicIds[], subtopicIds[] }
    const subjectItemIds = new Map<string, { topicIds: string[]; subtopicIds: string[] }>();
    for (const topic of topicsWithSubjects) {
      const sid = topic.chapter.subjectId;
      if (!subjectItemIds.has(sid)) subjectItemIds.set(sid, { topicIds: [], subtopicIds: [] });
      const entry = subjectItemIds.get(sid)!;
      entry.topicIds.push(topic.id);
      entry.subtopicIds.push(...topic.subtopics.map((s) => s.id));
    }

    // Fetch this user's completed progress in one query
    const allTopicIds    = topicsWithSubjects.map((t) => t.id);
    const allSubtopicIds = topicsWithSubjects.flatMap((t) => t.subtopics.map((s) => s.id));

    const userProgress = await prisma.userProgress.findMany({
      where: {
        clerkUserId: userId,
        OR: [
          { topicId:    { in: allTopicIds    } },
          { subtopicId: { in: allSubtopicIds } },
        ],
      },
      select: { topicId: true, subtopicId: true },
    });

    const completedTopicIds    = new Set(userProgress.map((p) => p.topicId).filter(Boolean) as string[]);
    const completedSubtopicIds = new Set(userProgress.map((p) => p.subtopicId).filter(Boolean) as string[]);

    // Build the progressMap for each subject
    for (const [sid, { topicIds, subtopicIds }] of subjectItemIds) {
      const total     = topicIds.length + subtopicIds.length;
      const completed =
        topicIds.filter((id) => completedTopicIds.has(id)).length +
        subtopicIds.filter((id) => completedSubtopicIds.has(id)).length;
      progressMap[sid] = { total, completed };
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white py-10">
        <div className="container mx-auto max-w-5xl px-4">
          <p className="text-indigo-300 text-sm font-semibold uppercase tracking-widest">My Learning</p>
          <h1 className="mt-1 text-3xl font-extrabold">Dashboard</h1>
          <p className="mt-2 text-indigo-200 text-sm">
            {adminUser
              ? 'Admin — full access to all content.'
              : active.length === 0
              ? 'You have no active purchases yet.'
              : `${active.length} active entitlement${active.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 mt-8 space-y-8">

        {/* Payment success banner */}
        {justPaid && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-800">Payment received!</p>
              <p className="text-sm text-emerald-700 mt-0.5">
                Your access is being activated. It may take a few seconds to appear below.
                Refresh the page if it&apos;s not visible yet.
              </p>
            </div>
          </div>
        )}

        {/* Per-subject upgrade banners — chapter-only buyers */}
        {subjectBanners.map((banner) => (
          <UpgradeBanner
            key={banner.subjectId}
            subjectId={banner.subjectId}
            subjectName={banner.subjectName}
            className={banner.className}
            chapterCount={banner.chapterCount}
            upgradePrice={banner.upgradePrice}
            subjectPrice={banner.subjectPrice}
          />
        ))}

        {/* Active entitlements */}
        {active.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Active Access
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {active.map((e) => (
                <EntitlementCard key={e.id} item={e} />
              ))}
            </div>
          </section>
        )}

        {/* Report Card quick-link — only shown to students with at least one active plan */}
        {active.length > 0 && !adminUser && (
          <Link
            href="/dashboard/report-card"
            className="flex items-center gap-4 rounded-2xl border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-6 py-5 hover:border-violet-400 hover:from-violet-100 hover:to-indigo-100 transition-all group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 group-hover:bg-violet-200 transition-colors flex-shrink-0">
              <BarChart2 className="h-6 w-6 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-violet-900">My Report Card</p>
              <p className="text-sm text-violet-600 mt-0.5">
                View your performance across subtopics, topics, chapters, and subjects
              </p>
            </div>
            <Clock className="h-5 w-5 text-violet-400 flex-shrink-0 group-hover:text-violet-600 transition-colors" />
          </Link>
        )}

        {/* My Courses view */}
        {allClasses.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              My Courses
            </h2>
            <SubjectAccordion
              classes={allClasses.map((cls) => ({
                id:       cls.id,
                name:     cls.name,
                subjects: cls.subjects.map((sub) => ({
                  id:       sub.id,
                  name:     sub.name,
                  chapters: sub.chapters.map((ch) => ({
                    id:     ch.id,
                    name:   ch.name,
                    slug:   ch.slug,
                    isFree: ch.isFree,
                  })),
                })),
              }))}
              active={active}
              expired={expired}
              isAdmin={adminUser}
              progressMap={progressMap}
            />
          </section>
        )}

        {/* Expired entitlements */}
        {expired.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" />
              Expired Access
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {expired.map((e) => (
                <EntitlementCard key={e.id} item={e} />
              ))}
            </div>
          </section>
        )}

        {/* No purchases CTA */}
        {active.length === 0 && expired.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No purchases yet</h3>
            <p className="text-slate-500 mt-2 mb-6">
              Choose a plan to unlock chapter or subject access.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              View pricing plans
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EntitlementCard
// ─────────────────────────────────────────────────────────────────────────────

function EntitlementCard({ item }: { item: MyEntitlementItem }) {
  const isExpired = item.status === 'EXPIRED';
  const scopeLabel =
    item.scopeType === 'CHAPTER' && item.chapter
      ? item.chapter.name
      : item.scopeType === 'SUBJECT' && item.subject
      ? item.subject.name
      : 'Complete class package';

  const classLabel = item.class?.name ?? '';

  return (
    <div
      className={`rounded-xl border p-4 ${
        isExpired
          ? 'border-slate-200 bg-slate-50 opacity-70'
          : 'border-indigo-100 bg-white shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {classLabel}
          </p>
          <p className="mt-0.5 font-bold text-slate-900 truncate">{scopeLabel}</p>
          <p className="text-sm text-slate-500 mt-0.5">{item.plan.name}</p>
        </div>
        <div className="flex-shrink-0">
          {isExpired ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
              <Clock className="h-3 w-3" />
              Expired
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
              <CheckCircle className="h-3 w-3" />
              Active
            </span>
          )}
        </div>
      </div>

      {/* Expiry info — always shown for paid access */}
      {item.expiresAt && (
        <div className="mt-3 text-xs text-slate-500">
          {isExpired ? (
            <span className="text-red-500">
              Expired on{' '}
              {new Date(item.expiresAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          ) : (
            <span>
              Expires{' '}
              <ExpiryCountdown expiresAt={item.expiresAt} />
            </span>
          )}
        </div>
      )}
      {/* Fallback: legacy row with isPermanent=true and no expiresAt */}
      {item.isPermanent && !item.expiresAt && !isExpired && (
        <div className="mt-3 text-xs text-slate-400">
          12-month access · contact support if you need the expiry date
        </div>
      )}

      {/* Renew link for expired */}
      {isExpired && (
        <Link
          href="/pricing"
          className="mt-3 block text-center text-xs font-semibold text-indigo-600 hover:underline"
        >
          Renew access →
        </Link>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ExpiryCountdown — server-rendered relative expiry label
// Shows a human-readable "X months / X days left" with urgency colouring,
// plus the exact date so the user always knows the hard deadline.
// ─────────────────────────────────────────────────────────────────────────────

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const now     = new Date();
  const expires = new Date(expiresAt);
  const diffMs  = expires.getTime() - now.getTime();

  // Guard: already expired (shouldn't reach here, but be safe)
  if (diffMs <= 0) {
    return <span className="font-semibold text-red-600">Expired</span>;
  }

  const diffTotalHours = Math.ceil(diffMs  / (1000 * 60 * 60));
  const diffDays       = Math.ceil(diffMs  / (1000 * 60 * 60 * 24));
  const diffMonths     = Math.floor(diffDays / 30);

  // Exact date string (day Month Year)
  const exactDate = expires.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  // ── Urgency tiers ─────────────────────────────────────────────────────────
  // ≤ 24 h  → red,   hours remaining
  if (diffTotalHours <= 24) {
    return (
      <span className="font-semibold text-red-600">
        in {diffTotalHours} hour{diffTotalHours !== 1 ? 's' : ''} — {exactDate}
      </span>
    );
  }

  // ≤ 7 d   → red,   days remaining
  if (diffDays <= 7) {
    return (
      <span className="font-semibold text-red-600">
        in {diffDays} day{diffDays !== 1 ? 's' : ''} — {exactDate}
      </span>
    );
  }

  // ≤ 30 d  → amber, days remaining
  if (diffDays <= 30) {
    return (
      <span className="font-semibold text-amber-600">
        in {diffDays} day{diffDays !== 1 ? 's' : ''} — {exactDate}
      </span>
    );
  }

  // ≤ 60 d  → amber, weeks / days
  if (diffDays <= 60) {
    const diffWeeks = Math.floor(diffDays / 7);
    return (
      <span className="font-medium text-amber-600">
        in {diffWeeks} week{diffWeeks !== 1 ? 's' : ''} ({diffDays} days) — {exactDate}
      </span>
    );
  }

  // > 60 d  → slate, months + remaining days
  const remainderDays = diffDays - diffMonths * 30;
  const monthLabel    = `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
  const dayLabel      = remainderDays > 0 ? ` ${remainderDays} day${remainderDays !== 1 ? 's' : ''}` : '';
  return (
    <span className="font-medium text-slate-700">
      in {monthLabel}{dayLabel} — {exactDate}
    </span>
  );
}

