'use client';

// src/app/admin/VideoUploadTab.tsx
//
// Admin UI for uploading a video to Backblaze B2 with full HLS encoding.
//
// Workflow:
//   1. Enter video folder path + filename  (e.g. D:\phyziks_videos\lecture.mp4)
//   2. Search and select the Chapter / Topic / Subtopic
//   3. Click "Process & Upload"
//   4. Real-time SSE log stream shows progress: FFmpeg → B2 Upload → DB set
//   5. "Video is live" when done

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, Upload, CheckCircle, XCircle, Loader2,
  FolderOpen, Video, ChevronRight, RefreshCw, AlertTriangle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  kind:       'chapter' | 'topic' | 'subtopic';
  id:         string;
  label:      string;
  chapterId:  string;
  topicId:    string | null;
  subtopicId: string | null;
  b2Path:     string;
  hasVideo:   boolean;
}

type Status = 'idle' | 'running' | 'done' | 'error';

const KIND_BADGE: Record<SearchResult['kind'], string> = {
  chapter:  'bg-indigo-100 text-indigo-700',
  topic:    'bg-amber-100 text-amber-700',
  subtopic: 'bg-emerald-100 text-emerald-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function VideoUploadTab() {
  // ── Form state ───────────────────────────────────────────────────────────
  const [folder,   setFolder]   = useState('D:\\phyziks_videos');
  const [filename, setFilename] = useState('');

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchQ,    setSearchQ]    = useState('');
  const [results,    setResults]    = useState<SearchResult[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [selected,   setSelected]   = useState<SearchResult | null>(null);

  // ── Process state ────────────────────────────────────────────────────────
  const [status,   setStatus]   = useState<Status>('idle');
  const [logs,     setLogs]     = useState<{ type: string; msg: string }[]>([]);
  const logRef                  = useRef<HTMLDivElement>(null);

  // Auto-scroll log area
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // ── Search debounce ───────────────────────────────────────────────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onSearchChange(v: string) {
    setSearchQ(v);
    setSelected(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (v.trim().length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(() => doSearch(v), 350);
  }

  async function doSearch(q: string) {
    setSearching(true);
    try {
      const res  = await fetch(`/api/admin/video-upload/search?q=${encodeURIComponent(q)}`);
      const data = await res.json() as SearchResult[];
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  // ── Process ───────────────────────────────────────────────────────────────

  async function handleProcess() {
    if (!selected || !filename.trim()) return;

    const videoPath = `${folder.replace(/[/\\]+$/, '')}\\${filename.trim()}`;

    setLogs([]);
    setStatus('running');

    const body = {
      videoPath,
      kind:       selected.kind,
      chapterId:  selected.chapterId,
      topicId:    selected.topicId    ?? undefined,
      subtopicId: selected.subtopicId ?? undefined,
      b2Path:     selected.b2Path,
    };

    try {
      const res = await fetch('/api/admin/video-upload/process', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Read SSE stream
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6)) as { type: string; msg: string };
              setLogs((prev) => [...prev, event]);
              if (event.type === 'done')  setStatus('done');
              if (event.type === 'error') setStatus('error');
            } catch { /* ignore malformed */ }
          }
        }
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setLogs((prev) => [...prev, { type: 'error', msg }]);
      setStatus('error');
    }
  }

  function reset() {
    setStatus('idle');
    setLogs([]);
    setSelected(null);
    setSearchQ('');
    setResults([]);
    setFilename('');
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const videoPath = folder && filename
    ? `${folder.replace(/[/\\]+$/, '')}\\${filename.trim()}`
    : '';

  const canProcess = !!selected && !!filename.trim() && status === 'idle';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Video className="h-5 w-5 text-indigo-600" />
          Video Upload
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Select a video file, choose where to attach it, and click Process. FFmpeg encodes it to
          ABR HLS, uploads to Backblaze B2, and sets the database field — all automatically.
        </p>
      </div>

      {/* Step 1 — Video file */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">1</span>
          Video File
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Folder path</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
              <FolderOpen className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="D:\phyziks_videos"
                className="flex-1 text-sm outline-none bg-transparent text-slate-800"
                disabled={status === 'running'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="lecture.mp4"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
              disabled={status === 'running'}
            />
          </div>
        </div>

        {videoPath && (
          <p className="text-xs text-slate-500 font-mono bg-slate-50 rounded px-3 py-1.5 break-all">
            {videoPath}
          </p>
        )}
      </div>

      {/* Step 2 — Content target */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">2</span>
          Attach to Content
        </h3>

        {/* Search input */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
          {searching
            ? <Loader2 className="h-4 w-4 text-indigo-400 animate-spin flex-shrink-0" />
            : <Search   className="h-4 w-4 text-slate-400 flex-shrink-0" />
          }
          <input
            type="text"
            value={searchQ}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chapter, topic, or subtopic name..."
            className="flex-1 text-sm outline-none bg-transparent text-slate-800"
            disabled={status === 'running'}
          />
          {searchQ && (
            <button onClick={() => { setSearchQ(''); setResults([]); setSelected(null); }}
              className="text-slate-400 hover:text-slate-600">
              ×
            </button>
          )}
        </div>

        {/* Results list */}
        {results.length > 0 && !selected && (
          <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden max-h-64 overflow-y-auto">
            {results.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <button
                  onClick={() => { setSelected(r); setResults([]); }}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors flex items-start gap-3"
                >
                  <span className={`mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${KIND_BADGE[r.kind]}`}>
                    {r.kind}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="text-sm text-slate-800 block truncate">{r.label}</span>
                    <span className="text-xs text-slate-400 font-mono">{r.b2Path}</span>
                  </span>
                  {r.hasVideo && (
                    <span className="flex-shrink-0 text-xs text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> has video
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {searchQ.length >= 2 && results.length === 0 && !searching && (
          <p className="text-sm text-slate-400 text-center py-2">No results for "{searchQ}"</p>
        )}

        {/* Selected item */}
        {selected && (
          <div className="rounded-lg border-2 border-indigo-300 bg-indigo-50 px-4 py-3 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${KIND_BADGE[selected.kind]}`}>
                  {selected.kind}
                </span>
                {selected.hasVideo && (
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> will overwrite existing video
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-800 mt-1">{selected.label}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{selected.b2Path}</p>
            </div>
            {status === 'idle' && (
              <button onClick={() => { setSelected(null); setSearchQ(''); }}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Step 3 — Process button */}
      <div className="flex items-center gap-3">
        {status === 'idle' && (
          <button
            onClick={handleProcess}
            disabled={!canProcess}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white font-semibold rounded-xl shadow-sm transition-colors text-sm"
          >
            <Upload className="h-4 w-4" />
            Process &amp; Upload
          </button>
        )}

        {status === 'running' && (
          <button disabled
            className="flex items-center gap-2 px-6 py-3 bg-indigo-400 text-white font-semibold rounded-xl shadow-sm text-sm cursor-not-allowed">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </button>
        )}

        {(status === 'done' || status === 'error') && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200
              text-slate-700 font-semibold rounded-xl shadow-sm transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Upload another
          </button>
        )}

        {status === 'done' && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
            <CheckCircle className="h-4 w-4" /> Video is live!
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
            <XCircle className="h-4 w-4" /> Failed — see log below
          </span>
        )}
      </div>

      {/* Log output */}
      {logs.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
              Process Log
            </span>
            <span className="text-xs text-slate-500">{logs.length} lines</span>
          </div>
          <div
            ref={logRef}
            className="p-4 overflow-y-auto max-h-80 space-y-0.5 font-mono text-xs"
          >
            {logs.map((l, i) => (
              <p
                key={i}
                className={
                  l.type === 'error' ? 'text-red-400' :
                  l.type === 'done'  ? 'text-emerald-400 font-bold' :
                  l.msg.startsWith('✅') ? 'text-emerald-400' :
                  l.msg.startsWith('🎉') ? 'text-emerald-400 font-bold' :
                  l.msg.startsWith('❌') ? 'text-red-400' :
                  l.msg.startsWith('🎬') || l.msg.startsWith('☁️') || l.msg.startsWith('💾')
                    ? 'text-indigo-300 font-semibold mt-2' :
                  'text-slate-300'
                }
              >
                {l.msg}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
