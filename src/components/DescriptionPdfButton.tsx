'use client';

// src/components/DescriptionPdfButton.tsx
//
// Renders a "Download as PDF" button next to a description block.
// When clicked, it captures the rendered HTML from the sibling
// [data-description-content] div (including KaTeX-rendered math and
// Mermaid SVGs), injects it into a hidden print window styled for A4,
// and calls window.print().
//
// Approach: window.print() in a dedicated popup window — consistent
// with the existing PdfDownloadButton used elsewhere in the project.
// No extra npm dependencies required.

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';

interface DescriptionPdfButtonProps {
  /** Title shown as the H1 in the PDF and as the browser tab title */
  title: string;
  /** The ref container id — we look for the nearest [data-description-content] sibling */
  contentId: string;
}

// KaTeX CSS served from the public CDN so the print window can render math correctly.
const KATEX_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css';

export default function DescriptionPdfButton({ title, contentId }: DescriptionPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    const container = document.getElementById(contentId);
    if (!container) {
      console.warn('[DescriptionPdfButton] content container not found:', contentId);
      return;
    }

    setLoading(true);

    try {
      // Clone the rendered HTML so we don't mutate the live DOM
      const clone = container.cloneNode(true) as HTMLElement;

      // Replace gradient text (webkit-text-fill-color: transparent) with a
      // solid colour that prints well — most print engines ignore the gradient.
      clone.querySelectorAll<HTMLElement>('h1, h1 *').forEach((el) => {
        el.style.webkitTextFillColor = '#1f2937';
        el.style.background = 'none';
        el.style.backgroundClip = 'unset';
        el.style.color = '#1f2937';
      });

      const bodyHtml = clone.innerHTML;

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
  <title>${escapeHtml(title)} — Phyziks.space</title>

  <!-- KaTeX CSS (math rendering) -->
  <link rel="stylesheet" href="${KATEX_CDN}" />

  <style>
    /* ── Base reset ──────────────────────────────────────────────────── */
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
      margin: 0;
      padding: 0;
    }

    /* ── Page wrapper ────────────────────────────────────────────────── */
    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 48px 60px;
    }

    /* ── Header ──────────────────────────────────────────────────────── */
    .pdf-header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 28px;
    }

    .pdf-header h1 {
      font-size: 22pt;
      font-weight: 700;
      color: #111827;
      margin: 0 0 4px;
      line-height: 1.3;
    }

    .pdf-header .site-tag {
      font-size: 9pt;
      color: #6b7280;
      letter-spacing: 0.05em;
    }

    /* ── Prose content ───────────────────────────────────────────────── */
    .content h1 { font-size: 18pt; font-weight: 700; color: #111827; margin: 1.4em 0 0.5em; }
    .content h2 { font-size: 15pt; font-weight: 600; color: #1f2937; margin: 1.2em 0 0.4em; }
    .content h3 { font-size: 13pt; font-weight: 600; color: #1f2937; margin: 1em 0 0.4em; }
    .content h4 { font-size: 11.5pt; font-weight: 600; color: #374151; margin: 0.9em 0 0.3em; }
    .content h5, .content h6 { font-size: 11pt; font-weight: 600; color: #374151; margin: 0.8em 0 0.3em; }

    .content p  { margin: 0.6em 0; }
    .content ul, .content ol { margin: 0.6em 0 0.6em 1.6em; }
    .content li { margin: 0.25em 0; }

    .content a  { color: #4f46e5; text-decoration: underline; }

    .content blockquote {
      border-left: 4px solid #d1d5db;
      margin: 1em 0;
      padding: 0.5em 1em;
      color: #4b5563;
      font-style: italic;
    }

    /* ── Tables ──────────────────────────────────────────────────────── */
    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      font-size: 11pt;
    }
    .content th {
      background: #f3f4f6;
      font-weight: 600;
      text-align: left;
      padding: 6px 10px;
      border: 1px solid #d1d5db;
    }
    .content td {
      padding: 5px 10px;
      border: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .content tr:nth-child(even) td { background: #f9fafb; }

    /* ── Code ────────────────────────────────────────────────────────── */
    .content code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      background: #f3f4f6;
      padding: 1px 4px;
      border-radius: 3px;
      color: #111827;
    }
    .content pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 9.5pt;
      overflow-x: auto;
      margin: 1em 0;
      page-break-inside: avoid;
    }
    .content pre code {
      background: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
    }

    /* ── Images ──────────────────────────────────────────────────────── */
    .content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1em auto;
    }

    /* ── KaTeX math ──────────────────────────────────────────────────── */
    .katex { color: #111827 !important; font-size: 1em; }
    .math-block {
      margin: 0.8em 0;
      text-align: center;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    .math-inline { display: inline; }

    /* ── Page breaks ─────────────────────────────────────────────────── */
    h1, h2, h3 { page-break-after: avoid; }
    p, li      { orphans: 3; widows: 3; }

    /* ── Watermark ───────────────────────────────────────────────────── */
    @media print {
      body::after {
        content: "phyziks.space";
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 64pt;
        color: rgba(0, 0, 0, 0.05);
        font-weight: 700;
        letter-spacing: 0.1em;
        z-index: 9999;
        pointer-events: none;
        font-family: Georgia, serif;
      }
    }

    /* ── Hide screen-only chrome in print ────────────────────────────── */
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="pdf-header">
      <h1>${escapeHtml(title)}</h1>
      <div class="site-tag">phyziks.space</div>
    </div>

    <!-- Description content -->
    <div class="content prose">
      ${bodyHtml}
    </div>

    <!-- Screen-only: close/print buttons -->
    <div class="no-print" style="margin-top:40px; padding-top:20px; border-top:1px solid #e5e7eb; display:flex; gap:12px;">
      <button
        onclick="window.print()"
        style="padding:8px 20px; background:#4f46e5; color:#fff; border:none; border-radius:6px; font-size:13px; cursor:pointer;"
      >
        Save as PDF
      </button>
      <button
        onclick="window.close()"
        style="padding:8px 20px; background:#f3f4f6; color:#374151; border:1px solid #d1d5db; border-radius:6px; font-size:13px; cursor:pointer;"
      >
        Close
      </button>
    </div>
  </div>

  <script>
    // Auto-trigger print after fonts/KaTeX load
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`);

      printWindow.document.close();
    } catch (err) {
      console.error('[DescriptionPdfButton] error:', err);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      title="Download description as PDF"
      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <FileDown className="h-3.5 w-3.5" />
      )}
      {loading ? 'Preparing…' : 'Download as PDF'}
    </button>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
