// src/app/page.tsx
import Link from 'next/link';
import { BookOpen, FileText, Brain, TrendingUp, Calendar, Layers } from 'lucide-react';
import { getPublicPosts } from '@/lib/data';
import { Metadata } from 'next';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import "katex/dist/katex.min.css";
import { Trophy } from 'lucide-react';
import TypingEffect from '@/components/TypingEffect';
import StudyTimer from '@/components/StudyTimer';
import QuickNotes from '@/components/QuickNotes';
import StudyGroup from '@/components/StudyGroup';
import MindMapCard from '@/components/MindMapCard';
import StudyGroupCard from '@/components/StudyGroupCard';
import FavoritesGuide from '@/components/FavoritesGuide';
import Animations from '@/components/Animations';
import EnhancedHero from '@/components/EnhancedHero';
import { EnhancedPostCard } from '@/components/EnhancedPostCard';
import MindMapDemo from '@/components/MindMapDemo';

import GitHubComments from '@/components/GitHubComments';

export const metadata: Metadata = {
  title: 'Class 11 & 12 Physics Solved Numericals & Papers – HSC & CBSE',
  description: 'Learn Class 11 & 12 Physics with solved numericals, derivations, diagrams, MCQs, and previous year papers for Maharashtra HSC & CBSE students.',
  keywords: 'Class 11 Physics,Class 12 Physics,HSC Physics,Maharashtra Board Physics,CBSE Physics,Physics numericals,Physics derivations,Physics MCQs,Ray optics numericals,Wave optics,Current electricity,Electrostatics,Magnetism and matter,AC circuits,Semiconductor physics,Previous year physics papers,Physics solved papers',
  openGraph: {
    title: 'Class 11 & 12 Physics Solved Numericals & Papers – HSC & CBSE',
    description: 'Solved numericals, derivations, diagrams, MCQs, and previous year Physics papers for Class 11 & 12 HSC and CBSE students.',
    type: 'website',
    url: 'https://phyziks.space',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Class 11 & 12 Physics Solved Numericals & Papers – HSC & CBSE',
    description: 'Step-by-step Physics numericals, derivations, MCQs, and solved HSC & CBSE board papers.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://phyziks.space',
  },
};

export default async function HomePage() {
  const posts = await getPublicPosts();
  const recentPosts = posts.slice(0, 6);

  const features = [
    {
      icon: Calendar,
      title: 'Last Year Papers',
      description: 'Access previous year question papers with solutions',
      href: '/last-year-papers',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: BookOpen,
      title: 'Chapter Wise',
      description: 'Organized study materials by chapters',
      href: '/chapter-wise',
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: Trophy,
      title: 'Quiz Competition',
      description: 'Test your knowledge and win amazing prizes!',
      href: '/quiz',
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      icon: Layers,
      title: 'Topic Wise',
      description: 'Learn through specific topic breakdowns',
      href: '/topic-wise',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: Brain,
      title: 'Concept Wise',
      description: 'Master fundamental concepts thoroughly',
      href: '/concept-wise',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      icon: FileText,
      title: 'Syllabus',
      description: 'Complete syllabus documentation',
      href: '/syllabus',
      color: 'bg-pink-100 text-pink-600'
    },
    {
      icon: TrendingUp,
      title: 'Analytics',
      description: 'Track your learning progress',
      href: '/analytics',
      color: 'bg-indigo-100 text-indigo-600'
    }
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Phyziks.space",
    "description": "Free study materials, last year papers, chapter-wise notes, and concept-wise learning for physics and other subjects",
    "url": "https://phyziks.space",
    "logo": "https://phyziks.space/logo.png",
    "sameAs": [
      "https://twitter.com/phyziks_space",
      "https://facebook.com/phyziks.space"
    ],
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free educational resources and study materials"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Study Materials",
      "itemListElement": [
        {
          "@type": "Course",
          "name": "Last Year Papers",
          "description": "Previous year question papers with solutions",
          "url": "https://phyziks.space/last-year-papers"
        },
        {
          "@type": "Course",
          "name": "Chapter Wise Study",
          "description": "Organized study materials by chapters",
          "url": "https://phyziks.space/chapter-wise"
        },
        {
          "@type": "Course",
          "name": "Topic Wise Learning",
          "description": "Learn through specific topic breakdowns",
          "url": "https://phyziks.space/topic-wise"
        },
        {
          "@type": "Course",
          "name": "Concept Wise Mastery",
          "description": "Master fundamental concepts thoroughly",
          "url": "https://phyziks.space/concept-wise"
        }
      ]
    }
  };

  return (
    <div>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Enhanced Hero Section */}
      <EnhancedHero />

      {/* Favorites Guide */}
      <section className="py-6 sm:py-8 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <FavoritesGuide />
        </div>
      </section>

      {/* animations */}
      <section className="py-6 sm:py-8 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Animations />
        </div>
      </section>

      {/* Mind Map Demo */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <MindMapDemo />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4 text-gray-900">
            Explore Our Educational Resources
          </h2>
          <p className="text-center text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Access comprehensive study materials organized by different learning approaches.
            Choose the method that works best for your learning style.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature) => (
              <Link
                key={feature.href}
                href={feature.href}
                className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow group touch-manipulation"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${feature.color} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>



      {/* Advertisement - Top */}
      <section className="py-6 sm:py-8 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-50 rounded-lg p-4 sm:p-8 text-center border-2 border-dashed border-gray-300 min-h-[100px] sm:min-h-[120px] flex items-center justify-center">
            <div className="text-gray-400">
              <p className="text-xs sm:text-sm font-medium mb-1">Advertisement</p>
              <p className="text-xs">Responsive Banner Ad Space</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-blue-900 to-blue-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4 text-white">
            Latest Study Materials & Updates
          </h2>
          <p className="text-center text-blue-200 mb-8  sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Stay updated with our newest study materials, solved papers, and educational content.
            Fresh content added regularly to help you excel in your studies.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {recentPosts.map((post) => (
              <EnhancedPostCard key={post.id} post={post} />
            ))}
          </div>

          <div className="text-center mt-8 sm:mt-12">
            <Link
              href="/blog"
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-white text-blue-900 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-sm sm:text-base touch-manipulation"
            >
              View All Articles
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Advertisement - Bottom */}
      <section className="py-6 sm:py-8 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-4 sm:p-8 text-center border-2 border-dashed border-gray-300 min-h-[100px] sm:min-h-[120px] flex items-center justify-center">
            <div className="text-gray-400">
              <p className="text-xs sm:text-sm font-medium mb-1">Advertisement</p>
              <p className="text-xs">Responsive Banner Ad Space</p>
            </div>
          </div>
        </div>
      </section>


      <section className="py-8 sm:py-12 bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8 text-gray-900">
            Interactive Study Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
            <StudyTimer />
            <QuickNotes />
            <MindMapCard />
            <StudyGroupCard />
          </div>
        </div>
      </section>

      {/* Quick Access Features */}
      <section className="py-8 sm:py-12 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8 text-gray-900">
            Quick Study Tools
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <Link href="/last-year-papers" className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 sm:p-6 rounded-xl text-center hover:shadow-lg transition-shadow group touch-manipulation">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">📚</div>
              <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">Previous Papers</h3>
              <p className="text-xs sm:text-sm text-purple-100 leading-tight">Solved question papers from past years</p>
            </Link>

            <Link href="/chapter-wise" className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 sm:p-6 rounded-xl text-center hover:shadow-lg transition-shadow group touch-manipulation">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">📖</div>
              <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">Chapter Notes</h3>
              <p className="text-xs sm:text-sm text-green-100 leading-tight">Organized study materials by chapters</p>
            </Link>

            <Link href="/topic-wise" className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 sm:p-6 rounded-xl text-center hover:shadow-lg transition-shadow group touch-manipulation">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">📝</div>
              <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">Topic Guides</h3>
              <p className="text-xs sm:text-sm text-blue-100 leading-tight">In-depth topic explanations</p>
            </Link>

            <Link href="/concept-wise" className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 sm:p-6 rounded-xl text-center hover:shadow-lg transition-shadow group touch-manipulation">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">💡</div>
              <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">Concepts</h3>
              <p className="text-xs sm:text-sm text-orange-100 leading-tight">Master fundamental concepts</p>
            </Link>
          </div>

          <div className="mt-8 sm:mt-12 text-center">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">More Resources</h3>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
              <Link href="/syllabus" className="px-3 sm:px-4 py-2 bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200 transition-colors text-sm touch-manipulation">
                Complete Syllabus
              </Link>
              <Link href="/blog" className="px-3 sm:px-4 py-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors text-sm touch-manipulation">
                Study Tips Blog
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comments Section */}
      <section className="py-8 sm:py-12 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <GitHubComments
            postId="homepage"
            postTitle="Phyziks.space - Educational Platform Discussion"
          />
        </div>
      </section>
      {/* Study Group Section */}
      <div id="study-group" className="mt-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Virtual Study Group</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Join a private, temporary room with up to 5 classmates. Chat, collaborate, and study together.
            Everything disappears when you leave.
          </p>
        </div>
        <StudyGroup />
      </div>
    </div>
  );
}