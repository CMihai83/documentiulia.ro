'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  Eye,
  Search,
  Filter,
  Tag,
  ChevronRight,
  RefreshCw,
  User,
  Share2,
  Bookmark,
  ThumbsUp,
  MessageCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  Globe,
  Briefcase,
  Scale,
  Calculator,
  Award,
  Zap,
  Star,
  Heart,
} from 'lucide-react';

// Types
interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  articleCount: number;
  isActive: boolean;
}

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  coverImage?: string;
  authorName: string;
  authorAvatar?: string;
  authorTitle?: string;
  category: BlogCategory;
  tags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  readingTime: number;
  isFeatured: boolean;
  publishedAt: string;
}

interface BlogStats {
  totalArticles: number;
  totalViews: number;
  totalAuthors: number;
  thisMonthArticles: number;
}

type ViewType = 'all' | 'featured' | 'recent' | 'popular';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const getCategoryColor = (color: string): string => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  };
  return colors[color] || 'bg-gray-100 text-gray-700';
};

export default function BlogPage() {
  const [view, setView] = useState<ViewType>('all');
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [view, selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch categories
      const categoriesRes = await fetch('/api/blog/categories', { headers });
      if (categoriesRes.ok) {
        setCategories(await categoriesRes.json());
      }

      // Fetch articles
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      params.append('limit', '20');

      const articlesRes = await fetch(`/api/blog/articles?${params}`, { headers });
      if (articlesRes.ok) {
        setArticles(await articlesRes.json());
      }
    } catch (error) {
      console.error('Error fetching blog data:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setCategories(getMockCategories());
    setArticles(getMockArticles());
    setStats(getMockStats());
  };

  const getMockCategories = (): BlogCategory[] => [
    { id: '1', name: 'Legislatie & Conformitate', slug: 'legislatie', description: 'Actualizari legislative si conformitate', color: 'purple', articleCount: 45, isActive: true },
    { id: '2', name: 'Contabilitate', slug: 'contabilitate', description: 'Sfaturi si ghiduri de contabilitate', color: 'blue', articleCount: 38, isActive: true },
    { id: '3', name: 'Fiscalitate', slug: 'fiscalitate', description: 'Noutati fiscale si TVA', color: 'green', articleCount: 52, isActive: true },
    { id: '4', name: 'HR & Salarizare', slug: 'hr-salarizare', description: 'Resurse umane si managementul salariilor', color: 'orange', articleCount: 29, isActive: true },
    { id: '5', name: 'Fonduri Europene', slug: 'fonduri', description: 'PNRR, fonduri structurale, finantari', color: 'emerald', articleCount: 23, isActive: true },
    { id: '6', name: 'Digitalizare', slug: 'digitalizare', description: 'Transformare digitala in afaceri', color: 'indigo', articleCount: 31, isActive: true },
  ];

  const getMockArticles = (): BlogArticle[] => [
    {
      id: '1',
      title: 'Ghid Complet: Noile Cote TVA din August 2025 conform Legii 141/2025',
      slug: 'ghid-tva-august-2025',
      excerpt: 'Tot ce trebuie sa stii despre modificarile cotelor de TVA care intra in vigoare in august 2025. Cota standard ramane 19%, dar apar modificari importante pentru anumite categorii de bunuri si servicii.',
      authorName: 'Maria Ionescu',
      authorTitle: 'Expert Contabil',
      category: getMockCategories()[2],
      tags: ['TVA', 'Legea 141', 'Fiscalitate', '2025'],
      viewCount: 12456,
      likeCount: 234,
      commentCount: 45,
      readingTime: 12,
      isFeatured: true,
      publishedAt: '2024-12-10T10:00:00Z',
    },
    {
      id: '2',
      title: 'e-Factura B2B: Termen Extins - Ce Trebuie Sa Stie Companiile',
      slug: 'efactura-b2b-termen-extins',
      excerpt: 'Guvernul a extins termenul pentru implementarea obligatorie a e-Factura B2B. Afla ce inseamna acest lucru pentru afacerea ta si cum te poti pregati.',
      authorName: 'Ion Popescu',
      authorTitle: 'Consultant Fiscal',
      category: getMockCategories()[0],
      tags: ['e-Factura', 'B2B', 'ANAF', 'SPV'],
      viewCount: 8923,
      likeCount: 178,
      commentCount: 32,
      readingTime: 8,
      isFeatured: true,
      publishedAt: '2024-12-09T14:30:00Z',
    },
    {
      id: '3',
      title: 'SAF-T D406: Declaratia Lunara Obligatorie din Ianuarie 2025',
      slug: 'saft-d406-ianuarie-2025',
      excerpt: 'Incepand cu ianuarie 2025, declaratia SAF-T D406 devine lunara pentru toate companiile. Uite cum te pregatesti si ce schimbari aduce.',
      authorName: 'Andrei Vasilescu',
      authorTitle: 'IT Consultant',
      category: getMockCategories()[5],
      tags: ['SAF-T', 'D406', 'ANAF', 'Digitalizare'],
      viewCount: 7654,
      likeCount: 145,
      commentCount: 28,
      readingTime: 10,
      isFeatured: false,
      publishedAt: '2024-12-08T09:00:00Z',
    },
    {
      id: '4',
      title: 'PNRR 2025: Noi Finantari pentru Digitalizare IMM-uri',
      slug: 'pnrr-digitalizare-imm-2025',
      excerpt: 'O noua sesiune de finantari PNRR pentru digitalizarea IMM-urilor se deschide in 2025. Afla criteriile de eligibilitate si cum poti aplica.',
      authorName: 'Elena Dumitrescu',
      authorTitle: 'Consultant Fonduri',
      category: getMockCategories()[4],
      tags: ['PNRR', 'IMM', 'Finantare', 'Digitalizare'],
      viewCount: 6234,
      likeCount: 156,
      commentCount: 41,
      readingTime: 15,
      isFeatured: true,
      publishedAt: '2024-12-07T11:00:00Z',
    },
    {
      id: '5',
      title: 'Contributii Sociale 2025: Ce Se Schimba pentru Angajatori',
      slug: 'contributii-sociale-2025',
      excerpt: 'Modificarile aduse contributiilor sociale pentru anul 2025 si impactul lor asupra costurilor salariale.',
      authorName: 'Mihai Stanescu',
      authorTitle: 'Expert HR',
      category: getMockCategories()[3],
      tags: ['Contributii', 'CAS', 'CASS', 'Salarizare'],
      viewCount: 5678,
      likeCount: 98,
      commentCount: 23,
      readingTime: 7,
      isFeatured: false,
      publishedAt: '2024-12-06T15:00:00Z',
    },
    {
      id: '6',
      title: 'Cum Sa Implementezi Corect SAGA v3.2 in Compania Ta',
      slug: 'implementare-saga-v32',
      excerpt: 'Ghid practic pentru implementarea sistemului SAGA v3.2 pentru gestiunea contabila si fiscala.',
      authorName: 'Andrei Vasilescu',
      authorTitle: 'IT Consultant',
      category: getMockCategories()[5],
      tags: ['SAGA', 'Implementare', 'Software', 'Contabilitate'],
      viewCount: 4321,
      likeCount: 87,
      commentCount: 19,
      readingTime: 20,
      isFeatured: false,
      publishedAt: '2024-12-05T10:30:00Z',
    },
    {
      id: '7',
      title: 'Inchiderea Exercitiului Financiar 2024: Checklist Complet',
      slug: 'inchidere-exercitiu-2024',
      excerpt: 'Lista completa de verificari pentru inchiderea corecta a exercitiului financiar 2024.',
      authorName: 'Maria Ionescu',
      authorTitle: 'Expert Contabil',
      category: getMockCategories()[1],
      tags: ['Bilant', 'Inchidere An', 'Contabilitate'],
      viewCount: 9876,
      likeCount: 234,
      commentCount: 56,
      readingTime: 25,
      isFeatured: true,
      publishedAt: '2024-12-04T08:00:00Z',
    },
    {
      id: '8',
      title: 'REVISAL 2025: Noile Obligatii de Raportare',
      slug: 'revisal-2025-obligatii',
      excerpt: 'Ce modificari aduce anul 2025 pentru raportarea REVISAL si cum sa te conformezi.',
      authorName: 'Elena Dumitrescu',
      authorTitle: 'Expert HR',
      category: getMockCategories()[3],
      tags: ['REVISAL', 'HR', 'Raportare', 'ITM'],
      viewCount: 3456,
      likeCount: 67,
      commentCount: 15,
      readingTime: 6,
      isFeatured: false,
      publishedAt: '2024-12-03T12:00:00Z',
    },
  ];

  const getMockStats = (): BlogStats => ({
    totalArticles: 218,
    totalViews: 456789,
    totalAuthors: 15,
    thisMonthArticles: 23,
  });

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || article.category.slug === selectedCategory;
    const matchesView = view === 'all' ||
                       (view === 'featured' && article.isFeatured) ||
                       (view === 'recent') ||
                       (view === 'popular');
    return matchesSearch && matchesCategory && matchesView;
  });

  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (view === 'popular') {
      return b.viewCount - a.viewCount;
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const featuredArticles = articles.filter(a => a.isFeatured).slice(0, 3);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog & Articole</h1>
          <p className="text-gray-600">Noutati, ghiduri si analize pentru afaceri</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <FileText className="w-4 h-4" />
              Articole
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalArticles}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Eye className="w-4 h-4" />
              Vizualizari
            </div>
            <p className="text-2xl font-bold text-gray-900">{(stats.totalViews / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <User className="w-4 h-4" />
              Autori
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalAuthors}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Luna aceasta
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.thisMonthArticles}</p>
          </div>
        </div>
      )}

      {/* Featured Articles */}
      {view === 'all' && featuredArticles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Articole Recomandate
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(article.category.color)}`}>
                      {article.category.name}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-bold text-lg line-clamp-2">{article.title}</h3>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">{article.excerpt}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs">
                        {article.authorName.charAt(0)}
                      </div>
                      <span>{article.authorName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{article.readingTime} min</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toate
          </button>
          <button
            onClick={() => setView('featured')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'featured' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Recomandate
          </button>
          <button
            onClick={() => setView('recent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'recent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Recente
          </button>
          <button
            onClick={() => setView('popular')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'popular' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Populare
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cauta articole..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toate Categoriile</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {sortedArticles.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(article.category.color)}`}>
                    {article.category.name}
                  </span>
                  {article.isFeatured && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                      <Star className="w-3 h-3" />
                      Recomandat
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600">
                  {article.title}
                </h3>

                <p className="text-gray-600 mb-4 line-clamp-2">
                  {article.excerpt}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {article.authorName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{article.authorName}</p>
                      {article.authorTitle && (
                        <p className="text-xs text-gray-500">{article.authorTitle}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(article.publishedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {article.readingTime} min
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {article.viewCount.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {article.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {article.commentCount}
                    </span>
                  </div>
                  <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Citeste mai mult
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {sortedArticles.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Niciun articol gasit</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Incearca alte cuvinte cheie' : 'Nu exista articole in aceasta categorie'}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Categories */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Categorii</h3>
            </div>
            <div className="p-4 space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.slug)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left ${
                    selectedCategory === category.slug
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="font-medium">{category.name}</span>
                  <span className="text-sm text-gray-500">{category.articleCount}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Tags */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tag-uri Populare
              </h3>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {['TVA', 'e-Factura', 'D406', 'SAF-T', 'ANAF', 'PNRR', 'Salarizare', 'Legislatie', 'Contabilitate', 'HR'].map((tag) => (
                  <button
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-blue-100 hover:text-blue-700"
                    onClick={() => setSearchTerm(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <h3 className="font-semibold text-lg mb-2">Aboneaza-te la Newsletter</h3>
            <p className="text-blue-100 text-sm mb-4">
              Primeste cele mai noi articole si actualizari direct in inbox.
            </p>
            <input
              type="email"
              placeholder="Email-ul tau..."
              className="w-full px-4 py-2 rounded-lg text-gray-900 mb-3"
            />
            <button className="w-full px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50">
              Aboneaza-te
            </button>
          </div>

          {/* Top Authors */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-500" />
                Autori Populari
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { name: 'Maria Ionescu', title: 'Expert Contabil', articles: 34 },
                { name: 'Ion Popescu', title: 'Consultant Fiscal', articles: 28 },
                { name: 'Andrei Vasilescu', title: 'IT Consultant', articles: 22 },
                { name: 'Elena Dumitrescu', title: 'Consultant Fonduri', articles: 18 },
              ].map((author) => (
                <div key={author.name} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {author.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{author.name}</p>
                    <p className="text-xs text-gray-500">{author.title}</p>
                  </div>
                  <span className="text-sm text-gray-500">{author.articles} art.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
