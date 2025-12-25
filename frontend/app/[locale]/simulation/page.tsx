'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Trophy,
  Target,
  TrendingUp,
  Users,
  Shield,
  Zap,
  BookOpen,
  Gamepad2,
  Star,
  Clock,
  ChevronRight,
  Plus,
  BarChart3
} from 'lucide-react';

// Simulation scenarios data
const scenarios = [
  {
    id: 'tutorial-prima-firma',
    slug: 'prima-mea-firma',
    title: 'Prima Mea Firmă',
    titleEn: 'My First Company',
    description: 'Învață bazele antreprenoriatului. Pornești cu un SRL nou și 50.000 RON capital. Supraviețuiește 12 luni și atinge profitabilitatea.',
    difficulty: 'TUTORIAL',
    type: 'tutorial',
    duration: '30-45 min',
    objectives: ['Supraviețuiește 12 luni', 'Atinge profit pozitiv', 'Angajează primul salariat'],
    relatedCourses: ['Ghid Complet Înființare', 'Conformitate Legală'],
    xpReward: 500,
    icon: '🎓',
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'tutorial-primii-angajati',
    slug: 'primii-angajati',
    title: 'Primii Angajați',
    titleEn: 'First Employees',
    description: 'Afacerea ta crește și ai nevoie de echipă. Învață să angajezi, să gestionezi salariile și să menții productivitatea.',
    difficulty: 'TUTORIAL',
    type: 'tutorial',
    duration: '20-30 min',
    objectives: ['Angajează 5 salariați', 'Menține productivitatea > 80%', 'Evită fluctuația de personal'],
    relatedCourses: ['HR Management', 'Codul Muncii'],
    xpReward: 400,
    icon: '👥',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'challenge-criza',
    slug: 'supravietuirea-crizei',
    title: 'Supraviețuirea Crizei',
    titleEn: 'Crisis Survival',
    description: 'Afacerea ta este lovită de o criză economică. Veniturile scad cu 40%. Poți supraviețui și te poți recupera?',
    difficulty: 'HARD',
    type: 'challenge',
    duration: '45-60 min',
    objectives: ['Supraviețuiește 6 luni', 'Recuperează la 80% venituri', 'Menține echipa cheie'],
    relatedCourses: ['Risk Management', 'Cash Flow'],
    xpReward: 1000,
    icon: '🌪️',
    color: 'from-red-500 to-rose-600',
  },
  {
    id: 'challenge-crestere',
    slug: 'crestere-rapida',
    title: 'Creștere Rapidă',
    titleEn: 'Rapid Growth',
    description: 'Ai primit o comandă mare! Cererea crește de 3x. Scalează operațiunile fără să pierzi calitatea.',
    difficulty: 'NORMAL',
    type: 'challenge',
    duration: '40-50 min',
    objectives: ['Scalează capacitatea 3x', 'Menține calitatea > 75%', 'Cash flow pozitiv'],
    relatedCourses: ['Operațiuni', 'Finanțare Startup'],
    xpReward: 800,
    icon: '🚀',
    color: 'from-purple-500 to-violet-600',
  },
  {
    id: 'challenge-anaf',
    slug: 'audit-anaf',
    title: 'Audit ANAF',
    titleEn: 'ANAF Audit',
    description: 'ANAF anunță un control fiscal. Ai 3 luni să-ți pui toate documentele în ordine și să treci auditul.',
    difficulty: 'HARD',
    type: 'compliance',
    duration: '30-40 min',
    objectives: ['Pregătește documentația', 'Treci auditul cu < 5% penalități', 'Implementează SAF-T D406'],
    relatedCourses: ['Conformitate Legală', 'SAF-T România'],
    xpReward: 900,
    icon: '📋',
    color: 'from-orange-500 to-amber-600',
  },
  {
    id: 'freeplay',
    slug: 'mod-liber',
    title: 'Mod Liber',
    titleEn: 'Free Play',
    description: 'Construiește-ți afacerea așa cum vrei tu. Fără obiective fixe, fără limite de timp. Experimentează și învață!',
    difficulty: 'EASY',
    type: 'freeplay',
    duration: 'Nelimitat',
    objectives: ['Joacă-te liber', 'Experimentează strategii', 'Învață din greșeli'],
    relatedCourses: ['Toate cursurile'],
    xpReward: 100,
    icon: '🎮',
    color: 'from-cyan-500 to-teal-600',
  },
];

const difficultyColors: Record<string, string> = {
  TUTORIAL: 'bg-green-100 text-green-700',
  EASY: 'bg-blue-100 text-blue-700',
  NORMAL: 'bg-yellow-100 text-yellow-700',
  HARD: 'bg-red-100 text-red-700',
  EXPERT: 'bg-purple-100 text-purple-700',
};

const difficultyLabels: Record<string, string> = {
  TUTORIAL: 'Tutorial',
  EASY: 'Ușor',
  NORMAL: 'Normal',
  HARD: 'Dificil',
  EXPERT: 'Expert',
};

// Mock active games
const activeGames = [
  {
    id: 'game-1',
    name: 'SRL-ul Meu',
    scenario: 'Prima Mea Firmă',
    month: 4,
    year: 2025,
    healthScore: 78,
    lastPlayed: '2 ore în urmă',
  },
];

// Mock achievements
const recentAchievements = [
  { id: 'ach-1', title: 'Prima Vânzare', icon: '💰', date: 'Ieri' },
  { id: 'ach-2', title: 'Primul Angajat', icon: '👤', date: 'Acum 3 zile' },
];

export default function SimulationPage() {
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredScenarios = selectedType === 'all'
    ? scenarios
    : scenarios.filter(s => s.type === selectedType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-2 mb-6">
              <Gamepad2 className="w-5 h-5 text-purple-400" />
              <span className="text-purple-300 font-medium">Business Simulation</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Simulator de
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Afaceri</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
              Aplică cunoștințele din cursuri în scenarii reale de business.
              Ia decizii strategice și vezi cum afectează afacerea ta în timp real.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-purple-500/25">
                <Play className="w-5 h-5" />
                Începe Simularea
              </button>
              <Link
                href="/courses"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all border border-white/20"
              >
                <BookOpen className="w-5 h-5" />
                Vezi Cursurile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-slate-800/50 border-y border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">72</div>
              <div className="text-slate-400 text-sm">Cursuri Disponibile</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">6</div>
              <div className="text-slate-400 text-sm">Scenarii</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">25+</div>
              <div className="text-slate-400 text-sm">Tipuri de Decizii</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">50+</div>
              <div className="text-slate-400 text-sm">Evenimente Random</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Active Games */}
            {activeGames.length > 0 && (
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Play className="w-5 h-5 text-green-400" />
                    Jocuri Active
                  </h2>
                  <Link href="/simulation/history" className="text-purple-400 hover:text-purple-300 text-sm">
                    Vezi istoricul
                  </Link>
                </div>
                <div className="space-y-3">
                  {activeGames.map((game) => (
                    <Link
                      key={game.id}
                      href={`/simulation/${game.id}`}
                      className="flex items-center justify-between bg-slate-700/50 hover:bg-slate-700 rounded-xl p-4 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-2xl">
                          🏢
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {game.name}
                          </div>
                          <div className="text-sm text-slate-400">
                            {game.scenario} • Luna {game.month}, {game.year}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${game.healthScore > 70 ? 'bg-green-400' : game.healthScore > 40 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                            <span className="text-white font-medium">{game.healthScore}%</span>
                          </div>
                          <div className="text-xs text-slate-500">{game.lastPlayed}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Scenarios */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Scenarii Disponibile</h2>
                <div className="flex gap-2">
                  {['all', 'tutorial', 'challenge', 'freeplay'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedType === type
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {type === 'all' ? 'Toate' : type === 'tutorial' ? 'Tutorial' : type === 'challenge' ? 'Provocări' : 'Liber'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {filteredScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden hover:border-purple-500/50 transition-all group"
                  >
                    <div className={`h-2 bg-gradient-to-r ${scenario.color}`}></div>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-4xl">{scenario.icon}</div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[scenario.difficulty]}`}>
                            {difficultyLabels[scenario.difficulty]}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                        {scenario.title}
                      </h3>
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                        {scenario.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {scenario.duration}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400" />
                          +{scenario.xpReward} XP
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {scenario.objectives.slice(0, 2).map((obj, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">
                            {obj}
                          </span>
                        ))}
                      </div>
                      <Link
                        href={`/simulation/new?scenario=${scenario.slug}`}
                        className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${scenario.color} text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity`}
                      >
                        <Play className="w-4 h-4" />
                        Începe Scenariul
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Start */}
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Start Rapid
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                Nu ai jucat niciodată? Începe cu tutorialul nostru ghidat!
              </p>
              <Link
                href="/simulation/new?scenario=prima-mea-firma"
                className="w-full flex items-center justify-center gap-2 bg-white text-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
              >
                <Play className="w-4 h-4" />
                Începe Tutorial
              </Link>
            </div>

            {/* Learning Integration */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                Învață + Aplică
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Simulatorul este integrat cu cursurile noastre LMS. Primești recomandări bazate pe lecțiile parcurse.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-slate-300">72 cursuri disponibile</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-slate-300">1,856 lecții cu conținut</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-slate-300">Conformitate ANAF integrată</span>
                </div>
              </div>
            </div>

            {/* Recent Achievements */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Realizări Recente
              </h3>
              {recentAchievements.length > 0 ? (
                <div className="space-y-3">
                  {recentAchievements.map((ach) => (
                    <div key={ach.id} className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
                      <div className="text-2xl">{ach.icon}</div>
                      <div>
                        <div className="font-medium text-white">{ach.title}</div>
                        <div className="text-xs text-slate-500">{ach.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">
                  Începe să joci pentru a debloca realizări!
                </p>
              )}
            </div>

            {/* Features */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Funcționalități</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-white">Decizii în Timp Real</div>
                    <div className="text-sm text-slate-400">Vezi impactul instant al deciziilor tale</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-white">Date Reale</div>
                    <div className="text-sm text-slate-400">Importă datele firmei tale ca punct de start</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-white">AI Advisor</div>
                    <div className="text-sm text-slate-400">Recomandări inteligente bazate pe cursuri</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
