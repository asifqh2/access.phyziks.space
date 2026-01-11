// src/app/syllabus/[id]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, getAllPosts, incrementPostViews } from '@/lib/data';
import CommentSection from '@/components/CommentSection';
import { formatDate, extractYouTubeId } from '@/lib/utils';
import { Calendar, Eye, Tag, FileDown, Video, BookOpen, ChevronRight } from 'lucide-react';
import { serializeMDXServer } from '@/lib/mdx-server';
import MathRenderer from '@/components/MathRenderer';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const allPosts = await getAllPosts();
  const post = allPosts.find(p => p.id === id);
  
  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: `${post.title} | Syllabus | Phyziks.space`,
    description: post.description,
    keywords: post.tags.join(', '),
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
    },
  };
}

export default async function SyllabusDetailPage({ params }: Props) {
  const { id } = await params;
  const allPosts = await getAllPosts();
  const post = allPosts.find(p => p.id === id);

  if (!post) {
    notFound();
  }

  // Get syllabus posts and find current index
  const syllabusPosts = allPosts.filter(p => p.isSyllabus);
  const currentIndex = syllabusPosts.findIndex(p => p.id === id);
  const previousPost = currentIndex > 0 ? syllabusPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < syllabusPosts.length - 1 ? syllabusPosts[currentIndex + 1] : null;

  // Increment views
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
            <Link href="/syllabus" className="text-gray-600 hover:text-blue-600">Syllabus</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            {post.syllabusPath && (
              <>
                {post.syllabusPath.split(' > ').map((part, index, arr) => (
                  <span key={index} className="flex items-center gap-2">
                    <span className="text-gray-600">{part}</span>
                    {index < arr.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </span>
                ))}
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
        {/* Left Sidebar - Document List */}
        <aside className="w-full lg:w-80 bg-white rounded-lg shadow-md p-4 lg:p-6 h-fit lg:sticky lg:top-4 order-2 lg:order-1">
          <h2 className="text-base lg:text-lg font-bold text-gray-900 mb-3 lg:mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 lg:w-5 lg:h-5 text-pink-600" />
            Syllabus Documents
          </h2>
          
          {/* Navigation Controls */}
          <div className="flex gap-2 mb-3 lg:mb-4">
            <button className="flex-1 px-2 lg:px-3 py-1 lg:py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              All Subjects
            </button>
            <button className="flex-1 px-2 lg:px-3 py-1 lg:py-2 text-xs bg-pink-100 text-pink-700 rounded-lg">
              Current
            </button>
          </div>
          
          {/* Previous/Next Navigation */}
          <div className="flex gap-2 mb-3 lg:mb-4">
            {previousPost ? (
              <Link
                href={`/syllabus/${previousPost.id}`}
                className="flex-1 px-2 lg:px-3 py-1 lg:py-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <ChevronRight className="w-3 h-3" style={{ transform: 'rotate(180deg)' }} />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Link>
            ) : (
              <div className="flex-1 px-2 lg:px-3 py-1 lg:py-2 text-xs bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center gap-1">
                <ChevronRight className="w-3 h-3" style={{ transform: 'rotate(180deg)' }} />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </div>
            )}
            {nextPost ? (
              <Link
                href={`/syllabus/${nextPost.id}`}
                className="flex-1 px-2 lg:px-3 py-1 lg:py-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            ) : (
              <div className="flex-1 px-2 lg:px-3 py-1 lg:py-2 text-xs bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center gap-1">
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            )}
          </div>
          
          <div className="space-y-2 max-h-64 lg:max-h-96 overflow-y-auto">
            {allPosts
              .filter(p => p.isSyllabus)
              .map((syllabusPost, index) => (
                <Link
                  key={syllabusPost.id}
                  href={`/syllabus/${syllabusPost.id}`}
                  className={`block p-2 lg:p-3 rounded-lg transition-colors relative ${
                    syllabusPost.id === post.id
                      ? 'bg-pink-50 border-l-4 border-pink-500 text-pink-900'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-xs lg:text-sm line-clamp-2">{syllabusPost.title}</div>
                      {syllabusPost.subject && (
                        <div className="text-xs text-gray-500 mt-1">{syllabusPost.subject}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1 lg:mt-2 text-xs text-gray-400">
                        <Eye className="w-3 h-3" />
                        {syllabusPost.views}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 ml-2">
                      {index + 1}
                    </div>
                  </div>
                  {syllabusPost.id === post.id && (
                    <div className="absolute right-2 top-2">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                    </div>
                  )}
                </Link>
              ))}
          </div>
          
          {/* Quick Actions */}
          <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-gray-200">
            <div className="space-y-2">
              <Link
                href="/syllabus"
                className="block w-full px-2 lg:px-3 py-1 lg:py-2 text-xs text-center text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                📚 All Syllabus
              </Link>
              <Link
                href="/"
                className="block w-full px-2 lg:px-3 py-1 lg:py-2 text-xs text-center text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                🏠 Home
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 max-w-4xl order-1 lg:order-2">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-md p-4 lg:p-8 mb-4 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 lg:mb-4">
            <span className="inline-block px-3 py-1 text-xs lg:text-sm font-semibold text-pink-600 bg-pink-100 rounded-full">
              Syllabus
            </span>
            {post.subject && (
              <span className="inline-block px-3 py-1 text-xs lg:text-sm font-semibold text-blue-600 bg-blue-100 rounded-full">
                {post.subject}
              </span>
            )}
          </div>

          <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-3 lg:mb-4">
            {post.title}
          </h1>

          <p className="text-base lg:text-xl text-gray-600 mb-4 lg:mb-6">
            {post.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs lg:text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 lg:w-4 lg:h-4" />
              {formatDate(post.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 lg:w-4 lg:h-4" />
              {post.views} views
            </span>
          </div>

          {post.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-3 lg:mt-4 flex-wrap">
              <Tag className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400" />
              {post.tags.map((tag) => (
                <span 
                  key={tag}
                  className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-50 text-blue-600 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Auto-Categorization Info */}
        {post.autoCategorize && (
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-r-lg p-6 mb-8">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              This content appears in:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {post.autoCategorize.isChapter && post.chapters && (
                <Link href="/chapter-wise" className="text-sm text-green-700 hover:text-green-900 flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  Chapter Wise
                </Link>
              )}
              {post.autoCategorize.isTopic && post.topics && (
                <Link href="/topic-wise" className="text-sm text-green-700 hover:text-green-900 flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  Topic Wise
                </Link>
              )}
              {post.autoCategorize.isConcept && post.concepts && (
                <Link href="/concept-wise" className="text-sm text-green-700 hover:text-green-900 flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  Concept Wise
                </Link>
              )}
              {post.autoCategorize.isLastYearPaper && post.year && (
                <Link href="/last-year-papers" className="text-sm text-green-700 hover:text-green-900 flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  Past Papers
                </Link>
              )}
            </div>
          </div>
        )}

        {/* YouTube Video */}
        {youtubeId && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
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

        {/* Download Materials */}
        {(post.pdfUrl || post.wordUrl) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900">
              <FileDown className="w-6 h-6 text-green-600" />
              Download Study Materials
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
                  Download PDF Notes
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
                  Download Word Document
                </a>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <MathRenderer content={post.content} className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900" />
        </div>

        {/* Related Topics */}
        {(post.chapters || post.topics || post.concepts) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Related Topics</h2>
            <div className="space-y-4">
              {post.chapters && post.chapters.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Chapters:</h3>
                  <div className="flex flex-wrap gap-2">
                    {post.chapters.map((chapter) => (
                      <span 
                        key={chapter}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                      >
                        {chapter}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {post.topics && post.topics.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Topics:</h3>
                  <div className="flex flex-wrap gap-2">
                    {post.topics.map((topic) => (
                      <span 
                        key={topic}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {post.concepts && post.concepts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Key Concepts:</h3>
                  <div className="flex flex-wrap gap-2">
                    {post.concepts.map((concept) => (
                      <span 
                        key={concept}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AdSense Placeholder */}
        <div className="bg-white rounded-lg p-8 mb-8 text-center text-gray-400 border-2 border-dashed border-gray-300">
          <div className="text-sm">Advertisement</div>
        </div>

        {/* Comments */}
        <CommentSection postId={post.id} />

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mt-6 lg:mt-8 pt-4 lg:pt-6 border-t border-gray-200">
          {previousPost ? (
            <Link
              href={`/syllabus/${previousPost.id}`}
              className="flex items-center gap-2 px-4 lg:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ChevronRight className="w-4 lg:w-5 h-4 lg:h-5" style={{ transform: 'rotate(180deg)' }} />
              <div className="text-left">
                <div className="text-xs opacity-75">Previous</div>
                <div className="font-medium text-sm lg:text-base">{previousPost.title.length > 25 ? previousPost.title.substring(0, 25) + '...' : previousPost.title}</div>
              </div>
            </Link>
          ) : (
            <div></div>
          )}
          
          {nextPost ? (
            <Link
              href={`/syllabus/${nextPost.id}`}
              className="flex items-center gap-2 px-4 lg:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <div className="text-right">
                <div className="text-xs opacity-75">Next</div>
                <div className="font-medium text-sm lg:text-base">{nextPost.title.length > 25 ? nextPost.title.substring(0, 25) + '...' : nextPost.title}</div>
              </div>
              <ChevronRight className="w-4 lg:w-5 h-4 lg:h-5" />
            </Link>
          ) : (
            <div></div>
          )}
        </div>

        {/* Back to Syllabus */}
        <div className="mt-6 text-center">
          <Link
            href="/syllabus"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            Back to Syllabus
          </Link>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
