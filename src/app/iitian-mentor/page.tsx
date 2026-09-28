'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, ChevronDown, ChevronUp, CheckCircle, Clock, PlayCircle } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import MathRenderer from '@/components/MathRenderer';

type ExamKey = 'jee-main' | 'jee-advanced';
type QState = { started: boolean; timeLeft: number; done: boolean };

const PATTERN_META: Record<string, { label: string; icon: string }> = {
  'single-correct':   { label: 'Single Correct',    icon: '🎯' },
  'multi-correct':    { label: 'Multi-Correct',      icon: '✅' },
  'integer-type':     { label: 'Integer Type',       icon: '🔢' },
  'assertion-reason': { label: 'Assertion & Reason', icon: '🧠' },
  'match-column':     { label: 'Match the Column',   icon: '🔗' },
};

function patternLabel(pid: string) {
  return PATTERN_META[pid]?.label ?? pid.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function patternIcon(pid: string) {
  return PATTERN_META[pid]?.icon ?? '📝';
}

function pill(active: boolean, onClick: () => void, label: string) {
  return (
    <button key={label} onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
        active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'
      }`}>
      {label}
    </button>
  );
}

export default function IITianMentorPage() {
  const [examTab, setExamTab]             = useState<ExamKey>('jee-main');
  const [allQuestions, setAllQuestions]   = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [openIdx, setOpenIdx]             = useState<number | null>(null);
  const [qStates, setQStates]             = useState<Record<number, QState>>({});
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [activeTopic, setActiveTopic]     = useState<string | null>(null);
  const [activeSubtopic, setActiveSubtopic] = useState<string | null>(null);
  const [activePattern, setActivePattern] = useState<string | null>(null);
  const timerRefs = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    fetch('/api/iit-questions')
      .then(r => r.json())
      .then(data => { setAllQuestions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const examQuestions = allQuestions.filter(q => q.exam === examTab);

  // chapter-filtered base (for topic/subtopic/pattern counts)
  const chapterFiltered = activeChapter ? examQuestions.filter(q => q.chapter === activeChapter) : examQuestions;

  const chapters  = [...new Set(examQuestions.map(q => q.chapter).filter(Boolean))] as string[];
  const topics    = [...new Set(chapterFiltered.map(q => q.topic).filter(Boolean))] as string[];
  const subtopics = [...new Set(chapterFiltered.filter(q => !activeTopic || q.topic === activeTopic).map(q => q.subtopic).filter(Boolean))] as string[];
  const patterns  = [...new Set(chapterFiltered.map(q => q.patternId).filter(Boolean))] as string[];

const questions = chapterFiltered.filter(q =>
    (!activeTopic    || q.topic    === activeTopic) &&
    (!activeSubtopic || q.subtopic === activeSubtopic) &&
    (!activePattern  || q.patternId === activePattern)
  );

  const stopTimer = (i: number) => {
    clearInterval(timerRefs.current[i]);
    delete timerRefs.current[i];
  };

  const toggle = (i: number) => {
    if (openIdx === i) {
      stopTimer(i);
      setQStates(s => { const n = { ...s }; delete n[i]; return n; });
      setOpenIdx(null);
    } else {
      setOpenIdx(i);
    }
  };

  const startTimer = (i: number, duration: number) => {
    stopTimer(i);
    setQStates(s => ({ ...s, [i]: { started: true, timeLeft: duration, done: false } }));
    timerRefs.current[i] = setInterval(() => {
      setQStates(s => {
        const cur = s[i];
        if (!cur) return s;
        const next = cur.timeLeft - 1;
        if (next <= 0) { stopTimer(i); return { ...s, [i]: { ...cur, timeLeft: 0, done: true } }; }
        return { ...s, [i]: { ...cur, timeLeft: next } };
      });
    }, 1000);
  };

  const switchExam = (key: ExamKey) => {
    setExamTab(key); setOpenIdx(null); setActiveChapter(null);
    setActiveTopic(null); setActiveSubtopic(null); setActivePattern(null); setQStates({});
  };

  const switchChapter = (ch: string | null) => {
    setActiveChapter(ch); setActiveTopic(null); setActiveSubtopic(null); setActivePattern(null); setOpenIdx(null);
  };

  const Solution = ({ q, qs }: { q: any; qs: QState }) => {
    if (!qs.done) return null;
    return (
      <div className="space-y-4 mt-4">
        {q.patternId === 'integer-type' && (
          <div>
            {q.hint && <p className="text-sm text-gray-400 italic mb-2">💡 {q.hint}</p>}
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <CheckCircle className="w-5 h-5" /> Answer: {q.answer}
            </div>
          </div>
        )}
        {q.explanation && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-semibold text-yellow-800 mb-2">📖 Explanation</p>
            <MathRenderer content={q.explanation} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: 'IITian Mentor' }]} />

      <section className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-10 h-10" />
            <h1 className="text-4xl font-bold">IITian Mentor</h1>
          </div>
          <p className="text-indigo-200 text-lg">Press Start on any question — solve it before time runs out to see the answer.</p>
        </div>
      </section>

      {/* Exam Tabs */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl flex gap-1 pt-2">
          {(['jee-main', 'jee-advanced'] as ExamKey[]).map(key => (
            <button key={key} onClick={() => switchExam(key)}
              className={`px-6 py-3 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
                examTab === key
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {key === 'jee-main' ? 'JEE Main' : 'JEE Advanced'}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-7xl">

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
            <p className="text-gray-500">Loading questions...</p>
          </div>
        )}

        {!loading && examQuestions.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-md">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500 text-lg">No questions added yet.</p>
          </div>
        )}

        {!loading && examQuestions.length > 0 && (
          <div className="flex gap-6 items-start">

            {/* Chapter sidebar */}
            <aside className="w-72 shrink-0 sticky top-16">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Chapters</p>
                </div>
                <ul className="py-1">
                  <li>
                    <button onClick={() => switchChapter(null)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors ${
                        activeChapter === null ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}>
                      All
                      <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                        activeChapter === null ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{examQuestions.length}</span>
                    </button>
                  </li>
                  {chapters.map(ch => {
                    const count = examQuestions.filter(q => q.chapter === ch).length;
                    const active = activeChapter === ch;
                    return (
                      <li key={ch}>
                        <button onClick={() => switchChapter(ch)}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors ${
                            active ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                          }`}>
                          <span className="truncate">{ch}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                            active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>{count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            {/* Right: filters + questions */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Filter pills */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3 flex flex-wrap gap-2">
                {pill(!activeTopic && !activeSubtopic && !activePattern, () => { setActiveTopic(null); setActiveSubtopic(null); setActivePattern(null); setOpenIdx(null); }, 'All')}
                {topics.map(t => pill(activeTopic === t, () => { setActiveTopic(t); setActiveSubtopic(null); setOpenIdx(null); }, t))}
                {subtopics.map(s => pill(activeSubtopic === s, () => { setActiveSubtopic(s); setOpenIdx(null); }, s))}
                {patterns.map(p => pill(activePattern === p, () => { setActivePattern(p); setOpenIdx(null); }, p))}
              </div>

              {/* Questions */}
              {questions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                  <p className="text-gray-400">No questions match the selected filters.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, i) => {
                    const open = openIdx === i;
                    const qs   = qStates[i];
                    const duration = q.timer || 120;
                    const timeLeft = qs?.timeLeft ?? duration;
                    const pct      = (timeLeft / duration) * 100;
                    const barColor = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-500' : 'bg-red-500';

                    return (
                      <div key={q.id ?? i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

                        <button onClick={() => toggle(i)}
                          className="w-full text-left px-6 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                          <span className="text-xl shrink-0 mt-0.5">{patternIcon(q.patternId)}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide block mb-1">
                              Q{i + 1} · {patternLabel(q.patternId)}{q.chapter ? ` · ${q.chapter}` : ''}{q.topic ? ` · ${q.topic}` : ''}
                            </span>
                            <div className="text-gray-800 text-sm font-medium">
                              {q.patternId === 'assertion-reason' ? (
                                <span>Assertion: <MathRenderer content={q.assertion} /></span>
                              ) : q.patternId === 'match-column' ? (
                                <span>Match the column — {q.columnA?.length} items</span>
                              ) : (
                                <MathRenderer content={q.question} />
                              )}
                            </div>
                          </div>
                          {open ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0 mt-1" />}
                        </button>

                        {open && (
                          <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">

                            {q.patternId === 'assertion-reason' && (
                              <div className="space-y-3">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <p className="font-semibold text-blue-800 mb-1">Assertion (A):</p>
                                  <MathRenderer content={q.assertion} />
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                  <p className="font-semibold text-purple-800 mb-1">Reason (R):</p>
                                  <MathRenderer content={q.reason} />
                                </div>
                              </div>
                            )}

                            {q.patternId === 'match-column' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <p className="font-semibold text-gray-700 mb-3">Column A</p>
                                  {q.columnA.map((item: string, ci: number) => (
                                    <div key={ci} className="flex gap-2 py-1 text-sm">
                                      <span className="font-bold shrink-0">{String.fromCharCode(65 + ci)}.</span>
                                      <MathRenderer content={item} />
                                    </div>
                                  ))}
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <p className="font-semibold text-gray-700 mb-3">Column B</p>
                                  {q.columnB.map((item: string, ci: number) => (
                                    <div key={ci} className="flex gap-2 py-1 text-sm">
                                      <span className="font-bold shrink-0">{ci + 1}.</span>
                                      <MathRenderer content={item} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {['single-correct', 'multi-correct', 'assertion-reason', 'match-column'].includes(q.patternId) && q.options?.length > 0 && (
                              <div className="space-y-2">
                                {q.options.map((opt: string, oi: number) => {
                                  const isCorrect = qs?.done && (q.patternId === 'multi-correct' ? q.correctAnswers?.includes(oi) : oi === q.answer);
                                  return (
                                    <div key={oi}
                                      className={`flex items-start gap-3 px-4 py-3 rounded-lg border-2 text-sm transition-colors ${
                                        isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-100 text-gray-600'
                                      }`}>
                                      <span className="font-bold shrink-0">{String.fromCharCode(65 + oi)}.</span>
                                      <div className="flex-1"><MathRenderer content={opt} /></div>
                                      {isCorrect && <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {!qs?.started && (
                              <button onClick={() => startTimer(i, duration)}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors">
                                <PlayCircle className="w-5 h-5" /> Start Timer ({duration}s)
                              </button>
                            )}

                            {qs?.started && (
                              <div>
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Time left</span>
                                  <span className={`font-bold tabular-nums ${qs.done ? 'text-gray-400' : timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
                                    {qs.done ? 'Time up!' : `${timeLeft}s`}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div className={`h-2 rounded-full transition-all duration-1000 ${qs.done ? 'bg-gray-400' : barColor}`}
                                    style={{ width: qs.done ? '0%' : `${pct}%` }} />
                                </div>
                              </div>
                            )}

                            {qs && <Solution q={q} qs={qs} />}

                            {q.patternId === 'integer-type' && q.hint && qs?.started && !qs?.done && (
                              <p className="text-sm text-gray-400 italic">💡 {q.hint}</p>
                            )}

                            {qs?.done && (
                              <button onClick={() => startTimer(i, duration)}
                                className="flex items-center gap-2 px-5 py-2.5 border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-lg transition-colors text-sm">
                                <PlayCircle className="w-4 h-4" /> Try Again
                              </button>
                            )}

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
