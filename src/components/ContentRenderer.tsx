'use client';

// src/components/ContentRenderer.tsx
import { useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ContentRendererProps {
  content: string;
  className?: string;
}

export default function ContentRenderer({ content, className = '' }: ContentRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef<boolean>(false);

  const processMermaid = useCallback(async () => {
    if (!contentRef.current) return;

    const mermaidBlocks = contentRef.current.querySelectorAll('code.language-mermaid');
    if (mermaidBlocks.length === 0) return;

    // Initialize mermaid only once
    if (!mermaid.mermaidAPI) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
      });
    }

    // Process mermaid blocks with error handling
    const promises = Array.from(mermaidBlocks).map(async (block, index) => {
      try {
        const code = block.textContent || '';
        const id = `mermaid-${index}-${Date.now()}`;
        
        const container = document.createElement('div');
        container.id = id;
        container.className = 'mermaid-diagram';
        
        if (block.parentElement) {
          block.parentElement.replaceWith(container);
        }
        
        const { svg } = await mermaid.render(id, code);
        container.innerHTML = svg;
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        const container = document.createElement('div');
        container.className = 'text-red-600 p-4 bg-red-50 rounded';
        container.textContent = `Error rendering diagram: ${error instanceof Error ? error.message : 'Unknown error'}`;
        if (block.parentElement) {
          block.parentElement.replaceWith(container);
        }
      }
    });

    await Promise.allSettled(promises);
  }, []);

  const processMath = useCallback(() => {
    if (!contentRef.current) return;

    let html = contentRef.current.innerHTML;
    
    // Handle double-escaped backslashes from JSON
    html = html.replace(/\\\\/g, '\\');
    
    // Process block math first ($$...$$) with better regex
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
      try {
        const cleanLatex = latex.trim();
        if (!cleanLatex) return match;
        
        const rendered = katex.renderToString(cleanLatex, {
          displayMode: true,
          throwOnError: false,
          strict: false,
        });
        return `<div class="math-block math-rendered">${rendered}</div>`;
      } catch (error) {
        console.error('KaTeX block error:', error);
        return `<div class="math-error">Math Error: ${latex}</div>`;
      }
    });

    // Process inline math ($x^2$) with improved regex
    html = html.replace(/\$([^\$\n\r]{1,100})\$/g, (match, latex) => {
      try {
        const cleanLatex = latex.trim();
        if (!cleanLatex) return match;
        
        const rendered = katex.renderToString(cleanLatex, {
          displayMode: false,
          throwOnError: false,
          strict: false,
        });
        return `<span class="math-inline math-rendered">${rendered}</span>`;
      } catch (error) {
        console.error('KaTeX inline error:', error);
        return `<span class="math-error">Math Error: ${latex}</span>`;
      }
    });

    contentRef.current.innerHTML = html;
  }, []);

  useEffect(() => {
    if (!contentRef.current || processedRef.current) return;
    
    // Mark as processed to prevent re-processing
    processedRef.current = true;

    // Use requestIdleCallback for better performance on mobile
    const processContent = async () => {
      try {
        // Process mermaid first
        await processMermaid();
        
        // Then process math with a small delay
        setTimeout(() => {
          processMath();
        }, 50);
      } catch (error) {
        console.error('Content processing error:', error);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => processContent(), { timeout: 1000 });
    } else {
      setTimeout(processContent, 100);
    }

    // Cleanup function
    return () => {
      processedRef.current = false;
    };
  }, [content, processMermaid, processMath]);

  return (
    <>
      <div
        ref={contentRef}
        className={`prose prose-lg max-w-none ${className}`}
        data-content-renderer
        dangerouslySetInnerHTML={{ __html: content }}
        style={{
          '--tw-prose-body': '#1f2937',
          '--tw-prose-headings': '#111827',
        } as React.CSSProperties}
      />
      <style jsx global>{`
        /* Optimized styles for mobile performance */
        .prose[data-content-renderer] {
          will-change: auto;
          contain: layout style;
        }
        
        .prose[data-content-renderer] h1, .prose[data-content-renderer] h1 * {
          color: #111827 !important;
          background: linear-gradient(135deg, #1f2937 0%, #7c3aed 50%, #ec4899 100%) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
        }

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
        .prose[data-content-renderer] div:not(.mermaid-diagram), .prose[data-content-renderer] div:not(.mermaid-diagram) *, 
        .prose[data-content-renderer] span:not(.math-inline), .prose[data-content-renderer] span:not(.math-inline) * {
          color: #111827 !important;
        }

        .prose[data-content-renderer] li, .prose[data-content-renderer] li * {
          color: #111827 !important;
        }

        /* Optimized Mermaid diagrams */
        .mermaid-diagram {
          margin: 2em 0;
          display: flex;
          justify-content: center;
          background: #f9fafb;
          padding: 1em;
          border-radius: 0.5em;
          border: 1px solid #e5e7eb;
          contain: layout style;
        }

        .mermaid-diagram svg {
          max-width: 100%;
          height: auto;
          will-change: auto;
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
          
          .mermaid-diagram {
            padding: 0.5em;
            margin: 1em 0;
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