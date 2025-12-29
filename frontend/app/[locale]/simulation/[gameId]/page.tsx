'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  ArrowUp,
  ArrowDown,
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
  Calculator,
  Loader2,
  RefreshCw,
  StopCircle,
  Euro,
  Factory,
  LineChart
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  getGameDetails,
  advanceMonth,
  makeDecision,
  respondToEvent,
  pauseGame,
  resumeGame,
  endGame,
  getAvailableDecisions,
  getPendingEvents,
  getAIRecommendations,
  type GameDetails,
  type SimulationEvent,
  type AvailableDecision,
  type HealthScores,
  type AIRecommendation
} from '@/lib/api/simulation';

// Decision categories with icons
const decisionCategoryInfo: Record<string, { name: string; icon: typeof Wallet; color: string; bgColor: string }> = {
  'FINANCIAL': { name: 'Financiar', icon: Wallet, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'OPERATIONS': { name: 'Operațiuni', icon: Package, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'HR': { name: 'Resurse Umane', icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'MARKETING': { name: 'Marketing', icon: TrendingUp, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  'COMPLIANCE': { name: 'Conformitate', icon: Shield, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  'GROWTH': { name: 'Creștere & CAPEX', icon: Factory, color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  'RISK': { name: 'Risc', icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/20' },
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

const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SimulationGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [gameDetails, setGameDetails] = useState<GameDetails | null>(null);
  const [decisions, setDecisions] = useState<AvailableDecision[]>([]);
  const [pendingEvents, setPendingEvents] = useState<SimulationEvent[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<AvailableDecision | null>(null);
  const [decisionParams, setDecisionParams] = useState<Record<string, unknown>>({});
  const [showEventModal, setShowEventModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<SimulationEvent | null>(null);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadGameData = useCallback(async () => {
    try {
      const [details, availableDecisions, events] = await Promise.all([
        getGameDetails(gameId),
        getAvailableDecisions(gameId),
        getPendingEvents(gameId),
      ]);
      setGameDetails(details);
      setDecisions(availableDecisions);
      setPendingEvents(events);

      // Show first pending event if any
      if (events.length > 0 && !currentEvent) {
        setCurrentEvent(events[0]);
        setShowEventModal(true);
      }
    } catch (err) {
      setError('Nu s-au putut încărca datele jocului.');
    } finally {
      setLoading(false);
    }
  }, [gameId, currentEvent]);

  useEffect(() => {
    loadGameData();
  }, [loadGameData]);

  async function handleAdvanceMonth() {
    if (!gameDetails) return;
    setActionLoading('advance');
    setError(null);

    try {
      const result = await advanceMonth(gameId);
      setSuccessMessage(`Luna ${result.newMonth}/${result.newYear} - ${result.achievements.length > 0 ? `Realizări noi: ${result.achievements.join(', ')}` : 'Succes!'}`);

      // Update game details
      await loadGameData();

      // Fetch AI recommendations after advancing month
      try {
        const recommendations = await getAIRecommendations(gameId);
        if (recommendations && recommendations.length > 0) {
          setAiRecommendations(recommendations);
          setShowAIRecommendations(true);
        }
      } catch (aiErr) {
        console.error('Failed to load AI recommendations:', aiErr);
        // Don't show error to user, AI recommendations are optional
      }

      // Show triggered events
      if (result.events.length > 0) {
        // Events are saved to pendingEvents via loadGameData
      }

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Eroare la avansare.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMakeDecision() {
    if (!selectedDecision) return;
    setActionLoading('decision');
    setError(null);

    try {
      const result = await makeDecision(gameId, selectedDecision.id, decisionParams);
      if (result.success) {
        setSuccessMessage(result.message);
        setSelectedDecision(null);
        setSelectedCategory(null);
        setDecisionParams({});
        await loadGameData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Decizia nu a putut fi aplicată.');
      }
    } catch (err: any) {
      setError(err.message || 'Eroare la aplicare decizie.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEventResponse(eventId: string, responseId: string) {
    setActionLoading('event');
    setError(null);

    try {
      await respondToEvent(gameId, eventId, responseId);
      setShowEventModal(false);
      setCurrentEvent(null);
      setSuccessMessage('Răspuns înregistrat!');
      await loadGameData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Eroare la răspuns.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleTogglePause() {
    if (!gameDetails) return;
    setActionLoading('pause');

    try {
      if (gameDetails.status === 'SIM_PAUSED') {
        await resumeGame(gameId);
      } else {
        await pauseGame(gameId);
      }
      await loadGameData();
    } catch (err: any) {
      setError(err.message || 'Eroare la pauză.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEndGame() {
    if (!confirm('Ești sigur că vrei să închei jocul?')) return;
    setActionLoading('end');

    try {
      const result = await endGame(gameId);
      router.push(`/simulation?completed=${gameId}`);
    } catch (err: any) {
      setError(err.message || 'Eroare la încheiere.');
    } finally {
      setActionLoading(null);
    }
  }

  // Group decisions by category
  const decisionsByCategory = decisions.reduce((acc, d) => {
    const cat = d.category || 'OTHER';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {} as Record<string, AvailableDecision[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Se încarcă jocul...</p>
        </div>
      </div>
    );
  }

  if (!gameDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-slate-300 mb-4">Jocul nu a fost găsit.</p>
          <Link href="/simulation" className="text-purple-400 hover:text-purple-300">
            ← Înapoi la simulări
          </Link>
        </div>
      </div>
    );
  }

  const state = gameDetails.state;
  const isPaused = gameDetails.status === 'SIM_PAUSED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Bar */}
      <div className="bg-slate-800/80 border-b border-slate-700 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/simulation" className="text-slate-400 hover:text-white transition-colors">
                ← Înapoi
              </Link>
              <div className="h-6 w-px bg-slate-700"></div>
              <div>
                <h1 className="font-bold text-white">{gameDetails.name}</h1>
                <div className="text-sm text-slate-400">{gameDetails.scenarioTitle || 'Mod Liber'}</div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Time Controls */}
              <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg px-4 py-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-mono text-white">
                  {months[gameDetails.currentMonth - 1]} {gameDetails.currentYear}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={handleTogglePause}
                    disabled={actionLoading === 'pause'}
                    className={`p-1 rounded ${isPaused ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-300'} hover:opacity-80 disabled:opacity-50`}
                  >
                    {actionLoading === 'pause' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isPaused ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleAdvanceMonth}
                    disabled={actionLoading === 'advance' || isPaused}
                    className="p-1 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50"
                  >
                    {actionLoading === 'advance' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FastForward className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Health Score */}
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-400" />
                <div className={`text-2xl font-bold ${getScoreColor(gameDetails.healthScore)}`}>
                  {Math.round(gameDetails.healthScore)}%
                </div>
              </div>

              <button
                onClick={handleEndGame}
                disabled={!!actionLoading}
                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
                title="Încheie Jocul"
              >
                <StopCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {(error || successMessage) && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-red-300">{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
            </div>
          )}
          {successMessage && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-green-300">{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-300">✕</button>
            </div>
          )}
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && currentEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-lg w-full border border-slate-700 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <div className="text-xs text-yellow-400 uppercase font-medium">{currentEvent.type}</div>
                  <h3 className="text-xl font-bold text-white">{currentEvent.title}</h3>
                </div>
              </div>
              <p className="text-slate-300 mb-6">{currentEvent.description}</p>

              {currentEvent.responseOptions && currentEvent.responseOptions.length > 0 ? (
                <div className="space-y-3">
                  {currentEvent.responseOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleEventResponse(currentEvent.id, option.id)}
                      disabled={actionLoading === 'event'}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-purple-500/50 transition-all group disabled:opacity-50"
                    >
                      <span className="font-medium text-white group-hover:text-purple-300">
                        {option.labelRo || option.label}
                      </span>
                      {actionLoading === 'event' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => { setShowEventModal(false); setCurrentEvent(null); }}
                  className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
                >
                  Continuă
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendations Modal */}
      {showAIRecommendations && aiRecommendations.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Recomandări AI</h3>
                    <p className="text-sm text-slate-400">Decizii sugerate bazate pe situația actuală</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIRecommendations(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <span className="text-slate-400 text-2xl">×</span>
                </button>
              </div>

              <div className="space-y-4">
                {aiRecommendations.map((rec, idx) => {
                  const categoryInfo = decisionCategoryInfo[rec.decision.category] || decisionCategoryInfo['FINANCIAL'];
                  const Icon = categoryInfo.icon;
                  const priorityColors = {
                    high: 'border-red-500/50 bg-red-500/10',
                    medium: 'border-yellow-500/50 bg-yellow-500/10',
                    low: 'border-blue-500/50 bg-blue-500/10',
                  };

                  return (
                    <div
                      key={idx}
                      className={`border rounded-xl p-4 ${priorityColors[rec.priority]}`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 ${categoryInfo.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${categoryInfo.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white">{rec.decision.nameRo}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              rec.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                              rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {rec.priority === 'high' ? 'Prioritate Mare' : rec.priority === 'medium' ? 'Prioritate Medie' : 'Prioritate Mică'}
                            </span>
                            <span className="text-xs text-slate-500 ml-auto">Încredere: {Math.round(rec.confidence * 100)}%</span>
                          </div>
                          <p className="text-sm text-slate-300 mb-2">{rec.reasoning}</p>

                          {/* Expected Impact */}
                          {(Object.keys(rec.expectedImpact.shortTerm).length > 0 || Object.keys(rec.expectedImpact.longTerm).length > 0) && (
                            <div className="mt-3 p-3 bg-slate-700/30 rounded-lg">
                              <div className="text-xs font-medium text-slate-400 mb-2">Impact Estimat:</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(rec.expectedImpact.shortTerm).length > 0 && (
                                  <div>
                                    <span className="text-green-400">Termen Scurt:</span>
                                    <div className="text-slate-300">
                                      {Object.entries(rec.expectedImpact.shortTerm).map(([key, value]) => (
                                        <div key={key}>{key}: {value > 0 ? '+' : ''}{value}%</div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {Object.entries(rec.expectedImpact.longTerm).length > 0 && (
                                  <div>
                                    <span className="text-blue-400">Termen Lung:</span>
                                    <div className="text-slate-300">
                                      {Object.entries(rec.expectedImpact.longTerm).map(([key, value]) => (
                                        <div key={key}>{key}: {value > 0 ? '+' : ''}{value}%</div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Risk Assessment */}
                          {rec.riskAssessment && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-slate-400">Risc:</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                rec.riskAssessment.level === 'high' ? 'bg-red-500/20 text-red-300' :
                                rec.riskAssessment.level === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-green-500/20 text-green-300'
                              }`}>
                                {rec.riskAssessment.level === 'high' ? 'Mare' : rec.riskAssessment.level === 'medium' ? 'Mediu' : 'Mic'}
                              </span>
                            </div>
                          )}

                          {/* Related Courses */}
                          {rec.relatedCourses && rec.relatedCourses.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-600">
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="w-4 h-4 text-purple-400" />
                                <span className="text-xs font-medium text-purple-300">Cursuri Recomandate:</span>
                              </div>
                              <div className="space-y-1">
                                {rec.relatedCourses.slice(0, 2).map((course, cidx) => (
                                  <div key={cidx} className="text-xs text-slate-400">
                                    • {course.title} <span className="text-purple-400">({Math.round(course.relevance * 100)}% relevant)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowAIRecommendations(false)}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
                >
                  Am Înțeles
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Parameter Modal */}
      {selectedDecision && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-lg w-full border border-slate-700 shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">{selectedDecision.nameRo}</h3>
              <p className="text-slate-400 mb-6">{selectedDecision.descriptionRo}</p>

              {selectedDecision.parameters && selectedDecision.parameters.length > 0 && (
                <div className="space-y-4 mb-6">
                  {selectedDecision.parameters.map((param) => (
                    <div key={param.name}>
                      <label className="block text-sm text-slate-300 mb-2">
                        {param.name} {param.unit && `(${param.unit})`}
                      </label>
                      {param.type === 'select' ? (
                        <select
                          value={(decisionParams[param.name] as string) || param.default as string}
                          onChange={(e) => setDecisionParams({ ...decisionParams, [param.name]: e.target.value })}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                        >
                          {param.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          min={param.min}
                          max={param.max}
                          value={(decisionParams[param.name] as number) || param.default as number}
                          onChange={(e) => setDecisionParams({ ...decisionParams, [param.name]: parseFloat(e.target.value) })}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setSelectedDecision(null); setDecisionParams({}); }}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={handleMakeDecision}
                  disabled={actionLoading === 'decision'}
                  className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === 'decision' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Aplică Decizia'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
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
                  { label: 'Financiar', score: gameDetails.financialScore, icon: Wallet },
                  { label: 'Operațiuni', score: gameDetails.operationsScore, icon: Package },
                  { label: 'Conformitate', score: gameDetails.complianceScore, icon: Shield },
                  { label: 'Creștere', score: gameDetails.growthScore, icon: TrendingUp },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 ${getScoreColor(item.score)}`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-300">{item.label}</span>
                        <span className={`text-sm font-medium ${getScoreColor(item.score)}`}>{Math.round(item.score)}%</span>
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
            {state && (
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
                      <span className="text-white font-medium">{state.employees}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Clienți</span>
                    <span className="text-white font-medium">{state.customerCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Utilizare Capacitate</span>
                    <span className="text-white font-medium">{Math.round(state.utilization)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Reputație</span>
                    <span className="text-white font-medium">{Math.round(state.reputation)}/100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Calitate</span>
                    <span className="text-white font-medium">{Math.round(state.quality)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Achievements */}
            {gameDetails.achievements.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  Realizări ({gameDetails.achievements.length})
                </h3>
                <div className="space-y-2">
                  {gameDetails.achievements.slice(0, 5).map((ach) => (
                    <div key={ach.id} className="flex items-center gap-2 text-sm">
                      <span className="text-xl">{ach.icon}</span>
                      <span className="text-slate-300">{ach.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Charts */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analize Avansate
              </h3>

              {/* Financial Trend Chart */}
              <div className="mb-6">
                <h4 className="text-xs font-medium text-slate-300 mb-3">Evoluție Financiară</h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { month: 'Curent', cash: state?.cash || 0, revenue: state?.revenue || 0, expenses: state?.expenses || 0 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="expenses" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Operational Metrics */}
              <div className="mb-6">
                <h4 className="text-xs font-medium text-slate-300 mb-3">Metrici Operaționale</h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      {
                        name: 'Performanță',
                        utilizare: state?.utilization || 0,
                        calitate: state?.quality || 0,
                        reputatie: state?.reputation || 0
                      }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="utilizare" fill="#3B82F6" />
                      <Bar dataKey="calitate" fill="#10B981" />
                      <Bar dataKey="reputatie" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Health Score Breakdown */}
              <div>
                <h4 className="text-xs font-medium text-slate-300 mb-3">Ponderi Scor Sănătate</h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: 'Financiar', value: gameDetails.financialScore, fill: '#10B981' },
                          { name: 'Operațiuni', value: gameDetails.operationsScore, fill: '#3B82F6' },
                          { name: 'Conformitate', value: gameDetails.complianceScore, fill: '#F59E0B' },
                          { name: 'Creștere', value: gameDetails.growthScore, fill: '#8B5CF6' },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { name: 'Financiar', value: gameDetails.financialScore, fill: '#10B981' },
                          { name: 'Operațiuni', value: gameDetails.operationsScore, fill: '#3B82F6' },
                          { name: 'Conformitate', value: gameDetails.complianceScore, fill: '#F59E0B' },
                          { name: 'Creștere', value: gameDetails.growthScore, fill: '#8B5CF6' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '10px', color: '#9CA3AF' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Main Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Financial Overview */}
            {state && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-green-400" />
                  Situație Financiară
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <div className="text-sm text-slate-400 mb-1">Cash</div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(state.cash)}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <div className="text-sm text-slate-400 mb-1">Venituri</div>
                    <div className="text-2xl font-bold text-green-400">{formatCurrency(state.revenue)}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <div className="text-sm text-slate-400 mb-1">Cheltuieli</div>
                    <div className="text-2xl font-bold text-red-400">{formatCurrency(state.expenses)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-sm text-slate-400">Profit</div>
                    <div className={`font-bold ${state.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(state.profit)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-400">Creanțe</div>
                    <div className="font-bold text-yellow-400">{formatCurrency(state.receivables)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-400">Datorii</div>
                    <div className="font-bold text-orange-400">{formatCurrency(state.payables)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-400">Împrumuturi</div>
                    <div className="font-bold text-slate-300">{formatCurrency(state.loans)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Decision Categories */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Ia o Decizie
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(decisionsByCategory).map(([category, catDecisions]) => {
                  const info = decisionCategoryInfo[category] || { name: category, icon: Target, color: 'text-slate-400', bgColor: 'bg-slate-500/20' };
                  const Icon = info.icon;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                        selectedCategory === category
                          ? 'bg-purple-500/20 border-purple-500/50'
                          : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className={`w-10 h-10 ${info.bgColor} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${info.color}`} />
                      </div>
                      <div className="text-left">
                        <span className="font-medium text-white text-sm">{info.name}</span>
                        <div className="text-xs text-slate-500">{catDecisions.length} opțiuni</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Decision Options */}
              {selectedCategory && decisionsByCategory[selectedCategory] && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {decisionsByCategory[selectedCategory].map((decision) => (
                      <button
                        key={decision.id}
                        onClick={() => {
                          setSelectedDecision(decision);
                          // Set default params
                          const defaults: Record<string, unknown> = {};
                          decision.parameters?.forEach((p) => {
                            if (p.default !== undefined) defaults[p.name] = p.default;
                          });
                          setDecisionParams(defaults);
                        }}
                        disabled={isPaused}
                        className="text-left p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 hover:border-purple-500/50 transition-all group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {decision.icon && <span className="text-xl">{decision.icon}</span>}
                          <span className="font-medium text-white group-hover:text-purple-300">
                            {decision.nameRo}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400 line-clamp-2">
                          {decision.descriptionRo}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Decisions */}
            {gameDetails.decisions.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Decizii Recente</h3>
                <div className="space-y-2">
                  {gameDetails.decisions.slice(0, 5).map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-700 last:border-0">
                      <div>
                        <span className="text-white">{d.type}</span>
                        <span className="text-slate-500 ml-2">Luna {d.month}/{d.year}</span>
                      </div>
                      {d.wasSuccessful ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Compliance & Alerts */}
          <div className="space-y-6">
            {/* Compliance Status */}
            {state && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Conformitate ANAF
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">Taxe de Plătit</span>
                    <span className="text-orange-400 font-medium">{formatCurrency(state.taxOwed)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">Sold TVA</span>
                    <span className="text-blue-400 font-medium">{formatCurrency(state.vatBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">Risc Penalități</span>
                    <span className={`font-medium ${state.penaltiesRisk > 20 ? 'text-red-400' : 'text-green-400'}`}>
                      {Math.round(state.penaltiesRisk)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">Risc Audit</span>
                    <span className={`font-medium ${state.auditRisk > 15 ? 'text-orange-400' : 'text-green-400'}`}>
                      {Math.round(state.auditRisk)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Events */}
            {pendingEvents.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  Evenimente în Așteptare ({pendingEvents.length})
                </h3>
                <div className="space-y-2">
                  {pendingEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => { setCurrentEvent(event); setShowEventModal(true); }}
                      className="w-full text-left p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/40 transition-all"
                    >
                      <div className="font-medium text-yellow-300">{event.title}</div>
                      <div className="text-xs text-yellow-400/70">{event.type}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Events */}
            {gameDetails.events.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Evenimente Recente
                </h3>
                <div className="space-y-2">
                  {gameDetails.events.slice(0, 5).map((e) => (
                    <div key={e.id} className="text-sm py-2 border-b border-slate-700 last:border-0">
                      <div className="font-medium text-white">{e.title}</div>
                      <div className="text-xs text-slate-500">
                        Luna {e.month}/{e.year} • {e.playerChoice ? 'Rezolvat' : 'Auto'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Player Stats */}
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Progresul Tău</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">XP Total</span>
                  <span className="text-yellow-400 font-bold">{gameDetails.xpTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nivel</span>
                  <span className="text-white font-bold">{gameDetails.playerLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Titlu</span>
                  <span className="text-purple-400">{gameDetails.playerTitle}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
