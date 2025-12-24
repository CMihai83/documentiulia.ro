'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  AlertTriangle,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Mail,
  FileText,
} from 'lucide-react';

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  partnerName: string;
  grossAmount: number;
  currency: string;
  daysOverdue: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  partner?: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface OverdueSummary {
  totalCount: number;
  totalAmount: number;
  mainCurrency: string;
  currencies: string[];
  ranges: {
    under30: number;
    between30And60: number;
    between60And90: number;
    over90: number;
  };
}

interface OverdueData {
  summary: OverdueSummary;
  invoices: OverdueInvoice[];
}

const urgencyConfig = {
  low: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    icon: Clock,
    label: '< 7 zile',
  },
  medium: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    icon: AlertCircle,
    label: '7-30 zile',
  },
  high: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    icon: AlertTriangle,
    label: '30-60 zile',
  },
  critical: {
    bg: 'bg-red-200',
    text: 'text-red-900',
    border: 'border-red-400',
    icon: AlertTriangle,
    label: '> 60 zile',
  },
};

export function OverdueInvoiceWidget() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<OverdueData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverdue = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get<OverdueData>('/invoices/overdue?limit=5');
      if (response.data) {
        setData(response.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching overdue invoices:', err);
      setError('Nu s-au putut incarca facturile restante');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverdue();
    // Refresh every 5 minutes
    const interval = setInterval(() => fetchOverdue(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchOverdue]);

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return `${Number(amount).toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-5 bg-gray-200 rounded w-40" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
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
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Facturi Restante
          </h3>
          <button
            onClick={() => fetchOverdue(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="text-center py-4 text-gray-500 text-sm">{error}</div>
      </div>
    );
  }

  // No overdue invoices
  if (!data || data.summary.totalCount === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            Facturi Restante
          </h3>
          <button
            onClick={() => fetchOverdue(true)}
            disabled={refreshing}
            className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Actualizeaza"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-green-700 font-medium">Felicitari!</p>
          <p className="text-sm text-gray-500 mt-1">Nu aveti facturi restante</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Facturi Restante
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            {data.summary.totalCount}
          </span>
        </h3>
        <button
          onClick={() => fetchOverdue(true)}
          disabled={refreshing}
          className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          title="Actualizeaza"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-red-700">Total de incasat</p>
            <p className="text-xl font-bold text-red-800">
              {formatAmount(data.summary.totalAmount, data.summary.mainCurrency)}
            </p>
          </div>
          <div className="text-right text-xs text-red-600">
            <div>{data.summary.ranges.under30} sub 30 zile</div>
            <div>{data.summary.ranges.between30And60} 30-60 zile</div>
            <div>{data.summary.ranges.over90} peste 90 zile</div>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="space-y-2">
        {data.invoices.map((invoice) => {
          const config = urgencyConfig[invoice.urgency];
          const Icon = config.icon;

          return (
            <div
              key={invoice.id}
              className={`p-3 rounded-lg border ${config.bg} ${config.border}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${config.text}`} />
                    <span className="font-medium text-sm truncate">
                      {invoice.invoiceNumber}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.text}`}>
                      {invoice.daysOverdue} zile
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {invoice.partnerName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Scadent: {formatDate(invoice.dueDate)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-semibold text-sm ${config.text}`}>
                    {formatAmount(invoice.grossAmount, invoice.currency)}
                  </p>
                  {invoice.partner?.email && (
                    <button
                      className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      title="Trimite reminder"
                    >
                      <Mail className="w-3 h-3" />
                      Reminder
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Link */}
      {data.summary.totalCount > 5 && (
        <Link
          href="/dashboard/invoices?status=overdue"
          className="mt-3 flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          Vezi toate ({data.summary.totalCount} facturi)
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

export default OverdueInvoiceWidget;
