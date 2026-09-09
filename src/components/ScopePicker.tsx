'use client';

// src/components/ScopePicker.tsx
//
// Modal / popup that lets a user pick the scope for a plan before checkout.
//
// CHAPTER plan    → user picks: Class → Subject → Chapter
// SUBJECT plan    → user picks: Class → Subject
// CONFIGURABLE    → user picks: Class → up to 2 Subjects
// COMPLETE plan   → user picks: Class (one step — all subjects/chapters in that class)
//
// On confirm, calls onConfirm({ chapterId?, chapterName?, subjectId?, subjectName?, subjectIds?, classId?, className? })
// The parent (PaymentButton) then calls /api/orders/create with those IDs.

import { useState, useEffect } from 'react';
import { X, ChevronRight, BookOpen, GraduationCap, Loader2, Check } from 'lucide-react';
import type { PlanScopeType } from '@/types/lms';

// ─────────────────────────────────────────────────────────────────────────────
// Types from the hierarchy API
// ─────────────────────────────────────────────────────────────────────────────

interface HierarchyChapter {
  id:     string;
  name:   string;
  isFree: boolean;
}

interface HierarchySubject {
  id:       string;
  name:     string;
  chapters: HierarchyChapter[];
}

interface HierarchyClass {
  id:       string;
  name:     string;
  subjects: HierarchySubject[];
}

export interface ScopeSelection {
  chapterId?:   string;
  chapterName?: string;
  subjectId?:   string;
  subjectName?: string;
  /** For COMPLETE plans — the class the user chose (Class 11, Class 12, etc.) */
  classId?:     string;
  className?:   string;
  /** For CONFIGURABLE (combo) plans — up to 2 subject IDs */
  subjectIds?:  string[];
  /** For CHAPTER_COMBO plans — multiple chapter IDs from one subject */
  chapterIds?:  string[];
}

interface ScopePickerProps {
  isOpen:    boolean;
  onClose:   () => void;
  scopeType: PlanScopeType;
  planName:  string;
  /** Max subjects for CONFIGURABLE plan (default 2) */
  maxSubjects?: number;
  /** Max chapters for CHAPTER_COMBO plan (default 5) */
  maxChapters?: number;
  onConfirm: (selection: ScopeSelection) => void;
  /**
   * When true the component renders as a plain card (no fixed backdrop overlay).
   * Use this when ScopePicker fills a dedicated popup window rather than
   * overlaying the current page.
   */
  inline?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ScopePicker({
  isOpen,
  onClose,
  scopeType,
  planName,
  maxSubjects = 2,
  maxChapters = 5,
  onConfirm,
  inline = false,
}: ScopePickerProps) {
  const [classes,          setClasses]          = useState<HierarchyClass[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [selectedClass,    setSelectedClass]    = useState<HierarchyClass | null>(null);
  const [selectedSubject,  setSelectedSubject]  = useState<HierarchySubject | null>(null);
  const [selectedChapter,  setSelectedChapter]  = useState<HierarchyChapter | null>(null);
  // For CONFIGURABLE — multi-select subjects
  const [selectedSubjects, setSelectedSubjects] = useState<HierarchySubject[]>([]);
  // For CHAPTER_COMBO — multi-select chapters within one subject
  const [selectedChapters, setSelectedChapters] = useState<HierarchyChapter[]>([]);

  // Fetch hierarchy once when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/lms/hierarchy')
      .then((r) => r.json())
      .then((data: HierarchyClass[]) => {
        setClasses(data);
        // Auto-select if only one class
        if (data.length === 1) setSelectedClass(data[0]);
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Reset selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedClass(null);
      setSelectedSubject(null);
      setSelectedChapter(null);
      setSelectedSubjects([]);
      setSelectedChapters([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Hoist this flag so TypeScript doesn't narrow `selectedSubject` to `never`
  // inside the SUBJECT branch of the ternary chain.  When the CHAPTER branch
  // (`scopeType === 'CHAPTER' && !selectedSubject`) is false, TS would otherwise
  // infer that selectedSubject is non-null in the else, making the repeated
  // `!selectedSubject` check in the SUBJECT branch resolve to `never`.
  const subjectNotPicked = selectedSubject === null;

  // ── Step labels ────────────────────────────────────────────────────────────
  const steps =
    scopeType === 'CHAPTER'       ? ['Class', 'Subject', 'Chapter'] :
    scopeType === 'CONFIGURABLE'  ? ['Class', 'Subjects (pick any 2)'] :
    scopeType === 'CHAPTER_COMBO' ? ['Class', 'Subject', `Chapters (pick any ${maxChapters})`] :
    scopeType === 'COMPLETE'      ? ['Choose your class'] :
    /* SUBJECT */                   ['Class', 'Subject'];

  const currentStep =
    scopeType === 'CHAPTER' || scopeType === 'CHAPTER_COMBO'
      ? !selectedClass ? 0 : !selectedSubject ? 1 : 2
      : !selectedClass ? 0 : 1;

  // ── Confirm button state ───────────────────────────────────────────────────
  const canConfirm =
    scopeType === 'CHAPTER'       ? !!selectedChapter :
    scopeType === 'CONFIGURABLE'  ? selectedSubjects.length === maxSubjects :
    scopeType === 'CHAPTER_COMBO' ? selectedChapters.length === maxChapters :
    scopeType === 'COMPLETE'      ? !!selectedClass :
    /* SUBJECT */                   !!selectedSubject;

  function handleConfirm() {
    if (scopeType === 'CHAPTER' && selectedChapter && selectedSubject) {
      onConfirm({
        chapterId:   selectedChapter.id,
        chapterName: selectedChapter.name,
        subjectId:   selectedSubject.id,
        subjectName: selectedSubject.name,
      });
    } else if (scopeType === 'SUBJECT' && selectedSubject) {
      onConfirm({
        subjectId:   selectedSubject.id,
        subjectName: selectedSubject.name,
      });
    } else if (scopeType === 'CONFIGURABLE') {
      onConfirm({
        subjectIds:  selectedSubjects.map((s) => s.id),
        subjectName: selectedSubjects.map((s) => s.name).join(' + '),
      });
    } else if (scopeType === 'CHAPTER_COMBO' && selectedSubject) {
      onConfirm({
        subjectId:   selectedSubject.id,
        subjectName: selectedSubject.name,
        chapterIds:  selectedChapters.map((c) => c.id),
      });
    } else if (scopeType === 'COMPLETE' && selectedClass) {
      onConfirm({
        classId:   selectedClass.id,
        className: selectedClass.name,
      });
    }
  }

  function toggleComboSubject(subject: HierarchySubject) {
    setSelectedSubjects((prev) => {
      const already = prev.find((s) => s.id === subject.id);
      if (already) return prev.filter((s) => s.id !== subject.id);
      if (prev.length >= maxSubjects) return prev; // cap reached
      return [...prev, subject];
    });
  }

  function toggleComboChapter(chapter: HierarchyChapter) {
    setSelectedChapters((prev) => {
      const already = prev.find((c) => c.id === chapter.id);
      if (already) return prev.filter((c) => c.id !== chapter.id);
      if (prev.length >= maxChapters) return prev; // cap reached
      return [...prev, chapter];
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Card content — shared between overlay and inline (popup window) modes
  // ─────────────────────────────────────────────────────────────────────────────

  const cardContent = (
    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
        <div>
          <h2 id="scope-picker-title" className="text-lg font-bold text-slate-900">
            {scopeType === 'CHAPTER'       ? 'Choose a chapter'  :
             scopeType === 'CONFIGURABLE'  ? 'Choose 2 subjects' :
             scopeType === 'CHAPTER_COMBO' ? `Choose ${maxChapters} chapters` :
             scopeType === 'COMPLETE'      ? 'Choose your class' :
             'Choose a subject'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{planName}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-100 flex-shrink-0">
        {steps.map((stepLabel, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
              i === currentStep
                ? 'bg-indigo-600 text-white'
                : i < currentStep
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {i < currentStep && <Check className="h-3 w-3" />}
              {stepLabel}
            </div>
            {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : classes.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No content available yet.</p>
        ) : (

          // ── COMPLETE plan: single step — pick a class ─────────────────────
          scopeType === 'COMPLETE' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Select the class you want full access to. You&apos;ll get all subjects and
                chapters within that class for 12 months.
              </p>
              {classes.map((cls) => {
                const isSelected = selectedClass?.id === cls.id;
                const subjectCount = cls.subjects.length;
                const chapterCount = cls.subjects.reduce(
                  (acc, s) => acc + s.chapters.length, 0,
                );
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`w-full flex items-center justify-between rounded-xl border-2 px-5 py-4 text-left transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-rose-500' : 'bg-rose-100'
                      }`}>
                        <GraduationCap className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-rose-600'}`} />
                      </div>
                      <div>
                        <p className={`font-bold text-base ${isSelected ? 'text-rose-700' : 'text-slate-900'}`}>
                          {cls.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {subjectCount} subject{subjectCount !== 1 ? 's' : ''} · {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'border-rose-500 bg-rose-500' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

          // ── Step 0: pick class (all other plan types) ─────────────────────
          ) : !selectedClass ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600 mb-3">Select a class</p>
              {classes.map((cls) => (
                <button key={cls.id} type="button"
                  onClick={() => { setSelectedClass(cls); setSelectedSubject(null); setSelectedChapter(null); setSelectedSubjects([]); }}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="font-semibold text-slate-900">{cls.name}</span>
                  </div>
                  <span className="text-xs text-slate-400">{cls.subjects.length} subject{cls.subjects.length !== 1 ? 's' : ''}</span>
                </button>
              ))}
            </div>

          // ── Step 1: pick subject (CHAPTER plan) ───────────────────────────
          ) : scopeType === 'CHAPTER' && subjectNotPicked ? (            <div className="space-y-2">
              <button type="button" onClick={() => setSelectedClass(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-1">
                ← {selectedClass.name}
              </button>
              <p className="text-sm font-semibold text-slate-600 mb-3">Select a subject</p>
              {selectedClass.subjects.map((sub) => (
                <button key={sub.id} type="button"
                  onClick={() => { setSelectedSubject(sub); setSelectedChapter(null); }}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="font-semibold text-slate-900">{sub.name}</span>
                  </div>
                  <span className="text-xs text-slate-400">{sub.chapters.length} chapter{sub.chapters.length !== 1 ? 's' : ''}</span>
                </button>
              ))}
            </div>

          // ── Step 1: pick subject (SUBJECT plan) ───────────────────────────
          ) : scopeType === 'SUBJECT' && subjectNotPicked ? (
            <div className="space-y-2">
              <button type="button" onClick={() => setSelectedClass(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-1">
                ← {selectedClass.name}
              </button>
              <p className="text-sm font-semibold text-slate-600 mb-3">Select a subject</p>
              {selectedClass.subjects.map((sub) => {
                // selectedSubject is null in this branch (subjectNotPicked === true)
                // so isChosen is always false here; kept for symmetry if state changes
                const isChosen = false;
                return (
                  <button key={sub.id} type="button"
                    onClick={() => setSelectedSubject(sub)}
                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                      isChosen
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{sub.name}</p>
                        <p className="text-xs text-slate-400">{sub.chapters.length} chapter{sub.chapters.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {isChosen && <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

          // ── Step 1: multi-select subjects (CONFIGURABLE plan) ─────────────
          ) : scopeType === 'CONFIGURABLE' && selectedClass ? (
            <div className="space-y-2">
              <button type="button" onClick={() => setSelectedClass(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-1">
                ← {selectedClass.name}
              </button>
              <p className="text-sm font-semibold text-slate-600 mb-1">
                Select any {maxSubjects} subjects
                <span className="ml-2 font-normal text-slate-400">({selectedSubjects.length}/{maxSubjects} selected)</span>
              </p>
              {selectedClass.subjects.map((sub) => {
                const isSelected = selectedSubjects.some((s) => s.id === sub.id);
                const isDisabled = !isSelected && selectedSubjects.length >= maxSubjects;
                return (
                  <button key={sub.id} type="button"
                    onClick={() => !isDisabled && toggleComboSubject(sub)}
                    disabled={isDisabled}
                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50'
                        : isDisabled
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-indigo-100' : 'bg-amber-100'}`}>
                        <BookOpen className={`h-4 w-4 ${isSelected ? 'text-indigo-600' : 'text-amber-600'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{sub.name}</p>
                        <p className="text-xs text-slate-400">{sub.chapters.length} chapter{sub.chapters.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

          // ── Step 2: pick chapter (CHAPTER plan) ───────────────────────────
          ) : scopeType === 'CHAPTER' && selectedSubject ? (            <div className="space-y-2">
              <button type="button" onClick={() => setSelectedSubject(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-1">
                ← {selectedSubject.name}
              </button>
              <p className="text-sm font-semibold text-slate-600 mb-3">Select a chapter</p>
              {selectedSubject.chapters.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No chapters available in this subject yet.</p>
              ) : (
                selectedSubject.chapters.map((ch) => (
                  <button key={ch.id} type="button"
                    onClick={() => setSelectedChapter(ch)}
                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                      selectedChapter?.id === ch.id
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                    }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{ch.name}</p>
                        {ch.isFree && <p className="text-xs text-emerald-600 font-semibold">Free preview available</p>}
                      </div>
                    </div>
                    {selectedChapter?.id === ch.id && <Check className="h-4 w-4 text-indigo-600 flex-shrink-0 ml-2" />}
                  </button>
                ))
              )}
            </div>
          // ── Step 2: multi-select chapters (CHAPTER_COMBO plan) ───────────
          ) : scopeType === 'CHAPTER_COMBO' && selectedSubject ? (
            <div className="space-y-2">
              <button type="button" onClick={() => { setSelectedSubject(null); setSelectedChapters([]); }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-1">
                ← {selectedSubject.name}
              </button>
              <p className="text-sm font-semibold text-slate-600 mb-1">
                Select any {maxChapters} chapters
                <span className="ml-2 font-normal text-slate-400">({selectedChapters.length}/{maxChapters} selected)</span>
              </p>
              {selectedSubject.chapters.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No chapters available yet.</p>
              ) : (
                selectedSubject.chapters.map((ch) => {
                  const isSelected = selectedChapters.some((c) => c.id === ch.id);
                  const isDisabled = !isSelected && selectedChapters.length >= maxChapters;
                  return (
                    <button key={ch.id} type="button"
                      onClick={() => !isDisabled && toggleComboChapter(ch)}
                      disabled={isDisabled}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-50'
                          : isDisabled
                          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                      }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
                          <BookOpen className={`h-4 w-4 ${isSelected ? 'text-indigo-600' : 'text-emerald-600'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{ch.name}</p>
                          {ch.isFree && <p className="text-xs text-emerald-600 font-semibold">Free preview available</p>}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

          // ── Step 1: pick subject (CHAPTER_COMBO plan) ─────────────────────
          ) : scopeType === 'CHAPTER_COMBO' && !selectedSubject && selectedClass ? (
            <div className="space-y-2">
              <button type="button" onClick={() => setSelectedClass(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-1">
                ← {selectedClass.name}
              </button>
              <p className="text-sm font-semibold text-slate-600 mb-3">Select a subject</p>
              {selectedClass.subjects.map((sub) => (
                <button key={sub.id} type="button"
                  onClick={() => { setSelectedSubject(sub); setSelectedChapters([]); }}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{sub.name}</p>
                      <p className="text-xs text-slate-400">{sub.chapters.length} chapter{sub.chapters.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>

          ) : null
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 flex-shrink-0">
        {/* Selection summary */}
        <div className="text-xs text-slate-500 min-w-0 mr-4">
          {scopeType === 'CHAPTER' && selectedChapter && (
            <span className="font-semibold text-slate-700 truncate block">{selectedChapter.name}</span>
          )}
          {scopeType === 'SUBJECT' && selectedSubject && (
            <span className="font-semibold text-slate-700">{selectedSubject.name}</span>
          )}
          {scopeType === 'CONFIGURABLE' && selectedSubjects.length > 0 && (
            <span className="font-semibold text-slate-700">{selectedSubjects.map((s) => s.name).join(' + ')}</span>
          )}
          {scopeType === 'CHAPTER_COMBO' && selectedChapters.length > 0 && (
            <span className="font-semibold text-slate-700 truncate block">
              {selectedChapters.length} chapter{selectedChapters.length !== 1 ? 's' : ''} selected
              {selectedSubject ? ` from ${selectedSubject.name}` : ''}
            </span>
          )}
          {scopeType === 'COMPLETE' && selectedClass && (
            <span className="font-semibold text-slate-700">{selectedClass.name} — all subjects &amp; chapters</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-sm text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          Continue to payment
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  // ── Inline mode: card fills the popup window directly (no backdrop) ────────
  if (inline) {
    return cardContent;
  }

  // ── Modal mode: card floats over a dimmed backdrop on the current page ─────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scope-picker-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {cardContent}
    </div>
  );
}
