import { useState, useEffect } from 'react';
import React from 'react';
import { Package, Warehouse, AlertTriangle, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';

interface StockLevel {
  product_id: string;
  sku: string;
  product_name: string;
  category: string;
  unit_of_measure: string;
  selling_price: number;
  total_available: number;
  total_reserved: number;
  total_free: number;
  total_on_order: number;
  avg_cost: number;
  total_value: number;
  warehouse_count: number;
  warehouse_details: WarehouseStock[];
}

interface WarehouseStock {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string;
  quantity_available: number;
  quantity_reserved: number;
  quantity_free: number;
  quantity_on_order: number;
  reorder_level: number;
  average_cost: number;
  last_movement_date: string;
}

export default function StockLevelsPage() {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'product' | 'warehouse'>('product');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStockLevels();
  }, [groupBy]);

  const fetchStockLevels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const params = new URLSearchParams({
        company_id: companyId || '',
        group_by: groupBy
      });

      const response = await fetch(`/api/v1/inventory/stock-levels.php?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch stock levels');

      const data = await response.json();
      setStockLevels(data.products || []);
    } catch (error) {
      console.error('Error fetching stock levels:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (productId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON'
    }).format(amount);
  };

  const getStockHealthIcon = (available: number, reorderLevel: number | null) => {
    if (!reorderLevel) return null;
    if (available === 0) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (available <= reorderLevel) return <TrendingDown className="w-4 h-4 text-yellow-600" />;
    return <TrendingUp className="w-4 h-4 text-green-600" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">📊 Niveluri Stoc</h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Monitorizare în timp real a stocurilor pe produse și depozite
            </p>
          </div>
          <button
            onClick={fetchStockLevels}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium min-h-[44px]"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Actualizează
          </button>
        </div>
      </div>

      {/* View Toggle - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow mb-4 sm:mb-6 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm font-medium text-gray-700">Vizualizare:</span>
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => setGroupBy('product')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                groupBy === 'product'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Pe Produs
            </button>
            <button
              onClick={() => setGroupBy('warehouse')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                groupBy === 'warehouse'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              <Warehouse className="w-4 h-4 inline mr-2" />
              Pe Depozit
            </button>
          </div>
        </div>
      </div>

      {/* Stock Levels List - Responsive (Card on mobile, Table on desktop) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Mobile Card View */}
        <div className="block md:hidden">
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Se încarcă nivelurile de stoc...</p>
            </div>
          ) : stockLevels.length === 0 ? (
            <div className="p-6 text-center">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-base font-medium">Niciun stoc găsit</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {stockLevels.map((stock) => (
                <div key={stock.product_id} className="p-4">
                  <div
                    className="flex items-start space-x-3 cursor-pointer active:bg-gray-50"
                    onClick={() => toggleRow(stock.product_id)}
                  >
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{stock.product_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">SKU: {stock.sku}</p>
                        </div>
                        <div className="ml-2">
                          {stock.total_available === 0 ? (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          ) : stock.total_available <= 10 ? (
                            <TrendingDown className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Stoc Total:</span>
                          <span className="ml-1 font-medium text-gray-900">{stock.total_available} {stock.unit_of_measure}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Disponibil:</span>
                          <span className="ml-1 font-medium text-green-600">{stock.total_free} {stock.unit_of_measure}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Rezervat:</span>
                          <span className="ml-1 text-gray-600">{stock.total_reserved} {stock.unit_of_measure}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Valoare:</span>
                          <span className="ml-1 font-medium text-gray-900">{formatCurrency(stock.total_value)}</span>
                        </div>
                      </div>

                      {/* Expanded Warehouse Details - Mobile */}
                      {expandedRows.has(stock.product_id) && stock.warehouse_details && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                          <p className="text-xs font-medium text-gray-700">Detalii pe Depozit:</p>
                          {stock.warehouse_details.map((wh) => (
                            <div key={wh.warehouse_id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-xs font-medium text-gray-900">{wh.warehouse_name}</p>
                                  <p className="text-xs text-gray-500">{wh.warehouse_code}</p>
                                </div>
                                {getStockHealthIcon(wh.quantity_available, wh.reorder_level)}
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <div>
                                  <span className="text-gray-600">Disponibil:</span>
                                  <span className="ml-1 font-medium">{wh.quantity_available}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Liber:</span>
                                  <span className="ml-1 text-green-600 font-medium">{wh.quantity_free}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produs
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stoc Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rezervat
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disponibil
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  În Comandă
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost Mediu
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valoare Totală
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Depozite
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2">Se încarcă nivelurile de stoc...</p>
                  </td>
                </tr>
              ) : stockLevels.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">Niciun stoc găsit</p>
                  </td>
                </tr>
              ) : (
                stockLevels.map((stock) => (
                  <React.Fragment key={stock.product_id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRow(stock.product_id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{stock.product_name}</div>
                            <div className="text-sm text-gray-500">SKU: {stock.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {stock.total_available} {stock.unit_of_measure}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-600">
                          {stock.total_reserved} {stock.unit_of_measure}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-green-600">
                          {stock.total_free} {stock.unit_of_measure}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-blue-600">
                          {stock.total_on_order} {stock.unit_of_measure}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(stock.avg_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(stock.total_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {stock.warehouse_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          {stock.total_available === 0 ? (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          ) : stock.total_available <= 10 ? (
                            <TrendingDown className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row - Warehouse Details */}
                    {expandedRows.has(stock.product_id) && stock.warehouse_details && (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 bg-gray-50">
                          <div className="ml-14">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Detalii pe Depozit:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {stock.warehouse_details.map((wh) => (
                                <div key={wh.warehouse_id} className="bg-white rounded-lg border border-gray-200 p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h5 className="font-medium text-gray-900">{wh.warehouse_name}</h5>
                                      <p className="text-xs text-gray-500">{wh.warehouse_code}</p>
                                    </div>
                                    {getStockHealthIcon(wh.quantity_available, wh.reorder_level)}
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Disponibil:</span>
                                      <span className="font-medium">{wh.quantity_available}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Rezervat:</span>
                                      <span className="text-yellow-600">{wh.quantity_reserved}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Liber:</span>
                                      <span className="text-green-600 font-medium">{wh.quantity_free}</span>
                                    </div>
                                    {wh.reorder_level && (
                                      <div className="flex justify-between pt-2 border-t">
                                        <span className="text-gray-600">Nivel Recomandare:</span>
                                        <span className="text-blue-600">{wh.reorder_level}</span>
                                      </div>
                                    )}
                                    {wh.last_movement_date && (
                                      <div className="flex justify-between pt-2">
                                        <span className="text-gray-600 text-xs">Ultima mișcare:</span>
                                        <span className="text-gray-500 text-xs">
                                          {new Date(wh.last_movement_date).toLocaleDateString('ro-RO')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
