import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { MessageSquare, Eye, Clock, ArrowLeft, User, LogIn } from 'lucide-react';

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
  replies?: ForumReply[];
}

interface ForumReply {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

async function getThreadData(slug: string) {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/forum/threads/${slug}`, {
      next: { revalidate: 60 },
      cache: 'no-store'
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations();
  const thread = await getThreadData(slug);

  if (!thread) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('forum.threadNotFound') || 'Discuție negăsită'}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('forum.threadNotFoundDesc') || 'Această discuție nu există sau a fost ștearsă.'}
          </p>
          <Link href="/forum" className="text-primary-600 font-medium hover:underline">
            {t('forum.backToForum') || 'Înapoi la forum'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/forum" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            {t('forum.backToForum') || 'Înapoi la forum'}
          </Link>
          <div className="flex items-center gap-2 mb-2">
            {thread.isPinned && (
              <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded">
                📌 {t('forum.pinned') || 'Fixat'}
              </span>
            )}
            {thread.isLocked && (
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                🔒 {t('forum.locked') || 'Închis'}
              </span>
            )}
            <Link
              href={`/forum/category/${thread.category?.slug}`}
              className="text-sm bg-white/20 px-2 py-0.5 rounded hover:bg-white/30"
            >
              {thread.category?.name}
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{thread.title}</h1>
        </div>
      </section>

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Original Post */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-semibold">{thread.authorName}</span>
                <span className="text-sm text-gray-500">{formatDate(thread.createdAt)}</span>
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{thread.content}</p>
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {thread.viewCount} {t('forum.views') || 'vizualizări'}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  {thread.replyCount} {t('forum.replies') || 'răspunsuri'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Replies */}
        {thread.replies && thread.replies.length > 0 && (
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold">{t('forum.replies') || 'Răspunsuri'}</h2>
            {thread.replies.map((reply: ForumReply) => (
              <div key={reply.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">{reply.authorName}</span>
                      <span className="text-sm text-gray-500">{formatDate(reply.createdAt)}</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply Box */}
        {!thread.isLocked ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold mb-4">{t('forum.addReply') || 'Adaugă un răspuns'}</h3>
            <div className="text-center py-8">
              <LogIn className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">
                {t('forum.loginToReply') || 'Autentifică-te pentru a răspunde'}
              </p>
              <Link
                href="/login"
                className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700"
              >
                {t('auth.login') || 'Autentificare'}
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-xl p-6 text-center">
            <p className="text-gray-500">
              🔒 {t('forum.threadLocked') || 'Această discuție este închisă pentru răspunsuri noi.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
