import { Node, mergeAttributes } from '@tiptap/core';
import katex from 'katex';

/**
 * A simple TipTap extension for inline and block math rendering using KaTeX.
 */
export const MathExtension = Node.create({
  name: 'math',

  group: 'inline block',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      content: {
        default: '',
      },
      displayMode: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-inline"]',
        getAttrs: (el) => ({
          content: (el as HTMLElement).getAttribute('data-content'),
          displayMode: false,
        }),
      },
      {
        tag: 'div[data-type="math-display"]',
        getAttrs: (el) => ({
          content: (el as HTMLElement).getAttribute('data-content'),
          displayMode: true,
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { content, displayMode } = HTMLAttributes;
    
    if (displayMode) {
      return [
        'div',
        mergeAttributes(
          { 'data-type': 'math-display', 'data-content': content },
          this.options.HTMLAttributes
        ),
        0,
      ];
    }

    return [
      'span',
      mergeAttributes(
        { 'data-type': 'math-inline', 'data-content': content },
        this.options.HTMLAttributes
      ),
      0,
    ];
  },

});
