'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Package,
  ArrowRightLeft,
  Edit,
  Calendar,
  FileText,
  BarChart3,
} from 'lucide-react';

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  balanceAfter: number;
  reference?: string;
  referenceType?: string;
  unitCost?: number;
  totalValue?: number;
  fromLocationId?: string;
  toLocationId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export default function StockMovementsPage() {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  useEffect(() => {
    fetchMovements();
  }, [filterType, startDate, endDate, selectedProduct]);

  async function fetchMovements() {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();

      if (selectedProduct) params.append('itemId', selectedProduct);
      if (filterType !== 'all') params.append('type', filterType);
      if (startDate) params.append('fromDate', startDate);
      if (endDate) params.append('toDate', endDate);

      const response = await fetch(
        `/api/logistics/inventory/stock/movements?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements || []);
      }
    } catch (error) {
      console.error('Failed to fetch movements:', error);
    } finally {
      setLoading(false);
    }
  }

  async function exportMovements() {
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(
        `/api/inventory/export/movements?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-movements-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch = movement.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.productSku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.reference?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'OUT':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'ADJUSTMENT':
        return <Edit className="h-5 w-5 text-orange-600" />;
      case 'TRANSFER':
        return <ArrowRightLeft className="h-5 w-5 text-blue-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getMovementTypeBadge = (type: string) => {
    const styles = {
      IN: 'bg-green-100 text-green-700',
      OUT: 'bg-red-100 text-red-700',
      ADJUSTMENT: 'bg-orange-100 text-orange-700',
      TRANSFER: 'bg-blue-100 text-blue-700',
    };
    const labels = {
      IN: 'Intrare',
      OUT: 'Ieșire',
      ADJUSTMENT: 'Ajustare',
      TRANSFER: 'Transfer',
    };
    return {
      color: styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-700',
      label: labels[type as keyof typeof labels] || type,
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ro-RO');
  };

  const stats = {
    totalMovements: movements.length,
    totalIn: movements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0),
    totalOut: movements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.quantity, 0),
    totalValue: movements.reduce((sum, m) => sum + (m.totalValue || 0), 0),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Înapoi la Inventar
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Istoric Mișcări Stoc</h1>
            <p className="text-gray-600 mt-1">
              Vizualizare completă a tuturor mișcărilor de stoc
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportMovements}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={fetchMovements}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizează
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Mișcări</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalMovements}
              </div>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Intrări</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {stats.totalIn}
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Ieșiri</div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {stats.totalOut}
              </div>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Valoare Totală</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(stats.totalValue)}
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caută
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Produs, SKU, referință..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tip Mișcare
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate</option>
              <option value="IN">Intrări</option>
              <option value="OUT">Ieșiri</option>
              <option value="ADJUSTMENT">Ajustări</option>
              <option value="TRANSFER">Transferuri</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              De la Data
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Până la Data
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setStartDate('');
                setEndDate('');
                setSelectedProduct('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Resetează Filtre
            </button>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nicio mișcare găsită
          </h3>
          <p className="text-gray-600">
            Modifică filtrele pentru a vizualiza alte mișcări de stoc
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dată
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Produs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tip
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Cantitate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Sold După
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Valoare
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Referință
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMovements.map((movement) => {
                const typeBadge = getMovementTypeBadge(movement.type);
                const isPositive = movement.type === 'IN' || (movement.type === 'ADJUSTMENT' && movement.quantity > 0);

                return (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(movement.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{movement.productName}</div>
                      {movement.productSku && (
                        <div className="text-xs text-gray-500 font-mono">{movement.productSku}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getMovementTypeIcon(movement.type)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{movement.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                      {movement.balanceAfter}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {movement.totalValue ? formatCurrency(movement.totalValue) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {movement.reference || '-'}
                      {movement.referenceType && (
                        <div className="text-xs text-gray-500">{movement.referenceType}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {movement.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
