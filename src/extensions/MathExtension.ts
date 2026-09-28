import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Inline math node — renders inside paragraphs/headings.
 * Stored as: <span data-type="math-inline" data-content="x^2">
 */
export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      content: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-inline"]',
        getAttrs: (el) => ({
          content: (el as HTMLElement).getAttribute('data-content') ?? '',
        }),
      },
      // Legacy: plain <span class="math-inline">$...$</span>
      {
        tag: 'span.math-inline',
        getAttrs: (el) => ({
          content: (el as HTMLElement).textContent?.replace(/^\$|\$$/g, '') ?? '',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-type': 'math-inline', 'data-content': HTMLAttributes.content }),
      0,
    ];
  },
});

/**
 * Block math node — renders as its own paragraph-level block.
 * Stored as: <div data-type="math-display" data-content="\sum_i i">
 */
export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      content: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-display"]',
        getAttrs: (el) => ({
          content: (el as HTMLElement).getAttribute('data-content') ?? '',
        }),
      },
      // Legacy: <p class="math-display">$$...$$</p> or <div class="math-display">$$...$$</div>
      {
        tag: 'p.math-display',
        getAttrs: (el) => ({
          content: (el as HTMLElement).textContent?.replace(/^\$\$|\$\$$/g, '').trim() ?? '',
        }),
      },
      {
        tag: 'div.math-display',
        getAttrs: (el) => ({
          content: (el as HTMLElement).textContent?.replace(/^\$\$|\$\$$/g, '').trim() ?? '',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'math-display', 'data-content': HTMLAttributes.content }),
    ];
  },
});

// Re-export a single object for convenience
export const MathExtension = [MathInline, MathBlock];
