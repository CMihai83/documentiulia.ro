'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, LogIn } from 'lucide-react';

export default function ForumNewPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/forum" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            {t('forum.backToForum') || 'Înapoi la forum'}
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">{t('forum.newDiscussion') || 'Discuție Nouă'}</h1>
        </div>
      </section>

      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">
            {t('forum.loginRequired') || 'Autentificare necesară'}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('forum.loginToPostDescription') || 'Pentru a începe o discuție nouă, trebuie să fii autentificat.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition"
            >
              {t('auth.login') || 'Autentificare'}
            </Link>
            <Link
              href="/register"
              className="border border-primary-600 text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition"
            >
              {t('auth.register') || 'Creează cont'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
