import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Warehouse, TrendingDown, AlertTriangle, BarChart3, TrendingUp, ArrowRight } from 'lucide-react';

interface DashboardStats {
  total_products: number;
  total_stock_value: number;
  total_warehouses: number;
  low_stock_alerts: number;
  out_of_stock: number;
  recent_movements: number;
  inventory_turnover: number;
  stock_accuracy: number;
}

export default function InventoryDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would be a dedicated dashboard API endpoint
      // For now, we'll use placeholder data
      setTimeout(() => {
        setStats({
          total_products: 156,
          total_stock_value: 487500,
          total_warehouses: 3,
          low_stock_alerts: 12,
          out_of_stock: 3,
          recent_movements: 45,
          inventory_turnover: 6.2,
          stock_accuracy: 98.5
        });
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-500">Se încarcă tabloul de bord...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📦 Tablou de Bord Inventar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vizualizare generală a stocurilor și activității din depozite
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Produse</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.total_products}</p>
              <p className="text-sm text-green-600 mt-1 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                +12% față de luna trecută
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-7 h-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Valoare Stoc</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(stats?.total_stock_value || 0)}</p>
              <p className="text-sm text-green-600 mt-1 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                +8% față de luna trecută
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Alerte Stoc Scăzut</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats?.low_stock_alerts}</p>
              <p className="text-sm text-yellow-600 mt-1">
                {stats?.out_of_stock} produse epuizate
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-7 h-7 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Depozite Active</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.total_warehouses}</p>
              <p className="text-sm text-gray-600 mt-1">
                {stats?.recent_movements} mișcări recent
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Warehouse className="w-7 h-7 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link
          to="/inventory/products"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-7 h-7 text-blue-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Catalog Produse</h3>
          <p className="text-sm text-gray-500">
            Gestionați catalogul de produse, prețuri și informații
          </p>
        </Link>

        <Link
          to="/inventory/stock-levels"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-green-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Niveluri Stoc</h3>
          <p className="text-sm text-gray-500">
            Monitorizare în timp real a stocurilor pe depozite
          </p>
        </Link>

        <Link
          to="/inventory/warehouses"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Warehouse className="w-7 h-7 text-purple-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Depozite & Locații</h3>
          <p className="text-sm text-gray-500">
            Gestionați depozitele și punctele de stocare
          </p>
        </Link>

        <Link
          to="/inventory/low-stock"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-yellow-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-600 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Alerte Stoc Scăzut</h3>
          <p className="text-sm text-gray-500">
            Monitorizați produsele cu stoc scăzut și comenzile
          </p>
          {stats && stats.low_stock_alerts > 0 && (
            <div className="mt-3 px-2 py-1 bg-yellow-100 rounded text-sm font-medium text-yellow-800 inline-block">
              {stats.low_stock_alerts} alerte active
            </div>
          )}
        </Link>

        <div className="bg-gray-50 rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">În curând</p>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Mișcări Stoc</h3>
            <p className="text-xs text-gray-400">Istoric complet mișcări</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">În curând</p>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Transferuri</h3>
            <p className="text-xs text-gray-400">Transferuri între depozite</p>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Indicatori de Performanță</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Rotație Inventar</span>
              <span className="text-2xl font-bold text-blue-600">{stats?.inventory_turnover}x</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${Math.min((stats?.inventory_turnover || 0) / 10 * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Țintă: 8x/an</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Acuratețe Stoc</span>
              <span className="text-2xl font-bold text-green-600">{stats?.stock_accuracy}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${stats?.stock_accuracy}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Țintă: 99%</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Nivel Serviciu</span>
              <span className="text-2xl font-bold text-purple-600">96.8%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '96.8%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Țintă: 98%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
