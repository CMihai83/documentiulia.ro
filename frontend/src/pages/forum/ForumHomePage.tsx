import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  thread_count: number;
  post_count: number;
  last_activity_at: string;
  last_thread_title?: string;
  last_thread_author?: string;
}

interface UserReputation {
  total_points: number;
  rank: string;
  badge_count: number;
}

const ForumHomePage: React.FC = () => {
  const { token, user } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    if (token && user) {
      fetchUserReputation();
    }
  }, [token, user]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('https://documentiulia.ro/api/v1/forum/categories.php');
      const data = await response.json();

      if (data.success) {
        setCategories(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load forum categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReputation = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `https://documentiulia.ro/api/v1/forum/reputation.php?endpoint=user&user_id=${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();

      if (data.success) {
        setReputation(data.data);
      }
    } catch (err) {
      console.error('Failed to load reputation:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Community Forum</h1>
              <p className="mt-1 text-sm text-gray-600">
                Ask questions, share knowledge, and connect with the community
              </p>
            </div>
            {token && (
              <Link
                to="/forum/new-thread"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Thread
              </Link>
            )}
            {!token && (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Login to Post
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Categories */}
          <div className="lg:col-span-2">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Forum Categories</h2>
              </div>

              <div className="divide-y divide-gray-200">
                {categories.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No categories yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating the first category.</p>
                  </div>
                ) : (
                  categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/forum/category/${category.slug}`}
                      className="block hover:bg-gray-50 transition-colors duration-150"
                    >
                      <div className="px-6 py-5">
                        <div className="flex items-start">
                          {/* Category Icon */}
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <span className="text-2xl">{category.icon}</span>
                            </div>
                          </div>

                          {/* Category Info */}
                          <div className="ml-4 flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600">
                                  {category.name}
                                </h3>
                                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                  {category.description}
                                </p>
                              </div>

                              {/* Stats */}
                              <div className="ml-4 flex-shrink-0 text-right">
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <div className="flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    <span className="font-medium text-gray-900">{category.thread_count}</span>
                                    <span className="ml-1 hidden sm:inline">threads</span>
                                  </div>
                                  <div className="flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                    </svg>
                                    <span className="font-medium text-gray-900">{category.post_count}</span>
                                    <span className="ml-1 hidden sm:inline">posts</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Last Activity */}
                            {category.last_activity_at && (
                              <div className="mt-3 flex items-center text-xs text-gray-500">
                                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Last activity {formatDate(category.last_activity_at)}</span>
                                {category.last_thread_title && (
                                  <span className="ml-2 truncate max-w-xs">
                                    in <span className="font-medium">{category.last_thread_title}</span>
                                  </span>
                                )}
                                {category.last_thread_author && (
                                  <span className="ml-1">
                                    by <span className="font-medium">{category.last_thread_author}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Total Threads</div>
                <div className="text-2xl font-bold text-gray-900">
                  {categories.reduce((sum, cat) => sum + cat.thread_count, 0)}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Total Posts</div>
                <div className="text-2xl font-bold text-gray-900">
                  {categories.reduce((sum, cat) => sum + cat.post_count, 0)}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Categories</div>
                <div className="text-2xl font-bold text-gray-900">
                  {categories.length}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Reputation Card */}
            {token && reputation && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Your Reputation</h3>
                </div>
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-3xl mr-2">{getRankIcon(reputation.rank)}</span>
                      <div>
                        <div className={`text-lg font-semibold ${getRankColor(reputation.rank)} capitalize`}>
                          {reputation.rank}
                        </div>
                        <div className="text-sm text-gray-600">Rank</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-indigo-600">{reputation.total_points}</div>
                      <div className="text-sm text-gray-600">Points</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link
                      to={`/forum/profile/${user?.id}`}
                      className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View Profile
                    </Link>
                    <Link
                      to="/forum/leaderboard"
                      className="block w-full text-center px-4 py-2 border border-indigo-600 rounded-md text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      View Leaderboard
                    </Link>
                  </div>

                  {reputation.badge_count > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Badges Earned</span>
                        <span className="font-semibold text-gray-900">{reputation.badge_count}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* How to Use Forum */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">How to Use the Forum</h3>
              </div>
              <div className="px-6 py-5">
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Ask questions about Romanian accounting and tax</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Share your knowledge and help others</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Vote on helpful answers to earn reputation</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Earn badges and climb the leaderboard</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Community Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Community Guidelines</h4>
              <ul className="space-y-1 text-xs text-blue-800">
                <li>• Be respectful and professional</li>
                <li>• Stay on topic</li>
                <li>• No spam or self-promotion</li>
                <li>• Search before posting</li>
                <li>• Mark helpful answers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumHomePage;
