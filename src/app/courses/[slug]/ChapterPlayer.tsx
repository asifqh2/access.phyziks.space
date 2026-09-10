'use client';

// src/app/courses/[slug]/ChapterPlayer.tsx
//
// The main content area of the LMS.
//
// Video hosting modes (priority order):
//   1. B2 HLS (b2VideoKey set)  — Backblaze B2 → Cloudflare Worker → hls.js
//   2. R2/S3 (videoKey set)     — Cloudflare R2 presigned URL → <video>
//   3. YouTube (youtubeUrl/Id)  — youtube-nocookie.com iframe
//
// Content protection (B2 HLS and R2 videos only):
//   - Right-click disabled — no "Save video as"
//   - Download button hidden — controlsList="nodownload noremoteplayback"
//   - Custom controls replace native ones — eliminates Chrome/Edge download button
//   - Picture-in-Picture disabled
//   - Video pauses + blurs on tab switch, window blur, or screen-share UI
//   - Semi-transparent watermark (userId) — traceable if screen-recorded
//   - Drag-to-save blocked
//   NOTE: Browser-side measures deter casual copying. External screen-capture
//   software (OBS etc.) cannot be blocked by JavaScript.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  PlayCircle, Loader2, AlertCircle, ChevronRight, ClipboardList,
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import type { ActiveItem } from './ActiveSubtopicContext';
import type { CourseChapter, CourseTopic, CourseSubtopic, CourseWorksheet } from './CourseLayout';
import ContentRenderer from '@/components/ContentRenderer';
import DescriptionPdfButton from '@/components/DescriptionPdfButton';
import WorksheetAccordion from '@/components/WorksheetAccordion';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function ytEmbed(videoId: string) {
  return (
    `https://www.youtube-nocookie.com/embed/${videoId}` +
    `?rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Watermark overlay
// Diagonal tiled user ID overlay — traceable if screen-recorded.
// ─────────────────────────────────────────────────────────────────────────────

function Watermark({ userId }: { userId: string }) {
  const label = `phyziks·${userId.slice(-8)}`;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20"
      style={{ mixBlendMode: 'overlay' }}
    >
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 4 }).map((_, col) => (
          <span
            key={`${row}-${col}`}
            className="absolute text-white/20 font-mono whitespace-nowrap"
            style={{
              top:       `${row * 18 + 5}%`,
              left:      `${col * 28 - 5}%`,
              transform: 'rotate(-25deg)',
              fontSize:  '11px',
              letterSpacing: '0.05em',
            }}
          >
            {label}
          </span>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen-capture / visibility guard
// Pauses + blurs on tab switch only.
// Deliberately does NOT listen to window.blur — that fires when the user
// interacts with the volume slider, speed menu, or any other in-page control,
// which would incorrectly pause the video.
// ─────────────────────────────────────────────────────────────────────────────

function useVisibilityGuard(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled:  boolean,
) {
  const [guarded, setGuarded] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    function onHide() {
      videoRef.current?.pause();
      setGuarded(true);
    }
    function onShow() {
      setGuarded(false);
    }

    // Only react to actual tab/window visibility — NOT window.blur/focus
    // (blur fires on every focus change inside the page, including sliders)
    const onVisChange = () => { if (document.hidden) onHide(); else onShow(); };

    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [enabled, videoRef]);

  return guarded;
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom video controls
// Replaces native browser controls to eliminate the download button present
// in Chrome and Edge's native control bar.
// Features: play/pause, ±10 s skip, volume, seek bar, speed, fullscreen.
// ─────────────────────────────────────────────────────────────────────────────

interface CustomControlsProps {
  videoRef:     React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  lastVolumeRef: React.MutableRefObject<number>;
  title:        string;
  visible:      boolean;             // controlled by parent (ProtectedVideoShell)
  onActivity:   () => void;          // call to reset the hide timer
}

function CustomControls({ videoRef, containerRef, lastVolumeRef, title, visible, onActivity }: CustomControlsProps) {
  const [playing,    setPlaying]    = useState(false);
  const [muted,      setMuted]      = useState(false);
  const [volume,     setVolume]     = useState(1);
  const [current,    setCurrent]    = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [buffered,   setBuffered]   = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSpeed,  setShowSpeed]  = useState(false);
  const [speed,      setSpeed]      = useState(1);

  // Close speed menu whenever controls hide (bug: menu stays open invisibly)
  useEffect(() => {
    if (!visible) setShowSpeed(false);
  }, [visible]);

  // Track position ref — drives the visual track synchronously so skip()
  // updates are reflected immediately without waiting for a React re-render.
  const currentRef = useRef(0);
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Attach video event listeners. We use a MutationObserver / polling fallback
  // because videoRef.current may be null on first render (hls.js attaches the
  // src asynchronously). We retry until the video element is ready.
  useEffect(() => {
    let cancelled = false;

    function attach(v: HTMLVideoElement) {
      // Sync initial state — video may already have metadata loaded
      if (v.readyState >= 1) {
        setDuration(v.duration);
        setCurrent(v.currentTime);
        currentRef.current = v.currentTime;
      }
      if (!v.paused) setPlaying(true);
      setMuted(v.muted);
      setVolume(v.volume);
      if (v.volume > 0) lastVolumeRef.current = v.volume;

      const onPlay     = () => setPlaying(true);
      const onPause    = () => setPlaying(false);
      const onVolume   = () => {
        setMuted(v.muted);
        setVolume(v.volume);
        if (v.volume > 0) lastVolumeRef.current = v.volume;
      };
      const onTime     = () => {
        currentRef.current = v.currentTime;
        setCurrent(v.currentTime);
      };
      // loadedmetadata fires when duration becomes known
      const onLoaded   = () => {
        setDuration(v.duration);
        setCurrent(v.currentTime);
        currentRef.current = v.currentTime;
      };
      // durationchange fires if duration updates (e.g. live → VOD handoff)
      const onDuration = () => setDuration(v.duration);
      const onProgress = () => {
        if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
      };
      const onFSChange = () => setFullscreen(!!document.fullscreenElement);

      v.addEventListener('play',            onPlay);
      v.addEventListener('pause',           onPause);
      v.addEventListener('volumechange',    onVolume);
      v.addEventListener('timeupdate',      onTime);
      v.addEventListener('loadedmetadata',  onLoaded);
      v.addEventListener('durationchange',  onDuration);
      v.addEventListener('progress',        onProgress);
      document.addEventListener('fullscreenchange', onFSChange);

      return () => {
        v.removeEventListener('play',            onPlay);
        v.removeEventListener('pause',           onPause);
        v.removeEventListener('volumechange',    onVolume);
        v.removeEventListener('timeupdate',      onTime);
        v.removeEventListener('loadedmetadata',  onLoaded);
        v.removeEventListener('durationchange',  onDuration);
        v.removeEventListener('progress',        onProgress);
        document.removeEventListener('fullscreenchange', onFSChange);
      };
    }

    // If the video element is already in the ref, attach immediately
    if (videoRef.current) {
      const cleanup = attach(videoRef.current);
      return () => { cancelled = true; cleanup(); };
    }

    // Otherwise poll every 100 ms until it appears (hls.js async attach)
    let detach: (() => void) | null = null;
    const interval = setInterval(() => {
      if (cancelled) { clearInterval(interval); return; }
      if (videoRef.current) {
        clearInterval(interval);
        detach = attach(videoRef.current);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(interval);
      detach?.();
    };
  }, [videoRef]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted || v.volume === 0) {
      v.volume = lastVolumeRef.current || 1;
      v.muted = false;
    } else {
      if (v.volume > 0) lastVolumeRef.current = v.volume;
      v.muted = true;
    }
  }

  function onVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    if (val > 0) lastVolumeRef.current = val;
    v.volume = val;
    v.muted  = val === 0;
  }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.currentTime      = val;
    currentRef.current = val;
    setCurrent(val);
  }

  function skip(secs: number) {
    const v = videoRef.current;
    if (!v) return;
    const next = Math.max(0, Math.min(v.duration, v.currentTime + secs));
    v.currentTime    = next;
    // Update state immediately so the track animates right away
    currentRef.current = next;
    setCurrent(next);
  }

  function setPlaybackSpeed(s: number) {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setShowSpeed(false);
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  const progressPct = duration > 0 ? (current  / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-30 transition-opacity duration-300
        ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

      <div className="relative px-3 pb-3 pt-6 space-y-2">
        {/* ── Timeline / seek bar ───────────────────────────────────────────
            Always visible as a coloured track. The native range input sits
            on top (transparent) to handle mouse/touch events.
            On hover the track grows taller and the thumb dot appears.       */}
        <div className="relative flex items-center h-5 cursor-pointer group/seek" onClick={onActivity}>
          {/* Track background */}
          <div className="absolute inset-x-0 h-1 group-hover/seek:h-1.5 transition-all duration-150 rounded-full bg-white/20 top-1/2 -translate-y-1/2">
            {/* Buffered */}
            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufferedPct}%` }} />
            {/* Played */}
            <div className="absolute inset-y-0 left-0 bg-indigo-400 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Thumb dot — always visible, grows on hover */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2
              w-2.5 h-2.5 group-hover/seek:w-3.5 group-hover/seek:h-3.5
              bg-white rounded-full shadow-md transition-all duration-150 pointer-events-none z-10"
            style={{ left: `${progressPct}%` }}
          />

          {/* Native range input — invisible but handles all interaction */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={current}
            onChange={onSeek}
            onMouseDown={onActivity}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            aria-label="Seek"
          />
        </div>

        {/* ── Controls row ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-white">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="p-1.5 hover:text-indigo-300 transition-colors flex-shrink-0"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing
              ? <Pause className="h-5 w-5 fill-current" />
              : <Play  className="h-5 w-5 fill-current" />}
          </button>

          {/* ── Rewind 10 s ── */}
          <button
            onClick={() => { skip(-10); onActivity(); }}
            className="flex items-center justify-center gap-0.5 px-1.5 py-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Back 10 seconds"
            title="Back 10 seconds (←)"
          >
            {/* Rewind icon: circular arrow CCW + label */}
            <svg viewBox="0 0 20 20" className="h-4 w-4 flex-shrink-0" fill="none" aria-hidden="true">
              <path d="M3.5 10A6.5 6.5 0 1 0 5.3 5.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <polyline points="2,4.5 5.3,5.7 4.1,9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[10px] font-bold leading-none select-none">10</span>
          </button>

          {/* ── Fast-forward 10 s ── */}
          <button
            onClick={() => { skip(10); onActivity(); }}
            className="flex items-center justify-center gap-0.5 px-1.5 py-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Forward 10 seconds"
            title="Forward 10 seconds (→)"
          >
            <span className="text-[10px] font-bold leading-none select-none">10</span>
            {/* Fast-forward icon: circular arrow CW + label */}
            <svg viewBox="0 0 20 20" className="h-4 w-4 flex-shrink-0" fill="none" aria-hidden="true">
              <path d="M16.5 10A6.5 6.5 0 1 1 14.7 5.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <polyline points="18,4.5 14.7,5.7 15.9,9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1 group/vol flex-shrink-0">
            <button
              onClick={toggleMute}
              className="p-1 hover:text-indigo-300 transition-colors"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={onVolumeChange}
              className="h-1 w-16 accent-indigo-400 cursor-pointer sm:w-0 sm:transition-all sm:duration-200 sm:group-hover/vol:w-16"
              aria-label="Volume"
            />
          </div>

          {/* Timestamp */}
          <span className="text-xs text-white/80 tabular-nums ml-1 select-none hidden sm:inline">
            {formatTime(current)} / {formatTime(duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Playback speed */}
          <div className="relative">
            <button
              onClick={() => { setShowSpeed((s) => !s); onActivity(); }}
              className="p-1 text-xs font-semibold hover:text-indigo-300 transition-colors flex items-center gap-1"
              aria-label="Playback speed"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{speed}×</span>
            </button>
            {showSpeed && (
              <div className="absolute bottom-8 right-0 bg-slate-900/95 border border-slate-700 rounded-lg overflow-hidden text-sm shadow-lg min-w-[72px]">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`block w-full px-4 py-1.5 text-left hover:bg-indigo-600/30 transition-colors
                      ${speed === s ? 'text-indigo-400 font-bold' : 'text-white'}`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="p-1 hover:text-indigo-300 transition-colors" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Centre play/pause flash indicator
// Briefly shows a large play/pause icon in the centre when clicking the video.
// ─────────────────────────────────────────────────────────────────────────────

function CentrePlayIndicator({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const [show, setShow]   = useState<'play' | 'pause' | null>(null);
  const timer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    function attach(v: HTMLVideoElement) {
      const flash = (kind: 'play' | 'pause') => {
        if (cancelled) return;
        setShow(kind);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setShow(null), 600);
      };
      const onPlay  = () => flash('play');
      const onPause = () => flash('pause');
      v.addEventListener('play',  onPlay);
      v.addEventListener('pause', onPause);
      return () => {
        v.removeEventListener('play',  onPlay);
        v.removeEventListener('pause', onPause);
      };
    }

    let detach: (() => void) | null = null;

    if (videoRef.current) {
      detach = attach(videoRef.current);
    } else {
      const interval = setInterval(() => {
        if (cancelled) { clearInterval(interval); return; }
        if (videoRef.current) {
          clearInterval(interval);
          detach = attach(videoRef.current);
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(interval);
        detach?.();
        if (timer.current) clearTimeout(timer.current);
      };
    }

    return () => {
      cancelled = true;
      detach?.();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [videoRef]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-[25] pointer-events-none">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm animate-ping-once">
        {show === 'play'
          ? <Play  className="h-8 w-8 text-white fill-white" />
          : <Pause className="h-8 w-8 text-white fill-white" />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProtectedVideoShell
// Wraps any <video> with right-click block, keyboard block, visibility guard,
// watermark, custom controls, and blur-on-tab-switch.
// ─────────────────────────────────────────────────────────────────────────────

interface ProtectedVideoShellProps {
  videoRef:    React.RefObject<HTMLVideoElement | null>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  title:       string;
  userId:      string;
  loading:     boolean;
  error:       string | null;
  onRetry?:    () => void;
  children:    React.ReactNode;
}

function ProtectedVideoShell({
  videoRef, containerRef: containerRefProp, title, userId, loading, error, onRetry, children,
}: ProtectedVideoShellProps) {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  // Use the caller-supplied ref if provided; otherwise fall back to the internal one.
  const containerRef = (containerRefProp ?? internalContainerRef) as React.RefObject<HTMLDivElement>;
  const guarded      = useVisibilityGuard(videoRef, !loading && !error);

  // ── Controls visibility — managed here so the WHOLE player triggers it ───
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedRef = useRef(true);
  const lastVolumeRef = useRef(1);

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (isPausedRef.current) return; // never auto-hide when paused
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []); // stable — uses refs, no deps needed

  // Sync isPausedRef and show controls on pause/play
  useEffect(() => {
    let cancelled = false;

    function attach(v: HTMLVideoElement) {
      isPausedRef.current = v.paused;
      const onPause = () => {
        if (cancelled) return;
        isPausedRef.current = true;
        setControlsVisible(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
      };
      const onPlay = () => {
        if (cancelled) return;
        isPausedRef.current = false;
        resetHideTimer();
      };
      v.addEventListener('pause', onPause);
      v.addEventListener('play',  onPlay);
      return () => {
        v.removeEventListener('pause', onPause);
        v.removeEventListener('play',  onPlay);
      };
    }

    let detach: (() => void) | null = null;
    if (videoRef.current) {
      detach = attach(videoRef.current);
    } else {
      const interval = setInterval(() => {
        if (cancelled) { clearInterval(interval); return; }
        if (videoRef.current) { clearInterval(interval); detach = attach(videoRef.current); }
      }, 100);
      return () => { cancelled = true; clearInterval(interval); detach?.(); };
    }
    return () => { cancelled = true; detach?.(); };
  }, [videoRef, resetHideTimer]);

  // Show controls when video first becomes ready
  useEffect(() => {
    if (!loading && !error) {
      setControlsVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [loading, error]);

  // ── Click-to-play-pause on video area ────────────────────────────────────
  function handleVideoClick(e: React.MouseEvent) {
    // Don't intercept clicks on the controls bar itself
    const target = e.target as HTMLElement;
    if (target.closest('[data-controls]')) return;
    const v = videoRef.current;
    if (!v) return;
    resetHideTimer();
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    const v = videoRef.current;
    if (!v) return;

    // Block browser shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (['s', 'u', 'i', 'j'].includes(e.key.toLowerCase())) e.preventDefault();
      return;
    }

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        resetHideTimer();
        if (v.paused) v.play().catch(() => {}); else v.pause();
        break;
      case 'ArrowRight':
        e.preventDefault();
        v.currentTime = Math.min(v.duration, v.currentTime + 10);
        resetHideTimer();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        v.currentTime = Math.max(0, v.currentTime - 10);
        resetHideTimer();
        break;
      case 'ArrowUp':
        e.preventDefault();
        v.volume = Math.min(1, v.volume + 0.1);
        if (v.volume > 0) {
          lastVolumeRef.current = v.volume;
          v.muted = false;
        }
        resetHideTimer();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (v.volume > 0) lastVolumeRef.current = v.volume;
        v.volume = Math.max(0, v.volume - 0.1);
        v.muted = v.volume === 0;
        resetHideTimer();
        break;
      case 'm':
        e.preventDefault();
        if (v.muted || v.volume === 0) {
          v.volume = lastVolumeRef.current || 1;
          v.muted = false;
        } else {
          if (v.volume > 0) lastVolumeRef.current = v.volume;
          v.muted = true;
        }
        resetHideTimer();
        break;
      case 'f':
        e.preventDefault();
        if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
        resetHideTimer();
        break;
    }
  }

  function blockContextMenu(e: React.MouseEvent) { e.preventDefault(); }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`w-full aspect-video bg-slate-900 rounded-xl sm:rounded-2xl overflow-hidden relative group select-none outline-none
        ${controlsVisible ? 'cursor-default' : 'cursor-none'}`}
      onContextMenu={blockContextMenu}
      onKeyDown={handleKeyDown}
      onMouseMove={resetHideTimer}
      onMouseEnter={resetHideTimer}
      onMouseLeave={() => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        if (!isPausedRef.current) setControlsVisible(false);
      }}
      onTouchStart={resetHideTimer}
      onClick={handleVideoClick}
    >
      {/* Tab-switch / blur guard overlay */}
      {guarded && (
        <div className="absolute inset-0 z-40 backdrop-blur-xl bg-slate-900/70 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Play className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="text-slate-300 text-sm font-medium">Click to resume</p>
          <button
            onClick={() => videoRef.current?.play().catch(() => {})}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            Resume
          </button>
        </div>
      )}

      {/* Watermark */}
      {!loading && !error && <Watermark userId={userId} />}

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
          <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
          <p className="text-slate-300 text-sm">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              <Loader2 className="h-4 w-4" />
              Retry video
            </button>
          )}
        </div>
      )}

      {/* Video element */}
      {children}

      {/* Centre play/pause flash indicator */}
      {!loading && !error && (
        <CentrePlayIndicator videoRef={videoRef} />
      )}

      {/* Custom controls — full width, positioned at bottom, data-controls prevents click-to-pause */}
      {!loading && !error && (
        <div data-controls>
          <CustomControls
            videoRef={videoRef}
            containerRef={containerRef}
            lastVolumeRef={lastVolumeRef}
            title={title}
            visible={controlsVisible}
            onActivity={resetHideTimer}
          />
        </div>
      )}

      {/* Drag-block overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none" draggable={false} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YouTube iframe
// ─────────────────────────────────────────────────────────────────────────────

function YouTubeFrame({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative h-full w-full">
      <iframe
        className="h-full w-full"
        src={src}
        title={title}
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
      {/* Block top title bar link */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-11 pointer-events-auto"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HLS player (Backblaze B2 → Cloudflare Worker → hls.js)
// ─────────────────────────────────────────────────────────────────────────────

interface HlsPlayerProps {
  tokenUrl:    string;
  title:       string;
  topicId?:    string;
  subtopicId?: string;
}

function HlsPlayer({ tokenUrl, title, topicId, subtopicId }: HlsPlayerProps) {
  const videoRef              = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { userId }            = useAuth();
  // Hold the HLS instance in a ref so it can be destroyed synchronously on cleanup
  const hlsRef                = useRef<import('hls.js').default | null>(null);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      setLoading(true);
      setError(null);

      // ── Fetch signed HLS token from Next.js API ──────────────────────────
      let hlsUrl: string;
      try {
        const res  = await fetch(tokenUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            ...(topicId    ? { topicId }    : {}),
            ...(subtopicId ? { subtopicId } : {}),
          }),
        });
        const data = await res.json() as { hlsUrl?: string; error?: string };
        if (!res.ok || !data.hlsUrl) throw new Error(data.error ?? 'Failed to load video.');
        hlsUrl = data.hlsUrl;
      } catch (err) {
        if (!destroyed) setError(err instanceof Error ? err.message : 'Failed to load video.');
        setLoading(false);
        return;
      }

      if (destroyed || !videoRef.current) return;

      const video = videoRef.current;
      video.disablePictureInPicture = true;

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari — native HLS
        video.src = hlsUrl;
        video.addEventListener('loadedmetadata', () => { if (!destroyed) setLoading(false); }, { once: true });
        video.addEventListener('error', () => {
          if (!destroyed) { setError('Failed to load video.'); setLoading(false); }
        }, { once: true });
      } else {
        // Chrome / Firefox / Edge — hls.js
        const { default: Hls } = await import('hls.js');
        if (!Hls.isSupported()) {
          setError('Your browser does not support HLS video playback.');
          setLoading(false);
          return;
        }

        // Guard: component may have unmounted while we were awaiting the import
        if (destroyed || !videoRef.current) return;

        const hls = new Hls({
          startLevel:             -1,           // -1 = auto ABR picks the best starting level
          abrEwmaDefaultEstimate: 5_000_000,    // assume 5 Mbps initial bandwidth
          abrBandWidthFactor:     0.9,
          abrBandWidthUpFactor:   0.7,
          maxBufferLength:        30,
          maxMaxBufferLength:     60,
        });

        // Store in ref so the cleanup closure can destroy it synchronously
        hlsRef.current = hls;

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!destroyed) {
            setLoading(false);
            video.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && !destroyed) {
            setError('Video playback error. Please refresh and try again.');
            setLoading(false);
            hls.destroy();
            hlsRef.current = null;
          }
        });
      }
    }

    init();

    // Cleanup runs synchronously on unmount / dep change.
    // hlsRef holds the instance even if init() hasn't resolved yet — safe to call destroy().
    return () => {
      destroyed = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenUrl, topicId, subtopicId, retryCount]);

  return (
    <ProtectedVideoShell
      videoRef={videoRef}
      title={title}
      userId={userId ?? 'guest'}
      loading={loading}
      error={error}
      onRetry={() => setRetryCount((count) => count + 1)}
    >
      <video
        ref={videoRef}
        className="w-full h-full bg-black"
        playsInline
        disablePictureInPicture
        controlsList="nodownload noremoteplayback"
        aria-label={title}
        style={{ display: loading || error ? 'none' : 'block' }}
        onDragStart={(e) => e.preventDefault()}
      />
    </ProtectedVideoShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter intro video loader
// Resolves which video type to show and delegates to the right component.
// ─────────────────────────────────────────────────────────────────────────────

interface VideoApiData {
  type:            'b2-hls' | 'youtube' | 'r2';
  tokenUrl?:       string;
  youtubeVideoId?: string;
  url?:            string;
  isPermanent:     boolean;
  accessExpiresAt: string | null;
}

function ChapterIntroVideo({ chapter }: { chapter: CourseChapter }) {
  const [data,    setData]    = useState<VideoApiData | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const { userId }            = useAuth();
  // Ref used by ProtectedVideoShell for R2 videos
  const r2VideoRef            = useRef<HTMLVideoElement>(null);

  const hasVideo = !!(chapter.b2VideoKey || chapter.videoKey || chapter.youtubeUrl);

  useEffect(() => {
    if (!hasVideo) { setLoading(false); return; }
    fetch(`/api/videos/${chapter.id}/play`)
      .then(async (res) => {
        const json = await res.json() as VideoApiData & { error?: string };
        if (!res.ok) throw new Error(json.error ?? 'Failed to load video.');
        setData(json);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load video.'))
      .finally(() => setLoading(false));
  }, [chapter.id, chapter.b2VideoKey, chapter.videoKey, chapter.youtubeUrl, hasVideo, retryCount]);

  // ── No video yet ──────────────────────────────────────────────────────────
  if (!hasVideo) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center p-4 sm:p-8">
        <PlayCircle className="h-10 w-10 sm:h-14 sm:w-14 text-indigo-400 mb-3" />
        <p className="text-white font-semibold text-base sm:text-lg">{chapter.name}</p>
        <p className="text-slate-400 text-sm mt-2">
          Select a topic or subtopic from the sidebar to start watching.
        </p>
      </div>
    );
  }

  // ── B2 HLS ────────────────────────────────────────────────────────────────
  if (!loading && !error && data?.type === 'b2-hls' && data.tokenUrl) {
    return (
      <HlsPlayer key={data.tokenUrl} tokenUrl={data.tokenUrl} title={chapter.name} />
    );
  }

  // ── R2 presigned URL ──────────────────────────────────────────────────────
  if (!loading && !error && data?.type === 'r2' && data.url) {
    return (
      <ProtectedVideoShell
        videoRef={r2VideoRef}
        title={chapter.name}
        userId={userId ?? 'guest'}
        loading={false}
        error={null}
      >
        <video
          ref={r2VideoRef}
          className="w-full h-full bg-black"
          src={data.url}
          playsInline
          autoPlay
          disablePictureInPicture
          controlsList="nodownload noremoteplayback"
          aria-label={chapter.name}
          style={{ display: 'block' }}
          onDragStart={(e) => e.preventDefault()}
        />
      </ProtectedVideoShell>
    );
  }

  // ── Loading / error / YouTube ─────────────────────────────────────────────
  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl sm:rounded-2xl overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        </div>
      )}
      {!loading && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
          <p className="text-slate-300 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            <Loader2 className="h-4 w-4" />
            Retry video
          </button>
        </div>
      )}
      {!loading && !error && data?.type === 'youtube' && data.youtubeVideoId && (
        <YouTubeFrame src={ytEmbed(data.youtubeVideoId)} title={chapter.name} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline video (topic / subtopic)
// ─────────────────────────────────────────────────────────────────────────────

interface InlineVideoProps {
  item:       CourseTopic | CourseSubtopic;
  title:      string;
  chapterId:  string;
  kind:       'topic' | 'subtopic';
}

function InlineVideo({ item, title, chapterId, kind }: InlineVideoProps) {
  if (item.b2VideoKey) {
    const tokenUrl = `/api/videos/${chapterId}/token`;
    const extra    = kind === 'topic' ? { topicId: item.id } : { subtopicId: item.id };
    return <HlsPlayer key={item.id} tokenUrl={tokenUrl} title={title} {...extra} />;
  }

  if (item.youtubeVideoId) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-xl sm:rounded-2xl overflow-hidden">
        <YouTubeFrame src={ytEmbed(item.youtubeVideoId)} title={title} />
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nothing selected placeholder
// ─────────────────────────────────────────────────────────────────────────────

function NothingPlaying({ chapterName }: { chapterName: string }) {
  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center p-4 sm:p-8">
      <PlayCircle className="h-10 w-10 sm:h-14 sm:w-14 text-indigo-400/60 mb-4" />
      <p className="text-slate-400 text-sm max-w-xs">
        Pick a topic or subtopic from the sidebar to start watching.
      </p>
      <p className="text-slate-500 text-xs mt-2 italic">{chapterName}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChapterPlayer — main export
// ─────────────────────────────────────────────────────────────────────────────

interface ChapterPlayerProps {
  chapter:    CourseChapter;
  activeItem: ActiveItem | null;
}

export default function ChapterPlayer({ chapter, activeItem }: ChapterPlayerProps) {
  let playingTopic:    CourseTopic    | undefined;
  let playingSubtopic: CourseSubtopic | undefined;
  let playingTitle  = chapter.name;
  let playingLabel: string | null = null;

  if (activeItem?.kind === 'topic') {
    playingTopic = chapter.topics.find((t) => t.id === activeItem.id);
    if (playingTopic) {
      playingTitle = playingTopic.title;
      playingLabel = chapter.name;
    }
  } else if (activeItem?.kind === 'subtopic') {
    for (const t of chapter.topics) {
      const sub = t.subtopics.find((s) => s.id === activeItem.id);
      if (sub) {
        playingSubtopic = sub;
        playingTitle    = sub.title;
        playingLabel    = `${chapter.name}  ›  ${t.title}`;
        break;
      }
    }
  }

  const hasTopicVideo    = !!playingTopic    && !!(playingTopic.b2VideoKey    || playingTopic.youtubeVideoId);
  const hasSubtopicVideo = !!playingSubtopic && !!(playingSubtopic.b2VideoKey || playingSubtopic.youtubeVideoId);
  const hasChapterVideo  = !!(chapter.b2VideoKey || chapter.videoKey || chapter.youtubeUrl);

  return (
    <div className="space-y-4">
      {/* Breadcrumb hint */}
      {playingLabel && (
        <p className="text-xs text-slate-400 flex items-center gap-1 flex-wrap">
          {playingLabel.split('  ›  ').map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span>{part}</span>
            </span>
          ))}
        </p>
      )}

      {/* Video area */}
      {activeItem === null ? (
        hasChapterVideo
          ? <ChapterIntroVideo chapter={chapter} />
          : <NothingPlaying chapterName={chapter.name} />
      ) : activeItem.kind === 'chapter' ? (
        <ChapterIntroVideo chapter={chapter} />
      ) : activeItem.kind === 'topic' && playingTopic && hasTopicVideo ? (
        <InlineVideo
          key={playingTopic.id}
          item={playingTopic}
          title={playingTitle}
          chapterId={chapter.id}
          kind="topic"
        />
      ) : activeItem.kind === 'subtopic' && playingSubtopic && hasSubtopicVideo ? (
        <InlineVideo
          key={playingSubtopic.id}
          item={playingSubtopic}
          title={playingTitle}
          chapterId={chapter.id}
          kind="subtopic"
        />
      ) : (
        <NothingPlaying chapterName={chapter.name} />
      )}

      {/* Title + description */}
      <div className="mt-4">
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug break-words">
          {playingTitle}
        </h1>

        {(activeItem === null || activeItem?.kind === 'chapter') && chapter.description && (
          <DescriptionBlock
            contentId={`desc-chapter-${chapter.id}`}
            title={chapter.name}
            description={chapter.description}
            worksheets={chapter.worksheets}
          />
        )}

        {activeItem?.kind === 'topic' && (() => {
          const topic = chapter.topics.find(t => t.id === activeItem.id);
          return topic?.description ? (
            <DescriptionBlock
              contentId={`desc-topic-${topic.id}`}
              title={topic.title}
              description={topic.description}
              worksheets={topic.worksheets}
            />
          ) : null;
        })()}

        {activeItem?.kind === 'subtopic' && (() => {
          for (const t of chapter.topics) {
            const sub = t.subtopics.find(s => s.id === activeItem.id);
            if (sub?.description) return (
              <DescriptionBlock
                contentId={`desc-subtopic-${sub.id}`}
                title={sub.title}
                description={sub.description}
                worksheets={sub.worksheets}
              />
            );
          }
          return null;
        })()}
      </div>

      {chapter.testPanelEnabled && (
        <TakeTestBanner chapterSlug={chapter.slug} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DescriptionBlock
// Collapsible notes/description panel with PDF export button.
// ─────────────────────────────────────────────────────────────────────────────

interface DescriptionBlockProps {
  contentId:   string;
  title:       string;
  description: string;
  worksheets:  CourseWorksheet[];
}

function DescriptionBlock({ contentId, title, description, worksheets }: DescriptionBlockProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left group"
          aria-expanded={open}
        >
          <ChevronRight
            className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200
              ${open ? 'rotate-90' : ''}`}
          />
          <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
            Notes
          </span>
        </button>
        <DescriptionPdfButton contentId={contentId} title={title} />
      </div>

      <div
        className={`transition-all duration-200 overflow-hidden
          ${open ? 'max-h-[none] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
      >
        <div className="px-3 sm:px-4 py-4 overflow-x-auto">
          <div id={contentId}>
            <ContentRenderer content={description} />
          </div>
        </div>
      </div>

      {worksheets.length > 0 && (
        <div className="border-t border-slate-200">
          <WorksheetAccordion worksheets={worksheets} parentTitle={title} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TakeTestBanner
// ─────────────────────────────────────────────────────────────────────────────

function TakeTestBanner({ chapterSlug }: { chapterSlug: string }) {
  return (
    <Link
      href={`/courses/${chapterSlug}/exam`}
      className="mt-4 flex items-center gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border-2 border-violet-200
        bg-gradient-to-r from-violet-50 to-purple-50 px-4 sm:px-5 py-3 sm:py-4
        hover:border-violet-400 hover:shadow-md transition-all group"
    >
      <div className="flex-shrink-0 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-violet-100 group-hover:bg-violet-200 transition-colors">
        <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-violet-900">Test Your Knowledge</p>
        <p className="text-xs text-violet-600 mt-0.5">
          Practice exams available for this chapter — test yourself topic by topic.
        </p>
      </div>
      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-violet-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}
