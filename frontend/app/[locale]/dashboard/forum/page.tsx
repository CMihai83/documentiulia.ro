'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  Eye,
  Clock,
  Pin,
  Search,
  Filter,
  Plus,
  TrendingUp,
  MessageCircle,
  ThumbsUp,
  Share2,
  Bookmark,
  ChevronRight,
  RefreshCw,
  Tag,
  Star,
  Award,
  Flame,
  HelpCircle,
  Briefcase,
  Calculator,
  FileText,
  Scale,
  Globe,
  Settings,
  Bell,
} from 'lucide-react';

// Types
interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  threadCount: number;
  postCount: number;
  isActive: boolean;
}

interface ForumThread {
  id: string;
  title: string;
  slug: string;
  content: string;
  authorName: string;
  authorAvatar?: string;
  category: ForumCategory;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  isPinned: boolean;
  isLocked: boolean;
  isSolved: boolean;
  tags: string[];
  createdAt: string;
  lastReplyAt?: string;
}

interface ForumStats {
  totalThreads: number;
  totalPosts: number;
  totalUsers: number;
  onlineUsers: number;
  todayThreads: number;
  todayPosts: number;
}

type ViewType = 'threads' | 'categories' | 'popular' | 'unanswered';

const getCategoryIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    calculator: Calculator,
    briefcase: Briefcase,
    scale: Scale,
    fileText: FileText,
    helpCircle: HelpCircle,
    globe: Globe,
    settings: Settings,
    trendingUp: TrendingUp,
  };
  const IconComponent = icons[iconName] || MessageSquare;
  return IconComponent;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Acum';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}z`;
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
};

export default function ForumPage() {
  const [view, setView] = useState<ViewType>('threads');
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [stats, setStats] = useState<ForumStats | null>(null);
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
      const categoriesRes = await fetch('/api/forum/categories', { headers });
      if (categoriesRes.ok) {
        setCategories(await categoriesRes.json());
      }

      // Fetch threads
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      params.append('limit', '20');

      const threadsRes = await fetch(`/api/forum/threads?${params}`, { headers });
      if (threadsRes.ok) {
        setThreads(await threadsRes.json());
      }
    } catch (error) {
      console.error('Error fetching forum data:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setCategories(getMockCategories());
    setThreads(getMockThreads());
    setStats(getMockStats());
  };

  const getMockCategories = (): ForumCategory[] => [
    { id: '1', name: 'Contabilitate & Fiscalitate', slug: 'contabilitate', description: 'Discutii despre contabilitate, TVA, declaratii fiscale', icon: 'calculator', color: 'blue', threadCount: 156, postCount: 892, isActive: true },
    { id: '2', name: 'Resurse Umane & Salarizare', slug: 'hr-salarizare', description: 'Intrebari despre HR, contracte, salarii, REVISAL', icon: 'briefcase', color: 'green', threadCount: 98, postCount: 456, isActive: true },
    { id: '3', name: 'Legislatie & Conformitate', slug: 'legislatie', description: 'Actualizari legislative, ANAF, conformitate', icon: 'scale', color: 'purple', threadCount: 234, postCount: 1205, isActive: true },
    { id: '4', name: 'e-Factura & SAF-T D406', slug: 'efactura-saft', description: 'Implementare e-Factura, SAF-T, SPV', icon: 'fileText', color: 'orange', threadCount: 312, postCount: 1567, isActive: true },
    { id: '5', name: 'Intrebari Generale', slug: 'general', description: 'Intrebari generale despre platforma si functionalitati', icon: 'helpCircle', color: 'gray', threadCount: 78, postCount: 234, isActive: true },
    { id: '6', name: 'Fonduri & Finantari', slug: 'fonduri', description: 'Discutii despre PNRR, fonduri europene, Start-Up Nation', icon: 'trendingUp', color: 'emerald', threadCount: 45, postCount: 189, isActive: true },
  ];

  const getMockThreads = (): ForumThread[] => [
    {
      id: '1',
      title: 'Cum completez corect declaratia D406 pentru luna ianuarie 2025?',
      slug: 'd406-ianuarie-2025',
      content: 'Buna ziua, am cateva intrebari despre completarea declaratiei D406...',
      authorName: 'Maria Ionescu',
      category: getMockCategories()[3],
      viewCount: 1234,
      replyCount: 23,
      likeCount: 45,
      isPinned: true,
      isLocked: false,
      isSolved: true,
      tags: ['D406', 'SAF-T', 'ANAF'],
      createdAt: '2024-12-10T14:30:00Z',
      lastReplyAt: '2024-12-11T08:15:00Z',
    },
    {
      id: '2',
      title: 'Noile rate TVA din august 2025 - ce trebuie sa stim?',
      slug: 'tva-august-2025',
      content: 'Conform Legii 141/2025, cotele de TVA se modifica...',
      authorName: 'Ion Popescu',
      category: getMockCategories()[0],
      viewCount: 2567,
      replyCount: 56,
      likeCount: 89,
      isPinned: true,
      isLocked: false,
      isSolved: false,
      tags: ['TVA', 'Legea 141', '2025'],
      createdAt: '2024-12-09T10:00:00Z',
      lastReplyAt: '2024-12-11T09:30:00Z',
    },
    {
      id: '3',
      title: 'Probleme cu integrarea SAGA v3.2 - eroare la sincronizare',
      slug: 'saga-eroare-sincronizare',
      content: 'Am incercat sa sincronizez facturile cu SAGA dar primesc eroare...',
      authorName: 'Andrei Vasilescu',
      category: getMockCategories()[4],
      viewCount: 456,
      replyCount: 12,
      likeCount: 8,
      isPinned: false,
      isLocked: false,
      isSolved: true,
      tags: ['SAGA', 'Integrare', 'Eroare'],
      createdAt: '2024-12-11T07:45:00Z',
      lastReplyAt: '2024-12-11T10:20:00Z',
    },
    {
      id: '4',
      title: 'Cum calculez corect contributiile pentru contracte part-time?',
      slug: 'contributii-part-time',
      content: 'Am angajat recent pe cineva part-time si nu sunt sigur cum calculez...',
      authorName: 'Elena Dumitrescu',
      category: getMockCategories()[1],
      viewCount: 789,
      replyCount: 18,
      likeCount: 34,
      isPinned: false,
      isLocked: false,
      isSolved: true,
      tags: ['Contributii', 'Part-time', 'Salarizare'],
      createdAt: '2024-12-10T16:20:00Z',
      lastReplyAt: '2024-12-11T11:00:00Z',
    },
    {
      id: '5',
      title: 'PNRR 2025 - noi finantari pentru digitalizare IMM',
      slug: 'pnrr-digitalizare-2025',
      content: 'S-a lansat o noua sesiune de finantari PNRR pentru digitalizare...',
      authorName: 'Mihai Stanescu',
      category: getMockCategories()[5],
      viewCount: 1890,
      replyCount: 42,
      likeCount: 78,
      isPinned: false,
      isLocked: false,
      isSolved: false,
      tags: ['PNRR', 'Digitalizare', 'Finantare'],
      createdAt: '2024-12-08T09:00:00Z',
      lastReplyAt: '2024-12-11T07:45:00Z',
    },
    {
      id: '6',
      title: 'Actualizare OUG privind termenele e-Factura B2B',
      slug: 'oug-efactura-b2b',
      content: 'Guvernul a emis o noua OUG care modifica termenele pentru e-Factura B2B...',
      authorName: 'Admin',
      category: getMockCategories()[2],
      viewCount: 3456,
      replyCount: 89,
      likeCount: 156,
      isPinned: true,
      isLocked: false,
      isSolved: false,
      tags: ['e-Factura', 'B2B', 'OUG', 'Legislatie'],
      createdAt: '2024-12-07T11:30:00Z',
      lastReplyAt: '2024-12-11T10:45:00Z',
    },
  ];

  const getMockStats = (): ForumStats => ({
    totalThreads: 923,
    totalPosts: 4543,
    totalUsers: 2156,
    onlineUsers: 78,
    todayThreads: 12,
    todayPosts: 89,
  });

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thread.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || thread.category.slug === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedThreads = [...filteredThreads].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-72"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Forum Comunitate</h1>
          <p className="text-gray-600">Discutii, intrebari si raspunsuri despre contabilitate si afaceri</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Subiect Nou
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <MessageSquare className="w-4 h-4" />
              Subiecte
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalThreads.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <MessageCircle className="w-4 h-4" />
              Postari
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalPosts.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Users className="w-4 h-4" />
              Membri
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
              <Users className="w-4 h-4" />
              Online
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.onlineUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
              <Flame className="w-4 h-4" />
              Azi
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.todayThreads}</p>
            <p className="text-xs text-gray-500">subiecte noi</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-purple-500 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Activitate
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.todayPosts}</p>
            <p className="text-xs text-gray-500">postari azi</p>
          </div>
        </div>
      )}

      {/* View Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setView('threads')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'threads' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toate Subiectele
          </button>
          <button
            onClick={() => setView('categories')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'categories' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Categorii
          </button>
          <button
            onClick={() => setView('popular')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'popular' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Populare
          </button>
          <button
            onClick={() => setView('unanswered')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'unanswered' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Fara Raspuns
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cauta subiecte..."
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

      {/* Content */}
      {view === 'categories' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const IconComponent = getCategoryIcon(category.icon);
            const colorClasses: Record<string, string> = {
              blue: 'bg-blue-100 text-blue-600',
              green: 'bg-green-100 text-green-600',
              purple: 'bg-purple-100 text-purple-600',
              orange: 'bg-orange-100 text-orange-600',
              gray: 'bg-gray-100 text-gray-600',
              emerald: 'bg-emerald-100 text-emerald-600',
            };
            return (
              <div
                key={category.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedCategory(category.slug);
                  setView('threads');
                }}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${colorClasses[category.color] || 'bg-gray-100 text-gray-600'}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {category.threadCount} subiecte
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {category.postCount} postari
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedThreads.map((thread) => (
            <div
              key={thread.id}
              className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${
                thread.isPinned ? 'border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {thread.authorName.charAt(0)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {thread.isPinned && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          <Pin className="w-3 h-3" />
                          Fixat
                        </span>
                      )}
                      {thread.isSolved && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          <Award className="w-3 h-3" />
                          Rezolvat
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {thread.category.name}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 mt-1 hover:text-blue-600 cursor-pointer">
                      {thread.title}
                    </h3>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {thread.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded border border-gray-200"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span>{thread.authorName}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(thread.createdAt)}
                      </span>
                      {thread.lastReplyAt && (
                        <span className="text-xs">
                          Ultim raspuns: {formatDate(thread.lastReplyAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1" title="Vizualizari">
                        <Eye className="w-4 h-4" />
                        {thread.viewCount.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1" title="Raspunsuri">
                        <MessageCircle className="w-4 h-4" />
                        {thread.replyCount}
                      </span>
                      <span className="flex items-center gap-1" title="Aprecieri">
                        <ThumbsUp className="w-4 h-4" />
                        {thread.likeCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
                    <ThumbsUp className="w-4 h-4" />
                    Apreciez
                  </button>
                  <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
                    <Share2 className="w-4 h-4" />
                    Distribuie
                  </button>
                  <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
                    <Bookmark className="w-4 h-4" />
                    Salveaza
                  </button>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Citeste mai mult
                </button>
              </div>
            </div>
          ))}

          {sortedThreads.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Niciun subiect gasit</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Incearca alte cuvinte cheie' : 'Fii primul care incepe o discutie!'}
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Creeaza Subiect Nou
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sidebar - Popular Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Already showing main content above */}
        </div>
        <div className="space-y-6">
          {/* Top Contributors */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Top Contributori
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { name: 'Maria Ionescu', posts: 234, badge: 'Expert Contabil' },
                { name: 'Ion Popescu', posts: 189, badge: 'Consultant Fiscal' },
                { name: 'Elena Dumitrescu', posts: 156, badge: 'HR Specialist' },
                { name: 'Andrei Vasilescu', posts: 123, badge: 'IT Expert' },
                { name: 'Mihai Stanescu', posts: 98, badge: 'Fonduri Expert' },
              ].map((user, index) => (
                <div key={user.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.badge}</p>
                  </div>
                  <span className="text-sm text-gray-500">{user.posts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Tags */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Tag-uri Populare
              </h3>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {['TVA', 'e-Factura', 'D406', 'SAF-T', 'ANAF', 'Salarizare', 'Contributii', 'PNRR', 'Legislatie', 'SAGA'].map((tag) => (
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

          {/* Forum Rules */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Reguli Forum</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>- Fii respectuos cu ceilalti membri</li>
              <li>- Verifica daca subiectul exista inainte de a posta</li>
              <li>- Foloseste tag-uri relevante</li>
              <li>- Marcheaza subiectul rezolvat daca ai primit raspuns</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
