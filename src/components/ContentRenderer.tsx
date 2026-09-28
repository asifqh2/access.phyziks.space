'use client';

// src/components/ContentRenderer.tsx

import { useLayoutEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ContentRendererProps {
  content: string;
  className?: string;
}

/**
 * Render all math in an HTML string and return the result.
 * Pure string → string transformation; never touches the DOM.
 */
function renderMathInHtml(rawHtml: string): string {
  let html = rawHtml.replace(/\\\\/g, '\\');

  // ── 1. TipTap / AdvancedHTMLEditor data-type format ──────────────────────
  html = html.replace(
    /<div[^>]*data-type="math-display"[^>]*data-content="([^"]{0,2000})"[^>]*>[\s\S]*?<\/div>/g,
    (_match, rawLatex) => {
      try {
        const latex = rawLatex.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        if (!latex) return _match;
        return `<div class="math-block math-rendered">${katex.renderToString(latex, { displayMode: true, throwOnError: false, strict: false })}</div>`;
      } catch { return `<div class="math-error">${rawLatex}</div>`; }
    },
  );

  html = html.replace(
    /<span[^>]*data-type="math-inline"[^>]*data-content="([^"]{0,500})"[^>]*>[\s\S]*?<\/span>/g,
    (_match, rawLatex) => {
      try {
        const latex = rawLatex.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        if (!latex) return _match;
        return `<span class="math-inline math-rendered">${katex.renderToString(latex, { displayMode: false, throwOnError: false, strict: false })}</span>`;
      } catch { return `<span class="math-error">${rawLatex}</span>`; }
    },
  );

  // ── 2. LaTeX delimiter formats ────────────────────────────────────────────
  const alreadyRendered = html.includes('class="math-rendered"') || html.includes('class="katex"');

  if (!alreadyRendered) {
    // \[...\] block
    html = html.replace(/\\\[([\s\S]{0,2000}?)\\\]/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<div class="math-block math-rendered">${katex.renderToString(clean, { displayMode: true, throwOnError: false, strict: false })}</div>`;
      } catch { return `<div class="math-error">${latex}</div>`; }
    });

    // \(...\) inline
    html = html.replace(/\\\(([^\\]{0,500}?)\\\)/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<span class="math-inline math-rendered">${katex.renderToString(clean, { displayMode: false, throwOnError: false, strict: false })}</span>`;
      } catch { return `<span class="math-error">${latex}</span>`; }
    });

    // $$...$$ block (must come before single $)
    html = html.replace(/\$\$([\s\S]{0,2000}?)\$\$/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<div class="math-block math-rendered">${katex.renderToString(clean, { displayMode: true, throwOnError: false, strict: false })}</div>`;
      } catch { return `<div class="math-error">${latex}</div>`; }
    });

    // $...$ inline
    html = html.replace(/\$([^\$\n\r]{1,200})\$/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<span class="math-inline math-rendered">${katex.renderToString(clean, { displayMode: false, throwOnError: false, strict: false })}</span>`;
      } catch { return `<span class="math-error">${latex}</span>`; }
    });
  }

  return html;
}

export default function ContentRenderer({ content, className = '' }: ContentRendererProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const renderedForRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!divRef.current) return;
    if (renderedForRef.current === content) return;
    renderedForRef.current = content;
    divRef.current.innerHTML = renderMathInHtml(content);
  }, [content]);

  return (
    <>
      <div
        ref={divRef}
        className={`prose prose-lg max-w-none ${className}`}
        data-content-renderer
        style={{
          '--tw-prose-body': '#1f2937',
          '--tw-prose-headings': '#111827',
        } as React.CSSProperties}
      />
      <style jsx global>{`
        .prose[data-content-renderer] { will-change: auto; contain: layout style; }

        .prose[data-content-renderer] h1, .prose[data-content-renderer] h1 * {
          background: linear-gradient(135deg, #1f2937 0%, #7c3aed 50%, #ec4899 100%) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
        }
        .prose[data-content-renderer] h1 .katex,
        .prose[data-content-renderer] h1 .katex * {
          background: none !important;
          -webkit-background-clip: unset !important;
          background-clip: unset !important;
          -webkit-text-fill-color: #111827 !important;
          color: #111827 !important;
        }
        .prose[data-content-renderer] h2 { color: #1f2937 !important; }
        .prose[data-content-renderer] h3 { color: #1f2937 !important; }
        .prose[data-content-renderer] h4 { color: #374151 !important; }
        .prose[data-content-renderer] p  { color: #111827 !important; }
        .prose[data-content-renderer] li { color: #111827 !important; }

        .math-inline { display: inline-block; margin: 0; }
        .math-block  { margin: 0.5em 0; overflow-x: auto; text-align: center; }
        .math-block .katex-display { margin: 0; }

        .katex { color: #111827 !important; }
        .katex .mord, .katex .mop, .katex .mrel,
        .katex .mbin, .katex .mpunct { color: #111827 !important; }

        .math-error {
          color: #dc2626; background: #fef2f2;
          padding: 0.5em; border-radius: 0.25em; font-size: 0.875em;
        }

        @media (max-width: 768px) {
          .prose[data-content-renderer] { font-size: 0.9rem; }
          .math-block { font-size: 0.9em; }
        }

        pre { background: #1e1e1e; color: #d4d4d4; padding: 1.5em; border-radius: 0.5em; overflow-x: auto; margin: 1.5em 0; }
        pre code { background: none; padding: 0; font-size: 0.875em; line-height: 1.6; }
        code:not(pre code) { background: #f3f4f6; color: #e53e3e; padding: 0.2em 0.4em; border-radius: 0.25em; font-size: 0.9em; }

        table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }
        table th, table td { border: 1px solid #d1d5db; padding: 0.75em; text-align: left; }
        table th { background-color: #f9fafb; font-weight: 600; }

        img { max-width: 100%; height: auto; border-radius: 0.5em; margin: 1.5em 0; }
      `}</style>
    </>
  );
}
