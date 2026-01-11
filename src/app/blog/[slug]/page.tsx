// src/app/blog/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, incrementPostViews, getPublicPosts } from '@/lib/data';
import CommentSection from '@/components/CommentSection';
import { formatDate, extractYouTubeId } from '@/lib/utils';
import { getRelatedContent, addIdsToContent } from '@/lib/post-utils';
import { Calendar, Eye, Tag, FileDown, Video, FileText } from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import BlogPostLayout from '@/components/BlogPostLayout';

interface Props {
  params: Promise<{ slug: string }>;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  
  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: `${post.title} | Blog | Phyziks.space`,
    description: post.description,
    keywords: (post.tags || []).join(', '),
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  await incrementPostViews(post.id);
  const youtubeId = post.youtubeUrl ? extractYouTubeId(post.youtubeUrl) : null;

  // Generate TOC and add IDs to content
  const contentWithIds = addIdsToContent(post.content);

  // Get all posts for related content
  const allPosts = await getPublicPosts();
  const blogPosts = allPosts.filter(p => p.category === 'blog');
  const currentIndex = blogPosts.findIndex(p => p.id === post.id);
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;
  
  // Get related content using utility function
  const { relatedPosts, relatedChapters, relatedTopics, relatedConcepts } = getRelatedContent(post, allPosts);

  return (
    <BlogPostLayout
      post={{
        id: post.id,
        title: post.title,
        content: contentWithIds,
        tags: post.tags || [],
        chapters: post.chapters || [],
        topics: post.topics || [],
        concepts: post.concepts || [],
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
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors mb-4 sm:mb-8 bg-white/80 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full shadow-sm hover:shadow-md touch-manipulation"
            >
              ← Back to blog
            </Link>

            <header className="mb-6 sm:mb-12 bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-lg border border-white/20">
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span className="inline-flex items-center px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md">
                    {post.category || 'Blog'}
                  </span>
                  {post.subject && (
                    <span className="inline-flex items-center px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border border-blue-200">
                      {post.subject}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                  <time className="flex items-center gap-1 sm:gap-2 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full"></span>
                    <span className="hidden sm:inline">
                      {formatDate(post.createdAt)}
                    </span>
                    <span className="sm:hidden">
                      {new Date(post.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </time>
                  <span className="flex items-center gap-1 sm:gap-2 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></span>
                    {Math.ceil((post.content?.length || 1000) / 200)} min read
                  </span>
                  <span className="flex items-center gap-1 sm:gap-2 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></span>
                    {post.views} views
                  </span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-tight mb-4 sm:mb-6 bg-gradient-to-r from-gray-900 via-purple-800 to-pink-800 bg-clip-text text-transparent">
                {post.title}
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed mb-4 sm:mb-8 border-l-4 border-purple-500 pl-3 sm:pl-6 bg-purple-50/50 py-3 sm:py-4 rounded-r-lg">
                {post.description}
              </p>

              {(post.tags || []).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-4 h-4 text-gray-400" />
                  {(post.tags || []).map((tag) => (
                    <span key={tag} className="px-3 py-1 text-sm bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 rounded-full border border-blue-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-0.5 sm:h-1 rounded-full mb-6 sm:mb-12 shadow-lg" />

            {/* YouTube Video */}
            {youtubeId && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-white/20 mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
                  <Video className="w-6 h-6 text-red-600" />
                  Video Content
                </h2>
                <div className="aspect-video rounded-xl overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    title="YouTube video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Download Materials */}
            {(post.pdfUrl || post.wordUrl) && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-white/20 mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileDown className="w-6 h-6 text-green-600" />
                  Download Resources
                </h2>
                <div className="flex flex-wrap gap-4">
                  {post.pdfUrl && (
                    <a
                      href={post.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                    >
                      <FileDown className="w-5 h-5" />
                      Download PDF
                    </a>
                  )}
                  {post.wordUrl && (
                    <a
                      href={post.wordUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                    >
                      <FileDown className="w-5 h-5" />
                      Download Word
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-white/20 mb-6 sm:mb-8">
              <div className="p-4 sm:p-8 prose prose-sm sm:prose-base lg:prose-lg max-w-none text-gray-900">
                <div dangerouslySetInnerHTML={{ __html: contentWithIds }} />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-12">
              {prevPost ? (
                <Link href={`/blog/${prevPost.slug}`} title={prevPost.title} className="w-full sm:w-auto">
                  <button className="group w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 text-sm sm:text-base touch-manipulation">
                    <span className="flex items-center justify-center gap-2">
                      <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
                      <span className="truncate">
                        {prevPost.title.length > 20
                          ? prevPost.title.substring(0, 35) + "..."
                          : prevPost.title}
                      </span>
                    </span>
                  </button>
                </Link>
              ) : (
                <div className="w-full sm:w-auto"></div>
              )}
              {nextPost ? (
                <Link href={`/blog/${nextPost.slug}`} title={nextPost.title} className="w-full sm:w-auto">
                  <button className="group w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 text-sm sm:text-base touch-manipulation">
                    <span className="flex items-center justify-center gap-2">
                      <span className="truncate">
                        {nextPost.title.length > 20
                          ? nextPost.title.substring(0, 35) + "..."
                          : nextPost.title}
                      </span>
                      <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </button>
                </Link>
              ) : (
                <div className="w-full sm:w-auto"></div>
              )}
            </div>

        {/* Comments */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-white/20 p-4 sm:p-6">
          <CommentSection postId={post.id} />
        </div>
      </article>
    </BlogPostLayout>
  );
}

