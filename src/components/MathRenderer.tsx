'use client';


import { useLayoutEffect, useRef } from 'react';

import { useEffect, useRef, useCallback } from 'react';
 
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
  // Decode HTML entities that may have been introduced by innerHTML round-trips
  // (only needed when content originally came from innerText/innerHTML reads).
  // We do it via a temporary textarea so we handle all entity forms correctly.
  let html: string;
  if (typeof document !== 'undefined') {
    const ta = document.createElement('textarea');
    ta.innerHTML = rawContent;
    html = ta.value;
  } else {
    html = rawContent;
  }

  // Fix double-escaped backslashes from JSON serialisation
  html = html.replace(/\\\\/g, '\\');

  // ── 1. TipTap data-type format ────────────────────────────────────────────
  html = html.replace(
    /<div[^>]*data-type="math-display"[^>]*data-content="([^"]{1,1000})"[^>]*>[\s\S]*?<\/div>/g,
    (_match, rawLatex) => {
      try {
        const latex = rawLatex
          .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        if (!latex) return _match;
        return `<div class="katex-display-block">${katex.renderToString(latex, {
          displayMode: true, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100,
        })}</div>`;
      } catch { return `<div class="math-error">${rawLatex}</div>`; }
    },
  );

  html = html.replace(
    /<span[^>]*data-type="math-inline"[^>]*data-content="([^"]{1,200})"[^>]*>[\s\S]*?<\/span>/g,
    (_match, rawLatex) => {
      try {
        const latex = rawLatex
          .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        if (!latex) return _match;
        return `<span class="katex-inline">${katex.renderToString(latex, {
          displayMode: false, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100,
        })}</span>`;
      } catch { return `<span class="math-error">${rawLatex}</span>`; }
    },
  );

  // ── 2. Legacy class format ────────────────────────────────────────────────
  html = html.replace(
    /<div class="math-display">\$\$([\s\S]{1,1000}?)\$\$<\/div>/g,
    (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<div class="katex-display-block">${katex.renderToString(clean, {
          displayMode: true, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100,
        })}</div>`;
      } catch { return `<div class="math-error">${latex}</div>`; }
    },
  );

  html = html.replace(
    /<span class="math-inline">\$([^\$]{1,200})\$<\/span>/g,
    (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<span class="katex-inline">${katex.renderToString(clean, {
          displayMode: false, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100,
        })}</span>`;
      } catch { return `<span class="math-error">${latex}</span>`; }
    },
  );

  // ── 3. Delimiter formats — only if content hasn't already been rendered ───
  const alreadyRendered =
    html.includes('katex-display-block') || html.includes('class="katex"');

  if (!alreadyRendered) {
    // \[...\] block
    html = html.replace(/\\\[([\s\S]{0,1000}?)\\\]/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean || clean.length > 1000) return _match;
        return `<div class="katex-display-block">${katex.renderToString(clean, {
          displayMode: true, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100,
        })}</div>`;
      } catch { return `<div class="math-error">${latex}</div>`; }
    });

    // \(...\) inline
    html = html.replace(/\\\(([^\\]{0,200}?)\\\)/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<span class="katex-inline">${katex.renderToString(clean, {
          displayMode: false, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100,
        })}</span>`;
      } catch { return `<span class="math-error">${latex}</span>`; }
    });

    // $$...$$ block — before single $
    html = html.replace(/\$\$([\s\S]{0,1000}?)\$\$/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<div class="katex-display-block">${katex.renderToString(clean, {
          displayMode: true, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100,
        })}</div>`;
      } catch { return `<div class="math-error">${latex}</div>`; }
    });

    // $...$ inline
    html = html.replace(/\$([^\$\n\r]{1,200})\$/g, (_match, latex) => {
      try {
        const clean = latex.trim();
        if (!clean) return _match;
        return `<span class="katex-inline">${katex.renderToString(clean, {
          displayMode: false, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100,
        })}</span>`;
      } catch { return `<span class="math-error">${latex}</span>`; }
    });
  }

  return html;

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  let decoded = textarea.value;
  
  // Handle double-escaped backslashes from JSON
  decoded = decoded.replace(/\\\\/g, '\\');
  
  return decoded;
 
}

export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderedForRef = useRef<string | null>(null);

  // useLayoutEffect is synchronous (runs before paint), so the user never sees
  // raw LaTeX. Runs on every content change — no async delays, no race conditions.
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    if (renderedForRef.current === content) return;
    renderedForRef.current = content;
    containerRef.current.innerHTML = renderMathInHtml(content);
  }, [content]);

  return (
    <>
      {/* Empty div — innerHTML is always written synchronously by useLayoutEffect */}
      <div

  const processedRef = useRef<boolean>(false);

  const processMath = useCallback(() => {
    if (!containerRef.current || processedRef.current) return;
    
    processedRef.current = true;
    
    try {
      // Decode HTML entities first
      let processedContent = decodeHtmlEntities(content);

      // Process LaTeX display math \[...\] with timeout protection
      processedContent = processedContent.replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
        try {
          const cleanLatex = latex.trim();
          if (!cleanLatex || cleanLatex.length > 1000) return `<div class="math-error">Math too long or empty</div>`;
          
          const rendered = katex.renderToString(cleanLatex, {
            displayMode: true,
            throwOnError: false,
            strict: false,
            maxSize: 10,
            maxExpand: 100,
          });
          return `<div class="katex-display-block">${rendered}</div>`;
        } catch (error) {
          console.error('LaTeX display math error:', error);
          return `<div class="math-error">Error: ${latex.substring(0, 50)}...</div>`;
        }
      });

      // Process LaTeX inline math \(...\)
      processedContent = processedContent.replace(/\\\(([^\\]{1,200}?)\\\)/g, (match, latex) => {
        try {
          const cleanLatex = latex.trim();
          if (!cleanLatex) return match;
          
          const rendered = katex.renderToString(cleanLatex, {
            displayMode: false,
            throwOnError: false,
            strict: false,
            maxSize: 10,
            maxExpand: 100,
          });
          return `<span class="katex-inline">${rendered}</span>`;
        } catch (error) {
          console.error('LaTeX inline math error:', error);
          return `<span class="math-error">Error: ${latex.substring(0, 20)}...</span>`;
        }
      });

      // Process standalone block math ($$...$$) with length limit
      processedContent = processedContent.replace(/\$\$([\s\S]{1,1000}?)\$\$/g, (match, latex) => {
        try {
          const cleanLatex = latex.trim();
          if (!cleanLatex) return match;
          
          const rendered = katex.renderToString(cleanLatex, {
            displayMode: true,
            throwOnError: false,
            strict: false,
            maxSize: 10,
            maxExpand: 100,
          });
          return `<div class="katex-display-block">${rendered}</div>`;
        } catch (error) {
          console.error('Block math error:', error);
          return `<div class="math-error">Math Error: ${latex.substring(0, 50)}...</div>`;
        }
      });

      // Process standalone inline math ($...$) with length limit
      processedContent = processedContent.replace(/\$([^\$\n\r]{1,200})\$/g, (match, latex) => {
        try {
          const cleanLatex = latex.trim();
          if (!cleanLatex) return match;
          
          const rendered = katex.renderToString(cleanLatex, {
            displayMode: false,
            throwOnError: false,
            strict: false,
            maxSize: 10,
            maxExpand: 100,
          });
          return `<span class="katex-inline">${rendered}</span>`;
        } catch (error) {
          console.error('Inline math error:', error);
          return `<span class="math-error">Math Error: ${latex.substring(0, 20)}...</span>`;
        }
      });

      // Process HTML-wrapped math from editor (new data-type format)
      processedContent = processedContent.replace(/<div[^>]*data-type="math-display"[^>]*data-content="([^"]{1,1000})"[^>]*><\/div>/g, (match, latex) => {
        try {
          const cleanLatex = latex.trim();
          if (!cleanLatex) return match;
          const rendered = katex.renderToString(cleanLatex, {
            displayMode: true, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100,
          });
          return `<div class="katex-display-block">${rendered}</div>`;
        } catch (error) {
          console.error('HTML Block math error (data-type):', error);
          return `<div class="math-error">Math Error: ${latex.substring(0, 50)}...</div>`;
        }
      });

      processedContent = processedContent.replace(/<span[^>]*data-type="math-inline"[^>]*data-content="([^"]{1,200})"[^>]*>[^<]*<\/span>/g, (match, latex) => {
        try {
          const cleanLatex = latex.trim();
          if (!cleanLatex) return match;
          const rendered = katex.renderToString(cleanLatex, {
            displayMode: false, throwOnError: false, strict: false, maxSize: 10, maxExpand: 100,
          });
          return `<span class="katex-inline">${rendered}</span>`;
        } catch (error) {
          console.error('HTML Inline math error (data-type):', error);
          return `<span class="math-error">Math Error: ${latex.substring(0, 20)}...</span>`;
        }
      });

      // Process HTML-wrapped math from editor (legacy class format)
      processedContent = processedContent.replace(/<div class="math-display">\$\$([\s\S]{1,1000}?)\$\$<\/div>/g, (match, latex) => {
        try {
          const cleanLatex = latex.trim();
          if (!cleanLatex) return match;
          
          const rendered = katex.renderToString(cleanLatex, {
            displayMode: true,
            throwOnError: false,
            strict: false,
            maxSize: 10,
            maxExpand: 100,
          });
          return `<div class="katex-display-block">${rendered}</div>`;
        } catch (error) {
          console.error('HTML Block math error:', error);
          return `<div class="math-error">Math Error: ${latex.substring(0, 50)}...</div>`;
        }
      });

      processedContent = processedContent.replace(/<span class="math-inline">\$([^\$]{1,200})\$<\/span>/g, (match, latex) => {
        try {
          const cleanLatex = latex.trim();
          if (!cleanLatex) return match;
          
          const rendered = katex.renderToString(cleanLatex, {
            displayMode: false,
            throwOnError: false,
            strict: false,
            maxSize: 10,
            maxExpand: 100,
          });
          return `<span class="katex-inline">${rendered}</span>`;
        } catch (error) {
          console.error('HTML Inline math error:', error);
          return `<span class="math-error">Math Error: ${latex.substring(0, 20)}...</span>`;
        }
      });

      containerRef.current.innerHTML = processedContent;
    } catch (error) {
      console.error('Math processing error:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = content; // Fallback to original content
      }
    }
  }, [content]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    processedRef.current = false;
    
    // Use requestIdleCallback for better mobile performance
    const processWithDelay = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => processMath(), { timeout: 2000 });
      } else {
        setTimeout(processMath, 100);
      }
    };

    processWithDelay();
    
    return () => {
      processedRef.current = false;
    };
  }, [processMath]);

  return (
    <>
      <div 
 
        ref={containerRef}
        data-math-rendered
        className={`prose prose-lg max-w-none text-gray-900 overflow-x-auto ${className}`}
      />
      <style jsx global>{`

        .katex-display-block {
          margin: 0.5em 0;

        /* Optimized math rendering styles */
        .katex-display-block {
          margin: 0.1em 0;
 
          overflow-x: auto;
          overflow-y: hidden;
          text-align: center;
        }


        .katex-inline { display: inline-block; margin: 0; }

        .katex { color: #111827 !important; }
        .katex .mord, .katex .mop, .katex .mrel,
        .katex .mbin, .katex .mpunct { color: #111827 !important; }

        .math-error {
          color: #dc2626; background: #fef2f2;
          padding: 0.5em; border-radius: 0.25em;
          font-size: 0.875em; border: 1px solid #fecaca;
        }

        @media (max-width: 768px) {
          .katex-display-block { font-size: 0.9em; margin: 0.6em 0; }
          .katex-inline { font-size: 0.9em; }

        
        .katex-inline {
          display: inline-block;
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
          border: 1px solid #fecaca;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .katex-display-block {
            font-size: 0.9em;
            margin: 0.6em 0;
          }
          
          .katex-inline {
            font-size: 0.9em;
          }
        }
        
        /* Prevent layout shifts */
        .katex {
          will-change: auto;
 
        }
      `}</style>
    </>
  );

}

}
 
