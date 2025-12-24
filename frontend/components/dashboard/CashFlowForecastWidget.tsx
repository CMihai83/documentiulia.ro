'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  BarChart3,
} from 'lucide-react';

interface ForecastData {
  nextMonthIncome: number;
  nextMonthExpenses: number;
  nextMonthNet: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface AgingData {
  receivables: {
    total: number;
    count: number;
  };
  payables: {
    total: number;
    count: number;
  };
  netPosition: number;
}

export function CashFlowForecastWidget() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [aging, setAging] = useState<AgingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [forecastRes, agingRes] = await Promise.all([
        api.get<ForecastData>('/reports/cash-flow-forecast/dashboard'),
        api.get<AgingData>('/reports/cash-flow-forecast/aging'),
      ]);

      if (forecastRes.data) setForecast(forecastRes.data);
      if (agingRes.data) setAging(agingRes.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching forecast:', err);
      setError('Nu s-au putut incarca datele');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'critical':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          label: 'Critic',
        };
      case 'high':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          label: 'Ridicat',
        };
      case 'medium':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          label: 'Moderat',
        };
      default:
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          label: 'Scazut',
        };
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-5 bg-gray-200 rounded w-40" />
        </div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-100 rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 bg-gray-100 rounded" />
            <div className="h-12 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            Prognoza Cash Flow
          </h3>
          <button
            onClick={() => fetchData(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="text-center py-6 text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-2 text-primary-600 text-sm hover:underline"
          >
            Incearca din nou
          </button>
        </div>
      </div>
    );
  }

  const riskConfig = forecast ? getRiskConfig(forecast.riskLevel) : getRiskConfig('low');
  const RiskIcon = riskConfig.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-600" />
          Prognoza Cash Flow
        </h3>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {forecast && (
        <>
          {/* Risk Level Banner */}
          <div className={`${riskConfig.bg} ${riskConfig.border} border rounded-lg p-3 mb-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiskIcon className={`w-5 h-5 ${riskConfig.color}`} />
                <span className={`font-medium ${riskConfig.color}`}>
                  Risc {riskConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(forecast.trend)}
                <span className="text-sm text-gray-600">
                  {forecast.trend === 'up' ? 'In crestere' : forecast.trend === 'down' ? 'In scadere' : 'Stabil'}
                </span>
              </div>
            </div>
          </div>

          {/* Next Month Forecast */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Luna urmatoare</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700">Venituri</p>
                <p className="text-sm font-bold text-green-700">
                  {formatCurrency(forecast.nextMonthIncome)}
                </p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <p className="text-xs text-red-700">Cheltuieli</p>
                <p className="text-sm font-bold text-red-700">
                  {formatCurrency(forecast.nextMonthExpenses)}
                </p>
              </div>
              <div className={`text-center p-2 rounded-lg ${forecast.nextMonthNet >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                <p className={`text-xs ${forecast.nextMonthNet >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  Net
                </p>
                <p className={`text-sm font-bold ${forecast.nextMonthNet >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {formatCurrency(forecast.nextMonthNet)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Aging Summary */}
      {aging && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Pozitie financiara</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">De incasat</p>
              <p className="text-sm font-semibold text-green-600">
                {formatCurrency(aging.receivables.total)}
              </p>
              <p className="text-xs text-gray-400">{aging.receivables.count} facturi</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">De platit</p>
              <p className="text-sm font-semibold text-red-600">
                {formatCurrency(aging.payables.total)}
              </p>
              <p className="text-xs text-gray-400">{aging.payables.count} facturi</p>
            </div>
          </div>
          <div className={`mt-2 p-2 rounded-lg text-center ${aging.netPosition >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-xs text-gray-600">Pozitie neta</p>
            <p className={`text-lg font-bold ${aging.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(aging.netPosition)}
            </p>
          </div>
        </div>
      )}

      {/* View Details Link */}
      <button
        onClick={() => router.push('/ro/dashboard/reports')}
        className="w-full flex items-center justify-center gap-2 p-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
      >
        Vezi rapoarte detaliate
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default CashFlowForecastWidget;
