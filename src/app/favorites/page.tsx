'use client';

import { useState, useEffect, useMemo } from 'react';
import { Heart, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import FavoriteSearchBar from '@/components/FavoriteSearchBar';
import { addTestFavorites } from '@/utils/testFavorites';

interface FavoriteItem {
  id: string;
  title: string;
  content: string;
  url: string;
  category: string;
  subject?: string;
  timestamp: string;
}

interface SearchSuggestion {
  id: string;
  title: string;
  category: string;
  subject?: string;
  type: 'title' | 'category' | 'subject' | 'topic' | 'concept';
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const saved = localStorage.getItem('favoriteQuestions');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Fix URLs that don't have category prefix
        const fixedData = data.map((item: any) => {
          let fixedUrl = item.url;
          
          // If URL doesn't start with category, add it
          if (fixedUrl.startsWith('/') && !fixedUrl.startsWith(`/${item.category}/`)) {
            // Remove leading slash and add category prefix
            const slug = fixedUrl.replace(/^\//, '');
            fixedUrl = `/${item.category}/${slug}`;
          }
          
          return {
            ...item,
            url: fixedUrl
          };
        });
        setFavorites(fixedData);
        if (JSON.stringify(data) !== JSON.stringify(fixedData)) {
          localStorage.setItem('favoriteQuestions', JSON.stringify(fixedData));
        }
      } catch (error) {
        console.error('Error parsing favorites:', error);
        setFavorites([]);
      }
    }
  }, []);

  const filteredFavorites = useMemo(() => {
    let filtered = favorites;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.subject && item.subject.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'category':
          return a.category.localeCompare(b.category);
        default: // newest
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

    return filtered;
  }, [favorites, searchQuery, categoryFilter, sortBy]);

  const uniqueCategories = useMemo(() => {
    return [...new Set(favorites.map(item => item.category))].sort();
  }, [favorites]);

  const removeFavorite = (id: string) => {
    const updated = favorites.filter(item => item.id !== id);
    setFavorites(updated);
    localStorage.setItem('favoriteQuestions', JSON.stringify(updated));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    // Handle different suggestion types
    switch (suggestion.type) {
      case 'category':
        setCategoryFilter(suggestion.category);
        setSearchQuery('');
        break;
      case 'subject':
        setCategoryFilter('all');
        setSearchQuery(suggestion.subject || '');
        break;
      default:
        setSearchQuery(suggestion.title);
        setCategoryFilter('all');
        break;
    }
    
    // Refresh favorites list to show newly added items
    const saved = localStorage.getItem('favoriteQuestions');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setFavorites(data);
      } catch (error) {
        console.error('Error parsing favorites:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-pink-600 to-pink-800 text-white py-12 sm:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">💖 My Favorites</h1>
          <p className="text-lg sm:text-xl text-pink-100 mb-6 sm:mb-8">
            Your pinned questions and important content
          </p>
          <div className="text-2xl sm:text-3xl font-bold">{favorites.length}</div>
          <div className="text-pink-200 text-sm sm:text-base">Saved Items</div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="mb-4">
            <FavoriteSearchBar
              onSearch={handleSearch}
              onSelectSuggestion={handleSelectSuggestion}
              placeholder="Search favorites by title, category, or subject..."
            />
          </div>

          {/* Filters - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-gray-900 text-sm"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map(category => (
                  <option key={category} value={category}>
                    {category.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-gray-900 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title A-Z</option>
                <option value="category">Category</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredFavorites.length === favorites.length 
                ? `${favorites.length} favorites`
                : `${filteredFavorites.length} of ${favorites.length} favorites`
              }
              {searchQuery && (
                <span className="ml-2 text-pink-600 font-medium">
                  for "{searchQuery}"
                </span>
              )}
            </span>
            {(categoryFilter !== 'all' || sortBy !== 'newest') && (
              <button
                onClick={() => {
                  setCategoryFilter('all');
                  setSortBy('newest');
                  setSearchQuery('');
                }}
                className="text-pink-600 hover:text-pink-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {filteredFavorites.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-600 mb-2">
              {favorites.length === 0 ? 'No Favorites Yet' : 'No Results Found'}
            </h2>
            <p className="text-gray-500 text-sm sm:text-base px-4 mb-4">
              {favorites.length === 0 
                ? 'Start adding content to your favorites from other pages!' 
                : 'Try different search terms or clear your filters.'
              }
            </p>
            {favorites.length === 0 && (
              <button
                onClick={() => {
                  addTestFavorites();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                Add Test Favorites
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredFavorites.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="px-3 py-1 text-xs font-medium bg-pink-100 text-pink-700 rounded-full">
                        {item.category.split('-').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </span>
                      {item.subject && (
                        <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {item.subject}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                    <div className="text-gray-700 mb-3 text-sm sm:text-base line-clamp-3" dangerouslySetInnerHTML={{ __html: item.content }} />
                    <p className="text-xs sm:text-sm text-gray-500">
                      Saved on {new Date(item.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex sm:flex-col gap-2 sm:ml-4">
                    <Link 
                      href={item.url} 
                      className="flex-1 sm:flex-none p-2 sm:p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-center"
                      title="Open content"
                    >
                      <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 mx-auto" />
                    </Link>
                    <button
                      onClick={() => removeFavorite(item.id)}
                      className="flex-1 sm:flex-none p-2 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove from favorites"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}