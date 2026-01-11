// src/app/blog/page.tsx
import { Metadata } from 'next';
import { getPublicPosts } from '@/lib/data';
import { FileText } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Educational Blog | Phyziks.space - Study Tips, Learning Strategies & Exam Preparation',
  description: 'Read articles, tips, and insights about education, learning strategies, exam preparation, and study techniques. Get expert advice for better academic performance.',
  keywords: 'educational blog, study tips, learning strategies, exam preparation, study techniques, academic advice, education articles, learning tips, student success, study methods',
  openGraph: {
    title: 'Educational Blog | Phyziks.space',
    description: 'Read articles, tips, and insights about education, learning strategies, and exam preparation',
    type: 'website',
    url: 'https://phyziks.space/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Educational Blog | Phyziks.space',
    description: 'Read articles, tips, and insights about education, learning strategies, and exam preparation',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://phyziks.space/blog',
  },
};

export default async function BlogPage() {
  const allPosts = await getPublicPosts();
  const blogPosts = allPosts.filter(post => post.category === 'blog');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Educational Blog' }]} />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-yellow-300/20 rounded-full blur-lg"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-6 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
              <FileText className="w-8 h-8 text-yellow-300" />
              <span className="text-lg font-medium">Educational Blog</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
              Learn & Grow
            </h1>
            <p className="text-xl md:text-2xl text-purple-100 max-w-2xl mx-auto leading-relaxed">
              Discover amazing articles, study tips, and insights to accelerate your learning journey
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="-mt-10 relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-8 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="text-4xl font-bold mb-2">{blogPosts.length}</div>
              <div className="text-blue-100 text-lg">Articles Published</div>
              <div className="mt-4 w-12 h-1 bg-white/30 rounded-full"></div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-8 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="text-4xl font-bold mb-2">
                {blogPosts.reduce((acc, post) => acc + (post.views || 0), 0)}
              </div>
              <div className="text-purple-100 text-lg">Total Reads</div>
              <div className="mt-4 w-12 h-1 bg-white/30 rounded-full"></div>
            </div>
            <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white p-8 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="text-4xl font-bold mb-2">
                {new Set(blogPosts.flatMap(p => p.tags || [])).size}
              </div>
              <div className="text-pink-100 text-lg">Topics Covered</div>
              <div className="mt-4 w-12 h-1 bg-white/30 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Latest <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Articles</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Explore our collection of educational content designed to help you succeed
            </p>
          </div>
          {blogPosts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl shadow-lg">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon!</h3>
              <p className="text-gray-600 text-lg mb-2">Amazing articles are on their way.</p>
              <p className="text-gray-500">Check back soon for fresh educational content!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                What You'll <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Discover</span>
              </h2>
              <p className="text-gray-700 text-lg max-w-3xl mx-auto leading-relaxed">
                Welcome to the Phyziks.space blog! Here we share valuable insights, study tips, 
                learning strategies, and educational content to help you excel in your studies.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-xl font-bold mb-3">Study Tips & Techniques</h3>
                <p className="text-blue-100 leading-relaxed">
                  Master effective learning strategies, time management, and study methods that actually work
                </p>
                <div className="mt-4 w-12 h-1 bg-white/30 rounded-full group-hover:w-20 transition-all duration-300"></div>
              </div>
              <div className="group bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-bold mb-3">Exam Preparation</h3>
                <p className="text-purple-100 leading-relaxed">
                  Get insider tips, proven strategies, and confidence-building techniques for acing your exams
                </p>
                <div className="mt-4 w-12 h-1 bg-white/30 rounded-full group-hover:w-20 transition-all duration-300"></div>
              </div>
              <div className="group bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-2xl text-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-4xl mb-4">💡</div>
                <h3 className="text-xl font-bold mb-3">Learning Insights</h3>
                <p className="text-pink-100 leading-relaxed">
                  Stay updated with the latest research in education and learning science for better results
                </p>
                <div className="mt-4 w-12 h-1 bg-white/30 rounded-full group-hover:w-20 transition-all duration-300"></div>
              </div>
              <div className="group bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-4xl mb-4">🌟</div>
                <h3 className="text-xl font-bold mb-3">Success Stories</h3>
                <p className="text-green-100 leading-relaxed">
                  Get inspired by real student success stories and learn from their winning strategies
                </p>
                <div className="mt-4 w-12 h-1 bg-white/30 rounded-full group-hover:w-20 transition-all duration-300"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BlogPostCard({ post }: { post: any }) {
  const gradients = [
    'from-blue-500 to-purple-600',
    'from-purple-500 to-pink-600', 
    'from-pink-500 to-red-500',
    'from-green-500 to-blue-500',
    'from-yellow-500 to-orange-500',
    'from-indigo-500 to-purple-500'
  ];
  // Use deterministic gradient based on post id to avoid hydration mismatch
  const gradientIndex = post.id ? post.id % gradients.length : 0;
  const randomGradient = gradients[gradientIndex];
  
  return (
    <Link href={`/blog/${post.slug}`} className="group">
      <article className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100">
        {post.imageUrl ? (
          <div className="aspect-video overflow-hidden relative">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        ) : (
          <div className={`aspect-video bg-gradient-to-br ${randomGradient} flex items-center justify-center`}>
            <FileText className="w-16 h-16 text-white/80" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${randomGradient} text-white shadow-md`}>
              {post.category || 'Blog'}
            </span>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {Math.ceil((post.content?.length || 1000) / 200)} min read
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300 line-clamp-2">
            {post.title}
          </h3>
          <p className="text-gray-600 mb-6 line-clamp-3 leading-relaxed">
            {post.description}
          </p>
          <div className="flex items-center justify-between text-sm">
            <time className="text-gray-500 font-medium">
              {formatDate(post.createdAt)}
            </time>
            {post.views && (
              <span className="text-gray-600 font-medium">
                {post.views} views
              </span>
            )}
          </div>
        </div>
        <div className={`h-1 bg-gradient-to-r ${randomGradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
      </article>
    </Link>
  )
}