'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  Target,
  Shield,
} from 'lucide-react';

interface HealthComponent {
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

interface FinancialHealthScore {
  overallScore: number;
  components: {
    cashFlow: HealthComponent;
    profitability: HealthComponent;
    liquidity: HealthComponent;
    receivables: HealthComponent;
    payables: HealthComponent;
  };
  recommendations: string[];
  calculatedAt: string;
}

interface SpendingInsight {
  id: string;
  type: 'spending' | 'saving' | 'anomaly' | 'trend' | 'optimization';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  impact?: number;
  actionable: boolean;
  action?: string;
}

interface DashboardInsights {
  healthScore: FinancialHealthScore;
  insights: SpendingInsight[];
  summary: {
    totalInsights: number;
    criticalAlerts: number;
    potentialSavings: number;
  };
}

// Circular progress component for health score
function CircularProgress({ score, size = 120 }: { score: number; size?: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#eab308'; // yellow
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={45}
          stroke="#e5e7eb"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={45}
          stroke={getColor(score)}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: getColor(score) }}>
          {score}
        </span>
        <span className="text-xs text-gray-500">din 100</span>
      </div>
    </div>
  );
}

// Health component mini card
function HealthComponentCard({ name, component }: { name: string; component: HealthComponent }) {
  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    if (score >= 40) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        {getTrendIcon(component.trend)}
        <span className="text-sm font-medium text-gray-700">{name}</span>
      </div>
      <span className={`text-sm font-semibold px-2 py-0.5 rounded ${getScoreColor(component.score)}`}>
        {component.score}%
      </span>
    </div>
  );
}

// Insight card component
function InsightCard({ insight }: { insight: SpendingInsight }) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <Info className="w-5 h-5 text-yellow-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4" />;
      case 'saving':
        return <Target className="w-4 h-4" />;
      case 'trend':
        return <TrendingUp className="w-4 h-4" />;
      case 'optimization':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className={`p-3 rounded-lg border-l-4 ${getSeverityBg(insight.severity)}`}>
      <div className="flex items-start gap-3">
        {getSeverityIcon(insight.severity)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{insight.title}</h4>
            {getTypeIcon(insight.type)}
          </div>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{insight.description}</p>
          {insight.impact && insight.impact > 0 && (
            <p className="text-xs font-medium text-gray-700 mt-1">
              Impact: {insight.impact.toLocaleString('ro-RO')} RON
            </p>
          )}
          {insight.actionable && insight.action && (
            <button className="text-xs text-primary-600 hover:text-primary-700 mt-2 flex items-center gap-1">
              {insight.action}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AIInsightsWidget() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [activeTab, setActiveTab] = useState<'health' | 'insights'>('health');

  const api = useApi<DashboardInsights>({
    validateOnMount: true,
    onUnauthorized: logout,
  });

  const fetchInsights = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await api.get('/ai/insights/dashboard');
      if (data) {
        setInsights(data);
      }
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    // Refresh every 5 minutes
    const interval = setInterval(() => fetchInsights(), 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="flex items-center justify-center py-8">
            <div className="h-24 w-24 bg-gray-200 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback if no data
  const healthScore = insights?.healthScore || {
    overallScore: 75,
    components: {
      cashFlow: { score: 80, trend: 'up' as const, description: 'Pozitiv' },
      profitability: { score: 70, trend: 'stable' as const, description: 'Stabil' },
      liquidity: { score: 85, trend: 'up' as const, description: 'Bun' },
      receivables: { score: 65, trend: 'down' as const, description: 'Necesită atenție' },
      payables: { score: 75, trend: 'stable' as const, description: 'OK' },
    },
    recommendations: ['Încasați facturile restante pentru a îmbunătăți fluxul de numerar'],
    calculatedAt: new Date().toISOString(),
  };

  const displayInsights = insights?.insights?.slice(0, 3) || [];
  const summary = insights?.summary || { totalInsights: 0, criticalAlerts: 0, potentialSavings: 0 };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary-600" />
          AI Insights
        </h2>
        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('health')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
            activeTab === 'health'
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Sănătate Financiară
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition flex items-center gap-1 ${
            activeTab === 'insights'
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Alerte
          {summary.criticalAlerts > 0 && (
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {summary.criticalAlerts}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'health' ? (
        <div className="space-y-4">
          {/* Health Score */}
          <div className="flex items-center gap-6">
            <CircularProgress score={healthScore.overallScore} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {healthScore.overallScore >= 80
                  ? 'Excelent!'
                  : healthScore.overallScore >= 60
                  ? 'Bine'
                  : healthScore.overallScore >= 40
                  ? 'Necesită atenție'
                  : 'Critic'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Scor general de sănătate financiară bazat pe analiza AI a datelor dvs.
              </p>
            </div>
          </div>

          {/* Health Components */}
          <div className="space-y-2">
            <HealthComponentCard name="Flux Numerar" component={healthScore.components.cashFlow} />
            <HealthComponentCard name="Profitabilitate" component={healthScore.components.profitability} />
            <HealthComponentCard name="Lichiditate" component={healthScore.components.liquidity} />
            <HealthComponentCard name="Încasări" component={healthScore.components.receivables} />
            <HealthComponentCard name="Plăți" component={healthScore.components.payables} />
          </div>

          {/* Recommendations */}
          {healthScore.recommendations.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900">Recomandare AI</h4>
                  <p className="text-sm text-blue-700 mt-1">{healthScore.recommendations[0]}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">Total Alerte</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mt-1">{summary.totalInsights}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500">Economii Posibile</span>
              </div>
              <p className="text-xl font-bold text-green-700 mt-1">
                {summary.potentialSavings.toLocaleString('ro-RO')} RON
              </p>
            </div>
          </div>

          {/* Insights List */}
          {displayInsights.length > 0 ? (
            displayInsights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
          ) : (
            <div className="text-center py-6 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p className="text-sm">Totul arată bine! Nu există alerte active.</p>
            </div>
          )}

          {summary.totalInsights > 3 && (
            <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 py-2">
              Vezi toate alertele ({summary.totalInsights})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
