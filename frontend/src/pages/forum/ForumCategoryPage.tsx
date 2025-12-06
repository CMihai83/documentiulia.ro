import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Thread {
  id: string;
  category_id: number;
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
  last_activity_at: string;
  created_at: string;
}

const ForumCategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { token } = useAuth();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [sortBy, setSortBy] = useState('recent'); // recent, popular, views, votes
  const [filterTag, setFilterTag] = useState('');
  const [filterSolved, setFilterSolved] = useState<string>(''); // '', 'true', 'false'
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // All available tags
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    fetchCategory();
  }, [slug]);

  useEffect(() => {
    if (categoryId) {
      fetchThreads();
    }
  }, [categoryId, sortBy, filterTag, filterSolved, offset]);

  const fetchCategory = async () => {
    try {
      const response = await fetch('https://documentiulia.ro/api/v1/forum/categories.php');
      const data = await response.json();

      if (data.success) {
        const category = data.data.find((cat: any) => cat.slug === slug);
        if (category) {
          setCategoryName(category.name);
          setCategoryId(category.id);
        } else {
          setError('Category not found');
        }
      }
    } catch (err) {
      setError('Failed to load category');
    }
  };

  const fetchThreads = async () => {
    if (!categoryId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        category_id: categoryId.toString(),
        sort: sortBy,
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (filterTag) params.append('tag', filterTag);
      if (filterSolved) params.append('is_solved', filterSolved);

      const response = await fetch(
        `https://documentiulia.ro/api/v1/forum/threads.php?${params.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setThreads(data.data);
        setHasMore(data.data.length === limit);

        // Extract all unique tags
        const tags = new Set<string>();
        data.data.forEach((thread: Thread) => {
          thread.tags.forEach(tag => tags.add(tag));
        });
        setAllTags(Array.from(tags).sort());
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load threads');
    } finally {
      setLoading(false);
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short'
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

  const filteredThreads = threads.filter(thread => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        thread.title.toLowerCase().includes(query) ||
        thread.content.toLowerCase().includes(query) ||
        thread.author_name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const pinnedThreads = filteredThreads.filter(t => t.is_pinned);
  const regularThreads = filteredThreads.filter(t => !t.is_pinned);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <Link to="/forum" className="hover:text-gray-700">Forum</Link>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-900 font-medium">{categoryName}</span>
              </nav>
              <h1 className="text-3xl font-bold text-gray-900">{categoryName}</h1>
            </div>
            {token && (
              <Link
                to={`/forum/new-thread?category=${categoryId}`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Thread
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="views">Most Viewed</option>
                <option value="votes">Most Voted</option>
              </select>
            </div>

            {/* Filter Solved */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterSolved}
                onChange={(e) => setFilterSolved(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Threads</option>
                <option value="false">Unsolved</option>
                <option value="true">Solved</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Tag</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterTag('')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filterTag === ''
                      ? 'bg-indigo-100 text-indigo-800 font-medium'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filterTag === tag
                        ? 'bg-indigo-100 text-indigo-800 font-medium'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Threads List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No threads found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search or filters.' : 'Be the first to start a discussion!'}
              </p>
              {token && !searchQuery && (
                <div className="mt-6">
                  <Link
                    to={`/forum/new-thread?category=${categoryId}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Start a Thread
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Pinned Threads */}
              {pinnedThreads.map(thread => (
                <Link
                  key={thread.id}
                  to={`/forum/thread/${thread.id}`}
                  className="block hover:bg-gray-50 transition-colors duration-150"
                >
                  <div className="px-6 py-4">
                    <div className="flex items-start">
                      {/* Thread Icon */}
                      <div className="flex-shrink-0 mr-4">
                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                          </svg>
                        </div>
                      </div>

                      {/* Thread Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                📌 Pinned
                              </span>
                              {thread.is_solved && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  ✓ Solved
                                </span>
                              )}
                              {thread.is_locked && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  🔒 Locked
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 hover:text-indigo-600 line-clamp-2">
                              {thread.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                              {thread.content}
                            </p>
                            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                              <span className={`font-medium ${getRankColor(thread.author_rank)}`}>
                                {thread.author_name}
                              </span>
                              <span>•</span>
                              <span>{formatDate(thread.created_at)}</span>
                              {thread.tags.length > 0 && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center space-x-1">
                                    {thread.tags.slice(0, 3).map(tag => (
                                      <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                                        {tag}
                                      </span>
                                    ))}
                                    {thread.tags.length > 3 && (
                                      <span className="text-gray-500">+{thread.tags.length - 3}</span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="ml-4 flex-shrink-0 flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>{thread.view_count}</span>
                            </div>
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span>{thread.reply_count}</span>
                            </div>
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                              <span>{thread.upvote_count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Regular Threads */}
              {regularThreads.map(thread => (
                <Link
                  key={thread.id}
                  to={`/forum/thread/${thread.id}`}
                  className="block hover:bg-gray-50 transition-colors duration-150"
                >
                  <div className="px-6 py-4">
                    <div className="flex items-start">
                      {/* Thread Icon */}
                      <div className="flex-shrink-0 mr-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          thread.is_solved ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {thread.is_solved ? (
                            <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Thread Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {(thread.is_solved || thread.is_locked) && (
                              <div className="flex items-center space-x-2 mb-1">
                                {thread.is_solved && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Solved
                                  </span>
                                )}
                                {thread.is_locked && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    🔒 Locked
                                  </span>
                                )}
                              </div>
                            )}
                            <h3 className="text-base font-semibold text-gray-900 hover:text-indigo-600 line-clamp-2">
                              {thread.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                              {thread.content}
                            </p>
                            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                              <span className={`font-medium ${getRankColor(thread.author_rank)}`}>
                                {thread.author_name}
                              </span>
                              <span>•</span>
                              <span>{formatDate(thread.created_at)}</span>
                              {thread.tags.length > 0 && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center space-x-1">
                                    {thread.tags.slice(0, 3).map(tag => (
                                      <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                                        {tag}
                                      </span>
                                    ))}
                                    {thread.tags.length > 3 && (
                                      <span className="text-gray-500">+{thread.tags.length - 3}</span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="ml-4 flex-shrink-0 flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>{thread.view_count}</span>
                            </div>
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span>{thread.reply_count}</span>
                            </div>
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                              <span>{thread.upvote_count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredThreads.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Showing {offset + 1} - {offset + filteredThreads.length}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={!hasMore}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumCategoryPage;
