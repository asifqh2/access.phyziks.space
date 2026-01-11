// src/lib/mdx-server.ts
import { serialize } from 'next-mdx-remote/serialize';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export async function serializeMDXServer(content: string) {
  try {
    const mdxSource = await serialize(content, {
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [
          rehypeHighlight,
          rehypeSlug,
          rehypeKatex,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        ],
      },
    });
    return mdxSource;
  } catch (error) {
    console.error('Error serializing MDX:', error);
    throw error;
  }
}