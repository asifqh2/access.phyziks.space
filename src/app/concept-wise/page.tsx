import { Metadata } from 'next';
import { getPublicPosts } from '@/lib/data';
import PostCard from '@/components/PostCard';
import { getCategoryPosts } from '@/lib/utils';
import { Brain, Lightbulb } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Concept Wise Study Materials | Phyziks.space - Master Fundamental Concepts',
  description: 'Master fundamental concepts with detailed explanations, examples, and practice materials. Build strong foundation in physics, chemistry, and math with concept-based learning.',
  keywords: 'concept wise study, fundamental concepts, physics concepts, chemistry concepts, math concepts, concept mastery, basic concepts, conceptual learning, concept explanations, foundation building',
  openGraph: {
    title: 'Concept Wise Study Materials | Phyziks.space',
    description: 'Master fundamental concepts with detailed explanations, examples, and practice materials',
    type: 'website',
    url: 'https://phyziks.space/concept-wise',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Concept Wise Study Materials | Phyziks.space',
    description: 'Master fundamental concepts with detailed explanations, examples, and practice materials',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://phyziks.space/concept-wise',
  },
};

export default async function ConceptWisePage() {
  const allPosts = await getPublicPosts();
  const posts = getCategoryPosts(allPosts, 'concept');

  // Group posts by concepts
  const conceptMap = new Map<string, typeof posts>();
  
  posts.forEach(post => {
    if (post.concepts && post.concepts.length > 0) {
      post.concepts.forEach(concept => {
        if (!conceptMap.has(concept)) conceptMap.set(concept, []);
        const conceptPosts = conceptMap.get(concept)!;
        if (!conceptPosts.find(p => p.id === post.id)) conceptPosts.push(post);
      });
    }
  });

  const concepts = Array.from(conceptMap.keys()).sort();

  // Group concepts by subject if available
  const conceptsBySubject = new Map<string, string[]>();
  posts.forEach(post => {
    const subject = post.subject || 'General';
    if (post.concepts) {
      post.concepts.forEach(concept => {
        if (!conceptsBySubject.has(subject)) {
          conceptsBySubject.set(subject, []);
        }
        const subjectConcepts = conceptsBySubject.get(subject)!;
        if (!subjectConcepts.includes(concept)) {
          subjectConcepts.push(concept);
        }
      });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Concept Wise Study' }]} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-600 to-purple-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Concept Wise</h1>
          </div>
          <p className="text-xl text-orange-100">
            Master fundamental concepts with detailed explanations
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white border-b py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <div className="text-3xl font-bold text-orange-600">{concepts.length}</div>
              <div className="text-gray-600 mt-1">Concepts</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-orange-600">{posts.length}</div>
              <div className="text-gray-600 mt-1">Explanations</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-orange-600">
                {conceptsBySubject.size}
              </div>
              <div className="text-gray-600 mt-1">Subjects</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-orange-600">
                {posts.reduce((acc, post) => acc + post.views, 0)}
              </div>
              <div className="text-gray-600 mt-1">Total Views</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="bg-gradient-to-r from-orange-50 to-orange-100 py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-orange-600" />
            Quick Jump to Concepts
          </h2>
          <div className="flex flex-wrap gap-2">
            {concepts.slice(0, 20).map((concept) => (
              <a
                key={concept}
                href={`#${concept.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-4 py-2 bg-white text-orange-700 rounded-full text-sm font-medium hover:bg-orange-600 hover:text-white transition-colors shadow-sm"
              >
                {concept}
              </a>
            ))}
            {concepts.length > 20 && (
              <span className="px-4 py-2 text-gray-500 text-sm">
                +{concepts.length - 20} more
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
              <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No concept materials available yet.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {concepts.map((concept) => {
                const conceptPosts = conceptMap.get(concept) || [];
                return (
                  <div 
                    key={concept}
                    id={concept.toLowerCase().replace(/\s+/g, '-')}
                    className="scroll-mt-8"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold text-xl flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        {concept}
                      </div>
                      <span className="text-gray-400 text-lg">
                        ({conceptPosts.length} {conceptPosts.length === 1 ? 'explanation' : 'explanations'})
                      </span>
                    </div>

                    {/* Related Subjects */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(conceptPosts.map(p => p.subject).filter(Boolean))).map(subject => (
                          <span 
                            key={subject}
                            className="text-xs px-3 py-1 bg-orange-100 text-orange-700 rounded-full"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {conceptPosts.map((post) => (
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
      <section className="py-12 bg-orange-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Brain className="w-7 h-7 text-orange-600" />
              Why Concept-Based Learning?
            </h2>
            <div className="prose prose-orange max-w-none">
              <p className="text-gray-700 mb-4">
                Understanding fundamental concepts is the key to mastering any subject. 
                Our concept-wise organization breaks down complex topics into digestible, 
                well-explained concepts that build your foundation.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                  <h3 className="font-semibold text-orange-900 mb-2">🎯 Deep Understanding</h3>
                  <p className="text-sm text-orange-800">Focus on why and how, not just what.</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                  <h3 className="font-semibold text-orange-900 mb-2">🔗 Connect Ideas</h3>
                  <p className="text-sm text-orange-800">See how concepts relate to each other.</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                  <h3 className="font-semibold text-orange-900 mb-2">💡 Practical Examples</h3>
                  <p className="text-sm text-orange-800">Real-world applications and use cases.</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                  <h3 className="font-semibold text-orange-900 mb-2">📚 Build Foundation</h3>
                  <p className="text-sm text-orange-800">Strong basics lead to advanced mastery.</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>💡 Pro Tip:</strong> Start with fundamental concepts before moving to 
                  complex topics. Understanding basics thoroughly makes advanced topics much easier!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
