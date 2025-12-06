'use client';

/**
 * Forum Community Page - Semantic Enchantment
 *
 * Features:
 * - 50 seeded threads (VAT/HR/PNRR/GenAI/tachograph)
 * - Semantic search (Pinecone-ready)
 * - AI moderation badges
 * - CRUD operations
 * - Real-time activity indicators
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout, MobileNav } from '@/components/layout';
import {
  MessageSquare,
  Users,
  Clock,
  ChevronRight,
  Search,
  Plus,
  TrendingUp,
  BookOpen,
  Calculator,
  FileText,
  HelpCircle,
  Sparkles,
  Shield,
  Award,
  Filter,
  Truck,
  Brain,
  Euro,
  Heart,
  Briefcase,
} from 'lucide-react';

interface ForumTopic {
  id: string;
  title: string;
  category: string;
  categoryId: string;
  author: string;
  authorBadge?: 'expert' | 'moderator' | 'ai' | 'verified';
  repliesCount: number;
  viewsCount: number;
  lastActivityAt: string;
  isPinned?: boolean;
  isHot?: boolean;
  tags: string[];
}

// 50 Seeded Forum Threads - Semantic Index Ready
const seededTopics: ForumTopic[] = [
  // VAT Topics (10)
  { id: '1', title: 'TVA 21% vs 11% - Când se aplică fiecare cotă (Legea 141)', category: 'Fiscalitate și TVA', categoryId: 'fiscalitate', author: 'Expert.Fiscal', authorBadge: 'expert', repliesCount: 45, viewsCount: 2341, lastActivityAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), isPinned: true, isHot: true, tags: ['TVA', '21%', '11%', 'Legea 141'] },
  { id: '2', title: 'Deducere TVA pentru autoturisme în 2025 - ghid complet', category: 'Fiscalitate și TVA', categoryId: 'fiscalitate', author: 'Maria.Popescu', repliesCount: 23, viewsCount: 1567, lastActivityAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), tags: ['TVA', 'deducere', 'auto'] },
  { id: '3', title: 'TVA la import servicii UE - reverse charge', category: 'Fiscalitate și TVA', categoryId: 'fiscalitate', author: 'Contabil.Pro', authorBadge: 'verified', repliesCount: 18, viewsCount: 987, lastActivityAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), tags: ['TVA', 'import', 'reverse charge'] },
  { id: '4', title: 'Scutire TVA pentru exporturi - documentație necesară', category: 'Fiscalitate și TVA', categoryId: 'fiscalitate', author: 'Expert.Fiscal', authorBadge: 'expert', repliesCount: 31, viewsCount: 1234, lastActivityAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), tags: ['TVA', 'export', 'scutire'] },
  { id: '5', title: 'Ajustare TVA pentru clădiri - calcul și înregistrare', category: 'Fiscalitate și TVA', categoryId: 'fiscalitate', author: 'Andrei.Ionescu', repliesCount: 12, viewsCount: 654, lastActivityAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), tags: ['TVA', 'ajustare', 'imobile'] },
  { id: '6', title: 'TVA neexigibil - când și cum se folosește', category: 'Fiscalitate și TVA', categoryId: 'fiscalitate', author: 'Fiscal.Expert', authorBadge: 'expert', repliesCount: 15, viewsCount: 789, lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), tags: ['TVA', 'neexigibil'] },
  { id: '7', title: 'Rambursare TVA - procedură și termene 2025', category: 'Fiscalitate și TVA', categoryId: 'fiscalitate', author: 'Maria.Popescu', repliesCount: 28, viewsCount: 1876, lastActivityAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(), isHot: true, tags: ['TVA', 'rambursare'] },
  { id: '8', title: 'Pro-rata TVA pentru activități mixte', category: 'Fiscalitate și TVA', categoryId: 'fiscalitate', author: 'Contabil.Senior', authorBadge: 'verified', repliesCount: 9, viewsCount: 432, lastActivityAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), tags: ['TVA', 'pro-rata'] },
  { id: '9', title: 'Impozit dividende 16% - strategie optimă 2026', category: 'Fiscalitate și TVA', categoryId: 'fiscalitate', author: 'Tax.Advisor', authorBadge: 'expert', repliesCount: 56, viewsCount: 3421, lastActivityAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), isPinned: true, isHot: true, tags: ['dividende', '16%', '2026'] },
  { id: '10', title: 'TVA pentru servicii digitale B2C în UE', category: 'Fiscalitate și TVA', categoryId: 'fiscalitate', author: 'Digital.Expert', repliesCount: 14, viewsCount: 678, lastActivityAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(), tags: ['TVA', 'digital', 'B2C'] },

  // HR Topics (10)
  { id: '11', title: 'ATS cu AI - cum să implementezi matching CV cu 95% acuratețe', category: 'HR & Recrutare', categoryId: 'hr', author: 'HR.Tech', authorBadge: 'expert', repliesCount: 34, viewsCount: 1567, lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), isHot: true, tags: ['ATS', 'AI', 'recrutare'] },
  { id: '12', title: 'Program wellness obligatoriu - ce trebuie să știi', category: 'HR & Recrutare', categoryId: 'hr', author: 'Wellness.Manager', authorBadge: 'verified', repliesCount: 21, viewsCount: 987, lastActivityAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), tags: ['wellness', 'HR', 'obligatoriu'] },
  { id: '13', title: 'Performance reviews - modele și bune practici 2026', category: 'HR & Recrutare', categoryId: 'hr', author: 'HR.Director', authorBadge: 'expert', repliesCount: 19, viewsCount: 876, lastActivityAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), tags: ['performance', 'reviews', 'HR'] },
  { id: '14', title: 'Onboarding digital - checklist complet', category: 'HR & Recrutare', categoryId: 'hr', author: 'Maria.HR', repliesCount: 27, viewsCount: 1234, lastActivityAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), tags: ['onboarding', 'digital', 'checklist'] },
  { id: '15', title: 'LinkedIn Recruiter vs alte platforme - comparație', category: 'HR & Recrutare', categoryId: 'hr', author: 'Recruiter.Pro', authorBadge: 'verified', repliesCount: 15, viewsCount: 654, lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), tags: ['LinkedIn', 'recrutare', 'platforme'] },
  { id: '16', title: 'ABSL BSS - cele mai căutate skills în 2026', category: 'HR & Recrutare', categoryId: 'hr', author: 'ABSL.Analyst', authorBadge: 'expert', repliesCount: 42, viewsCount: 2134, lastActivityAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), isHot: true, tags: ['ABSL', 'BSS', 'skills'] },
  { id: '17', title: 'Remote work policy - model actualizat 2025', category: 'HR & Recrutare', categoryId: 'hr', author: 'HR.Legal', authorBadge: 'verified', repliesCount: 23, viewsCount: 1087, lastActivityAt: new Date(Date.now() - 1.2 * 24 * 60 * 60 * 1000).toISOString(), tags: ['remote', 'policy', 'HR'] },
  { id: '18', title: 'Employee engagement - metrici și KPIs', category: 'HR & Recrutare', categoryId: 'hr', author: 'People.Analytics', repliesCount: 11, viewsCount: 543, lastActivityAt: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000).toISOString(), tags: ['engagement', 'KPI', 'metrici'] },
  { id: '19', title: 'Burnout prevention - program complet', category: 'HR & Recrutare', categoryId: 'hr', author: 'Wellness.Coach', authorBadge: 'expert', repliesCount: 38, viewsCount: 1765, lastActivityAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), isHot: true, tags: ['burnout', 'wellness', 'prevention'] },
  { id: '20', title: 'Exit interviews - ce întrebări să pui', category: 'HR & Recrutare', categoryId: 'hr', author: 'HR.Consultant', repliesCount: 8, viewsCount: 432, lastActivityAt: new Date(Date.now() - 2.3 * 24 * 60 * 60 * 1000).toISOString(), tags: ['exit', 'interview', 'HR'] },

  // PNRR/EU Funds Topics (10)
  { id: '21', title: 'PNRR 2026 - Ghid complet eligibilitate IMM-uri', category: 'Fonduri EU', categoryId: 'fonduri', author: 'EU.Funds.Expert', authorBadge: 'expert', repliesCount: 67, viewsCount: 4521, lastActivityAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), isPinned: true, isHot: true, tags: ['PNRR', 'eligibilitate', 'IMM'] },
  { id: '22', title: 'DIH4Society - cum să aplici pentru €50k voucher', category: 'Fonduri EU', categoryId: 'fonduri', author: 'Grant.Writer', authorBadge: 'verified', repliesCount: 34, viewsCount: 2341, lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), isHot: true, tags: ['DIH4Society', 'voucher', 'digitalizare'] },
  { id: '23', title: 'Cohesion Policy €31B - oportunități 2026-2029', category: 'Fonduri EU', categoryId: 'fonduri', author: 'EU.Specialist', authorBadge: 'expert', repliesCount: 28, viewsCount: 1654, lastActivityAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), tags: ['Cohesion', 'fonduri', '2026'] },
  { id: '24', title: 'InvestEU - garanții pentru creditare IMM', category: 'Fonduri EU', categoryId: 'fonduri', author: 'Finance.Advisor', repliesCount: 19, viewsCount: 987, lastActivityAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), tags: ['InvestEU', 'garanții', 'IMM'] },
  { id: '25', title: 'AFIR - fonduri pentru agricultură și dezvoltare rurală', category: 'Fonduri EU', categoryId: 'fonduri', author: 'Agri.Consultant', authorBadge: 'verified', repliesCount: 23, viewsCount: 1234, lastActivityAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), tags: ['AFIR', 'agricultură', 'rural'] },
  { id: '26', title: 'Horizon Europe - cum să aplici pentru R&D', category: 'Fonduri EU', categoryId: 'fonduri', author: 'Research.Manager', authorBadge: 'expert', repliesCount: 15, viewsCount: 765, lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Horizon', 'R&D', 'cercetare'] },
  { id: '27', title: 'Documente necesare pentru aplicații PNRR', category: 'Fonduri EU', categoryId: 'fonduri', author: 'Grant.Writer', authorBadge: 'verified', repliesCount: 41, viewsCount: 2876, lastActivityAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), isHot: true, tags: ['PNRR', 'documente', 'aplicație'] },
  { id: '28', title: 'Raportare și monitorizare proiecte EU - ghid', category: 'Fonduri EU', categoryId: 'fonduri', author: 'Project.Manager', repliesCount: 12, viewsCount: 543, lastActivityAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(), tags: ['raportare', 'monitorizare', 'EU'] },
  { id: '29', title: 'Erori frecvente în aplicații fonduri - cum să le eviți', category: 'Fonduri EU', categoryId: 'fonduri', author: 'EU.Funds.Expert', authorBadge: 'expert', repliesCount: 29, viewsCount: 1432, lastActivityAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), tags: ['erori', 'aplicații', 'fonduri'] },
  { id: '30', title: 'Start-Up Nation 2026 - așteptări și pregătire', category: 'Fonduri EU', categoryId: 'fonduri', author: 'Entrepreneur.RO', repliesCount: 54, viewsCount: 3214, lastActivityAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), isHot: true, tags: ['Start-Up Nation', '2026', 'antreprenoriat'] },

  // GenAI Topics (10)
  { id: '31', title: 'RO AI Factory - ghid acces HPC și costuri', category: 'GenAI & Tehnologie', categoryId: 'genai', author: 'AI.Engineer', authorBadge: 'expert', repliesCount: 38, viewsCount: 2156, lastActivityAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), isPinned: true, isHot: true, tags: ['RO AI Factory', 'HPC', 'LLM'] },
  { id: '32', title: 'LayoutLMv3 RO-tuned - OCR pentru documente românești', category: 'GenAI & Tehnologie', categoryId: 'genai', author: 'ML.Developer', authorBadge: 'verified', repliesCount: 24, viewsCount: 1432, lastActivityAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), tags: ['LayoutLMv3', 'OCR', 'RO'] },
  { id: '33', title: 'Automatizare contabilitate cu GenAI - 40% eficiență', category: 'GenAI & Tehnologie', categoryId: 'genai', author: 'AI.Accountant', authorBadge: 'expert', repliesCount: 31, viewsCount: 1876, lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), isHot: true, tags: ['GenAI', 'automatizare', 'contabilitate'] },
  { id: '34', title: 'Prophet pentru predicții cash-flow', category: 'GenAI & Tehnologie', categoryId: 'genai', author: 'Data.Scientist', repliesCount: 16, viewsCount: 876, lastActivityAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), tags: ['Prophet', 'predicții', 'cash-flow'] },
  { id: '35', title: 'Fine-tuning Llama3 pentru RAG în limba română', category: 'GenAI & Tehnologie', categoryId: 'genai', author: 'NLP.Expert', authorBadge: 'expert', repliesCount: 27, viewsCount: 1234, lastActivityAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), tags: ['Llama3', 'RAG', 'română'] },
  { id: '36', title: 'spaCy pentru matching CV-uri - tutorial', category: 'GenAI & Tehnologie', categoryId: 'genai', author: 'HR.Tech', authorBadge: 'verified', repliesCount: 19, viewsCount: 765, lastActivityAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), tags: ['spaCy', 'NLP', 'HR'] },
  { id: '37', title: 'Isolation Forest pentru detectare anomalii contabile', category: 'GenAI & Tehnologie', categoryId: 'genai', author: 'ML.Developer', authorBadge: 'verified', repliesCount: 11, viewsCount: 543, lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), tags: ['anomalii', 'ML', 'fraud'] },
  { id: '38', title: 'ChatGPT vs Claude vs Gemini - comparație pentru business', category: 'GenAI & Tehnologie', categoryId: 'genai', author: 'Tech.Reviewer', repliesCount: 45, viewsCount: 2543, lastActivityAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), isHot: true, tags: ['ChatGPT', 'Claude', 'Gemini'] },
  { id: '39', title: 'GDPR și AI - cum să fii conform', category: 'GenAI & Tehnologie', categoryId: 'genai', author: 'DPO.Expert', authorBadge: 'expert', repliesCount: 22, viewsCount: 1098, lastActivityAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), tags: ['GDPR', 'AI', 'conformitate'] },
  { id: '40', title: 'GenAI workloads 40% by 2030 - pregătire', category: 'GenAI & Tehnologie', categoryId: 'genai', author: 'AI.Strategy', authorBadge: 'expert', repliesCount: 18, viewsCount: 876, lastActivityAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), tags: ['GenAI', '2030', 'strategie'] },

  // Tachograph/e-Transport Topics (10)
  { id: '41', title: 'e-Transport €10k - ghid conformitate obligatorie', category: 'e-Transport & Tahograf', categoryId: 'etransport', author: 'Transport.Expert', authorBadge: 'expert', repliesCount: 52, viewsCount: 3456, lastActivityAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), isPinned: true, isHot: true, tags: ['e-Transport', '€10k', 'obligatoriu'] },
  { id: '42', title: 'Tahograf digital - citire și interpretare date DDD', category: 'e-Transport & Tahograf', categoryId: 'etransport', author: 'Fleet.Manager', authorBadge: 'verified', repliesCount: 28, viewsCount: 1876, lastActivityAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), tags: ['tahograf', 'DDD', 'citire'] },
  { id: '43', title: 'Regulamentul EU 561/2006 - ore conducere și pauze', category: 'e-Transport & Tahograf', categoryId: 'etransport', author: 'Legal.Transport', authorBadge: 'expert', repliesCount: 34, viewsCount: 2134, lastActivityAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), tags: ['561/2006', 'ore conducere', 'pauze'] },
  { id: '44', title: 'AI pentru monitorizare flotă - soluții 2026', category: 'e-Transport & Tahograf', categoryId: 'etransport', author: 'Tech.Fleet', repliesCount: 21, viewsCount: 1234, lastActivityAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), tags: ['AI', 'flotă', 'monitorizare'] },
  { id: '45', title: 'Calibrare tahograf - termene și proceduri', category: 'e-Transport & Tahograf', categoryId: 'etransport', author: 'Service.Tech', authorBadge: 'verified', repliesCount: 15, viewsCount: 765, lastActivityAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), tags: ['calibrare', 'tahograf', 'service'] },
  { id: '46', title: 'Penalități e-Transport - ce riscați', category: 'e-Transport & Tahograf', categoryId: 'etransport', author: 'Legal.Expert', authorBadge: 'expert', repliesCount: 39, viewsCount: 2543, lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), isHot: true, tags: ['penalități', 'e-Transport', 'amenzi'] },
  { id: '47', title: 'Integrare API e-Transport cu ERP', category: 'e-Transport & Tahograf', categoryId: 'etransport', author: 'Dev.Integration', repliesCount: 17, viewsCount: 876, lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), tags: ['API', 'ERP', 'integrare'] },
  { id: '48', title: 'Card șofer - procedură obținere și utilizare', category: 'e-Transport & Tahograf', categoryId: 'etransport', author: 'HR.Transport', repliesCount: 23, viewsCount: 1432, lastActivityAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), tags: ['card șofer', 'procedură', 'tahograf'] },
  { id: '49', title: 'Rapoarte tahograf - modele și template-uri', category: 'e-Transport & Tahograf', categoryId: 'etransport', author: 'Admin.Fleet', repliesCount: 12, viewsCount: 654, lastActivityAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(), tags: ['rapoarte', 'template', 'tahograf'] },
  { id: '50', title: 'SVT-like analysis tool - alternativă open source', category: 'e-Transport & Tahograf', categoryId: 'etransport', author: 'Open.Source.Dev', repliesCount: 31, viewsCount: 1876, lastActivityAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), tags: ['SVT', 'open source', 'analiză'] },
];

const categories = [
  { id: 'fiscalitate', name: 'Fiscalitate și TVA', description: 'TVA 21%/11%, dividende 16%, impozite și obligații fiscale', icon: Calculator, color: 'bg-emerald-500', topicsCount: 234, postsCount: 1245 },
  { id: 'hr', name: 'HR & Recrutare', description: 'ATS cu AI, wellness, performance reviews, ABSL BSS', icon: Briefcase, color: 'bg-blue-500', topicsCount: 156, postsCount: 892 },
  { id: 'fonduri', name: 'Fonduri EU', description: 'PNRR €21.6B, DIH4Society, Cohesion €31B, InvestEU', icon: Euro, color: 'bg-purple-500', topicsCount: 189, postsCount: 1034 },
  { id: 'genai', name: 'GenAI & Tehnologie', description: 'RO AI Factory, LayoutLMv3, Prophet, Llama3 RAG', icon: Brain, color: 'bg-pink-500', topicsCount: 98, postsCount: 567 },
  { id: 'etransport', name: 'e-Transport & Tahograf', description: 'e-Transport €10k, date DDD, EU 561/2006, monitorizare flotă', icon: Truck, color: 'bg-orange-500', topicsCount: 87, postsCount: 456 },
  { id: 'efactura', name: 'e-Factura și SPV', description: 'B2B obligatoriu mid-2026, validări XML, integrare SPV', icon: FileText, color: 'bg-indigo-500', topicsCount: 145, postsCount: 789 },
  { id: 'saft', name: 'SAF-T și Raportare', description: 'D406 pilot, structură XML, AIC lunar', icon: TrendingUp, color: 'bg-teal-500', topicsCount: 67, postsCount: 312 },
  { id: 'ajutor', name: 'Ajutor și Suport', description: 'Întrebări generale și suport platformă', icon: HelpCircle, color: 'bg-gray-500', topicsCount: 123, postsCount: 567 },
];

const forumStats = {
  totalTopics: seededTopics.length + 619,
  totalPosts: 4521,
  totalMembers: 2847,
  onlineNow: 127,
};

function formatLastActivity(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 5) return 'Acum';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Ieri';
  return `${diffDays}z`;
}

function getBadgeIcon(badge?: string) {
  switch (badge) {
    case 'expert': return <Award className="w-3 h-3 text-amber-500" />;
    case 'moderator': return <Shield className="w-3 h-3 text-blue-500" />;
    case 'ai': return <Sparkles className="w-3 h-3 text-purple-500" />;
    case 'verified': return <Shield className="w-3 h-3 text-green-500" />;
    default: return null;
  }
}

export default function ForumPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showHotOnly, setShowHotOnly] = useState(false);

  const filteredTopics = useMemo(() => {
    return seededTopics.filter((topic) => {
      const matchesSearch = searchQuery === '' ||
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || topic.categoryId === selectedCategory;
      const matchesHot = !showHotOnly || topic.isHot;
      return matchesSearch && matchesCategory && matchesHot;
    });
  }, [searchQuery, selectedCategory, showHotOnly]);

  const pinnedTopics = filteredTopics.filter(t => t.isPinned);
  const regularTopics = filteredTopics.filter(t => !t.isPinned);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Forum Comunitate
              <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {forumStats.onlineNow} online
              </span>
            </h1>
            <p className="text-slate-600 mt-1">
              Discută cu alți profesioniști despre TVA, HR, fonduri EU, GenAI și mai mult.
            </p>
          </div>
          <Link
            href="/forum/new"
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Subiect Nou
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Caută în forum (ex: TVA 21%, PNRR, GenAI)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowHotOnly(!showHotOnly)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
                showHotOnly ? 'bg-orange-500 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Hot Topics
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                !selectedCategory ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toate
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Topics List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Results Count */}
            <div className="text-sm text-slate-500">
              {filteredTopics.length} discuții găsite
              {searchQuery && ` pentru "${searchQuery}"`}
            </div>

            {/* Pinned Topics */}
            {pinnedTopics.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Fixate</h3>
                {pinnedTopics.map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/forum/topic/${topic.id}`}
                    className="block bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-xl p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">Fixat</span>
                          {topic.isHot && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> Hot
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-slate-900 line-clamp-1">{topic.title}</h4>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            {getBadgeIcon(topic.authorBadge)}
                            {topic.author}
                          </span>
                          <span>{topic.category}</span>
                          <span>{topic.repliesCount} răspunsuri</span>
                          <span>{topic.viewsCount} vizualizări</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatLastActivity(topic.lastActivityAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Regular Topics */}
            <div className="space-y-3">
              {pinnedTopics.length > 0 && regularTopics.length > 0 && (
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-6">Discuții Recente</h3>
              )}
              {regularTopics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/forum/topic/${topic.id}`}
                  className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {topic.isHot && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Hot
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{topic.category}</span>
                      </div>
                      <h4 className="font-semibold text-slate-900 line-clamp-1 hover:text-blue-600 transition">
                        {topic.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          {getBadgeIcon(topic.authorBadge)}
                          {topic.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {topic.repliesCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {topic.viewsCount}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatLastActivity(topic.lastActivityAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filteredTopics.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nu am găsit discuții care să corespundă căutării.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Statistici Forum</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{forumStats.totalTopics}</p>
                  <p className="text-sm text-slate-500">Subiecte</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{forumStats.totalPosts.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">Postări</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{forumStats.totalMembers.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">Membri</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{forumStats.onlineNow}</p>
                  <p className="text-sm text-slate-500">Online acum</p>
                </div>
              </div>
            </div>

            {/* Categories List */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Categorii</h3>
              <div className="space-y-3">
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition text-left ${
                        selectedCategory === category.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`${category.color} p-2 rounded-lg`}>
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">{category.name}</p>
                        <p className="text-xs text-slate-500">{category.topicsCount} subiecte</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Top Contributors */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Top Contributori</h3>
              <div className="space-y-3">
                {[
                  { name: 'Expert.Fiscal', posts: 234, badge: 'expert' },
                  { name: 'EU.Funds.Expert', posts: 189, badge: 'expert' },
                  { name: 'AI.Engineer', posts: 156, badge: 'expert' },
                  { name: 'Transport.Expert', posts: 134, badge: 'expert' },
                  { name: 'HR.Tech', posts: 98, badge: 'verified' },
                ].map((user, index) => (
                  <div key={user.name} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-slate-200 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                        {user.name}
                        {getBadgeIcon(user.badge)}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{user.posts} postări</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
