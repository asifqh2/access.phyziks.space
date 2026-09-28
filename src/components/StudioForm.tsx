'use client';

// src/components/StudioForm.tsx
//
// Instructor Studio — full content editor.
// Hierarchy: Class → Subject → Chapter → Topic → Subtopic
//
// Per-chapter the admin can:
//   • Edit name, description, isFree, isActive, youtubeUrl
//   • Upload a protected MP4 (stored in R2, served via signed URL)
//   • Add / edit / delete Topics
//   • Add / edit / delete Subtopics within each Topic
//
// Per-topic / subtopic the admin can:
//   • Edit title, description, youtubeVideoId, duration, sortOrder, isFree, isActive
//
// API surface:
//   GET   /api/studio/chapters/:id          → chapter + topics + subtopics
//   PATCH /api/studio/chapters/:id          → save chapter fields
//   POST  /api/admin/lms?resource=topics    → create topic
//   PATCH /api/studio/topics/:id            → save topic fields
//   DELETE/api/admin/lms?resource=topics&id → delete topic (+ its subtopics)
//   POST  /api/admin/lms?resource=subtopics → create subtopic
//   PATCH /api/studio/subtopics/:id         → save subtopic fields
//   DELETE/api/admin/lms?resource=subtopics&id → delete subtopic

import { useState, useTransition, useCallback, useRef, type FormEvent, type DragEvent } from 'react';
import {
  ChevronDown, ChevronRight, Save, Upload,
  CheckCircle2, AlertCircle, Loader2, Youtube,
  Lock, Unlock, Eye, EyeOff, Video,
  Plus, Trash2, GripVertical, ListVideo, FileText,
  ClipboardList, X, ChevronUp,
} from 'lucide-react';
import AdvancedHTMLEditor from '@/components/AdvancedHTMLEditor';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StudioWorksheet {
  id:        string;
  title:     string;
  content:   string;
  sortOrder: number;
  isActive:  boolean;
}

export interface StudioSubtopic {
  id:             string;
  title:          string;
  slug:           string;
  description:    string | null;
  youtubeVideoId: string | null;
  duration:       number | null;
  sortOrder:      number;
  isActive:       boolean;
  isFree:         boolean;
  worksheets:     StudioWorksheet[];
}

export interface StudioTopic {
  id:             string;
  title:          string;
  slug:           string;
  description:    string | null;
  youtubeVideoId: string | null;
  duration:       number | null;
  sortOrder:      number;
  isActive:       boolean;
  isFree:         boolean;
  subtopics:      StudioSubtopic[];
  worksheets:     StudioWorksheet[];
}

export interface StudioChapter {
  id:                string;
  name:              string;
  slug:              string;
  sortOrder:         number;
  isFree:            boolean;
  isActive:          boolean;
  hasVideo:          boolean;
  youtubeUrl:        string | null;
  description:       string | null;
  testPanelEnabled:  boolean;
  topics:            StudioTopic[];
  worksheets:        StudioWorksheet[];
}

export interface StudioSubject {
  id:       string;
  name:     string;
  chapters: StudioChapter[];
}

export interface StudioClass {
  id:       string;
  name:     string;
  subjects: StudioSubject[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function parseDuration(val: string): number | null {
  if (!val.trim()) return null;
  if (val.includes(':')) {
    const [m, s] = val.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// useDragReorder — shared drag-and-drop logic for topics and subtopics
//
// Usage:
//   const drag = useDragReorder({ items, setItems, resource });
//   <div {...drag.containerProps}>
//     {items.map((item, i) => (
//       <div key={item.id} {...drag.itemProps(item.id, i)}>
//         <span {...drag.handleProps(item.id)} />  ← grip handle
//       </div>
//     ))}
//   </div>
// ─────────────────────────────────────────────────────────────────────────────

function useDragReorder<T extends { id: string }>({
  items,
  setItems,
  resource,
}: {
  items:    T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  resource: 'topics' | 'subtopics';
}) {
  const dragId    = useRef<string | null>(null);   // id being dragged
  const overId    = useRef<string | null>(null);   // id currently hovered
  const [saving, setSaving] = useState(false);
  const [reorderMsg, setReorderMsg] = useState<string | null>(null);

  function reorder(srcId: string, dstId: string): T[] {
    if (srcId === dstId) return items;
    const next = [...items];
    const from = next.findIndex((x) => x.id === srcId);
    const to   = next.findIndex((x) => x.id === dstId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  async function persist(ordered: T[]) {
    setSaving(true);
    setReorderMsg(null);
    try {
      const res = await fetch('/api/studio/reorder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resource, ids: ordered.map((x) => x.id) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setReorderMsg((d as { error?: string }).error ?? 'Reorder failed.');
      }
    } catch {
      setReorderMsg('Network error — reorder not saved.');
    } finally {
      setSaving(false);
    }
  }

  // Props spread onto the container <div>
  const containerProps = {
    onDragOver: (e: DragEvent<HTMLElement>) => e.preventDefault(),
  };

  // Props spread onto each draggable item wrapper
  function itemProps(id: string, _index: number) {
    return {
      draggable: true as const,
      onDragStart: (e: DragEvent<HTMLElement>) => {
        dragId.current = id;
        e.dataTransfer.effectAllowed = 'move';
        // Give the browser one frame to paint the drag ghost before we style it
        (e.currentTarget as HTMLElement).style.opacity = '0.5';
      },
      onDragEnd: (e: DragEvent<HTMLElement>) => {
        (e.currentTarget as HTMLElement).style.opacity = '';
        dragId.current = null;
        overId.current = null;
      },
      onDragEnter: (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        overId.current = id;
        (e.currentTarget as HTMLElement).style.borderTop =
          dragId.current !== id ? '2px solid #6366f1' : '';
      },
      onDragLeave: (e: DragEvent<HTMLElement>) => {
        (e.currentTarget as HTMLElement).style.borderTop = '';
      },
      onDrop: async (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).style.borderTop = '';
        const src = dragId.current;
        const dst = overId.current ?? id;
        dragId.current = null;
        overId.current = null;
        if (!src || src === dst) return;
        const ordered = reorder(src, dst);
        setItems(ordered);
        await persist(ordered);
      },
    };
  }

  // Props spread onto the grip handle element only
  function handleProps(_id: string) {
    return {
      style:  { cursor: 'grab' } as React.CSSProperties,
      title:  'Drag to reorder',
      onMouseDown: (e: React.MouseEvent) => {
        // Walk up to the draggable ancestor and make sure it is draggable
        const row = (e.currentTarget as HTMLElement).closest('[draggable]') as HTMLElement | null;
        if (row) row.draggable = true;
      },
    };
  }

  return { containerProps, itemProps, handleProps, saving, reorderMsg };
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────────────────────

export default function StudioForm({ classes }: { classes: StudioClass[] }) {
  const [data, setData] = useState<StudioClass[]>(classes);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [openClassIds, setOpenClassIds] = useState<Set<string>>(
    () => new Set(classes.map((c) => c.id)),
  );
  const [openSubjectIds, setOpenSubjectIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    classes.forEach((c) => c.subjects.forEach((sub) => s.add(sub.id)));
    return s;
  });

  function toggleClass(id: string) {
    setOpenClassIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSubject(id: string) {
    setOpenSubjectIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function patchChapter(chapterId: string, patch: Partial<StudioChapter>) {
    setData((prev) => prev.map((cls) => ({
      ...cls,
      subjects: cls.subjects.map((sub) => ({
        ...sub,
        chapters: sub.chapters.map((ch) => ch.id === chapterId ? { ...ch, ...patch } : ch),
      })),
    })));
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-500">
        No classes found. Add classes and chapters via the Admin → LMS Structure tab first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((cls) => (
        <div key={cls.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Class header */}
          <button type="button" onClick={() => toggleClass(cls.id)}
            className="flex w-full items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
            <span className="text-base font-bold text-slate-900">{cls.name}</span>
            {openClassIds.has(cls.id) ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
          </button>

          {openClassIds.has(cls.id) && (
            <div className="border-t border-slate-100 divide-y divide-slate-100">
              {cls.subjects.map((subject) => (
                <div key={subject.id}>
                  {/* Subject header */}
                  <button type="button" onClick={() => toggleSubject(subject.id)}
                    className="flex w-full items-center justify-between px-6 py-3 bg-slate-50 hover:bg-indigo-50 transition-colors">
                    <span className="text-sm font-semibold text-slate-700">{subject.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {subject.chapters.reduce((a, c) => a + c.topics.length, 0)} topics across {subject.chapters.length} chapters
                      </span>
                      {openSubjectIds.has(subject.id) ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </span>
                  </button>

                  {openSubjectIds.has(subject.id) && (
                    <div className="divide-y divide-slate-50">
                      {subject.chapters.map((chapter) => (
                        <ChapterRow
                          key={chapter.id}
                          chapter={chapter}
                          isOpen={openChapterId === chapter.id}
                          onToggle={() => setOpenChapterId((p) => p === chapter.id ? null : chapter.id)}
                          onSaved={(patch) => patchChapter(chapter.id, patch)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChapterRow
// ─────────────────────────────────────────────────────────────────────────────

function ChapterRow({ chapter, isOpen, onToggle, onSaved }: {
  chapter:  StudioChapter;
  isOpen:   boolean;
  onToggle: () => void;
  onSaved:  (patch: Partial<StudioChapter>) => void;
}) {
  return (
    <div>
      <button type="button" onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors text-left">
        <div className="flex items-center gap-3 min-w-0">
          {chapter.isFree
            ? <Unlock className="h-4 w-4 flex-shrink-0 text-emerald-500" />
            : <Lock   className="h-4 w-4 flex-shrink-0 text-indigo-400" />}
          <span className={`text-sm font-medium truncate ${chapter.isActive ? 'text-slate-800' : 'text-slate-400'}`}>
            {chapter.name}
          </span>
          {!chapter.isActive && (
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">Draft</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {/* Topic count badge */}
          {chapter.topics.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
              <ListVideo className="h-3 w-3" />{chapter.topics.length} topic{chapter.topics.length !== 1 ? 's' : ''}
            </span>
          )}
          <VideoStatusBadge chapter={chapter} />
          {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && <ChapterEditPanel chapter={chapter} onSaved={onSaved} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoStatusBadge
// ─────────────────────────────────────────────────────────────────────────────

function VideoStatusBadge({ chapter }: { chapter: StudioChapter }) {
  if (chapter.hasVideo) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
      <Video className="h-3 w-3" />R2 video
    </span>
  );
  if (chapter.youtubeUrl) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
      <Youtube className="h-3 w-3" />YouTube
    </span>
  );
  return <span className="text-xs text-slate-400">No video</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ChapterEditPanel — chapter fields + topics list
// ─────────────────────────────────────────────────────────────────────────────

function ChapterEditPanel({ chapter, onSaved }: {
  chapter: StudioChapter;
  onSaved: (patch: Partial<StudioChapter>) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name,             setName]             = useState(chapter.name);
  const [description,      setDescription]      = useState(chapter.description ?? '');
  const [isFree,           setIsFree]           = useState(chapter.isFree);
  const [isActive,         setIsActive]         = useState(chapter.isActive);
  const [testPanelEnabled, setTestPanelEnabled] = useState(chapter.testPanelEnabled);
  const [youtubeUrl,       setYoutubeUrl]       = useState(chapter.youtubeUrl ?? '');
  const [videoFile,        setVideoFile]        = useState<File | null>(null);
  const [status,  setStatus]  = useState<'idle' | 'uploading' | 'saving' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Topic list local state (mutable without full re-fetch)
  const [topics, setTopics] = useState<StudioTopic[]>(chapter.topics);
  const topicDrag = useDragReorder({ items: topics, setItems: setTopics, resource: 'topics' });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('idle'); setMessage('');
    startTransition(async () => {
      try {
        let videoKey: string | undefined;
        if (videoFile) {
          setStatus('uploading');
          const form = new FormData();
          form.append('file', videoFile);
          form.append('folder', 'videos');
          const up = await fetch('/api/upload', { method: 'POST', body: form });
          const upData = await up.json();
          if (!up.ok) throw new Error(upData.error ?? 'Video upload failed.');
          videoKey = upData.key as string;
        }
        setStatus('saving');
        const body: Record<string, unknown> = {
          name: name.trim(), description: description.trim() || null,
          isFree, isActive, testPanelEnabled, youtubeUrl: youtubeUrl.trim() || null,
        };
        if (videoKey !== undefined) body.videoKey = videoKey;
        const res = await fetch(`/api/studio/chapters/${chapter.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error ?? 'Failed to save chapter.');
        onSaved({ name: d.name, description: d.description, isFree: d.isFree, isActive: d.isActive, youtubeUrl: d.youtubeUrl, hasVideo: d.hasVideo, testPanelEnabled: d.testPanelEnabled, topics });
        setVideoFile(null);
        setStatus('ok');
        setMessage(videoKey ? 'Video uploaded and chapter saved.' : 'Chapter saved.');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  }

  const busy = isPending || status === 'uploading' || status === 'saving';

  // ── Add a new topic ────────────────────────────────────────────────────────
  async function addTopic() {
    const title = prompt('New topic title:')?.trim();
    if (!title) return;
    const res = await fetch('/api/admin/lms?resource=topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: chapter.id, title, sortOrder: topics.length }),
    });
    if (res.ok) {
      const newTopic: StudioTopic = { ...(await res.json()), subtopics: [] };
      setTopics((p) => [...p, newTopic]);
    }
  }

  function patchTopic(topicId: string, patch: Partial<StudioTopic>) {
    setTopics((p) => p.map((t) => t.id === topicId ? { ...t, ...patch } : t));
  }

  async function deleteTopic(topicId: string, topicTitle: string) {
    if (!confirm(`Delete topic "${topicTitle}" and all its subtopics?`)) return;
    const res = await fetch(`/api/admin/lms?resource=topics&id=${topicId}`, { method: 'DELETE' });
    if (res.ok) setTopics((p) => p.filter((t) => t.id !== topicId));
  }

  return (
    <div className="mx-4 mb-4 space-y-4">

      {/* ── Chapter fields form ─────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Chapter settings</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Chapter name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Description <span className="font-normal text-slate-400">(shown on chapter card — supports HTML + LaTeX math)</span>
            </label>
            <AdvancedHTMLEditor value={description} onChange={setDescription} />
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
            <span className="text-sm text-slate-700"><span className="font-semibold">Free chapter</span><span className="text-slate-500 ml-1">(no purchase required)</span></span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              {isActive ? <><Eye className="h-4 w-4 text-emerald-500" />Published</> : <><EyeOff className="h-4 w-4 text-slate-400" />Draft</>}
            </span>
          </label>
        </div>

        {/* ── Test Panel toggle ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={testPanelEnabled}
              onChange={(e) => setTestPanelEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
            />
            <div>
              <span className="text-sm font-semibold text-violet-900">Enable Test Panel for this chapter</span>
              <p className="text-xs text-violet-600 mt-0.5">
                When enabled, students with a content or test-panel plan can access practice exams
                for this chapter. If unchecked, the exam window remains locked even if exams exist.
              </p>
            </div>
          </label>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Chapter-level video (overview)</p>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
              <Youtube className="h-3.5 w-3.5 text-red-500" />YouTube URL
              <span className="font-normal text-slate-400">— free/preview</span>
            </label>
            <input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtu.be/..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
              <Lock className="h-3.5 w-3.5 text-indigo-500" />Upload protected video (MP4)
            </label>
            {chapter.hasVideo && !videoFile && (
              <div className="mb-2 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />Protected video uploaded. Upload a new file to replace.
              </div>
            )}
            <input type="file" accept="video/mp4,video/webm" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100" />
            {videoFile && <p className="mt-1.5 text-xs text-slate-500">Selected: <span className="font-medium">{videoFile.name}</span> ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
          </div>
        </div>

        {status === 'ok'    && <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div>}
        {status === 'error' && <div className="flex items-center gap-2 text-sm font-semibold text-red-600"><AlertCircle className="h-4 w-4" />{message}</div>}

        <button type="submit" disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {busy
            ? <><Loader2 className="h-4 w-4 animate-spin" />{status === 'uploading' ? 'Uploading…' : 'Saving…'}</>
            : <>{videoFile ? <Upload className="h-4 w-4" /> : <Save className="h-4 w-4" />}{videoFile ? 'Upload & save' : 'Save chapter'}</>}
        </button>
      </form>

      {/* ── Chapter worksheets ───────────────────────────────────────────────── */}
      <WorksheetsPanel
        parentType="chapter"
        parentId={chapter.id}
        initialWorksheets={chapter.worksheets ?? []}
      />

      {/* ── Chapter-level exams ──────────────────────────────────────────────── */}
      {testPanelEnabled && (
        <ExamsPanel
          parentType="chapter"
          parentId={chapter.id}
          parentLabel="chapter"
        />
      )}

      {/* ── Topics list ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-bold text-slate-700">
            Topics <span className="font-normal text-slate-400 ml-1">({topics.length})</span>
          </p>
          <button type="button" onClick={addTopic}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
            <Plus className="h-3.5 w-3.5" />Add topic
          </button>
        </div>

        {topics.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400 text-center">No topics yet — click "Add topic" to get started.</p>
        ) : (
          <div className="divide-y divide-slate-100" {...topicDrag.containerProps}>
            {topicDrag.reorderMsg && (
              <p className="px-5 py-2 text-xs font-semibold text-red-600 bg-red-50">
                {topicDrag.reorderMsg}
              </p>
            )}
            {topics.map((topic, ti) => (
              <div key={topic.id} {...topicDrag.itemProps(topic.id, ti)}>
                <TopicRow
                  topic={topic}
                  index={ti}
                  chapterId={chapter.id}
                  onPatch={(patch) => patchTopic(topic.id, patch)}
                  onDelete={() => deleteTopic(topic.id, topic.title)}
                  dragHandleProps={topicDrag.handleProps(topic.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopicRow — accordion row for one topic
// ─────────────────────────────────────────────────────────────────────────────

function TopicRow({ topic, index, chapterId, onPatch, onDelete, dragHandleProps }: {
  topic:            StudioTopic;
  index:            number;
  chapterId:        string;
  onPatch:          (patch: Partial<StudioTopic>) => void;
  onDelete:         () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement> & { style?: React.CSSProperties };
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* Topic summary row */}
      <div className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-50 group">
        <span {...dragHandleProps} className="flex-shrink-0 touch-none select-none text-slate-300 hover:text-slate-500 transition-colors">
          <GripVertical className="h-4 w-4" />
        </span>
        <span className="text-xs text-slate-400 w-5 flex-shrink-0">{index + 1}.</span>

        <button type="button" onClick={() => setOpen((p) => !p)}
          className="flex-1 flex items-center gap-2 text-left min-w-0">
          {topic.isFree
            ? <Unlock className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
            : <Lock   className="h-3.5 w-3.5 flex-shrink-0 text-indigo-400" />}
          <span className={`text-sm font-medium truncate ${topic.isActive ? 'text-slate-800' : 'text-slate-400'}`}>
            {topic.title}
          </span>
          {!topic.isActive && <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full flex-shrink-0">Draft</span>}
          {topic.youtubeVideoId && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5 flex-shrink-0">
              <Youtube className="h-3 w-3" />
              {topic.duration ? fmtDuration(topic.duration) : ''}
            </span>
          )}
          {topic.subtopics.length > 0 && (
            <span className="text-xs text-slate-400 flex-shrink-0">{topic.subtopics.length} sub</span>
          )}
        </button>

        <button type="button" onClick={() => setOpen((p) => !p)} className="text-slate-400 flex-shrink-0">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="ml-10 mr-4 mb-3 space-y-3">
          <TopicEditForm topic={topic} onSaved={onPatch} />
          <SubtopicsPanel topic={topic} onPatch={onPatch} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopicEditForm
// ─────────────────────────────────────────────────────────────────────────────

function TopicEditForm({ topic, onSaved }: {
  topic:   StudioTopic;
  onSaved: (patch: Partial<StudioTopic>) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [title,       setTitle]       = useState(topic.title);
  const [description, setDesc]        = useState(topic.description ?? '');
  const [videoId,     setVideoId]     = useState(topic.youtubeVideoId ?? '');
  const [duration,    setDuration]    = useState(fmtDuration(topic.duration));
  const [sortOrder,   setSortOrder]   = useState(String(topic.sortOrder));
  const [isFree,      setIsFree]      = useState(topic.isFree);
  const [isActive,    setIsActive]    = useState(topic.isActive);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await fetch(`/api/studio/topics/${topic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:          title.trim(),
          description:    description.trim() || null,
          youtubeVideoId: videoId.trim()     || null,
          duration:       parseDuration(duration),
          sortOrder:      Number(sortOrder)  || 0,
          isFree, isActive,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Save failed.' }); return; }
      onSaved({ ...d });
      setMsg({ type: 'ok', text: 'Topic saved.' });
    });
  }

  return (
    <form onSubmit={save} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel>Title</FieldLabel>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required
            className="lms-field" />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Description <Muted>(optional — supports HTML + LaTeX math)</Muted></FieldLabel>
          <AdvancedHTMLEditor value={description} onChange={setDesc} />
        </div>
        <div>
          <FieldLabel>YouTube Video ID <Muted>e.g. dQw4w9WgXcQ</Muted></FieldLabel>
          <input value={videoId} onChange={(e) => setVideoId(e.target.value)}
            placeholder="dQw4w9WgXcQ" className="lms-field" />
        </div>
        <div>
          <FieldLabel>Duration <Muted>mm:ss or seconds</Muted></FieldLabel>
          <input value={duration} onChange={(e) => setDuration(e.target.value)}
            placeholder="12:34" className="lms-field" />
        </div>
        <div>
          <FieldLabel>Sort order</FieldLabel>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="lms-field" />
        </div>
        <div className="flex items-end gap-4 pb-1">
          <Toggle label="Free" checked={isFree} onChange={setIsFree} />
          <Toggle label={isActive ? 'Published' : 'Draft'} checked={isActive} onChange={setIsActive} />
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-xs font-semibold ${msg.type === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
          {msg.type === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {msg.text}
        </div>
      )}

      <button type="submit" disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
        {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : <><Save className="h-3.5 w-3.5" />Save topic</>}
      </button>

      <WorksheetsPanel
        parentType="topic"
        parentId={topic.id}
        initialWorksheets={topic.worksheets ?? []}
      />

      <ExamsPanel
        parentType="topic"
        parentId={topic.id}
        parentLabel={topic.title}
      />
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SubtopicsPanel — list + edit + add subtopics for one topic
// ─────────────────────────────────────────────────────────────────────────────

function SubtopicsPanel({ topic, onPatch }: {
  topic:   StudioTopic;
  onPatch: (patch: Partial<StudioTopic>) => void;
}) {
  const [subtopics, setSubtopics] = useState<StudioSubtopic[]>(topic.subtopics);
  const [openId, setOpenId] = useState<string | null>(null);
  const subtopicDrag = useDragReorder({ items: subtopics, setItems: setSubtopics, resource: 'subtopics' });

  const patchSub = useCallback((id: string, patch: Partial<StudioSubtopic>) => {
    setSubtopics((p) => p.map((s) => s.id === id ? { ...s, ...patch } : s));
  }, []);

  async function addSubtopic() {
    const title = prompt('New subtopic title:')?.trim();
    if (!title) return;
    const res = await fetch('/api/admin/lms?resource=subtopics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId: topic.id, title, sortOrder: subtopics.length }),
    });
    if (res.ok) {
      const s: StudioSubtopic = await res.json();
      setSubtopics((p) => [...p, s]);
      onPatch({ subtopics: [...subtopics, s] });
    }
  }

  async function deleteSubtopic(id: string, title: string) {
    if (!confirm(`Delete subtopic "${title}"?`)) return;
    const res = await fetch(`/api/admin/lms?resource=subtopics&id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      const updated = subtopics.filter((s) => s.id !== id);
      setSubtopics(updated);
      onPatch({ subtopics: updated });
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <p className="text-xs font-bold text-slate-600">Subtopics <span className="font-normal text-slate-400">({subtopics.length})</span></p>
        <button type="button" onClick={addSubtopic}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 transition-colors">
          <Plus className="h-3 w-3" />Add subtopic
        </button>
      </div>

      {subtopics.length === 0 ? (
        <p className="px-4 py-4 text-xs text-slate-400 text-center">No subtopics yet.</p>
      ) : (
        <div className="divide-y divide-slate-100" {...subtopicDrag.containerProps}>
          {subtopicDrag.reorderMsg && (
            <p className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50">
              {subtopicDrag.reorderMsg}
            </p>
          )}
          {subtopics.map((sub, si) => (
            <div key={sub.id} {...subtopicDrag.itemProps(sub.id, si)}>
              {/* Subtopic summary row */}
              <div className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 group">
                <span
                  {...subtopicDrag.handleProps(sub.id)}
                  className="flex-shrink-0 touch-none select-none text-slate-200 hover:text-slate-400 transition-colors"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs text-slate-300 w-4 flex-shrink-0">{si + 1}.</span>
                <button type="button" onClick={() => setOpenId((p) => p === sub.id ? null : sub.id)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0">
                  {sub.isFree ? <Unlock className="h-3 w-3 flex-shrink-0 text-emerald-500" /> : <Lock className="h-3 w-3 flex-shrink-0 text-indigo-400" />}
                  <span className={`text-xs font-medium truncate ${sub.isActive ? 'text-slate-700' : 'text-slate-400'}`}>{sub.title}</span>
                  {sub.youtubeVideoId && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-red-600 flex-shrink-0">
                      <Youtube className="h-3 w-3" />{sub.duration ? fmtDuration(sub.duration) : ''}
                    </span>
                  )}
                </button>
                <button type="button" onClick={() => setOpenId((p) => p === sub.id ? null : sub.id)} className="text-slate-400 flex-shrink-0">
                  {openId === sub.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                <button type="button" onClick={() => deleteSubtopic(sub.id, sub.title)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {openId === sub.id && (
                <div className="px-4 pb-3">
                  <SubtopicEditForm subtopic={sub} onSaved={(patch) => patchSub(sub.id, patch)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SubtopicEditForm
// ─────────────────────────────────────────────────────────────────────────────

function SubtopicEditForm({ subtopic, onSaved }: {
  subtopic: StudioSubtopic;
  onSaved:  (patch: Partial<StudioSubtopic>) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [title,     setTitle]     = useState(subtopic.title);
  const [desc,      setDesc]      = useState(subtopic.description ?? '');
  const [videoId,   setVideoId]   = useState(subtopic.youtubeVideoId ?? '');
  const [duration,  setDuration]  = useState(fmtDuration(subtopic.duration));
  const [sortOrder, setSortOrder] = useState(String(subtopic.sortOrder));
  const [isFree,    setIsFree]    = useState(subtopic.isFree);
  const [isActive,  setIsActive]  = useState(subtopic.isActive);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault(); setMsg(null);
    startTransition(async () => {
      const res = await fetch(`/api/studio/subtopics/${subtopic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(), description: desc.trim() || null,
          youtubeVideoId: videoId.trim() || null,
          duration: parseDuration(duration),
          sortOrder: Number(sortOrder) || 0,
          isFree, isActive,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Save failed.' }); return; }
      onSaved({ ...d });
      setMsg({ type: 'ok', text: 'Subtopic saved.' });
    });
  }

  return (
    <form onSubmit={save} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3 mt-1">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel>Title</FieldLabel>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="lms-field" />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Description <Muted>(optional — supports HTML + LaTeX math)</Muted></FieldLabel>
          <AdvancedHTMLEditor value={desc} onChange={setDesc} />
        </div>
        <div>
          <FieldLabel>YouTube Video ID</FieldLabel>
          <input value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="dQw4w9WgXcQ" className="lms-field" />
        </div>
        <div>
          <FieldLabel>Duration <Muted>mm:ss or seconds</Muted></FieldLabel>
          <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="5:30" className="lms-field" />
        </div>
        <div>
          <FieldLabel>Sort order</FieldLabel>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="lms-field" />
        </div>
        <div className="flex items-end gap-4 pb-1">
          <Toggle label="Free" checked={isFree} onChange={setIsFree} />
          <Toggle label={isActive ? 'Published' : 'Draft'} checked={isActive} onChange={setIsActive} />
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${msg.type === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
          {msg.type === 'ok' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}{msg.text}
        </div>
      )}

      <button type="submit" disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors">
        {isPending ? <><Loader2 className="h-3 w-3 animate-spin" />Saving…</> : <><Save className="h-3 w-3" />Save subtopic</>}
      </button>

      <WorksheetsPanel
        parentType="subtopic"
        parentId={subtopic.id}
        initialWorksheets={subtopic.worksheets ?? []}
      />

      <ExamsPanel
        parentType="subtopic"
        parentId={subtopic.id}
        parentLabel={subtopic.title}
      />
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WorksheetsPanel — add / edit / delete worksheets for a topic or subtopic
// Used inside both TopicEditForm and SubtopicEditForm.
// ─────────────────────────────────────────────────────────────────────────────

function WorksheetsPanel({
  parentType,
  parentId,
  initialWorksheets,
}: {
  parentType:         'chapter' | 'topic' | 'subtopic';
  parentId:           string;
  initialWorksheets:  StudioWorksheet[];
}) {
  const [worksheets, setWorksheets] = useState<StudioWorksheet[]>(initialWorksheets);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [adding,     setAdding]     = useState(false);
  const [saving,     setSaving]     = useState(false);

  // ── per-worksheet edit state (title + content) ────────────────────────────
  const [editTitle,   setEditTitle]   = useState('');
  const [editContent, setEditContent] = useState('');

  // ── new worksheet state ───────────────────────────────────────────────────
  const [newTitle,   setNewTitle]   = useState('');
  const [newContent, setNewContent] = useState('');

  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  function startEdit(ws: StudioWorksheet) {
    setEditingId(ws.id);
    setEditTitle(ws.title);
    setEditContent(ws.content);
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setMsg(null);
  }

  async function saveEdit(ws: StudioWorksheet) {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/lms?resource=worksheets&id=${ws.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Save failed.' }); return; }
      setWorksheets((p) => p.map((w) => w.id === ws.id ? { ...w, title: d.title, content: d.content } : w));
      setEditingId(null);
      setMsg({ type: 'ok', text: 'Worksheet saved.' });
    } finally { setSaving(false); }
  }

  async function createWorksheet() {
    if (!newTitle.trim()) return;
    setSaving(true); setMsg(null);
    try {
      const idKey = parentType === 'topic' ? 'topicId' : parentType === 'chapter' ? 'chapterId' : 'subtopicId';
      const res = await fetch('/api/admin/lms?resource=worksheets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          [idKey]:   parentId,
          title:     newTitle.trim(),
          content:   newContent.trim(),
          sortOrder: worksheets.length,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Create failed.' }); return; }
      setWorksheets((p) => [...p, d as StudioWorksheet]);
      setNewTitle(''); setNewContent(''); setAdding(false);
      setMsg({ type: 'ok', text: 'Worksheet added.' });
    } finally { setSaving(false); }
  }

  async function deleteWorksheet(id: string, title: string) {
    if (!confirm(`Delete worksheet "${title}"?`)) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/lms?resource=worksheets&id=${id}`, { method: 'DELETE' });
      if (!res.ok) { setMsg({ type: 'err', text: 'Delete failed.' }); return; }
      setWorksheets((p) => p.filter((w) => w.id !== id));
      if (editingId === id) setEditingId(null);
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden mt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-200 bg-amber-50">
        <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Worksheets
          <span className="font-normal text-amber-600">({worksheets.length})</span>
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setMsg(null); }}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            <Plus className="h-3 w-3" />Add worksheet
          </button>
        )}
      </div>

      {/* Existing worksheets */}
      {worksheets.length === 0 && !adding && (
        <p className="px-4 py-4 text-xs text-amber-700/60 text-center italic">
          No worksheets yet — click "Add worksheet" to create one.
        </p>
      )}

      {worksheets.map((ws, idx) => (
        <div key={ws.id} className="border-b border-amber-100 last:border-0">
          {/* Worksheet summary row */}
          <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-amber-50 group">
            <span className="text-xs font-bold text-amber-700 w-24 flex-shrink-0">
              Worksheet {idx + 1}
            </span>
            <span className="flex-1 text-xs text-slate-700 truncate">{ws.title}</span>
            <button
              type="button"
              onClick={() => editingId === ws.id ? cancelEdit() : startEdit(ws)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex-shrink-0"
            >
              {editingId === ws.id ? 'Close' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={() => deleteWorksheet(ws.id, ws.title)}
              disabled={saving}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Edit form */}
          {editingId === ws.id && (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <FieldLabel>Title</FieldLabel>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="lms-field"
                  placeholder="Worksheet title"
                />
              </div>
              <div>
                <FieldLabel>Content <Muted>(supports HTML + LaTeX math)</Muted></FieldLabel>
                <AdvancedHTMLEditor value={editContent} onChange={setEditContent} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveEdit(ws)}
                  disabled={saving || !editTitle.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  {saving ? 'Saving…' : 'Save worksheet'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add new worksheet form */}
      {adding && (
        <div className="px-4 py-4 space-y-3 border-t border-amber-100 bg-white">
          <p className="text-xs font-bold text-amber-800">
            New worksheet #{worksheets.length + 1}
          </p>
          <div>
            <FieldLabel>Title</FieldLabel>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="lms-field"
              placeholder="e.g. Practice Problems — Newton's Laws"
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>Content <Muted>(supports HTML + LaTeX math)</Muted></FieldLabel>
            <AdvancedHTMLEditor value={newContent} onChange={setNewContent} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={createWorksheet}
              disabled={saving || !newTitle.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              {saving ? 'Creating…' : 'Create worksheet'}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewTitle(''); setNewContent(''); setMsg(null); }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status message */}
      {msg && (
        <div className={`px-4 py-2 text-xs font-semibold flex items-center gap-1.5 ${
          msg.type === 'ok' ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'
        }`}>
          {msg.type === 'ok'
            ? <CheckCircle2 className="h-3 w-3" />
            : <AlertCircle  className="h-3 w-3" />}
          {msg.text}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExamsPanel — create / edit / delete exams for a chapter, topic, or subtopic
// ─────────────────────────────────────────────────────────────────────────────

interface StudioExamQuestion {
  id:            string;
  question:      string;
  type:          'MCQ' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  options:       string[];
  correctAnswer: string | string[];
  explanation:   string | null;
  marks:         number;
  sortOrder:     number;
}

interface StudioExam {
  id:              string;
  title:           string;
  description:     string | null;
  timeLimit:       number;
  passingScore:    number;
  shuffleQuestions: boolean;
  isActive:        boolean;
  sortOrder:       number;
  questions:       StudioExamQuestion[];
  _count?:         { attempts: number };
}

function ExamsPanel({
  parentType,
  parentId,
  parentLabel,
}: {
  parentType: 'chapter' | 'topic' | 'subtopic';
  parentId:   string;
  parentLabel: string;
}) {
  const [exams,      setExams]      = useState<StudioExam[] | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [expanded,   setExpanded]   = useState(false);
  const [addingExam, setAddingExam] = useState(false);
  const [newTitle,   setNewTitle]   = useState('');
  const [newTime,    setNewTime]    = useState(30);
  const [newPass,    setNewPass]    = useState(60);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function loadExams() {
    if (exams !== null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/studio/exams?${parentType}Id=${parentId}`);
      if (res.ok) setExams(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next) await loadExams();
  }

  async function createExam() {
    if (!newTitle.trim()) return;
    setSaving(true); setMsg(null);
    const parentKey = parentType === 'chapter' ? 'chapterId'
                    : parentType === 'topic'    ? 'topicId'
                    :                             'subtopicId';
    try {
      const res = await fetch('/api/studio/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [parentKey]:  parentId,
          title:        newTitle.trim(),
          timeLimit:    newTime,
          passingScore: newPass,
        }),
      });
      if (res.ok) {
        const created: StudioExam = await res.json();
        setExams((p) => [...(p ?? []), created]);
        setNewTitle(''); setNewTime(30); setNewPass(60);
        setAddingExam(false);
        setMsg({ type: 'ok', text: 'Exam created.' });
      } else {
        const d = await res.json();
        setMsg({ type: 'err', text: d.error ?? 'Failed to create exam.' });
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteExam(examId: string, examTitle: string) {
    if (!confirm(`Delete exam "${examTitle}" and all its questions?`)) return;
    const res = await fetch(`/api/studio/exams/${examId}`, { method: 'DELETE' });
    if (res.ok) setExams((p) => (p ?? []).filter((e) => e.id !== examId));
  }

  function patchExam(examId: string, patch: Partial<StudioExam>) {
    setExams((p) => (p ?? []).map((e) => e.id === examId ? { ...e, ...patch } : e));
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between px-5 py-3 border-b border-violet-100 bg-violet-50 hover:bg-violet-100 transition-colors"
      >
        <p className="text-sm font-bold text-violet-800 flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Test Panel — Exams
          <span className="text-xs font-normal text-violet-500">({parentLabel})</span>
        </p>
        {expanded ? <ChevronUp className="h-4 w-4 text-violet-400" /> : <ChevronDown className="h-4 w-4 text-violet-400" />}
      </button>

      {expanded && (
        <div className="divide-y divide-slate-100">
          {loading && (
            <div className="px-5 py-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading exams…
            </div>
          )}

          {!loading && exams !== null && exams.length === 0 && (
            <p className="px-5 py-4 text-sm text-slate-400 text-center">
              No exams yet — click "Add exam" to create one.
            </p>
          )}

          {!loading && exams && exams.map((exam) => (
            <ExamRow
              key={exam.id}
              exam={exam}
              onPatch={(p) => patchExam(exam.id, p)}
              onDelete={() => deleteExam(exam.id, exam.title)}
            />
          ))}

          {/* Status message */}
          {msg && (
            <div className={`px-5 py-2 text-xs font-semibold ${msg.type === 'ok' ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
              {msg.text}
            </div>
          )}

          {/* Add exam form */}
          {addingExam ? (
            <div className="px-5 py-4 space-y-3 bg-violet-50/50">
              <p className="text-xs font-bold text-violet-700 uppercase tracking-widest">New exam</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <FieldLabel>Exam title</FieldLabel>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Chapter 3 Practice Test"
                    className="lms-field"
                  />
                </div>
                <div>
                  <FieldLabel>Time limit (min) <Muted>0 = unlimited</Muted></FieldLabel>
                  <input type="number" min={0} value={newTime} onChange={(e) => setNewTime(Number(e.target.value))} className="lms-field" />
                </div>
                <div>
                  <FieldLabel>Passing score (%)</FieldLabel>
                  <input type="number" min={0} max={100} value={newPass} onChange={(e) => setNewPass(Number(e.target.value))} className="lms-field" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={createExam}
                  disabled={saving || !newTitle.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Create exam
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingExam(false); setNewTitle(''); }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-3">
              <button
                type="button"
                onClick={() => setAddingExam(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
              >
                <Plus className="h-3.5 w-3.5" />Add exam
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ExamRow — one exam with its questions ──────────────────────────────────

function ExamRow({
  exam,
  onPatch,
  onDelete,
}: {
  exam:    StudioExam;
  onPatch: (p: Partial<StudioExam>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title,    setTitle]   = useState(exam.title);
  const [timeLimit, setTimeLimit] = useState(exam.timeLimit);
  const [passingScore, setPassingScore] = useState(exam.passingScore);
  const [shuffle, setShuffle] = useState(exam.shuffleQuestions);
  const [isActive, setIsActive] = useState(exam.isActive);
  const [saving,   setSaving]  = useState(false);
  const [msg,      setMsg]     = useState<string | null>(null);

  async function saveExam() {
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/studio/exams/${exam.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), timeLimit, passingScore, shuffleQuestions: shuffle, isActive }),
    });
    if (res.ok) {
      const d = await res.json();
      onPatch(d);
      setEditing(false);
      setMsg('Saved.');
    } else {
      setMsg('Save failed.');
    }
    setSaving(false);
  }

  const [questions, setQuestions] = useState<StudioExamQuestion[]>(exam.questions ?? []);

  async function addQuestion() {
    const text = prompt('Question text (plain or HTML):')?.trim();
    if (!text) return;
    const res = await fetch(`/api/studio/exams/${exam.id}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question:      text,
        type:          'MCQ',
        options:       ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        marks:         1,
      }),
    });
    if (res.ok) {
      const q: StudioExamQuestion = await res.json();
      setQuestions((p) => [...p, q]);
    }
  }

  async function deleteQuestion(qId: string) {
    if (!confirm('Delete this question?')) return;
    const res = await fetch(`/api/studio/exams/${exam.id}/questions/${qId}`, { method: 'DELETE' });
    if (res.ok) setQuestions((p) => p.filter((q) => q.id !== qId));
  }

  function patchQuestion(qId: string, patch: Partial<StudioExamQuestion>) {
    setQuestions((p) => p.map((q) => q.id === qId ? { ...q, ...patch } : q));
  }

  return (
    <div>
      {/* Exam header row */}
      <div className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-50 group">
        <button type="button" onClick={() => setOpen((p) => !p)} className="flex-1 flex items-center gap-2 text-left min-w-0">
          <ClipboardList className={`h-3.5 w-3.5 flex-shrink-0 ${exam.isActive ? 'text-violet-500' : 'text-slate-300'}`} />
          <span className={`text-sm font-medium truncate ${exam.isActive ? 'text-slate-800' : 'text-slate-400'}`}>
            {exam.title}
          </span>
          <span className="text-xs text-slate-400 flex-shrink-0">
            {questions.length}Q · {exam.timeLimit > 0 ? `${exam.timeLimit}min` : '∞'} · pass {exam.passingScore}%
          </span>
          {exam._count && (
            <span className="text-xs text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
              {exam._count.attempts} attempts
            </span>
          )}
        </button>
        <button type="button" onClick={() => setOpen((p) => !p)} className="text-slate-400 flex-shrink-0">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="ml-6 mr-4 mb-3 space-y-3 border-l-2 border-violet-100 pl-3">
          {/* Exam settings */}
          {editing ? (
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <FieldLabel>Title</FieldLabel>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="lms-field" />
                </div>
                <div>
                  <FieldLabel>Time (min) <Muted>0 = unlimited</Muted></FieldLabel>
                  <input type="number" min={0} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="lms-field" />
                </div>
                <div>
                  <FieldLabel>Passing score (%)</FieldLabel>
                  <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="lms-field" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <Toggle label="Shuffle questions" checked={shuffle} onChange={setShuffle} />
                <Toggle label="Active (visible to students)" checked={isActive} onChange={setIsActive} />
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={saveExam} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                </button>
                <button type="button" onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                {msg && <span className="text-xs text-slate-500">{msg}</span>}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setEditing(true)}
              className="text-xs text-violet-600 hover:text-violet-800 font-semibold underline">
              Edit exam settings
            </button>
          )}

          {/* Questions list */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600">Questions ({questions.length})</p>
              <button type="button" onClick={addQuestion}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700">
                <Plus className="h-3 w-3" />Add question
              </button>
            </div>

            {questions.length === 0 ? (
              <p className="px-4 py-4 text-xs text-slate-400 text-center">
                No questions yet — click "Add question" to get started.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {questions.map((q, qi) => (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    index={qi}
                    examId={exam.id}
                    onPatch={(p) => patchQuestion(q.id, p)}
                    onDelete={() => deleteQuestion(q.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── QuestionRow ────────────────────────────────────────────────────────────

function QuestionRow({
  question,
  index,
  examId,
  onPatch,
  onDelete,
}: {
  question: StudioExamQuestion;
  index:    number;
  examId:   string;
  onPatch:  (p: Partial<StudioExamQuestion>) => void;
  onDelete: () => void;
}) {
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);

  // Local editable state
  const [qText,    setQText]    = useState(question.question);
  const [qType,    setQType]    = useState(question.type);
  const [options,  setOptions]  = useState<string[]>(question.options);
  const [correct,  setCorrect]  = useState<string | string[]>(question.correctAnswer);
  const [explain,  setExplain]  = useState(question.explanation ?? '');
  const [marks,    setMarks]    = useState(question.marks);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/studio/exams/${examId}/questions/${question.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question:      qText.trim(),
        type:          qType,
        options,
        correctAnswer: correct,
        explanation:   explain.trim() || null,
        marks,
      }),
    });
    if (res.ok) {
      onPatch(await res.json());
      setOpen(false);
    }
    setSaving(false);
  }

  function updateOption(i: number, val: string) {
    setOptions((p) => p.map((o, idx) => idx === i ? val : o));
  }
  function addOption() { setOptions((p) => [...p, `Option ${p.length + 1}`]); }
  function removeOption(i: number) { setOptions((p) => p.filter((_, idx) => idx !== i)); }

  const typeBadge: Record<StudioExamQuestion['type'], string> = {
    MCQ:          'MCQ',
    MULTI_SELECT: 'Multi',
    TRUE_FALSE:   'T/F',
    SHORT_ANSWER: 'Short',
  };

  return (
    <div>
      <div className="flex items-start gap-2 px-4 py-2 hover:bg-slate-50 group">
        <span className="flex-shrink-0 text-xs text-slate-400 w-5 text-right mt-0.5">{index + 1}.</span>
        <button type="button" onClick={() => setOpen((p) => !p)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5">
              {typeBadge[question.type]}
            </span>
            <span className="text-xs text-slate-700 line-clamp-2" dangerouslySetInnerHTML={{ __html: question.question }} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-400">{marks} mark{marks !== 1 ? 's' : ''}</span>
          </div>
        </button>
        <button type="button" onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-red-400 hover:text-red-600 transition-opacity mt-0.5">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="mx-4 mb-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 space-y-3">
          <div>
            <FieldLabel>Question text (plain text or HTML)</FieldLabel>
            <textarea
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              rows={3}
              className="lms-field resize-y"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <FieldLabel>Question type</FieldLabel>
              <select value={qType} onChange={(e) => setQType(e.target.value as StudioExamQuestion['type'])} className="lms-field">
                <option value="MCQ">Multiple choice (single answer)</option>
                <option value="MULTI_SELECT">Multiple correct answers</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SHORT_ANSWER">Short answer (keyword match)</option>
              </select>
            </div>
            <div>
              <FieldLabel>Marks</FieldLabel>
              <input type="number" min={1} value={marks} onChange={(e) => setMarks(Number(e.target.value))} className="lms-field" />
            </div>
          </div>

          {/* Options editor — not shown for SHORT_ANSWER */}
          {qType !== 'SHORT_ANSWER' && qType !== 'TRUE_FALSE' && (
            <div>
              <FieldLabel>Answer options</FieldLabel>
              <div className="space-y-1.5">
                {options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type={qType === 'MULTI_SELECT' ? 'checkbox' : 'radio'}
                      name={`correct-${question.id}`}
                      checked={qType === 'MULTI_SELECT'
                        ? (Array.isArray(correct) ? correct.includes(opt) : false)
                        : correct === opt
                      }
                      onChange={() => {
                        if (qType === 'MULTI_SELECT') {
                          const arr = Array.isArray(correct) ? [...correct] : [];
                          setCorrect(arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]);
                        } else {
                          setCorrect(opt);
                        }
                      }}
                      className="h-3.5 w-3.5 flex-shrink-0"
                    />
                    <input
                      value={opt}
                      onChange={(e) => updateOption(oi, e.target.value)}
                      className="flex-1 lms-field text-xs py-1"
                    />
                    <button type="button" onClick={() => removeOption(oi)} className="text-slate-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addOption}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold mt-1">
                  <Plus className="h-3 w-3" />Add option
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {qType === 'MULTI_SELECT' ? 'Check all correct answers.' : 'Select the one correct answer (radio).'}
              </p>
            </div>
          )}

          {qType === 'TRUE_FALSE' && (
            <div>
              <FieldLabel>Correct answer</FieldLabel>
              <div className="flex gap-4">
                {['True', 'False'].map((val) => (
                  <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name={`tf-${question.id}`} checked={correct === val} onChange={() => setCorrect(val)} />
                    {val}
                  </label>
                ))}
              </div>
            </div>
          )}

          {qType === 'SHORT_ANSWER' && (
            <div>
              <FieldLabel>Accepted keywords <Muted>(comma-separated; answer passes if it contains any)</Muted></FieldLabel>
              <input
                value={Array.isArray(correct) ? correct.join(', ') : String(correct)}
                onChange={(e) => setCorrect(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                placeholder="newton, force, acceleration"
                className="lms-field"
              />
            </div>
          )}

          <div>
            <FieldLabel>Explanation <Muted>(shown after student answers — optional)</Muted></FieldLabel>
            <textarea
              value={explain}
              onChange={(e) => setExplain(e.target.value)}
              rows={2}
              className="lms-field resize-y"
              placeholder="Explain the correct answer…"
            />
          </div>

          <button type="button" onClick={save} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save question
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-components
// ─────────────────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-600 mb-1">{children}</label>;
}
function Muted({ children }: { children: React.ReactNode }) {
  return <span className="font-normal text-slate-400 ml-1">{children}</span>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600" />
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </label>
  );
}
