import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Thread {
  id: string;
  category_id: number;
  category_name: string;
  author_id: string;
  author_name: string;
  author_rank: string;
  title: string;
  content: string;
  tags: string[];
  view_count: number;
  reply_count: number;
  upvote_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_solved: boolean;
  accepted_reply_id: string | null;
  created_at: string;
  last_activity_at: string;
}

interface Reply {
  id: string;
  thread_id: string;
  author_id: string;
  author_name: string;
  author_rank: string;
  content: string;
  parent_reply_id: string | null;
  upvote_count: number;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
}

const ForumThreadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [userVote, setUserVote] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    fetchThread();
    fetchReplies();
    if (token) {
      fetchUserVote();
      checkBookmark();
    }
  }, [id, token]);

  const fetchThread = async () => {
    try {
      const response = await fetch(`https://documentiulia.ro/api/v1/forum/thread.php?id=${id}`);
      const data = await response.json();

      if (data.success) {
        setThread(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load thread');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    try {
      const response = await fetch(
        `https://documentiulia.ro/api/v1/forum/replies.php?thread_id=${id}&sort=oldest&limit=100`
      );
      const data = await response.json();

      if (data.success) {
        setReplies(data.data);
      }
    } catch (err) {
      console.error('Failed to load replies:', err);
    }
  };

  const fetchUserVote = async () => {
    try {
      const response = await fetch(
        `https://documentiulia.ro/api/v1/forum/vote.php?voteable_type=thread&voteable_id=${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();

      if (data.success && data.data) {
        setUserVote(data.data.vote_type);
      }
    } catch (err) {
      console.error('Failed to load user vote:', err);
    }
  };

  const checkBookmark = async () => {
    try {
      const response = await fetch('https://documentiulia.ro/api/v1/forum/bookmarks.php', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        const isBookmarked = data.data.some((b: any) => b.thread_id === id);
        setBookmarked(isBookmarked);
      }
    } catch (err) {
      console.error('Failed to check bookmark:', err);
    }
  };

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('https://documentiulia.ro/api/v1/forum/vote.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          voteable_type: 'thread',
          voteable_id: parseInt(id!),
          vote_type: voteType
        })
      });

      const data = await response.json();
      if (data.success) {
        setUserVote(data.data.vote_type || null);
        fetchThread(); // Refresh to get updated vote count
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleBookmark = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('https://documentiulia.ro/api/v1/forum/bookmarks.php', {
        method: bookmarked ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          thread_id: id
        })
      });

      const data = await response.json();
      if (data.success) {
        setBookmarked(!bookmarked);
      }
    } catch (err) {
      console.error('Failed to bookmark:', err);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }

    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('https://documentiulia.ro/api/v1/forum/replies.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          thread_id: id,
          content: replyContent,
          parent_reply_id: replyingTo
        })
      });

      const data = await response.json();
      if (data.success) {
        setReplyContent('');
        setReplyingTo(null);
        fetchReplies();
        fetchThread(); // Refresh to update reply count
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkSolved = async (replyId?: string) => {
    if (!token) return;

    try {
      const response = await fetch('https://documentiulia.ro/api/v1/forum/thread.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          thread_id: id,
          action: 'solve',
          is_solved: true,
          accepted_reply_id: replyId
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchThread();
        fetchReplies();
      }
    } catch (err) {
      console.error('Failed to mark as solved:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRankColor = (rank: string) => {
    const colors: Record<string, string> = {
      'newbie': 'text-gray-600',
      'contributor': 'text-green-600',
      'trusted': 'text-blue-600',
      'expert': 'text-purple-600',
      'master': 'text-yellow-600'
    };
    return colors[rank] || 'text-gray-600';
  };

  const getRankIcon = (rank: string) => {
    const icons: Record<string, string> = {
      'newbie': '🌱',
      'contributor': '⭐',
      'trusted': '💎',
      'expert': '🏆',
      'master': '👑'
    };
    return icons[rank] || '👤';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Thread not found</h2>
          <p className="text-gray-600 text-center mb-6">{error || 'The thread you are looking for does not exist.'}</p>
          <Link
            to="/forum"
            className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Forum
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-500">
            <Link to="/forum" className="hover:text-gray-700">Forum</Link>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <Link to={`/forum/category/${thread.category_name}`} className="hover:text-gray-700">
              {thread.category_name}
            </Link>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-900 truncate max-w-md">{thread.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Thread Main Post */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          {/* Thread Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Status Badges */}
                <div className="flex items-center space-x-2 mb-2">
                  {thread.is_pinned && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      📌 Pinned
                    </span>
                  )}
                  {thread.is_solved && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      ✓ Solved
                    </span>
                  )}
                  {thread.is_locked && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      🔒 Locked
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">{thread.title}</h1>

                {/* Tags */}
                {thread.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {thread.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="ml-4 flex items-center space-x-2">
                {token && (
                  <button
                    onClick={handleBookmark}
                    className={`p-2 rounded-md ${
                      bookmarked
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={bookmarked ? 'Remove bookmark' : 'Bookmark thread'}
                  >
                    <svg className="h-5 w-5" fill={bookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Thread Content */}
          <div className="px-6 py-6">
            <div className="flex">
              {/* Voting */}
              <div className="flex-shrink-0 mr-6">
                <div className="flex flex-col items-center space-y-2">
                  <button
                    onClick={() => handleVote('upvote')}
                    className={`p-2 rounded-md transition-colors ${
                      userVote === 'upvote'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    disabled={!token}
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <span className="text-xl font-bold text-gray-900">{thread.upvote_count}</span>
                  <button
                    onClick={() => handleVote('downvote')}
                    className={`p-2 rounded-md transition-colors ${
                      userVote === 'downvote'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    disabled={!token}
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="prose max-w-none mb-6">
                  <p className="text-gray-700 whitespace-pre-wrap">{thread.content}</p>
                </div>

                {/* Author Info */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-lg">{getRankIcon(thread.author_rank)}</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{thread.author_name}</span>
                        <span className={`text-xs ${getRankColor(thread.author_rank)} capitalize`}>
                          {thread.author_rank}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Posted {formatDate(thread.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Thread Stats */}
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>{thread.view_count} views</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{thread.reply_count} replies</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Replies Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
            </h2>
          </div>

          {replies.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No replies yet</h3>
              <p className="mt-1 text-sm text-gray-500">Be the first to reply to this thread!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`px-6 py-6 ${reply.is_accepted ? 'bg-green-50 border-l-4 border-green-500' : ''}`}
                >
                  <div className="flex">
                    {/* Reply Content */}
                    <div className="flex-1">
                      {reply.is_accepted && (
                        <div className="mb-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            ✓ Accepted Answer
                          </span>
                        </div>
                      )}

                      <div className="prose max-w-none mb-4">
                        <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                      </div>

                      {/* Reply Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-sm">{getRankIcon(reply.author_rank)}</span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">{reply.author_name}</span>
                              <span className={`text-xs ${getRankColor(reply.author_rank)} capitalize`}>
                                {reply.author_rank}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(reply.created_at)}
                            </div>
                          </div>
                        </div>

                        {/* Reply Actions */}
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            <span>{reply.upvote_count}</span>
                          </div>

                          {token && user && String(thread.author_id) === String(user.id) && !thread.is_solved && !reply.is_accepted && (
                            <button
                              onClick={() => handleMarkSolved(reply.id.toString())}
                              className="text-sm text-green-600 hover:text-green-700 font-medium"
                            >
                              ✓ Accept Answer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Form */}
        {!thread.is_locked && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Your Reply</h3>
            </div>
            <div className="px-6 py-6">
              {token ? (
                <form onSubmit={handleSubmitReply}>
                  <div className="mb-4">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Write your reply..."
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Please be respectful and constructive in your replies.
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || !replyContent.trim()}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Posting...' : 'Post Reply'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">You must be logged in to reply</p>
                  <Link
                    to="/login"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Login to Reply
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {thread.is_locked && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <svg className="mx-auto h-8 w-8 text-yellow-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-yellow-800 font-medium">This thread is locked</p>
            <p className="text-yellow-700 text-sm mt-1">No new replies can be posted</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumThreadPage;
