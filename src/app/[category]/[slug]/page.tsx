// src/app/[category]/[slug]/page.tsx
// Copy this file structure for each category folder

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug, incrementPostViews, getPublicPosts } from '@/lib/data';
import CommentSection from '@/components/CommentSection';
import { formatDate, extractYouTubeId } from '@/lib/utils';
import { getRelatedContent, addIdsToContent } from '@/lib/post-utils';
import { Calendar, Eye, Tag, FileDown, Video } from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import PdfDownloadButton from '@/components/PdfDownloadButton';
import PinButton from '@/components/PinButton';
import BlogPostLayout from '@/components/BlogPostLayout';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  const contentWithIds = addIdsToContent(post.content);

  // Get all posts for related content
  const allPosts = await getPublicPosts();
  
  // Get related content using utility function
  const { relatedPosts, relatedChapters, relatedTopics, relatedConcepts } = getRelatedContent(post, allPosts);

  return (
    <BlogPostLayout
      post={{
        id: post.id,
        title: post.title,
        content: contentWithIds,
        tags: post.tags,
        chapters: post.chapters,
        topics: post.topics,
        concepts: post.concepts,
        category: post.category,
        subject: post.subject
      }}
      relatedPosts={relatedPosts.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        views: p.views
      }))}
      relatedChapters={relatedChapters.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        views: p.views
      }))}
      relatedTopics={relatedTopics.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        views: p.views
      }))}
      relatedConcepts={relatedConcepts.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        views: p.views
      }))}
    >
      <article>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full">
              {post.category ? post.category.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ') : 'Uncategorized'}
            </span>
            {post.year && (
              <span className="text-sm font-medium text-gray-600">
                Year: {post.year}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-6">
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
            <PdfDownloadButton title={post.title} />
            <PinButton 
              id={post.id}
              title={post.title}
              content={post.description || post.content?.substring(0, 200) || ''}
              category={post.category}
              subject={post.subject}
              url={`/${post.category}/${post.slug}`}
            />
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900">
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900">
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 sm:p-8 mb-8 text-gray-900" data-math-rendered>
          <MathRenderer content={contentWithIds} />
        </div>

        {/* AdSense Placeholder */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-8 text-center text-gray-400 border-2 border-dashed border-gray-300">
          <div className="text-sm">Advertisement</div>
        </div>

        {/* Comments */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <CommentSection postId={post.id} />
        </div>
      </article>
    </BlogPostLayout>
  );
}