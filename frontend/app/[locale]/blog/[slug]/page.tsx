import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, User, ArrowLeft, Clock, Eye, Tag, Share2 } from 'lucide-react';

interface BlogCategory {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
}

interface BlogArticle {
  id: string;
  title: string;
  titleEn: string | null;
  slug: string;
  excerpt: string;
  content: string;
  authorName: string;
  authorBio: string | null;
  readTime: number;
  tags: string[];
  status: string;
  publishedAt: string;
  viewCount: number;
  category: BlogCategory;
}

async function getArticle(slug: string): Promise<BlogArticle | null> {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/blog/article/${slug}`, {
      next: { revalidate: 60 },
      cache: 'no-store',
    });

    if (!res.ok) {
      // Try to find by slug in all articles if direct fetch fails
      const allRes = await fetch(`${BACKEND_URL}/api/v1/blog/articles`, {
        next: { revalidate: 60 },
        cache: 'no-store',
      });
      if (allRes.ok) {
        const articles = await allRes.json();
        const article = articles.find((a: BlogArticle) => a.slug === slug);
        if (article) return article;
      }
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

async function getRelatedArticles(categorySlug: string, currentSlug: string): Promise<BlogArticle[]> {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/blog/articles?limit=4`, {
      next: { revalidate: 60 },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const articles = await res.json();
    return articles
      .filter((a: BlogArticle) => a.slug !== currentSlug)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const t = await getTranslations();
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(article.category?.slug || '', slug);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('blog.backToBlog') || 'Inapoi la blog'}
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-8">
          {article.category && (
            <Link
              href={`/${locale}/blog?category=${article.category.slug}`}
              className="inline-block text-primary-600 text-sm font-medium mb-4 hover:underline"
            >
              {article.category.name}
            </Link>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {article.title}
          </h1>

          <p className="text-xl text-gray-600 mb-6">{article.excerpt}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {article.authorName}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(article.publishedAt)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {article.readTime} min {t('blog.readTime') || 'lectura'}
            </span>
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {article.viewCount} {t('blog.views') || 'vizualizari'}
            </span>
          </div>
        </header>

        {/* Article Content */}
        <div className="prose prose-lg max-w-none mb-12">
          <div
            className="whitespace-pre-line text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: article.content
                .split('\n\n')
                .map(p => `<p>${p}</p>`)
                .join('')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^• (.*?)$/gm, '<li>$1</li>')
            }}
          />
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mb-8 pb-8 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">
                {t('blog.tags') || 'Tag-uri'}:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200 transition"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Author Bio */}
        <div className="bg-gray-100 rounded-xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{article.authorName}</h3>
              <p className="text-gray-600 mt-1">
                {article.authorBio ||
                  (t('blog.defaultAuthorBio') ||
                    'Expert in contabilitate si fiscalitate romaneasca, cu experienta in implementarea solutiilor digitale pentru afaceri.')}
              </p>
            </div>
          </div>
        </div>

        {/* Share */}
        <div className="flex items-center justify-between mb-12 pb-8 border-b">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">
              {t('blog.shareArticle') || 'Distribuie articolul'}:
            </span>
          </div>
          <div className="flex gap-2">
            <button className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition">
              Facebook
            </button>
            <button className="bg-sky-400 text-white px-4 py-2 rounded text-sm hover:bg-sky-500 transition">
              Twitter
            </button>
            <button className="bg-blue-700 text-white px-4 py-2 rounded text-sm hover:bg-blue-800 transition">
              LinkedIn
            </button>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">
              {t('blog.relatedArticles') || 'Articole similare'}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/${locale}/blog/${related.slug}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden group"
                >
                  <div className="h-32 bg-gradient-to-br from-primary-100 to-primary-200" />
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary-600 transition">
                      {related.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(related.publishedAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            {t('blog.cta.title') || 'Aboneaza-te la newsletter'}
          </h2>
          <p className="text-lg opacity-90 mb-8">
            {t('blog.cta.subtitle') ||
              'Primeste cele mai noi articole si noutati fiscale direct in inbox.'}
          </p>
          <Link
            href={`/${locale}/register`}
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            {t('blog.cta.button') || 'Creaza cont gratuit'}
          </Link>
        </div>
      </section>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    title: `${article.title} | Blog | DocumentIulia.ro`,
    description: article.excerpt,
  };
}
