'use client';

// src/components/ReportCard.tsx
//
// Student-facing interactive report card.
//
// Tabs (plan-gated — only shown when allowedScopes includes the scope):
//   • Subtopic       — per-subtopic score rows inside each chapter
//   • Topic          — per-topic score rows inside each chapter
//   • Subject        — one row per subject (single subject view)
//   • Two Subjects   — side-by-side comparison of two selected subjects
//   • All Subjects   — overview table of every subject
//
// Each row shows: score bar, avg%, best%, pass rate, attempt count.
// Colour coding: ≥75% → emerald, ≥50% → amber, <50% → rose.

import { useState, useMemo } from 'react';
import {
  BarChart2, ChevronDown, ChevronUp, BookOpen, Layers,
  Target, TrendingUp, Award, AlertCircle, CheckCircle2, XCircle,
  ClipboardList, ChevronRight,
} from 'lucide-react';
import type { ReportCardData, SubjectReport } from '@/app/api/dashboard/report-card/route';
import type { AllowedScope } from '@/app/dashboard/report-card/page';

// ─────────────────────────────────────────────────────────────────────────────
// Score helpers
// ─────────────────────────────────────────────────────────────────────────────

function scoreColor(pct: number): string {
  if (pct >= 75) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

function barColor(pct: number): string {
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-rose-500';
}

function gradeBadge(pct: number): { label: string; cls: string } {
  if (pct >= 90) return { label: 'A+', cls: 'bg-emerald-100 text-emerald-700' };
  if (pct >= 75) return { label: 'A',  cls: 'bg-emerald-100 text-emerald-700' };
  if (pct >= 60) return { label: 'B',  cls: 'bg-blue-100 text-blue-700' };
  if (pct >= 50) return { label: 'C',  cls: 'bg-amber-100 text-amber-700' };
  if (pct >= 35) return { label: 'D',  cls: 'bg-orange-100 text-orange-700' };
  return                { label: 'F',  cls: 'bg-rose-100 text-rose-700' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ScoreBar({ pct, thin = false }: { pct: number; thin?: boolean }) {
  return (
    <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${thin ? 'h-1.5' : 'h-2'}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function StatPill({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 min-w-[80px]">
      <div className="text-slate-400">{icon}</div>
      <span className="text-xs font-bold text-slate-900">{value}</span>
      <span className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function NoDataRow() {
  return (
    <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      No exam attempts yet in this section.
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreRow — a single row in any breakdown table
// ─────────────────────────────────────────────────────────────────────────────

interface ScoreRowProps {
  label:        string;
  sublabel?:    string;
  avgPct:       number;
  bestPct:      number;
  passRate:     number;
  attemptCount: number;
  examCount:    number;
  depth?:       number;   // 0 = chapter, 1 = topic, 2 = subtopic
}

function ScoreRow({
  label, sublabel, avgPct, bestPct, passRate, attemptCount, examCount, depth = 0,
}: ScoreRowProps) {
  const { label: grade, cls: gradeCls } = gradeBadge(avgPct);
  const indent = depth === 1 ? 'pl-5' : depth === 2 ? 'pl-10' : '';
  const labelSize = depth === 0 ? 'text-sm font-bold text-slate-800' : 'text-sm text-slate-700';

  return (
    <div className={`border-b border-slate-100 last:border-0 py-3 ${indent}`}>
      <div className="flex items-center gap-3">
        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className={labelSize + ' truncate'}>{label}</p>
          {sublabel && <p className="text-[11px] text-slate-400 mt-0.5">{sublabel}</p>}
        </div>

        {/* Grade badge */}
        <span className={`flex-shrink-0 text-[11px] font-extrabold rounded-full px-2 py-0.5 ${gradeCls}`}>
          {attemptCount === 0 ? '—' : grade}
        </span>

        {/* Avg % */}
        <span className={`flex-shrink-0 w-14 text-right text-sm font-bold tabular-nums ${attemptCount === 0 ? 'text-slate-300' : scoreColor(avgPct)}`}>
          {attemptCount === 0 ? '—' : `${avgPct}%`}
        </span>
      </div>

      {attemptCount > 0 && (
        <div className="mt-2 space-y-1.5">
          <ScoreBar pct={avgPct} />
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Best: <strong className={scoreColor(bestPct)}>{bestPct}%</strong></span>
            <span>Pass rate: <strong className={passRate >= 50 ? 'text-emerald-600' : 'text-rose-500'}>{passRate}%</strong></span>
            <span>{attemptCount} attempt{attemptCount !== 1 ? 's' : ''} · {examCount} exam{examCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SubjectSummaryCard — top-level card for a subject
// ─────────────────────────────────────────────────────────────────────────────

function SubjectSummaryCard({ subject }: { subject: SubjectReport }) {
  const { label: grade, cls: gradeCls } = gradeBadge(subject.avgPct);
  const hasData = subject.attemptCount > 0;

  return (
    <div className={`rounded-2xl border-2 p-5 ${hasData ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{subject.className}</p>
          <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{subject.subjectName}</h3>
          {subject.expiresAt && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              Access until{' '}
              <span className="font-semibold">
                {new Date(subject.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </p>
          )}
        </div>
        <span className={`flex-shrink-0 text-2xl font-extrabold rounded-2xl px-4 py-2 ${hasData ? gradeCls : 'bg-slate-100 text-slate-300'}`}>
          {hasData ? grade : '—'}
        </span>
      </div>

      {hasData ? (
        <>
          {/* Big average */}
          <div className="mb-3">
            <div className="flex items-end gap-2 mb-1.5">
              <span className={`text-4xl font-extrabold tabular-nums leading-none ${scoreColor(subject.avgPct)}`}>
                {subject.avgPct}%
              </span>
              <span className="text-slate-400 text-sm mb-0.5">avg score</span>
            </div>
            <ScoreBar pct={subject.avgPct} />
          </div>

          {/* Stats row */}
          <div className="flex gap-2 flex-wrap mt-3">
            <StatPill label="Best"     value={`${subject.bestPct}%`}   icon={<Award        className="h-3.5 w-3.5" />} />
            <StatPill label="Pass rate" value={`${subject.passRate}%`} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
            <StatPill label="Attempts" value={subject.attemptCount}    icon={<ClipboardList className="h-3.5 w-3.5" />} />
            <StatPill label="Exams"    value={subject.examCount}       icon={<BookOpen     className="h-3.5 w-3.5" />} />
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400 mt-2">No exam attempts yet.</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChapterAccordion — collapsible chapter block with topic/subtopic rows
// ─────────────────────────────────────────────────────────────────────────────

type RowDepth = 'topic' | 'subtopic';

function ChapterAccordion({
  chapter,
  depth,
}: {
  chapter: SubjectReport['chapters'][0];
  depth: RowDepth;
}) {
  const [open, setOpen] = useState(false);
  const hasData = chapter.attemptCount > 0 || chapter.topics.some((t) => t.attemptCount > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Chapter header */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <BookOpen className="h-4 w-4 text-indigo-500 flex-shrink-0" />
        <span className="flex-1 font-bold text-slate-800 text-sm">{chapter.chapterName}</span>

        {chapter.attemptCount > 0 && (
          <>
            <span className={`text-sm font-bold tabular-nums ${scoreColor(chapter.avgPct)}`}>
              {chapter.avgPct}%
            </span>
            <ScoreBar pct={chapter.avgPct} thin />
          </>
        )}
        {chapter.attemptCount === 0 && (
          <span className="text-xs text-slate-400">No attempts</span>
        )}

        {open
          ? <ChevronUp   className="h-4 w-4 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 py-2 divide-y divide-slate-50">
          {!hasData && <NoDataRow />}

          {chapter.topics.map((topic) => (
            <div key={topic.topicId}>
              {/* Topic row */}
              <ScoreRow
                label={topic.topicTitle}
                avgPct={topic.avgPct}
                bestPct={topic.bestPct}
                passRate={topic.passRate}
                attemptCount={topic.attemptCount}
                examCount={topic.examCount}
                depth={1}
              />

              {/* Subtopic rows (only when depth = subtopic) */}
              {depth === 'subtopic' && topic.subtopics.map((st) => (
                <ScoreRow
                  key={st.subtopicId}
                  label={st.subtopicTitle}
                  avgPct={st.avgPct}
                  bestPct={st.bestPct}
                  passRate={st.passRate}
                  attemptCount={st.attemptCount}
                  examCount={st.examCount}
                  depth={2}
                />
              ))}
            </div>
          ))}

          {chapter.topics.length === 0 && !hasData && null}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB VIEWS
// ─────────────────────────────────────────────────────────────────────────────

// ── Subtopic / Topic view ────────────────────────────────────────────────────

function SubjectDetailView({
  subject,
  depth,
}: {
  subject: SubjectReport;
  depth: RowDepth;
}) {
  return (
    <div className="space-y-4">
      <SubjectSummaryCard subject={subject} />
      <div className="space-y-3">
        {subject.chapters.map((ch) => (
          <ChapterAccordion key={ch.chapterId} chapter={ch} depth={depth} />
        ))}
        {subject.chapters.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">No chapters found.</p>
        )}
      </div>
    </div>
  );
}

// ── Subject view — per-chapter rows for a selected subject ────────────────────

function SubjectView({ subject }: { subject: SubjectReport }) {
  return (
    <div className="space-y-4">
      <SubjectSummaryCard subject={subject} />

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" />
            Chapter Breakdown
          </p>
        </div>
        <div className="px-5 py-2 divide-y divide-slate-50">
          {subject.chapters.length === 0 && <NoDataRow />}
          {subject.chapters.map((ch) => (
            <ScoreRow
              key={ch.chapterId}
              label={ch.chapterName}
              avgPct={ch.avgPct}
              bestPct={ch.bestPct}
              passRate={ch.passRate}
              attemptCount={ch.attemptCount}
              examCount={ch.examCount}
              depth={0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Multi-subject comparison view ─────────────────────────────────────────────

function MultiSubjectView({ subjects }: { subjects: SubjectReport[] }) {
  const [leftId,  setLeftId]  = useState(subjects[0]?.subjectId  ?? '');
  const [rightId, setRightId] = useState(subjects[1]?.subjectId  ?? '');

  const left  = subjects.find((s) => s.subjectId === leftId);
  const right = subjects.find((s) => s.subjectId === rightId);

  return (
    <div className="space-y-5">
      {/* Subject selectors */}
      <div className="flex flex-col sm:flex-row gap-4">
        {[
          { id: leftId,  setId: setLeftId,  label: 'Subject A' },
          { id: rightId, setId: setRightId, label: 'Subject B' },
        ].map(({ id, setId, label }) => (
          <div key={label} className="flex-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
              {label}
            </label>
            <select
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400"
            >
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.className} — {s.subjectName}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Side-by-side comparison */}
      {left && right && (
        <div className="grid sm:grid-cols-2 gap-4">
          <SubjectSummaryCard subject={left}  />
          <SubjectSummaryCard subject={right} />
        </div>
      )}

      {/* Chapter comparison table */}
      {left && right && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-700">Chapter Score Comparison</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Chapter</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-indigo-600 text-xs uppercase tracking-wide">{left.subjectName}</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-violet-600 text-xs uppercase tracking-wide">{right.subjectName}</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {/* Iterate over the longer chapter list */}
                {Array.from({ length: Math.max(left.chapters.length, right.chapters.length) }).map((_, i) => {
                  const lc = left.chapters[i];
                  const rc = right.chapters[i];
                  const diff = lc && rc ? lc.avgPct - rc.avgPct : null;
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-700">
                        {lc?.chapterName ?? rc?.chapterName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {lc?.attemptCount ? (
                          <span className={`font-bold tabular-nums ${scoreColor(lc.avgPct)}`}>{lc.avgPct}%</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {rc?.attemptCount ? (
                          <span className={`font-bold tabular-nums ${scoreColor(rc.avgPct)}`}>{rc.avgPct}%</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {diff !== null && lc?.attemptCount && rc?.attemptCount ? (
                          <span className={`text-xs font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                            {diff > 0 ? '+' : ''}{diff}%
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── All subjects overview ──────────────────────────────────────────────────────

function AllSubjectsView({ subjects }: { subjects: SubjectReport[] }) {
  // Overall aggregate
  const totalAttempts = subjects.reduce((s, sub) => s + sub.attemptCount, 0);
  const totalExams    = subjects.reduce((s, sub) => s + sub.examCount,    0);
  const overallAvg    = totalAttempts > 0
    ? Math.round(subjects.reduce((s, sub) => s + sub.avgPct * sub.attemptCount, 0) / totalAttempts)
    : 0;
  const overallPass   = totalAttempts > 0
    ? Math.round(subjects.reduce((s, sub) => s + sub.passRate * sub.attemptCount, 0) / totalAttempts)
    : 0;

  return (
    <div className="space-y-6">
      {/* Overall summary bar */}
      {totalAttempts > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-700 p-6 text-white">
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Overall Performance</p>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-5xl font-extrabold tabular-nums">{overallAvg}%</span>
            <span className="text-indigo-200 mb-1 text-sm">average across all subjects</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mb-4">
            <div
              className="h-2 rounded-full bg-white transition-all duration-700"
              style={{ width: `${overallAvg}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <div><span className="text-indigo-200">Pass rate </span><strong>{overallPass}%</strong></div>
            <div><span className="text-indigo-200">Attempts  </span><strong>{totalAttempts}</strong></div>
            <div><span className="text-indigo-200">Exams     </span><strong>{totalExams}</strong></div>
            <div><span className="text-indigo-200">Subjects  </span><strong>{subjects.length}</strong></div>
          </div>
        </div>
      )}

      {/* Subject cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((sub) => (
          <SubjectSummaryCard key={sub.subjectId} subject={sub} />
        ))}
      </div>

      {/* Summary comparison table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Subject Comparison
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Subject</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Grade</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Avg %</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Best %</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Pass rate</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {subjects.map((sub) => {
                const { label: grade, cls: gradeCls } = gradeBadge(sub.avgPct);
                return (
                  <tr key={sub.subjectId} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800">{sub.subjectName}</p>
                      <p className="text-[11px] text-slate-400">{sub.className}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-extrabold rounded-full px-2 py-0.5 ${sub.attemptCount > 0 ? gradeCls : 'bg-slate-100 text-slate-300'}`}>
                        {sub.attemptCount > 0 ? grade : '—'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-center font-bold tabular-nums ${sub.attemptCount > 0 ? scoreColor(sub.avgPct) : 'text-slate-300'}`}>
                      {sub.attemptCount > 0 ? `${sub.avgPct}%` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-center font-bold tabular-nums ${sub.attemptCount > 0 ? scoreColor(sub.bestPct) : 'text-slate-300'}`}>
                      {sub.attemptCount > 0 ? `${sub.bestPct}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sub.attemptCount > 0 ? (
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${sub.passRate >= 50 ? 'bg-emerald-500' : 'bg-rose-400'}`} style={{ width: `${sub.passRate}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${sub.passRate >= 50 ? 'text-emerald-600' : 'text-rose-500'}`}>{sub.passRate}%</span>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 font-medium">
                      {sub.attemptCount > 0 ? sub.attemptCount : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root ReportCard component
// ─────────────────────────────────────────────────────────────────────────────

const SCOPE_META: Record<AllowedScope, { label: string; icon: React.ElementType; description: string }> = {
  subtopic: { label: 'Subtopic',     icon: Target,      description: 'Granular per-subtopic breakdown inside each chapter' },
  topic:    { label: 'Topic',        icon: Layers,       description: 'Per-topic scores inside each chapter' },
  subject:  { label: 'Subject',      icon: BookOpen,     description: 'Chapter-by-chapter summary for each subject' },
  multi:    { label: 'Two Subjects', icon: ChevronRight, description: 'Side-by-side comparison of any two subjects' },
  all:      { label: 'All Subjects', icon: TrendingUp,   description: 'Overview of all subjects at a glance' },
};

interface ReportCardProps {
  data:          ReportCardData;
  allowedScopes: AllowedScope[];
}

export default function ReportCard({ data, allowedScopes }: ReportCardProps) {
  const [activeScope,    setActiveScope]    = useState<AllowedScope>(allowedScopes[0] ?? 'subtopic');
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);

  const subjects = data.subjects;
  const activeSubject = subjects[activeSubjectIdx] ?? subjects[0];

  // Locked scopes (user sees them greyed out as upsell)
  const ALL_SCOPES: AllowedScope[] = ['subtopic', 'topic', 'subject', 'multi', 'all'];
  const lockedScopes = ALL_SCOPES.filter((s) => !allowedScopes.includes(s));

  const scopePlanHint: Record<AllowedScope, string> = {
    subtopic: '',
    topic:    '',
    subject:  'Requires Subject plan',
    multi:    'Requires 2-Subject or Complete plan',
    all:      'Requires Complete plan',
  };

  return (
    <div className="space-y-6">
      {/* Scope tab bar */}
      <div className="flex flex-wrap gap-2">
        {ALL_SCOPES.map((scope) => {
          const meta    = SCOPE_META[scope];
          const allowed = allowedScopes.includes(scope);
          const Icon    = meta.icon;
          return (
            <button
              key={scope}
              type="button"
              disabled={!allowed}
              title={!allowed ? scopePlanHint[scope] : meta.description}
              onClick={() => allowed && setActiveScope(scope)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors border-2 ${
                activeScope === scope && allowed
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                  : allowed
                  ? 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700'
                  : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
              }`}
            >
              <Icon className="h-4 w-4" />
              {meta.label}
              {!allowed && (
                <span className="text-[10px] font-normal bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 ml-0.5">
                  Upgrade
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Subject selector (shown for subtopic/topic/subject views when multiple subjects) */}
      {['subtopic', 'topic', 'subject'].includes(activeScope) && subjects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {subjects.map((sub, i) => (
            <button
              key={sub.subjectId}
              type="button"
              onClick={() => setActiveSubjectIdx(i)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold border-2 transition-colors ${
                activeSubjectIdx === i
                  ? 'bg-violet-50 border-violet-400 text-violet-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-200'
              }`}
            >
              {sub.className} — {sub.subjectName}
            </button>
          ))}
        </div>
      )}

      {/* View panels */}
      {activeScope === 'subtopic' && activeSubject && (
        <SubjectDetailView subject={activeSubject} depth="subtopic" />
      )}
      {activeScope === 'topic' && activeSubject && (
        <SubjectDetailView subject={activeSubject} depth="topic" />
      )}
      {activeScope === 'subject' && activeSubject && (
        <SubjectView subject={activeSubject} />
      )}
      {activeScope === 'multi' && (
        <MultiSubjectView subjects={subjects} />
      )}
      {activeScope === 'all' && (
        <AllSubjectsView subjects={subjects} />
      )}

      {/* Locked scope upsell cards */}
      {lockedScopes.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Unlock more report card views
          </p>
          <div className="flex flex-wrap gap-3">
            {lockedScopes.map((scope) => (
              <a
                key={scope}
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                {SCOPE_META[scope].label}
                <span className="text-[10px] text-amber-500">— {scopePlanHint[scope]}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
