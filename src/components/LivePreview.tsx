'use client';

import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LivePreviewProps {
  content: string;
}

export default function LivePreview({ content }: LivePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Force re-render by updating key
    setKey(prev => prev + 1);
  }, [content]);

  useEffect(() => {
    if (!containerRef.current) return;

    let processedContent = content || '<p class="text-gray-400">Start typing to see preview...</p>';

    try {
      // Process LaTeX display math \[...\]
      processedContent = processedContent.replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
        try {
          const rendered = katex.renderToString(latex.trim(), {
            displayMode: true,
            throwOnError: false,
          });
          return `<div class="katex-display my-4">${rendered}</div>`;
        } catch (error) {
          return `<div class="text-red-500 bg-red-50 p-2 rounded">LaTeX Display Math Error: ${latex}</div>`;
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
          return `<span class="text-red-500">LaTeX Inline Math Error: ${latex}</span>`;
        }
      });

      // Process block math ($$...$$)
      processedContent = processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
        try {
          const rendered = katex.renderToString(latex.trim(), {
            displayMode: true,
            throwOnError: false,
          });
          return `<div class="katex-display my-4">${rendered}</div>`;
        } catch (error) {
          return `<div class="text-red-500 bg-red-50 p-2 rounded">Math Error: ${latex}</div>`;
        }
      });

      // Process inline math ($...$)
      processedContent = processedContent.replace(/\$([^\$\n]+)\$/g, (match, latex) => {
        try {
          const rendered = katex.renderToString(latex.trim(), {
            displayMode: false,
            throwOnError: false,
          });
          return `<span class="katex-inline">${rendered}</span>`;
        } catch (error) {
          return `<span class="text-red-500">Math Error: ${latex}</span>`;
        }
      });

      containerRef.current.innerHTML = processedContent;
    } catch (error) {
      console.error('Preview render error:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '<p class="text-red-500">Preview error</p>';
      }
    }
  }, [content, key]);

  return (
    <div 
      key={key}
      ref={containerRef}
      className="prose prose-lg max-w-none text-gray-900 bg-white p-4 rounded border min-h-[200px]"
      style={{ 
        lineHeight: '1.6',
        fontSize: '16px'
      }}
    />
  );
}