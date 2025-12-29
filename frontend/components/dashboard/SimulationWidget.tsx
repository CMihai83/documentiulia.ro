'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Play,
  TrendingUp,
  BookOpen,
  Trophy,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Lightbulb,
  ChevronRight,
  BarChart3,
  Users,
  Euro,
  Activity
} from 'lucide-react';
import {
  getUserGames,
  getUserStats,
  getAIRecommendations,
  type SimulationGame,
  type UserStats,
  type AIRecommendation
} from '@/lib/api/simulation';

interface SimulationWidgetProps {
  compact?: boolean;
}

export function SimulationWidget({ compact = false }: SimulationWidgetProps) {
  const [activeGames, setActiveGames] = useState<SimulationGame[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSimulationData();
  }, []);

  async function loadSimulationData() {
    try {
      const [gamesData, statsData] = await Promise.all([
        getUserGames(),
        getUserStats(),
      ]);

      const activeGamesData = gamesData.filter(g =>
        g.status === 'SIM_ACTIVE' || g.status === 'SIM_PAUSED'
      );
      setActiveGames(activeGamesData);
      setUserStats(statsData);

      // Get recommendations for the most recent active game
      if (activeGamesData.length > 0) {
        const latestGame = activeGamesData[0];
        try {
          const recs = await getAIRecommendations(latestGame.id);
          setRecommendations(recs.slice(0, compact ? 2 : 3));
        } catch (error) {
          console.warn('Could not load AI recommendations:', error);
        }
      }
    } catch (error) {
      console.warn('Could not load simulation data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-slate-700 rounded w-full"></div>
            <div className="h-3 bg-slate-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  // No simulation data - show call to action
  if (!userStats && activeGames.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500/20 rounded-full mb-4">
            <Play className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Începe Simularea de Afaceri
          </h3>
          <p className="text-slate-300 text-sm mb-4">
            Aplică cunoștințele din cursuri într-un simulator interactiv de business
          </p>
          <Link
            href="/simulation"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all"
          >
            <Play className="w-4 h-4" />
            Începe Simularea
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Simulator Business
        </h3>
        <Link
          href="/simulation"
          className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1"
        >
          Vezi toate <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Row */}
      {userStats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{userStats.totalXP}</div>
            <div className="text-xs text-slate-400">XP Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{userStats.gamesCompleted}</div>
            <div className="text-xs text-slate-400">Jocuri Complete</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{Math.round(userStats.averageHealthScore)}%</div>
            <div className="text-xs text-slate-400">Scor Mediu</div>
          </div>
        </div>
      )}

      {/* Active Games */}
      {activeGames.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Jocuri Active ({activeGames.length})
          </h4>
          <div className="space-y-3">
            {activeGames.slice(0, compact ? 1 : 2).map((game) => (
              <div key={game.id} className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm">{game.name}</span>
                  <span className="text-xs text-slate-400">
                    {game.currentMonth}/{game.currentYear}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-slate-300">{game.healthScore}% sănătate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Euro className="w-3 h-3 text-green-400" />
                    <span className="text-slate-300">{game.financialScore}% financiar</span>
                  </div>
                </div>
                <Link
                  href={`/simulation/${game.id}`}
                  className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs font-medium mt-2"
                >
                  Continuă jocul <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            Recomandări AI
          </h4>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{rec.decision.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">{rec.decision.nameRo}</span>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        rec.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                        rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-green-500/20 text-green-300'
                      }`}>
                        {rec.priority === 'high' ? 'Prioritate înaltă' :
                         rec.priority === 'medium' ? 'Prioritate medie' : 'Prioritate scăzută'}
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs mb-2 line-clamp-2">
                      {rec.decision.description}
                    </p>
                    {rec.relatedCourses.length > 0 && (
                      <Link
                        href={`/courses/${rec.relatedCourses[0].id}`}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                      >
                        <BookOpen className="w-3 h-3" />
                        Vezi cursul legat
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-slate-600/50">
        <div className="flex gap-2">
          <Link
            href="/simulation"
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-3 py-2 rounded-lg font-medium text-sm text-center transition-all"
          >
            Joacă
          </Link>
          <Link
            href="/simulation/scenarios"
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg font-medium text-sm text-center transition-all"
          >
            Scenarii
          </Link>
        </div>
      </div>
    </div>
  );
}