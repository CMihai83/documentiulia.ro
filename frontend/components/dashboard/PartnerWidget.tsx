'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Users,
  Building2,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronRight,
  UserPlus,
  Star,
} from 'lucide-react';

interface PartnerStats {
  total: number;
  customers: number;
  suppliers: number;
  both: number;
  active: number;
  inactive: number;
}

interface TopPartner {
  id: string;
  name: string;
  cui: string | null;
  type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  totalRevenue: number;
  invoiceCount: number;
}

interface RecentPartner {
  id: string;
  name: string;
  cui: string | null;
  type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  createdAt: string;
}

interface PartnerDashboardData {
  stats: PartnerStats;
  topPartners: TopPartner[];
  recentPartners: RecentPartner[];
  activeInLast30Days: number;
  newThisMonth: number;
  growthRate: number;
  totalRevenue: number;
}

const partnerTypeConfig = {
  CUSTOMER: { label: 'Client', color: 'text-blue-600', bg: 'bg-blue-100' },
  SUPPLIER: { label: 'Furnizor', color: 'text-purple-600', bg: 'bg-purple-100' },
  BOTH: { label: 'Client/Furnizor', color: 'text-green-600', bg: 'bg-green-100' },
};

const formatAmount = (amount: number) => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M RON`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K RON`;
  }
  return `${amount.toLocaleString('ro-RO')} RON`;
};

const TrendIndicator = ({ value }: { value: number }) => {
  if (value === 0) {
    return (
      <span className="flex items-center text-gray-500 text-xs">
        <Minus className="w-3 h-3 mr-0.5" />
        0%
      </span>
    );
  }

  return (
    <span className={`flex items-center text-xs ${value > 0 ? 'text-green-600' : 'text-red-600'}`}>
      {value > 0 ? (
        <TrendingUp className="w-3 h-3 mr-0.5" />
      ) : (
        <TrendingDown className="w-3 h-3 mr-0.5" />
      )}
      {value > 0 ? '+' : ''}{value}%
    </span>
  );
};

export function PartnerWidget() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'top' | 'recent'>('top');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get<PartnerDashboardData>('/partners/dashboard');
      if (response.data) {
        setData(response.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching partner data:', err);
      setError('Nu s-au putut incarca datele partenerilor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-5 bg-gray-200 rounded w-32" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            Parteneri
          </h3>
          <button
            onClick={() => fetchData(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="text-center py-4 text-gray-500 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          Parteneri
        </h3>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          title="Actualizeaza"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <ShoppingCart className="w-4 h-4 text-blue-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-blue-700">{data.stats.customers}</p>
          <p className="text-xs text-blue-600">Clienti</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <Building2 className="w-4 h-4 text-purple-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-purple-700">{data.stats.suppliers}</p>
          <p className="text-xs text-purple-600">Furnizori</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <UserPlus className="w-4 h-4 text-green-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-green-700">{data.newThisMonth}</p>
          <p className="text-xs text-green-600">Noi luna</p>
          <TrendIndicator value={data.growthRate} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-3">
        <button
          onClick={() => setActiveTab('top')}
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'top'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Star className="w-3 h-3 inline mr-1" />
          Top 5
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'recent'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserPlus className="w-3 h-3 inline mr-1" />
          Recenti
        </button>
      </div>

      {/* Partner List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {activeTab === 'top' ? (
          data.topPartners.length > 0 ? (
            data.topPartners.map((partner, index) => {
              const typeConfig = partnerTypeConfig[partner.type] || partnerTypeConfig.CUSTOMER;
              return (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{partner.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${typeConfig.bg} ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {partner.invoiceCount} facturi
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatAmount(partner.totalRevenue || 0)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-500 text-sm py-4">
              Nu exista parteneri cu venituri
            </p>
          )
        ) : (
          data.recentPartners.length > 0 ? (
            data.recentPartners.map((partner) => {
              const typeConfig = partnerTypeConfig[partner.type] || partnerTypeConfig.CUSTOMER;
              return (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{partner.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${typeConfig.bg} ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                      {partner.cui && (
                        <span className="text-xs text-gray-500">CUI: {partner.cui}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {new Date(partner.createdAt).toLocaleDateString('ro-RO')}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-500 text-sm py-4">
              Nu exista parteneri noi
            </p>
          )
        )}
      </div>

      {/* View All Link */}
      <Link
        href="/dashboard/partners"
        className="mt-3 flex items-center justify-center gap-1 text-sm text-primary-600 hover:text-primary-800"
      >
        Vezi toti partenerii ({data.stats.total})
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default PartnerWidget;
