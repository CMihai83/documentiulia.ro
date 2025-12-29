import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, User, ArrowLeft, Clock, Eye, Tag, Share2 } from 'lucide-react';
import fs from 'fs';
import path from 'path';

interface BlogArticle {
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  category: string;
  tags: string[];
  author: string;
  publishedAt: string;
  readTime: number;
  featuredImage?: string;
  seo?: {
    title: string;
    description: string;
    keywords: string[];
  };
}

async function getArticle(slug: string): Promise<BlogArticle | null> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'blog.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const articles: BlogArticle[] = JSON.parse(fileContents);

    const article = articles.find(a => a.slug === slug);
    return article || null;
  } catch (error) {
    console.error('Error loading article:', error);
    return null;
  }
}

async function getRelatedArticles(currentSlug: string, category: string): Promise<BlogArticle[]> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'blog.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const articles: BlogArticle[] = JSON.parse(fileContents);

    return articles
      .filter(a => a.slug !== currentSlug && a.category === category)
      .slice(0, 3);
  } catch (error) {
    return [];
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
  'ANAF': 'bg-blue-50 text-blue-700',
  'HR': 'bg-purple-50 text-purple-700',
  'Business': 'bg-green-50 text-green-700',
  'Tehnologie': 'bg-orange-50 text-orange-700',
  'Noutăți': 'bg-red-50 text-red-700',
};

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(article.slug, article.category);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Înapoi la Blog
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <article className="bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-6">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${categoryColors[article.category] || 'bg-gray-100 text-gray-700'}`}>
              {article.category}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            {article.title}
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            {article.excerpt}
          </p>

          <div className="flex items-center gap-6 text-sm text-gray-500 pb-8 border-b">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <span className="font-medium">{article.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>{formatDate(article.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{article.readTime} min citire</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <span>{Math.floor(Math.random() * 1000) + 200} vizualizări</span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {article.featuredImage && (
          <div className="max-w-4xl mx-auto px-4 mb-12">
            <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl overflow-hidden">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📰</div>
                  <div className="text-blue-700 font-medium">{article.category}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Article Content */}
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <div className="prose prose-lg max-w-none">
            {article.content ? (
              <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                {article.content}
              </div>
            ) : (
              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>
                  {article.excerpt}
                </p>
                <p>
                  Acest articol oferă informații detaliate despre {article.title.toLowerCase()}.
                  Conținutul acoperă aspecte esențiale pentru profesioniștii din domeniu.
                </p>
              </div>
            )}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t">
              <h3 className="text-lg font-semibold mb-4">Taguri</h3>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="mt-8 pt-8 border-t">
            <div className="flex items-center gap-4">
              <span className="text-gray-700 font-medium">Distribuie:</span>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Author Bio */}
          <div className="mt-12 p-6 bg-gray-50 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">{article.author}</h3>
                <p className="text-gray-600">
                  Expert în contabilitate și conformitate fiscală. Experiență vastă în implementarea soluțiilor ANAF și e-Factura.
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="bg-gray-50 py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Articole similare</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden group"
                >
                  <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl mb-2">📄</div>
                      <div className="text-sm text-blue-700 font-medium">{related.category}</div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-2 group-hover:text-blue-600 transition line-clamp-2">
                      {related.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {related.excerpt}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(related.publishedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {related.readTime} min
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-blue-600 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Vrei să afli mai multe?</h2>
          <p className="text-lg opacity-90 mb-8">
            Explorează cursurile noastre și devino expert în contabilitate și conformitate fiscală.
          </p>
          <Link
            href="/courses"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Vezi Cursurile
          </Link>
        </div>
      </section>
    </div>
  );
}

export async function generateStaticParams() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'blog.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const articles: BlogArticle[] = JSON.parse(fileContents);

    return articles.map(article => ({
      slug: article.slug,
    }));
  } catch (error) {
    return [];
  }
}
