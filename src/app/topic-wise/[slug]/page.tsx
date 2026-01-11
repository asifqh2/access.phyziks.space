// src/app/topic-wise/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, incrementPostViews } from '@/lib/data';
import CommentSection from '@/components/CommentSection';
import MDXContent from '@/components/MDXContent';
import { formatDate, extractYouTubeId } from '@/lib/utils';
import { Calendar, Eye, Tag, FileDown, Video, Layers, ChevronRight } from 'lucide-react';

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
    title: `${post.title} | Topic Wise | Phyziks.space`,
    description: post.description,
    keywords: post.tags.join(', '),
  };
}

export default async function TopicDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  await incrementPostViews(post.id);
  const youtubeId = post.youtubeUrl ? extractYouTubeId(post.youtubeUrl) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-600 hover:text-blue-600">Home</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link href="/topic-wise" className="text-gray-600 hover:text-blue-600">Topic Wise</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{post.title}</span>
          </nav>
        </div>
      </div>

      <article className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block px-3 py-1 text-sm font-semibold text-purple-600 bg-purple-100 rounded-full">
              Topic Wise
            </span>
            {post.subject && (
              <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full">
                {post.subject}
              </span>
            )}
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
          <p className="text-xl text-gray-600 mb-6">{post.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(post.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {post.views} views
            </span>
          </div>

          {post.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Tag className="w-4 h-4 text-gray-400" />
              {post.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full">
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

        {/* Download Materials */}
        {(post.pdfUrl || post.wordUrl) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FileDown className="w-6 h-6 text-green-600" />
              Download Materials
            </h2>
            <div className="flex flex-wrap gap-4">
              {post.pdfUrl && (
                <a
                  href={post.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileDown className="w-5 h-5" />
                  Download Word
                </a>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* Related Topics */}
        {post.topics && post.topics.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Layers className="w-6 h-6 text-purple-600" />
              Related Topics
            </h2>
            <div className="flex flex-wrap gap-2">
              {post.topics.map((topic) => (
                <span 
                  key={topic}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AdSense Placeholder */}
        <div className="bg-white rounded-lg p-8 mb-8 text-center text-gray-400 border-2 border-dashed border-gray-300">
          <div className="text-sm">Advertisement</div>
        </div>

        {/* Comments */}
        <CommentSection postId={post.id} />

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link
            href="/topic-wise"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Layers className="w-5 h-5" />
            Back to Topic Wise
          </Link>
        </div>
      </article>
    </div>
  );
}