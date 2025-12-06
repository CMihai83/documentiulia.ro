'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Types
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  coverImage: string;
  readTime: number;
  publishedAt: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  analytics: {
    views: number;
    shares: number;
    comments: number;
  };
}

interface ContentCalendarItem {
  id: string;
  date: string;
  posts: { title: string; status: BlogPost['status']; category: string }[];
}

// Mock Data
const mockPosts: BlogPost[] = [
  {
    id: '1',
    title: 'TVA 2026: Ghid Complet pentru Noile Cote de 21% și 11%',
    slug: 'tva-2026-ghid-complet',
    excerpt: 'Tot ce trebuie să știți despre noile cote de TVA care intră în vigoare în august 2025. Impactul asupra IMM-urilor și cum să vă pregătiți.',
    content: '# TVA 2026: Ghid Complet\n\nStartând cu **1 august 2025**, cotele de TVA se modifică semnificativ...',
    category: 'Fiscalitate',
    tags: ['TVA', 'Fiscalitate 2026', 'IMM', 'ANAF'],
    author: {
      name: 'Maria Ionescu',
      avatar: '/avatars/maria.jpg',
      role: 'Expert Fiscal'
    },
    coverImage: '/blog/tva-2026.jpg',
    readTime: 8,
    publishedAt: '2025-12-01',
    status: 'published',
    seo: {
      metaTitle: 'TVA 2026 Romania - Ghid Complet Noile Cote | DocumentIulia',
      metaDescription: 'Descoperă tot ce trebuie să știi despre noile cote TVA de 21% și 11% din 2026. Ghid complet pentru contabili și IMM-uri.',
      keywords: ['TVA 2026', 'cote TVA Romania', 'fiscalitate 2026', 'TVA 21%']
    },
    analytics: {
      views: 2847,
      shares: 156,
      comments: 23
    }
  },
  {
    id: '2',
    title: 'SAF-T D406: Cum să Generezi Declarația pentru PFA în 5 Minute',
    slug: 'saft-d406-pfa-tutorial',
    excerpt: 'Tutorial pas cu pas pentru generarea declarației SAF-T D406 pentru persoane fizice autorizate. Folosește AI-ul nostru pentru automatizare.',
    content: '# SAF-T D406 pentru PFA\n\nDe la **1 ianuarie 2026**, toate PFA-urile sunt obligate...',
    category: 'SAF-T',
    tags: ['SAF-T', 'D406', 'PFA', 'e-Factura'],
    author: {
      name: 'Andrei Popescu',
      avatar: '/avatars/andrei.jpg',
      role: 'Consultant IT'
    },
    coverImage: '/blog/saft-d406.jpg',
    readTime: 5,
    publishedAt: '2025-11-28',
    status: 'published',
    seo: {
      metaTitle: 'SAF-T D406 PFA Tutorial - Generare Automată | DocumentIulia',
      metaDescription: 'Învață cum să generezi declarația SAF-T D406 pentru PFA în doar 5 minute. Tutorial complet cu AI.',
      keywords: ['SAF-T D406', 'declaratie PFA', 'e-factura', 'ANAF']
    },
    analytics: {
      views: 1523,
      shares: 89,
      comments: 15
    }
  },
  {
    id: '3',
    title: 'Dividend Tax 16%: Strategi de Optimizare pentru 2026',
    slug: 'dividend-tax-16-strategii',
    excerpt: 'Noua cotă de impozit pe dividende de 16% intră în vigoare în 2026. Descoperă strategii legale de optimizare fiscală.',
    content: '# Dividend Tax 16%\n\nÎncepând cu **1 ianuarie 2026**, impozitul pe dividende crește de la 8% la 16%...',
    category: 'Dividende',
    tags: ['Dividende', 'Impozit', 'Optimizare', 'SRL'],
    author: {
      name: 'Elena Gheorghe',
      avatar: '/avatars/elena.jpg',
      role: 'Expert Contabil'
    },
    coverImage: '/blog/dividend-tax.jpg',
    readTime: 10,
    publishedAt: '2025-11-25',
    status: 'published',
    seo: {
      metaTitle: 'Impozit Dividende 16% 2026 - Strategii Optimizare | DocumentIulia',
      metaDescription: 'Pregătește-te pentru noul impozit pe dividende de 16%. Strategii legale de optimizare fiscală pentru SRL-uri.',
      keywords: ['impozit dividende', 'dividend tax 16%', 'optimizare fiscala', 'SRL dividende']
    },
    analytics: {
      views: 3421,
      shares: 234,
      comments: 45
    }
  },
  {
    id: '4',
    title: 'PNRR Digitalizare IMM: Cum să Obții Finanțare de până la €100.000',
    slug: 'pnrr-digitalizare-imm-ghid',
    excerpt: 'Ghid complet pentru accesarea fondurilor PNRR pentru digitalizare. Criterii eligibilitate, documente necesare și calendar.',
    content: '# PNRR Digitalizare IMM\n\nFondurile PNRR pentru digitalizare oferă granturi de **25.000€ - 100.000€**...',
    category: 'EU Funds',
    tags: ['PNRR', 'Digitalizare', 'Finanțare', 'IMM'],
    author: {
      name: 'Cristian Marin',
      avatar: '/avatars/cristian.jpg',
      role: 'Consultant Fonduri UE'
    },
    coverImage: '/blog/pnrr-digital.jpg',
    readTime: 12,
    publishedAt: '2025-11-20',
    status: 'published',
    seo: {
      metaTitle: 'PNRR Digitalizare IMM 2025 - Ghid Finanțare €100K | DocumentIulia',
      metaDescription: 'Cum să obții finanțare PNRR de până la €100.000 pentru digitalizarea afacerii tale. Ghid complet 2025.',
      keywords: ['PNRR digitalizare', 'fonduri europene IMM', 'finantare digitalizare', 'granturi IMM']
    },
    analytics: {
      views: 5672,
      shares: 412,
      comments: 78
    }
  },
  {
    id: '5',
    title: 'e-Factura B2B Obligatoriu: Ce Trebuie Să Știe Fiecare Firmă',
    slug: 'e-factura-b2b-obligatoriu',
    excerpt: 'De la 1 ianuarie 2025, e-Factura devine obligatoriu pentru toate tranzacțiile B2B. Iată cum să te conformezi.',
    content: '# e-Factura B2B Obligatoriu\n\nSistemul național e-Factura devine **obligatoriu pentru B2B**...',
    category: 'e-Factura',
    tags: ['e-Factura', 'B2B', 'RO e-Factura', 'Conformitate'],
    author: {
      name: 'Maria Ionescu',
      avatar: '/avatars/maria.jpg',
      role: 'Expert Fiscal'
    },
    coverImage: '/blog/e-factura-b2b.jpg',
    readTime: 7,
    publishedAt: '2025-11-15',
    status: 'published',
    seo: {
      metaTitle: 'e-Factura B2B Obligatoriu 2025 - Ghid Conformitate | DocumentIulia',
      metaDescription: 'Tot ce trebuie să știi despre e-Factura B2B obligatoriu din 2025. Pași de implementare și conformitate.',
      keywords: ['e-factura B2B', 'RO e-factura', 'facturare electronica', 'ANAF']
    },
    analytics: {
      views: 4123,
      shares: 289,
      comments: 56
    }
  },
  {
    id: '6',
    title: 'AI în Contabilitate: 10 Moduri în Care Automatizarea Transformă Industria',
    slug: 'ai-contabilitate-automatizare',
    excerpt: 'Descoperă cum inteligența artificială revoluționează contabilitatea și cum să implementezi AI în firma ta.',
    content: '# AI în Contabilitate\n\nInteligența artificială transformă radical modul în care...',
    category: 'Tehnologie',
    tags: ['AI', 'Automatizare', 'Contabilitate', 'Machine Learning'],
    author: {
      name: 'Andrei Popescu',
      avatar: '/avatars/andrei.jpg',
      role: 'Consultant IT'
    },
    coverImage: '/blog/ai-accounting.jpg',
    readTime: 9,
    publishedAt: '',
    status: 'scheduled',
    scheduledFor: '2025-12-10',
    seo: {
      metaTitle: 'AI în Contabilitate 2025 - Automatizare și Transformare | DocumentIulia',
      metaDescription: '10 moduri inovative în care AI transformă contabilitatea. Ghid de implementare pentru firme.',
      keywords: ['AI contabilitate', 'automatizare contabila', 'machine learning', 'digitalizare']
    },
    analytics: {
      views: 0,
      shares: 0,
      comments: 0
    }
  }
];

const categories = [
  { id: 'all', name: 'Toate', count: 6, color: 'gray' },
  { id: 'Fiscalitate', name: 'Fiscalitate', count: 1, color: 'blue' },
  { id: 'SAF-T', name: 'SAF-T', count: 1, color: 'green' },
  { id: 'Dividende', name: 'Dividende', count: 1, color: 'purple' },
  { id: 'EU Funds', name: 'EU Funds', count: 1, color: 'yellow' },
  { id: 'e-Factura', name: 'e-Factura', count: 1, color: 'red' },
  { id: 'Tehnologie', name: 'Tehnologie', count: 1, color: 'cyan' }
];

// Components
function BlogPostCard({ post, onClick }: { post: BlogPost; onClick: () => void }) {
  const statusColors = {
    published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    scheduled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
  };

  const statusLabels = {
    published: 'Publicat',
    scheduled: 'Programat',
    draft: 'Draft'
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-xl transition-all"
    >
      {/* Cover Image Placeholder */}
      <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl opacity-30">📄</span>
        </div>
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[post.status]}`}>
            {statusLabels[post.status]}
          </span>
          <span className="px-2 py-0.5 bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 rounded text-xs">
            {post.category}
          </span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {post.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {post.excerpt}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {post.author.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-xs">{post.author.name}</p>
              <p className="text-gray-500 text-xs">{post.readTime} min citire</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {post.analytics.views.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {post.analytics.shares}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-4">
          {post.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

function AIContentGenerator({
  onGenerate,
  isGenerating
}: {
  onGenerate: (topic: string, tone: string) => void;
  isGenerating: boolean;
}) {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [suggestions, setSuggestions] = useState<string[]>([
    'TVA 2026 modificări și impact',
    'SAF-T D406 tutorial pas cu pas',
    'PNRR digitalizare eligibilitate',
    'e-Factura B2B conformitate',
    'Impozit dividende strategii'
  ]);

  return (
    <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/20 rounded-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-lg">AI Content Generator</h3>
          <p className="text-white/80 text-sm">Generează articole SEO-optimizate în câteva secunde</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-white/90">Subiect Articol</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:border-transparent"
            placeholder="ex: Ghid complet TVA 2026 pentru IMM-uri"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-white/90">Ton</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:ring-2 focus:ring-white/50"
          >
            <option value="professional" className="text-gray-900">Profesional</option>
            <option value="educational" className="text-gray-900">Educațional</option>
            <option value="conversational" className="text-gray-900">Conversațional</option>
            <option value="technical" className="text-gray-900">Tehnic</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-white/90">Sugestii trending</label>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setTopic(suggestion)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onGenerate(topic, tone)}
          disabled={isGenerating || !topic.trim()}
          className="w-full py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generare în curs...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generează Articol
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function PostEditorModal({
  post,
  onClose,
  onSave,
  isNew,
  isAIGenerated
}: {
  post: BlogPost | null;
  onClose: () => void;
  onSave: (post: BlogPost) => void;
  isNew: boolean;
  isAIGenerated?: boolean;
}) {
  const [editedPost, setEditedPost] = useState<BlogPost>(post || {
    id: Date.now().toString(),
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'Fiscalitate',
    tags: [],
    author: {
      name: 'Admin',
      avatar: '/avatars/admin.jpg',
      role: 'Editor'
    },
    coverImage: '',
    readTime: 5,
    publishedAt: '',
    status: 'draft',
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: []
    },
    analytics: {
      views: 0,
      shares: 0,
      comments: 0
    }
  });

  const [newTag, setNewTag] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'settings'>('content');

  // Auto-generate slug from title
  useEffect(() => {
    if (isNew) {
      const slug = editedPost.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setEditedPost(prev => ({ ...prev, slug }));
    }
  }, [editedPost.title, isNew]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-10 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            {isAIGenerated && (
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                AI Generated
              </span>
            )}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isNew ? 'Articol Nou' : 'Editează Articol'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-700">
          {[
            { id: 'content', label: 'Conținut', icon: '📝' },
            { id: 'seo', label: 'SEO', icon: '🔍' },
            { id: 'settings', label: 'Setări', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'content' && (
              <motion.div
                key="content"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">Titlu</label>
                  <input
                    type="text"
                    value={editedPost.title}
                    onChange={(e) => setEditedPost({ ...editedPost, title: e.target.value })}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="Titlul articolului"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Excerpt</label>
                  <textarea
                    value={editedPost.excerpt}
                    onChange={(e) => setEditedPost({ ...editedPost, excerpt: e.target.value })}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    rows={2}
                    placeholder="Scurtă descriere a articolului"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Conținut (Markdown)</label>
                  <textarea
                    value={editedPost.content}
                    onChange={(e) => setEditedPost({ ...editedPost, content: e.target.value })}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
                    rows={12}
                    placeholder="# Titlu&#10;&#10;Conținutul articolului..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Categorie</label>
                    <select
                      value={editedPost.category}
                      onChange={(e) => setEditedPost({ ...editedPost, category: e.target.value })}
                      className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    >
                      {categories.filter(c => c.id !== 'all').map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Timp citire (min)</label>
                    <input
                      type="number"
                      value={editedPost.readTime}
                      onChange={(e) => setEditedPost({ ...editedPost, readTime: parseInt(e.target.value) || 5 })}
                      className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tag-uri</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="flex-1 p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                      placeholder="Adaugă tag..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newTag.trim()) {
                          setEditedPost({ ...editedPost, tags: [...editedPost.tags, newTag.trim()] });
                          setNewTag('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newTag.trim()) {
                          setEditedPost({ ...editedPost, tags: [...editedPost.tags, newTag.trim()] });
                          setNewTag('');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editedPost.tags.map((tag, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                        #{tag}
                        <button
                          onClick={() => setEditedPost({ ...editedPost, tags: editedPost.tags.filter((_, i) => i !== idx) })}
                          className="hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'seo' && (
              <motion.div
                key="seo"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">Meta Title</label>
                  <input
                    type="text"
                    value={editedPost.seo.metaTitle}
                    onChange={(e) => setEditedPost({
                      ...editedPost,
                      seo: { ...editedPost.seo, metaTitle: e.target.value }
                    })}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="Titlu pentru motoare de căutare (max 60 caractere)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editedPost.seo.metaTitle.length}/60 caractere
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Meta Description</label>
                  <textarea
                    value={editedPost.seo.metaDescription}
                    onChange={(e) => setEditedPost({
                      ...editedPost,
                      seo: { ...editedPost.seo, metaDescription: e.target.value }
                    })}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    rows={3}
                    placeholder="Descriere pentru motoare de căutare (max 160 caractere)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editedPost.seo.metaDescription.length}/160 caractere
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Keywords</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      className="flex-1 p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                      placeholder="Adaugă keyword..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newKeyword.trim()) {
                          setEditedPost({
                            ...editedPost,
                            seo: { ...editedPost.seo, keywords: [...editedPost.seo.keywords, newKeyword.trim()] }
                          });
                          setNewKeyword('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newKeyword.trim()) {
                          setEditedPost({
                            ...editedPost,
                            seo: { ...editedPost.seo, keywords: [...editedPost.seo.keywords, newKeyword.trim()] }
                          });
                          setNewKeyword('');
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editedPost.seo.keywords.map((kw, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
                        {kw}
                        <button
                          onClick={() => setEditedPost({
                            ...editedPost,
                            seo: { ...editedPost.seo, keywords: editedPost.seo.keywords.filter((_, i) => i !== idx) }
                          })}
                          className="hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Slug URL</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">/blog/</span>
                    <input
                      type="text"
                      value={editedPost.slug}
                      onChange={(e) => setEditedPost({ ...editedPost, slug: e.target.value })}
                      className="flex-1 p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                      placeholder="url-articol"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={editedPost.status}
                    onChange={(e) => setEditedPost({ ...editedPost, status: e.target.value as BlogPost['status'] })}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Programat</option>
                    <option value="published">Publicat</option>
                  </select>
                </div>

                {editedPost.status === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Data Publicare</label>
                    <input
                      type="datetime-local"
                      value={editedPost.scheduledFor || ''}
                      onChange={(e) => setEditedPost({ ...editedPost, scheduledFor: e.target.value })}
                      className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Autor</label>
                  <input
                    type="text"
                    value={editedPost.author.name}
                    onChange={(e) => setEditedPost({
                      ...editedPost,
                      author: { ...editedPost.author, name: e.target.value }
                    })}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Rol Autor</label>
                  <input
                    type="text"
                    value={editedPost.author.role}
                    onChange={(e) => setEditedPost({
                      ...editedPost,
                      author: { ...editedPost.author, role: e.target.value }
                    })}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="border-t dark:border-gray-700 p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          >
            Anulează
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditedPost({ ...editedPost, status: 'draft' });
                onSave({ ...editedPost, status: 'draft' });
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Salvează Draft
            </button>
            <button
              onClick={() => onSave(editedPost)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editedPost.status === 'published' ? 'Publică' : 'Salvează'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Main Component
export default function BlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>(mockPosts);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isNewPost, setIsNewPost] = useState(false);
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter posts
  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Handle AI generation
  const handleAIGenerate = async (topic: string, tone: string) => {
    setIsGenerating(true);

    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 3000));

    const generatedPost: BlogPost = {
      id: Date.now().toString(),
      title: topic,
      slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      excerpt: `Articol generat automat despre ${topic}. Acest conținut a fost creat folosind AI și poate fi editat.`,
      content: `# ${topic}\n\n## Introducere\n\nAcest articol oferă o perspectivă completă asupra subiectului "${topic}".\n\n## Detalii Importante\n\nConținutul generat automat...\n\n## Concluzii\n\nÎn concluzie...`,
      category: 'Fiscalitate',
      tags: topic.split(' ').filter(w => w.length > 3),
      author: {
        name: 'AI Assistant',
        avatar: '/avatars/ai.jpg',
        role: 'Content Generator'
      },
      coverImage: '',
      readTime: 5,
      publishedAt: '',
      status: 'draft',
      seo: {
        metaTitle: `${topic} | DocumentIulia`,
        metaDescription: `Tot ce trebuie să știți despre ${topic}. Ghid complet și actualizat pentru 2025.`,
        keywords: topic.toLowerCase().split(' ').filter(w => w.length > 3)
      },
      analytics: {
        views: 0,
        shares: 0,
        comments: 0
      }
    };

    setIsGenerating(false);
    setSelectedPost(generatedPost);
    setIsNewPost(true);
    setIsAIGenerated(true);
  };

  // Stats
  const stats = {
    totalPosts: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    totalViews: posts.reduce((acc, p) => acc + p.analytics.views, 0),
    totalShares: posts.reduce((acc, p) => acc + p.analytics.shares, 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Blog AI Studio
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Generare conținut SEO cu inteligență artificială
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPost(null);
                setIsNewPost(true);
                setIsAIGenerated(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Articol Nou
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Articole', value: stats.totalPosts, icon: '📝' },
              { label: 'Publicate', value: stats.published, icon: '✅' },
              { label: 'Programate', value: stats.scheduled, icon: '📅' },
              { label: 'Vizualizări', value: stats.totalViews.toLocaleString(), icon: '👁️' },
              { label: 'Distribuiri', value: stats.totalShares.toLocaleString(), icon: '🔗' }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{stat.icon}</span>
                  <span className="text-sm text-gray-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar - AI Generator */}
          <div className="lg:col-span-1 space-y-6">
            <AIContentGenerator onGenerate={handleAIGenerate} isGenerating={isGenerating} />

            {/* Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Categorii</h4>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      categoryFilter === cat.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-sm text-gray-500">{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Calendar Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Calendar Conținut</h4>
              <div className="space-y-3">
                {[
                  { date: 'Azi', title: 'TVA 2026 Ghid', status: 'published' },
                  { date: '10 Dec', title: 'AI în Contabilitate', status: 'scheduled' },
                  { date: '15 Dec', title: 'PNRR Tutorial', status: 'draft' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 w-12">{item.date}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      item.status === 'published' ? 'bg-green-500' :
                      item.status === 'scheduled' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Posts */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Caută articole..."
                    className="w-full pl-10 pr-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
              <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Posts Grid */}
            <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 gap-6' : 'space-y-4'}>
              {filteredPosts.map((post, idx) => (
                <BlogPostCard
                  key={post.id}
                  post={post}
                  onClick={() => {
                    setSelectedPost(post);
                    setIsNewPost(false);
                    setIsAIGenerated(false);
                  }}
                />
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nu am găsit articole
                </h3>
                <p className="text-gray-500 mb-4">
                  Încearcă să ajustezi filtrele sau creează un articol nou.
                </p>
                <button
                  onClick={() => {
                    setSelectedPost(null);
                    setIsNewPost(true);
                    setIsAIGenerated(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Creează Articol
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Editor Modal */}
      <AnimatePresence>
        {(selectedPost || isNewPost) && (
          <PostEditorModal
            post={selectedPost}
            onClose={() => {
              setSelectedPost(null);
              setIsNewPost(false);
              setIsAIGenerated(false);
            }}
            onSave={(post) => {
              if (isNewPost) {
                setPosts(prev => [post, ...prev]);
              } else {
                setPosts(prev => prev.map(p => p.id === post.id ? post : p));
              }
              setSelectedPost(null);
              setIsNewPost(false);
              setIsAIGenerated(false);
            }}
            isNew={isNewPost}
            isAIGenerated={isAIGenerated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
