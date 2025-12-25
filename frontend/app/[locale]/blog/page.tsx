import { getTranslations } from 'next-intl/server';
import { Calendar, User, ArrowRight, Tag, Clock, Eye } from 'lucide-react';
import Link from 'next/link';

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

async function getBlogData() {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const [articlesRes, categoriesRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/blog/articles?limit=20`, {
        next: { revalidate: 10, tags: ['blog'] },
      }),
      fetch(`${BACKEND_URL}/api/v1/blog/categories`, {
        next: { revalidate: 10, tags: ['blog'] },
      })
    ]);

    const articles = articlesRes.ok ? await articlesRes.json() : [];
    const categories = categoriesRes.ok ? await categoriesRes.json() : [];

    return { articles, categories };
  } catch (error) {
    console.error('Error fetching blog data:', error);
    return { articles: [], categories: [] };
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default async function BlogPage() {
  const t = await getTranslations();
  const { articles, categories } = await getBlogData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('blog.title')}</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            {t('blog.subtitle')}
          </p>
          <div className="flex justify-center gap-8 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold">{articles.length}+</div>
              <div className="text-sm opacity-80">{t('blog.articlesCount')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{categories.length}</div>
              <div className="text-sm opacity-80">{t('blog.categoriesCount')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">10k+</div>
              <div className="text-sm opacity-80">{t('blog.readersCount')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-4 border-b bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/blog"
              className="px-4 py-2 rounded-full border transition text-sm font-medium bg-primary-600 text-white border-primary-600"
            >
              {t('blog.allCategories')} ({articles.length})
            </Link>
            {categories.map((category: BlogCategory) => (
              <Link
                key={category.id}
                href={`/blog?category=${category.slug}`}
                className="px-4 py-2 rounded-full border transition text-sm font-medium border-gray-200 hover:border-primary-500 hover:text-primary-600"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {articles.length === 0 ? (
            <p className="text-center text-gray-500 py-16">{t('blog.noArticles')}</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article: BlogArticle) => (
                <article key={article.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden group">
                  <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center relative">
                    <Tag className="w-12 h-12 text-primary-400" />
                    {article.tags && article.tags.length > 0 && (
                      <div className="absolute top-3 right-3 flex gap-1">
                        {article.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="text-xs bg-white/90 text-primary-600 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                        {article.category?.name || 'General'}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readTime} min
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold mb-2 group-hover:text-primary-600 transition line-clamp-2">
                      {article.title}
                    </h2>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {article.authorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(article.publishedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.viewCount} {t('blog.views')}
                      </span>
                      <Link
                        href={`/blog/${article.slug}`}
                        className="inline-flex items-center text-primary-600 font-medium text-sm hover:underline"
                      >
                        {t('blog.readMore')} <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 px-4 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{t('blog.newsletter.title')}</h2>
          <p className="text-lg opacity-90 mb-8">
            {t('blog.newsletter.subtitle')}
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder={t('blog.newsletter.placeholder')}
              className="flex-1 px-4 py-3 rounded-lg text-gray-900"
            />
            <button
              type="submit"
              className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              {t('blog.newsletter.button')}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
