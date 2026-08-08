'use client';

// src/app/admin/page.tsx
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Filter, Save, X, FileText, LogOut } from 'lucide-react';
import { Post } from '@/types';
import AdminLogin from '@/components/AdminLogin';

export default function AdminDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts?includeHidden=true');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (credentials: { username: string; password: string }) => {
    if (credentials.username === 'Noorjahan' && credentials.password === 'Noorjahan@98330') {
      setIsAuthenticated(true);
      setAuthError('');
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminAuth', 'true');
      }
    } else {
      setAuthError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminAuth');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('adminAuth') === 'true';
      setIsAuthenticated(isAuth);
    }
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Post deleted successfully!');
        fetchPosts();
      } else {
        alert('❌ Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('❌ Error deleting post');
    }
  };

  const handleToggleVisibility = async (id: string, currentlyHidden?: boolean) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isHidden: !currentlyHidden,
          updatedAt: new Date().toISOString()
        }),
      });

      if (response.ok) {
        fetchPosts();
      } else {
        alert('❌ Failed to update post visibility');
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('❌ Error updating post visibility');
    }
  };

  const handleBulkVisibility = async (hide: boolean) => {
    if (selectedPosts.length === 0) return;
    
    try {
      await Promise.all(selectedPosts.map(id => 
        fetch(`/api/posts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isHidden: hide,
            updatedAt: new Date().toISOString()
          }),
        })
      ));
      
      setSelectedPosts([]);
      fetchPosts();
    } catch (error) {
      console.error('Error bulk updating visibility:', error);
      alert('❌ Error updating posts visibility');
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setIsModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;

    if (!editingPost.title || !editingPost.description || !editingPost.content) {
      alert('❌ Title, description, and content are required');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingPost,
          updatedAt: new Date().toISOString()
        }),
      });

      if (response.ok) {
        alert('✅ Post updated successfully!');
        setIsModalOpen(false);
        setEditingPost(null);
        fetchPosts();
      } else {
        const data = await response.json();
        alert('❌ Failed to update post: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating post:', error);
      alert('❌ Error updating post');
    }
  };

  const filteredPosts = Array.isArray(posts) ? posts.filter(post => {
    const matchesCategory = filterCategory === 'all' || post.category === filterCategory;
    const matchesVisibility = visibilityFilter === 'all' || 
      (visibilityFilter === 'visible' && !post.isHidden) ||
      (visibilityFilter === 'hidden' && post.isHidden);
    
    if (!searchQuery.trim()) {
      return matchesCategory && matchesVisibility;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      (post.title && post.title.toLowerCase().includes(query)) ||
      (post.description && post.description.toLowerCase().includes(query)) ||
      (post.subject && post.subject.toLowerCase().includes(query)) ||
      (post.tags && Array.isArray(post.tags) && post.tags.some(tag => tag.toLowerCase().includes(query))) ||
      (post.content && post.content.toLowerCase().includes(query));
    
    return matchesSearch && matchesCategory && matchesVisibility;
  }) : [];

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [iitQuestions, setIitQuestions] = useState<any[]>([]);

  useEffect(() => {
    fetchQuizzes();
    fetchIITQuestions();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes');
      if (response.ok) {
        const data = await response.json();
        setQuizzes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const fetchIITQuestions = async () => {
    try {
      const response = await fetch('/api/iit-questions');
      if (response.ok) {
        const data = await response.json();
        setIitQuestions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching IIT questions:', error);
    }
  };

  const deleteIITQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      const response = await fetch('/api/iit-questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (response.ok) fetchIITQuestions();
      else alert('❌ Failed to delete');
    } catch {
      alert('❌ Error deleting question');
    }
  };

  const deleteQuiz = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const response = await fetch(`/api/quizzes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Quiz deleted successfully!');
        fetchQuizzes();
      } else {
        alert('❌ Failed to delete quiz');
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('❌ Error deleting quiz');
    }
  };

  const toggleQuizStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/quizzes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !currentStatus,
          updatedAt: new Date().toISOString()
        }),
      });

      if (response.ok) {
        fetchQuizzes();
      } else {
        alert('❌ Failed to update quiz status');
      }
    } catch (error) {
      console.error('Error toggling quiz status:', error);
      alert('❌ Error updating quiz status');
    }
  };

  const stats = {
    total: Array.isArray(posts) ? posts.length : 0,
    syllabus: Array.isArray(posts) ? posts.filter(p => p.isSyllabus).length : 0,
    chapters: Array.isArray(posts) ? posts.filter(p => p.category === 'chapter').length : 0,
    topics: Array.isArray(posts) ? posts.filter(p => p.category === 'topic').length : 0,
    concepts: Array.isArray(posts) ? posts.filter(p => p.category === 'concept').length : 0,
    papers: Array.isArray(posts) ? posts.filter(p => p.category === 'last-year-paper').length : 0,
    totalViews: Array.isArray(posts) ? posts.reduce((acc, post) => acc + (post.views || 0), 0) : 0,
    quizzes: Array.isArray(quizzes) ? quizzes.length : 0,
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} error={authError} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white border-b shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">📊 Admin Dashboard</h1>
              <p className="text-indigo-100 mt-1">Manage all your educational content</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/create-post"
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-semibold shadow-md"
              >
                <Plus className="w-5 h-5" />
                Create New Post
              </Link>
              <Link
                href="/create-quiz"
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold shadow-md"
              >
                <Plus className="w-5 h-5" />
                Create Quiz
              </Link>
              <Link
                href="/create-iit-question"
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold shadow-md"
              >
                <Plus className="w-5 h-5" />
                Create IIT Question
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold shadow-md"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm opacity-90 mt-1">Total Posts</div>
          </div>
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-lg shadow-lg p-4">
            <div className="text-2xl font-bold">{stats.syllabus}</div>
            <div className="text-sm opacity-90 mt-1">Syllabus</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-4">
            <div className="text-2xl font-bold">{stats.chapters}</div>
            <div className="text-sm opacity-90 mt-1">Chapters</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-4">
            <div className="text-2xl font-bold">{stats.topics}</div>
            <div className="text-sm opacity-90 mt-1">Topics</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-lg p-4">
            <div className="text-2xl font-bold">{stats.concepts}</div>
            <div className="text-sm opacity-90 mt-1">Concepts</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-lg shadow-lg p-4">
            <div className="text-2xl font-bold">{stats.papers}</div>
            <div className="text-sm opacity-90 mt-1">Papers</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg shadow-lg p-4">
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <div className="text-sm opacity-90 mt-1">Total Views</div>
          </div>
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-lg shadow-lg p-4">
            <div className="text-2xl font-bold">{stats.quizzes}</div>
            <div className="text-sm opacity-90 mt-1">Quizzes</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
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
            <div className="w-full md:w-48">
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
              >
                <option value="all">All Posts</option>
                <option value="visible">Visible Only</option>
                <option value="hidden">Hidden Only</option>
              </select>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            Showing <span className="font-semibold text-indigo-600">{filteredPosts.length}</span> of <span className="font-semibold">{posts.length}</span> posts
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">🧠 IIT Questions</h2>
            <Link
              href="/create-iit-question"
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create IIT Question
            </Link>
          </div>
          {iitQuestions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🧠</div>
              <p className="text-gray-500 text-lg">No IIT questions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pattern</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chapter</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtopic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timer</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {iitQuestions.map((q, i) => (
                    <tr key={q.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                        <p className="line-clamp-2">{q.question || q.assertion || q.columnA?.[0] || '—'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          q.exam === 'jee-main' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {q.exam === 'jee-main' ? 'JEE Main' : 'JEE Advanced'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{q.patternId}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{q.subject}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{q.chapter || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{q.topic || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{q.subtopic || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{q.timer}s</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex justify-center gap-2">
                          <Link href={`/iitian-mentor`}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                          <Link href={`/edit-iit-question?id=${q.id}`}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </Link>
                          <button onClick={() => {
                            fetch('/api/iit-questions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: q.id, isHidden: !q.isHidden }) })
                              .then(() => fetchIITQuestions());
                          }}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              q.isHidden ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                            }`}>
                            {q.isHidden ? <><Eye className="w-3.5 h-3.5" /> Show</> : <><EyeOff className="w-3.5 h-3.5" /> Hide</>}
                          </button>
                          <button onClick={() => deleteIITQuestion(q.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Quiz Management</h2>
            <Link
              href="/create-quiz"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create New Quiz
            </Link>
          </div>
          {quizzes.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500 text-lg">No quizzes created yet.</p>
              <p className="text-gray-400 text-sm mt-2">Create your first quiz to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quiz Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Questions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Settings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizzes.map((quiz, index) => (
                    <tr key={quiz.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{quiz.title}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{quiz.description?.replace(/<[^>]*>/g, '')}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {quiz.subject || 'General'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {quiz.difficulty || 'Medium'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {quiz.questions?.length || 0} Questions
                        </div>
                        <div className="text-xs text-gray-500">
                          {quiz.timeLimit} minutes
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>Pass: {quiz.passingScore || 60}%</div>
                          <div>Attempts: {quiz.maxAttempts || 3}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          quiz.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {quiz.isActive ? '🟢 Active' : '⚫ Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/quiz/${quiz.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Quiz"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <Link
                            href={`/edit-quiz?id=${quiz.id}`}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit Quiz"
                          >
                            <Edit className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => toggleQuizStatus(quiz.id, quiz.isActive)}
                            className={`p-2 rounded-lg transition-colors ${
                              quiz.isActive 
                                ? 'text-orange-600 hover:bg-orange-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={quiz.isActive ? 'Stop Quiz' : 'Start Quiz'}
                          >
                            {quiz.isActive ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => deleteQuiz(quiz.id, quiz.title)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Quiz"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="text-gray-500 mt-4">Loading posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No posts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b-2 border-indigo-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Title & Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPosts.map((post, index) => (
                    <tr key={post.id} className={`hover:bg-indigo-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${post.isHidden ? 'opacity-60 bg-red-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-gray-900">{post.title}</div>
                          {post.isHidden && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full font-medium">
                              Hidden
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-2 max-w-md mt-1">
                          {post.description}
                        </div>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {post.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          post.category === 'syllabus' ? 'bg-pink-100 text-pink-800' :
                          post.category === 'chapter' ? 'bg-green-100 text-green-800' :
                          post.category === 'topic' ? 'bg-purple-100 text-purple-800' :
                          post.category === 'concept' ? 'bg-orange-100 text-orange-800' :
                          post.category === 'last-year-paper' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {post.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {post.subject || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                          <Eye className="w-4 h-4 text-indigo-500" />
                          {post.views || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/${post.category}/${post.slug}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Post"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => handleEdit(post)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit Post"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleToggleVisibility(post.id, post.isHidden)}
                            className={`p-2 rounded-lg transition-colors ${
                              post.isHidden 
                                ? 'text-green-600 hover:bg-green-50' 
                                : 'text-orange-600 hover:bg-orange-50'
                            }`}
                            title={post.isHidden ? 'Show Post' : 'Hide Post'}
                          >
                            {post.isHidden ? (
                              <Eye className="w-5 h-5" />
                            ) : (
                              <EyeOff className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(post.id, post.title)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Post"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && editingPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Edit Post</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingPost(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({...editingPost, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={editingPost.description}
                  onChange={(e) => setEditingPost({...editingPost, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={editingPost.category}
                    onChange={(e) => setEditingPost({...editingPost, category: e.target.value as any})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  >
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
                  <input
                    type="text"
                    value={editingPost.subject || ''}
                    onChange={(e) => setEditingPost({...editingPost, subject: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={editingPost.year || ''}
                    onChange={(e) => setEditingPost({...editingPost, year: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    min="2000"
                    max="2099"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URL</label>
                  <input
                    type="url"
                    value={editingPost.youtubeUrl || ''}
                    onChange={(e) => setEditingPost({...editingPost, youtubeUrl: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PDF URL</label>
                  <input
                    type="url"
                    value={editingPost.pdfUrl || ''}
                    onChange={(e) => setEditingPost({...editingPost, pdfUrl: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Word URL</label>
                  <input
                    type="url"
                    value={editingPost.wordUrl || ''}
                    onChange={(e) => setEditingPost({...editingPost, wordUrl: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                <textarea
                  value={editingPost.content}
                  onChange={(e) => setEditingPost({...editingPost, content: e.target.value})}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-gray-900"
                  placeholder="Write your content here using HTML tags..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Blogger Image URLs</label>
                <textarea
                  placeholder="Paste Blogger image URLs (one per line)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
                  rows={4}
                  onChange={(e) => {
                    const urls = e.target.value.split('\n').filter(url => url.trim());
                    const imageHtml = urls.map(url => 
                      `<img src="${url.trim()}" alt="Educational content" loading="lazy" class="w-full max-w-2xl mx-auto rounded-lg shadow-md my-4" />`
                    ).join('\n\n');
                    
                    if (imageHtml) {
                      const currentContent = editingPost.content;
                      const newContent = currentContent + '\n\n' + imageHtml;
                      setEditingPost({...editingPost, content: newContent});
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Categorization</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <input
                      type="text"
                      placeholder="Enter tags separated by commas"
                      defaultValue={editingPost.tags?.join(', ') || ''}
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                        setEditingPost({...editingPost, tags});
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chapters</label>
                    <input
                      type="text"
                      placeholder="Enter chapters separated by commas"
                      defaultValue={editingPost.chapters?.join(', ') || ''}
                      onChange={(e) => {
                        const chapters = e.target.value.split(',').map(ch => ch.trim()).filter(Boolean);
                        setEditingPost({...editingPost, chapters});
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Topics</label>
                    <input
                      type="text"
                      placeholder="Enter topics separated by commas"
                      defaultValue={editingPost.topics?.join(', ') || ''}
                      onChange={(e) => {
                        const topics = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                        setEditingPost({...editingPost, topics});
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Concepts</label>
                    <input
                      type="text"
                      placeholder="Enter concepts separated by commas"
                      defaultValue={editingPost.concepts?.join(', ') || ''}
                      onChange={(e) => {
                        const concepts = e.target.value.split(',').map(c => c.trim()).filter(Boolean);
                        setEditingPost({...editingPost, concepts});
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Auto-Categorization</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingPost.isSyllabus || false}
                      onChange={(e) => setEditingPost({...editingPost, isSyllabus: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Show in Syllabus</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingPost.autoCategorize?.isChapter || false}
                      onChange={(e) => setEditingPost({...editingPost, autoCategorize: {
                        isLastYearPaper: editingPost.autoCategorize?.isLastYearPaper || false,
                        isChapter: e.target.checked,
                        isTopic: editingPost.autoCategorize?.isTopic || false,
                        isConcept: editingPost.autoCategorize?.isConcept || false
                      }})}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Show in Chapter Wise</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingPost.autoCategorize?.isTopic || false}
                      onChange={(e) => setEditingPost({...editingPost, autoCategorize: {
                        isLastYearPaper: editingPost.autoCategorize?.isLastYearPaper || false,
                        isChapter: editingPost.autoCategorize?.isChapter || false,
                        isTopic: e.target.checked,
                        isConcept: editingPost.autoCategorize?.isConcept || false
                      }})}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Show in Topic Wise</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingPost.autoCategorize?.isConcept || false}
                      onChange={(e) => setEditingPost({...editingPost, autoCategorize: {
                        isLastYearPaper: editingPost.autoCategorize?.isLastYearPaper || false,
                        isChapter: editingPost.autoCategorize?.isChapter || false,
                        isTopic: editingPost.autoCategorize?.isTopic || false,
                        isConcept: e.target.checked
                      }})}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Show in Concept Wise</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingPost.autoCategorize?.isLastYearPaper || false}
                      onChange={(e) => setEditingPost({...editingPost, autoCategorize: {
                        isLastYearPaper: e.target.checked,
                        isChapter: editingPost.autoCategorize?.isChapter || false,
                        isTopic: editingPost.autoCategorize?.isTopic || false,
                        isConcept: editingPost.autoCategorize?.isConcept || false
                      }})}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Show in Last Year Papers</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPost(null);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}