"use client";

import Link from "next/link";

interface EnhancedPostCardProps {
  post: {
    id: string;
    title: string;
    description: string;
    category: string;
    slug: string;
    views: number;
  };
  priority?: boolean;
}

export function EnhancedPostCard({ post, priority = false }: EnhancedPostCardProps) {
  return (
    <article className="group cursor-pointer bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
      <div className="p-6">
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Link
              href={`/${post.category}`}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 hover:bg-blue-200 transition-colors text-blue-700 hover:text-blue-800"
            >
              {post.category
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-sm text-gray-500 font-mono">
            <span>{post.views} views</span>
          </div>
        </div>

        {/* Title */}
        <Link href={`/${post.category}/${post.slug}`}>
          <h3 className="text-xl font-bold tracking-tight mb-3 leading-tight group-hover:text-blue-600 transition-colors text-balance">
            {post.title && post.title.length > 200 
              ? post.title.substring(0, 200) + '...' 
              : post.title}
          </h3>
        </Link>

        {/* Description */}
        <Link href={`/${post.category}/${post.slug}`}>
          <p className="text-base text-gray-600 leading-relaxed text-pretty line-clamp-2 mb-4">
            {post.description && post.description.length > 30 
              ? post.description.substring(0, 30) + '...' 
              : post.description}
          </p>
        </Link>

        {/* Read more */}
        <Link 
          href={`/${post.category}/${post.slug}`} 
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 group-hover:gap-3 transition-all"
        >
          <span>Read more</span>
          <span className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}