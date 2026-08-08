'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import Link from 'next/link';

function EditIITQuestionForm() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');

  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch('/api/iit-questions')
      .then(r => r.json())
      .then((data: any[]) => {
        const q = data.find(q => q.id === id);
        if (q) {
          // normalise fields so form inputs don't get undefined
          setForm({
            ...q,
            options:      q.options      ?? ['', '', '', ''],
            correctAnswers: q.correctAnswers ?? [],
            arOptions:    q.arOptions    ?? ['Both A and R are true, and R is the correct explanation of A.', 'Both A and R are true, but R is NOT the correct explanation of A.', 'A is true but R is false.', 'A is false but R is true.'],
            columnA:      q.columnA      ?? ['', '', '', ''],
            columnB:      q.columnB      ?? ['', '', '', ''],
            matchOptions: q.matchOptions ?? ['', '', '', ''],
            intAnswer:    q.patternId === 'integer-type' ? String(q.answer ?? '') : '',
          });
        }
      });
  }, [id]);

  const set = (key: string, val: unknown) => setForm((f: any) => ({ ...f, [key]: val }));

  const buildPayload = () => {
    const base = {
      id,
      exam: form.exam, patternId: form.patternId, subject: form.subject,
      chapter: form.chapter, topic: form.topic, subtopic: form.subtopic,
      timer: form.timer, explanation: form.explanation,
    };
    if (form.patternId === 'single-correct')   return { ...base, question: form.question, options: form.options, answer: form.answer };
    if (form.patternId === 'multi-correct')    return { ...base, question: form.question, options: form.options, correctAnswers: form.correctAnswers };
    if (form.patternId === 'integer-type')     return { ...base, question: form.question, answer: parseInt(form.intAnswer), hint: form.hint };
    if (form.patternId === 'assertion-reason') return { ...base, assertion: form.assertion, reason: form.reason, options: form.arOptions, answer: form.arAnswer };
    if (form.patternId === 'match-column')     return { ...base, columnA: form.columnA, columnB: form.columnB, options: form.matchOptions, answer: form.matchAnswer };
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/iit-questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (res.ok) {
        setMsg({ type: 'success', text: 'Question updated! Redirecting...' });
        setTimeout(() => router.push('/admin'), 1500);
      } else {
        setMsg({ type: 'error', text: 'Failed to update' });
        setSaving(false);
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error.' });
      setSaving(false);
    }
  };

  const cls = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900';

  if (!form) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );

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
            <div className="flex items-center gap-3">
              <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">✏️ Edit IIT Question</h1>
            </div>
            <button type="submit" form="edit-iit-form" disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <form id="edit-iit-form" onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam *</label>
                <select value={form.exam} onChange={e => set('exam', e.target.value)} className={cls}>
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
                <input type="text" required value={form.patternId} onChange={e => set('patternId', e.target.value)}
                  placeholder="e.g. single-correct, integer-type" className={cls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timer (seconds) *</label>
                <input type="number" min={10} max={600} value={form.timer}
                  onChange={e => set('timer', parseInt(e.target.value))} className={cls} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                <input type="text" value={form.chapter ?? ''} onChange={e => set('chapter', e.target.value)} className={cls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input type="text" value={form.topic ?? ''} onChange={e => set('topic', e.target.value)} className={cls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtopic</label>
                <input type="text" value={form.subtopic ?? ''} onChange={e => set('subtopic', e.target.value)} className={cls} />
              </div>
            </div>

            {pid === 'single-correct' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                  <RichTextEditor value={form.question ?? ''} onChange={v => set('question', v)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                  {form.options.map((opt: string, i: number) => (
                    <div key={i} className="mb-4 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <input type="radio" name="answer" checked={form.answer === i} onChange={() => set('answer', i)} className="w-4 h-4 text-indigo-600" />
                        <span className="font-semibold text-gray-700">{String.fromCharCode(65 + i)}.</span>
                        {form.answer === i && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Correct</span>}
                      </div>
                      <RichTextEditor id={`edit-single-opt-${i}`} minHeight="100px" compact value={opt} onChange={v => { const o = [...form.options]; o[i] = v; set('options', o); }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pid === 'multi-correct' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                  <RichTextEditor value={form.question ?? ''} onChange={v => set('question', v)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                  {form.options.map((opt: string, i: number) => (
                    <div key={i} className="mb-4 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <input type="checkbox" checked={form.correctAnswers.includes(i)}
                          onChange={() => { const ca = form.correctAnswers.includes(i) ? form.correctAnswers.filter((x: number) => x !== i) : [...form.correctAnswers, i]; set('correctAnswers', ca); }}
                          className="w-4 h-4 text-indigo-600" />
                        <span className="font-semibold text-gray-700">{String.fromCharCode(65 + i)}.</span>
                        {form.correctAnswers.includes(i) && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Correct</span>}
                      </div>
                      <RichTextEditor id={`edit-multi-opt-${i}`} minHeight="100px" compact value={opt} onChange={v => { const o = [...form.options]; o[i] = v; set('options', o); }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pid === 'integer-type' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                  <RichTextEditor value={form.question ?? ''} onChange={v => set('question', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Integer Answer *</label>
                    <input type="number" value={form.intAnswer} onChange={e => set('intAnswer', e.target.value)} className={cls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hint</label>
                    <input type="text" value={form.hint ?? ''} onChange={e => set('hint', e.target.value)} className={cls} />
                  </div>
                </div>
              </div>
            )}

            {pid === 'assertion-reason' && (
              <div className="space-y-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assertion (A) *</label>
                  <RichTextEditor value={form.assertion ?? ''} onChange={v => set('assertion', v)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason (R) *</label>
                  <RichTextEditor value={form.reason ?? ''} onChange={v => set('reason', v)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Correct Option *</label>
                  {form.arOptions.map((opt: string, i: number) => (
                    <label key={i} className="flex items-center gap-3 mb-2 cursor-pointer">
                      <input type="radio" name="arAnswer" checked={form.arAnswer === i} onChange={() => set('arAnswer', i)} className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm text-gray-700"><span className="font-semibold">{String.fromCharCode(65 + i)}.</span> {opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {pid === 'match-column' && (
              <div className="space-y-6 border-t pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Column A *</label>
                    {form.columnA.map((val: string, i: number) => (
                      <div key={i} className="mb-3">
                        <span className="text-xs font-semibold text-gray-500 mb-1 block">A{i + 1}</span>
                        <RichTextEditor id={`edit-colA-${i}`} minHeight="80px" compact value={val} onChange={v => { const a = [...form.columnA]; a[i] = v; set('columnA', a); }} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Column B *</label>
                    {form.columnB.map((val: string, i: number) => (
                      <div key={i} className="mb-3">
                        <span className="text-xs font-semibold text-gray-500 mb-1 block">B{i + 1}</span>
                        <RichTextEditor id={`edit-colB-${i}`} minHeight="80px" compact value={val} onChange={v => { const b = [...form.columnB]; b[i] = v; set('columnB', b); }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Match Options</label>
                  {form.matchOptions.map((opt: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 mb-2">
                      <input type="radio" name="matchAnswer" checked={form.matchAnswer === i} onChange={() => set('matchAnswer', i)} className="w-4 h-4 text-indigo-600 shrink-0" />
                      <input type="text" value={opt} onChange={e => { const o = [...form.matchOptions]; o[i] = e.target.value; set('matchOptions', o); }} className={cls} />
                      {form.matchAnswer === i && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">✓ Correct</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
              <RichTextEditor value={form.explanation ?? ''} onChange={v => set('explanation', v)} />
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditIITQuestionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    }>
      <EditIITQuestionForm />
    </Suspense>
  );
}
