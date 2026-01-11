import { Metadata } from 'next';
import Link from 'next/link';
import { getPublicPosts } from '@/lib/data';
import PostCard from '@/components/PostCard';
import { getCategoryPosts } from '@/lib/utils';
import { Book, LayoutList } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Chapter Wise Study Materials | Phyziks.space - Organized Learning by Chapters',
  description: 'Study materials organized chapter-wise for structured and efficient learning. Access physics, chemistry, and math notes arranged by textbook chapters for systematic preparation.',
  keywords: 'chapter wise study, chapter wise notes, physics chapters, chemistry chapters, math chapters, structured learning, textbook chapters, organized study materials, sequential learning',
  openGraph: {
    title: 'Chapter Wise Study Materials | Phyziks.space',
    description: 'Study materials organized chapter-wise for structured and efficient learning',
    type: 'website',
    url: 'https://phyziks.space/chapter-wise',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chapter Wise Study Materials | Phyziks.space',
    description: 'Study materials organized chapter-wise for structured and efficient learning',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://phyziks.space/chapter-wise',
  },
};

export default async function ChapterWisePage() {
  const allPosts = await getPublicPosts();
  const posts = getCategoryPosts(allPosts, 'chapter');

  // Group posts by chapters
  const chapterMap = new Map<string, typeof posts>();
  
  posts.forEach(post => {
    if (post.chapters && post.chapters.length > 0) {
      post.chapters.forEach(chapter => {
        if (!chapterMap.has(chapter)) chapterMap.set(chapter, []);
        const chapterPosts = chapterMap.get(chapter)!;
        if (!chapterPosts.find(p => p.id === post.id)) chapterPosts.push(post);
      });
    }
  });

  const chapters = Array.from(chapterMap.keys()).sort();

  // Group chapters by subject
  const chaptersBySubject = new Map<string, string[]>();
  posts.forEach(post => {
    const subject = post.subject || 'General';
    if (post.chapters) {
      post.chapters.forEach(chapter => {
        if (!chaptersBySubject.has(subject)) {
          chaptersBySubject.set(subject, []);
        }
        const subjectChapters = chaptersBySubject.get(subject)!;
        if (!subjectChapters.includes(chapter)) {
          subjectChapters.push(chapter);
        }
      });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Chapter Wise Study' }]} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Book className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Chapter Wise</h1>
          </div>
          <p className="text-xl text-green-100">
            Study organized chapter-by-chapter for better clarity and focus
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white border-b py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <div className="text-3xl font-bold text-green-600">{chapters.length}</div>
              <div className="text-gray-600 mt-1">Chapters</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-green-600">{posts.length}</div>
              <div className="text-gray-600 mt-1">Explanations</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-green-600">{chaptersBySubject.size}</div>
              <div className="text-gray-600 mt-1">Subjects</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-green-600">
                {posts.reduce((acc, post) => acc + post.views, 0)}
              </div>
              <div className="text-gray-600 mt-1">Total Views</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="bg-gradient-to-r from-green-50 to-green-100 py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <LayoutList className="w-5 h-5 text-green-600" />
            Quick Jump to Chapters
          </h2>
          <div className="flex flex-wrap gap-2">
            {chapters.slice(0, 20).map((chapter) => (
              <a
                key={chapter}
                href={`#${chapter.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-4 py-2 bg-white text-green-700 rounded-full text-sm font-medium hover:bg-green-600 hover:text-white transition-colors shadow-sm"
              >
                {chapter}
              </a>
            ))}
            {chapters.length > 20 && (
              <span className="px-4 py-2 text-gray-500 text-sm">
                +{chapters.length - 20} more
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No chapter materials available yet.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {chapters.map((chapter) => {
                const chapterPosts = chapterMap.get(chapter) || [];
                return (
                  <div 
                    key={chapter}
                    id={chapter.toLowerCase().replace(/\s+/g, '-')}
                    className="scroll-mt-8"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold text-xl flex items-center gap-2">
                        <LayoutList className="w-5 h-5" />
                        {chapter}
                      </div>
                      <span className="text-gray-400 text-lg">
                        ({chapterPosts.length} {chapterPosts.length === 1 ? 'explanation' : 'explanations'})
                      </span>
                    </div>

                    {/* Related Subjects */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(chapterPosts.map(p => p.subject).filter(Boolean))).map(subject => (
                          <span 
                            key={subject}
                            className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {chapterPosts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="py-12 bg-green-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Book className="w-7 h-7 text-green-600" />
              Why Chapter-Based Learning?
            </h2>
            <div className="prose prose-green max-w-none">
              <p className="text-gray-700 mb-4">
                Chapter-based learning helps you follow a structured path through each subject, 
                ensuring comprehensive understanding and smooth progression.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <h3 className="font-semibold text-green-900 mb-2">📖 Sequential Learning</h3>
                  <p className="text-sm text-green-800">
                    Learn each chapter step-by-step, just like in textbooks.
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <h3 className="font-semibold text-green-900 mb-2">🧩 Organized Content</h3>
                  <p className="text-sm text-green-800">
                    Keep related concepts and topics under the same chapter.
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <h3 className="font-semibold text-green-900 mb-2">📝 Easy Tracking</h3>
                  <p className="text-sm text-green-800">
                    Track progress chapter by chapter during your preparation.
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <h3 className="font-semibold text-green-900 mb-2">🚀 Efficient Revision</h3>
                  <p className="text-sm text-green-800">
                    Quickly revisit key chapters for fast exam revision.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Pro Tip:</strong> Combine <em>chapter-wise</em>, <em>concept-wise</em>, 
                  and <em>topic-wise</em> study for complete mastery of every subject!
                </p>
              </div>
            </div>
          </div>
          
          {/* Related Study Methods */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Explore Other Study Methods
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/topic-wise" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-l-4 border-blue-500">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  📝 Topic Wise Study
                </h4>
                <p className="text-sm text-blue-800">
                  Learn through specific topic breakdowns and detailed explanations.
                </p>
              </Link>
              
              <Link href="/concept-wise" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-l-4 border-orange-500">
                <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                  💡 Concept Wise Learning
                </h4>
                <p className="text-sm text-orange-800">
                  Master fundamental concepts with detailed explanations and examples.
                </p>
              </Link>
              
              <Link href="/last-year-papers" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-l-4 border-purple-500">
                <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  📚 Previous Papers
                </h4>
                <p className="text-sm text-purple-800">
                  Practice with solved previous year question papers.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
