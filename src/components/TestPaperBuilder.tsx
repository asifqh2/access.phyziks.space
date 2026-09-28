'use client';

// src/components/TestPaperBuilder.tsx
//
// Full-featured standalone admin interface for building test papers.
//
// Layout:
//   ┌─────────────────────────────────────────────────────────────────────┐
//   │  [LEFT: Chapter browser & exam list]  [RIGHT: Active exam editor]  │
//   └─────────────────────────────────────────────────────────────────────┘
//
// Features:
//   • Browse all chapters grouped by class → subject
//   • Create / delete exams per chapter, topic, or subtopic
//   • Full rich editor for each question (AdvancedHTMLEditor)
//   • Drag-and-drop question reordering
//   • Per-question: type picker, option editor, correct answer selector,
//     explanation, marks
//   • Exam settings: title, description, time limit, passing score, shuffle
//   • Attempt statistics panel per exam
//   • Publish / unpublish toggle
//   • Live question count + total marks display

import {
  useState, useCallback, useRef, type DragEvent,
} from 'react';
import {
  ClipboardList, ChevronDown, ChevronRight, Plus, Trash2, Save,
  Loader2, CheckCircle2, AlertCircle, GripVertical, Eye, EyeOff,
  BookOpen, Users, BarChart2, Settings, X, ChevronUp,
  PenLine, Hash, Timer, TrendingUp, ToggleLeft, Shuffle,
  FileText, Copy,
} from 'lucide-react';
import AdvancedHTMLEditor from '@/components/AdvancedHTMLEditor';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type QType = 'MCQ' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'MATCHING' | 'NUMERICAL' | 'ASSERTION_REASON';
type ExamFormat = 'STANDARD' | 'ASSERTION_BASED' | 'CASE_STUDY_BASED';

interface Question {
  id:            string;
  question:      string;
  type:          QType;
  options:       string[];
  correctAnswer: string | string[];
  explanation:   string | null;
  marks:         number;
  sortOrder:     number;
}

interface Exam {
  id:               string;
  title:            string;
  description:      string | null;
  format:           ExamFormat;
  caseStudyImageUrl: string | null;
  timeLimit:        number;
  passingScore:     number;
  shuffleQuestions: boolean;
  isActive:         boolean;
  sortOrder:        number;
  chapterId:        string | null;
  topicId:          string | null;
  subtopicId:       string | null;
  scopeLabel:       string;
  questions:        Question[];
  _count:           { attempts: number };
}

interface Subtopic { id: string; title: string }
interface Topic    { id: string; title: string; subtopics: Subtopic[] }

interface Chapter {
  id:               string;
  name:             string;
  slug:             string;
  testPanelEnabled: boolean;
  subject:          { id: string; name: string; class: { id: string; name: string } };
  topics:           Topic[];
  exams:            Exam[];
}

interface ClassGroup {
  id:   string;
  name: string;
  subjects: {
    id:   string;
    name: string;
    chapters: Chapter[];
  }[];
}

interface TestPaperBuilderProps {
  classGroups: ClassGroup[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function totalMarks(questions: Question[]): number {
  return questions.reduce((s, q) => s + q.marks, 0);
}

const FORMAT_LABELS: Record<ExamFormat, string> = {
  STANDARD:         'Standard',
  ASSERTION_BASED:  'Assertion Based',
  CASE_STUDY_BASED: 'Case Study Based',
};

const FORMAT_BADGE: Record<ExamFormat, string> = {
  STANDARD:         'bg-slate-100 text-slate-600',
  ASSERTION_BASED:  'bg-amber-100 text-amber-700',
  CASE_STUDY_BASED: 'bg-cyan-100 text-cyan-700',
};

function typeBadgeColor(t: QType): string {
  return t === 'MCQ'              ? 'bg-indigo-100 text-indigo-700'
       : t === 'MULTI_SELECT'     ? 'bg-violet-100 text-violet-700'
       : t === 'TRUE_FALSE'       ? 'bg-teal-100 text-teal-700'
       : t === 'FILL_IN_BLANK'    ? 'bg-cyan-100 text-cyan-700'
       : t === 'MATCHING'         ? 'bg-orange-100 text-orange-700'
       : t === 'NUMERICAL'        ? 'bg-rose-100 text-rose-700'
       : t === 'ASSERTION_REASON' ? 'bg-amber-100 text-amber-700'
       :                            'bg-slate-100 text-slate-600';
}

const TYPE_LABELS: Record<QType, string> = {
  MCQ:              'MCQ',
  MULTI_SELECT:     'Multi-select',
  TRUE_FALSE:       'True / False',
  SHORT_ANSWER:     'Short answer',
  FILL_IN_BLANK:    'Fill in the blank',
  MATCHING:         'Matching',
  NUMERICAL:        'Numerical',
  ASSERTION_REASON: 'Assertion & Reason',
};

// ─────────────────────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────────────────────

export default function TestPaperBuilder({ classGroups: initial }: TestPaperBuilderProps) {
  const [classGroups, setClassGroups] = useState<ClassGroup[]>(initial);

  // Flatten all chapters for easy lookup
  const allChapters = classGroups.flatMap((cls) =>
    cls.subjects.flatMap((sub) => sub.chapters),
  );

  // Left panel state
  const [openClassIds,   setOpenClassIds]   = useState<Set<string>>(new Set(initial.map((c) => c.id)));
  const [openSubjectIds, setOpenSubjectIds] = useState<Set<string>>(
    new Set(initial.flatMap((c) => c.subjects.map((s) => s.id))),
  );

  // Active exam (right panel)
  const [activeExamId,     setActiveExamId]     = useState<string | null>(null);
  const [activeChapterId,  setActiveChapterId]  = useState<string | null>(null);

  // ── Mutate helpers ─────────────────────────────────────────────────────────

  function patchChapterExams(chapterId: string, updater: (exams: Exam[]) => Exam[]) {
    setClassGroups((prev) =>
      prev.map((cls) => ({
        ...cls,
        subjects: cls.subjects.map((sub) => ({
          ...sub,
          chapters: sub.chapters.map((ch) =>
            ch.id === chapterId ? { ...ch, exams: updater(ch.exams) } : ch,
          ),
        })),
      })),
    );
  }

  function patchExam(chapterId: string, examId: string, patch: Partial<Exam>) {
    patchChapterExams(chapterId, (exams) =>
      exams.map((e) => (e.id === examId ? { ...e, ...patch } : e)),
    );
  }

  function patchChapterTestPanel(chapterId: string, enabled: boolean) {
    setClassGroups((prev) =>
      prev.map((cls) => ({
        ...cls,
        subjects: cls.subjects.map((sub) => ({
          ...sub,
          chapters: sub.chapters.map((ch) =>
            ch.id === chapterId ? { ...ch, testPanelEnabled: enabled } : ch,
          ),
        })),
      })),
    );
  }

  // ── Find active exam ───────────────────────────────────────────────────────
  const activeChapter = activeChapterId ? allChapters.find((c) => c.id === activeChapterId) : null;
  const activeExam    = activeExamId && activeChapter
    ? activeChapter.exams.find((e) => e.id === activeExamId) ?? null
    : null;

  return (
    <div className="flex gap-0 min-h-[calc(100vh-12rem)]">

      {/* ── LEFT: Chapter browser ────────────────────────────────────────── */}
      <aside className="w-80 flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Chapters</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Select a chapter to manage its exams</p>
        </div>

        <div className="divide-y divide-slate-100">
          {classGroups.map((cls) => (
            <div key={cls.id}>
              {/* Class header */}
              <button
                type="button"
                onClick={() => setOpenClassIds((p) => {
                  const n = new Set(p); n.has(cls.id) ? n.delete(cls.id) : n.add(cls.id); return n;
                })}
                className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-left"
              >
                <span className="text-xs font-bold text-slate-700">{cls.name}</span>
                {openClassIds.has(cls.id)
                  ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>

              {openClassIds.has(cls.id) && cls.subjects.map((sub) => (
                <div key={sub.id}>
                  {/* Subject header */}
                  <button
                    type="button"
                    onClick={() => setOpenSubjectIds((p) => {
                      const n = new Set(p); n.has(sub.id) ? n.delete(sub.id) : n.add(sub.id); return n;
                    })}
                    className="flex w-full items-center justify-between pl-7 pr-4 py-2 bg-slate-50 hover:bg-indigo-50 text-left"
                  >
                    <span className="text-[11px] font-semibold text-slate-600">{sub.name}</span>
                    {openSubjectIds.has(sub.id)
                      ? <ChevronDown className="h-3 w-3 text-slate-400" />
                      : <ChevronRight className="h-3 w-3 text-slate-400" />}
                  </button>

                  {openSubjectIds.has(sub.id) && sub.chapters.map((ch) => {
                    const isActive = activeChapterId === ch.id;
                    const examCount = ch.exams.length;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => { setActiveChapterId(ch.id); setActiveExamId(null); }}
                        className={`flex w-full items-center justify-between pl-10 pr-3 py-2 text-left text-xs transition-colors ${
                          isActive
                            ? 'bg-violet-600 text-white'
                            : 'text-slate-700 hover:bg-violet-50 hover:text-violet-800'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          {ch.testPanelEnabled
                            ? <ClipboardList className={`h-3 w-3 flex-shrink-0 ${isActive ? 'text-violet-200' : 'text-violet-500'}`} />
                            : <BookOpen       className={`h-3 w-3 flex-shrink-0 ${isActive ? 'text-violet-200' : 'text-slate-400'}`} />}
                          <span className="truncate font-medium">{ch.name}</span>
                        </span>
                        {examCount > 0 && (
                          <span className={`flex-shrink-0 text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-1 ${
                            isActive ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-700'
                          }`}>
                            {examCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* ── RIGHT: Editor area ───────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col bg-slate-50">
        {!activeChapter ? (
          <EmptyState />
        ) : !activeExam ? (
          <ChapterExamsPanel
            chapter={activeChapter}
            onSelectExam={(id) => setActiveExamId(id)}
            onExamsChange={(exams) => patchChapterExams(activeChapter.id, () => exams)}
            onToggleTestPanel={(enabled) => patchChapterTestPanel(activeChapter.id, enabled)}
          />
        ) : (
          <ExamEditor
            exam={activeExam}
            chapter={activeChapter}
            onBack={() => setActiveExamId(null)}
            onPatch={(patch) => patchExam(activeChapter.id, activeExam.id, patch)}
          />
        )}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-12 text-center">
      <div>
        <ClipboardList className="h-14 w-14 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 font-semibold">Select a chapter from the left to get started</p>
        <p className="text-slate-400 text-sm mt-1">
          Browse classes and subjects, then click a chapter to manage its exams.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChapterExamsPanel — exam list for one chapter
// ─────────────────────────────────────────────────────────────────────────────

function ChapterExamsPanel({
  chapter,
  onSelectExam,
  onExamsChange,
  onToggleTestPanel,
}: {
  chapter:          Chapter;
  onSelectExam:     (id: string) => void;
  onExamsChange:    (exams: Exam[]) => void;
  onToggleTestPanel:(enabled: boolean) => void;
}) {
  const [creating,    setCreating]    = useState(false);
  const [newTitle,    setNewTitle]    = useState('');
  const [newScope,    setNewScope]    = useState<'chapter' | 'topic' | 'subtopic'>('chapter');
  const [newScopeId,  setNewScopeId]  = useState(chapter.id);
  const [newFormat,   setNewFormat]   = useState<ExamFormat>('STANDARD');
  const [newTime,     setNewTime]     = useState(30);
  const [newPass,     setNewPass]     = useState(60);
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [toggling,    setToggling]    = useState(false);

  const exams = chapter.exams;

  async function toggleTestPanel() {
    setToggling(true);
    const next = !chapter.testPanelEnabled;
    try {
      const res = await fetch(`/api/studio/chapters/${chapter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPanelEnabled: next }),
      });
      if (res.ok) onToggleTestPanel(next);
      else setMsg({ type: 'err', text: 'Failed to update test panel setting.' });
    } finally { setToggling(false); }
  }

  async function createExam() {
    if (!newTitle.trim()) return;
    setSaving(true); setMsg(null);
    try {
      const parentKey = newScope === 'chapter' ? 'chapterId'
                      : newScope === 'topic'   ? 'topicId'
                      :                          'subtopicId';
      const res = await fetch('/api/studio/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [parentKey]:  newScopeId,
          title:        newTitle.trim(),
          format:       newFormat,
          timeLimit:    newTime,
          passingScore: newPass,
          sortOrder:    exams.length,
        }),
      });
      if (res.ok) {
        const created = await res.json() as Exam;
        // Build scopeLabel
        const label = newScope === 'chapter' ? chapter.name
          : newScope === 'topic'
          ? (chapter.topics.find((t) => t.id === newScopeId)?.title ?? 'Topic')
          : chapter.topics.flatMap((t) => t.subtopics).find((s) => s.id === newScopeId)?.title ?? 'Subtopic';
        const withLabel: Exam = {
          ...created,
          scopeLabel: label,
          _count: created._count ?? { attempts: 0 },
        };
        onExamsChange([...exams, withLabel]);
        setNewTitle(''); setNewFormat('STANDARD'); setCreating(false);
        setMsg({ type: 'ok', text: `"${created.title}" created.` });
      } else {
        const d = await res.json();
        setMsg({ type: 'err', text: d.error ?? 'Failed to create.' });
      }
    } finally { setSaving(false); }
  }

  async function deleteExam(id: string, title: string) {
    if (!confirm(`Delete exam "${title}" and all its questions?`)) return;
    const res = await fetch(`/api/studio/exams/${id}`, { method: 'DELETE' });
    if (res.ok) onExamsChange(exams.filter((e) => e.id !== id));
    else setMsg({ type: 'err', text: 'Delete failed.' });
  }

  async function duplicateExam(exam: Exam) {
    setSaving(true); setMsg(null);
    try {
      const parentKey = exam.chapterId ? 'chapterId' : exam.topicId ? 'topicId' : 'subtopicId';
      const parentVal = exam.chapterId ?? exam.topicId ?? exam.subtopicId;
      // Create exam
      const res = await fetch('/api/studio/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [parentKey]:       parentVal,
          title:             `${exam.title} (copy)`,
          description:       exam.description,
          format:            exam.format,
          caseStudyImageUrl: exam.caseStudyImageUrl,
          timeLimit:         exam.timeLimit,
          passingScore:      exam.passingScore,
          shuffleQuestions:  exam.shuffleQuestions,
          sortOrder:         exams.length,
        }),
      });
      if (!res.ok) { setMsg({ type: 'err', text: 'Duplicate failed.' }); return; }
      const newExam = await res.json() as Exam;
      // Copy all questions
      for (const q of exam.questions) {
        await fetch(`/api/studio/exams/${newExam.id}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question:      q.question,
            type:          q.type,
            options:       q.options,
            correctAnswer: q.correctAnswer,
            explanation:   q.explanation,
            marks:         q.marks,
            sortOrder:     q.sortOrder,
          }),
        });
      }
      // Refetch updated exam
      const full = await fetch(`/api/studio/exams/${newExam.id}`).then((r) => r.json()) as Exam;
      onExamsChange([...exams, { ...full, scopeLabel: exam.scopeLabel }]);
      setMsg({ type: 'ok', text: `Duplicated as "${full.title}".` });
    } finally { setSaving(false); }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Chapter header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600 mb-1">
            {chapter.subject.class.name} · {chapter.subject.name}
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900">{chapter.name}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {exams.length} exam{exams.length !== 1 ? 's' : ''} ·{' '}
            {exams.reduce((s, e) => s + e.questions.length, 0)} total questions ·{' '}
            {exams.reduce((s, e) => s + e._count.attempts, 0)} attempts
          </p>
        </div>

        {/* Test panel toggle */}
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={toggleTestPanel}
            disabled={toggling}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              chapter.testPanelEnabled
                ? 'bg-violet-600 text-white hover:bg-violet-700'
                : 'border-2 border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-700'
            }`}
          >
            {toggling
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : chapter.testPanelEnabled
              ? <Eye className="h-4 w-4" />
              : <EyeOff className="h-4 w-4" />}
            {chapter.testPanelEnabled ? 'Test Panel: Enabled' : 'Test Panel: Disabled'}
          </button>
          <p className="text-[10px] text-slate-400 mt-1 text-right">
            {chapter.testPanelEnabled
              ? 'Students with access can see these exams'
              : 'Click to enable student access'}
          </p>
        </div>
      </div>

      {/* Exam grid */}
      {exams.length === 0 && !creating ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center mb-6">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">No exams yet</p>
          <p className="text-slate-400 text-sm mt-1">Create the first exam for this chapter below.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {exams.map((exam) => (
            <ExamSummaryCard
              key={exam.id}
              exam={exam}
              onOpen={() => onSelectExam(exam.id)}
              onDelete={() => deleteExam(exam.id, exam.title)}
              onDuplicate={() => duplicateExam(exam)}
            />
          ))}
        </div>
      )}

      {/* Status message */}
      {msg && (
        <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
          msg.type === 'ok'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {/* Create exam form */}
      {creating ? (
        <div className="rounded-2xl border-2 border-violet-200 bg-white p-6 space-y-4">
          <p className="text-sm font-bold text-violet-800">New exam</p>

          <div>
            <label className="lms-label">Title</label>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Chapter 3 — Full Test"
              className="lms-field"
            />
          </div>

          {/* Format picker */}
          <div>
            <label className="lms-label">Exam format</label>
            <select
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value as ExamFormat)}
              className="lms-field"
            >
              <option value="STANDARD">Standard</option>
              <option value="ASSERTION_BASED">Assertion Based</option>
              <option value="CASE_STUDY_BASED">Case Study Based</option>
            </select>
          </div>

          {/* Scope picker */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="lms-label">Attach to</label>
              <select
                value={newScope}
                onChange={(e) => {
                  const s = e.target.value as typeof newScope;
                  setNewScope(s);
                  setNewScopeId(s === 'chapter' ? chapter.id : '');
                }}
                className="lms-field"
              >
                <option value="chapter">Chapter — {chapter.name}</option>
                <option value="topic">Topic</option>
                <option value="subtopic">Subtopic</option>
              </select>
            </div>

            {newScope === 'topic' && (
              <div>
                <label className="lms-label">Select topic</label>
                <select value={newScopeId} onChange={(e) => setNewScopeId(e.target.value)} className="lms-field">
                  <option value="">— pick a topic —</option>
                  {chapter.topics.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            )}

            {newScope === 'subtopic' && (
              <div>
                <label className="lms-label">Select subtopic</label>
                <select value={newScopeId} onChange={(e) => setNewScopeId(e.target.value)} className="lms-field">
                  <option value="">— pick a subtopic —</option>
                  {chapter.topics.flatMap((t) =>
                    t.subtopics.map((s) => (
                      <option key={s.id} value={s.id}>{t.title} › {s.title}</option>
                    )),
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="lms-label">Time limit (min) <span className="font-normal text-slate-400">0 = unlimited</span></label>
              <input type="number" min={0} value={newTime} onChange={(e) => setNewTime(Number(e.target.value))} className="lms-field" />
            </div>
            <div>
              <label className="lms-label">Passing score (%)</label>
              <input type="number" min={0} max={100} value={newPass} onChange={(e) => setNewPass(Number(e.target.value))} className="lms-field" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={createExam}
              disabled={saving || !newTitle.trim() || (newScope !== 'chapter' && !newScopeId)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create exam
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewTitle(''); }}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New exam
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExamSummaryCard
// ─────────────────────────────────────────────────────────────────────────────

function ExamSummaryCard({
  exam,
  onOpen,
  onDelete,
  onDuplicate,
}: {
  exam:        Exam;
  onOpen:      () => void;
  onDelete:    () => void;
  onDuplicate: () => void;
}) {
  const marks = totalMarks(exam.questions);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1 mb-1">
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${
              exam.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {exam.isActive ? 'Published' : 'Draft'}
            </span>
            {exam.format !== 'STANDARD' && (
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${FORMAT_BADGE[exam.format]}`}>
                {FORMAT_LABELS[exam.format]}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-900 leading-snug">{exam.title}</h3>
          <p className="text-[11px] text-violet-600 font-semibold mt-0.5">{exam.scopeLabel}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{exam.questions.length} Q</span>
        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{marks} marks</span>
        <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{exam.timeLimit > 0 ? `${exam.timeLimit}m` : '∞'}</span>
        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{exam._count.attempts} attempts</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          <PenLine className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          title="Duplicate exam"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-500 hover:border-violet-300 hover:text-violet-700 transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete exam"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-500 hover:border-red-300 hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExamEditor — full editor for one exam
// ─────────────────────────────────────────────────────────────────────────────

type EditorTab = 'questions' | 'settings' | 'stats';

function ExamEditor({
  exam,
  chapter,
  onBack,
  onPatch,
}: {
  exam:    Exam;
  chapter: Chapter;
  onBack:  () => void;
  onPatch: (p: Partial<Exam>) => void;
}) {
  const [activeTab, setActiveTab] = useState<EditorTab>('questions');

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Exam top bar */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 truncate">
              {chapter.subject.class.name} · {chapter.subject.name} · {chapter.name}
            </p>
            <h2 className="text-base font-bold text-slate-900 truncate">{exam.title}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">
              {exam.questions.length} Q · {totalMarks(exam.questions)} marks
            </span>
            <span className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${
              exam.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {exam.isActive ? 'Live' : 'Draft'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {([
            ['questions', 'Questions', <PenLine key="q" className="h-3.5 w-3.5" />],
            ['settings',  'Settings',  <Settings key="s" className="h-3.5 w-3.5" />],
            ['stats',     'Attempts',  <BarChart2 key="a" className="h-3.5 w-3.5" />],
          ] as [EditorTab, string, React.ReactNode][]).map(([tab, label, icon]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab panels */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'questions' && (
          <QuestionsTab exam={exam} onPatch={onPatch} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab exam={exam} onPatch={onPatch} />
        )}
        {activeTab === 'stats' && (
          <StatsTab exam={exam} />
        )}
      </div>
    </div>
  );
}

// ChevronLeft isn't imported yet — add it inline:
function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestionsTab — the main question builder
// ─────────────────────────────────────────────────────────────────────────────

function QuestionsTab({ exam, onPatch }: { exam: Exam; onPatch: (p: Partial<Exam>) => void }) {
  const [questions,  setQuestions]  = useState<Question[]>(exam.questions);
  const [addingType, setAddingType] = useState<QType | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState<string | null>(null);

  // Sync up when exam prop changes (e.g. after settings save)
  // We don't do a deep compare here — parent only patches metadata, not questions

  // ── Drag reorder ───────────────────────────────────────────────────────────
  const dragId = useRef<string | null>(null);

  async function handleDrop(targetId: string) {
    const src = dragId.current;
    if (!src || src === targetId) { dragId.current = null; return; }
    const srcIdx = questions.findIndex((q) => q.id === src);
    const dstIdx = questions.findIndex((q) => q.id === targetId);
    const next = [...questions];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(dstIdx, 0, moved);
    setQuestions(next);
    dragId.current = null;
    await fetch('/api/studio/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource: 'examQuestions', ids: next.map((q) => q.id) }),
    });
  }

  // ── Add question ───────────────────────────────────────────────────────────
  async function addQuestion(type: QType) {
    setSaving(true); setMsg(null);
    const defaults: Record<QType, { options: string[]; correctAnswer: string | string[] }> = {
      MCQ:           { options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'Option A' },
      MULTI_SELECT:  { options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: ['Option A'] },
      TRUE_FALSE:    { options: ['True', 'False'],                                correctAnswer: 'True' },
      SHORT_ANSWER:  { options: [],                                               correctAnswer: ['keyword'] },
      FILL_IN_BLANK: { options: [],                                               correctAnswer: ['answer'] },
      // MATCHING: options = left-column items as JSON strings '{"left":"A","right":"1"}'
      MATCHING:      {
        options: [
          JSON.stringify({ left: 'Term A', right: 'Definition 1' }),
          JSON.stringify({ left: 'Term B', right: 'Definition 2' }),
        ],
        correctAnswer: [],  // derived from options at grade time
      },
      // NUMERICAL: correctAnswer = ["value", "tolerance"] e.g. ["9.8", "0.1"]
      NUMERICAL:     { options: [], correctAnswer: ['0', '0'] },
      // ASSERTION_REASON: 4 standard JEE-style options; options[0] is stored as assertion text,
      // options[1] as reason text, options[2-5] as the 4 answer choices.
      // We encode assertion & reason in the question field (rich HTML) and keep the
      // standard 4-option list as the selectable answers.
      ASSERTION_REASON: {
        options: [
          'Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A).',
          'Both Assertion (A) and Reason (R) are true, but Reason (R) is NOT the correct explanation of Assertion (A).',
          'Assertion (A) is true but Reason (R) is false.',
          'Assertion (A) is false but Reason (R) is true.',
        ],
        correctAnswer: 'Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A).',
      },
    };
    const def = defaults[type];
    try {
      const res = await fetch(`/api/studio/exams/${exam.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question:      `Question ${questions.length + 1}`,
          type,
          options:       def.options,
          correctAnswer: def.correctAnswer,
          marks:         1,
          sortOrder:     questions.length,
        }),
      });
      if (res.ok) {
        const q: Question = await res.json();
        const updated = [...questions, q];
        setQuestions(updated);
        onPatch({ questions: updated });
        setAddingType(null);
      } else {
        setMsg('Failed to add question.');
      }
    } finally { setSaving(false); }
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return;
    const res = await fetch(`/api/studio/exams/${exam.id}/questions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const updated = questions.filter((q) => q.id !== id);
      setQuestions(updated);
      onPatch({ questions: updated });
    }
  }

  function patchQuestion(id: string, patch: Partial<Question>) {
    const updated = questions.map((q) => q.id === id ? { ...q, ...patch } : q);
    setQuestions(updated);
    onPatch({ questions: updated });
  }

  const marks = totalMarks(questions);

  return (
    <div className="p-6 space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5 text-violet-500" /><strong>{questions.length}</strong> questions</span>
          <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-violet-500" /><strong>{marks}</strong> total marks</span>
        </div>
        {msg && <p className="text-xs text-red-600">{msg}</p>}
      </div>

      {/* Question list */}
      {questions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
          <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No questions yet — add one below.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, qi) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={qi}
              examId={exam.id}
              onPatch={(p) => patchQuestion(q.id, p)}
              onDelete={() => deleteQuestion(q.id)}
              onDragStart={() => { dragId.current = q.id; }}
              onDrop={() => handleDrop(q.id)}
            />
          ))}
        </div>
      )}

      {/* Add question type picker */}
      {addingType === null ? (
        <div className="flex flex-wrap gap-2 pt-2">
          {(['MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_IN_BLANK', 'MATCHING', 'NUMERICAL', 'ASSERTION_REASON'] as QType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addQuestion(t)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestionEditor — rich editor for a single question
// ─────────────────────────────────────────────────────────────────────────────

function QuestionEditor({
  question,
  index,
  examId,
  onPatch,
  onDelete,
  onDragStart,
  onDrop,
}: {
  question:    Question;
  index:       number;
  examId:      string;
  onPatch:     (p: Partial<Question>) => void;
  onDelete:    () => void;
  onDragStart: () => void;
  onDrop:      () => void;
}) {
  const [open,    setOpen]    = useState(index === 0); // auto-open first question
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  // Local state — mirrors question
  const [qText,   setQText]   = useState(question.question);
  const [qType,   setQType]   = useState<QType>(question.type);
  const [options, setOptions] = useState<string[]>(question.options);
  const [correct, setCorrect] = useState<string | string[]>(question.correctAnswer);
  const [explain, setExplain] = useState(question.explanation ?? '');
  const [marks,   setMarks]   = useState(question.marks);

  async function save() {
    setSaving(true); setSaved(false); setErr(null);
    try {
      const res = await fetch(`/api/studio/exams/${examId}/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question:      qText,
          type:          qType,
          options,
          correctAnswer: correct,
          explanation:   explain || null,
          marks,
        }),
      });
      if (res.ok) {
        const d = await res.json() as Question;
        onPatch(d);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const d = await res.json();
        setErr(d.error ?? 'Save failed.');
      }
    } finally { setSaving(false); }
  }

  function addOption() { setOptions((p) => [...p, `Option ${p.length + 1}`]); }
  function removeOption(i: number) {
    const next = options.filter((_, idx) => idx !== i);
    setOptions(next);
    // Correct answer cleanup
    if (qType === 'MCQ' && correct === options[i]) setCorrect(next[0] ?? '');
    if (qType === 'MULTI_SELECT' && Array.isArray(correct)) {
      setCorrect((correct as string[]).filter((x) => x !== options[i]));
    }
  }
  function updateOption(i: number, val: string) {
    setOptions((p) => p.map((o, idx) => idx === i ? val : o));
    // Keep correct answer in sync if it matched the old value
    if (qType === 'MCQ' && correct === options[i]) setCorrect(val);
    if (qType === 'MULTI_SELECT' && Array.isArray(correct)) {
      setCorrect((correct as string[]).map((c) => c === options[i] ? val : c));
    }
  }
  function toggleMultiCorrect(opt: string) {
    const arr = Array.isArray(correct) ? correct as string[] : [];
    setCorrect(arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]);
  }

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Question header row */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100 group">
        {/* Drag handle */}
        <span className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none select-none">
          <GripVertical className="h-4 w-4" />
        </span>

        <span className="flex-shrink-0 text-xs font-bold text-slate-400 w-6">Q{index + 1}</span>

        {/* Type badge */}
        <span className={`flex-shrink-0 text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${typeBadgeColor(question.type)}`}>
          {TYPE_LABELS[question.type]}
        </span>

        {/* Question preview */}
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="flex-1 min-w-0 text-left"
        >
          <span
            className="text-sm text-slate-700 line-clamp-1"
            dangerouslySetInnerHTML={{ __html: question.question }}
          />
        </button>

        {/* Marks badge */}
        <span className="flex-shrink-0 text-xs text-slate-500">
          {question.marks}m
        </span>

        {/* Expand / delete */}
        <button type="button" onClick={() => setOpen((p) => !p)} className="flex-shrink-0 text-slate-400">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editor body */}
      {open && (
        <div className="p-5 space-y-5">
          {/* Question text — rich editor */}
          <div>
            <label className="lms-label">Question text <span className="font-normal text-slate-400">(supports HTML + LaTeX math)</span></label>
            <AdvancedHTMLEditor value={qText} onChange={setQText} />
          </div>

          {/* Type + Marks row */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="lms-label">Question type</label>
              <select
                value={qType}
                onChange={(e) => {
                  const t = e.target.value as QType;
                  setQType(t);
                  // Reset answer/options to sensible defaults when type changes
                  if (t === 'TRUE_FALSE') {
                    setOptions(['True', 'False']);
                    setCorrect('True');
                  } else if (t === 'SHORT_ANSWER' || t === 'FILL_IN_BLANK') {
                    setOptions([]);
                    setCorrect(['keyword']);
                  } else if (t === 'MULTI_SELECT') {
                    setCorrect([]);
                  } else if (t === 'MATCHING') {
                    setOptions([
                      JSON.stringify({ left: 'Term A', right: 'Definition 1' }),
                      JSON.stringify({ left: 'Term B', right: 'Definition 2' }),
                    ]);
                    setCorrect([]);
                  } else if (t === 'NUMERICAL') {
                    setOptions([]);
                    setCorrect(['0', '0']);
                  } else if (t === 'ASSERTION_REASON') {
                    setOptions([
                      'Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A).',
                      'Both Assertion (A) and Reason (R) are true, but Reason (R) is NOT the correct explanation of Assertion (A).',
                      'Assertion (A) is true but Reason (R) is false.',
                      'Assertion (A) is false but Reason (R) is true.',
                    ]);
                    setCorrect('Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A).');
                  } else {
                    setCorrect(options[0] ?? '');
                  }
                }}
                className="lms-field"
              >
                <option value="MCQ">Multiple choice — single answer</option>
                <option value="MULTI_SELECT">Multiple choice — multiple answers</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SHORT_ANSWER">Short answer (keyword match)</option>
                <option value="FILL_IN_BLANK">Fill in the blank</option>
                <option value="MATCHING">Matching (pairs)</option>
                <option value="NUMERICAL">Numerical (with tolerance)</option>
                <option value="ASSERTION_REASON">Assertion &amp; Reason</option>
              </select>
            </div>
            <div>
              <label className="lms-label">Marks</label>
              <input type="number" min={1} value={marks} onChange={(e) => setMarks(Number(e.target.value))} className="lms-field" />
            </div>
          </div>

          {/* Options editor */}
          {(qType === 'MCQ' || qType === 'MULTI_SELECT') && (
            <div>
              <label className="lms-label">
                Answer options
                <span className="font-normal text-slate-400 ml-1">
                  — {qType === 'MCQ' ? 'click radio to mark correct answer' : 'tick all correct answers'}
                </span>
              </label>
              <div className="space-y-2 mt-1.5">
                {options.map((opt, oi) => {
                  const isCorrect = qType === 'MCQ'
                    ? correct === opt
                    : (Array.isArray(correct) ? (correct as string[]).includes(opt) : false);
                  return (
                    <div key={oi} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 transition-colors ${
                      isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'
                    }`}>
                      {/* Correct marker */}
                      <button
                        type="button"
                        title={isCorrect ? 'Mark as incorrect' : 'Mark as correct'}
                        onClick={() => {
                          if (qType === 'MCQ') setCorrect(opt);
                          else toggleMultiCorrect(opt);
                        }}
                        className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-300 hover:border-emerald-400'
                        }`}
                      >
                        {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </button>

                      <span className="flex-shrink-0 text-xs font-bold text-slate-400 w-5">{String.fromCharCode(65 + oi)}.</span>

                      <input
                        value={opt}
                        onChange={(e) => updateOption(oi, e.target.value)}
                        className="flex-1 bg-transparent text-sm text-slate-800 outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => removeOption(oi)}
                        disabled={options.length <= 2}
                        className="flex-shrink-0 text-slate-300 hover:text-red-500 disabled:opacity-30"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
                {options.length < 8 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600 font-semibold mt-1"
                  >
                    <Plus className="h-3.5 w-3.5" />Add option
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TRUE_FALSE correct picker */}
          {qType === 'TRUE_FALSE' && (
            <div>
              <label className="lms-label">Correct answer</label>
              <div className="flex gap-3 mt-1.5">
                {['True', 'False'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCorrect(val)}
                    className={`flex-1 rounded-xl py-3 font-semibold text-sm transition-colors border-2 ${
                      correct === val
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SHORT_ANSWER keywords */}
          {qType === 'SHORT_ANSWER' && (
            <div>
              <label className="lms-label">
                Accepted keywords
                <span className="font-normal text-slate-400 ml-1">comma-separated — answer passes if it contains any</span>
              </label>
              <input
                value={Array.isArray(correct) ? (correct as string[]).join(', ') : String(correct)}
                onChange={(e) =>
                  setCorrect(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                }
                placeholder="e.g. newton, force, inertia"
                className="lms-field mt-1.5"
              />
            </div>
          )}

          {/* FILL_IN_BLANK accepted answers */}
          {qType === 'FILL_IN_BLANK' && (
            <div>
              <label className="lms-label">
                Accepted answers
                <span className="font-normal text-slate-400 ml-1">comma-separated — answer passes if it matches any (case-insensitive)</span>
              </label>
              <p className="text-xs text-slate-400 mt-0.5 mb-1.5">
                Hint: use underscores in your question text to mark the blank, e.g. "The unit of force is ___."
              </p>
              <input
                value={Array.isArray(correct) ? (correct as string[]).join(', ') : String(correct)}
                onChange={(e) =>
                  setCorrect(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                }
                placeholder="e.g. Newton, newton, N"
                className="lms-field"
              />
            </div>
          )}

          {/* MATCHING pairs editor */}
          {qType === 'MATCHING' && (
            <div>
              <label className="lms-label">
                Matching pairs
                <span className="font-normal text-slate-400 ml-1">student must match each left item to the correct right item</span>
              </label>
              <div className="space-y-2 mt-1.5">
                {options.map((raw, oi) => {
                  let pair = { left: '', right: '' };
                  try { pair = JSON.parse(raw); } catch { /* skip */ }
                  return (
                    <div key={oi} className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-3 py-2">
                      <span className="flex-shrink-0 text-xs font-bold text-slate-400 w-5">{oi + 1}.</span>
                      <input
                        value={pair.left}
                        onChange={(e) => {
                          const next = [...options];
                          next[oi] = JSON.stringify({ left: e.target.value, right: pair.right });
                          setOptions(next);
                        }}
                        placeholder="Left (term)"
                        className="flex-1 bg-transparent text-sm text-slate-800 outline-none"
                      />
                      <span className="flex-shrink-0 text-slate-300 text-xs">→</span>
                      <input
                        value={pair.right}
                        onChange={(e) => {
                          const next = [...options];
                          next[oi] = JSON.stringify({ left: pair.left, right: e.target.value });
                          setOptions(next);
                        }}
                        placeholder="Right (definition)"
                        className="flex-1 bg-transparent text-sm text-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setOptions(options.filter((_, idx) => idx !== oi))}
                        disabled={options.length <= 2}
                        className="flex-shrink-0 text-slate-300 hover:text-red-500 disabled:opacity-30"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
                {options.length < 8 && (
                  <button
                    type="button"
                    onClick={() => setOptions([...options, JSON.stringify({ left: `Term ${options.length + 1}`, right: `Definition ${options.length + 1}` })])}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600 font-semibold mt-1"
                  >
                    <Plus className="h-3.5 w-3.5" />Add pair
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                The correct answer is automatically derived from the pairs — right-column items are shuffled for the student.
              </p>
            </div>
          )}

          {/* NUMERICAL answer + tolerance */}
          {qType === 'NUMERICAL' && (
            <div>
              <label className="lms-label">Correct value and tolerance</label>
              <p className="text-xs text-slate-400 mt-0.5 mb-2">
                Student's answer is accepted if it falls within ± tolerance of the correct value.
              </p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Correct value</label>
                  <input
                    type="number"
                    step="any"
                    value={Array.isArray(correct) ? (correct as string[])[0] ?? '0' : String(correct)}
                    onChange={(e) => {
                      const arr = Array.isArray(correct) ? [...(correct as string[])] : ['0', '0'];
                      arr[0] = e.target.value;
                      setCorrect(arr);
                    }}
                    placeholder="e.g. 9.8"
                    className="lms-field"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Tolerance (± )</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={Array.isArray(correct) ? (correct as string[])[1] ?? '0' : '0'}
                    onChange={(e) => {
                      const arr = Array.isArray(correct) ? [...(correct as string[])] : ['0', '0'];
                      arr[1] = e.target.value;
                      setCorrect(arr);
                    }}
                    placeholder="e.g. 0.1"
                    className="lms-field"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Example: value = 9.8, tolerance = 0.1 → accepts answers between 9.7 and 9.9
              </p>
            </div>
          )}

          {/* ASSERTION_REASON editor */}
          {qType === 'ASSERTION_REASON' && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                  How to write an Assertion &amp; Reason question
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Write the <strong>Assertion (A)</strong> and <strong>Reason (R)</strong> statements directly in
                  the <em>Question text</em> field above, e.g.:
                </p>
                <pre className="text-[11px] bg-amber-100 rounded-lg px-3 py-2 text-amber-900 whitespace-pre-wrap">
{`Assertion (A): Newton's first law defines inertia.
Reason (R): A body at rest tends to stay at rest unless acted upon by an external force.`}
                </pre>
                <p className="text-xs text-amber-700">
                  The four standard answer choices below are locked — they match the JEE/NEET pattern.
                  Click the circle next to the correct one.
                </p>
              </div>

              {/* 4 fixed answer choices — allow admin to select the correct one */}
              <div>
                <label className="lms-label">Correct answer</label>
                <div className="space-y-2 mt-1.5">
                  {options.map((opt, oi) => {
                    const isCorrect = correct === opt;
                    return (
                      <div
                        key={oi}
                        className={`flex items-start gap-3 rounded-xl border-2 px-3 py-2.5 transition-colors ${
                          isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'
                        }`}
                      >
                        <button
                          type="button"
                          title={isCorrect ? 'Already selected' : 'Mark as correct'}
                          onClick={() => setCorrect(opt)}
                          className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-slate-300 hover:border-emerald-400'
                          }`}
                        >
                          {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </button>
                        <span className="flex-shrink-0 text-xs font-bold text-slate-400 mt-0.5">
                          ({String.fromCharCode(65 + oi)})
                        </span>
                        <span className="text-sm text-slate-700 leading-snug">{opt}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  These four options are standard and fixed — they cannot be edited.
                </p>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="lms-label">
              Explanation
              <span className="font-normal text-slate-400 ml-1">shown to student after they answer — optional</span>
            </label>
            <AdvancedHTMLEditor value={explain} onChange={setExplain} />
          </div>

          {/* Save row */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save question'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />Saved
              </span>
            )}
            {err && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                <AlertCircle className="h-4 w-4" />{err}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsTab — exam-level metadata editor
// ─────────────────────────────────────────────────────────────────────────────

function SettingsTab({ exam, onPatch }: { exam: Exam; onPatch: (p: Partial<Exam>) => void }) {
  const [title,             setTitle]             = useState(exam.title);
  const [desc,              setDesc]              = useState(exam.description ?? '');
  const [format,            setFormat]            = useState<ExamFormat>(exam.format);
  const [caseStudyImageUrl, setCaseStudyImageUrl] = useState(exam.caseStudyImageUrl ?? '');
  const [time,              setTime]              = useState(exam.timeLimit);
  const [pass,              setPass]              = useState(exam.passingScore);
  const [shuffle,           setShuffle]           = useState(exam.shuffleQuestions);
  const [active,            setActive]            = useState(exam.isActive);
  const [saving,            setSaving]            = useState(false);
  const [msg,               setMsg]               = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function save() {
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/studio/exams/${exam.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:             title.trim(),
        description:       desc.trim() || null,
        format,
        caseStudyImageUrl: caseStudyImageUrl.trim() || null,
        timeLimit:         time,
        passingScore:      pass,
        shuffleQuestions:  shuffle,
        isActive:          active,
      }),
    });
    if (res.ok) {
      const d = await res.json() as Exam;
      onPatch(d);
      setMsg({ type: 'ok', text: 'Settings saved.' });
    } else {
      setMsg({ type: 'err', text: 'Save failed.' });
    }
    setSaving(false);
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div>
        <label className="lms-label">Exam title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="lms-field" />
      </div>

      <div>
        <label className="lms-label">Description <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          className="lms-field resize-none"
          placeholder="Brief description shown to students before they start…"
        />
      </div>

      {/* Exam format */}
      <div>
        <label className="lms-label">Exam format</label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as ExamFormat)}
          className="lms-field"
        >
          <option value="STANDARD">Standard</option>
          <option value="ASSERTION_BASED">Assertion Based</option>
          <option value="CASE_STUDY_BASED">Case Study Based</option>
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          {format === 'ASSERTION_BASED'  && 'Questions follow an assertion-reason pattern where students evaluate the validity of a statement and its reason.'}
          {format === 'CASE_STUDY_BASED' && 'Questions are based on a passage or image. Provide the image URL below so it renders above the questions for students.'}
          {format === 'STANDARD'         && 'Regular question-by-question format with no special context.'}
        </p>
      </div>

      {/* Case study image URL — only shown when format is CASE_STUDY_BASED */}
      {format === 'CASE_STUDY_BASED' && (
        <div>
          <label className="lms-label">
            Case study image URL
            <span className="font-normal text-slate-400 ml-1">(Blogger / external link)</span>
          </label>
          <input
            type="url"
            value={caseStudyImageUrl}
            onChange={(e) => setCaseStudyImageUrl(e.target.value)}
            placeholder="https://blogger.googleusercontent.com/…"
            className="lms-field"
          />
          {caseStudyImageUrl && (
            <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={caseStudyImageUrl}
                alt="Case study preview"
                className="max-h-48 w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lms-label">Time limit (minutes)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
              className="lms-field flex-1"
            />
            <span className="text-xs text-slate-400 flex-shrink-0">0 = unlimited</span>
          </div>
        </div>
        <div>
          <label className="lms-label">Passing score (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={pass}
            onChange={(e) => setPass(Number(e.target.value))}
            className="lms-field"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-4">
        <SettingsToggle
          icon={<Shuffle className="h-4 w-4" />}
          label="Shuffle questions"
          description="Questions appear in a random order for each student"
          checked={shuffle}
          onChange={setShuffle}
        />
        <SettingsToggle
          icon={active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          label={active ? 'Published — visible to students' : 'Draft — hidden from students'}
          description="Unpublished exams are saved but not shown in the Test Panel"
          checked={active}
          onChange={setActive}
        />
      </div>

      {msg && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border ${
          msg.type === 'ok'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save settings
      </button>
    </div>
  );
}

function SettingsToggle({
  icon, label, description, checked, onChange,
}: {
  icon: React.ReactNode; label: string; description: string;
  checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl border-2 p-4 transition-colors hover:bg-slate-50 hover:border-slate-300">
      <div className={`flex-shrink-0 mt-0.5 ${checked ? 'text-violet-600' : 'text-slate-400'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0 mt-0.5">
        <div className={`w-10 h-6 rounded-full transition-colors relative ${checked ? 'bg-violet-600' : 'bg-slate-200'}`}>
          <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
          <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        </div>
      </div>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatsTab — attempt analytics
// ─────────────────────────────────────────────────────────────────────────────

function StatsTab({ exam }: { exam: Exam }) {
  const [data,    setData]    = useState<AttemptStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Lazy-load stats
  useState(() => {
    fetch(`/api/studio/exams/${exam.id}/stats`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load stats');
        return res.json() as Promise<AttemptStats>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />Loading statistics…
    </div>
  );

  if (error || !data) return (
    <div className="p-6 text-center">
      <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
      <p className="text-slate-500 text-sm">{error ?? 'No data available.'}</p>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total attempts" value={String(data.totalAttempts)} icon={<Users className="h-5 w-5 text-indigo-500" />} />
        <StatCard label="Pass rate"       value={`${data.passRate}%`}        icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} />
        <StatCard label="Avg score"       value={`${data.avgPercentage}%`}   icon={<BarChart2 className="h-5 w-5 text-violet-500" />} />
        <StatCard label="Avg time"        value={data.avgTimeTaken ? `${Math.floor(data.avgTimeTaken / 60)}m ${data.avgTimeTaken % 60}s` : '—'} icon={<Timer className="h-5 w-5 text-amber-500" />} />
      </div>

      {/* Score distribution */}
      {data.distribution.length > 0 && (
        <div>
          <p className="text-sm font-bold text-slate-700 mb-3">Score distribution</p>
          <div className="space-y-2">
            {data.distribution.map((d) => (
              <div key={d.range} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-16 flex-shrink-0">{d.range}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-violet-500 transition-all"
                    style={{ width: `${d.percent}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600 w-8 text-right flex-shrink-0">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-question hardness */}
      {data.questionStats.length > 0 && (
        <div>
          <p className="text-sm font-bold text-slate-700 mb-3">Per-question accuracy</p>
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Q</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">Correct %</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">Attempts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.questionStats.map((qs, i) => (
                  <tr key={qs.questionId} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-bold text-slate-700">Q{i + 1}</td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] font-bold uppercase rounded-full px-1.5 py-0.5 ${typeBadgeColor(qs.type as QType)}`}>
                        {TYPE_LABELS[qs.type as QType]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={`font-bold ${qs.correctPct >= 70 ? 'text-emerald-600' : qs.correctPct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {qs.correctPct}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500">{qs.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface AttemptStats {
  totalAttempts:  number;
  passRate:       number;
  avgPercentage:  number;
  avgTimeTaken:   number | null;
  distribution: { range: string; count: number; percent: number }[];
  questionStats: { questionId: string; type: string; correctPct: number; attempts: number }[];
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
