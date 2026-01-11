'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Heart } from 'lucide-react';

interface SearchSuggestion {
  id: string;
  title: string;
  category: string;
  subject?: string;
  type: 'title' | 'category' | 'subject';
}

interface FavoriteSearchBarProps {
  onSearch: (query: string) => void;
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
}

export default function FavoriteSearchBar({ 
  onSearch, 
  onSelectSuggestion, 
  placeholder = "Search favorites..." 
}: FavoriteSearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch posts data
  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]));
  }, []);

  // Generate suggestions
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchTerm = query.toLowerCase();
    const allSuggestions: SearchSuggestion[] = [];
    const seen = new Set<string>();

    posts.forEach((post) => {
      // Title suggestions
      if (post.title && post.title.toLowerCase().includes(searchTerm)) {
        const key = `title-${post.title}`;
        if (!seen.has(key)) {
          allSuggestions.push({
            id: post.id,
            title: post.title,
            category: post.category || 'uncategorized',
            subject: post.subject,
            type: 'title'
          });
          seen.add(key);
        }
      }

      // Subject suggestions
      if (post.subject && post.subject.toLowerCase().includes(searchTerm)) {
        const key = `subject-${post.subject}`;
        if (!seen.has(key)) {
          allSuggestions.push({
            id: `subj-${post.subject}`,
            title: post.subject,
            category: post.category || 'uncategorized',
            subject: post.subject,
            type: 'subject'
          });
          seen.add(key);
        }
      }

      // Category suggestions
      if (post.category && post.category.toLowerCase().includes(searchTerm)) {
        const key = `category-${post.category}`;
        if (!seen.has(key)) {
          allSuggestions.push({
            id: `cat-${post.category}`,
            title: post.category.split('-').map((word: string) => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            category: post.category,
            subject: post.subject,
            type: 'category'
          });
          seen.add(key);
        }
      }
    });

    setSuggestions(allSuggestions.slice(0, 8));
    setShowSuggestions(allSuggestions.length > 0);
  }, [query, posts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    setShowSuggestions(false);
    
    // Add to favorites if it's a title suggestion
    if (suggestion.type === 'title') {
      const post = posts.find(p => p.id === suggestion.id);
      if (post) {
        const favoriteItem = {
          id: post.id,
          title: post.title,
          content: post.description || post.content?.substring(0, 200) || '',
          url: `/${post.category}/${post.slug}`,
          category: post.category,
          subject: post.subject,
          timestamp: new Date().toISOString()
        };
        
        const existing = JSON.parse(localStorage.getItem('favoriteQuestions') || '[]');
        const isAlreadyFavorite = existing.some((item: any) => item.id === post.id);
        
        if (!isAlreadyFavorite) {
          existing.push(favoriteItem);
          localStorage.setItem('favoriteQuestions', JSON.stringify(existing));
        }
      }
    }
    
    onSelectSuggestion(suggestion);
    onSearch(suggestion.title);
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setShowSuggestions(suggestions.length > 0)}
          className="w-full px-4 py-3 pl-12 pr-12 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 text-gray-900"
        />
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-3.5 h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.id}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {suggestion.type === 'title' ? '📄' : suggestion.type === 'subject' ? '📚' : '📁'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 truncate">
                      {suggestion.title}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {suggestion.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {suggestion.subject && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {suggestion.subject}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs">
                      {suggestion.category.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </span>
                  </div>
                </div>
                <Heart className="h-4 w-4 text-pink-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}