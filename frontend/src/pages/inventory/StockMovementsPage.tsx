import { useState, useEffect } from 'react';
import { Calendar, Search, Download, RefreshCw, Package, Warehouse, TrendingUp, TrendingDown, ArrowRightLeft, Settings } from 'lucide-react';

interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  warehouse_id: string;
  warehouse_name: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer' | 'return';
  quantity: number;
  unit_cost: number;
  total_value: number;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchMovements();
  }, [searchTerm, movementTypeFilter, startDate, endDate]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const params = new URLSearchParams({
        company_id: companyId || '',
        ...(movementTypeFilter && { movement_type: movementTypeFilter }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
        limit: '100'
      });

      const response = await fetch(`/api/v1/inventory/stock-movement.php?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements || []);
      } else {
        console.error('Failed to fetch movements');
      }
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'transfer':
        return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      case 'adjustment':
        return <Settings className="w-4 h-4 text-yellow-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMovementBadge = (type: string) => {
    const badges = {
      in: 'bg-green-100 text-green-800',
      out: 'bg-red-100 text-red-800',
      transfer: 'bg-blue-100 text-blue-800',
      adjustment: 'bg-yellow-100 text-yellow-800',
      return: 'bg-purple-100 text-purple-800'
    };

    const labels = {
      in: 'Intrare',
      out: 'Ieșire',
      transfer: 'Transfer',
      adjustment: 'Ajustare',
      return: 'Retur'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badges[type as keyof typeof badges] || 'bg-gray-100 text-gray-800'}`}>
        {getMovementIcon(type)}
        {labels[type as keyof typeof labels] || type}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Produs', 'SKU', 'Depozit', 'Tip', 'Cantitate', 'Cost Unitar', 'Valoare Totală', 'Referință', 'Notițe'];
    const rows = movements.map(m => [
      new Date(m.created_at).toLocaleDateString('ro-RO'),
      m.product_name,
      m.product_sku,
      m.warehouse_name,
      m.movement_type,
      m.quantity,
      m.unit_cost,
      m.total_value,
      m.reference_number || '',
      m.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `miscaristoc_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = !searchTerm ||
      movement.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.product_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="border-b border-gray-200 pb-3 sm:pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Istoric Mișcări Stoc</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Vizualizați toate mișcările de stoc: intrări, ieșiri, transferuri și ajustări</p>
      </div>

      {/* Filters - Mobile Optimized */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Search */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Căutare</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Produs, SKU..."
                className="w-full pl-9 pr-3 py-3 sm:py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Movement Type Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Tip Mișcare</label>
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toate tipurile</option>
              <option value="in">Intrare</option>
              <option value="out">Ieșire</option>
              <option value="transfer">Transfer</option>
              <option value="adjustment">Ajustare</option>
              <option value="return">Retur</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data Început</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-3 sm:py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data Sfârșit</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-3 sm:py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
          <button
            onClick={fetchMovements}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            Reîmprospătează
          </button>
          <button
            onClick={exportToCSV}
            disabled={movements.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            Exportă CSV
          </button>
        </div>
      </div>

      {/* Movements List - Responsive (Card on mobile, Table on desktop) */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Se încarcă mișcările...</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nu există mișcări de stoc</p>
            <p className="text-sm text-gray-500 mt-1">Ajustați filtrele pentru a vedea rezultate</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-gray-200">
              {filteredMovements.map((movement) => (
                <div key={movement.id} className="p-4 hover:bg-gray-50 active:bg-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{movement.product_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">SKU: {movement.product_sku}</p>
                    </div>
                    {getMovementBadge(movement.movement_type)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-gray-500">Data:</span>
                      <span className="ml-1 font-medium text-gray-900 block">
                        {new Date(movement.created_at).toLocaleDateString('ro-RO', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Depozit:</span>
                      <span className="ml-1 font-medium text-gray-900 block truncate">{movement.warehouse_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Cantitate:</span>
                      <span className={`ml-1 font-medium ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Valoare:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {movement.total_value ? `${movement.total_value.toFixed(2)} RON` : '-'}
                      </span>
                    </div>
                  </div>

                  {movement.reference_number && (
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                      Ref: {movement.reference_number}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Depozit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantitate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost Unitar
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valoare
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referință
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(movement.created_at).toLocaleDateString('ro-RO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{movement.product_name}</div>
                      <div className="text-sm text-gray-500">SKU: {movement.product_sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 text-sm text-gray-700">
                        <Warehouse className="w-4 h-4 text-gray-400" />
                        {movement.warehouse_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getMovementBadge(movement.movement_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={movement.quantity > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {movement.unit_cost ? `${movement.unit_cost.toFixed(2)} RON` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {movement.total_value ? `${movement.total_value.toFixed(2)} RON` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.reference_number || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {/* Summary Stats - Mobile Optimized */}
      {filteredMovements.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-gray-600">Total Mișcări:</span>
              <span className="ml-2 font-semibold text-gray-900">{filteredMovements.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Intrări:</span>
              <span className="ml-2 font-semibold text-green-600">
                {filteredMovements.filter(m => m.movement_type === 'in').length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Ieșiri:</span>
              <span className="ml-2 font-semibold text-red-600">
                {filteredMovements.filter(m => m.movement_type === 'out').length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Valoare Totală:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {filteredMovements.reduce((sum, m) => sum + (m.total_value || 0), 0).toFixed(2)} RON
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
