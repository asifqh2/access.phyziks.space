'use client';

import { FileDown } from 'lucide-react';
import { useState, useRef } from 'react';

interface PdfDownloadButtonProps {
  title: string;
}

export default function PdfDownloadButton({ title }: PdfDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    setIsGenerating(true);
    try {
      // Add print-specific styles temporarily
      const printStyles = document.createElement('style');
      printStyles.id = 'pdf-print-styles';
      printStyles.textContent = `
        @media print {
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          body * { visibility: hidden; }
          
          /* Make quiz content visible */
          [data-quiz-content], [data-quiz-content] * { visibility: visible !important; }
          .container, .container * { visibility: visible !important; }
          [data-math-rendered], [data-math-rendered] * { visibility: visible !important; }
          .bg-white, .bg-white * { visibility: visible !important; }
          .rounded-xl, .rounded-xl * { visibility: visible !important; }
          .shadow-xl, .shadow-xl * { visibility: visible !important; }
          .space-y-6, .space-y-6 * { visibility: visible !important; }
          .border, .border * { visibility: visible !important; }
          .rounded-lg, .rounded-lg * { visibility: visible !important; }
          
          /* Position content properly */
          [data-quiz-content] { position: static !important; }
          .container { position: static !important; }
          
          /* Preserve colors */
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
          
          /* Math and content formatting */
          .katex { break-inside: avoid; color: #000 !important; }
          .katex-display-block { break-inside: avoid; }
          h1, h2, h3, h4 { page-break-after: avoid; color: #000 !important; }
          
          /* Hide navigation and non-essential elements */
          nav, header, .bg-gradient-to-r.from-purple-600 { display: none !important; }
          
          /* Hide floating study tools */
          .fixed.z-50 { display: none !important; }
          
          /* Ensure question numbers and content are visible */
          .w-10.h-10.bg-gradient-to-r { 
            background: #3b82f6 !important; 
            color: white !important; 
            -webkit-print-color-adjust: exact !important;
          }
          
          /* Watermark */
          body::before {
            content: "www.phyziks.space";
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            color: rgba(0, 0, 0, 0.15);
            z-index: 1000;
            pointer-events: none;
            visibility: visible !important;
            font-weight: bold;
          }
        }
      `;
      document.head.appendChild(printStyles);
      
      // Trigger browser print
      window.print();
      
      // Remove print styles after a delay
      setTimeout(() => {
        const styles = document.getElementById('pdf-print-styles');
        if (styles) styles.remove();
      }, 1000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePdf}
      disabled={isGenerating}
      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm"
    >
      <FileDown className="w-4 h-4" />
      {isGenerating ? 'Generating...' : 'Download as PDF'}
    </button>
  );
}