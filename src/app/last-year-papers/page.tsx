// src/app/last-year-papers/page.tsx
import { Metadata } from 'next';
import { getPublicPosts } from '@/lib/data';
import PostCard from '@/components/PostCard';
import { getCategoryPosts } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Last Year Papers with Solutions | Phyziks.space - Previous Year Question Papers',
  description: 'Access previous year question papers with detailed solutions for physics and other subjects. Download solved papers from 2020-2024 for better exam preparation and practice.',
  keywords: 'last year papers, previous year question papers, solved papers, physics papers, exam papers, question bank, practice papers, board exam papers, competitive exam papers',
  openGraph: {
    title: 'Last Year Papers with Solutions | Phyziks.space',
    description: 'Access previous year question papers with detailed solutions for better exam preparation',
    type: 'website',
    url: 'https://phyziks.space/last-year-papers',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Last Year Papers with Solutions | Phyziks.space',
    description: 'Access previous year question papers with detailed solutions for better exam preparation',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://phyziks.space/last-year-papers',
  },
};

export default async function LastYearPapersPage() {
  const allPosts = await getPublicPosts();
  const papers = getCategoryPosts(allPosts, 'last-year-paper');

  // Group by year
  const groupedByYear = papers.reduce((acc, post) => {
    const year = post.year || new Date(post.createdAt).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(post);
    return acc;
  }, {} as Record<number, typeof papers>);

  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Last Year Papers' }]} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-green-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Last Year Papers</h1>
          </div>
          <p className="text-xl text-blue-100">
            Access previous year question papers with detailed solutions
          </p>
        </div>
      </section>

      {/* Papers List */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {papers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No papers available yet.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {years.map((year) => (
                <div key={year}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-lg">
                      {year}
                    </span>
                    <span className="text-gray-400 text-lg">
                      ({groupedByYear[Number(year)].length} papers)
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedByYear[Number(year)].map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}