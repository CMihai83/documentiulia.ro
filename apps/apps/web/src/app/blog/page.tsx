'use client';

/**
 * Blog Page - Enchanted Knowledge Repository
 *
 * AI-generated articles with focus on:
 * - 16% Dividend Tax (Jan 2026)
 * - HR Wellness & ATS trends
 * - PNRR €21.6B opportunities
 * - RO AI Factory & GenAI adoption
 * - Law 141 VAT changes (21%/11%)
 * - SAF-T D406 pilot preparations
 */

import { useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, Calendar, Clock, User, Search, Rss, Sparkles, TrendingUp } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  featured: boolean;
  aiGenerated: boolean;
  views: number;
}

// Seeded articles with 2026 compliance focus - Gen Blog Incantation
const posts: BlogPost[] = [
  {
    id: '1',
    title: 'Impozit Dividende 16% din Ianuarie 2026: Ghid Complet',
    excerpt: 'Tot ce trebuie să știi despre noua rată de impozitare a dividendelor de 16% care intră în vigoare din ianuarie 2026. Strategii de optimizare fiscală și implicații pentru SRL-uri.',
    author: 'AI Assistant',
    date: '03 Dec 2025',
    readTime: '12 min',
    category: 'Fiscalitate 2026',
    tags: ['dividende', '16%', 'impozit', '2026'],
    featured: true,
    aiGenerated: true,
    views: 3847,
  },
  {
    id: '2',
    title: 'HR Wellness în 2026: Cum să Crești Productivitatea cu 40%',
    excerpt: 'Programele de wellness devin obligatorii pentru companiile cu peste 50 de angajați. Descoperă cele mai eficiente strategii de implementare și ROI-ul real.',
    author: 'AI Assistant',
    date: '02 Dec 2025',
    readTime: '8 min',
    category: 'HR & Wellness',
    tags: ['HR', 'wellness', 'productivitate', 'angajați'],
    featured: false,
    aiGenerated: true,
    views: 2156,
  },
  {
    id: '3',
    title: 'PNRR 2026: €21.6 Miliarde - Ghid Eligibilitate IMM',
    excerpt: 'Cum să accesezi fondurile PNRR în 2026. Lista completă a programelor disponibile pentru IMM-uri, criterii de eligibilitate și pași de aplicare.',
    author: 'Iulia Popescu',
    date: '01 Dec 2025',
    readTime: '15 min',
    category: 'Fonduri EU',
    tags: ['PNRR', 'fonduri', 'IMM', 'digitalizare'],
    featured: false,
    aiGenerated: false,
    views: 4521,
  },
  {
    id: '4',
    title: 'RO AI Factory: Cum să Antrenezi Modele LLM în România',
    excerpt: 'Ghid tehnic pentru accesarea infrastructurii RO AI Factory. HPC resources, costuri, și exemple de fine-tuning pentru aplicații business.',
    author: 'AI Assistant',
    date: '30 Nov 2025',
    readTime: '10 min',
    category: 'GenAI',
    tags: ['AI', 'LLM', 'RO AI Factory', 'HPC'],
    featured: false,
    aiGenerated: true,
    views: 1876,
  },
  {
    id: '5',
    title: 'TVA 21% și 11% (Legea 141): Implementare Practică',
    excerpt: 'Noile cote TVA din august 2025 - cum să configurezi corect sistemul de facturare, excepții și cazuri speciale pentru diverse industrii.',
    author: 'Andrei Ionescu',
    date: '29 Nov 2025',
    readTime: '9 min',
    category: 'TVA',
    tags: ['TVA', '21%', '11%', 'Legea 141'],
    featured: false,
    aiGenerated: false,
    views: 5234,
  },
  {
    id: '6',
    title: 'SAF-T D406 Pilot: Pregătire pentru Raportarea 2026',
    excerpt: 'Tot ce trebuie să știi despre pilotul SAF-T D406. Structura fișierului XML, validări ANAF și integrare cu sistemele ERP existente.',
    author: 'AI Assistant',
    date: '28 Nov 2025',
    readTime: '14 min',
    category: 'Raportare',
    tags: ['SAF-T', 'D406', 'ANAF', 'XML'],
    featured: false,
    aiGenerated: true,
    views: 2987,
  },
  {
    id: '7',
    title: 'ATS cu AI: Reducerea Timpului de Recrutare cu 60%',
    excerpt: 'Sistemele ATS bazate pe AI transformă recrutarea. Studiu de caz: implementare spaCy NLP pentru matching CV-uri cu 95% acuratețe.',
    author: 'AI Assistant',
    date: '27 Nov 2025',
    readTime: '7 min',
    category: 'HR & Wellness',
    tags: ['ATS', 'AI', 'recrutare', 'spaCy'],
    featured: false,
    aiGenerated: true,
    views: 1654,
  },
  {
    id: '8',
    title: 'e-Factura B2B Mid-2026: Timeline și Cerințe',
    excerpt: 'e-Factura devine obligatorie pentru toate tranzacțiile B2B din mid-2026. Pregătirea sistemelor, validări XML și integrare SPV.',
    author: 'Iulia Popescu',
    date: '26 Nov 2025',
    readTime: '11 min',
    category: 'E-Factura',
    tags: ['e-Factura', 'B2B', 'ANAF', 'SPV'],
    featured: false,
    aiGenerated: false,
    views: 6123,
  },
  {
    id: '9',
    title: 'DIH4Society: €50k Vouchers pentru Digitalizare IMM',
    excerpt: 'Programul DIH4Society 2026-2029 oferă vouchere de până la €50.000 pentru digitalizarea IMM-urilor. Cum să aplici și criterii de selecție.',
    author: 'AI Assistant',
    date: '25 Nov 2025',
    readTime: '8 min',
    category: 'Fonduri EU',
    tags: ['DIH4Society', 'digitalizare', 'voucher', 'IMM'],
    featured: false,
    aiGenerated: true,
    views: 2341,
  },
  {
    id: '10',
    title: 'GenAI în Contabilitate: 40% Automatizare până în 2030',
    excerpt: 'Cum GenAI transformă procesele contabile. OCR cu LayoutLMv3, clasificare automată documente și predicții cash-flow cu Prophet.',
    author: 'AI Assistant',
    date: '24 Nov 2025',
    readTime: '13 min',
    category: 'GenAI',
    tags: ['GenAI', 'OCR', 'automatizare', 'Prophet'],
    featured: false,
    aiGenerated: true,
    views: 1987,
  },
  {
    id: '11',
    title: 'e-Transport €10k: Conformitate Obligatorie 2026',
    excerpt: 'Transporturile peste €10.000 necesită declarare e-Transport. Integrare tahograf digital, API-uri EU și penalități pentru neconformitate.',
    author: 'Andrei Ionescu',
    date: '23 Nov 2025',
    readTime: '10 min',
    category: 'E-Transport',
    tags: ['e-Transport', 'tahograf', '€10k', 'ANAF'],
    featured: false,
    aiGenerated: false,
    views: 3456,
  },
  {
    id: '12',
    title: 'ABSL BSS: 347k Jobs în Servicii Business România',
    excerpt: 'Sectorul Business Services din România crește cu 15% anual. Top skills cerute, salarii medii și proiecții de angajare 2026.',
    author: 'AI Assistant',
    date: '22 Nov 2025',
    readTime: '6 min',
    category: 'HR & Wellness',
    tags: ['ABSL', 'BSS', 'jobs', 'outsourcing'],
    featured: false,
    aiGenerated: true,
    views: 1543,
  },
  {
    id: '13',
    title: 'Tratate Fiscale UK/Andorra: Impact pentru Expați',
    excerpt: 'Noile tratate fiscale cu UK și Andorra - implicații pentru cetățenii români care lucrează în străinătate și pentru companiile multinaționale.',
    author: 'AI Assistant',
    date: '21 Nov 2025',
    readTime: '9 min',
    category: 'Fiscalitate 2026',
    tags: ['tratate', 'UK', 'Andorra', 'expați'],
    featured: false,
    aiGenerated: true,
    views: 1234,
  },
  {
    id: '14',
    title: 'Deficit 6% și Măsuri de Austeritate 2026',
    excerpt: 'Cum afectează ținta de deficit de 6% mediul de afaceri. Posibile creșteri de taxe, reduceri de cheltuieli și impact pe IMM-uri.',
    author: 'Iulia Popescu',
    date: '20 Nov 2025',
    readTime: '8 min',
    category: 'Fiscalitate 2026',
    tags: ['deficit', 'austeritate', 'taxe', 'buget'],
    featured: false,
    aiGenerated: false,
    views: 2876,
  },
  {
    id: '15',
    title: 'AIC Monthly: Declarația Lunară Obligatorie',
    excerpt: 'Declarația AIC devine lunară din 2026. Ghid pas cu pas pentru completare, termene și penalități pentru întârziere.',
    author: 'AI Assistant',
    date: '19 Nov 2025',
    readTime: '7 min',
    category: 'Raportare',
    tags: ['AIC', 'declarație', 'lunar', 'ANAF'],
    featured: false,
    aiGenerated: true,
    views: 1987,
  },
];

const categories = [
  { name: 'Toate', count: posts.length },
  { name: 'Fiscalitate 2026', count: posts.filter(p => p.category === 'Fiscalitate 2026').length },
  { name: 'HR & Wellness', count: posts.filter(p => p.category === 'HR & Wellness').length },
  { name: 'Fonduri EU', count: posts.filter(p => p.category === 'Fonduri EU').length },
  { name: 'GenAI', count: posts.filter(p => p.category === 'GenAI').length },
  { name: 'E-Factura', count: posts.filter(p => p.category === 'E-Factura').length },
  { name: 'Raportare', count: posts.filter(p => p.category === 'Raportare').length },
  { name: 'TVA', count: posts.filter(p => p.category === 'TVA').length },
  { name: 'E-Transport', count: posts.filter(p => p.category === 'E-Transport').length },
];

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toate');
  const [showAIOnly, setShowAIOnly] = useState(false);

  const featuredPost = posts.find((p) => p.featured);

  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'Toate' || post.category === selectedCategory;
    const matchesAI = !showAIOnly || post.aiGenerated;
    return matchesSearch && matchesCategory && matchesAI && !post.featured;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">DocumentIulia</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/blog/rss"
              className="flex items-center gap-2 text-orange-500 hover:text-orange-600 transition"
              title="RSS Feed"
            >
              <Rss className="w-5 h-5" />
            </Link>
            <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition">
              <ArrowLeft className="w-4 h-4" />
              Înapoi
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-4xl font-bold text-slate-900">Blog</h1>
          <span className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
            <Sparkles className="w-4 h-4" />
            AI-Powered
          </span>
        </div>
        <p className="text-xl text-slate-600">
          Articole, ghiduri și noutăți despre contabilitate, fiscalitate și tendințe 2026
        </p>

        {/* Search & Filters */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Caută articole, tag-uri..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowAIOnly(!showAIOnly)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
              showAIOnly
                ? 'bg-purple-600 text-white'
                : 'bg-white border text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Doar AI-Generated
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Featured Post */}
            {featuredPost && selectedCategory === 'Toate' && !searchQuery && (
              <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition">
                <div className="aspect-[2/1] bg-gradient-to-br from-blue-500 to-purple-700 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <TrendingUp className="w-16 h-16 mx-auto mb-2 opacity-50" />
                      <p className="text-lg opacity-75">Fiscalitate 2026</p>
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Articol recomandat
                    </span>
                    {featuredPost.aiGenerated && (
                      <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">{featuredPost.category}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {featuredPost.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {featuredPost.readTime}
                    </span>
                    <span className="text-slate-400">{featuredPost.views.toLocaleString()} vizualizări</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-3 hover:text-blue-600 transition cursor-pointer">
                    {featuredPost.title}
                  </h2>
                  <p className="text-slate-600 mb-4">{featuredPost.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        {featuredPost.aiGenerated ? (
                          <Sparkles className="w-4 h-4 text-purple-600" />
                        ) : (
                          <User className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                      <span className="text-sm text-slate-600">{featuredPost.author}</span>
                    </div>
                    <div className="flex gap-2">
                      {featuredPost.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* Results count */}
            <div className="text-sm text-slate-500">
              {filteredPosts.length} articole găsite
              {searchQuery && ` pentru "${searchQuery}"`}
              {selectedCategory !== 'Toate' && ` în ${selectedCategory}`}
            </div>

            {/* Regular Posts Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition cursor-pointer group"
                >
                  <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-12 h-12 text-slate-300 group-hover:text-blue-300 transition" />
                    </div>
                    {post.aiGenerated && (
                      <span className="absolute top-2 right-2 bg-purple-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">{post.category}</span>
                      <span>{post.date}</span>
                      <span>{post.views.toLocaleString()} vizualizări</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        {post.aiGenerated ? (
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {post.author}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nu am găsit articole care să corespundă căutării.</p>
              </div>
            )}

            {/* Load More */}
            {filteredPosts.length > 0 && (
              <div className="text-center">
                <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition">
                  Încarcă mai multe articole
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Categories */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Categorii</h3>
              <ul className="space-y-1">
                {categories.map((cat) => (
                  <li key={cat.name}>
                    <button
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition ${
                        selectedCategory === cat.name
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-sm">{cat.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2026 Highlights */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-5 text-white">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Focus 2026
              </h3>
              <ul className="space-y-2 text-sm text-blue-100">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full" />
                  Dividende 16% (Ian 2026)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  e-Factura B2B obligatorie
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-pink-400 rounded-full" />
                  SAF-T D406 pilot
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-400 rounded-full" />
                  GenAI 40% adopție
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-2">Newsletter</h3>
              <p className="text-slate-500 text-sm mb-4">
                Primește cele mai noi articole și alerte fiscale direct în inbox.
              </p>
              <input
                type="email"
                placeholder="Email-ul tău"
                className="w-full px-4 py-2 border rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
              />
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                Abonează-te
              </button>
            </div>

            {/* Popular Tags */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Tag-uri populare</h3>
              <div className="flex flex-wrap gap-2">
                {['dividende', 'e-factura', 'TVA', 'SAF-T', 'PNRR', 'GenAI', 'HR', 'wellness', 'ATS', '2026', 'ANAF', 'digitalizare'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm hover:bg-blue-100 hover:text-blue-600 transition"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* RSS Feed */}
            <Link
              href="/blog/rss"
              className="flex items-center justify-center gap-2 w-full py-3 bg-orange-50 text-orange-600 rounded-xl font-medium hover:bg-orange-100 transition"
            >
              <Rss className="w-5 h-5" />
              Abonare RSS Feed
            </Link>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600">
          <p>© 2025 DocumentIulia. Toate drepturile rezervate.</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/privacy" className="hover:text-blue-600">Confidențialitate</Link>
            <Link href="/terms" className="hover:text-blue-600">Termeni</Link>
            <Link href="/help" className="hover:text-blue-600">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
