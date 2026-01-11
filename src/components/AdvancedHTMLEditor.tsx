'use client';

// src/components/AdvancedHTMLEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';


import { MathExtension } from '@/extensions/MathExtension';
import 'highlight.js/styles/github.css';



import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, 
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Undo, Redo, Link2, Image as ImageIcon, Table as TableIcon,
  AlignLeft, AlignCenter, AlignRight, FileCode, Eye, Sigma, GitBranch
} from 'lucide-react';
import { useState } from 'react';
import { common, createLowlight } from 'lowlight';
import 'katex/dist/katex.min.css';

const lowlight = createLowlight(common);

interface AdvancedHTMLEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function AdvancedHTMLEditor({ value, onChange }: AdvancedHTMLEditorProps) {
  const [showHTML, setShowHTML] = useState(false);
  const [htmlCode, setHtmlCode] = useState(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        codeBlock: false, // Disable default code block
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block',
        },
      }),
      
      MathExtension,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      setHtmlCode(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  const addTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const addInlineMath = () => {
    const latex = window.prompt('Enter LaTeX formula (e.g., x^2 + y^2 = z^2):');
    if (latex) {
      editor?.chain().focus().insertContent(`<span class="math-inline">$${latex}$</span>`).run();
    }
  };

  const addBlockMath = () => {
    const latex = window.prompt('Enter LaTeX formula for display mode (e.g., \\sum_{i=1}^n i = \\frac{n(n+1)}{2}):');
    if (latex) {
      editor?.chain().focus().insertContent(`<div class="math-display">$$${latex}$$</div>`).run();
    }
  };

  const addMermaidDiagram = () => {
    const diagram = window.prompt(
      'Enter Mermaid diagram code (e.g., graph TD; A-->B; B-->C;):\n\nExamples:\n- Flowchart: graph TD; A[Start]-->B[Process];\n- Sequence: sequenceDiagram; Alice->>Bob: Hello;'
    );
    if (diagram) {
      // Insert as a code block with mermaid language
      editor?.chain().focus().insertContent(`<pre><code class="language-mermaid">${diagram}</code></pre>`).run();
    }
  };

  const handleHTMLChange = (newHTML: string) => {
    setHtmlCode(newHTML);
    editor?.commands.setContent(newHTML);
    onChange(newHTML);
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-3 flex flex-wrap gap-1.5">
        {/* View Toggle */}
        <button
          onClick={() => setShowHTML(!showHTML)}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${showHTML ? 'bg-gray-300' : ''}`}
          title="Toggle HTML View"
          type="button"
        >
          {showHTML ? <Eye className="w-5 h-5 text-gray-700" /> : <FileCode className="w-5 h-5 text-gray-700" />}
        </button>

        <div className="w-px bg-gray-400 mx-1" />

        {/* Text Formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? 'bg-gray-300' : ''}`}
          title="Bold"
          type="button"
        >
          <Bold className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? 'bg-gray-300' : ''}`}
          title="Italic"
          type="button"
        >
          <Italic className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('underline') ? 'bg-gray-300' : ''}`}
          title="Underline"
          type="button"
        >
          <UnderlineIcon className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('strike') ? 'bg-gray-300' : ''}`}
          title="Strikethrough"
          type="button"
        >
          <Strikethrough className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('code') ? 'bg-gray-300' : ''}`}
          title="Inline Code"
          type="button"
        >
          <Code className="w-5 h-5 text-gray-700" />
        </button>

        <div className="w-px bg-gray-400 mx-1" />

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''}`}
          title="Heading 1"
          type="button"
        >
          <Heading1 className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''}`}
          title="Heading 2"
          type="button"
        >
          <Heading2 className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''}`}
          title="Heading 3"
          type="button"
        >
          <Heading3 className="w-5 h-5 text-gray-700" />
        </button>

        <div className="w-px bg-gray-400 mx-1" />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
          title="Bullet List"
          type="button"
        >
          <List className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
          title="Numbered List"
          type="button"
        >
          <ListOrdered className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('blockquote') ? 'bg-gray-300' : ''}`}
          title="Quote"
          type="button"
        >
          <Quote className="w-5 h-5 text-gray-700" />
        </button>

        <div className="w-px bg-gray-400 mx-1" />

        {/* Alignment */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''}`}
          title="Align Left"
          type="button"
        >
          <AlignLeft className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''}`}
          title="Align Center"
          type="button"
        >
          <AlignCenter className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''}`}
          title="Align Right"
          type="button"
        >
          <AlignRight className="w-5 h-5 text-gray-700" />
        </button>

        <div className="w-px bg-gray-400 mx-1" />

        {/* Insert */}
        <button
          onClick={addLink}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('link') ? 'bg-gray-300' : ''}`}
          title="Insert Link"
          type="button"
        >
          <Link2 className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={addImage}
          className="p-2.5 rounded hover:bg-gray-200 transition-colors"
          title="Insert Image"
          type="button"
        >
          <ImageIcon className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={addTable}
          className="p-2.5 rounded hover:bg-gray-200 transition-colors"
          title="Insert Table"
          type="button"
        >
          <TableIcon className="w-5 h-5 text-gray-700" />
        </button>

        <div className="w-px bg-gray-400 mx-1" />

        {/* Math & Diagrams */}
        <button
          onClick={addInlineMath}
          className="p-2.5 rounded hover:bg-gray-200 transition-colors"
          title="Insert Inline Math (LaTeX)"
          type="button"
        >
          <Sigma className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={addBlockMath}
          className="p-2.5 rounded hover:bg-gray-200 transition-colors"
          title="Insert Math Block (LaTeX)"
          type="button"
        >
          <span className="text-lg font-bold text-gray-700">∑</span>
        </button>
        <button
          onClick={addMermaidDiagram}
          className="p-2.5 rounded hover:bg-gray-200 transition-colors"
          title="Insert Mermaid Diagram"
          type="button"
        >
          <GitBranch className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('codeBlock') ? 'bg-gray-300' : ''}`}
          title="Code Block"
          type="button"
        >
          <FileCode className="w-5 h-5 text-gray-700" />
        </button>

        <div className="w-px bg-gray-400 mx-1" />

        {/* Undo/Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-2.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo"
          type="button"
        >
          <Undo className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-2.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo"
          type="button"
        >
          <Redo className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Editor Area */}
      {showHTML ? (
        <div className="p-4">
          <textarea
            value={htmlCode}
            onChange={(e) => handleHTMLChange(e.target.value)}
            className="w-full min-h-[400px] p-4 border border-gray-300 rounded-lg font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste your HTML code here..."
          />
          <div className="mt-2 text-xs text-gray-500">
            💡 Tip: You can paste HTML directly here and it will preserve all formatting, tables, and styles
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} className="min-h-[400px] max-h-[600px] overflow-y-auto text-gray-900" />
      )}

      {/* Info */}
      <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-600">
        <p>
          ✨ <strong>Features:</strong> Copy-paste content, LaTeX math (inline: $x^2$, block: $$\sum_i^n i$$), 
          Code blocks with syntax highlighting, Mermaid diagrams. Click <FileCode className="w-3 h-3 inline" /> to view/edit raw HTML.
        </p>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .ProseMirror table {
          border-collapse: collapse;
          margin: 1em 0;
          overflow: hidden;
          table-layout: fixed;
          width: 100%;
        }

        .ProseMirror table td,
        .ProseMirror table th {
          border: 2px solid #cbd5e0;
          box-sizing: border-box;
          min-width: 1em;
          padding: 6px 8px;
          position: relative;
          vertical-align: top;
        }

        .ProseMirror table th {
          background-color: #f7fafc;
          font-weight: bold;
          text-align: left;
        }

        .ProseMirror p {
          margin: 0.5em 0;
        }

        .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
        }

        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.75em 0;
        }

        .ProseMirror h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 0.83em 0;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 2em;
          margin: 0.5em 0;
        }

        .ProseMirror blockquote {
          border-left: 3px solid #cbd5e0;
          padding-left: 1em;
          margin-left: 0;
          font-style: italic;
          color: #4a5568;
        }

        .ProseMirror code {
          background-color: #f7fafc;
          border-radius: 0.25em;
          color: #e53e3e;
          font-size: 0.9em;
          padding: 0.2em 0.4em;
        }

        .ProseMirror pre {
          background: #1e1e1e;
          border-radius: 0.5em;
          color: #d4d4d4;
          font-family: 'Courier New', monospace;
          padding: 1em;
          margin: 1em 0;
        }

        .ProseMirror pre code {
          background: none;
          color: inherit;
          font-size: 0.875rem;
          padding: 0;
        }

        .ProseMirror img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
        }

        /* Math styling */
        .ProseMirror .math-inline,
        .ProseMirror .math-display {
          cursor: pointer;
          padding: 0.2em 0.4em;
          border-radius: 0.25em;
        }

        .ProseMirror .math-inline:hover,
        .ProseMirror .math-display:hover {
          background-color: #f0f0f0;
        }

        .ProseMirror .math-display {
          display: block;
          margin: 1em 0;
          text-align: center;
        }

        /* Code block syntax highlighting */
        .ProseMirror .hljs-comment,
        .ProseMirror .hljs-quote {
          color: #6a9955;
        }

        .ProseMirror .hljs-keyword,
        .ProseMirror .hljs-selector-tag {
          color: #569cd6;
        }

        .ProseMirror .hljs-string {
          color: #ce9178;
        }

        .ProseMirror .hljs-number {
          color: #b5cea8;
        }

        .ProseMirror .hljs-function {
          color: #dcdcaa;
        }

        .ProseMirror .hljs-variable {
          color: #9cdcfe;
        }
      `}</style>
    </div>
  );
}