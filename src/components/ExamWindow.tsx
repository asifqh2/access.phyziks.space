'use client';

// src/components/ExamWindow.tsx
//
// Student-facing Exam Window — full exam-taking experience.
//
// Screens:
//   1. Lobby    — select scope (all / topic / subtopic), pick exam, see previous attempts
//   2. Running  — question cards with timer, answer inputs, progress bar
//   3. Results  — score, pass/fail, per-question feedback, explanation reveal

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ClipboardList, ChevronRight, ChevronLeft, Timer, CheckCircle2,
  XCircle, AlertCircle, Loader2, RotateCcw, ArrowLeft,
  BookOpen, Trophy, Star, TrendingUp,
} from 'lucide-react';
import ContentRenderer from '@/components/ContentRenderer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Topic {
  id:        string;
  title:     string;
  subtopics: { id: string; title: string }[];
}

interface ExamListItem {
  id:              string;
  chapterId:       string | null;
  topicId:         string | null;
  subtopicId:      string | null;
  title:           string;
  description:     string | null;
  timeLimit:       number;
  passingScore:    number;
  shuffleQuestions: boolean;
  questionCount:   number;
  scopeLabel:      string;
  bestAttempt: {
    id:          string;
    score:       number;
    totalMarks:  number;
    percentage:  number;
    passed:      boolean;
    completedAt: string;
  } | null;
}

interface ExamQuestion {
  id:        string;
  question:  string;
  type:      'MCQ' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'MATCHING' | 'NUMERICAL' | 'ASSERTION_REASON';
  options:   string[];
  marks:     number;
  sortOrder: number;
}

interface ExamDetail {
  id:               string;
  title:            string;
  description:      string | null;
  format:           'STANDARD' | 'ASSERTION_BASED' | 'CASE_STUDY_BASED';
  caseStudyImageUrl: string | null;
  timeLimit:        number;   // minutes; 0 = unlimited
  passingScore:     number;
  shuffleQuestions: boolean;
  questions:        ExamQuestion[];
}

interface QuestionFeedback {
  questionId:    string;
  isCorrect:     boolean;
  earnedMarks:   number;
  correctAnswer: string | string[];
  explanation:   string | null;
}

interface AttemptResult {
  attemptId:    string;
  score:        number;
  totalMarks:   number;
  percentage:   number;
  passed:       boolean;
  passingScore: number;
  timeTaken:    number | null;
  completedAt:  string;
  feedback:     QuestionFeedback[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ExamWindow
// ─────────────────────────────────────────────────────────────────────────────

type Screen = 'lobby' | 'running' | 'results';

interface ExamWindowProps {
  chapterId:   string;
  chapterName: string;
  chapterSlug: string;
  topics:      Topic[];
}

export default function ExamWindow({
  chapterId,
  chapterName,
  chapterSlug,
  topics,
}: ExamWindowProps) {
  const [screen,       setScreen]       = useState<Screen>('lobby');
  const [exams,        setExams]        = useState<ExamListItem[] | null>(null);
  const [loadingExams, setLoadingExams] = useState(true);
  const [errorExams,   setErrorExams]   = useState<string | null>(null);

  // Currently running exam
  const [activeExam,   setActiveExam]   = useState<ExamDetail | null>(null);
  const [loadingExam,  setLoadingExam]  = useState(false);

  // Results
  const [result,       setResult]       = useState<AttemptResult | null>(null);
  const [activeExamForResults, setActiveExamForResults] = useState<ExamDetail | null>(null);

  // Filter state (lobby)
  const [scopeFilter, setScopeFilter] = useState<'all' | string>('all'); // 'all' | topicId | subtopicId

  // ── Load exam list ─────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingExams(true);
    fetch(`/api/exams?chapterId=${chapterId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load exams');
        return res.json() as Promise<ExamListItem[]>;
      })
      .then(setExams)
      .catch((e: Error) => setErrorExams(e.message))
      .finally(() => setLoadingExams(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start exam ─────────────────────────────────────────────────────────────
  async function startExam(examId: string) {
    setLoadingExam(true);
    try {
      const res = await fetch(`/api/exams/${examId}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load exam');
      const detail: ExamDetail = await res.json();
      // Shuffle questions client-side if instructed
      if (detail.shuffleQuestions) {
        detail.questions = [...detail.questions].sort(() => Math.random() - 0.5);
      }
      setActiveExam(detail);
      setResult(null);
      setScreen('running');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load exam');
    } finally {
      setLoadingExam(false);
    }
  }

  // ── Receive result ─────────────────────────────────────────────────────────
  function handleResult(r: AttemptResult, examDetail: ExamDetail) {
    setResult(r);
    setActiveExamForResults(examDetail);
    setScreen('results');
    // Optimistically update bestAttempt in exam list
    setExams((prev) =>
      (prev ?? []).map((e) =>
        e.id === examDetail.id
          ? {
              ...e,
              bestAttempt:
                !e.bestAttempt || r.percentage > e.bestAttempt.percentage
                  ? { id: r.attemptId, score: r.score, totalMarks: r.totalMarks, percentage: r.percentage, passed: r.passed, completedAt: r.completedAt }
                  : e.bestAttempt,
            }
          : e,
      ),
    );
  }

  // ── Filter exams ───────────────────────────────────────────────────────────
  const filteredExams = (exams ?? []).filter((e) => {
    if (scopeFilter === 'all') return true;
    return e.topicId === scopeFilter || e.subtopicId === scopeFilter || e.chapterId === scopeFilter;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  if (screen === 'running' && activeExam) {
    return (
      <ExamRunner
        exam={activeExam}
        onResult={(r) => handleResult(r, activeExam)}
        onExit={() => setScreen('lobby')}
      />
    );
  }

  if (screen === 'results' && result && activeExamForResults) {
    return (
      <ExamResults
        result={result}
        exam={activeExamForResults}
        chapterSlug={chapterSlug}
        onRetry={() => startExam(activeExamForResults.id)}
        onBack={() => setScreen('lobby')}
      />
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">

      {/* Page header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3">
          <ClipboardList className="h-3.5 w-3.5" />
          Test Panel
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{chapterName}</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Select an exam below to test your understanding. Exams are timed and graded automatically.
        </p>
      </div>

      {/* Scope filter tabs */}
      <div className="mb-5 overflow-x-auto">
        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm flex-nowrap">
          <FilterTab
            label="All Exams"
            active={scopeFilter === 'all'}
            onClick={() => setScopeFilter('all')}
            count={(exams ?? []).length}
          />
          <FilterTab
            label="Chapter"
            active={scopeFilter === chapterId}
            onClick={() => setScopeFilter(chapterId)}
            count={(exams ?? []).filter((e) => !!e.chapterId).length}
          />
          {topics.map((t) => (
            <FilterTab
              key={t.id}
              label={t.title}
              active={scopeFilter === t.id}
              onClick={() => setScopeFilter(t.id)}
              count={(exams ?? []).filter((e) => e.topicId === t.id || t.subtopics.some((s) => s.id === e.subtopicId)).length}
            />
          ))}
        </div>
      </div>

      {/* Exam list */}
      {loadingExams ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading exams…
        </div>
      ) : errorExams ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{errorExams}</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No exams available for this selection yet.</p>
          <p className="text-slate-400 text-xs mt-1">Check back later — your instructor may add exams soon.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onStart={() => startExam(exam.id)}
              loading={loadingExam}
            />
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="mt-8">
        <Link
          href={`/courses/${chapterSlug}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to chapter
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterTab
// ─────────────────────────────────────────────────────────────────────────────

function FilterTab({ label, active, onClick, count }: {
  label:   string;
  active:  boolean;
  onClick: () => void;
  count:   number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
        active ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExamCard
// ─────────────────────────────────────────────────────────────────────────────

function ExamCard({
  exam,
  onStart,
  loading,
}: {
  exam:    ExamListItem;
  onStart: () => void;
  loading: boolean;
}) {
  const best = exam.bestAttempt;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-base leading-snug">{exam.title}</h3>
          <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">
            {exam.scopeLabel}
          </span>
        </div>
        {exam.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exam.description}</p>
        )}
      </div>

      {/* Meta pills */}
      <div className="flex flex-wrap gap-2">
        <MetaPill icon={<ClipboardList className="h-3 w-3" />} label={`${exam.questionCount} questions`} />
        <MetaPill
          icon={<Timer className="h-3 w-3" />}
          label={exam.timeLimit > 0 ? `${exam.timeLimit} min` : 'No time limit'}
        />
        <MetaPill icon={<TrendingUp className="h-3 w-3" />} label={`Pass at ${exam.passingScore}%`} />
      </div>

      {/* Previous best */}
      {best && (
        <div className={`rounded-xl px-3 py-2 text-xs ${best.passed ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {best.passed
                ? <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                : <RotateCcw className="h-3.5 w-3.5 text-amber-500" />}
              <span className={`font-semibold ${best.passed ? 'text-emerald-700' : 'text-amber-700'}`}>
                {best.passed ? 'Passed' : 'Not passed yet'}
              </span>
            </div>
            <span className={`font-bold text-sm ${best.passed ? 'text-emerald-700' : 'text-amber-700'}`}>
              {best.percentage}%
            </span>
          </div>
          <p className={`mt-0.5 ${best.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
            Best: {best.score}/{best.totalMarks} marks
          </p>
        </div>
      )}

      {/* Start button */}
      <button
        type="button"
        onClick={onStart}
        disabled={loading}
        className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-xl
          bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white
          hover:bg-violet-700 disabled:opacity-60 transition-colors"
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" />Loading…</>
          : best
          ? <><RotateCcw className="h-4 w-4" />Retake Exam</>
          : <><BookOpen className="h-4 w-4" />Start Exam</>
        }
      </button>
    </div>
  );
}

function MetaPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium px-2.5 py-1">
      {icon}
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExamRunner — the actual exam-taking screen
// ─────────────────────────────────────────────────────────────────────────────

function ExamRunner({
  exam,
  onResult,
  onExit,
}: {
  exam:      ExamDetail;
  onResult:  (r: AttemptResult) => void;
  onExit:    () => void;
}) {
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const totalSecs = exam.timeLimit > 0 ? exam.timeLimit * 60 : null;
  const [secsLeft, setSecsLeft] = useState<number | null>(totalSecs);
  const startedAt = useRef(Date.now());
  const timerExpired = useRef(false);

  // Auto-submit when timer hits 0
  const submit = useCallback(
    async (forcedAnswers?: Record<string, string | string[]>) => {
      const answersToSubmit = forcedAnswers ?? answers;
      setSubmitting(true); setError(null);
      const timeTaken = Math.round((Date.now() - startedAt.current) / 1000);
      try {
        const res = await fetch(`/api/exams/${exam.id}/attempt`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ answers: answersToSubmit, timeTaken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Submission failed');
        onResult(data as AttemptResult);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Submission failed');
        setSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answers, exam.id],
  );

  useEffect(() => {
    if (!totalSecs) return;
    const id = setInterval(() => {
      setSecsLeft((p) => {
        if (p === null || p <= 1) {
          clearInterval(id);
          if (!timerExpired.current) {
            timerExpired.current = true;
            // Use ref-captured answers to avoid stale closure
            submit();
          }
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSecs]);

  const q       = exam.questions[current];
  const total   = exam.questions.length;
  const answered = Object.keys(answers).length;
  const pct     = Math.round((current / total) * 100);

  function setAnswer(val: string | string[]) {
    setAnswers((p) => ({ ...p, [q.id]: val }));
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  const isUrgent = secsLeft !== null && secsLeft <= 60;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-slate-50 pb-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-3 flex items-center gap-4">
          {/* Exit */}
          <button type="button" onClick={onExit} title="Exit exam"
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Exam title + progress */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-500 truncate">{exam.title}</p>
            {/* Progress bar */}
            <div className="mt-1 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-violet-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Q counter */}
          <span className="flex-shrink-0 text-xs font-bold text-slate-700 tabular-nums">
            {current + 1}/{total}
          </span>

          {/* Timer */}
          {secsLeft !== null && (
            <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums ${
              isUrgent ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'
            }`}>
              <Timer className="h-3.5 w-3.5" />
              {formatTime(secsLeft)}
            </span>
          )}
        </div>
      </div>

      {/* Case study image — shown once above all questions when format is CASE_STUDY_BASED */}
      {exam.format === 'CASE_STUDY_BASED' && exam.caseStudyImageUrl && (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 overflow-hidden">
          <div className="px-4 py-2 border-b border-cyan-200 bg-cyan-100/60">
            <p className="text-xs font-bold text-cyan-700 uppercase tracking-wide">
              📷 Case Study — read carefully before answering
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={exam.caseStudyImageUrl}
            alt="Case study passage"
            className="w-full max-h-[420px] object-contain bg-white"
            onError={(e) => {
              (e.target as HTMLImageElement).parentElement!.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Question card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
        {/* Question number + marks */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-600 bg-violet-50 rounded-full px-2.5 py-1">
            <ClipboardList className="h-3 w-3" />
            Question {current + 1}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {q.marks} mark{q.marks !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Question text */}
        <div className="text-base font-semibold text-slate-900 leading-relaxed">
          <ContentRenderer content={q.question} />
        </div>

        {/* Answer inputs */}
        <AnswerInput
          question={q}
          value={answers[q.id] ?? null}
          onChange={setAnswer}
        />
      </div>

      {/* Navigation footer */}
      <div className="mt-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setCurrent((p) => Math.max(0, p - 1))}
          disabled={current === 0}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {/* Answered dots */}
        <div className="flex items-center gap-1 flex-wrap justify-center">
          {exam.questions.map((qq, i) => (
            <button
              key={qq.id}
              type="button"
              onClick={() => setCurrent(i)}
              title={`Question ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i === current
                  ? 'bg-violet-600 scale-125'
                  : answers[qq.id] !== undefined
                  ? 'bg-emerald-500'
                  : 'bg-slate-300'
              }`}
            />
          ))}
        </div>

        {current < total - 1 ? (
          <button
            type="button"
            onClick={() => setCurrent((p) => Math.min(total - 1, p + 1))}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => submit()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Submit Exam
          </button>
        )}
      </div>

      {/* Answered count */}
      <p className="mt-3 text-center text-xs text-slate-400">
        {answered} of {total} questions answered
        {answered < total && <span className="text-amber-500 ml-1">— you can still answer remaining questions</span>}
      </p>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnswerInput
// ─────────────────────────────────────────────────────────────────────────────

function AnswerInput({
  question,
  value,
  onChange,
}: {
  question: ExamQuestion;
  value:    string | string[] | null;
  onChange: (v: string | string[]) => void;
}) {
  if (question.type === 'TRUE_FALSE') {
    return (
      <div className="flex gap-4">
        {['True', 'False'].map((opt) => (
          <label
            key={opt}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 cursor-pointer py-3 font-semibold text-sm transition-colors ${
              value === opt
                ? 'border-violet-500 bg-violet-50 text-violet-800'
                : 'border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-violet-50/50'
            }`}
          >
            <input type="radio" name={question.id} value={opt} checked={value === opt}
              onChange={() => onChange(opt)} className="sr-only" />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'MCQ') {
    return (
      <div className="space-y-2.5">
        {question.options.map((opt, i) => (
          <label
            key={i}
            className={`flex items-center gap-3 rounded-xl border-2 cursor-pointer px-4 py-3 transition-colors ${
              value === opt
                ? 'border-violet-500 bg-violet-50'
                : 'border-slate-200 hover:border-violet-200 hover:bg-violet-50/40'
            }`}
          >
            <span className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              value === opt ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
            }`}>
              {value === opt && <span className="h-2 w-2 rounded-full bg-white block" />}
            </span>
            <input type="radio" name={question.id} value={opt} checked={value === opt}
              onChange={() => onChange(opt)} className="sr-only" />
            <span className={`text-sm ${value === opt ? 'font-semibold text-violet-900' : 'text-slate-700'}`}>
              {opt}
            </span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'MULTI_SELECT') {
    const selected = Array.isArray(value) ? value : [];
    function toggleOpt(opt: string) {
      onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]);
    }
    return (
      <div className="space-y-2.5">
        <p className="text-xs text-slate-500 font-medium">Select all correct answers:</p>
        {question.options.map((opt, i) => {
          const checked = selected.includes(opt);
          return (
            <label
              key={i}
              className={`flex items-center gap-3 rounded-xl border-2 cursor-pointer px-4 py-3 transition-colors ${
                checked ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-violet-200 hover:bg-violet-50/40'
              }`}
            >
              <span className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                checked ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
              }`}>
                {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
              </span>
              <input type="checkbox" value={opt} checked={checked}
                onChange={() => toggleOpt(opt)} className="sr-only" />
              <span className={`text-sm ${checked ? 'font-semibold text-violet-900' : 'text-slate-700'}`}>
                {opt}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === 'SHORT_ANSWER') {
    return (
      <div>
        <p className="text-xs text-slate-500 mb-2">Write your answer in the box below:</p>
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder="Type your answer here…"
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 resize-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-colors"
        />
      </div>
    );
  }

  if (question.type === 'FILL_IN_BLANK') {
    return (
      <div>
        <p className="text-xs text-slate-500 mb-2">Fill in the blank:</p>
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer…"
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-colors"
        />
      </div>
    );
  }

  if (question.type === 'MATCHING') {
    // Parse pairs from options: each option is JSON { left, right }
    // Left column is fixed; right column is shuffled once on mount via state
    const pairs: { left: string; right: string }[] = question.options.map((raw) => {
      try { return JSON.parse(raw) as { left: string; right: string }; }
      catch { return { left: raw, right: '' }; }
    });

    // selected = { [left]: chosenRight }
    const selected: Record<string, string> = typeof value === 'string'
      ? (() => { try { return JSON.parse(value) as Record<string, string>; } catch { return {}; } })()
      : Array.isArray(value) ? {} : {};

    const rightOptions = pairs.map((p) => p.right);

    function setMatch(left: string, right: string) {
      const next = { ...selected, [left]: right };
      onChange(JSON.stringify(next));
    }

    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500 font-medium">Match each item on the left to the correct item on the right:</p>
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800">
              {pair.left}
            </div>
            <span className="text-slate-300 flex-shrink-0">→</span>
            <select
              value={selected[pair.left] ?? ''}
              onChange={(e) => setMatch(pair.left, e.target.value)}
              className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-sm outline-none transition-colors ${
                selected[pair.left]
                  ? 'border-violet-400 bg-violet-50 text-violet-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              <option value="">— select —</option>
              {rightOptions.map((opt, j) => (
                <option key={j} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === 'NUMERICAL') {
    return (
      <div>
        <p className="text-xs text-slate-500 mb-2">Enter a numerical value:</p>
        <input
          type="number"
          step="any"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 9.8"
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-colors"
        />
      </div>
    );
  }

  if (question.type === 'ASSERTION_REASON') {
    // The 4 options are the standard JEE/NEET assertion-reason choices.
    // They are stored in question.options (set by the builder).
    return (
      <div className="space-y-2.5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-relaxed">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-1">Instructions</p>
          <p className="text-xs text-amber-800">
            Read the Assertion (A) and Reason (R) in the question above. Choose the option that best describes their relationship.
          </p>
        </div>
        {question.options.map((opt, i) => (
          <label
            key={i}
            className={`flex items-start gap-3 rounded-xl border-2 cursor-pointer px-4 py-3 transition-colors ${
              value === opt
                ? 'border-amber-500 bg-amber-50'
                : 'border-slate-200 hover:border-amber-200 hover:bg-amber-50/40'
            }`}
          >
            <span className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              value === opt ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
            }`}>
              {value === opt && <span className="h-2 w-2 rounded-full bg-white block" />}
            </span>
            <input
              type="radio"
              name={question.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="sr-only"
            />
            <span className="text-sm leading-snug">
              <span className={`font-bold mr-1 ${value === opt ? 'text-amber-800' : 'text-slate-500'}`}>
                ({String.fromCharCode(65 + i)})
              </span>
              <span className={value === opt ? 'text-amber-900 font-medium' : 'text-slate-700'}>
                {opt}
              </span>
            </span>
          </label>
        ))}
      </div>
    );
  }

  // Fallback — should not be reached
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ExamResults
// ─────────────────────────────────────────────────────────────────────────────

function ExamResults({
  result,
  exam,
  chapterSlug,
  onRetry,
  onBack,
}: {
  result:      AttemptResult;
  exam:        ExamDetail;
  chapterSlug: string;
  onRetry:     () => void;
  onBack:      () => void;
}) {
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const passed      = result.passed;
  const pct         = result.percentage;

  const feedbackMap = new Map(result.feedback.map((f) => [f.questionId, f]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

      {/* Score card */}
      <div className={`rounded-2xl border-2 p-6 text-center ${
        passed ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'
      }`}>
        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
          passed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
        }`}>
          {passed ? <Trophy className="h-10 w-10" /> : <RotateCcw className="h-10 w-10" />}
        </div>

        <h2 className={`text-2xl font-extrabold ${passed ? 'text-emerald-800' : 'text-amber-800'}`}>
          {passed ? 'Well Done! You Passed' : 'Keep Practising!'}
        </h2>
        <p className={`mt-1 text-sm ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>
          {exam.title}
        </p>

        {/* Big score */}
        <div className="mt-5 inline-block">
          <span className={`text-6xl font-extrabold tabular-nums ${passed ? 'text-emerald-700' : 'text-amber-700'}`}>
            {pct}%
          </span>
        </div>

        {/* Sub-metrics */}
        <div className="mt-4 grid grid-cols-3 gap-3 max-w-sm mx-auto text-center">
          <ScoreStat label="Score" value={`${result.score}/${result.totalMarks}`} />
          <ScoreStat label="Passing" value={`${result.passingScore}%`} />
          {result.timeTaken !== null && (
            <ScoreStat label="Time taken" value={formatTimeTaken(result.timeTaken)} />
          )}
        </div>

        {/* Star indicators */}
        <div className="mt-4 flex justify-center gap-1">
          {[33, 66, 100].map((threshold, i) => (
            <Star
              key={i}
              className={`h-6 w-6 ${pct >= threshold ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
            />
          ))}
        </div>
      </div>

      {/* Per-question feedback */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-bold text-slate-700">Question Review</p>
        </div>
        <div className="divide-y divide-slate-100">
          {exam.questions.map((q, qi) => {
            const fb = feedbackMap.get(q.id);
            if (!fb) return null;
            const isOpen = expandedQ === q.id;

            return (
              <div key={q.id}>
                <button
                  type="button"
                  onClick={() => setExpandedQ(isOpen ? null : q.id)}
                  className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 text-left transition-colors"
                >
                  {/* Correct/incorrect icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {fb.isCorrect
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      : <XCircle      className="h-5 w-5 text-red-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-500">Q{qi + 1}</span>
                      <span className={`text-xs font-bold ${fb.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fb.earnedMarks}/{q.marks} marks
                      </span>
                    </div>
                    <div className="text-sm text-slate-700 mt-0.5 line-clamp-2">
                      <ContentRenderer content={q.question} />
                    </div>
                  </div>

                  <ChevronRight className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 ml-8 space-y-3">
                    {/* Correct answer */}
                    <div className={`rounded-xl px-4 py-3 ${fb.isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                      <p className="text-xs font-bold text-slate-500 mb-1">Correct answer</p>
                      <p className={`text-sm font-semibold ${fb.isCorrect ? 'text-emerald-800' : 'text-red-700'}`}>
                        {Array.isArray(fb.correctAnswer) ? fb.correctAnswer.join(', ') : String(fb.correctAnswer)}
                      </p>
                    </div>

                    {/* Explanation */}
                    {fb.explanation && (
                      <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3">
                        <p className="text-xs font-bold text-indigo-700 mb-1">Explanation</p>
                        <div className="text-sm text-indigo-900">
                          <ContentRenderer content={fb.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Retake Exam
        </button>
        <button
          type="button"
          onClick={onBack}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-300 transition-colors"
        >
          <ClipboardList className="h-4 w-4" />
          All Exams
        </button>
        <Link
          href={`/courses/${chapterSlug}`}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-300 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          Back to Chapter
        </Link>
      </div>
    </div>
  );
}

function ScoreStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{label}</p>
      <p className="text-sm font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}

function formatTimeTaken(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
