'use client';

import { useState } from 'react';
import EnhancedSearchBar from '@/components/EnhancedSearchBar';
import FavoriteSearchBar from '@/components/FavoriteSearchBar';
import { Heart, BookOpen } from 'lucide-react';

interface SearchSuggestion {
  id: string;
  title: string;
  category?: string;
  subject?: string;
  type: 'post' | 'category' | 'subject' | 'topic' | 'concept' | 'tag' | 'title';
  url?: string;
}

export default function SearchDemo() {
  const [searchResults, setSearchResults] = useState<string>('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<SearchSuggestion | null>(null);

  const handleSearch = (query: string) => {
    setSearchResults(query);
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setSelectedSuggestion(suggestion);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🔍 Smart Search Demo
          </h1>
          <p className="text-gray-600">
            Experience intelligent autocomplete search with suggestions from posts, subjects, topics, and more!
          </p>
        </div>

        {/* Enhanced Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">General Content Search</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Search through all posts, subjects, topics, concepts, and tags. 
            Click on suggestions to navigate directly to content.
          </p>
          <EnhancedSearchBar
            onSearch={handleSearch}
            onSelectSuggestion={handleSelectSuggestion}
            placeholder="Search posts, subjects, topics, concepts..."
          />
        </div>

        {/* Favorites Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="h-6 w-6 text-pink-600" />
            <h2 className="text-xl font-semibold text-gray-900">Favorites Search</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Search through your saved favorites. Add some favorites first to see suggestions!
          </p>
          <FavoriteSearchBar
            onSearch={handleSearch}
            onSelectSuggestion={handleSelectSuggestion}
            placeholder="Search your favorites..."
          />
        </div>

        {/* Search Results Display */}
        {searchResults && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Search Query:</h3>
            <div className="bg-gray-100 rounded-lg p-4">
              <code className="text-blue-600 font-mono">"{searchResults}"</code>
            </div>
          </div>
        )}

        {/* Selected Suggestion Display */}
        {selectedSuggestion && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Selected Suggestion:</h3>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-semibold text-gray-900">{selectedSuggestion.title}</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                  {selectedSuggestion.type}
                </span>
              </div>
              {selectedSuggestion.subject && (
                <div className="text-sm text-gray-600 mb-1">
                  <strong>Subject:</strong> {selectedSuggestion.subject}
                </div>
              )}
              {selectedSuggestion.category && (
                <div className="text-sm text-gray-600 mb-1">
                  <strong>Category:</strong> {selectedSuggestion.category}
                </div>
              )}
              {selectedSuggestion.url && (
                <div className="text-sm text-gray-600">
                  <strong>URL:</strong> 
                  <a href={selectedSuggestion.url} className="text-blue-600 hover:underline ml-1">
                    {selectedSuggestion.url}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Features List */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">✨ Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Smart Autocomplete</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Real-time suggestions as you type</li>
                <li>• Search across multiple content types</li>
                <li>• Keyboard navigation (↑↓ Enter Esc)</li>
                <li>• Click to select suggestions</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Content Types</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 📄 Posts and articles</li>
                <li>• 📚 Subjects and categories</li>
                <li>• 🏷️ Topics and concepts</li>
                <li>• 💖 Favorite items</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}