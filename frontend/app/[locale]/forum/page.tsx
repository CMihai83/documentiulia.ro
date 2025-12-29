import { getTranslations } from 'next-intl/server';
import { MessageSquare, Users, TrendingUp, Clock, Eye, Pin } from 'lucide-react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

interface ForumThread {
  title: string;
  slug?: string;
  category: string;
  initialPost: string;
  replies: Array<{
    author: string;
    role?: string;
    content: string;
    createdAt: string;
    helpful?: boolean;
  }>;
  tags: string[];
  views: number;
  sticky?: boolean;
  createdAt: string;
  lastActivity: string;
}

async function getForumData() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'forum.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const threads = JSON.parse(fileContents);

    // Group by category
    const categories = threads.reduce((acc: Record<string, number>, thread: ForumThread) => {
      acc[thread.category] = (acc[thread.category] || 0) + 1;
      return acc;
    }, {});

    return { threads, categories };
  } catch (error) {
    console.error('Error loading forum data:', error);
    return { threads: [], categories: {} };
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `acum ${diffMins} minute`;
  if (diffHours < 24) return `acum ${diffHours} ore`;
  if (diffDays < 7) return `acum ${diffDays} zile`;
  return formatDate(dateStr);
}

const categoryColors: Record<string, string> = {
  'Întrebări Frecvente': 'bg-blue-50 text-blue-700 border-blue-200',
  'Rezolvare Probleme': 'bg-red-50 text-red-700 border-red-200',
  'Best Practices': 'bg-green-50 text-green-700 border-green-200',
  'Discuții Generale': 'bg-purple-50 text-purple-700 border-purple-200',
  'Noutăți': 'bg-orange-50 text-orange-700 border-orange-200',
};

export default async function ForumPage() {
  const t = await getTranslations();
  const { threads, categories } = await getForumData();

  // Sort threads: pinned first, then by last activity
  const sortedThreads = [...threads].sort((a, b) => {
    if (a.sticky && !b.sticky) return -1;
    if (!a.sticky && b.sticky) return 1;
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });

  const totalReplies = threads.reduce((sum: number, thread: ForumThread) =>
    sum + (thread.replies?.length || 0), 0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Forum Comunitate
          </h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Pune întrebări, împărtășește experiențe și învață de la profesioniști în contabilitate și afaceri
          </p>
          <div className="flex justify-center gap-8 mt-8 flex-wrap">
            <div className="text-center">
              <div className="text-3xl font-bold">{threads.length}</div>
              <div className="text-sm opacity-80">Discuții</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{totalReplies}</div>
              <div className="text-sm opacity-80">Răspunsuri</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{Object.keys(categories).length}</div>
              <div className="text-sm opacity-80">Categorii</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-4 border-b bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-blue-600 text-white">
              Toate Discuțiile ({threads.length})
            </span>
            {Object.entries(categories).map(([cat, count]) => (
              <span
                key={cat}
                className="px-4 py-2 rounded-full border transition text-sm font-medium border-gray-200 text-gray-700"
              >
                {cat} ({count as number})
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Threads List */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Discuții Recente</h2>
                <Link
                  href="/forum/new"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Discuție Nouă
                </Link>
              </div>

              {sortedThreads.length === 0 ? (
                <p className="text-center text-gray-500 py-16 bg-white rounded-xl">
                  Nu există discuții disponibile.
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedThreads.map((thread: ForumThread, index) => {
                    const slug = thread.slug || thread.title.toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '');

                    return (
                      <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {thread.sticky && (
                                <Pin className="w-4 h-4 text-yellow-500" />
                              )}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryColors[thread.category] || 'bg-gray-50 text-gray-700'}`}>
                                {thread.category}
                              </span>
                            </div>

                            <Link
                              href={`/forum/thread/${slug}`}
                              className="text-lg font-bold hover:text-blue-600 transition line-clamp-2"
                            >
                              {thread.title}
                            </Link>

                            <p className="text-gray-600 mt-2 line-clamp-2">
                              {thread.initialPost}
                            </p>

                            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {thread.replies?.length || 0} răspunsuri
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {thread.views || 0} vizualizări
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {timeAgo(thread.lastActivity)}
                              </span>
                            </div>

                            {thread.tags && thread.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {thread.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <span key={tagIndex} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Forum Stats */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Statistici Forum
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Discuții:</span>
                    <span className="font-semibold">{threads.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Răspunsuri:</span>
                    <span className="font-semibold">{totalReplies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Membri Activi:</span>
                    <span className="font-semibold">250+</span>
                  </div>
                </div>
              </div>

              {/* Popular Tags */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold mb-4">Taguri Populare</h3>
                <div className="flex flex-wrap gap-2">
                  {['ANAF', 'e-Factura', 'TVA', 'SAF-T', 'REVISAL', 'HR', 'Declarații'].map((tag, index) => (
                    <span key={index} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Forum Guidelines */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-bold mb-3 text-blue-900">Reguli Forum</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Respectă ceilalți membri</li>
                  <li>• Caută înainte de a posta</li>
                  <li>• Fii constructiv și util</li>
                  <li>• Nu face spam sau publicitate</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ai nevoie de ajutor?</h2>
          <p className="text-lg opacity-90 mb-8">
            Comunitatea noastră de profesioniști este gata să te ajute cu întrebările tale.
          </p>
          <Link
            href="/forum/new"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Pune o Întrebare
          </Link>
        </div>
      </section>
    </div>
  );
}
