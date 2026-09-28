'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Github, ExternalLink, Send } from 'lucide-react';

interface GitHubComment {
  id: number;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  body: string;
  created_at: string;
  html_url: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

interface GitHubCommentsProps {
  postId: string;
  postTitle: string;
  repo?: string;
}

export default function GitHubComments({ postId, postTitle, repo }: GitHubCommentsProps) {
  const [comments, setComments] = useState<GitHubComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueNumber, setIssueNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  
  const repository = repo || 'phyziks/comments';

  useEffect(() => {
    loadComments();
    checkAuth();
  }, [postId, repository]);

  const checkAuth = () => {
    const userCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('github_user='));
    
    if (userCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
        setUser(userData);
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);

      const issueResponse = await fetch(`/api/github-comments/issue?postId=${postId}&repo=${repository}`);
      
      if (issueResponse.ok) {
        const issueData = await issueResponse.json();
        setIssueNumber(issueData.number);
        
        const commentsResponse = await fetch(`/api/github-comments/comments?repo=${repository}&issueNumber=${issueData.number}`);
        
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData);
        }
      } else if (issueResponse.status === 404) {
        setComments([]);
      } else {
        throw new Error('Failed to load comments');
      }
    } catch (err) {
      setError('Failed to load comments');
      console.error('Error loading GitHub comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/auth/github';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.reload();
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || posting) return;

    setPosting(true);
    try {
      const response = await fetch('/api/github-comments/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          comment: newComment,
          repo: repository
        })
      });

      if (response.ok) {
        setNewComment('');
        await loadComments();
      } else {
        throw new Error('Failed to post comment');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Failed to post comment. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="mt-12 bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
          <MessageSquare className="w-6 h-6" />
          Comments ({comments.length})
        </h2>
        {user ? (
          <div className="flex items-center gap-3">
            <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full" />
            <span className="text-sm text-gray-600">{user.login}</span>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800">
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Github className="w-4 h-4" />
            Login with GitHub
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {user && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex gap-3">
            <img src={user.avatar_url} alt={user.login} className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!newComment.trim() || posting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {posting ? 'Posting...' : 'Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {!user && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Github className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">GitHub Integration</h3>
              <p className="text-blue-700 text-sm">
                Sign in with your GitHub account to comment directly here.
              </p>
            </div>
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={comment.user.avatar_url}
                    alt={comment.user.login}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <a
                      href={comment.user.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {comment.user.login}
                    </a>
                    <p className="text-sm text-gray-500">{formatDate(comment.created_at)}</p>
                  </div>
                </div>
                <a
                  href={comment.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="View on GitHub"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div 
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ 
                  __html: comment.body.replace(/\n/g, '<br>') 
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}