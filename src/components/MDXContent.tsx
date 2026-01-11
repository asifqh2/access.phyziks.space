'use client';

// src/components/MDXContent.tsx
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MDXContentProps {
  source: MDXRemoteSerializeResult;
}

// Custom components for MDX
const components = {
  h1: (props: any) => <h1 className="text-4xl font-bold text-gray-900 mb-6 mt-8" {...props} />,
  h2: (props: any) => <h2 className="text-3xl font-bold text-gray-900 mb-4 mt-6" {...props} />,
  h3: (props: any) => <h3 className="text-2xl font-semibold text-gray-900 mb-3 mt-5" {...props} />,
  h4: (props: any) => <h4 className="text-xl font-semibold text-gray-900 mb-2 mt-4" {...props} />,
  p: (props: any) => <p className="text-gray-700 leading-relaxed mb-4" {...props} />,
  ul: (props: any) => <ul className="list-disc list-inside mb-4 space-y-2 ml-4" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-inside mb-4 space-y-2 ml-4" {...props} />,
  li: (props: any) => <li className="text-gray-700" {...props} />,
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-4 py-2 my-4 italic text-gray-700" {...props} />
  ),
  code: (props: any) => (
    <code className="bg-gray-100 text-red-600 px-2 py-1 rounded text-sm font-mono" {...props} />
  ),
  pre: (props: any) => (
    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4" {...props} />
  ),
  a: (props: any) => <a className="text-blue-600 hover:underline" {...props} />,
  table: (props: any) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border-collapse border border-gray-300" {...props} />
    </div>
  ),
  th: (props: any) => <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold" {...props} />,
  td: (props: any) => <td className="border border-gray-300 px-4 py-2" {...props} />,
  hr: (props: any) => <hr className="my-8 border-gray-300" {...props} />,
  strong: (props: any) => <strong className="font-bold text-gray-900" {...props} />,
  em: (props: any) => <em className="italic" {...props} />,
};

export default function MDXContent({ source }: MDXContentProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <MDXRemote {...source} components={components} />
    </div>
  );
}

// Helper function to serialize MDX content
export async function serializeMDX(content: string): Promise<MDXRemoteSerializeResult> {
  return await serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [rehypeKatex],
    },
  });
}