'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Clock,
  Receipt,
  Shield,
  Coins,
  Target,
  Award,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface ValueMetrics {
  userId: string;
  period: 'month' | 'quarter' | 'year' | 'all-time';
  timeSavedHours: number;
  timeSavedValue: number;
  deductionsFound: number;
  finesAvoided: number;
  moneySaved: number;
  errorsPrevented: number;
  documentsProcessed: number;
  aiQueriesAnswered: number;
  complianceChecksPassed: number;
  totalValueDelivered: number;
  subscriptionCost: number;
  roi: number;
}

interface ValueComparison {
  userValue: number;
  platformAverage: number;
  percentile: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function ROIValueWidget() {
  const [metrics, setMetrics] = useState<ValueMetrics | null>(null);
  const [comparison, setComparison] = useState<ValueComparison | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all-time'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchValueMetrics();
  }, [period]);

  const fetchValueMetrics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch value metrics
      const metricsRes = await fetch(`${API_URL}/value-metrics?period=${period}`, { headers });
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }

      // Fetch insights
      const insightsRes = await fetch(`${API_URL}/value-metrics/insights`, { headers });
      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setInsights(data.insights || []);
      }

      // Fetch comparison (only for monthly)
      if (period === 'month') {
        const compareRes = await fetch(`${API_URL}/value-metrics/compare`, { headers });
        if (compareRes.ok) {
          const data = await compareRes.json();
          setComparison(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch value metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ro-RO').format(num);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'month':
        return 'Luna aceasta';
      case 'quarter':
        return 'Trimestrul acesta';
      case 'year':
        return 'Anul acesta';
      case 'all-time':
        return 'Total';
    }
  };

  const getROIColor = (roi: number) => {
    if (roi >= 500) return 'text-green-600';
    if (roi >= 200) return 'text-blue-600';
    if (roi >= 100) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getROIBadge = (roi: number) => {
    if (roi >= 500) return { label: 'Excepțional', color: 'bg-green-100 text-green-800' };
    if (roi >= 200) return { label: 'Foarte bun', color: 'bg-blue-100 text-blue-800' };
    if (roi >= 100) return { label: 'Bun', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Pozitiv', color: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const roiBadge = getROIBadge(metrics.roi);

  return (
    <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Valoarea Ta</h3>
            <p className="text-sm text-gray-600">{getPeriodLabel()}</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(['month', 'quarter', 'year', 'all-time'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                period === p
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p === 'month' && 'Luna'}
              {p === 'quarter' && 'Trim'}
              {p === 'year' && 'An'}
              {p === 'all-time' && 'Total'}
            </button>
          ))}
        </div>
      </div>

      {/* Main ROI Display */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Return on Investment</span>
            </div>
            <div className="text-5xl font-bold mb-2">
              {metrics.roi === Infinity ? '∞' : `${formatNumber(metrics.roi)}%`}
            </div>
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${roiBadge.color.replace('text-', 'bg-').replace('100', '200')} text-white`}>
              {roiBadge.label}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90 mb-1">Valoare livrată</div>
            <div className="text-3xl font-bold">{formatCurrency(metrics.totalValueDelivered)}</div>
            <div className="text-sm opacity-75 mt-1">
              vs {formatCurrency(metrics.subscriptionCost)} plătit
            </div>
          </div>
        </div>
      </div>

      {/* Value Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Time Saved */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600">Timp economisit</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(metrics.timeSavedHours)}h
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatCurrency(metrics.timeSavedValue)}
          </div>
        </div>

        {/* Deductions Found */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">Deduceri găsite</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(metrics.deductionsFound)}
          </div>
          <div className="text-xs text-gray-500 mt-1">AI identificat</div>
        </div>

        {/* Fines Avoided */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-red-600" />
            <span className="text-xs text-gray-600">Amenzi evitate</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(metrics.finesAvoided)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatNumber(metrics.errorsPrevented)} erori
          </div>
        </div>

        {/* Money Saved */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-gray-600">Economisit</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(metrics.moneySaved)}
          </div>
          <div className="text-xs text-gray-500 mt-1">vs contabil tradițional</div>
        </div>
      </div>

      {/* Activity Metrics */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Activitate</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(metrics.documentsProcessed)}
            </div>
            <div className="text-xs text-gray-600 mt-1">Documente procesate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(metrics.aiQueriesAnswered)}
            </div>
            <div className="text-xs text-gray-600 mt-1">Întrebări AI</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(metrics.complianceChecksPassed)}
            </div>
            <div className="text-xs text-gray-600 mt-1">Verificări ANAF</div>
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2 mb-4">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100"
            >
              <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{insight}</p>
            </div>
          ))}
        </div>
      )}

      {/* Platform Comparison */}
      {comparison && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Comparativ cu media platformei</div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-lg font-bold text-gray-900">
                  Top {100 - comparison.percentile}%
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Tu: {formatCurrency(comparison.userValue)}</div>
              <div className="text-xs text-gray-500">Medie: {formatCurrency(comparison.platformAverage)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
