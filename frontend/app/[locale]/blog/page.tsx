import { getTranslations } from 'next-intl/server';
import { Calendar, User, ArrowRight, Tag, Clock, Eye } from 'lucide-react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

interface BlogArticle {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: string;
  publishedAt: string;
  readTime: number;
  featuredImage?: string;
}

async function getBlogData() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'blog.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const articles = JSON.parse(fileContents);

    // Group by category
    const categories = articles.reduce((acc: Record<string, number>, article: BlogArticle) => {
      acc[article.category] = (acc[article.category] || 0) + 1;
      return acc;
    }, {});

    return { articles, categories };
  } catch (error) {
    console.error('Error loading blog data:', error);
    return { articles: [], categories: {} };
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

const categoryColors: Record<string, string> = {
  'ANAF': 'bg-blue-50 text-blue-700 border-blue-200',
  'HR': 'bg-purple-50 text-purple-700 border-purple-200',
  'Business': 'bg-green-50 text-green-700 border-green-200',
  'Tehnologie': 'bg-orange-50 text-orange-700 border-orange-200',
  'Noutăți': 'bg-red-50 text-red-700 border-red-200',
};

export default async function BlogPage() {
  const t = await getTranslations();
  const { articles, categories } = await getBlogData();

  // Sort articles by date (newest first)
  const sortedArticles = [...articles].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Blog Contabilitate România
          </h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Articole despre ANAF, e-Factura, TVA, HR și legislație pentru profesioniști români
          </p>
          <div className="flex justify-center gap-8 mt-8 flex-wrap">
            <div className="text-center">
              <div className="text-3xl font-bold">{articles.length}</div>
              <div className="text-sm opacity-80">Articole</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{Object.keys(categories).length}</div>
              <div className="text-sm opacity-80">Categorii</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">10k+</div>
              <div className="text-sm opacity-80">Cititori lunar</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-4 border-b bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-blue-600 text-white">
              Toate Articolele ({articles.length})
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

      {/* Articles Grid */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {sortedArticles.length === 0 ? (
            <p className="text-center text-gray-500 py-16">Nu există articole disponibile.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedArticles.map((article: BlogArticle) => (
                <article key={article.slug} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden group">
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center relative">
                    {article.featuredImage ? (
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${article.featuredImage})` }}></div>
                    ) : (
                      <div className="text-center p-6">
                        <div className="text-4xl mb-2">📄</div>
                        <div className="text-sm text-blue-700 font-medium">{article.category}</div>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${categoryColors[article.category] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {article.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(article.publishedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {article.readTime} min
                      </span>
                    </div>

                    <h2 className="text-xl font-bold mb-3 group-hover:text-blue-600 transition line-clamp-2">
                      {article.title}
                    </h2>

                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center flex-wrap gap-2 mb-4">
                      {article.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="w-4 h-4" />
                        <span>{article.author}</span>
                      </div>
                      <Link
                        href={`/blog/${article.slug}`}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                      >
                        Citește
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Rămâi la curent cu noutățile</h2>
          <p className="text-lg opacity-90 mb-8">
            Primește cele mai noi articole despre contabilitate, ANAF și legislație direct în inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Email-ul tău"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900"
            />
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
              Abonează-te
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
