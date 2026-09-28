import { Metadata } from 'next';
import { getPublicPosts } from '@/lib/data';
import PostCard from '@/components/PostCard';
import { getCategoryPosts } from '@/lib/utils';
import { BookOpen, Layers } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Topic Wise Study Materials | Phyziks.space - In-Depth Topic Explanations',
  description: 'Explore topics in-depth with structured lessons, explanations, and examples. Master physics, chemistry, and math topics with detailed notes and practice problems.',
  keywords: 'topic wise study, topic wise notes, physics topics, chemistry topics, math topics, detailed explanations, topic mastery, subject topics, learning by topics, structured topics',
  openGraph: {
    title: 'Topic Wise Study Materials | Phyziks.space',
    description: 'Explore topics in-depth with structured lessons, explanations, and examples',
    type: 'website',
    url: 'https://phyziks.space/topic-wise',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Topic Wise Study Materials | Phyziks.space',
    description: 'Explore topics in-depth with structured lessons, explanations, and examples',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://phyziks.space/topic-wise',
  },
};

export default async function TopicWisePage() {
  const allPosts = await getPublicPosts();
  const posts = getCategoryPosts(allPosts, 'topic');

  // Group posts by topics
  const topicMap = new Map<string, typeof posts>();
  
  posts.forEach(post => {
    if (post.topics && post.topics.length > 0) {
      post.topics.forEach(topic => {
        if (!topicMap.has(topic)) {
          topicMap.set(topic, []);
        }
        const topicPosts = topicMap.get(topic)!;
        if (!topicPosts.find(p => p.id === post.id)) {
          topicPosts.push(post);
        }
      });
    }
  });

  const topics = Array.from(topicMap.keys()).sort();

  // Group topics by subject
  const topicsBySubject = new Map<string, string[]>();
  posts.forEach(post => {
    const subject = post.subject || 'General';
    if (post.topics) {
      post.topics.forEach(topic => {
        if (!topicsBySubject.has(subject)) {
          topicsBySubject.set(subject, []);
        }
        const subjectTopics = topicsBySubject.get(subject)!;
        if (!subjectTopics.includes(topic)) {
          subjectTopics.push(topic);
        }
      });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Topic Wise Study' }]} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Topic Wise</h1>
          </div>
          <p className="text-xl text-blue-100">
            Explore topics step-by-step with structured explanations
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white border-b py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <div className="text-3xl font-bold text-blue-600">{topics.length}</div>
              <div className="text-gray-600 mt-1">Topics</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-blue-600">{posts.length}</div>
              <div className="text-gray-600 mt-1">Explanations</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-blue-600">
                {topicsBySubject.size}
              </div>
              <div className="text-gray-600 mt-1">Subjects</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-blue-600">
                {posts.reduce((acc, post) => acc + post.views, 0)}
              </div>
              <div className="text-gray-600 mt-1">Total Views</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="bg-gradient-to-r from-blue-50 to-blue-100 py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Quick Jump to Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {topics.slice(0, 20).map((topic) => (
              <a
                key={topic}
                href={`#${topic.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-4 py-2 bg-white text-blue-700 rounded-full text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors shadow-sm"
              >
                {topic}
              </a>
            ))}
            {topics.length > 20 && (
              <span className="px-4 py-2 text-gray-500 text-sm">
                +{topics.length - 20} more
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No topic materials available yet.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {topics.map((topic) => {
                const topicPosts = topicMap.get(topic) || [];
                return (
                  <div 
                    key={topic}
                    id={topic.toLowerCase().replace(/\s+/g, '-')}
                    className="scroll-mt-8"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-xl flex items-center gap-2">
                        <Layers className="w-5 h-5" />
                        {topic}
                      </div>
                      <span className="text-gray-400 text-lg">
                        ({topicPosts.length} {topicPosts.length === 1 ? 'explanation' : 'explanations'})
                      </span>
                    </div>

                    {/* Related Subjects */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(topicPosts.map(p => p.subject).filter(Boolean))).map(subject => (
                          <span 
                            key={subject}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {topicPosts.map((post) => (
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
      <section className="py-12 bg-blue-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-blue-600" />
              Why Topic-Based Learning?
            </h2>
            <div className="prose prose-blue max-w-none">
              <p className="text-gray-700 mb-4">
                Topic-based study helps you dive deeper into structured content that builds upon itself. 
                Each topic includes explanations, solved examples, and key takeaways to help you grasp it fully.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-semibold text-blue-900 mb-2">📘 Structured Learning</h3>
                  <p className="text-sm text-blue-800">
                    Study topics in a logical and sequential order.
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-semibold text-blue-900 mb-2">🔍 Focused Revision</h3>
                  <p className="text-sm text-blue-800">
                    Quickly locate and revise key topics before exams.
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-semibold text-blue-900 mb-2">🧠 Concept Clarity</h3>
                  <p className="text-sm text-blue-800">
                    Build clarity by studying related ideas under each topic.
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-semibold text-blue-900 mb-2">⚡ Easy Navigation</h3>
                  <p className="text-sm text-blue-800">
                    Jump between topics quickly with structured grouping.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800">
                  <strong>💡 Pro Tip:</strong> Combine topic-wise and concept-wise learning for 
                  maximum understanding and retention!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
