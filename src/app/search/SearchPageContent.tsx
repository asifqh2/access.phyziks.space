'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter, SortAsc, SortDesc, Search } from 'lucide-react';
import { Post } from '@/types';
import PostCard from '@/components/PostCard';
import EnhancedSearchBar from '@/components/EnhancedSearchBar';

export default function SearchPageContent() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    filterAndSortPosts();
  }, [posts, searchQuery, categoryFilter, subjectFilter, sortBy, sortOrder]);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPosts = () => {
    let filtered = posts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.description.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        (post.subject && post.subject.toLowerCase().includes(query)) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(post => post.category === categoryFilter);
    }

    if (subjectFilter !== 'all') {
      filtered = filtered.filter(post => post.subject === subjectFilter);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'views':
          comparison = (a.views || 0) - (b.views || 0);
          break;
        case 'relevance':
        default:
          const aScore = calculateRelevance(a, searchQuery);
          const bScore = calculateRelevance(b, searchQuery);
          comparison = aScore - bScore;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredPosts(filtered);
  };

  const calculateRelevance = (post: Post, query: string): number => {
    if (!query.trim()) return 0;
    
    const q = query.toLowerCase();
    let score = 0;
    
    if (post.title.toLowerCase().includes(q)) score += 10;
    if (post.description.toLowerCase().includes(q)) score += 5;
    if (post.subject && post.subject.toLowerCase().includes(q)) score += 3;
    if (post.tags) score += post.tags.filter(tag => tag.toLowerCase().includes(q)).length * 2;
    if (post.content.toLowerCase().includes(q)) score += 1;
    
    return score;
  };

  const handleSearchBarQuery = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectSuggestion = (suggestion: any) => {
    switch (suggestion.type) {
      case 'category':
        setCategoryFilter(suggestion.category);
        setSearchQuery('');
        break;
      case 'subject':
        setSubjectFilter(suggestion.title);
        setSearchQuery('');
        break;
      case 'post':
        break;
      default:
        setSearchQuery(suggestion.title);
        break;
    }
  };

  const getUniqueSubjects = () => {
    const subjects = posts
      .map(post => post.subject)
      .filter(subject => subject && subject.trim())
      .filter((subject, index, arr) => arr.indexOf(subject) === index);
    return subjects;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Results</h1>
          <p className="text-gray-600">
            {searchQuery ? `Searching for "${searchQuery}"` : 'Browse all educational content'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-6">
            <EnhancedSearchBar
              onSearch={handleSearchBarQuery}
              onSelectSuggestion={handleSelectSuggestion}
              placeholder="Search posts, subjects, topics, concepts..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Categories</option>
                <option value="syllabus">Syllabus</option>
                <option value="chapter">Chapter</option>
                <option value="topic">Topic</option>
                <option value="concept">Concept</option>
                <option value="last-year-paper">Last Year Paper</option>
                <option value="blog">Blog</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Subjects</option>
                {getUniqueSubjects().map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="title">Title</option>
                <option value="views">Views</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Found <span className="font-semibold text-blue-600">{filteredPosts.length}</span> results
              {searchQuery && ` for "${searchQuery}"`}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Filter className="w-4 h-4" />
              {categoryFilter !== 'all' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{categoryFilter}</span>}
              {subjectFilter !== 'all' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded">{subjectFilter}</span>}
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-4">Searching...</p>
          </div>
        )}

        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? `No posts found matching "${searchQuery}". Try different keywords or filters.`
                : 'No posts match your current filters.'
              }
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setSubjectFilter('all');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        )}

        {!loading && filteredPosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}