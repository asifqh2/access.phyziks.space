'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Decode HTML entities first
    let processedContent = decodeHtmlEntities(content);

    // Process LaTeX display math \[...\]
    processedContent = processedContent.replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
      try {
        const rendered = katex.renderToString(latex.trim(), {
          displayMode: true,
          throwOnError: false,
        });
        return `<div class="katex-display-block">${rendered}</div>`;
      } catch (error) {
        console.error('LaTeX display math error:', error);
        return `<div class="math-error">Error: ${latex}</div>`;
      }
    });

    // Process LaTeX inline math \(...\)
    processedContent = processedContent.replace(/\\\(([^\\]+?)\\\)/g, (match, latex) => {
      try {
        const rendered = katex.renderToString(latex.trim(), {
          displayMode: false,
          throwOnError: false,
        });
        return `<span class="katex-inline">${rendered}</span>`;
      } catch (error) {
        console.error('LaTeX inline math error:', error);
        return `<span class="math-error">Error: ${latex}</span>`;
      }
    });

    // Process standalone block math ($$...$$)
    processedContent = processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
      try {
        const rendered = katex.renderToString(latex.trim(), {
          displayMode: true,
          throwOnError: false,
        });
        return `<div class="katex-display-block">${rendered}</div>`;
      } catch (error) {
        console.error('Block math error:', error);
        return `<div class="math-error">Error: ${latex}</div>`;
      }
    });

    // Process standalone inline math ($...$)
    processedContent = processedContent.replace(/\$([^\$\n]+)\$/g, (match, latex) => {
      try {
        const rendered = katex.renderToString(latex.trim(), {
          displayMode: false,
          throwOnError: false,
        });
        return `<span class="katex-inline">${rendered}</span>`;
      } catch (error) {
        console.error('Inline math error:', error);
        return `<span class="math-error">Error: ${latex}</span>`;
      }
    });

    // Process HTML-wrapped math from editor
    processedContent = processedContent.replace(/<div class="math-display">\$\$([\s\S]*?)\$\$<\/div>/g, (match, latex) => {
      try {
        const rendered = katex.renderToString(latex.trim(), {
          displayMode: true,
          throwOnError: false,
        });
        return `<div class="katex-display-block">${rendered}</div>`;
      } catch (error) {
        console.error('HTML Block math error:', error);
        return `<div class="math-error">Error: ${latex}</div>`;
      }
    });

    processedContent = processedContent.replace(/<span class="math-inline">\$([^\$]+)\$<\/span>/g, (match, latex) => {
      try {
        const rendered = katex.renderToString(latex.trim(), {
          displayMode: false,
          throwOnError: false,
        });
        return `<span class="katex-inline">${rendered}</span>`;
      } catch (error) {
        console.error('HTML Inline math error:', error);
        return `<span class="math-error">Error: ${latex}</span>`;
      }
    });

    containerRef.current.innerHTML = processedContent;
  }, [content]);

  return (
    <div 
      ref={containerRef}
      data-math-rendered
      className={`prose prose-lg max-w-none text-gray-900 overflow-x-auto ${className}`}
    />
  );
}