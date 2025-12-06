import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  Edit,
  Download,
  Check,
  X,
} from 'lucide-react';
import purchaseOrderService, { type PurchaseOrder } from '../../services/purchaseOrders/purchaseOrderService';

const PurchaseOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPurchaseOrder(id);
    }
  }, [id]);

  const loadPurchaseOrder = async (poId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await purchaseOrderService.getPurchaseOrder(poId);
      setPurchaseOrder(data);
    } catch (err) {
      console.error('Failed to load purchase order:', err);
      setError('Nu s-a putut încărca comanda de achiziție. Vă rugăm încercați din nou.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!purchaseOrder?.id) return;
    try {
      await purchaseOrderService.approvePurchaseOrder(purchaseOrder.id);
      loadPurchaseOrder(purchaseOrder.id);
    } catch (err) {
      console.error('Failed to approve PO:', err);
    }
  };

  const handleReject = async () => {
    if (!purchaseOrder?.id) return;
    const reason = prompt('Motiv respingere:');
    if (!reason) return;
    try {
      await purchaseOrderService.rejectPurchaseOrder(purchaseOrder.id, reason);
      loadPurchaseOrder(purchaseOrder.id);
    } catch (err) {
      console.error('Failed to reject PO:', err);
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      pending_approval: { label: 'Așteptare Aprobare', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Aprobat', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Respins', className: 'bg-red-100 text-red-800' },
      sent: { label: 'Trimis', className: 'bg-blue-100 text-blue-800' },
      partially_received: { label: 'Recepționat Parțial', className: 'bg-orange-100 text-orange-800' },
      received: { label: 'Recepționat', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Anulat', className: 'bg-gray-100 text-gray-800' },
    };

    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Eroare la încărcarea datelor</h3>
            <p className="text-sm text-red-700 mt-1">{error || 'Comanda nu a fost găsită'}</p>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => navigate('/purchase-orders')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Înapoi la listă
              </button>
              {id && (
                <button
                  onClick={() => loadPurchaseOrder(id)}
                  className="px-4 py-2 bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 text-sm"
                >
                  Încearcă din nou
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/purchase-orders"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Înapoi la comenzi
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{purchaseOrder.po_number}</h1>
            <div className="flex items-center gap-3 mt-2">
              {getStatusBadge(purchaseOrder.status)}
              {purchaseOrder.reference_number && (
                <span className="text-sm text-gray-600">Ref: {purchaseOrder.reference_number}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {purchaseOrder.status === 'pending_approval' && (
              <>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Aprobă
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Respinge
                </button>
              </>
            )}
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Editează
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Details Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalii Comandă</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Dată comandă</p>
                  <p className="text-base font-medium text-gray-900">{formatDate(purchaseOrder.order_date)}</p>
                </div>
              </div>

              {purchaseOrder.expected_delivery_date && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Livrare estimată</p>
                    <p className="text-base font-medium text-gray-900">
                      {formatDate(purchaseOrder.expected_delivery_date)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Valoare totală</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(purchaseOrder.total_amount, purchaseOrder.currency)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Total articole</p>
                  <p className="text-base font-medium text-gray-900">{purchaseOrder.items?.length || 0}</p>
                </div>
              </div>
            </div>

            {purchaseOrder.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Notițe</p>
                <p className="text-sm text-gray-900">{purchaseOrder.notes}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Produse</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produs
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantitate
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preț Unitar
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recepționat
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseOrder.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                        {item.product_code && (
                          <div className="text-xs text-gray-500">Cod: {item.product_code}</div>
                        )}
                        {item.description && (
                          <div className="text-xs text-gray-600 mt-1">{item.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm text-gray-900">{item.quantity}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(item.unit_price, purchaseOrder.currency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.total_amount, purchaseOrder.currency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm text-gray-900">
                          {item.quantity_received} / {item.quantity}
                        </div>
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${(item.quantity_received / item.quantity) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                      Subtotal:
                    </td>
                    <td colSpan={2} className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(purchaseOrder.subtotal, purchaseOrder.currency)}
                    </td>
                  </tr>
                  {purchaseOrder.tax_amount > 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                        TVA:
                      </td>
                      <td colSpan={2} className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(purchaseOrder.tax_amount, purchaseOrder.currency)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-right text-base font-bold text-gray-900">
                      Total:
                    </td>
                    <td colSpan={2} className="px-6 py-3 text-right text-base font-bold text-green-600">
                      {formatCurrency(purchaseOrder.total_amount, purchaseOrder.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar - Right 1/3 */}
        <div className="space-y-6">
          {/* Vendor Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Furnizor</h3>
            <div className="space-y-3">
              <div>
                <p className="text-base font-medium text-gray-900">{purchaseOrder.vendor_name}</p>
              </div>
              {purchaseOrder.vendor_email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${purchaseOrder.vendor_email}`} className="hover:text-blue-600">
                    {purchaseOrder.vendor_email}
                  </a>
                </div>
              )}
              {purchaseOrder.vendor_phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${purchaseOrder.vendor_phone}`} className="hover:text-blue-600">
                    {purchaseOrder.vendor_phone}
                  </a>
                </div>
              )}
              {purchaseOrder.vendor_address && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{purchaseOrder.vendor_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Approval Info */}
          {(purchaseOrder.approved_by_name || purchaseOrder.rejected_by_name) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Status Aprobare</h3>
              {purchaseOrder.approved_by_name && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-gray-600">Aprobat de</p>
                    <p className="font-medium text-gray-900">{purchaseOrder.approved_by_name}</p>
                    {purchaseOrder.approved_at && (
                      <p className="text-xs text-gray-500">{formatDate(purchaseOrder.approved_at)}</p>
                    )}
                  </div>
                </div>
              )}
              {purchaseOrder.rejected_by_name && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-gray-600">Respins de</p>
                      <p className="font-medium text-gray-900">{purchaseOrder.rejected_by_name}</p>
                      {purchaseOrder.rejected_at && (
                        <p className="text-xs text-gray-500">{formatDate(purchaseOrder.rejected_at)}</p>
                      )}
                    </div>
                  </div>
                  {purchaseOrder.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800">
                      {purchaseOrder.rejection_reason}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Additional Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Informații Suplimentare</h3>
            <div className="space-y-3 text-sm">
              {purchaseOrder.payment_terms && (
                <div>
                  <p className="text-gray-600">Termeni de plată</p>
                  <p className="font-medium text-gray-900">{purchaseOrder.payment_terms}</p>
                </div>
              )}
              {purchaseOrder.delivery_address && (
                <div>
                  <p className="text-gray-600">Adresă livrare</p>
                  <p className="font-medium text-gray-900">{purchaseOrder.delivery_address}</p>
                </div>
              )}
              <div>
                <p className="text-gray-600">Creat de</p>
                <p className="font-medium text-gray-900">{purchaseOrder.created_by_name || 'N/A'}</p>
                <p className="text-xs text-gray-500">{formatDate(purchaseOrder.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailPage;
