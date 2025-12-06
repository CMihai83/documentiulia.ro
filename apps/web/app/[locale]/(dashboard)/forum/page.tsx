'use client';

/**
 * Forum Page - SMB Renaissance Community Hub
 * Symphony for Romanian SMB knowledge sharing with AI moderation
 * Working buttons, dynamic threads, infinite scroll
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Users,
  Eye,
  Clock,
  Search,
  Plus,
  TrendingUp,
  Tag,
  ThumbsUp,
  MessageCircle,
  Filter,
  ChevronRight,
  Pin,
  Award,
  BookOpen,
  HelpCircle,
  Briefcase,
  Calculator,
  X,
  Send,
  Loader2,
  RefreshCw,
  EuroIcon,
  UserCheck,
} from 'lucide-react';

interface ForumTopic {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: {
    name: string;
    avatar: string;
    role: 'user' | 'expert' | 'admin';
  };
  replies: number;
  views: number;
  likes: number;
  lastReply: {
    author: string;
    date: Date;
  };
  createdAt: Date;
  isPinned?: boolean;
  isResolved?: boolean;
  tags: string[];
}

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  topicsCount: number;
  postsCount: number;
}

const categories: ForumCategory[] = [
  {
    id: 'general',
    name: 'Discutii Generale',
    description: 'Conversatii despre contabilitate si business',
    icon: MessageSquare,
    color: 'bg-blue-500',
    topicsCount: 234,
    postsCount: 1456,
  },
  {
    id: 'fiscal',
    name: 'Intrebari Fiscale',
    description: 'TVA 21%/11%, dividende 16%, declaratii 2026',
    icon: Calculator,
    color: 'bg-purple-500',
    topicsCount: 567,
    postsCount: 3421,
  },
  {
    id: 'hr',
    name: 'HR & Recrutare',
    description: 'ATS, performanta, wellness, Codul Muncii',
    icon: UserCheck,
    color: 'bg-pink-500',
    topicsCount: 189,
    postsCount: 876,
  },
  {
    id: 'funds',
    name: 'Fonduri Europene',
    description: 'PNRR, Coeziune, InvestEU, granturi SMB',
    icon: EuroIcon,
    color: 'bg-yellow-500',
    topicsCount: 145,
    postsCount: 654,
  },
  {
    id: 'software',
    name: 'Ajutor Software',
    description: 'Intrebari despre DocumentIulia',
    icon: HelpCircle,
    color: 'bg-green-500',
    topicsCount: 189,
    postsCount: 876,
  },
  {
    id: 'business',
    name: 'Sfaturi Business',
    description: 'Strategii, finantare si dezvoltare afaceri',
    icon: Briefcase,
    color: 'bg-orange-500',
    topicsCount: 312,
    postsCount: 1987,
  },
];

// Seeded topics with 2026 fiscal, HR, and EU funds content
const seedTopics: ForumTopic[] = [
  // Fiscal 2026 topics
  {
    id: '1',
    title: 'TVA 21% din august 2025 - Cum va afectam fluxul de numerar?',
    excerpt: 'Legea 141/2025 aduce TVA 21% standard si 11% redus. Cum ne pregatim pentru impactul asupra cash flow-ului?',
    category: 'fiscal',
    author: { name: 'Maria P.', avatar: 'MP', role: 'expert' },
    replies: 45,
    views: 1234,
    likes: 89,
    lastReply: { author: 'Expert Fiscal', date: new Date(Date.now() - 3600000) },
    createdAt: new Date(Date.now() - 86400000 * 2),
    isPinned: true,
    tags: ['TVA', '21%', 'Legea 141/2025', '2026'],
  },
  {
    id: '2',
    title: 'Dividende 16% din ianuarie 2026 - Strategii de planificare',
    excerpt: 'Impozitul pe dividende creste de la 8% la 16%. Ce strategii legale putem folosi pentru distribuirea in 2025?',
    category: 'fiscal',
    author: { name: 'Ion D.', avatar: 'ID', role: 'user' },
    replies: 32,
    views: 890,
    likes: 56,
    lastReply: { author: 'Consultant Tax', date: new Date(Date.now() - 7200000) },
    createdAt: new Date(Date.now() - 86400000),
    isPinned: true,
    tags: ['dividende', '16%', 'planificare fiscala', '2026'],
  },
  {
    id: '3',
    title: 'SAF-T D406 - Experienta primului raport',
    excerpt: 'Am finalizat primul raport SAF-T. Impartasesc erorile frecvente si cum le-am rezolvat...',
    category: 'fiscal',
    author: { name: 'Andrei M.', avatar: 'AM', role: 'user' },
    replies: 28,
    views: 567,
    likes: 34,
    lastReply: { author: 'IT Specialist', date: new Date(Date.now() - 14400000) },
    createdAt: new Date(Date.now() - 86400000 * 3),
    isResolved: true,
    tags: ['SAF-T', 'D406', 'raportare', 'XML'],
  },
  // HR topics
  {
    id: '4',
    title: 'AI ATS pentru recrutare - Ce solutii folositi?',
    excerpt: 'Cautam un sistem ATS cu matching AI bias-free. Ce experienta aveti cu solutiile de pe piata?',
    category: 'hr',
    author: { name: 'Elena C.', avatar: 'EC', role: 'user' },
    replies: 19,
    views: 345,
    likes: 23,
    lastReply: { author: 'HR Manager', date: new Date(Date.now() - 28800000) },
    createdAt: new Date(Date.now() - 86400000 * 4),
    tags: ['ATS', 'recrutare', 'AI', 'bias-free'],
  },
  {
    id: '5',
    title: 'Wellness angajati - Prevenirea burnout-ului',
    excerpt: 'Cum implementati programe de wellness? Suntem interesati de sondaje si analytics pentru detectia timpurie...',
    category: 'hr',
    author: { name: 'Radu T.', avatar: 'RT', role: 'expert' },
    replies: 15,
    views: 289,
    likes: 31,
    lastReply: { author: 'Wellness Consultant', date: new Date(Date.now() - 43200000) },
    createdAt: new Date(Date.now() - 86400000 * 5),
    tags: ['wellness', 'burnout', 'HR analytics'],
  },
  {
    id: '6',
    title: 'Codul Muncii 2025 - Noutati telemunca',
    excerpt: 'Ce modificari aduce noul cadru legal pentru telemunca? Obligatii noi pentru angajatori...',
    category: 'hr',
    author: { name: 'Ana B.', avatar: 'AB', role: 'user' },
    replies: 22,
    views: 456,
    likes: 28,
    lastReply: { author: 'Avocat Muncii', date: new Date(Date.now() - 57600000) },
    createdAt: new Date(Date.now() - 86400000 * 6),
    tags: ['Codul Muncii', 'telemunca', 'legislatie'],
  },
  // EU Funds topics
  {
    id: '7',
    title: 'PNRR Digitalizare IMM - Ultimul apel deschis',
    excerpt: 'Granturi de pana la 100.000 EUR pentru digitalizare. Ce documente sunt necesare si care e timeline-ul?',
    category: 'funds',
    author: { name: 'Cristian V.', avatar: 'CV', role: 'expert' },
    replies: 67,
    views: 2345,
    likes: 156,
    lastReply: { author: 'Consultant Fonduri', date: new Date(Date.now() - 1800000) },
    createdAt: new Date(Date.now() - 86400000 * 7),
    isPinned: true,
    tags: ['PNRR', 'digitalizare', 'granturi', '100k EUR'],
  },
  {
    id: '8',
    title: 'InvestEU Voucher 50k - Experienta aplicatie',
    excerpt: 'Am obtinut voucher InvestEU pentru studiu fezabilitate. Impartasesc procesul si sfaturi...',
    category: 'funds',
    author: { name: 'Diana M.', avatar: 'DM', role: 'user' },
    replies: 34,
    views: 678,
    likes: 45,
    lastReply: { author: 'Aplicant Success', date: new Date(Date.now() - 72000000) },
    createdAt: new Date(Date.now() - 86400000 * 8),
    isResolved: true,
    tags: ['InvestEU', 'voucher', '50k', 'inovare'],
  },
  {
    id: '9',
    title: 'Coeziune 2021-2027 - Ce programe raman active?',
    excerpt: 'Cu deadline-ul PNRR in august 2026, ce optiuni avem din fondurile de coeziune pentru IMM-uri?',
    category: 'funds',
    author: { name: 'George P.', avatar: 'GP', role: 'user' },
    replies: 21,
    views: 432,
    likes: 29,
    lastReply: { author: 'Expert Coeziune', date: new Date(Date.now() - 86400000) },
    createdAt: new Date(Date.now() - 86400000 * 9),
    tags: ['Coeziune', '2027', 'IMM', 'granturi'],
  },
  // Software & General topics
  {
    id: '10',
    title: 'e-Factura B2B obligatorie mid-2026 - Pregatirea sistemelor',
    excerpt: 'Extinderea e-Factura pentru B2B vine in 2026. Cum ne pregatim integrarea cu sistemele existente?',
    category: 'software',
    author: { name: 'Mihai I.', avatar: 'MI', role: 'admin' },
    replies: 38,
    views: 891,
    likes: 67,
    lastReply: { author: 'Dev Lead', date: new Date(Date.now() - 10800000) },
    createdAt: new Date(Date.now() - 86400000 * 10),
    tags: ['e-Factura', 'B2B', 'API', 'integrare'],
  },
];

// New Topic Modal Component
function NewTopicModal({
  isOpen,
  onClose,
  onSubmit
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; category: string; tags: string[] }) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    onSubmit({ title, content, category, tags });
    setIsSubmitting(false);
    setTitle('');
    setContent('');
    setTagsInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-10"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Subiect Nou</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Titlu</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titlul subiectului tau..."
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Continut</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descrie subiectul in detaliu..."
              rows={6}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tag-uri (separate prin virgula)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="TVA, fiscal, 2026..."
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Anuleaza
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Se publica...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publica
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function ForumPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [topics, setTopics] = useState<ForumTopic[]>(seedTopics);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isNewTopicOpen, setIsNewTopicOpen] = useState(false);

  const filteredTopics = topics
    .filter(topic =>
      (selectedCategory === 'all' || topic.category === selectedCategory) &&
      (searchQuery === '' ||
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (sortBy === 'popular') return b.views - a.views;
      if (sortBy === 'trending') return b.replies - a.replies;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'acum cateva secunde';
    if (seconds < 3600) return `acum ${Math.floor(seconds / 60)} minute`;
    if (seconds < 86400) return `acum ${Math.floor(seconds / 3600)} ore`;
    if (seconds < 604800) return `acum ${Math.floor(seconds / 86400)} zile`;
    return date.toLocaleDateString('ro-RO');
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  // Load more topics (simulated infinite scroll)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate more topics
    const newTopics: ForumTopic[] = Array.from({ length: 5 }, (_, i) => ({
      id: `loaded-${page}-${i}`,
      title: `Subiect incarcat dinamic #${page * 5 + i + 1}`,
      excerpt: 'Acesta este un subiect incarcat prin infinite scroll pentru demonstratie...',
      category: categories[Math.floor(Math.random() * categories.length)].id,
      author: {
        name: `User ${Math.floor(Math.random() * 100)}`,
        avatar: 'U' + Math.floor(Math.random() * 10),
        role: 'user' as const
      },
      replies: Math.floor(Math.random() * 50),
      views: Math.floor(Math.random() * 500),
      likes: Math.floor(Math.random() * 30),
      lastReply: { author: 'Utilizator', date: new Date(Date.now() - Math.random() * 86400000 * 7) },
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 30),
      tags: ['discutie', 'comunitate'],
    }));

    setTopics(prev => [...prev, ...newTopics]);
    setPage(prev => prev + 1);
    setIsLoading(false);

    // Stop after 5 pages for demo
    if (page >= 5) {
      setHasMore(false);
    }
  }, [isLoading, hasMore, page]);

  // Handle new topic creation
  const handleNewTopic = (data: { title: string; content: string; category: string; tags: string[] }) => {
    const newTopic: ForumTopic = {
      id: `new-${Date.now()}`,
      title: data.title,
      excerpt: data.content.slice(0, 150) + '...',
      category: data.category,
      author: { name: 'Tu', avatar: 'TU', role: 'user' },
      replies: 0,
      views: 1,
      likes: 0,
      lastReply: { author: 'Tu', date: new Date() },
      createdAt: new Date(),
      tags: data.tags,
    };

    setTopics(prev => [newTopic, ...prev]);
  };

  // Navigate to topic detail
  const handleTopicClick = (topicId: string) => {
    router.push(`/forum/${topicId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with working New Topic button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Forum Comunitate</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Discuta cu alti antreprenori si contabili despre fiscal 2026, HR si fonduri UE
          </p>
        </div>
        <button
          onClick={() => setIsNewTopicOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Subiect Nou
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{topics.length}</p>
              <p className="text-sm text-gray-500">Subiecte</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{topics.reduce((acc, t) => acc + t.replies, 0)}</p>
              <p className="text-sm text-gray-500">Raspunsuri</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">3,456</p>
              <p className="text-sm text-gray-500">Membri</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Award className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">24</p>
              <p className="text-sm text-gray-500">Experti</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Categories */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedCategory(category.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedCategory === category.id
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${category.color}`}>
                <category.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{category.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                  {category.description}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{category.topicsCount} subiecte</span>
                  <span>{category.postsCount} postari</span>
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cauta subiecte sau tag-uri..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Toate
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            <option value="recent">Recente</option>
            <option value="popular">Populare</option>
            <option value="trending">Trending</option>
          </select>
        </div>
      </div>

      {/* Topics List with clickable items */}
      <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        <AnimatePresence>
          {filteredTopics.map((topic) => {
            const categoryInfo = getCategoryInfo(topic.category);
            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => handleTopicClick(topic.id)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* Author Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    topic.author.role === 'expert'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      : topic.author.role === 'admin'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {topic.author.avatar}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {topic.isPinned && (
                        <Pin className="w-3.5 h-3.5 text-primary" />
                      )}
                      {topic.isResolved && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
                          Rezolvat
                        </span>
                      )}
                      <h3 className="font-medium truncate hover:text-primary transition-colors">
                        {topic.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
                      {topic.excerpt}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        {topic.author.name}
                        {topic.author.role === 'expert' && (
                          <Award className="w-3 h-3 text-yellow-500" />
                        )}
                      </span>
                      <span>•</span>
                      <span>{formatTimeAgo(topic.createdAt)}</span>
                      {categoryInfo && (
                        <>
                          <span>•</span>
                          <span className={`px-1.5 py-0.5 rounded text-white ${categoryInfo.color}`}>
                            {categoryInfo.name}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {topic.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span className="font-medium">{topic.replies}</span>
                      </div>
                      <span className="text-xs">raspunsuri</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span className="font-medium">{topic.views}</span>
                      </div>
                      <span className="text-xs">vizualizari</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        <span className="font-medium">{topic.likes}</span>
                      </div>
                      <span className="text-xs">aprecieri</span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 hidden sm:block" />
                </div>

                {/* Last Reply */}
                <div className="mt-3 ml-14 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Ultimul raspuns de <span className="font-medium">{topic.lastReply.author}</span> • {formatTimeAgo(topic.lastReply.date)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Load More - Now functional */}
      <div className="text-center">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-6 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Se incarca...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Incarca mai multe subiecte
              </>
            )}
          </button>
        ) : (
          <p className="text-sm text-gray-500">Ai vazut toate subiectele</p>
        )}
      </div>

      {/* New Topic Modal */}
      <AnimatePresence>
        {isNewTopicOpen && (
          <NewTopicModal
            isOpen={isNewTopicOpen}
            onClose={() => setIsNewTopicOpen(false)}
            onSubmit={handleNewTopic}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
