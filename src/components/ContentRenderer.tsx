'use client';

// src/components/ContentRenderer.tsx
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ContentRendererProps {
  content: string;
  className?: string;
}

export default function ContentRenderer({ content, className = '' }: ContentRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });

    // Render Mermaid diagrams
    const mermaidBlocks = contentRef.current.querySelectorAll('code.language-mermaid');
    mermaidBlocks.forEach((block, index) => {
      const code = block.textContent || '';
      const id = `mermaid-${index}-${Date.now()}`;
      
      // Create a container for the diagram
      const container = document.createElement('div');
      container.id = id;
      container.className = 'mermaid-diagram';
      
      // Replace the code block with the container
      if (block.parentElement) {
        block.parentElement.replaceWith(container);
      }
      
      // Render the diagram
      mermaid.render(id, code).then(({ svg }) => {
        container.innerHTML = svg;
      }).catch((error) => {
        console.error('Mermaid rendering error:', error);
        container.innerHTML = `<div class="text-red-600 p-4 bg-red-50 rounded">Error rendering diagram: ${error.message}</div>`;
      });
    });

    // Process math after a short delay to ensure DOM is ready
    setTimeout(() => {
      if (!contentRef.current) return;

      // Render block math first (e.g., $$...$$)
      let html = contentRef.current.innerHTML;
      html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
        try {
          const rendered = katex.renderToString(latex.trim(), {
            displayMode: true,
            throwOnError: false,
          });
          return `<div class="math-block math-rendered">${rendered}</div>`;
        } catch (error) {
          console.error('KaTeX block error:', error);
          return match;
        }
      });

      // Render inline math (e.g., $x^2$)
      html = html.replace(/\$([^\$\n]+)\$/g, (match, latex) => {
        try {
          const rendered = katex.renderToString(latex.trim(), {
            displayMode: false,
            throwOnError: false,
          });
          return `<span class="math-inline math-rendered">${rendered}</span>`;
        } catch (error) {
          console.error('KaTeX inline error:', error);
          return match;
        }
      });

      contentRef.current.innerHTML = html;
    }, 100);

  }, [content]);

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
        /* Force colors ONLY for post content within ContentRenderer */
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

        /* Mermaid diagrams */
        .mermaid-diagram {
          margin: 2em 0;
          display: flex;
          justify-content: center;
          background: #f9fafb;
          padding: 2em;
          border-radius: 0.5em;
          border: 1px solid #e5e7eb;
        }

        .mermaid-diagram svg {
          max-width: 100%;
          height: auto;
        }

        /* Math styling */
        .math-inline {
          display: inline-block;
          margin: 0 0.2em;
        }

        .math-block {
          margin: 1.5em 0;
          overflow-x: auto;
          overflow-y: hidden;
          text-align: center;
        }

        .math-block .katex-display {
          margin: 0;
        }

        /* Code blocks */
        pre {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 1.5em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin: 1.5em 0;
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
        }
      `}</style>
    </>
  );
}