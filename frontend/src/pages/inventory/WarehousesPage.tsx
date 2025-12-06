import { useState, useEffect } from 'react';
import { Warehouse, Plus, MapPin, TrendingUp, Edit, Trash2 } from 'lucide-react';

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  warehouse_type: string;
  address: string;
  city: string;
  county: string;
  postal_code: string;
  phone: string;
  email: string;
  is_active: boolean;
  is_sellable: boolean;
  total_stock?: number;
  total_value?: number;
  product_count?: number;
  low_stock_count?: number;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const params = new URLSearchParams({
        company_id: companyId || '',
        include_stats: 'true'
      });

      const response = await fetch(`/api/v1/inventory/warehouses.php?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch warehouses');

      const data = await response.json();
      setWarehouses(data.warehouses || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON'
    }).format(amount);
  };

  const getWarehouseTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'warehouse': 'Depozit',
      'store': 'Magazin',
      'dropship': 'Dropshipping'
    };
    return types[type] || type;
  };

  const getWarehouseTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'warehouse': 'bg-blue-100 text-blue-800',
      'store': 'bg-green-100 text-green-800',
      'dropship': 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const handleCreateWarehouse = () => {
    setEditingWarehouse(null);
    setShowModal(true);
  };

  const handleEditWarehouse = (warehouse: WarehouseData) => {
    setEditingWarehouse(warehouse);
    setShowModal(true);
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!confirm('Sigur doriți să dezactivați acest depozit?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/inventory/warehouses.php?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Eroare la ștergerea depozitului');
        return;
      }

      await fetchWarehouses();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      alert('Eroare la ștergerea depozitului');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">🏢 Depozite & Locații</h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Gestionați depozitele, magazinele și punctele de stocare
            </p>
          </div>
          <button
            onClick={handleCreateWarehouse}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium min-h-[44px]"
          >
            <Plus className="w-5 h-5 mr-2" />
            Depozit Nou
          </button>
        </div>
      </div>

      {/* Warehouses Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-500">Se încarcă depozitele...</p>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Warehouse className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Niciun depozit găsit</h3>
          <p className="text-gray-500 mb-6">Începeți prin a adăuga primul depozit</p>
          <button
            onClick={handleCreateWarehouse}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adaugă Depozit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {warehouses.map((warehouse) => (
            <div key={warehouse.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              {/* Card Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Warehouse className="w-7 h-7 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{warehouse.name}</h3>
                      <p className="text-sm text-gray-500">{warehouse.code}</p>
                    </div>
                  </div>
                  {!warehouse.is_active && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      Inactiv
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getWarehouseTypeColor(warehouse.warehouse_type)}`}>
                    {getWarehouseTypeLabel(warehouse.warehouse_type)}
                  </span>
                  {warehouse.is_sellable && (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Vânzare directă
                    </span>
                  )}
                </div>
              </div>

              {/* Card Stats */}
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Produse</p>
                    <p className="text-2xl font-bold text-gray-900">{warehouse.product_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Unități Stoc</p>
                    <p className="text-2xl font-bold text-gray-900">{warehouse.total_stock?.toLocaleString() || 0}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Valoare Totală</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(warehouse.total_value)}</p>
                  </div>
                </div>

                {warehouse.low_stock_count && warehouse.low_stock_count > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-center">
                    <TrendingUp className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="text-sm text-yellow-800">
                      {warehouse.low_stock_count} produse cu stoc scăzut
                    </span>
                  </div>
                )}
              </div>

              {/* Card Location */}
              <div className="p-6">
                <div className="flex items-start mb-3">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    {warehouse.address && <p>{warehouse.address}</p>}
                    <p>{warehouse.city}{warehouse.county ? `, ${warehouse.county}` : ''}</p>
                    {warehouse.postal_code && <p>{warehouse.postal_code}</p>}
                  </div>
                </div>

                {(warehouse.phone || warehouse.email) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                    {warehouse.phone && <p>📞 {warehouse.phone}</p>}
                    {warehouse.email && <p>📧 {warehouse.email}</p>}
                  </div>
                )}
              </div>

              {/* Card Actions - Mobile Optimized */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 rounded-b-lg flex justify-end gap-2">
                <button
                  onClick={() => handleEditWarehouse(warehouse)}
                  className="inline-flex items-center justify-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px]"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editează
                </button>
                <button
                  onClick={() => handleDeleteWarehouse(warehouse.id)}
                  className="inline-flex items-center justify-center px-3 py-2 bg-white border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50 active:bg-red-100 transition-colors min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Șterge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal would go here */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingWarehouse ? 'Editare Depozit' : 'Depozit Nou'}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-500">Formular în construcție...</p>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Anulează
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
