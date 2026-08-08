'use client';

// src/components/RichTextEditor.tsx
import { useState } from 'react';
import MathRenderer from './MathRenderer';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  minHeight?: string;
  compact?: boolean;
}

export default function RichTextEditor({ value, onChange, id = 'content-editor', minHeight = '300px', compact = false }: RichTextEditorProps) {

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = document.getElementById(id) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  return (
    <div>
      
      <div className="bg-white rounded-lg border border-gray-300">
        {/* Toolbar */}
        <div className="border-b bg-gray-50 p-2">
          <div className="flex flex-wrap gap-1 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => insertFormatting('<h1>', '</h1>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs font-semibold text-gray-900"
              title="Heading 1"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<h2>', '</h2>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs font-semibold text-gray-900"
              title="Heading 2"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<h3>', '</h3>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs font-semibold text-gray-900"
              title="Heading 3"
            >
              H3
            </button>
            
            <div className="w-px bg-gray-300 mx-1" />
            
            <button
              type="button"
              onClick={() => insertFormatting('<strong>', '</strong>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 font-bold text-gray-900 text-xs"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<em>', '</em>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 italic text-gray-900 text-xs"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<u>', '</u>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 underline text-gray-900 text-xs"
              title="Underline"
            >
              U
            </button>
            
            <div className="w-px bg-gray-300 mx-1" />
            
            <button
              type="button"
              onClick={() => insertFormatting('<p>', '</p>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Paragraph"
            >
              ¶
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Bullet List"
            >
              •
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<ol>\n  <li>', '</li>\n</ol>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Numbered List"
            >
              1.
            </button>
            
            <div className="w-px bg-gray-300 mx-1" />
            
            <button
              type="button"
              onClick={() => insertFormatting('<a href="URL">', '</a>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Link"
            >
              🔗
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<img src="IMAGE_URL" alt="description" />')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Image"
            >
              🖼️
            </button>
            <button
              type="button"
              onClick={() => {
                const url = prompt('Enter Blogger image URL:');
                if (url) {
                  insertFormatting(`<img src="${url}" alt="Blogger image" loading="lazy" class="w-full max-w-md mx-auto rounded-lg shadow-md" />`);
                }
              }}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Blogger Image"
            >
              📝
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<img src="IMAGE_URL" alt="description" loading="lazy" />')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Lazy Image"
            >
              📱
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<code>', '</code>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs font-mono text-gray-900"
              title="Code"
            >
              {'</>'}
            </button>
            
            <div className="w-px bg-gray-300 mx-1" />
            
            <button
              type="button"
              onClick={() => insertFormatting('$', '$')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs font-mono text-gray-900"
              title="Inline Math"
            >
              $x$
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('$$\n', '\n$$')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs font-mono text-gray-900"
              title="Block Math"
            >
              $$
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('\\frac{', '}{denominator}')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Fraction"
            >
              ½
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('^{', '}')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Superscript"
            >
              x²
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('_{', '}')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Subscript"
            >
              x₁
            </button>
            
            <div className="w-px bg-gray-300 mx-1" />
            
            <button
              type="button"
              onClick={() => insertFormatting('<div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">\n  <p class="text-blue-800">', '</p>\n</div>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Info Box"
            >
              ℹ️
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<table class="w-full border-collapse border border-gray-300">\n  <thead>\n    <tr class="bg-gray-50">\n      <th class="border border-gray-300 px-4 py-2">', '</th>\n      <th class="border border-gray-300 px-4 py-2">Column 2</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td class="border border-gray-300 px-4 py-2">Data 1</td>\n      <td class="border border-gray-300 px-4 py-2">Data 2</td>\n    </tr>\n  </tbody>\n</table>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Table"
            >
              📊
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<script>\n', '\n</script>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="JavaScript"
            >
              🟨
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<button onclick="', '" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Click Me</button>')}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-100 text-xs text-gray-900"
              title="Interactive Button"
            >
              🔘
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="p-2 sm:p-4">
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ minHeight }}
            className="w-full p-2 sm:p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-xs sm:text-sm"
            placeholder="Write your content here using HTML tags..."
          />
        </div>

        {/* Preview */}
        {!compact && (
          <div className="border-t p-2 sm:p-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Live Preview:</h3>
              <span className="text-xs text-gray-500">HTML + LaTeX rendered below</span>
            </div>
            <div
              className="bg-white p-2 sm:p-4 rounded border min-h-[150px] sm:min-h-[200px] prose prose-sm max-w-none text-gray-900 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          </div>
        )}

        {/* Quick Reference */}
        {!compact && (
          <div className="border-t p-2 sm:p-4 bg-gray-50">
            <details className="text-xs text-gray-600">
              <summary className="cursor-pointer font-semibold hover:text-gray-900 py-2">
                HTML Quick Reference
              </summary>
              <div className="mt-2 space-y-1 pl-2 sm:pl-4 grid grid-cols-1 sm:grid-cols-2 gap-1">
                <p><code className="bg-gray-200 text-gray-900 px-1 rounded text-xs">{'<h1>Title</h1>'}</code> - Main heading</p>
                <p><code className="bg-gray-200 text-gray-900 px-1 rounded text-xs">{'<h2>Subtitle</h2>'}</code> - Sub heading</p>
                <p><code className="bg-gray-200 text-gray-900 px-1 rounded text-xs">{'<p>Text</p>'}</code> - Paragraph</p>
                <p><code className="bg-gray-200 text-gray-900 px-1 rounded text-xs">{'<strong>Bold</strong>'}</code> - Bold text</p>
                <p><code className="bg-gray-200 text-gray-900 px-1 rounded text-xs">{'<em>Italic</em>'}</code> - Italic text</p>
                <p><code className="bg-gray-200 text-gray-900 px-1 rounded text-xs">{'<a href="url">Link</a>'}</code> - Hyperlink</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'<img src="url" alt="desc" />'}</code> - Image</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'<img src="url" loading="lazy" />'}</code> - Lazy loaded image</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'<ul><li>Item</li></ul>'}</code> - Bullet list</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'<ol><li>Item</li></ol>'}</code> - Numbered list</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'<div class="bg-blue-50 p-4">Box</div>'}</code> - Styled box</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'<table><tr><td>Cell</td></tr></table>'}</code> - Table</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'<script>alert("Hello")</script>'}</code> - JavaScript</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'<button onclick="func()">Click</button>'}</code> - Interactive button</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'$E = mc^2$'}</code> - Inline math</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'$$\\frac{a}{b}$$'}</code> - Block math</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'x^{2}'}</code> - Superscript</p>
                <p><code className="bg-gray-200 px-1 text-gray-900 rounded text-xs">{'H_{2}O'}</code> - Subscript</p>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}