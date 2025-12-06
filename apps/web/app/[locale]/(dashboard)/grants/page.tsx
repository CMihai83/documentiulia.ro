'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Coins,
  Calendar,
  Building2,
  Users,
  TrendingUp,
  Filter,
  Search,
  ChevronRight,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Euro,
  Target,
  Briefcase,
  Leaf,
  Cpu,
  GraduationCap,
  Factory,
} from 'lucide-react';

interface Grant {
  id: string;
  title: string;
  description: string;
  provider: string;
  category: string;
  fundingRange: {
    min: number;
    max: number;
  };
  deadline: Date;
  status: 'open' | 'closing_soon' | 'closed';
  eligibility: string[];
  coFinancing?: number;
  applicationType: 'online' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  url?: string;
}

interface GrantCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  count: number;
}

const categories: GrantCategory[] = [
  { id: 'digitalizare', name: 'Digitalizare', icon: Cpu, color: 'bg-blue-500', count: 8 },
  { id: 'verde', name: 'Economia Verde', icon: Leaf, color: 'bg-green-500', count: 6 },
  { id: 'startup', name: 'Start-up', icon: TrendingUp, color: 'bg-purple-500', count: 5 },
  { id: 'inovare', name: 'Inovare', icon: Target, color: 'bg-orange-500', count: 4 },
  { id: 'formare', name: 'Formare', icon: GraduationCap, color: 'bg-indigo-500', count: 3 },
  { id: 'productie', name: 'Producție', icon: Factory, color: 'bg-red-500', count: 4 },
];

const mockGrants: Grant[] = [
  {
    id: '1',
    title: 'Digitalizare IMM - Voucher Digital',
    description: 'Finanțare pentru achiziția de soluții software, echipamente IT și servicii de digitalizare pentru IMM-uri.',
    provider: 'Ministerul Digitalizării',
    category: 'digitalizare',
    fundingRange: { min: 10000, max: 100000 },
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'open',
    eligibility: ['IMM-uri', 'Minim 1 an vechime', 'Fără datorii la stat'],
    coFinancing: 10,
    applicationType: 'online',
    difficulty: 'easy',
    tags: ['digitalizare', 'software', 'IT'],
    url: 'https://www.imm-recover.ro',
  },
  {
    id: '2',
    title: 'Programul de Sustenabilitate - Green Business',
    description: 'Granturi pentru implementarea soluțiilor de reducere a amprentei de carbon și tranziție verde.',
    provider: 'Ministerul Mediului',
    category: 'verde',
    fundingRange: { min: 50000, max: 500000 },
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    status: 'closing_soon',
    eligibility: ['Toate companiile', 'Plan de sustenabilitate', 'Audit energetic'],
    coFinancing: 30,
    applicationType: 'mixed',
    difficulty: 'medium',
    tags: ['verde', 'sustenabilitate', 'energie'],
  },
  {
    id: '3',
    title: 'Start-up Nation 2025',
    description: 'Finanțare nerambursabilă pentru tineri antreprenori care doresc să își deschidă o afacere.',
    provider: 'Ministerul Economiei',
    category: 'startup',
    fundingRange: { min: 40000, max: 200000 },
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    status: 'open',
    eligibility: ['Persoane fizice 18-35 ani', 'Fără firmă activă', 'Plan de afaceri'],
    coFinancing: 0,
    applicationType: 'online',
    difficulty: 'medium',
    tags: ['startup', 'tineri', 'afaceri noi'],
  },
  {
    id: '4',
    title: 'Inovare și Cercetare - Horizon Europe',
    description: 'Finanțare europeană pentru proiecte de cercetare, dezvoltare și inovare.',
    provider: 'Comisia Europeană',
    category: 'inovare',
    fundingRange: { min: 100000, max: 2000000 },
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: 'open',
    eligibility: ['Consorții internaționale', 'Departament R&D', 'Experiență proiecte UE'],
    coFinancing: 25,
    applicationType: 'mixed',
    difficulty: 'hard',
    tags: ['inovare', 'cercetare', 'UE'],
  },
  {
    id: '5',
    title: 'Competențe Digitale pentru Angajați',
    description: 'Programe de formare și certificare în competențe digitale pentru angajații din IMM-uri.',
    provider: 'PNRR - Componenta 7',
    category: 'formare',
    fundingRange: { min: 5000, max: 50000 },
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    status: 'open',
    eligibility: ['IMM-uri', 'Minim 3 angajați', 'Contract de muncă'],
    coFinancing: 0,
    applicationType: 'online',
    difficulty: 'easy',
    tags: ['formare', 'competențe', 'digital'],
  },
  {
    id: '6',
    title: 'Modernizare Linii de Producție',
    description: 'Investiții în echipamente și utilaje pentru modernizarea capacităților de producție.',
    provider: 'PNRR - Componenta 9',
    category: 'productie',
    fundingRange: { min: 200000, max: 1000000 },
    deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'closed',
    eligibility: ['Societăți de producție', 'Cifră afaceri > 1M EUR', '5 ani vechime'],
    coFinancing: 40,
    applicationType: 'mixed',
    difficulty: 'hard',
    tags: ['producție', 'echipamente', 'investiții'],
  },
];

const getDifficultyLabel = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'Ușor';
    case 'medium': return 'Mediu';
    case 'hard': return 'Complex';
    default: return difficulty;
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
    case 'closing_soon': return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800';
    case 'closed': return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'open': return 'Deschis';
    case 'closing_soon': return 'Se închide curând';
    case 'closed': return 'Închis';
    default: return status;
  }
};

export default function GrantsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);

  const filteredGrants = mockGrants
    .filter(grant =>
      (selectedCategory === 'all' || grant.category === selectedCategory) &&
      (searchQuery === '' ||
        grant.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grant.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      (!showOnlyOpen || grant.status !== 'closed')
    )
    .sort((a, b) => {
      if (a.status === 'closing_soon' && b.status !== 'closing_soon') return -1;
      if (a.status !== 'closing_soon' && b.status === 'closing_soon') return 1;
      if (a.status === 'closed') return 1;
      if (b.status === 'closed') return -1;
      return a.deadline.getTime() - b.deadline.getTime();
    });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Expirat';
    if (diff === 0) return 'Ultima zi';
    if (diff === 1) return 'Mâine';
    return `${diff} zile`;
  };

  const openGrants = mockGrants.filter(g => g.status === 'open').length;
  const totalFunding = mockGrants.reduce((acc, g) => acc + g.fundingRange.max, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Granturi și Finanțări</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Descoperă oportunități de finanțare pentru afacerea ta
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
          <Target className="w-4 h-4" />
          Verifică Eligibilitate
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
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openGrants}</p>
              <p className="text-sm text-gray-500">Deschise</p>
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
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Euro className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">3.8M</p>
              <p className="text-sm text-gray-500">EUR Disponibili</p>
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
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-sm text-gray-500">Furnizori</p>
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
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-gray-500">Se Închid Curând</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            selectedCategory === 'all'
              ? 'bg-primary text-white'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Coins className="w-4 h-4" />
          Toate ({mockGrants.length})
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === category.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <category.icon className="w-4 h-4" />
            {category.name} ({category.count})
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Caută granturi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyOpen}
            onChange={(e) => setShowOnlyOpen(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Doar deschise</span>
        </label>
      </div>

      {/* Grants List */}
      <div className="space-y-4">
        {filteredGrants.map((grant, index) => {
          const categoryInfo = categories.find(c => c.id === grant.category);
          return (
            <motion.div
              key={grant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow ${
                grant.status === 'closed' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Category Icon */}
                {categoryInfo && (
                  <div className={`p-3 rounded-xl ${categoryInfo.color} flex-shrink-0`}>
                    <categoryInfo.icon className="w-6 h-6 text-white" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(grant.status)}`}>
                      {getStatusLabel(grant.status)}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded ${getDifficultyColor(grant.difficulty)}`}>
                      {getDifficultyLabel(grant.difficulty)}
                    </span>
                    {grant.coFinancing === 0 && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
                        100% nerambursabil
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold mb-1">{grant.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {grant.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {grant.provider}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Termen: {getDaysUntil(grant.deadline)}
                    </span>
                    {grant.coFinancing !== undefined && grant.coFinancing > 0 && (
                      <span className="flex items-center gap-1">
                        <Coins className="w-4 h-4" />
                        Co-finanțare: {grant.coFinancing}%
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {grant.eligibility.slice(0, 3).map((item, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded"
                      >
                        {item}
                      </span>
                    ))}
                    {grant.eligibility.length > 3 && (
                      <span className="px-2 py-1 text-xs text-gray-400">
                        +{grant.eligibility.length - 3} condiții
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {grant.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs text-primary bg-primary/10 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Funding & Actions */}
                <div className="lg:text-right lg:flex-shrink-0">
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Finanțare</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(grant.fundingRange.min)} - {formatCurrency(grant.fundingRange.max)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      disabled={grant.status === 'closed'}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        grant.status === 'closed'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Aplică Acum
                    </button>
                    {grant.url && (
                      <a
                        href={grant.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Detalii
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredGrants.length === 0 && (
        <div className="text-center py-12">
          <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-medium mb-2">Nu am găsit granturi</h3>
          <p className="text-sm text-gray-500">Încearcă să modifici filtrele sau căutarea</p>
        </div>
      )}
    </div>
  );
}
