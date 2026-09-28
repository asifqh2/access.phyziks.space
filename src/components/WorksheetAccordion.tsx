'use client';

// src/components/WorksheetAccordion.tsx
//
// Renders a list of worksheets as an accordion below a topic/subtopic description.
// Only one panel is open at a time (controlled accordion).
// Each open panel shows:
//   • The rendered HTML content (via ContentRenderer)
//   • A "Download Worksheet N" button that opens a print window (same
//     approach as DescriptionPdfButton — no extra dependencies)
//
// Button labels follow the convention:  Download Worksheet 1, Download Worksheet 2, …
// based on the worksheet's position in the sorted array (1-indexed).

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, FileDown, Loader2 } from 'lucide-react';
import ContentRenderer from '@/components/ContentRenderer';
import type { CourseWorksheet } from '@/app/courses/[slug]/CourseLayout';

// ── KaTeX CDN for the print window ────────────────────────────────────────────
const KATEX_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css';

// ── PDF helper (same pattern as DescriptionPdfButton) ────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strip potentially dangerous nodes from a cloned DOM element before injecting
 * its innerHTML into a new window via document.write.
 * Removes <script>, <iframe>, <object>, <embed>, and event-handler attributes.
 * This is a lightweight defence-in-depth measure — content should already be
 * sanitised before storage, but this prevents XSS if the DB is ever compromised.
 */
function sanitizeForPrint(el: HTMLElement): string {
  // Work on a fresh clone so we don't mutate the live DOM
  const safe = el.cloneNode(true) as HTMLElement;

  // Remove dangerous tags entirely
  safe.querySelectorAll('script, iframe, object, embed, form').forEach((n) => n.remove());

  // Strip inline event handlers (on*)
  safe.querySelectorAll('*').forEach((node) => {
    const attrs = Array.from(node.attributes);
    for (const attr of attrs) {
      if (/^on\w+/i.test(attr.name)) node.removeAttribute(attr.name);
    }
    // Strip javascript: hrefs / srcs
    if (node instanceof HTMLAnchorElement && /^javascript:/i.test(node.href)) {
      node.removeAttribute('href');
    }
    if ((node as HTMLElement).hasAttribute('src')) {
      const src = (node as HTMLElement).getAttribute('src') ?? '';
      if (/^javascript:/i.test(src)) (node as HTMLElement).removeAttribute('src');
    }
  });

  return safe.innerHTML;
}

function downloadWorksheetAsPdf(
  contentEl: HTMLElement,
  title: string,
  worksheetNumber: number,
) {
  const clone = contentEl.cloneNode(true) as HTMLElement;

  // Fix gradient headings for print
  clone.querySelectorAll<HTMLElement>('h1, h1 *').forEach((el) => {
    el.style.webkitTextFillColor = '#1f2937';
    el.style.background = 'none';
    el.style.backgroundClip = 'unset';
    el.style.color = '#1f2937';
  });

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Worksheet ${worksheetNumber} — Phyziks.Space</title>
  <link rel="stylesheet" href="${KATEX_CDN}" />
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Georgia, 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.7;
      color: #111827;
      background: #fff;
      margin: 0; padding: 0;
    }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 48px 60px; }

    /* Header */
    .pdf-header { border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 28px; }
    .pdf-header .ws-label {
      font-size: 10pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      color: #6366f1; margin-bottom: 4px;
    }
    .pdf-header h1 { font-size: 20pt; font-weight: 700; color: #111827; margin: 0 0 4px; line-height: 1.3; }
    .pdf-header .site-tag { font-size: 9pt; color: #6b7280; letter-spacing: 0.05em; }

    /* Prose */
    .content h1 { font-size: 18pt; font-weight: 700; color: #111827; margin: 1.4em 0 0.5em; }
    .content h2 { font-size: 15pt; font-weight: 600; color: #1f2937; margin: 1.2em 0 0.4em; }
    .content h3 { font-size: 13pt; font-weight: 600; color: #1f2937; margin: 1em   0 0.4em; }
    .content h4 { font-size: 11.5pt; font-weight: 600; color: #374151; margin: 0.9em 0 0.3em; }
    .content p  { margin: 0.6em 0; }
    .content ul, .content ol { margin: 0.6em 0 0.6em 1.6em; }
    .content li { margin: 0.25em 0; }
    .content a  { color: #4f46e5; text-decoration: underline; }
    .content blockquote {
      border-left: 4px solid #d1d5db; margin: 1em 0; padding: 0.5em 1em;
      color: #4b5563; font-style: italic;
    }
    /* Tables */
    .content table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 11pt; }
    .content th { background: #f3f4f6; font-weight: 600; text-align: left; padding: 6px 10px; border: 1px solid #d1d5db; }
    .content td { padding: 5px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
    .content tr:nth-child(even) td { background: #f9fafb; }
    /* Code */
    .content code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; }
    .content pre  { background: #1e1e1e; color: #d4d4d4; padding: 14px 16px; border-radius: 6px; font-size: 9.5pt; overflow-x: auto; margin: 1em 0; page-break-inside: avoid; }
    .content pre code { background: none; padding: 0; color: inherit; }
    /* Images */
    .content img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
    /* KaTeX */
    .katex { color: #111827 !important; font-size: 1em; }
    .math-block { margin: 0.8em 0; text-align: center; overflow-x: auto; page-break-inside: avoid; }
    .math-inline { display: inline; }
    /* Page breaks */
    h1, h2, h3 { page-break-after: avoid; }
    p, li { orphans: 3; widows: 3; }
    /* Watermark */
    @media print {
      body::after {
        content: "phyziks.space";
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 64pt; color: rgba(0,0,0,0.05);
        font-weight: 700; letter-spacing: 0.1em;
        z-index: 9999; pointer-events: none;
        font-family: Georgia, serif;
      }
    }
    .no-print { }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="pdf-header">
      <div class="ws-label">Worksheet ${worksheetNumber}</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="site-tag">phyziks.space</div>
    </div>
    <div class="content prose">
      ${sanitizeForPrint(clone)}
    </div>
    <div class="no-print" style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;display:flex;gap:12px;">
      <button onclick="window.print()" style="padding:8px 20px;background:#4f46e5;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;">
        Save as PDF
      </button>
      <button onclick="window.close()" style="padding:8px 20px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:6px;font-size:13px;cursor:pointer;">
        Close
      </button>
    </div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`);

  printWindow.document.close();
}

// ── Single worksheet panel ────────────────────────────────────────────────────

interface WorksheetPanelProps {
  worksheet:       CourseWorksheet;
  worksheetNumber: number; // 1-indexed display number
  parentTitle:     string; // topic/subtopic title — used as PDF heading
  isOpen:          boolean;
  onToggle:        () => void;
}

function WorksheetPanel({
  worksheet,
  worksheetNumber,
  parentTitle,
  isOpen,
  onToggle,
}: WorksheetPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Scroll the panel into view when it opens
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isOpen]);

  function handleDownload() {
    if (!contentRef.current) return;
    // Use rAF so React can flush the loading=true state to the DOM before the
    // synchronous print-window work runs (otherwise both state updates batch
    // together and the button never visually shows "Preparing…").
    setPdfLoading(true);
    requestAnimationFrame(() => {
      try {
        downloadWorksheetAsPdf(contentRef.current!, parentTitle, worksheetNumber);
      } finally {
        setTimeout(() => setPdfLoading(false), 600);
      }
    });
  }

  return (
    <div
      ref={panelRef}
      className="border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Accordion header / toggle */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
          isOpen
            ? 'bg-indigo-50 border-b border-indigo-100'
            : 'bg-white hover:bg-slate-50'
        }`}
        aria-expanded={isOpen}
      >
        <span className={`text-sm font-semibold ${isOpen ? 'text-indigo-700' : 'text-slate-700'}`}>
          Worksheet {worksheetNumber}
          {worksheet.title ? ` — ${worksheet.title}` : ''}
        </span>
        {isOpen
          ? <ChevronUp   className="h-4 w-4 flex-shrink-0 text-indigo-500" />
          : <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />}
      </button>

      {/* Accordion body */}
      {isOpen && (
        <div className="bg-white px-4 pb-5 pt-4">
          {/* Rendered worksheet content */}
          <div ref={contentRef}>
            <ContentRenderer content={worksheet.content} />
          </div>

          {/* Download button — right-aligned, below the content */}
          <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
            <button
              onClick={handleDownload}
              disabled={pdfLoading}
              title={`Download Worksheet ${worksheetNumber} as PDF`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileDown className="h-3.5 w-3.5" />}
              {pdfLoading ? 'Preparing…' : `Download Worksheet ${worksheetNumber}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface WorksheetAccordionProps {
  worksheets:   CourseWorksheet[];
  /** Title of the owning topic / subtopic — used as the PDF heading */
  parentTitle:  string;
}

export default function WorksheetAccordion({
  worksheets,
  parentTitle,
}: WorksheetAccordionProps) {
  // null = all collapsed; number = index of the open panel
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (worksheets.length === 0) return null;

  function toggle(idx: number) {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  }

  return (
    <div className="mt-6">
      {/* Section heading */}
      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
        Worksheets
      </h2>

      <div className="space-y-2">
        {worksheets.map((ws, idx) => (
          <WorksheetPanel
            key={ws.id}
            worksheet={ws}
            worksheetNumber={idx + 1}
            parentTitle={parentTitle}
            isOpen={openIndex === idx}
            onToggle={() => toggle(idx)}
          />
        ))}
      </div>
    </div>
  );
}
