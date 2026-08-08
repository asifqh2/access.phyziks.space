'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import MathRenderer from '@/components/MathRenderer';


const EMPTY = {
  exam: 'jee-main' as 'jee-main' | 'jee-advanced',
  patternId: '',
  subject: 'Physics',
  chapter: '',
  topic: '',
  subtopic: '',
  timer: 120,
  question: '',
  options: ['', '', '', ''],
  answer: 0,
  correctAnswers: [] as number[],
  intAnswer: '',
  hint: '',
  assertion: '',
  reason: '',
  arOptions: [
    'Both A and R are true, and R is the correct explanation of A.',
    'Both A and R are true, but R is NOT the correct explanation of A.',
    'A is true but R is false.',
    'A is false but R is true.',
  ],
  arAnswer: 0,
  columnA: ['', '', '', ''],
  columnB: ['', '', '', ''],
  matchOptions: ['', '', '', ''],
  matchAnswer: 0,
  // paragraph
  passage: '',
  subQuestions: [{ question: '', options: ['', '', '', ''], answer: 0 }] as { question: string; options: string[]; answer: number }[],
  // matrix-match
  matrixRows: ['', '', '', ''] as string[],
  matrixCols: ['', '', '', ''] as string[],
  matrixAnswer: '' as string,
  // true-false
  tfAnswer: true as boolean,
  // fill-blank
  blankAnswer: '',
  explanation: '',
};

export default function CreateIITQuestionPage() {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const set = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const setOption = (i: number, val: string) => {
    const opts = [...form.options]; opts[i] = val; set('options', opts);
  };
  const setColA = (i: number, val: string) => {
    const a = [...form.columnA]; a[i] = val; set('columnA', a);
  };
  const setColB = (i: number, val: string) => {
    const b = [...form.columnB]; b[i] = val; set('columnB', b);
  };
  const setMatchOpt = (i: number, val: string) => {
    const o = [...form.matchOptions]; o[i] = val; set('matchOptions', o);
  };
  const toggleMulti = (i: number) => {
    const ca = form.correctAnswers.includes(i)
      ? form.correctAnswers.filter(x => x !== i)
      : [...form.correctAnswers, i];
    set('correctAnswers', ca);
  };

  const buildPayload = () => {
    const base = {
      exam: form.exam, patternId: form.patternId, subject: form.subject,
      chapter: form.chapter, topic: form.topic, subtopic: form.subtopic,
      timer: form.timer, explanation: form.explanation,
    };
    if (form.patternId === 'single-correct')   return { ...base, question: form.question, options: form.options, answer: form.answer };
    if (form.patternId === 'multi-correct')    return { ...base, question: form.question, options: form.options, correctAnswers: form.correctAnswers };
    if (form.patternId === 'integer-type')     return { ...base, question: form.question, answer: parseInt(form.intAnswer), hint: form.hint };
    if (form.patternId === 'assertion-reason') return { ...base, assertion: form.assertion, reason: form.reason, options: form.arOptions, answer: form.arAnswer };
    if (form.patternId === 'match-column')     return { ...base, columnA: form.columnA, columnB: form.columnB, options: form.matchOptions, answer: form.matchAnswer };
    if (form.patternId === 'paragraph')        return { ...base, passage: form.passage, subQuestions: form.subQuestions };
    if (form.patternId === 'matrix-match')     return { ...base, question: form.question, matrixRows: form.matrixRows, matrixCols: form.matrixCols, answer: form.matrixAnswer };
    if (form.patternId === 'true-false')       return { ...base, question: form.question, answer: form.tfAnswer };
    if (form.patternId === 'fill-blank')       return { ...base, question: form.question, answer: form.blankAnswer, hint: form.hint };
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/iit-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (res.ok) {
        setMsg({ type: 'success', text: 'Question saved! Redirecting...' });
        setTimeout(() => router.push('/admin'), 1500);
      } else {
        const d = await res.json();
        setMsg({ type: 'error', text: d.error || 'Failed to save' });
        setSaving(false);
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Try again.' });
      setSaving(false);
    }
  };

  const clearForm = () => setForm({
    ...EMPTY,
    arOptions: [...EMPTY.arOptions], options: [...EMPTY.options],
    columnA: [...EMPTY.columnA], columnB: [...EMPTY.columnB],
    matchOptions: [...EMPTY.matchOptions], correctAnswers: [],
    matrixRows: [...EMPTY.matrixRows], matrixCols: [...EMPTY.matrixCols],
    subQuestions: [{ question: '', options: ['', '', '', ''], answer: 0 }],
  });

  const cls = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900';
  const pid = form.patternId;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">

        {msg && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            <span>{msg.type === 'success' ? '✅' : '❌'}</span>
            <span className="font-medium">{msg.text}</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">🧠 Create IIT Question</h1>
            <div className="flex gap-3">
              <button type="button" onClick={clearForm}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                <X className="w-4 h-4" /> Clear
              </button>
              <button type="submit" form="iit-form" disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </div>

          <form id="iit-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Row 1: Exam + Subject + Pattern + Timer */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam *</label>
                <select value={form.exam}
                  onChange={e => {
                    const exam = e.target.value as 'jee-main' | 'jee-advanced';
                    setForm(f => ({ ...f, exam, patternId: '' }));
                  }}
                  className={cls}>
                  <option value="jee-main">JEE Main</option>
                  <option value="jee-advanced">JEE Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <select value={form.subject} onChange={e => set('subject', e.target.value)} className={cls}>
                  <option>Physics</option>
                  <option>Chemistry</option>
                  <option>Mathematics</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pattern *</label>
                <select required value={form.patternId} onChange={e => set('patternId', e.target.value)} className={cls}>
                  <option value="">-- Select Pattern --</option>
                  <option value="single-correct">Single Correct</option>
                  <option value="multi-correct">Multi Correct</option>
                  <option value="integer-type">Integer Type</option>
                  <option value="assertion-reason">Assertion Reason</option>
                  <option value="match-column">Match Column</option>
                  <option value="paragraph">Paragraph / Comprehension</option>
                  <option value="matrix-match">Matrix Match</option>
                  <option value="true-false">True / False</option>
                  <option value="fill-blank">Fill in the Blank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timer (seconds) *</label>
                <input type="number" min={10} max={600} value={form.timer}
                  onChange={e => set('timer', parseInt(e.target.value))} className={cls} />
              </div>
            </div>

            {/* Row 2: Chapter + Topic + Subtopic */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                <input type="text" value={form.chapter} onChange={e => set('chapter', e.target.value)}
                  placeholder="e.g. Kinematics" className={cls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input type="text" value={form.topic} onChange={e => set('topic', e.target.value)}
                  placeholder="e.g. Projectile Motion" className={cls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtopic</label>
                <input type="text" value={form.subtopic} onChange={e => set('subtopic', e.target.value)}
                  placeholder="e.g. Range formula" className={cls} />
              </div>
            </div>

            {/* ── Single Correct ── */}
            {pid === 'single-correct' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                  <RichTextEditor value={form.question} onChange={v => set('question', v)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options — select correct with radio *</label>
                  {form.options.map((opt, i) => (
                    <div key={i} className="mb-4 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <input type="radio" name="answer" checked={form.answer === i} onChange={() => set('answer', i)} className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-semibold text-gray-700">{String.fromCharCode(65 + i)}.</span>
                        {form.answer === i && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Correct</span>}
                      </div>
                      <RichTextEditor id={`single-opt-${i}`} minHeight="100px" compact value={opt} onChange={v => setOption(i, v)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Multi Correct ── */}
            {pid === 'multi-correct' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                  <RichTextEditor value={form.question} onChange={v => set('question', v)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options — check all correct *</label>
                  {form.options.map((opt, i) => (
                    <div key={i} className="mb-4 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <input type="checkbox" checked={form.correctAnswers.includes(i)} onChange={() => toggleMulti(i)} className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-semibold text-gray-700">{String.fromCharCode(65 + i)}.</span>
                        {form.correctAnswers.includes(i) && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Correct</span>}
                      </div>
                      <RichTextEditor id={`multi-opt-${i}`} minHeight="100px" compact value={opt} onChange={v => setOption(i, v)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Integer Type ── */}
            {pid === 'integer-type' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                  <RichTextEditor value={form.question} onChange={v => set('question', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Integer Answer *</label>
                    <input type="number" required value={form.intAnswer} onChange={e => set('intAnswer', e.target.value)} className={cls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hint</label>
                    <input type="text" value={form.hint} onChange={e => set('hint', e.target.value)} placeholder="e.g. Use v = u − gt" className={cls} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Assertion Reason ── */}
            {pid === 'assertion-reason' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assertion (A) *</label>
                  <RichTextEditor value={form.assertion} onChange={v => set('assertion', v)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason (R) *</label>
                  <RichTextEditor value={form.reason} onChange={v => set('reason', v)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Correct Option *</label>
                  {form.arOptions.map((opt, i) => (
                    <label key={i} className="flex items-center gap-3 mb-2 cursor-pointer">
                      <input type="radio" name="arAnswer" checked={form.arAnswer === i} onChange={() => set('arAnswer', i)} className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm text-gray-700"><span className="font-semibold">{String.fromCharCode(65 + i)}.</span> {opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── Match Column ── */}
            {pid === 'match-column' && (
              <div className="space-y-6 border-t pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Column A *</label>
                    {form.columnA.map((val, i) => (
                      <div key={i} className="mb-3">
                        <span className="text-xs font-semibold text-gray-500 mb-1 block">A{i + 1}</span>
                        <RichTextEditor id={`colA-${i}`} minHeight="80px" compact value={val} onChange={v => setColA(i, v)} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Column B *</label>
                    {form.columnB.map((val, i) => (
                      <div key={i} className="mb-3">
                        <span className="text-xs font-semibold text-gray-500 mb-1 block">B{i + 1}</span>
                        <RichTextEditor id={`colB-${i}`} minHeight="80px" compact value={val} onChange={v => setColB(i, v)} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Match Options — mark correct with radio *</label>
                  {form.matchOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3 mb-2">
                      <input type="radio" name="matchAnswer" checked={form.matchAnswer === i} onChange={() => set('matchAnswer', i)} className="w-4 h-4 text-indigo-600 shrink-0" />
                      <input type="text" value={opt} onChange={e => setMatchOpt(i, e.target.value)} placeholder="e.g. A-2, B-3, C-1, D-4" className={cls} />
                      {form.matchAnswer === i && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">✓ Correct</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Paragraph / Comprehension ── */}
            {pid === 'paragraph' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passage *</label>
                  <RichTextEditor value={form.passage} onChange={v => set('passage', v)} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Sub-Questions *</label>
                    <button type="button" onClick={() => set('subQuestions', [...form.subQuestions, { question: '', options: ['', '', '', ''], answer: 0 }])}
                      className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200">+ Add Sub-Question</button>
                  </div>
                  {form.subQuestions.map((sq: { question: string; options: string[]; answer: number }, qi: number) => (
                    <div key={qi} className="border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-600">Q{qi + 1}</span>
                        {form.subQuestions.length > 1 && (
                          <button type="button" onClick={() => set('subQuestions', form.subQuestions.filter((_: unknown, j: number) => j !== qi))}
                            className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        )}
                      </div>
                      <RichTextEditor id={`para-q-${qi}`} minHeight="80px" compact value={sq.question}
                        onChange={v => { const sq2 = [...form.subQuestions]; sq2[qi] = { ...sq2[qi], question: v }; set('subQuestions', sq2); }} />
                      {sq.options.map((opt: string, oi: number) => (
                        <div key={oi} className="flex items-center gap-3">
                          <input type="radio" name={`sq-answer-${qi}`} checked={sq.answer === oi}
                            onChange={() => { const sq2 = [...form.subQuestions]; sq2[qi] = { ...sq2[qi], answer: oi }; set('subQuestions', sq2); }}
                            className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="text-sm font-semibold text-gray-600 shrink-0">{String.fromCharCode(65 + oi)}.</span>
                          <input type="text" value={opt} placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            onChange={e => { const sq2 = [...form.subQuestions]; const opts = [...sq2[qi].options]; opts[oi] = e.target.value; sq2[qi] = { ...sq2[qi], options: opts }; set('subQuestions', sq2); }}
                            className={cls} />
                          {sq.answer === oi && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">✓</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Matrix Match ── */}
            {pid === 'matrix-match' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question / Instruction *</label>
                  <RichTextEditor value={form.question} onChange={v => set('question', v)} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Column I (Rows) *</label>
                    {form.matrixRows.map((val: string, i: number) => (
                      <div key={i} className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 w-6 shrink-0">{String.fromCharCode(65 + i)}.</span>
                        <input type="text" value={val} placeholder={`Row ${String.fromCharCode(65 + i)}`}
                          onChange={e => { const r = [...form.matrixRows]; r[i] = e.target.value; set('matrixRows', r); }} className={cls} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Column II (Cols) *</label>
                    {form.matrixCols.map((val: string, i: number) => (
                      <div key={i} className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 w-6 shrink-0">{i + 1}.</span>
                        <input type="text" value={val} placeholder={`Col ${i + 1}`}
                          onChange={e => { const c = [...form.matrixCols]; c[i] = e.target.value; set('matrixCols', c); }} className={cls} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correct Mapping *</label>
                  <input type="text" value={form.matrixAnswer} onChange={e => set('matrixAnswer', e.target.value)}
                    placeholder="e.g. A-1,3  B-2  C-1,2,4  D-3" className={cls} />
                </div>
              </div>
            )}

            {/* ── True / False ── */}
            {pid === 'true-false' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statement *</label>
                  <RichTextEditor value={form.question} onChange={v => set('question', v)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer *</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tfAnswer" checked={form.tfAnswer === true} onChange={() => set('tfAnswer', true)} className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium text-green-700">True</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tfAnswer" checked={form.tfAnswer === false} onChange={() => set('tfAnswer', false)} className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium text-red-700">False</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ── Fill in the Blank ── */}
            {pid === 'fill-blank' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question (use ___ for blank) *</label>
                  <RichTextEditor value={form.question} onChange={v => set('question', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer *</label>
                    <input type="text" value={form.blankAnswer} onChange={e => set('blankAnswer', e.target.value)}
                      placeholder="e.g. 9.8 m/s²" className={cls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hint</label>
                    <input type="text" value={form.hint} onChange={e => set('hint', e.target.value)}
                      placeholder="e.g. Think about gravity" className={cls} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Explanation ── */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (shown after timer ends) *</label>
              <RichTextEditor value={form.explanation} onChange={v => set('explanation', v)} />
            </div>

            {/* ── Live Preview ── */}
            {(form.question || form.assertion || form.passage || form.explanation) && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📄 Full Preview</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
                  {form.passage && (
                    <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Passage</p>
                      <MathRenderer content={form.passage} />
                    </div>
                  )}
                  {form.question && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Question</p>
                      <MathRenderer content={form.question} />
                    </div>
                  )}
                  {form.assertion && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <span className="font-semibold text-blue-800 text-sm">Assertion (A): </span>
                      <MathRenderer content={form.assertion} />
                    </div>
                  )}
                  {form.reason && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <span className="font-semibold text-purple-800 text-sm">Reason (R): </span>
                      <MathRenderer content={form.reason} />
                    </div>
                  )}
                  {pid === 'true-false' && form.question && (
                    <div className="flex gap-4">
                      <span className={`px-4 py-2 rounded-lg border-2 text-sm font-medium ${form.tfAnswer === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>True</span>
                      <span className={`px-4 py-2 rounded-lg border-2 text-sm font-medium ${form.tfAnswer === false ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>False</span>
                    </div>
                  )}
                  {pid === 'fill-blank' && form.blankAnswer && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <span className="text-xs font-semibold text-blue-800">Answer: </span>
                      <span className="text-sm text-blue-900">{form.blankAnswer}</span>
                    </div>
                  )}
                  {form.options.some(o => o) && (pid === 'single-correct' || pid === 'multi-correct') && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase">Options</p>
                      {form.options.map((opt, i) => opt ? (
                        <div key={i} className={`px-3 py-2 rounded-lg border-2 text-sm ${
                          (pid === 'single-correct' && form.answer === i) || (pid === 'multi-correct' && form.correctAnswers.includes(i))
                            ? 'border-green-500 bg-green-50' : 'border-gray-200'
                        }`}>
                          <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                          <MathRenderer content={opt} />
                        </div>
                      ) : null)}
                    </div>
                  )}
                  {form.explanation && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-yellow-800 mb-1">📖 Explanation</p>
                      <MathRenderer content={form.explanation} />
                    </div>
                  )}
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}
