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
  category: { name: string; slug: string };
  createdAt: string;
}

async function getAllThreads() {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/forum/threads?limit=50`, {
      next: { revalidate: 60 },
      cache: 'no-store'
    });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default async function ForumAllPage() {
  const t = await getTranslations();
  const threads = await getAllThreads();

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/forum" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            {t('forum.backToForum') || 'Înapoi la forum'}
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">{t('forum.allDiscussions') || 'Toate Discuțiile'}</h1>
        </div>
      </section>

      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl shadow-sm">
          {threads.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('forum.noThreads') || 'Nu există discuții încă.'}</p>
              <Link href="/login" className="inline-block mt-4 text-primary-600 font-medium hover:underline">
                {t('forum.loginToPost') || 'Autentifică-te pentru a începe o discuție'}
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
                        <span className="text-xs text-gray-500">{thread.category?.name}</span>
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
