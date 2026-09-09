'use client';

import { FileDown, Smartphone, Monitor } from 'lucide-react';
import { useState } from 'react';

interface PdfDownloadButtonProps {
  title: string;
}

export default function PdfDownloadButton({ title }: PdfDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Guard: window/navigator are only available in the browser
  const isMobile = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  };

  /**
   * Strip dangerous nodes/attributes from a DOM element before injecting its
   * innerHTML into a new window. Removes script/iframe tags and on* handlers.
   */
  const sanitizeNode = (el: Element): string => {
    const safe = el.cloneNode(true) as Element;
    safe.querySelectorAll('script, iframe, object, embed, form').forEach((n) => n.remove());
    safe.querySelectorAll('*').forEach((node) => {
      Array.from(node.attributes).forEach((attr) => {
        if (/^on\w+/i.test(attr.name)) node.removeAttribute(attr.name);
      });
      if (node instanceof HTMLAnchorElement && /^javascript:/i.test(node.href)) {
        node.removeAttribute('href');
      }
    });
    return safe.innerHTML;
  };

  const generatePdf = async (method: 'print' | 'share' = 'print') => {
    setIsGenerating(true);
    setShowOptions(false);

    try {
      // Remove any existing print style tag before appending a new one —
      // prevents accumulation if the button is clicked multiple times quickly.
      document.getElementById('pdf-print-styles')?.remove();

      const printStyles = document.createElement('style');
      printStyles.id = 'pdf-print-styles';
      printStyles.textContent = `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            margin: 1in;
            size: A4;
          }

          body * { visibility: hidden; }

          /* Make content visible */
          [data-quiz-content], [data-quiz-content] * { visibility: visible !important; }
          [data-math-rendered], [data-math-rendered] * { visibility: visible !important; }
          article, article * { visibility: visible !important; }
          .container, .container * { visibility: visible !important; }
          .bg-white, .bg-white * { visibility: visible !important; }
          .rounded-xl, .rounded-xl * { visibility: visible !important; }
          .shadow-xl, .shadow-xl * { visibility: visible !important; }
          .space-y-6, .space-y-6 * { visibility: visible !important; }
          .border, .border * { visibility: visible !important; }
          .rounded-lg, .rounded-lg * { visibility: visible !important; }

          /* Position content properly */
          [data-quiz-content] { position: static !important; }
          [data-math-rendered] { position: static !important; }
          article { position: static !important; }
          .container { position: static !important; }

          /* Enhanced color preservation */
          .bg-gradient-to-r { background: linear-gradient(to right, var(--tw-gradient-stops)) !important; }
          .from-blue-500 { --tw-gradient-from: #3b82f6 !important; }
          .to-purple-500 { --tw-gradient-to: #8b5cf6 !important; }
          .bg-green-50 { background-color: #f0fdf4 !important; }
          .border-green-300 { border-color: #86efac !important; }
          .text-green-800 { color: #166534 !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          .border-gray-200 { border-color: #e5e7eb !important; }
          .text-gray-700 { color: #374151 !important; }
          .text-gray-800 { color: #1f2937 !important; }
          .text-gray-900 { color: #111827 !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .border-blue-400 { border-color: #60a5fa !important; }
          .text-blue-800 { color: #1e40af !important; }
          .text-blue-900 { color: #1e3a8a !important; }
          .bg-blue-100 { background-color: #dbeafe !important; }
          .text-blue-700 { color: #1d4ed8 !important; }
          .text-green-600 { color: #16a34a !important; }
          .bg-white\\/80 { background-color: #ffffff !important; }

          /* Math and content formatting */
          .katex {
            break-inside: avoid;
            color: #000 !important;
            font-size: 1em !important;
          }
          .katex-display {
            break-inside: avoid;
            margin: 1em 0 !important;
          }
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            color: #000 !important;
            margin-top: 1em !important;
            margin-bottom: 0.5em !important;
          }

          /* Hide navigation and non-essential elements */
          nav, header:not(article header), footer { display: none !important; }
          .bg-gradient-to-r.from-purple-600 { display: none !important; }
          .fixed { display: none !important; }
          .sticky { position: static !important; }

          /* Question numbers and content visibility */
          .w-10.h-10.bg-gradient-to-r {
            background: #3b82f6 !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Mobile-specific adjustments */
          @media (max-width: 768px) {
            body { font-size: 12px !important; }
            h1 { font-size: 1.5em !important; }
            h2 { font-size: 1.3em !important; }
            h3 { font-size: 1.1em !important; }
          }

          /* Watermark */
          body::before {
            content: "www.phyziks.space";
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            color: rgba(0, 0, 0, 0.1);
            z-index: 1000;
            pointer-events: none;
            visibility: visible !important;
            font-weight: bold;
          }

          /* Page breaks */
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
        }
      `;
      document.head.appendChild(printStyles);

      if (method === 'share' && typeof navigator !== 'undefined' && 'share' in navigator && isMobile()) {
        // Mobile sharing approach
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const content = document.querySelector('[data-quiz-content], [data-math-rendered], article');
          if (content) {
            // Sanitize before injecting into the new window to prevent XSS
            const safeContent = sanitizeNode(content);
            const escapedTitle = title
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>${escapedTitle} - Phyziks.Space</title>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 48px; color: rgba(0,0,0,0.1); z-index: 1000; pointer-events: none; font-weight: bold; }
                  </style>
                </head>
                <body>
                  <div class="watermark">www.phyziks.space</div>
                  <h1>${escapedTitle}</h1>
                  ${safeContent}
                </body>
              </html>
            `);
            printWindow.document.close();

            try {
              await navigator.share({
                title: `${title} - Phyziks.Space`,
                text: `Check out this content from Phyziks.Space`,
                url: printWindow.location.href,
              });
            } catch {
              // Fallback to print if sharing is cancelled or unsupported
              printWindow.print();
            }
          }
        }
      } else {
        // Standard print approach for desktop and fallback
        if (isMobile()) {
          const viewport = document.querySelector('meta[name=viewport]');
          const originalViewport = viewport?.getAttribute('content');
          viewport?.setAttribute('content', 'width=device-width, initial-scale=1, shrink-to-fit=no');

          setTimeout(() => {
            window.print();
            if (originalViewport && viewport) {
              viewport.setAttribute('content', originalViewport);
            }
          }, 100);
        } else {
          window.print();
        }
      }

      // Remove print styles after a delay
      setTimeout(() => {
        document.getElementById('pdf-print-styles')?.remove();
      }, 2000);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClick = () => {
    if (isMobile()) {
      setShowOptions(true);
    } else {
      generatePdf('print');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm"
      >
        <FileDown className="w-4 h-4" />
        {isGenerating ? 'Generating...' : 'Download as PDF'}
      </button>

      {showOptions && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48">
          <div className="p-2">
            <button
              onClick={() => generatePdf('print')}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 rounded text-sm"
            >
              <Monitor className="w-4 h-4" />
              Print/Save as PDF
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={() => generatePdf('share')}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 rounded text-sm"
              >
                <Smartphone className="w-4 h-4" />
                Share Content
              </button>
            )}
            <button
              onClick={() => setShowOptions(false)}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded text-sm text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showOptions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  );
}
