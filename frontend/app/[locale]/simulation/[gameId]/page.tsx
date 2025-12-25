'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Play,
  Pause,
  FastForward,
  Settings,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Package,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Building2,
  Target,
  Trophy,
  Clock,
  Lightbulb,
  BookOpen,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Shield,
  Banknote,
  Receipt,
  Calculator
} from 'lucide-react';

// Mock game state
const initialGameState = {
  id: 'game-1',
  name: 'SRL-ul Meu Tech',
  scenario: 'Prima Mea Firmă',
  currentMonth: 4,
  currentYear: 2025,
  status: 'ACTIVE',
  difficulty: 'TUTORIAL',

  // Scores
  healthScore: 78,
  financialScore: 82,
  operationsScore: 75,
  complianceScore: 85,
  growthScore: 70,

  // Financial
  cash: 45000,
  revenue: 28000,
  expenses: 22000,
  profit: 6000,
  receivables: 12000,
  payables: 8000,
  loans: 0,

  // Operations
  employees: 3,
  capacity: 100,
  utilization: 65,
  quality: 82,

  // Market
  marketShare: 0.8,
  customerCount: 45,
  reputation: 68,

  // Compliance
  taxOwed: 1500,
  vatBalance: 4200,
  penaltiesRisk: 5,
  auditRisk: 8,
};

// Decision categories with options
const decisionCategories = [
  {
    id: 'financial',
    name: 'Financiar',
    icon: Wallet,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    decisions: [
      { id: 'set_prices', name: 'Modifică Prețurile', description: 'Ajustează prețurile produselor/serviciilor' },
      { id: 'take_loan', name: 'Ia un Credit', description: 'Obține finanțare de la bancă' },
      { id: 'collect_receivables', name: 'Colectează Creanțe', description: 'Intensifică eforturile de colectare' },
      { id: 'pay_suppliers', name: 'Plătește Furnizorii', description: 'Achită facturile restante' },
    ],
  },
  {
    id: 'operations',
    name: 'Operațiuni',
    icon: Package,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    decisions: [
      { id: 'hire_employee', name: 'Angajează', description: 'Adaugă un nou membru în echipă' },
      { id: 'buy_equipment', name: 'Cumpără Echipament', description: 'Investește în echipamente noi' },
      { id: 'order_inventory', name: 'Comandă Stocuri', description: 'Reaprovizionează inventarul' },
      { id: 'improve_quality', name: 'Îmbunătățește Calitatea', description: 'Investește în controlul calității' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: TrendingUp,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    decisions: [
      { id: 'run_campaign', name: 'Campanie Marketing', description: 'Lansează o campanie publicitară' },
      { id: 'social_media', name: 'Social Media', description: 'Intensifică prezența online' },
      { id: 'discount_promotion', name: 'Promoție Discount', description: 'Oferă reduceri temporare' },
      { id: 'referral_program', name: 'Program Recomandări', description: 'Recompensează clienții loiali' },
    ],
  },
  {
    id: 'compliance',
    name: 'Conformitate',
    icon: Shield,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    decisions: [
      { id: 'pay_taxes', name: 'Plătește Taxele', description: 'Achită obligațiile fiscale' },
      { id: 'submit_vat', name: 'Depune Decont TVA', description: 'Trimite decontul lunar TVA' },
      { id: 'prepare_audit', name: 'Pregătește Audit', description: 'Organizează documentația' },
      { id: 'saft_report', name: 'Raport SAF-T D406', description: 'Generează și trimite SAF-T' },
    ],
  },
];

// Mock pending event
const pendingEvent = {
  id: 'event-1',
  type: 'OPPORTUNITY',
  title: 'Contract Mare Disponibil',
  description: 'Un client important dorește să semneze un contract pe 12 luni în valoare de 50.000 RON. Necesită capacitate suplimentară și un angajat nou.',
  severity: 'MEDIUM',
  deadline: 2,
  options: [
    { id: 'accept', label: 'Acceptă Contractul', impact: { revenue: 50000, employees: 1, capacity: -20 } },
    { id: 'negotiate', label: 'Negociază Termenii', impact: { revenue: 35000, employees: 0, capacity: -10 } },
    { id: 'decline', label: 'Refuză Oferta', impact: { reputation: -5 } },
  ],
};

// AI Recommendation
const aiRecommendation = {
  title: 'Recomandare AI',
  content: 'Pe baza situației tale financiare actuale, îți recomand să te concentrezi pe colectarea creanțelor înainte de a angaja personal nou. Cash flow-ul pozitiv este esențial.',
  relatedCourse: {
    title: 'Managementul Cash Flow-ului',
    lessonId: 'lesson-cf-1',
  },
  confidence: 85,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function SimulationGamePage() {
  const params = useParams();
  const [gameState, setGameState] = useState(initialGameState);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showEvent, setShowEvent] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showAITip, setShowAITip] = useState(true);

  const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const handleDecision = (categoryId: string, decisionId: string) => {
    console.log(`Decision: ${categoryId} - ${decisionId}`);
    // In real implementation, this would call the backend API
    setSelectedCategory(null);
  };

  const handleEventChoice = (optionId: string) => {
    console.log(`Event choice: ${optionId}`);
    setShowEvent(false);
  };

  const advanceMonth = () => {
    setGameState(prev => ({
      ...prev,
      currentMonth: prev.currentMonth === 12 ? 1 : prev.currentMonth + 1,
      currentYear: prev.currentMonth === 12 ? prev.currentYear + 1 : prev.currentYear,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Bar */}
      <div className="bg-slate-800/80 border-b border-slate-700 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/simulation" className="text-slate-400 hover:text-white transition-colors">
                ← Înapoi
              </Link>
              <div className="h-6 w-px bg-slate-700"></div>
              <div>
                <h1 className="font-bold text-white">{gameState.name}</h1>
                <div className="text-sm text-slate-400">{gameState.scenario}</div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Time Controls */}
              <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg px-4 py-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-mono text-white">
                  {months[gameState.currentMonth - 1]} {gameState.currentYear}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`p-1 rounded ${isPaused ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-300'} hover:opacity-80`}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={advanceMonth}
                    className="p-1 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Health Score */}
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-400" />
                <div className={`text-2xl font-bold ${getScoreColor(gameState.healthScore)}`}>
                  {gameState.healthScore}%
                </div>
              </div>

              <button className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Event Modal */}
        {showEvent && pendingEvent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl max-w-lg w-full border border-slate-700 shadow-2xl">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-xs text-yellow-400 uppercase font-medium">Oportunitate</div>
                    <h3 className="text-xl font-bold text-white">{pendingEvent.title}</h3>
                  </div>
                </div>
                <p className="text-slate-300 mb-6">{pendingEvent.description}</p>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                  <Clock className="w-4 h-4" />
                  <span>Termen: {pendingEvent.deadline} luni</span>
                </div>
                <div className="space-y-3">
                  {pendingEvent.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleEventChoice(option.id)}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-purple-500/50 transition-all group"
                    >
                      <span className="font-medium text-white group-hover:text-purple-300">{option.label}</span>
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Column - Scores & Metrics */}
          <div className="space-y-6">
            {/* Score Cards */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Scoruri Business
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Financiar', score: gameState.financialScore, icon: Wallet },
                  { label: 'Operațiuni', score: gameState.operationsScore, icon: Package },
                  { label: 'Conformitate', score: gameState.complianceScore, icon: Shield },
                  { label: 'Creștere', score: gameState.growthScore, icon: TrendingUp },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 ${getScoreColor(item.score)}`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-300">{item.label}</span>
                        <span className={`text-sm font-medium ${getScoreColor(item.score)}`}>{item.score}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getScoreBgColor(item.score)} transition-all`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                Metrici Cheie
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Angajați</span>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium">{gameState.employees}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Clienți</span>
                  <span className="text-white font-medium">{gameState.customerCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Utilizare Capacitate</span>
                  <span className="text-white font-medium">{gameState.utilization}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Reputație</span>
                  <span className="text-white font-medium">{gameState.reputation}/100</span>
                </div>
              </div>
            </div>

            {/* AI Recommendation */}
            {showAITip && (
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <span className="font-medium text-white">{aiRecommendation.title}</span>
                  </div>
                  <button
                    onClick={() => setShowAITip(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-300 mb-3">{aiRecommendation.content}</p>
                <div className="flex items-center justify-between">
                  <Link
                    href={`/courses/lesson/${aiRecommendation.relatedCourse.lessonId}`}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    {aiRecommendation.relatedCourse.title}
                  </Link>
                  <span className="text-xs text-slate-500">{aiRecommendation.confidence}% încredere</span>
                </div>
              </div>
            )}
          </div>

          {/* Center - Main Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Financial Overview */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-400" />
                Situație Financiară
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <div className="text-sm text-slate-400 mb-1">Cash</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(gameState.cash)}</div>
                  <div className="flex items-center gap-1 text-sm text-green-400">
                    <ArrowUp className="w-3 h-3" />
                    +12% lunar
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <div className="text-sm text-slate-400 mb-1">Venituri</div>
                  <div className="text-2xl font-bold text-green-400">{formatCurrency(gameState.revenue)}</div>
                  <div className="flex items-center gap-1 text-sm text-green-400">
                    <ArrowUp className="w-3 h-3" />
                    +8% lunar
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <div className="text-sm text-slate-400 mb-1">Cheltuieli</div>
                  <div className="text-2xl font-bold text-red-400">{formatCurrency(gameState.expenses)}</div>
                  <div className="flex items-center gap-1 text-sm text-red-400">
                    <ArrowUp className="w-3 h-3" />
                    +5% lunar
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-sm text-slate-400">Profit</div>
                  <div className={`font-bold ${gameState.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(gameState.profit)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-400">Creanțe</div>
                  <div className="font-bold text-yellow-400">{formatCurrency(gameState.receivables)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-400">Datorii</div>
                  <div className="font-bold text-orange-400">{formatCurrency(gameState.payables)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-400">Împrumuturi</div>
                  <div className="font-bold text-slate-300">{formatCurrency(gameState.loans)}</div>
                </div>
              </div>
            </div>

            {/* Decision Categories */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Ia o Decizie
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {decisionCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                      selectedCategory === category.id
                        ? 'bg-purple-500/20 border-purple-500/50'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className={`w-10 h-10 ${category.bgColor} rounded-lg flex items-center justify-center`}>
                      <category.icon className={`w-5 h-5 ${category.color}`} />
                    </div>
                    <span className="font-medium text-white">{category.name}</span>
                  </button>
                ))}
              </div>

              {/* Decision Options */}
              {selectedCategory && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="grid grid-cols-2 gap-3">
                    {decisionCategories
                      .find(c => c.id === selectedCategory)
                      ?.decisions.map((decision) => (
                        <button
                          key={decision.id}
                          onClick={() => handleDecision(selectedCategory, decision.id)}
                          className="text-left p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 hover:border-purple-500/50 transition-all group"
                        >
                          <div className="font-medium text-white group-hover:text-purple-300 mb-1">
                            {decision.name}
                          </div>
                          <div className="text-sm text-slate-400">
                            {decision.description}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Compliance & Alerts */}
          <div className="space-y-6">
            {/* Compliance Status */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Conformitate ANAF
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Taxe de Plătit</span>
                  <span className="text-orange-400 font-medium">{formatCurrency(gameState.taxOwed)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Sold TVA</span>
                  <span className="text-blue-400 font-medium">{formatCurrency(gameState.vatBalance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Risc Penalități</span>
                  <span className={`font-medium ${gameState.penaltiesRisk > 20 ? 'text-red-400' : 'text-green-400'}`}>
                    {gameState.penaltiesRisk}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Risc Audit</span>
                  <span className={`font-medium ${gameState.auditRisk > 15 ? 'text-orange-400' : 'text-green-400'}`}>
                    {gameState.auditRisk}%
                  </span>
                </div>
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alerte
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div className="text-sm">
                    <div className="text-yellow-300 font-medium">Termen TVA</div>
                    <div className="text-yellow-400/70">Decont TVA în 5 zile</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Receipt className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <div className="text-blue-300 font-medium">Creanțe Restante</div>
                    <div className="text-blue-400/70">3 facturi neîncasate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Objectives */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Obiective Scenariu
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-slate-300 text-sm line-through">Supraviețuiește 3 luni</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-500 rounded-full"></div>
                  <span className="text-slate-300 text-sm">Atinge profit pozitiv</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-500 rounded-full"></div>
                  <span className="text-slate-300 text-sm">Angajează primul salariat</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Progres</span>
                  <span className="text-purple-400 font-medium">1/3 completat</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
