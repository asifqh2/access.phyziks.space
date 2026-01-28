"use client";
// src/components/PostCard.tsx
import Link from 'next/link';
import { Post } from '@/types';
import { Calendar, Eye, Tag, Clock, BookOpen, Star, Bookmark, TrendingUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface PostCardProps {
  post: Post;
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'text-green-600 bg-green-100';
    case 'medium': return 'text-yellow-600 bg-yellow-100';
    case 'hard': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(' ').length;
  return Math.ceil(wordCount / wordsPerMinute);
}

export default function PostCard({ post }: PostCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const readingTime = getReadingTime(post.content || '');
  const isPopular = post.views > 100;
  const isRecent = new Date(post.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favoriteQuestions') || '[]');
    setIsBookmarked(favorites.some((item: any) => item.id === post.id));
  }, [post.id]);

  const toggleBookmark = () => {
    const favorites = JSON.parse(localStorage.getItem('favoriteQuestions') || '[]');
    
    if (isBookmarked) {
      const updated = favorites.filter((item: any) => item.id !== post.id);
      localStorage.setItem('favoriteQuestions', JSON.stringify(updated));
      setIsBookmarked(false);
    } else {
      const newFavorite = {
        id: post.id,
        title: post.title,
        content: post.description || post.content?.substring(0, 200) + '...',
        url: `/${post.category}/${post.slug}`,
        category: post.category,
        subject: post.subject,
        timestamp: new Date().toISOString()
      };
      favorites.push(newFavorite);
      localStorage.setItem('favoriteQuestions', JSON.stringify(favorites));
      setIsBookmarked(true);
    }
  };

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative group">
      {/* Status Badges */}
      <div className="absolute top-3 right-3 flex gap-1 z-10">
        {isPopular && (
          <div className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Popular
          </div>
        )}
        {isRecent && (
          <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
            New
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">
              {post.category.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </span>
            {post.difficulty && (
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getDifficultyColor(post.difficulty)}`}>
                {post.difficulty}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {post.year && (
              <span className="text-sm text-gray-500 font-medium">
                {post.year}
              </span>
            )}
            <button
              onClick={toggleBookmark}
              className={`p-1 rounded-full transition-colors ${
                isBookmarked ? 'text-pink-500 bg-pink-50' : 'text-gray-400 hover:text-pink-500'
              }`}
              title={isBookmarked ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-3 text-gray-900">
          <Link 
            href={`/${post.category}/${post.slug}`} 
            className="hover:text-blue-600 transition-colors"
          >
            {post.title && post.title.length > 200 
              ? post.title.substring(0, 200) + '...' 
              : post.title}
          </Link>
        </h3>

        <p className="text-gray-600 mb-4 line-clamp-2">
          {post.description && post.description.length > 30 
            ? post.description.substring(0, 30) + '...' 
            : post.description}
        </p>

        {/* Reading Time & Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {readingTime} min read
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {post.category.includes('paper') ? 'Practice' : 'Learn'}
          </span>
          {post.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              {post.rating}
            </span>
          )}
        </div>

        {post.tags.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Tag className="w-4 h-4 text-gray-400" />
            {post.tags.slice(0, 3).map((tag) => (
              <span 
                key={tag}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {post.views.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(post.createdAt)}
            </span>
          </div>
          <Link
            href={`/${post.category}/${post.slug}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium group-hover:bg-blue-700"
          >
            Start Learning
          </Link>
        </div>

        {/* Progress Bar (if applicable) */}
        {post.progress && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{post.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${post.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}