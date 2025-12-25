import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { MessageSquare, Eye, Clock, ArrowLeft } from 'lucide-react';

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
  createdAt: string;
}

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  threadCount: number;
}

async function getCategoryData(slug: string) {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const [categoryRes, threadsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/forum/categories/${slug}`, {
        next: { revalidate: 60 },
        cache: 'no-store'
      }),
      fetch(`${BACKEND_URL}/api/v1/forum/threads?category=${slug}&limit=20`, {
        next: { revalidate: 60 },
        cache: 'no-store'
      })
    ]);

    const category = categoryRes.ok ? await categoryRes.json() : null;
    const threads = threadsRes.ok ? await threadsRes.json() : [];

    return { category, threads };
  } catch {
    return { category: null, threads: [] };
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations();
  const { category, threads } = await getCategoryData(slug);

  const categoryName = category?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/forum" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            {t('forum.backToForum') || 'Înapoi la forum'}
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">{categoryName}</h1>
          {category?.description && (
            <p className="mt-2 opacity-90">{category.description}</p>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl shadow-sm">
          {threads.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('forum.noThreadsInCategory') || 'Nu există discuții în această categorie.'}</p>
              <Link href="/forum/new" className="inline-block mt-4 text-primary-600 font-medium hover:underline">
                {t('forum.startFirst') || 'Fii primul care începe o discuție'}
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {threads.map((thread: ForumThread) => (
                <div key={thread.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {thread.isPinned && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                            📌 {t('forum.pinned') || 'Fixat'}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/forum/thread/${thread.slug}`}
                        className="font-medium text-lg hover:text-primary-600"
                      >
                        {thread.title}
                      </Link>
                      <p className="text-gray-600 mt-1 line-clamp-2">{thread.content}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
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
        </div>
      </div>
    </div>
  );
}
