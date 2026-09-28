'use client';

// src/components/ContentRenderer.tsx
<<<<<<< HEAD
import { useLayoutEffect, useRef } from 'react';
=======
import { useEffect, useRef, useCallback } from 'react';
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ContentRendererProps {
  content: string;
  className?: string;
}

<<<<<<< HEAD
/**
 * Render all math in an HTML string and return the result.
 * Pure string → string transformation; never touches the DOM.
 */
function renderMathInHtml(rawHtml: string): string {
  // Fix double-escaped backslashes from JSON serialisation
  let html = rawHtml.replace(/\\\\/g, '\\');

  // ── 1. TipTap / AdvancedHTMLEditor  data-type format ─────────────────────
  // Block: <div data-type="math-display" data-content="...">...</div>
  html = html.replace(
    /<div[^>]*data-type="math-display"[^>]*data-content="([^"]{0,2000})"[^>]*>[\s\S]*?<\/div>/g,
    (_match, rawLatex) => {
      try {
        const latex = rawLatex
          .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        if (!latex) return _match;
        return `<div class="math-block math-rendered">${katex.renderToString(latex, {
          displayMode: true, throwOnError: false, strict: false,
        })}</div>`;
      } catch { return `<div class="math-error">${rawLatex}</div>`; }
    },
  );

  // Inline: <span data-type="math-inline" data-content="...">...</span>
  html = html.replace(
    /<span[^>]*data-type="math-inline"[^>]*data-content="([^"]{0,500})"[^>]*>[\s\S]*?<\/span>/g,
    (_match, rawLatex) => {
      try {
        const latex = rawLatex
          .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        if (!latex) return _match;
        return `<span class="math-inline math-rendered">${katex.renderToString(latex, {
          displayMode: false, throwOnError: false, strict: false,
        })}</span>`;
      } catch { return `<span class="math-error">${rawLatex}</span>`; }
    },
  );

  // ── 2. LaTeX delimiter formats ────────────────────────────────────────────
  // Guard: if content already has rendered math, skip delimiter processing to
  // avoid running regexes over KaTeX's own HTML output.
  const alreadyRendered =
    html.includes('class="math-rendered"') || html.includes('class="katex"');

  if (!alreadyRendered) {
    // \[...\] block
=======
export default function ContentRenderer({ content, className = '' }: ContentRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef<boolean>(false);

  const processMath = useCallback(() => {
    if (!contentRef.current) return;

    let html = contentRef.current.innerHTML;

    // Handle double-escaped backslashes from JSON
    html = html.replace(/\\\\/g, '\\');

    // ── 1. data-type format (AdvancedHTMLEditor / TipTap MathExtension output) ──
    // This is the primary format for all LMS chapter/topic/subtopic descriptions.
    // Block: <div data-type="math-display" data-content="..."></div>
    html = html.replace(
      /<div[^>]*data-type="math-display"[^>]*data-content="([^"]{0,2000})"[^>]*>[\s\S]*?<\/div>/g,
      (_match, rawLatex) => {
        try {
          const latex = rawLatex.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
          if (!latex) return _match;
          return `<div class="math-block math-rendered">${katex.renderToString(latex, {
            displayMode: true, throwOnError: false, strict: false,
          })}</div>`;
        } catch { return `<div class="math-error">${rawLatex}</div>`; }
      },
    );

    // Inline: <span data-type="math-inline" data-content="..."></span>
    html = html.replace(
      /<span[^>]*data-type="math-inline"[^>]*data-content="([^"]{0,500})"[^>]*>[\s\S]*?<\/span>/g,
      (_match, rawLatex) => {
        try {
          const latex = rawLatex.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
          if (!latex) return _match;
          return `<span class="math-inline math-rendered">${katex.renderToString(latex, {
            displayMode: false, throwOnError: false, strict: false,
          })}</span>`;
        } catch { return `<span class="math-error">${rawLatex}</span>`; }
      },
    );

    // ── 2. LaTeX delimiter formats (\[...\], \(...\), $$...$$, $...$) ─────────
    // These come from plain-text editors and legacy content.

    // \[...\]  block
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
    html = html.replace(/\\\[([\s\S]{0,2000}?)\\\]/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
<<<<<<< HEAD
        return `<div class="math-block math-rendered">${katex.renderToString(clean, {
          displayMode: true, throwOnError: false, strict: false,
        })}</div>`;
      } catch { return `<div class="math-error">${latex}</div>`; }
    });

    // \(...\) inline
=======
        return `<div class="math-block math-rendered">${katex.renderToString(clean, { displayMode: true, throwOnError: false, strict: false })}</div>`;
      } catch { return `<div class="math-error">${latex}</div>`; }
    });

    // \(...\)  inline
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
    html = html.replace(/\\\(([^\\]{0,500}?)\\\)/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
<<<<<<< HEAD
        return `<span class="math-inline math-rendered">${katex.renderToString(clean, {
          displayMode: false, throwOnError: false, strict: false,
        })}</span>`;
      } catch { return `<span class="math-error">${latex}</span>`; }
    });

    // $$...$$ block — before single $
=======
        return `<span class="math-inline math-rendered">${katex.renderToString(clean, { displayMode: false, throwOnError: false, strict: false })}</span>`;
      } catch { return `<span class="math-error">${latex}</span>`; }
    });

    // $$...$$ block (must come before single-$ to avoid double-matching)
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
    html = html.replace(/\$\$([\s\S]{0,2000}?)\$\$/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
<<<<<<< HEAD
        return `<div class="math-block math-rendered">${katex.renderToString(clean, {
          displayMode: true, throwOnError: false, strict: false,
        })}</div>`;
      } catch { return `<div class="math-error">${latex}</div>`; }
    });

    // $...$ inline — single dollar, no newlines, max 200 chars
=======
        return `<div class="math-block math-rendered">${katex.renderToString(clean, { displayMode: true, throwOnError: false, strict: false })}</div>`;
      } catch { return `<div class="math-error">${latex}</div>`; }
    });

    // $...$ inline (single dollar, no newlines, max 200 chars)
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
    html = html.replace(/\$([^\$\n\r]{1,200})\$/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
<<<<<<< HEAD
        return `<span class="math-inline math-rendered">${katex.renderToString(clean, {
          displayMode: false, throwOnError: false, strict: false,
        })}</span>`;
      } catch { return `<span class="math-error">${latex}</span>`; }
    });
  }

  return html;
}

export default function ContentRenderer({ content, className = '' }: ContentRendererProps) {
  const divRef = useRef<HTMLDivElement>(null);
  // Remember the last content we rendered so we skip redundant work.
  const renderedForRef = useRef<string | null>(null);

  // useLayoutEffect runs synchronously after DOM mutations and before the
  // browser paints, so the user never sees raw LaTeX. It also runs on every
  // render where `content` changed, making navigation between topics safe.
  useLayoutEffect(() => {
    if (!divRef.current) return;
    if (renderedForRef.current === content) return;
    renderedForRef.current = content;
    divRef.current.innerHTML = renderMathInHtml(content);
  }, [content]);

  return (
    <>
      {/* Empty div — innerHTML is always written by useLayoutEffect above */}
      <div
        ref={divRef}
        className={`prose prose-lg max-w-none ${className}`}
        data-content-renderer
=======
        return `<span class="math-inline math-rendered">${katex.renderToString(clean, { displayMode: false, throwOnError: false, strict: false })}</span>`;
      } catch { return `<span class="math-error">${latex}</span>`; }
    });

    contentRef.current.innerHTML = html;
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;

    // Reset every time content changes so switching topics always re-processes
    processedRef.current = false;

    const processContent = () => {
      if (processedRef.current) return; // already ran for this content
      processedRef.current = true;
      try {
        processMath();
      } catch (error) {
        console.error('Content processing error:', error);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(processContent, { timeout: 1000 });
    } else {
      setTimeout(processContent, 50);
    }

    return () => {
      processedRef.current = false;
    };
  }, [content, processMath]);

  return (
    <>
      <div
        ref={contentRef}
        className={`prose prose-lg max-w-none ${className}`}
        data-content-renderer
        dangerouslySetInnerHTML={{ __html: content }}
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
        style={{
          '--tw-prose-body': '#1f2937',
          '--tw-prose-headings': '#111827',
        } as React.CSSProperties}
      />
      <style jsx global>{`
<<<<<<< HEAD
        .prose[data-content-renderer] { will-change: auto; }

        .prose[data-content-renderer] h1 {
=======
        /* Optimized styles for mobile performance */
        .prose[data-content-renderer] {
          will-change: auto;
          contain: layout style;
        }
        
        .prose[data-content-renderer] h1, .prose[data-content-renderer] h1 * {
          color: #111827 !important;
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
          background: linear-gradient(135deg, #1f2937 0%, #7c3aed 50%, #ec4899 100%) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
        }

<<<<<<< HEAD
        /* KaTeX inside gradient headings must stay visible */
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

        .math-inline  { display: inline-block; margin: 0; }
        .math-block   { margin: 0.5em 0; overflow-x: auto; text-align: center; }
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

        pre {
          background: #1e1e1e; color: #d4d4d4;
          padding: 1.5em; border-radius: 0.5em;
          overflow-x: auto; margin: 1.5em 0;
        }
        pre code { background: none; padding: 0; font-size: 0.875em; line-height: 1.6; }
        code:not(pre code) {
          background: #f3f4f6; color: #e53e3e;
          padding: 0.2em 0.4em; border-radius: 0.25em; font-size: 0.9em;
        }

        table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }
        table th, table td { border: 1px solid #d1d5db; padding: 0.75em; text-align: left; }
        table th { background-color: #f9fafb; font-weight: 600; }

        img { max-width: 100%; height: auto; border-radius: 0.5em; margin: 1.5em 0; }
      `}</style>
    </>
  );
}
=======
        .prose[data-content-renderer] h2, .prose[data-content-renderer] h2 * {
          color: #1f2937 !important;
        }

        .prose[data-content-renderer] h3, .prose[data-content-renderer] h3 * {
          color: #1f2937 !important;
        }

        .prose[data-content-renderer] h4, .prose[data-content-renderer] h4 * {
          color: #374151 !important;
        }

        .prose[data-content-renderer] p, .prose[data-content-renderer] p *, 
        .prose[data-content-renderer] div, .prose[data-content-renderer] div *, 
        .prose[data-content-renderer] span:not(.math-inline), .prose[data-content-renderer] span:not(.math-inline) * {
          color: #111827 !important;
        }

        .prose[data-content-renderer] li, .prose[data-content-renderer] li * {
          color: #111827 !important;
        }

        /* Optimized Math styling */
        .math-inline {
          display: inline-block;
          margin: 0;
          contain: layout style;
        }

        .math-block {
          margin: 0.1em 0;
          overflow-x: auto;
          overflow-y: hidden;
          text-align: center;
          contain: layout style;
        }

        .math-block .katex-display {
          margin: 0;
        }
        
        .katex {
          color: #111827 !important;
        }
        
        .katex .mord, .katex .mop, .katex .mrel, .katex .mbin, .katex .mpunct {
          color: #111827 !important;
        }

        .math-error {
          color: #dc2626;
          background: #fef2f2;
          padding: 0.5em;
          border-radius: 0.25em;
          font-size: 0.875em;
        }

        /* Mobile-optimized code blocks */
        @media (max-width: 768px) {
          .prose[data-content-renderer] {
            font-size: 0.9rem;
          }
          
          .math-block {
            font-size: 0.9em;
          }
        }

        /* Code blocks */
        pre {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 1.5em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin: 1.5em 0;
          contain: layout style;
        }

        pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: 0.875em;
          line-height: 1.6;
        }

        /* Inline code */
        code:not(pre code) {
          background: #f3f4f6;
          color: #e53e3e;
          padding: 0.2em 0.4em;
          border-radius: 0.25em;
          font-size: 0.9em;
        }

        /* Tables */
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 1.5em 0;
          contain: layout style;
        }

        table th,
        table td {
          border: 1px solid #d1d5db;
          padding: 0.75em;
          text-align: left;
        }

        table th {
          background-color: #f9fafb;
          font-weight: 600;
        }

        /* Images */
        img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5em;
          margin: 1.5em 0;
          will-change: auto;
        }
      `}</style>
    </>
  );
}
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
