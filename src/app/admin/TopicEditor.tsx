'use client';

// src/app/admin/TopicEditor.tsx
//
// Full editor modal for topics, subtopics, and worksheets belonging to a chapter.
// Opened from the LMS Structure tab when the admin clicks "Edit Topics" on a chapter row.
//
// Features:
//   • List topics (sortOrder, title, slug, description, youtube, isFree, isActive)
//   • Create / edit / delete topics
//   • Expand a topic to manage its subtopics (same fields)
//   • Expand a topic or subtopic to manage its worksheets
//     – Worksheet: title + rich-text content (plain textarea for now; same as description)
//     – "Download Worksheet N" label convention enforced by sortOrder
//   • All mutations call /api/admin/lms?resource=*
//
// Deliberately uses plain <textarea> for worksheet content (matching how description
// is edited in the existing admin UI — no TipTap dependency in the admin page).

import { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Trash2, Save, ChevronDown, ChevronRight,
  Loader2, FileText,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Worksheet {
  id:        string;
  title:     string;
  content:   string;
  sortOrder: number;
  isActive:  boolean;
}

interface Subtopic {
  id:             string;
  title:          string;
  slug:           string;
  description:    string | null;
  youtubeVideoId: string | null;
  duration:       number | null;
  sortOrder:      number;
  isActive:       boolean;
  isFree:         boolean;
  worksheets:     Worksheet[];
}

interface Topic {
  id:             string;
  title:          string;
  slug:           string;
  description:    string | null;
  youtubeVideoId: string | null;
  duration:       number | null;
  sortOrder:      number;
  isActive:       boolean;
  isFree:         boolean;
  subtopics:      Subtopic[];
  worksheets:     Worksheet[];
}

interface TopicEditorProps {
  chapterId:   string;
  chapterName: string;
  onClose:     () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function api(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  resource: string,
  id?: string,
  body?: Record<string, unknown>,
) {
  const params = new URLSearchParams({ resource });
  if (id) params.set('id', id);
  const res = await fetch(`/api/admin/lms?${params}`, {
    method,
    headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchWorksheets(params: { topicId?: string; subtopicId?: string }) {
  const qs = new URLSearchParams({ resource: 'worksheets', ...params });
  const res = await fetch(`/api/admin/lms?${qs}`);
  if (!res.ok) return [];
  return res.json() as Promise<Worksheet[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable field
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className="mb-2">
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WorksheetPanel — manages worksheets for a topic or subtopic
// ─────────────────────────────────────────────────────────────────────────────

function WorksheetPanel({
  parentType,
  parentId,
  initialWorksheets,
  onChanged,
}: {
  parentType: 'topic' | 'subtopic';
  parentId:   string;
  initialWorksheets: Worksheet[];
  onChanged:  () => void;
}) {
  const [worksheets, setWorksheets]   = useState<Worksheet[]>(initialWorksheets);
  const [saving,     setSaving]       = useState(false);
  const [editingId,  setEditingId]    = useState<string | null>(null);
  const [editForm,   setEditForm]     = useState<Partial<Worksheet>>({});
  const [newTitle,   setNewTitle]     = useState('');
  const [newContent, setNewContent]   = useState('');
  const [adding,     setAdding]       = useState(false);
  const [error,      setError]        = useState('');

  // Refresh worksheets from API (after create/delete)
  const reload = useCallback(async () => {
    const key = parentType === 'topic' ? 'topicId' : 'subtopicId';
    const rows = await fetchWorksheets({ [key]: parentId });
    setWorksheets(rows);
  }, [parentType, parentId]);

  async function createWorksheet() {
    if (!newTitle.trim()) return;
    setSaving(true); setError('');
    try {
      const key = parentType === 'topic' ? 'topicId' : 'subtopicId';
      await api('POST', 'worksheets', undefined, {
        [key]:     parentId,
        title:     newTitle.trim(),
        content:   newContent.trim(),
        sortOrder: worksheets.length,
      });
      setNewTitle(''); setNewContent(''); setAdding(false);
      await reload();
      onChanged();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true); setError('');
    try {
      await api('PUT', 'worksheets', editingId, {
        title:     editForm.title?.trim(),
        content:   editForm.content?.trim(),
        sortOrder: editForm.sortOrder,
        isActive:  editForm.isActive,
      });
      setEditingId(null);
      await reload();
      onChanged();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function deleteWorksheet(id: string, title: string) {
    if (!confirm(`Delete worksheet "${title}"?`)) return;
    setSaving(true);
    try {
      await api('DELETE', 'worksheets', id);
      await reload();
      onChanged();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="mt-3 pl-3 border-l-2 border-amber-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" /> Worksheets
        </p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {worksheets.length === 0 && !adding && (
        <p className="text-xs text-gray-400 italic">No worksheets yet.</p>
      )}

      {worksheets.map((ws, idx) => (
        <div key={ws.id} className="mb-2 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
          {editingId === ws.id ? (
            <div className="space-y-2">
              <Field
                label="Title"
                value={editForm.title ?? ''}
                onChange={(v) => setEditForm({ ...editForm, title: v })}
              />
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Content (HTML)</label>
                <textarea
                  value={editForm.content ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-mono text-gray-900 focus:ring-2 focus:ring-amber-400"
                  placeholder="<p>Worksheet content as HTML…</p>"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Sort order"
                  value={String(editForm.sortOrder ?? 0)}
                  onChange={(v) => setEditForm({ ...editForm, sortOrder: Number(v) })}
                  type="number"
                />
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editForm.isActive ?? true}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Active
                  </label>
                </div>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
                <button
                  onClick={() => { setEditingId(null); setError(''); }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-900">
                  Worksheet {idx + 1} — {ws.title}
                </p>
                {!ws.isActive && (
                  <span className="text-xs text-red-500 font-medium">Hidden</span>
                )}
                {ws.content && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                    {ws.content.replace(/<[^>]+>/g, ' ').slice(0, 80)}…
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => { setEditingId(ws.id); setEditForm({ ...ws }); setError(''); }}
                  className="p-1 text-amber-700 hover:bg-amber-100 rounded"
                  title="Edit"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteWorksheet(ws.id, ws.title)}
                  disabled={saving}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add worksheet form */}
      {adding && (
        <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-2">
          <Field
            label="Title"
            value={newTitle}
            onChange={setNewTitle}
            placeholder="Worksheet title"
          />
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Content (HTML)</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border rounded-lg text-xs font-mono text-gray-900 focus:ring-2 focus:ring-amber-400"
              placeholder="<p>Worksheet content as HTML…</p>"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={createWorksheet}
              disabled={saving || !newTitle.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create
            </button>
            <button
              onClick={() => { setAdding(false); setError(''); }}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SubtopicRow — inline editor for a single subtopic + its worksheets
// ─────────────────────────────────────────────────────────────────────────────

function SubtopicRow({
  subtopic,
  onChanged,
}: {
  subtopic: Subtopic;
  onChanged: () => void;
}) {
  const [editing,          setEditing]          = useState(false);
  const [showWorksheets,   setShowWorksheets]   = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [error,            setError]            = useState('');
  const [form, setForm] = useState({
    title:          subtopic.title,
    slug:           subtopic.slug,
    description:    subtopic.description ?? '',
    youtubeVideoId: subtopic.youtubeVideoId ?? '',
    duration:       subtopic.duration != null ? String(subtopic.duration) : '',
    sortOrder:      String(subtopic.sortOrder),
    isActive:       subtopic.isActive,
    isFree:         subtopic.isFree,
  });

  async function save() {
    setSaving(true); setError('');
    try {
      await api('PUT', 'subtopics', subtopic.id, {
        title:          form.title.trim(),
        slug:           form.slug.trim() || toSlug(form.title),
        description:    form.description.trim() || null,
        youtubeVideoId: form.youtubeVideoId.trim() || null,
        duration:       form.duration ? Number(form.duration) : null,
        sortOrder:      Number(form.sortOrder),
        isActive:       form.isActive,
        isFree:         form.isFree,
      });
      setEditing(false);
      onChanged();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function del() {
    if (!confirm(`Delete subtopic "${subtopic.title}"?`)) return;
    setSaving(true);
    try { await api('DELETE', 'subtopics', subtopic.id); onChanged(); }
    catch (e) { setError(String(e)); setSaving(false); }
  }

  return (
    <div className="pl-4 border-l-2 border-slate-200 mt-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowWorksheets(!showWorksheets)}
          className="text-slate-400 hover:text-slate-600"
          title="Toggle worksheets"
        >
          {showWorksheets
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <span className="flex-1 text-sm text-slate-700 font-medium truncate">{subtopic.title}</span>
        {!subtopic.isActive && <span className="text-xs text-red-500">hidden</span>}
        {subtopic.isFree && <span className="text-xs text-emerald-600 font-semibold">free</span>}
        <span className="text-xs text-slate-300">#{subtopic.sortOrder}</span>
        <button
          onClick={() => { setEditing(!editing); setError(''); }}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          {editing ? 'Close' : 'Edit'}
        </button>
        <button onClick={del} disabled={saving} className="text-red-400 hover:text-red-600">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {editing && (
        <div className="mt-2 bg-slate-50 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Title"     value={form.title}     onChange={(v) => setForm({ ...form, title: v })} />
            <Field label="Slug"      value={form.slug}      onChange={(v) => setForm({ ...form, slug: v })} />
          </div>
          <Field label="YouTube Video ID" value={form.youtubeVideoId} onChange={(v) => setForm({ ...form, youtubeVideoId: v })} placeholder="dQw4w9WgXcQ" />
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description (HTML)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg text-xs font-mono text-gray-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Duration (s)" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} type="number" />
            <Field label="Sort order"   value={form.sortOrder} onChange={(v) => setForm({ ...form, sortOrder: v })} type="number" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
              Active
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} className="w-4 h-4" />
              Free
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </button>
            <button onClick={() => { setEditing(false); setError(''); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs">Cancel</button>
          </div>
        </div>
      )}

      {showWorksheets && (
        <WorksheetPanel
          parentType="subtopic"
          parentId={subtopic.id}
          initialWorksheets={subtopic.worksheets}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopicRow — inline editor for a single topic + subtopics + worksheets
// ─────────────────────────────────────────────────────────────────────────────

function TopicRow({
  topic,
  onChanged,
}: {
  topic:     Topic;
  onChanged: () => void;
}) {
  const [expanded,       setExpanded]       = useState(false);
  const [editing,        setEditing]        = useState(false);
  const [showWorksheets, setShowWorksheets] = useState(false);
  const [addingSub,      setAddingSub]      = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');
  const [form, setForm] = useState({
    title:          topic.title,
    slug:           topic.slug,
    description:    topic.description ?? '',
    youtubeVideoId: topic.youtubeVideoId ?? '',
    duration:       topic.duration != null ? String(topic.duration) : '',
    sortOrder:      String(topic.sortOrder),
    isActive:       topic.isActive,
    isFree:         topic.isFree,
  });
  const [newSub, setNewSub] = useState({ title: '', youtubeVideoId: '', isFree: false });

  async function saveTopic() {
    setSaving(true); setError('');
    try {
      await api('PUT', 'topics', topic.id, {
        title:          form.title.trim(),
        slug:           form.slug.trim() || toSlug(form.title),
        description:    form.description.trim() || null,
        youtubeVideoId: form.youtubeVideoId.trim() || null,
        duration:       form.duration ? Number(form.duration) : null,
        sortOrder:      Number(form.sortOrder),
        isActive:       form.isActive,
        isFree:         form.isFree,
      });
      setEditing(false);
      onChanged();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function deleteTopic() {
    if (!confirm(`Delete topic "${topic.title}" and all its subtopics?`)) return;
    setSaving(true);
    try { await api('DELETE', 'topics', topic.id); onChanged(); }
    catch (e) { setError(String(e)); setSaving(false); }
  }

  async function createSubtopic() {
    if (!newSub.title.trim()) return;
    setSaving(true); setError('');
    try {
      await api('POST', 'subtopics', undefined, {
        topicId:        topic.id,
        title:          newSub.title.trim(),
        youtubeVideoId: newSub.youtubeVideoId.trim() || null,
        sortOrder:      topic.subtopics.length,
        isFree:         newSub.isFree,
      });
      setNewSub({ title: '', youtubeVideoId: '', isFree: false });
      setAddingSub(false);
      onChanged();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl mb-3 overflow-hidden">
      {/* Topic header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50">
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <span className="flex-1 font-semibold text-slate-800 truncate">{topic.title}</span>
        <span className="text-xs text-slate-400">{topic.subtopics.length} sub · {topic.worksheets.length} ws</span>
        {!topic.isActive && <span className="text-xs text-red-500 font-medium">hidden</span>}
        {topic.isFree && <span className="text-xs text-emerald-600 font-semibold">free</span>}
        <button
          onClick={() => setShowWorksheets(!showWorksheets)}
          className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
            showWorksheets
              ? 'bg-amber-100 text-amber-800'
              : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700'
          }`}
          title="Toggle topic worksheets"
        >
          WS
        </button>
        <button
          onClick={() => { setEditing(!editing); setError(''); }}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          {editing ? 'Close' : 'Edit'}
        </button>
        <button onClick={deleteTopic} disabled={saving} className="text-red-400 hover:text-red-600">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Topic edit form */}
      {editing && (
        <div className="px-4 py-3 border-t border-slate-100 bg-white">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <Field label="Slug"  value={form.slug}  onChange={(v) => setForm({ ...form, slug: v })} />
          </div>
          <Field label="YouTube Video ID" value={form.youtubeVideoId} onChange={(v) => setForm({ ...form, youtubeVideoId: v })} placeholder="dQw4w9WgXcQ" />
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description (HTML)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg text-xs font-mono text-gray-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Field label="Duration (s)" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} type="number" />
            <Field label="Sort order"   value={form.sortOrder} onChange={(v) => setForm({ ...form, sortOrder: v })} type="number" />
          </div>
          <div className="flex gap-4 mt-1">
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" /> Active
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} className="w-4 h-4" /> Free
            </label>
          </div>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={saveTopic} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </button>
            <button onClick={() => { setEditing(false); setError(''); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Topic worksheets */}
      {showWorksheets && (
        <div className="px-4 py-2 border-t border-amber-100 bg-amber-50/40">
          <WorksheetPanel
            parentType="topic"
            parentId={topic.id}
            initialWorksheets={topic.worksheets}
            onChanged={onChanged}
          />
        </div>
      )}

      {/* Subtopics */}
      {expanded && (
        <div className="px-4 py-3 border-t border-slate-100 bg-white space-y-1">
          {topic.subtopics.length === 0 && (
            <p className="text-xs text-gray-400 italic">No subtopics yet.</p>
          )}
          {topic.subtopics.map((sub) => (
            <SubtopicRow key={sub.id} subtopic={sub} onChanged={onChanged} />
          ))}

          {/* Add subtopic form */}
          {addingSub ? (
            <div className="mt-3 bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
              <Field label="Subtopic title" value={newSub.title} onChange={(v) => setNewSub({ ...newSub, title: v })} placeholder="Subtopic name" />
              <Field label="YouTube Video ID" value={newSub.youtubeVideoId} onChange={(v) => setNewSub({ ...newSub, youtubeVideoId: v })} placeholder="Optional" />
              <label className="flex items-center gap-1.5 text-sm text-gray-700">
                <input type="checkbox" checked={newSub.isFree} onChange={(e) => setNewSub({ ...newSub, isFree: e.target.checked })} className="w-4 h-4" /> Free
              </label>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button onClick={createSubtopic} disabled={saving || !newSub.title.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add subtopic
                </button>
                <button onClick={() => { setAddingSub(false); setError(''); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingSub(true)} className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
              <Plus className="w-3.5 h-3.5" /> Add subtopic
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopicEditor — the exported modal
// ─────────────────────────────────────────────────────────────────────────────

export default function TopicEditor({ chapterId, chapterName, onClose }: TopicEditorProps) {
  const [topics,      setTopics]      = useState<Topic[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [addingTopic, setAddingTopic] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [newTopic, setNewTopic] = useState({ title: '', youtubeVideoId: '', isFree: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch topics with subtopics
      const params = new URLSearchParams({ resource: 'topics', chapterId });
      const res = await fetch(`/api/admin/lms/topics?chapterId=${chapterId}`);
      if (!res.ok) throw new Error('Failed to load topics');
      const raw: Topic[] = await res.json();

      // Fetch worksheets for each topic and subtopic in parallel
      const enriched = await Promise.all(
        raw.map(async (t) => {
          const [topicWs, enrichedSubs] = await Promise.all([
            fetchWorksheets({ topicId: t.id }),
            Promise.all(
              t.subtopics.map(async (s) => ({
                ...s,
                worksheets: await fetchWorksheets({ subtopicId: s.id }),
              })),
            ),
          ]);
          return { ...t, worksheets: topicWs, subtopics: enrichedSubs };
        }),
      );

      setTopics(enriched);
    } catch (e) {
      console.error(e);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => { void load(); }, [load]);

  async function createTopic() {
    if (!newTopic.title.trim()) return;
    setSaving(true); setError('');
    try {
      await api('POST', 'topics', undefined, {
        chapterId,
        title:          newTopic.title.trim(),
        youtubeVideoId: newTopic.youtubeVideoId.trim() || null,
        sortOrder:      topics.length,
        isFree:         newTopic.isFree,
      });
      setNewTopic({ title: '', youtubeVideoId: '', isFree: false });
      setAddingTopic(false);
      await load();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Topics &amp; Worksheets</h2>
            <p className="text-xs text-gray-500 mt-0.5">{chapterName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              {topics.length === 0 && (
                <p className="text-sm text-gray-400 italic mb-4">No topics yet. Add one below.</p>
              )}

              {topics.map((t) => (
                <TopicRow key={t.id} topic={t} onChanged={load} />
              ))}

              {/* Add topic */}
              {addingTopic ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2 mt-2">
                  <Field label="Topic title" value={newTopic.title} onChange={(v) => setNewTopic({ ...newTopic, title: v })} placeholder="Topic name" />
                  <Field label="YouTube Video ID" value={newTopic.youtubeVideoId} onChange={(v) => setNewTopic({ ...newTopic, youtubeVideoId: v })} placeholder="Optional" />
                  <label className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" checked={newTopic.isFree} onChange={(e) => setNewTopic({ ...newTopic, isFree: e.target.checked })} className="w-4 h-4" /> Free
                  </label>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={createTopic} disabled={saving || !newTopic.title.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add topic
                    </button>
                    <button onClick={() => { setAddingTopic(false); setError(''); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTopic(true)}
                  className="mt-2 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Topic
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
