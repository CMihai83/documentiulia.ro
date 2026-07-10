'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Package,
  Truck,
  Monitor,
  Building2,
  Wrench,
  TrendingDown,
  Calendar,
  ArrowLeft,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Download,
  BarChart3
} from 'lucide-react';

interface FixedAsset {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  acquisitionDate: string;
  acquisitionCost: number;
  depreciationMethod: string;
  usefulLifeYears: number;
  salvageValue: number;
  accumulatedDepreciation: number;
  bookValue: number;
  status: 'active' | 'disposed' | 'fully_depreciated';
  location?: string;
}

const categoryIcons: Record<string, any> = {
  'equipment': Wrench,
  'vehicle': Truck,
  'computer': Monitor,
  'building': Building2,
  'furniture': Package,
  'other': Package,
};

const depreciationMethods: Record<string, string> = {
  'straight_line': 'Liniar',
  'declining_balance': 'Sold Descrescător',
  'sum_of_years': 'Suma Cifrelor Anilor',
  'units_of_production': 'Unități de Producție',
};

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchFixedAssets();
  }, [categoryFilter, statusFilter]);

  async function fetchFixedAssets() {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await fetch(`${API_URL}/assets`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const list = Array.isArray(data) ? data : data?.assets ?? data?.data ?? [];
      // Map defensively onto the page's Asset shape; unknown fields stay undefined (rendered as '-').
      setAssets(list.map((a: any) => ({
        id: a.id,
        assetCode: a.assetTag ?? a.assetCode ?? a.code ?? '-',
        name: a.name ?? '-',
        category: (a.category ?? a.type ?? 'other').toString().toLowerCase(),
        purchaseDate: (a.purchaseDate ?? a.acquiredAt ?? a.createdAt ?? '').slice(0, 10),
        purchaseValue: Number(a.purchaseValue ?? a.purchasePrice ?? a.value ?? 0),
        currentValue: Number(a.currentValue ?? a.bookValue ?? a.purchaseValue ?? 0),
        depreciationMethod: a.depreciationMethod ?? 'linear',
        usefulLife: Number(a.usefulLifeYears ?? a.usefulLife ?? 0),
        status: (a.status ?? 'active').toString().toLowerCase(),
        location: a.location ?? a.locationName ?? '-',
      })));
    } catch (error) {
      console.error('Failed to fetch fixed assets:', error);
      setAssets([]);
      setLoadError('Nu am putut încărca mijloacele fixe. Reîncearcă. / Could not load fixed assets. Please retry.');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      disposed: 'bg-gray-100 text-gray-700',
      fully_depreciated: 'bg-blue-100 text-blue-700',
    };
    const labels = {
      active: 'Activ',
      disposed: 'Casat',
      fully_depreciated: 'Amortizat',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.assetCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalAcquisitionCost = filteredAssets.reduce((sum, a) => sum + a.acquisitionCost, 0);
  const totalBookValue = filteredAssets.reduce((sum, a) => sum + a.bookValue, 0);
  const totalDepreciation = filteredAssets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {loadError && (<div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-200">{loadError}</div>)}
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/accounting"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Înapoi la Contabilitate
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mijloace Fixe</h1>
            <p className="text-gray-600 mt-1">
              Gestionare active imobilizate și amortizare
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Mijloc Fix Nou
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Valoare Achiziție</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalAcquisitionCost)}
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Valoare Contabilă</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(totalBookValue)}
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Amortizare Acumulată</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(totalDepreciation)}
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caută
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nume sau cod..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categorie
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate</option>
              <option value="computer">Echipamente IT</option>
              <option value="vehicle">Vehicule</option>
              <option value="equipment">Echipamente</option>
              <option value="building">Clădiri</option>
              <option value="furniture">Mobilier</option>
              <option value="other">Altele</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate</option>
              <option value="active">Active</option>
              <option value="fully_depreciated">Amortizate</option>
              <option value="disposed">Casate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assets List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Niciun mijloc fix găsit
          </h3>
          <p className="text-gray-600 mb-6">
            Începe prin a adăuga primul mijloc fix
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Adaugă Mijloc Fix
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cod
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Denumire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Achiziție
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Val. Contabilă
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amortizare
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAssets.map((asset) => {
                const Icon = categoryIcons[asset.category] || Package;
                return (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {asset.assetCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          {asset.location && (
                            <div className="text-xs text-gray-500">{asset.location}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {asset.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-900">{formatCurrency(asset.acquisitionCost)}</div>
                      <div className="text-xs text-gray-500">{formatDate(asset.acquisitionDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(asset.bookValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-orange-600 font-medium">
                        {formatCurrency(asset.accumulatedDepreciation)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {depreciationMethods[asset.depreciationMethod]}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(asset.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-gray-600 hover:text-blue-600" title="Vizualizare">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-green-600" title="Editează">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-red-600" title="Șterge">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Adaugă Mijloc Fix Nou</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Formularul va fi disponibil în curând.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
