'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  DollarSign,
  Euro,
  PoundSterling,
  Coins,
} from 'lucide-react';

interface ExchangeRate {
  currency: string;
  name: string;
  rate: number;
  multiplier: number;
  date: string;
}

interface RateSummary {
  mainRates: ExchangeRate[];
  lastUpdate: string | null;
  trend: Record<string, 'up' | 'down' | 'stable'>;
}

const currencyIcons: Record<string, React.ReactNode> = {
  EUR: <Euro className="w-4 h-4" />,
  USD: <DollarSign className="w-4 h-4" />,
  GBP: <PoundSterling className="w-4 h-4" />,
  CHF: <Coins className="w-4 h-4" />,
};

const currencyColors: Record<string, string> = {
  EUR: 'bg-blue-100 text-blue-700',
  USD: 'bg-green-100 text-green-700',
  GBP: 'bg-purple-100 text-purple-700',
  CHF: 'bg-red-100 text-red-700',
};

export function ExchangeRateWidget() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<RateSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get<RateSummary>('/finance/exchange-rates/summary');
      if (response.data) {
        setData(response.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError('Nu s-au putut incarca cursurile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    // Refresh every 5 minutes
    const interval = setInterval(() => fetchRates(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  const getTrendIcon = (currency: string) => {
    const trend = data?.trend[currency];
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-red-500" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-green-500" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const formatRate = (rate: number, multiplier: number) => {
    const displayRate = multiplier > 1 ? rate : rate;
    return displayRate.toFixed(4);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-5 bg-gray-200 rounded w-32" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary-600" />
            Curs Valutar BNR
          </h3>
          <button
            onClick={() => fetchRates(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="text-center py-4 text-gray-500 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary-600" />
          Curs Valutar BNR
        </h3>
        <button
          onClick={() => fetchRates(true)}
          disabled={refreshing}
          className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          title="Actualizeaza"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Rates Grid */}
      <div className="grid grid-cols-2 gap-2">
        {data?.mainRates.map((rate) => (
          <div
            key={rate.currency}
            className={`p-3 rounded-lg ${currencyColors[rate.currency] || 'bg-gray-100 text-gray-700'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                {currencyIcons[rate.currency] || <Coins className="w-4 h-4" />}
                <span className="font-medium text-sm">{rate.currency}</span>
              </div>
              {getTrendIcon(rate.currency)}
            </div>
            <div className="text-lg font-bold">
              {formatRate(rate.rate, rate.multiplier)}
              <span className="text-xs font-normal ml-1">RON</span>
            </div>
            {rate.multiplier > 1 && (
              <div className="text-xs opacity-75">
                per {rate.multiplier} {rate.currency}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Last Update */}
      <div className="mt-3 text-xs text-gray-400 text-center">
        Actualizat: {formatDate(data?.lastUpdate || null)}
      </div>
    </div>
  );
}

export default ExchangeRateWidget;
