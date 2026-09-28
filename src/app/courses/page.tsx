// src/app/courses/page.tsx
//
// Course catalogue — shows subject cards grouped by class.
// Clicking a card redirects to the dashboard (My Learning).

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { BookOpen, ArrowRight, FlaskConical, Calculator, Atom } from 'lucide-react';

export const dynamic = 'force-dynamic';

// ── Subject icon + colour map ─────────────────────────────────────────────────
// Matches on subject slug; falls back to a generic style.

const SUBJECT_STYLES: Record<
  string,
  { gradient: string; icon: React.ReactNode }
> = {
  physics: {
    gradient: 'from-indigo-500 to-violet-600',
    icon: <Atom className="h-8 w-8 text-white/90" />,
  },
  chemistry: {
    gradient: 'from-emerald-500 to-teal-600',
    icon: <FlaskConical className="h-8 w-8 text-white/90" />,
  },
  mathematics: {
    gradient: 'from-amber-500 to-orange-600',
    icon: <Calculator className="h-8 w-8 text-white/90" />,
  },
};

function getStyle(slug: string) {
  return (
    SUBJECT_STYLES[slug.toLowerCase()] ?? {
      gradient: 'from-slate-500 to-slate-700',
      icon: <BookOpen className="h-8 w-8 text-white/90" />,
    }
  );
}

export default async function CoursesPage() {
  const allClasses = await prisma.lmsClass.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      subjects: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: {
            select: {
              chapters: { where: { isActive: true } },
            },
          },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-16 text-white">
        <div className="container mx-auto max-w-5xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-300">
            Course Library
          </p>
          <h1 className="text-4xl font-extrabold sm:text-5xl leading-tight">
            Explore our courses.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Physics, Chemistry and Mathematics for Class 11 &amp; 12 CBSE — topic‑by‑topic video lessons.
          </p>
        </div>
      </section>

      {/* Course cards */}
      <main className="container mx-auto max-w-5xl px-4 py-12 space-y-12">
        {allClasses.map((cls) => (
          <section key={cls.id}>
            {/* Class heading */}
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 px-1">
              {cls.name}
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cls.subjects.map((subject) => {
                const { gradient, icon } = getStyle(subject.slug);
                const chapterCount = subject._count.chapters;

                return (
                  <Link
                    key={subject.id}
                    href="/dashboard"
                    className="group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                  >
                    {/* Coloured banner */}
                    <div className={`bg-gradient-to-br ${gradient} px-6 py-8 flex items-end`}>
                      {icon}
                    </div>

                    {/* Card body */}
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        {cls.name}
                      </p>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                        {subject.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}
                      </p>

                      <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                        Go to My Learning
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {allClasses.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No courses yet</h3>
            <p className="text-slate-500 mt-2">Content is being added. Check back soon.</p>
          </div>
        )}
      </main>
    </div>
  );
}
