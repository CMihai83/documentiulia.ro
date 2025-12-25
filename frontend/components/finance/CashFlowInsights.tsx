'use client';

import { useMemo } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Info,
  CheckCircle2,
  Calendar,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { CashFlowInsight, SeasonalPattern } from '@/lib/mockCashFlowData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CashFlowInsightsProps {
  insights: CashFlowInsight[];
  seasonalPatterns: SeasonalPattern[];
}

export function CashFlowInsights({ insights, seasonalPatterns }: CashFlowInsightsProps) {
  // Sort insights by impact and confidence
  const sortedInsights = useMemo(() => {
    const impactWeight = { high: 3, medium: 2, low: 1 };
    return [...insights].sort((a, b) => {
      const weightDiff = impactWeight[b.impact] - impactWeight[a.impact];
      if (weightDiff !== 0) return weightDiff;
      return b.confidence - a.confidence;
    });
  }, [insights]);

  // Get icon and color based on insight type
  const getInsightStyle = (insight: CashFlowInsight) => {
    switch (insight.type) {
      case 'positive':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          iconColor: 'text-green-600',
          badgeBg: 'bg-green-100',
          badgeText: 'text-green-800',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-600',
          badgeBg: 'bg-yellow-100',
          badgeText: 'text-yellow-800',
        };
      case 'alert':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          iconColor: 'text-red-600',
          badgeBg: 'bg-red-100',
          badgeText: 'text-red-800',
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          iconColor: 'text-blue-600',
          badgeBg: 'bg-blue-100',
          badgeText: 'text-blue-800',
        };
    }
  };

  // Get category icon and label
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'trend':
        return { icon: TrendingUp, label: 'Trend' };
      case 'seasonality':
        return { icon: Calendar, label: 'Sezonalitate' };
      case 'risk':
        return { icon: AlertTriangle, label: 'Risc' };
      case 'opportunity':
        return { icon: Lightbulb, label: 'Oportunitate' };
      default:
        return { icon: Info, label: 'Info' };
    }
  };

  // Format seasonal data for chart
  const seasonalChartData = useMemo(() => {
    return seasonalPatterns.map((pattern) => ({
      ...pattern,
      netFlow: pattern.avgInflow - pattern.avgOutflow,
    }));
  }, [seasonalPatterns]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip for seasonal chart
  const SeasonalTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-green-600">Încasări:</span>
            <span className="font-medium">{formatCurrency(data.avgInflow)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-orange-600">Cheltuieli:</span>
            <span className="font-medium">{formatCurrency(data.avgOutflow)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-100">
            <span className="text-blue-600">Net:</span>
            <span className={`font-medium ${data.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.netFlow)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs text-gray-500">
            <span>Varianță:</span>
            <span>{(data.variance * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Analize AI & Insights</h3>
        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">
          Grok AI
        </span>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedInsights.map((insight) => {
          const style = getInsightStyle(insight);
          const Icon = style.icon;
          const categoryInfo = getCategoryInfo(insight.category);
          const CategoryIcon = categoryInfo.icon;

          return (
            <div
              key={insight.id}
              className={`${style.bgColor} ${style.borderColor} border rounded-lg p-4 transition-all hover:shadow-md`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={`${style.iconColor} mt-0.5`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${style.textColor} mb-1`}>{insight.title}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`${style.badgeBg} ${style.badgeText} px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1`}>
                        <CategoryIcon className="w-3 h-3" />
                        {categoryInfo.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        insight.impact === 'high'
                          ? 'bg-red-100 text-red-700'
                          : insight.impact === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        Impact {insight.impact === 'high' ? 'Mare' : insight.impact === 'medium' ? 'Mediu' : 'Scăzut'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">Încredere AI</div>
                  <div className="flex items-center gap-1">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`${style.iconColor.replace('text-', 'bg-')} h-2 rounded-full`}
                        style={{ width: `${insight.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{Math.round(insight.confidence * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-700 mb-3">{insight.description}</p>

              {/* Recommendation */}
              {insight.recommendation && (
                <div className={`${style.bgColor} border ${style.borderColor} rounded-md p-3 mt-3`}>
                  <div className="flex items-start gap-2">
                    <Lightbulb className={`w-4 h-4 ${style.iconColor} mt-0.5 flex-shrink-0`} />
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Recomandare:</p>
                      <p className="text-xs text-gray-600">{insight.recommendation}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Seasonal Patterns Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-purple-600" />
          <h4 className="text-lg font-semibold text-gray-900">Patternuri Sezoniere Detectate</h4>
          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 font-medium ml-auto">
            Analiza ultimilor 2 ani
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          AI-ul a identificat patternuri recurente în fluxul de numerar bazate pe date istorice. Folosiți aceste
          informații pentru planificare strategică.
        </p>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={seasonalChartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<SeasonalTooltip />} />
              <Legend />
              <Bar dataKey="avgInflow" fill="#10b981" name="Încasări medii" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgOutflow" fill="#f59e0b" name="Cheltuieli medii" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key Seasonal Insights */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-900">Luni de vârf</span>
            </div>
            <p className="text-xs text-green-700">
              Octombrie-Decembrie: Încasări cu 20-30% peste medie. Planificați investițiile majore.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-900">Luni slabe</span>
            </div>
            <p className="text-xs text-yellow-700">
              Ianuarie-Februarie: Scădere medie de 15%. Mențineți rezerve pentru această perioadă.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Varianță</span>
            </div>
            <p className="text-xs text-blue-700">
              August are cea mai mare varianță (20%) - planificați cu prudență în această perioadă.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
        <div className="flex items-start gap-3">
          <div className="bg-purple-100 rounded-lg p-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-2">Sumar Analiză AI</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Insights identificate</p>
                <p className="text-2xl font-bold text-purple-900">{insights.length}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Impact ridicat</p>
                <p className="text-2xl font-bold text-red-600">
                  {insights.filter((i) => i.impact === 'high').length}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Încredere medie</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round((insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length) * 100)}%
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Recomandări</p>
                <p className="text-2xl font-bold text-green-600">
                  {insights.filter((i) => i.recommendation).length}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-200">
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Analizele sunt actualizate în timp real pe baza datelor dvs. de tranzacție și sunt îmbunătățite
                continuu prin machine learning.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
