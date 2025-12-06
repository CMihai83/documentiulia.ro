import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string;
  selling_price: number;
  purchase_price: number;
  profit_margin: number;
  total_stock: number;
  total_reserved: number;
  total_free: number;
  warehouse_count: number;
  is_low_stock: boolean;
  is_active: boolean;
}

interface StockStats {
  total_products: number;
  total_units: number;
  total_value: number;
  low_stock_products: number;
  out_of_stock_products: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<StockStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, categoryFilter, lowStockFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const params = new URLSearchParams({
        company_id: companyId || '',
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(lowStockFilter && { low_stock: 'true' })
      });

      const response = await fetch(`/api/v1/inventory/products.php?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      setProducts(data.products || []);
      if (data.summary) {
        setStats(data.summary);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON'
    }).format(amount);
  };

  const getStockStatusColor = (product: Product) => {
    if (product.total_stock === 0) return 'text-red-600 bg-red-50';
    if (product.is_low_stock) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStockStatusText = (product: Product) => {
    if (product.total_stock === 0) return 'Stoc epuizat';
    if (product.is_low_stock) return 'Stoc scăzut';
    return 'În stoc';
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">📦 Produse & Inventar</h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Gestionați catalogul de produse și monitorizați stocurile
            </p>
          </div>
          <button
            onClick={() => alert('Funcționalitate în dezvoltare')}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium min-h-[44px]"
          >
            <Plus className="w-5 h-5 mr-2" />
            Produs Nou
          </button>
        </div>
      </div>

      {/* Statistics Cards - Mobile Optimized */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center">
              <div className="flex-shrink-0 mb-2 sm:mb-0">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500">Total Produse</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.total_products}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center">
              <div className="flex-shrink-0 mb-2 sm:mb-0">
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500">Unități Stoc</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.total_units.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center">
              <div className="flex-shrink-0 mb-2 sm:mb-0">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500">Valoare Stoc</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{formatCurrency(stats.total_value)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center">
              <div className="flex-shrink-0 mb-2 sm:mb-0">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500">Stoc Scăzut</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.low_stock_products}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center">
              <div className="flex-shrink-0 mb-2 sm:mb-0">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500">Stoc Epuizat</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.out_of_stock_products}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow mb-4 sm:mb-6 p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Caută produs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-3 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 sm:px-4 py-3 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Toate categoriile</option>
            <option value="Electronics">Electronice</option>
            <option value="Clothing">Îmbrăcăminte</option>
            <option value="Food">Alimente</option>
            <option value="Books">Cărți</option>
            <option value="Other">Altele</option>
          </select>

          <label className="flex items-center justify-center px-3 sm:px-4 py-3 sm:py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 active:bg-gray-100 min-h-[44px]">
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => setLowStockFilter(e.target.checked)}
              className="mr-2 w-4 h-4"
            />
            <Filter className="w-4 h-4 mr-2 text-gray-600" />
            <span className="text-sm">Stoc scăzut</span>
          </label>

          <button
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('');
              setLowStockFilter(false);
            }}
            className="px-3 sm:px-4 py-3 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors text-sm font-medium min-h-[44px]"
          >
            Resetează
          </button>
        </div>
      </div>

      {/* Products List - Responsive (Card on mobile, Table on desktop) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Mobile Card View */}
        <div className="block md:hidden">
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm">Se încarcă produsele...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-base font-medium">Niciun produs găsit</p>
              <p className="text-sm">Începeți prin a adăuga primul produs</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {products.map((product) => (
                <div key={product.id} className="p-4 hover:bg-gray-50 active:bg-gray-100">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">SKU: {product.sku}</p>
                        </div>
                        <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getStockStatusColor(product)}`}>
                          {getStockStatusText(product)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Categorie:</span>
                          <span className="ml-1 font-medium text-gray-900">{product.category || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Preț:</span>
                          <span className="ml-1 font-medium text-gray-900">{formatCurrency(product.selling_price)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Stoc:</span>
                          <span className="ml-1 font-medium text-gray-900">{product.total_stock} {product.unit_of_measure}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Marjă:</span>
                          <span className={`ml-1 font-medium ${product.profit_margin > 20 ? 'text-green-600' : product.profit_margin > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {product.profit_margin?.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 active:bg-blue-200 min-h-[44px]">
                          Vizualizare
                        </button>
                        <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 min-h-[44px]">
                          Editează
                        </button>
                      </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categorie
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preț Vânzare
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marjă
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stoc Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disponibil
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Depozite
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2">Se încarcă produsele...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">Niciun produs găsit</p>
                    <p className="text-sm">Începeți prin a adăuga primul produs</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {product.category || 'Necategorizat'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(product.selling_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-medium ${product.profit_margin > 20 ? 'text-green-600' : product.profit_margin > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {product.profit_margin?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                      {product.total_stock} {product.unit_of_measure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {product.total_free} {product.unit_of_measure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {product.warehouse_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockStatusColor(product)}`}>
                        {getStockStatusText(product)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        Vizualizare
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        Editează
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
