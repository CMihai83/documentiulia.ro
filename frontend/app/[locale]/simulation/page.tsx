'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  BarChart3,
  Loader2,
  RefreshCw,
  Trash2,
  Factory,
  Euro,
  Package,
  LineChart
} from 'lucide-react';
import {
  getScenarios,
  getUserGames,
  getUserStats,
  startGame,
  deleteGame,
  getIndustryScenarios,
  type SimulationScenario,
  type SimulationGame,
  type UserStats,
  type IndustryScenario
} from '@/lib/api/simulation';

const difficultyColors: Record<string, string> = {
  SIM_TUTORIAL: 'bg-green-100 text-green-700',
  SIM_EASY: 'bg-blue-100 text-blue-700',
  SIM_NORMAL: 'bg-yellow-100 text-yellow-700',
  SIM_HARD: 'bg-red-100 text-red-700',
  SIM_EXPERT: 'bg-purple-100 text-purple-700',
};

const difficultyLabels: Record<string, string> = {
  SIM_TUTORIAL: 'Tutorial',
  SIM_EASY: 'Ușor',
  SIM_NORMAL: 'Normal',
  SIM_HARD: 'Dificil',
  SIM_EXPERT: 'Expert',
};

const scenarioColors: Record<string, string> = {
  'SIM_TUTORIAL': 'from-green-500 to-emerald-600',
  'SIM_CHALLENGE': 'from-orange-500 to-red-600',
  'SIM_COMPLIANCE': 'from-blue-500 to-indigo-600',
  'SIM_FREEPLAY': 'from-purple-500 to-pink-600',
  'SIM_CAPEX': 'from-teal-500 to-cyan-600',
  'SIM_EU_FUNDS': 'from-yellow-500 to-amber-600',
};

const scenarioIcons: Record<string, string> = {
  'prima-mea-firma': '🎓',
  'primii-angajati': '👥',
  'supravietuirea-crizei': '🌪️',
  'crestere-rapida': '🚀',
  'audit-anaf': '📋',
  'mod-liber': '🎮',
};

function getScenarioColor(type: string, slug: string): string {
  if (slug === 'mod-liber') return 'from-cyan-500 to-teal-600';
  return scenarioColors[type] || 'from-purple-500 to-violet-600';
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-400';
  if (score >= 60) return 'bg-yellow-400';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-red-400';
}

export default function SimulationPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [activeGames, setActiveGames] = useState<SimulationGame[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [industryScenarios, setIndustryScenarios] = useState<IndustryScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingGame, setStartingGame] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [scenariosData, gamesData, statsData, industryData] = await Promise.all([
        getScenarios().catch(() => []),
        getUserGames().catch(() => []),
        getUserStats().catch(() => null),
        getIndustryScenarios().catch(() => []),
      ]);
      setScenarios(scenariosData);
      setActiveGames(gamesData.filter(g => g.status === 'SIM_ACTIVE' || g.status === 'SIM_PAUSED'));
      setUserStats(statsData);
      setIndustryScenarios(industryData);
    } catch (err) {
      setError('Eroare la încărcare. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartScenario(scenarioId: string, scenarioSlug: string) {
    setStartingGame(scenarioId);
    try {
      const game = await startGame({ scenarioId });
      router.push(`/simulation/${game.id}`);
    } catch (err) {
      setError('Nu s-a putut porni jocul.');
      setStartingGame(null);
    }
  }

  async function handleStartIndustryGame(industryScenarioId: string) {
    setStartingGame(industryScenarioId);
    try {
      const game = await startGame({ industryScenarioId });
      router.push(`/simulation/${game.id}`);
    } catch (err) {
      setError('Nu s-a putut porni jocul.');
      setStartingGame(null);
    }
  }

  async function handleDeleteGame(gameId: string) {
    if (!confirm('Ești sigur că vrei să ștergi acest joc?')) return;
    try {
      await deleteGame(gameId);
      setActiveGames(prev => prev.filter(g => g.id !== gameId));
    } catch (err) {
      setError('Nu s-a putut șterge jocul.');
    }
  }

  async function handleQuickStart() {
    setStartingGame('quick');
    try {
      const game = await startGame({ name: 'Joc Rapid' });
      router.push(`/simulation/${game.id}`);
    } catch (err) {
      setError('Nu s-a putut porni jocul.');
      setStartingGame(null);
    }
  }

  const filteredScenarios = selectedType === 'all'
    ? scenarios
    : scenarios.filter(s => s.type === selectedType);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Se încarcă simulatorul...</p>
        </div>
      </div>
    );
  }

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
              <button
                onClick={handleQuickStart}
                disabled={startingGame === 'quick'}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
              >
                {startingGame === 'quick' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">72</div>
              <div className="text-slate-400 text-sm">Cursuri Disponibile</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{scenarios.length}</div>
              <div className="text-slate-400 text-sm">Scenarii</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">40+</div>
              <div className="text-slate-400 text-sm">Tipuri de Decizii</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">50+</div>
              <div className="text-slate-400 text-sm">Evenimente Random</div>
            </div>
            {userStats && (
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-400">{userStats.totalXP}</div>
                <div className="text-slate-400 text-sm">XP Total</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-red-300">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>
        </div>
      )}

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
                    Jocuri Active ({activeGames.length})
                  </h2>
                  <button onClick={loadData} className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1">
                    <RefreshCw className="w-4 h-4" />
                    Reîmprospătează
                  </button>
                </div>
                <div className="space-y-3">
                  {activeGames.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between bg-slate-700/50 hover:bg-slate-700 rounded-xl p-4 transition-all group"
                    >
                      <Link href={`/simulation/${game.id}`} className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-2xl">
                          🏢
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {game.name}
                          </div>
                          <div className="text-sm text-slate-400">
                            {game.scenarioTitle || 'Mod Liber'} • Luna {game.currentMonth}, {game.currentYear}
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getScoreColor(game.healthScore)}`}></div>
                            <span className="text-white font-medium">{Math.round(game.healthScore)}%</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {game.status === 'SIM_PAUSED' ? 'Pauză' : 'Activ'}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); handleDeleteGame(game.id); }}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Link href={`/simulation/${game.id}`}>
                          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Industry Quick Start */}
            {industryScenarios.length > 0 && (
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Factory className="w-5 h-5 text-teal-400" />
                  Scenarii pe Industrie
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {industryScenarios.map((industry) => (
                    <button
                      key={industry.id}
                      onClick={() => handleStartIndustryGame(industry.id)}
                      disabled={startingGame === industry.id}
                      className="flex items-center gap-3 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl border border-slate-600 hover:border-teal-500/50 transition-all text-left disabled:opacity-50"
                    >
                      {startingGame === industry.id ? (
                        <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
                      ) : (
                        <Factory className="w-5 h-5 text-teal-400" />
                      )}
                      <div>
                        <div className="font-medium text-white text-sm">{industry.nameRo}</div>
                        <div className="text-xs text-slate-400">{industry.industry}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scenarios */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Scenarii Disponibile</h2>
                <div className="flex gap-2">
                  {['all', 'SIM_TUTORIAL', 'SIM_CHALLENGE', 'SIM_FREEPLAY'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedType === type
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {type === 'all' ? 'Toate' : type === 'SIM_TUTORIAL' ? 'Tutorial' : type === 'SIM_CHALLENGE' ? 'Provocări' : 'Liber'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredScenarios.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
                  <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Nu sunt scenarii disponibile în această categorie.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredScenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden hover:border-purple-500/50 transition-all group"
                    >
                      <div className={`h-2 bg-gradient-to-r ${getScenarioColor(scenario.type, scenario.slug)}`}></div>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-4xl">{scenarioIcons[scenario.slug] || '🎯'}</div>
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
                          {scenario.timeLimit && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {scenario.timeLimit} luni
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            +{scenario.xpReward} XP
                          </div>
                        </div>
                        {scenario.objectives && scenario.objectives.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {scenario.objectives.slice(0, 2).map((obj, i) => (
                              <span key={i} className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">
                                {typeof obj === 'string' ? obj : obj.description}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => handleStartScenario(scenario.id, scenario.slug)}
                          disabled={startingGame === scenario.id}
                          className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${getScenarioColor(scenario.type, scenario.slug)} text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50`}
                        >
                          {startingGame === scenario.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          Începe Scenariul
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Stats */}
            {userStats && (
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Profilul Tău
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Nivel</span>
                    <span className="text-white font-bold">{userStats.playerLevel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Titlu</span>
                    <span className="text-purple-400 font-medium">{userStats.playerTitle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">XP Total</span>
                    <span className="text-yellow-400 font-bold">{userStats.totalXP}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Jocuri</span>
                    <span className="text-white">{userStats.gamesPlayed} ({userStats.gamesCompleted} completate)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Start */}
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/30">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Start Rapid
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                Nu ai jucat niciodată? Începe cu tutorialul nostru ghidat!
              </p>
              <button
                onClick={() => {
                  const tutorial = scenarios.find(s => s.slug === 'prima-mea-firma');
                  if (tutorial) handleStartScenario(tutorial.id, tutorial.slug);
                  else handleQuickStart();
                }}
                disabled={!!startingGame}
                className="w-full flex items-center justify-center gap-2 bg-white text-green-600 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                {startingGame ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Începe Tutorial
              </button>
            </div>

            {/* Decision Types */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Tipuri de Decizii
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-slate-300">Financiar & CAPEX</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-slate-300">Operațiuni & Stocuri</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <Euro className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-slate-300">Fonduri Europene</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <LineChart className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-slate-300">Planificare Producție</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-slate-300">Conformitate ANAF</span>
                </div>
              </div>
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
