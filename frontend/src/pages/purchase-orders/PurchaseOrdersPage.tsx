import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Download,
} from 'lucide-react';
import purchaseOrderService, { type PurchaseOrder } from '../../services/purchaseOrders/purchaseOrderService';

const PurchaseOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const statuses = [
    { key: 'all', label: 'Toate', color: 'bg-gray-100 text-gray-800' },
    { key: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { key: 'pending_approval', label: 'Așteptare Aprobare', color: 'bg-yellow-100 text-yellow-800' },
    { key: 'approved', label: 'Aprobat', color: 'bg-green-100 text-green-800' },
    { key: 'sent', label: 'Trimis', color: 'bg-blue-100 text-blue-800' },
    { key: 'partially_received', label: 'Recepționat Parțial', color: 'bg-orange-100 text-orange-800' },
    { key: 'received', label: 'Recepționat', color: 'bg-green-100 text-green-800' },
    { key: 'rejected', label: 'Respins', color: 'bg-red-100 text-red-800' },
    { key: 'cancelled', label: 'Anulat', color: 'bg-gray-100 text-gray-800' },
  ];

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  useEffect(() => {
    filterPurchaseOrders();
  }, [purchaseOrders, searchTerm, statusFilter]);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await purchaseOrderService.listPurchaseOrders();
      setPurchaseOrders(data);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
      setError('Nu s-au putut încărca comenzile de achiziție. Vă rugăm încercați din nou.');
    } finally {
      setLoading(false);
    }
  };

  const filterPurchaseOrders = () => {
    let filtered = [...purchaseOrders];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((po) => po.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (po) =>
          po.po_number.toLowerCase().includes(term) ||
          po.vendor_name.toLowerCase().includes(term) ||
          po.reference_number?.toLowerCase().includes(term)
      );
    }

    setFilteredPOs(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusObj = statuses.find((s) => s.key === status);
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusObj?.color || 'bg-gray-100 text-gray-800'}`}>
        {statusObj?.label || status}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-4 h-4 text-gray-500" />;
      case 'pending_approval':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'sent':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'partially_received':
        return <Package className="w-4 h-4 text-orange-500" />;
      case 'received':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency || 'RON',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Eroare la încărcarea datelor</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadPurchaseOrders}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Încearcă din nou
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Comenzi de Achiziție</h1>
            <p className="text-sm text-gray-600 mt-1">Gestionează comenzile de achiziție și aprovizionarea</p>
          </div>
          <button
            onClick={() => navigate('/purchase-orders/create')}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adaugă Comandă
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Caută după număr comandă, furnizor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statuses.map((status) => (
              <option key={status.key} value={status.key}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Purchase Orders List - Mobile Cards */}
      <div className="block md:hidden space-y-4">
        {filteredPOs.map((po) => (
          <div
            key={po.id}
            onClick={() => navigate(`/purchase-orders/${po.id}`)}
            className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(po.status)}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{po.po_number}</h3>
                  <p className="text-xs text-gray-600">{po.vendor_name}</p>
                </div>
              </div>
              {getStatusBadge(po.status)}
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dată comandă:</span>
                <span className="font-medium">{formatDate(po.order_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Valoare totală:</span>
                <span className="font-bold text-green-600">{formatCurrency(po.total_amount, po.currency)}</span>
              </div>
              {po.items_count && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Produse:</span>
                  <span className="font-medium">{po.items_count} articole</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/purchase-orders/${po.id}`);
                }}
                className="flex-1 px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                <Eye className="w-3 h-3 inline mr-1" />
                Vezi
              </button>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-3 py-2 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
              >
                <Edit className="w-3 h-3 inline mr-1" />
                Editează
              </button>
            </div>
          </div>
        ))}

        {filteredPOs.length === 0 && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Nu există comenzi de achiziție</p>
            <button
              onClick={() => navigate('/purchase-orders/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Creează prima comandă
            </button>
          </div>
        )}
      </div>

      {/* Purchase Orders Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Număr Comandă
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Furnizor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dată Comandă
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valoare Totală
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acțiuni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPOs.map((po) => (
              <tr
                key={po.id}
                onClick={() => navigate(`/purchase-orders/${po.id}`)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(po.status)}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{po.po_number}</div>
                      {po.reference_number && (
                        <div className="text-xs text-gray-500">Ref: {po.reference_number}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{po.vendor_name}</div>
                  {po.vendor_email && <div className="text-xs text-gray-500">{po.vendor_email}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(po.order_date)}</div>
                  {po.expected_delivery_date && (
                    <div className="text-xs text-gray-500">Livrare: {formatDate(po.expected_delivery_date)}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(po.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(po.total_amount, po.currency)}
                  </div>
                  {po.items_count && <div className="text-xs text-gray-500">{po.items_count} articole</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/purchase-orders/${po.id}`);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Vezi detalii"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Editează"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Descarcă PDF"
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredPOs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Nu există comenzi de achiziție</p>
                  <button
                    onClick={() => navigate('/purchase-orders/create')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Creează prima comandă
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseOrdersPage;
