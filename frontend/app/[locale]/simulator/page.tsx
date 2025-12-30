'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  Users,
  DollarSign,
  Calendar,
  Zap
} from 'lucide-react';

interface GameState {
  id: string;
  companyName: string;
  currentPeriod: number;
  cash: number;
  revenue: number;
  expenses: number;
  profit: number;
  employees: number;
  healthScore: number;
  financialScore: number;
  operationsScore: number;
  complianceScore: number;
  growthScore: number;
  status: 'active' | 'paused' | 'completed';
}

interface PendingEvent {
  id: string;
  title: string;
  description: string;
  type: 'opportunity' | 'challenge' | 'decision';
  impact: string;
  deadline: string;
}

export default function SimulationPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for demonstration
    setGameState({
      id: 'game-1',
      companyName: 'TechStart SRL',
      currentPeriod: 3,
      cash: 125000,
      revenue: 85000,
      expenses: 65000,
      profit: 20000,
      employees: 8,
      healthScore: 78,
      financialScore: 82,
      operationsScore: 75,
      complianceScore: 88,
      growthScore: 70,
      status: 'active'
    });

    setPendingEvents([
      {
        id: 'event-1',
        title: 'Oportunitate: Contract mare',
        description: 'Un client important oferă un contract de 200.000 RON pentru servicii IT.',
        type: 'opportunity',
        impact: '+15% venituri, +10 puncte creștere',
        deadline: 'Perioada curentă'
      },
      {
        id: 'event-2',
        title: 'Decizie: Angajare manager',
        description: 'Poți angaja un manager de proiect pentru a îmbunătăți eficiența echipei.',
        type: 'decision',
        impact: '+5 puncte operațiuni, -2.000 RON/lună',
        deadline: 'Perioada următoare'
      },
      {
        id: 'event-3',
        title: 'Provocare: Creșterea salariilor',
        description: 'Angajații cer o creștere salarială de 15% din cauza inflației.',
        type: 'challenge',
        impact: '+3 puncte sănătate echipă, -12.000 RON/lună',
        deadline: 'Perioada următoare'
      }
    ]);

    setLoading(false);
  }, []);

  const handleStartNewGame = () => {
    // Navigate to game setup or start new game
    alert('Funcționalitate în dezvoltare - va începe un nou joc de simulare');
  };

  const handleRespondToEvent = (eventId: string) => {
    alert(`Răspuns înregistrat pentru evenimentul ${eventId}`);
    // In real app, this would open a modal or navigate to event response
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă simulatorul...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Înapoi la Dashboard
              </Link>
              <div className="flex items-center space-x-2">
                <Target className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Simulator Business</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleStartNewGame}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
              >
                <Play className="w-4 h-4 mr-2" />
                Joc Nou
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {gameState ? (
          <div className="space-y-8">
            {/* Game Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">{gameState.companyName}</h2>
                  <p className="text-sm text-gray-600">Perioada {gameState.currentPeriod} • Status: {gameState.status === 'active' ? 'Activ' : 'Pauzat'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    gameState.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {gameState.status === 'active' ? 'Activ' : 'Pauzat'}
                  </span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Numerar</p>
                      <p className="text-2xl font-bold text-gray-900">{gameState.cash.toLocaleString()} RON</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Profit</p>
                      <p className="text-2xl font-bold text-gray-900">{gameState.profit.toLocaleString()} RON</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Angajați</p>
                      <p className="text-2xl font-bold text-gray-900">{gameState.employees}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <BarChart3 className="w-8 h-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Sănătate</p>
                      <p className="text-2xl font-bold text-gray-900">{gameState.healthScore}/100</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Scores */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Scoruri Performanță</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{gameState.financialScore}</div>
                    <div className="text-xs text-gray-600">Financiar</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{gameState.operationsScore}</div>
                    <div className="text-xs text-gray-600">Operațiuni</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{gameState.complianceScore}</div>
                    <div className="text-xs text-gray-600">Conformitate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{gameState.growthScore}</div>
                    <div className="text-xs text-gray-600">Creștere</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{gameState.healthScore}</div>
                    <div className="text-xs text-gray-600">Sănătate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Events */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Evenimente în Așteptare</h2>
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {pendingEvents.length} evenimente
                </span>
              </div>

              <div className="space-y-4">
                {pendingEvents.map((event) => (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {event.type === 'opportunity' && <CheckCircle className="w-5 h-5 text-green-600" />}
                          {event.type === 'challenge' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                          {event.type === 'decision' && <Zap className="w-5 h-5 text-blue-600" />}
                          <h3 className="font-medium text-gray-900">{event.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.type === 'opportunity' ? 'bg-green-100 text-green-800' :
                            event.type === 'challenge' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {event.type === 'opportunity' ? 'Oportunitate' :
                             event.type === 'challenge' ? 'Provocare' : 'Decizie'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Impact: {event.impact}</span>
                          <span>Termen: {event.deadline}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRespondToEvent(event.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                      >
                        Răspunde
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Controls */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Controale Joc</h2>
              <div className="flex flex-wrap gap-4">
                <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center">
                  <Play className="w-4 h-4 mr-2" />
                  Continuă Joc
                </button>
                <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 flex items-center">
                  <Pause className="w-4 h-4 mr-2" />
                  Pauză
                </button>
                <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </button>
                <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center">
                  Salvează Progres
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Niciun joc activ</h3>
            <p className="text-gray-600 mb-6">Începe un nou joc de simulare pentru a învăța managementul afacerii.</p>
            <button
              onClick={handleStartNewGame}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 flex items-center"
            >
              <Play className="w-5 h-5 mr-2" />
              Începe Joc Nou
            </button>
          </div>
        )}
      </div>
    </div>
  );
}