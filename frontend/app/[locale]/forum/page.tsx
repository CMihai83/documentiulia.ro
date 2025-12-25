import { getTranslations } from 'next-intl/server';
import { MessageSquare, Users, TrendingUp, Clock, Eye } from 'lucide-react';
import Link from 'next/link';

interface ForumCategory {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  description: string;
  icon: string;
  threadCount: number;
  postCount: number;
  _count: { threads: number };
}

interface ForumThread {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  replyCount: number;
  authorName: string;
  category: { name: string; slug: string };
  createdAt: string;
  updatedAt: string;
}

const iconMap: Record<string, string> = {
  Calculator: '📊',
  Shield: '🛡️',
  Table: '📈',
  Users: '👥',
  TrendingUp: '📈',
  Truck: '🚚',
  HardHat: '⚠️',
  Target: '🎯',
  MessageSquare: '💬',
  Laptop: '💻',
};

async function getForumData() {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const [categoriesRes, threadsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/forum/categories`, {
        next: { revalidate: 10, tags: ['forum'] },
      }),
      fetch(`${BACKEND_URL}/api/v1/forum/threads?limit=10`, {
        next: { revalidate: 10, tags: ['forum'] },
      })
    ]);

    const categories = categoriesRes.ok ? await categoriesRes.json() : [];
    const threads = threadsRes.ok ? await threadsRes.json() : [];

    return { categories, threads };
  } catch (error) {
    console.error('Error fetching forum data:', error);
    return { categories: [], threads: [] };
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default async function ForumPage() {
  const t = await getTranslations();
  const { categories, threads } = await getForumData();

  const topContributors = [
    { name: 'Maria Ionescu', posts: 234, badge: 'Expert' },
    { name: 'Andrei Popescu', posts: 189, badge: 'Expert' },
    { name: 'Elena Dumitrescu', posts: 156, badge: 'Pro' },
    { name: 'Ion Gheorghe', posts: 134, badge: 'Pro' },
    { name: 'Ana Marin', posts: 98, badge: 'Activ' },
  ];

  const totalThreads = categories.reduce((sum: number, cat: ForumCategory) => sum + cat.threadCount, 0);
  const totalPosts = categories.reduce((sum: number, cat: ForumCategory) => sum + cat.postCount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('forum.title')}</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            {t('forum.subtitle')}
          </p>
          <div className="flex justify-center gap-8 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold">5,200+</div>
              <div className="text-sm opacity-80">{t('forum.members')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{totalThreads || threads.length}</div>
              <div className="text-sm opacity-80">{t('forum.discussions')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{totalPosts || '2,800'}</div>
              <div className="text-sm opacity-80">{t('forum.posts')}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Categories */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">{t('forum.categories')} ({categories.length})</h2>
              {categories.length === 0 ? (
                <p className="text-gray-500 text-center py-8">{t('forum.noCategories')}</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {categories.map((category: ForumCategory) => (
                    <Link
                      key={category.id}
                      href={`/forum/category/${category.slug}`}
                      className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary-500 hover:bg-primary-50 transition"
                    >
                      <span className="text-2xl">{iconMap[category.icon] || '📁'}</span>
                      <div className="flex-1">
                        <h3 className="font-medium">{category.name}</h3>
                        <p className="text-sm text-gray-500">{category.threadCount} {t('forum.discussions')} · {category.postCount} {t('forum.posts')}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Topics */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{t('forum.recentDiscussions')}</h2>
                <Link href="/forum/new" className="text-primary-600 text-sm font-medium hover:underline">
                  + {t('forum.startDiscussion')}
                </Link>
              </div>
              {threads.length === 0 ? (
                <p className="text-gray-500 text-center py-8">{t('forum.noThreads')}</p>
              ) : (
                <div className="space-y-4">
                  {threads.map((thread: ForumThread) => (
                    <div key={thread.id} className="p-4 border rounded-lg hover:border-primary-300 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {thread.isPinned && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                                📌 {t('forum.pinned')}
                              </span>
                            )}
                            {thread.isLocked && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                🔒 {t('forum.locked')}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">{thread.category?.name}</span>
                          </div>
                          <Link
                            href={`/forum/thread/${thread.slug}`}
                            className="font-medium hover:text-primary-600"
                          >
                            {thread.title}
                          </Link>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{thread.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>{thread.authorName}</span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              {thread.replyCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {thread.viewCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDate(thread.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/forum/all"
                className="block text-center mt-6 text-primary-600 font-medium hover:underline"
              >
                {t('forum.viewAll')} →
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* New Topic Button */}
            <Link
              href="/forum/new"
              className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              {t('forum.newDiscussion')}
            </Link>

            {/* Top Contributors */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                {t('forum.topContributors')}
              </h3>
              <div className="space-y-3">
                {topContributors.map((user, index) => (
                  <div key={user.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium">{user.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      user.badge === 'Expert' ? 'bg-yellow-100 text-yellow-700' :
                      user.badge === 'Pro' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Forum Rules */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4">{t('forum.rules')}</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• {t('forum.rule1')}</li>
                <li>• {t('forum.rule2')}</li>
                <li>• {t('forum.rule3')}</li>
                <li>• {t('forum.rule4')}</li>
                <li>• {t('forum.rule5')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
