'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, FileText, Tag, Lightbulb } from 'lucide-react';

interface SearchSuggestion {
  id: string;
  title: string;
  category?: string;
  subject?: string;
  type: 'post' | 'category' | 'subject' | 'topic' | 'concept' | 'tag';
  url?: string;
}

interface EnhancedSearchBarProps {
  onSearch: (query: string) => void;
  onSelectSuggestion?: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  showSuggestions?: boolean;
  maxSuggestions?: number;
}

export default function EnhancedSearchBar({ 
  onSearch, 
  onSelectSuggestion,
  placeholder = "Search posts, subjects, topics...", 
  showSuggestions = true,
  maxSuggestions = 8
}: EnhancedSearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [posts, setPosts] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch posts data
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts');
        const data = await response.json();
        setPosts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setPosts([]);
      }
    };

    fetchPosts();
  }, []);

  // Generate suggestions
  useEffect(() => {
    if (!showSuggestions || query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const searchTerm = query.toLowerCase();
    const allSuggestions: SearchSuggestion[] = [];
    const seen = new Set<string>();

    posts.forEach((post) => {
      // Post title suggestions
      if (post.title.toLowerCase().includes(searchTerm)) {
        const key = `post-${post.id}`;
        if (!seen.has(key)) {
          allSuggestions.push({
            id: post.id,
            title: post.title,
            category: post.category,
            subject: post.subject,
            type: 'post',
            url: `/${post.slug}`
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
            type: 'category'
          });
          seen.add(key);
        }
      }

      // Topic suggestions
      if (post.topics && Array.isArray(post.topics)) {
        post.topics.forEach((topic: string) => {
          if (topic.toLowerCase().includes(searchTerm)) {
            const key = `topic-${topic}`;
            if (!seen.has(key)) {
              allSuggestions.push({
                id: `topic-${topic}`,
                title: topic,
                subject: post.subject,
                type: 'topic'
              });
              seen.add(key);
            }
          }
        });
      }

      // Concept suggestions
      if (post.concepts && Array.isArray(post.concepts)) {
        post.concepts.forEach((concept: string) => {
          if (concept.toLowerCase().includes(searchTerm)) {
            const key = `concept-${concept}`;
            if (!seen.has(key)) {
              allSuggestions.push({
                id: `concept-${concept}`,
                title: concept,
                subject: post.subject,
                type: 'concept'
              });
              seen.add(key);
            }
          }
        });
      }

      // Tag suggestions
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach((tag: string) => {
          if (tag.toLowerCase().includes(searchTerm)) {
            const key = `tag-${tag}`;
            if (!seen.has(key)) {
              allSuggestions.push({
                id: `tag-${tag}`,
                title: tag,
                type: 'tag'
              });
              seen.add(key);
            }
          }
        });
      }
    });

    // Sort suggestions by relevance (exact matches first, then partial matches)
    allSuggestions.sort((a, b) => {
      const aExact = a.title.toLowerCase() === searchTerm;
      const bExact = b.title.toLowerCase() === searchTerm;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.title.localeCompare(b.title);
    });

    setSuggestions(allSuggestions.slice(0, maxSuggestions));
    setShowDropdown(allSuggestions.length > 0);
    setSelectedIndex(-1);
  }, [query, posts, showSuggestions, maxSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    setShowDropdown(false);
    
    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion);
    }
    
    onSearch(suggestion.title);
    
    // Navigate to post if it's a post suggestion
    if (suggestion.type === 'post' && suggestion.url) {
      window.location.href = suggestion.url;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setShowDropdown(false);
    onSearch('');
    inputRef.current?.focus();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return <FileText className="h-4 w-4" />;
      case 'subject': return <BookOpen className="h-4 w-4" />;
      case 'category': return <Tag className="h-4 w-4" />;
      case 'topic': return <Tag className="h-4 w-4" />;
      case 'concept': return <Lightbulb className="h-4 w-4" />;
      case 'tag': return <Tag className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'post': return 'Post';
      case 'subject': return 'Subject';
      case 'category': return 'Category';
      case 'topic': return 'Topic';
      case 'concept': return 'Concept';
      case 'tag': return 'Tag';
      default: return 'Search';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'post': return 'bg-blue-100 text-blue-700';
      case 'subject': return 'bg-green-100 text-green-700';
      case 'category': return 'bg-purple-100 text-purple-700';
      case 'topic': return 'bg-orange-100 text-orange-700';
      case 'concept': return 'bg-yellow-100 text-yellow-700';
      case 'tag': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowDropdown(suggestions.length > 0)}
          className="w-full px-4 py-3 pl-12 pr-12 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
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

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.id}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-gray-500">
                  {getTypeIcon(suggestion.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 truncate">
                      {suggestion.title}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(suggestion.type)}`}>
                      {getTypeLabel(suggestion.type)}
                    </span>
                  </div>
                  {(suggestion.subject || suggestion.category) && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {suggestion.subject && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          {suggestion.subject}
                        </span>
                      )}
                      {suggestion.category && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                          {suggestion.category.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No suggestions message */}
      {showDropdown && suggestions.length === 0 && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 text-center text-gray-500">
          <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>No matching content found</p>
          <p className="text-sm">Try different keywords</p>
        </div>
      )}
    </div>
  );
}