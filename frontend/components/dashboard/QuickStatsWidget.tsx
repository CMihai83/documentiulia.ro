'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  CreditCard,
  PiggyBank,
  FileText,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface QuickStats {
  revenue: { current: number; previous: number; change: number };
  expenses: { current: number; previous: number; change: number };
  profit: { current: number; previous: number; change: number };
  invoices: { total: number; pending: number; overdue: number };
  partners: { total: number; active: number };
  vatPayable: number;
  cashBalance: number;
  compliance: {
    saftStatus: 'ok' | 'pending' | 'overdue';
    efacturaStatus: 'ok' | 'pending' | 'error';
    vatStatus: 'ok' | 'pending' | 'overdue';
  };
}

const formatAmount = (amount: number) => {
  return `${amount.toLocaleString('ro-RO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} RON`;
};

const TrendIndicator = ({ change, inverse = false }: { change: number; inverse?: boolean }) => {
  const isPositive = inverse ? change < 0 : change > 0;
  const isNegative = inverse ? change > 0 : change < 0;

  if (change === 0) {
    return (
      <span className="flex items-center text-gray-500 text-sm">
        <Minus className="w-3 h-3 mr-1" />
        0%
      </span>
    );
  }

  return (
    <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
      {isPositive ? (
        <TrendingUp className="w-3 h-3 mr-1" />
      ) : (
        <TrendingDown className="w-3 h-3 mr-1" />
      )}
      {change > 0 ? '+' : ''}{change}%
    </span>
  );
};

const ComplianceIndicator = ({ status }: { status: 'ok' | 'pending' | 'overdue' | 'error' }) => {
  const config = {
    ok: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    overdue: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
    error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  };

  const { icon: Icon, color, bg } = config[status];

  return (
    <div className={`p-1 rounded-full ${bg}`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
  );
};

export function QuickStatsWidget() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get<QuickStats>('/dashboard/quick-stats');
      if (response.data) {
        setStats(response.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching quick stats:', err);
      setError('Nu s-au putut incarca statisticile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Refresh every 2 minutes
    const interval = setInterval(() => fetchStats(true), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-4">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-28 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm">{error || 'Eroare la incarcarea statisticilor'}</span>
          <button
            onClick={() => fetchStats(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Revenue */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Venituri luna</span>
            <div className="p-1.5 bg-green-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatAmount(stats.revenue.current)}</p>
          <TrendIndicator change={stats.revenue.change} />
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Cheltuieli luna</span>
            <div className="p-1.5 bg-red-100 rounded-lg">
              <CreditCard className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatAmount(stats.expenses.current)}</p>
          <TrendIndicator change={stats.expenses.change} inverse />
        </div>

        {/* Profit */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Profit luna</span>
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <PiggyBank className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className={`text-xl font-bold ${stats.profit.current >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatAmount(stats.profit.current)}
          </p>
          <TrendIndicator change={stats.profit.change} />
        </div>

        {/* VAT Payable */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">TVA de plata</span>
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-amber-600">{formatAmount(stats.vatPayable)}</p>
          <span className="text-xs text-gray-500">Luna curenta</span>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Invoices */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-gray-900">Facturi</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.invoices.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-600">{stats.invoices.pending}</p>
              <p className="text-xs text-gray-500">Neplatite</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-600">{stats.invoices.overdue}</p>
              <p className="text-xs text-gray-500">Restante</p>
            </div>
          </div>
        </div>

        {/* Partners */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-gray-900">Parteneri</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.partners.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{stats.partners.active}</p>
              <p className="text-xs text-gray-500">Activi</p>
            </div>
          </div>
        </div>

        {/* Compliance */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary-600" />
              <span className="font-medium text-gray-900">Conformitate</span>
            </div>
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex justify-around">
            <div className="text-center">
              <ComplianceIndicator status={stats.compliance.saftStatus} />
              <p className="text-xs text-gray-500 mt-1">SAF-T</p>
            </div>
            <div className="text-center">
              <ComplianceIndicator status={stats.compliance.efacturaStatus} />
              <p className="text-xs text-gray-500 mt-1">e-Factura</p>
            </div>
            <div className="text-center">
              <ComplianceIndicator status={stats.compliance.vatStatus} />
              <p className="text-xs text-gray-500 mt-1">TVA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickStatsWidget;
