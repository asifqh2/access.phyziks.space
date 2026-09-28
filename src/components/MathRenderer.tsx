'use client';

// src/components/MathRenderer.tsx

import { useLayoutEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Render all math in an HTML string and return the result.
 * Pure string → string; never reads from the DOM.
 */
function renderMathInHtml(rawContent: string): string {
  let html: string;
  if (typeof document !== 'undefined') {
    const ta = document.createElement('textarea');
    ta.innerHTML = rawContent;
    html = ta.value;
  } else {
    html = rawContent;
  }

  html = html.replace(/\\\\/g, '\\');

  // ── 1. TipTap data-type format ────────────────────────────────────────────
  html = html.replace(
    /<div[^>]*data-type="math-display"[^>]*data-content="([^"]{1,1000})"[^>]*>[\s\S]*?<\/div>/g,
    (_match, rawLatex) => {
      try {
        const latex = rawLatex.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        if (!latex) return _match;
        return `<div class="katex-display-block">${katex.renderToString(latex, { displayMode: true, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100 })}</div>`;
      } catch { return `<div class="math-error">${rawLatex}</div>`; }
    },
  );

  html = html.replace(
    /<span[^>]*data-type="math-inline"[^>]*data-content="([^"]{1,200})"[^>]*>[\s\S]*?<\/span>/g,
    (_match, rawLatex) => {
      try {
        const latex = rawLatex.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        if (!latex) return _match;
        return `<span class="katex-inline">${katex.renderToString(latex, { displayMode: false, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100 })}</span>`;
      } catch { return `<span class="math-error">${rawLatex}</span>`; }
    },
  );

  // ── 2. Legacy class format ────────────────────────────────────────────────
  html = html.replace(/<div class="math-display">\$\$([\s\S]{1,1000}?)\$\$<\/div>/g, (_match, latex) => {
    try {
      const clean = latex.trim();
      if (!clean) return _match;
      return `<div class="katex-display-block">${katex.renderToString(clean, { displayMode: true, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100 })}</div>`;
    } catch { return `<div class="math-error">${latex}</div>`; }
  });

  html = html.replace(/<span class="math-inline">\$([^\$]{1,200})\$<\/span>/g, (_match, latex) => {
    try {
      const clean = latex.trim();
      if (!clean) return _match;
      return `<span class="katex-inline">${katex.renderToString(clean, { displayMode: false, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100 })}</span>`;
    } catch { return `<span class="math-error">${latex}</span>`; }
  });

  // ── 3. Delimiter formats ──────────────────────────────────────────────────
  const alreadyRendered = html.includes('katex-display-block') || html.includes('class="katex"');

  if (!alreadyRendered) {
    html = html.replace(/\\\[([\s\S]{0,1000}?)\\\]/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<div class="katex-display-block">${katex.renderToString(clean, { displayMode: true, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100 })}</div>`;
      } catch { return `<div class="math-error">${latex}</div>`; }
    });

    html = html.replace(/\\\(([^\\]{0,200}?)\\\)/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<span class="katex-inline">${katex.renderToString(clean, { displayMode: false, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100 })}</span>`;
      } catch { return `<span class="math-error">${latex}</span>`; }
    });

    html = html.replace(/\$\$([\s\S]{0,1000}?)\$\$/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<div class="katex-display-block">${katex.renderToString(clean, { displayMode: true, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100 })}</div>`;
      } catch { return `<div class="math-error">${latex}</div>`; }
    });

    html = html.replace(/\$([^\$\n\r]{1,200})\$/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<span class="katex-inline">${katex.renderToString(clean, { displayMode: false, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100 })}</span>`;
      } catch { return `<span class="math-error">${latex}</span>`; }
    });
  }

  return html;
}

export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const renderedForRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    if (renderedForRef.current === content) return;
    renderedForRef.current = content;
    containerRef.current.innerHTML = renderMathInHtml(content);
  }, [content]);

  return (
    <>
      <div
        ref={containerRef}
        data-math-rendered
        className={`prose prose-lg max-w-none text-gray-900 overflow-x-auto ${className}`}
      />
      <style jsx global>{`
        .katex-display-block { margin: 0.5em 0; overflow-x: auto; overflow-y: hidden; text-align: center; }
        .katex-inline { display: inline-block; margin: 0; }
        .katex { color: #111827 !important; }
        .katex .mord, .katex .mop, .katex .mrel, .katex .mbin, .katex .mpunct { color: #111827 !important; }
        .math-error { color: #dc2626; background: #fef2f2; padding: 0.5em; border-radius: 0.25em; font-size: 0.875em; border: 1px solid #fecaca; }
        @media (max-width: 768px) {
          .katex-display-block { font-size: 0.9em; }
          .katex-inline { font-size: 0.9em; }
        }
      `}</style>
    </>
  );
}
