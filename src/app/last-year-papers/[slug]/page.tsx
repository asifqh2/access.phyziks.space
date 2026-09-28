// src/app/[category]/[slug]/page.tsx
// Copy this file structure for each category folder

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug, incrementPostViews } from '@/lib/data';
import CommentSection from '@/components/CommentSection';
import { formatDate, extractYouTubeId } from '@/lib/utils';
import { Calendar, Eye, Tag, FileDown, Video } from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  
  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: `${post.title} | Phyziks.space`,
    description: post.description,
    keywords: post.tags.join(', '),
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Increment views (in production, do this client-side to avoid counting bots)
  await incrementPostViews(post.id);

  const youtubeId = post.youtubeUrl ? extractYouTubeId(post.youtubeUrl) : null;



  return (
    <div className="min-h-screen bg-gray-50">
      <article className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full">
              {post.category.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </span>
            {post.year && (
              <span className="text-sm font-medium text-gray-600">
                Year: {post.year}
              </span>
            )}
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>

          <p className="text-xl text-gray-600 mb-6">
            {post.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(post.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {post.views} views
            </span>
            {post.subject && (
              <span className="px-3 py-1 bg-gray-100 rounded-full">
                {post.subject}
              </span>
            )}
          </div>

          {post.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Tag className="w-4 h-4 text-gray-400" />
              {post.tags.map((tag) => (
                <span 
                  key={tag}
                  className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* YouTube Video */}
        {youtubeId && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Video className="w-6 h-6 text-red-600" />
              Video Explanation
            </h2>
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              />
            </div>
          </div>
        )}

        {/* PDF/Documents */}
        {post.pdfUrl && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FileDown className="w-6 h-6 text-green-600" />
              Download Materials
            </h2>
            <a
              href={post.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileDown className="w-5 h-5" />
              Download PDF/Notes
            </a>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <MathRenderer content={post.content} />
        </div>

        {/* AdSense Placeholder */}
        <div className="bg-white rounded-lg p-8 mb-8 text-center text-gray-400 border-2 border-dashed border-gray-300">
          <div className="text-sm">Advertisement</div>
        </div>

        {/* Comments */}
        <CommentSection postId={post.id} />
      </article>
    </div>
  );
}