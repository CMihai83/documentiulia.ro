'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Package,
  Building2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Truck,
  FileText,
  Loader2,
  MoreVertical,
  Download,
  Printer,
  Mail,
  Edit,
  Trash2,
  Send,
  CheckSquare,
  RefreshCw,
  ExternalLink,
  Copy,
  User,
  Euro,
  ClipboardCheck,
} from 'lucide-react';

interface POItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
  status: 'pending' | 'partial' | 'received';
}

interface PurchaseOrderDetail {
  id: string;
  poNumber: string;
  vendor: {
    id: string;
    name: string;
    code: string;
    email: string;
    phone?: string;
    address: string;
    paymentTerms: string;
  };
  items: POItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deliveryAddress: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  internalNotes?: string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  linkedRequisitionId?: string;
  linkedRequisitionNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Mock data for demo
const getMockPO = (id: string): PurchaseOrderDetail => ({
  id,
  poNumber: 'PO-2025-0156',
  vendor: {
    id: 'vendor-001',
    name: 'Office Supplies SRL',
    code: 'V-001',
    email: 'comenzi@officesupplies.ro',
    phone: '+40 21 123 4567',
    address: 'Str. Industriilor nr. 45, București, Sector 3',
    paymentTerms: 'Net 30',
  },
  items: [
    {
      id: 'item-1',
      productId: 'prod-001',
      productCode: 'PAPER-A4-500',
      productName: 'Hârtie A4 500 coli',
      description: 'Hârtie de copiat 80g/m²',
      quantity: 100,
      unit: 'top',
      unitPrice: 25.00,
      totalPrice: 2500.00,
      receivedQuantity: 0,
      status: 'pending',
    },
    {
      id: 'item-2',
      productId: 'prod-002',
      productCode: 'TONER-HP-85A',
      productName: 'Toner HP 85A Original',
      description: 'Cartuș toner pentru HP LaserJet',
      quantity: 10,
      unit: 'buc',
      unitPrice: 180.00,
      totalPrice: 1800.00,
      receivedQuantity: 0,
      status: 'pending',
    },
    {
      id: 'item-3',
      productId: 'prod-003',
      productCode: 'PEN-BIC-BLUE',
      productName: 'Pixuri BIC Cristal albastru',
      description: 'Set 50 pixuri',
      quantity: 5,
      unit: 'set',
      unitPrice: 45.00,
      totalPrice: 225.00,
      receivedQuantity: 0,
      status: 'pending',
    },
  ],
  subtotal: 4525.00,
  vatAmount: 859.75,
  totalAmount: 5384.75,
  currency: 'RON',
  status: 'approved',
  priority: 'medium',
  deliveryAddress: 'Depozit Central, Str. Logisticii nr. 10, București',
  expectedDeliveryDate: '2025-12-20',
  notes: 'Livrare între orele 9:00-17:00. Contact: Ion Popescu - 0722123456',
  internalNotes: 'Verificare stoc înainte de recepție',
  requestedBy: 'Maria Ionescu',
  approvedBy: 'Director Achiziții',
  approvedAt: '2025-12-15T10:30:00Z',
  createdAt: '2025-12-14T09:00:00Z',
  updatedAt: '2025-12-15T10:30:00Z',
  linkedRequisitionId: 'req-001',
  linkedRequisitionNumber: 'PR-2025-0089',
});

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const orderId = params.id as string;

  const [po, setPO] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});

  const fetchPO = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/procurement/purchase-orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPO(data);
      } else {
        setPO(getMockPO(orderId));
      }
    } catch (err) {
      console.error('Error fetching PO:', err);
      setPO(getMockPO(orderId));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchPO();
  }, [fetchPO]);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/procurement/purchase-orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Status actualizat', `Comanda a fost marcată ca ${getStatusLabel(newStatus)}.`);
        fetchPO();
      } else {
        toast.error('Eroare', 'Nu s-a putut actualiza statusul.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut actualiza statusul.');
    } finally {
      setUpdatingStatus(false);
      setShowActionsMenu(false);
    }
  };

  const handleSendToVendor = async () => {
    toast.success('Trimitere comandă', 'Se trimite comanda către furnizor...');
    setTimeout(() => {
      toast.success('Comandă trimisă', `Comanda ${po?.poNumber} a fost trimisă la ${po?.vendor.email}`);
      fetchPO();
    }, 1500);
  };

  const handleReceiveItems = async () => {
    const itemsToReceive = Object.entries(receiveQuantities).filter(([_, qty]) => qty > 0);
    if (itemsToReceive.length === 0) {
      toast.error('Eroare', 'Selectați cel puțin un articol pentru recepție.');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/procurement/purchase-orders/${orderId}/receive`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: receiveQuantities }),
      });

      if (response.ok) {
        toast.success('Recepție înregistrată', 'Articolele au fost recepționate cu succes.');
        setShowReceiveModal(false);
        setReceiveQuantities({});
        fetchPO();
      } else {
        toast.error('Eroare', 'Nu s-a putut înregistra recepția.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut înregistra recepția.');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/procurement/purchase-orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Comandă ștearsă', 'Comanda a fost ștearsă cu succes.');
        router.push('/dashboard/procurement');
      } else {
        toast.error('Eroare', 'Nu s-a putut șterge comanda.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut șterge comanda.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCopyPONumber = () => {
    if (po?.poNumber) {
      navigator.clipboard.writeText(po.poNumber);
      toast.success('Copiat', 'Numărul comenzii a fost copiat.');
    }
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Ciornă',
      pending_approval: 'Așteaptă aprobare',
      approved: 'Aprobată',
      sent: 'Trimisă',
      partially_received: 'Parțial recepționată',
      received: 'Recepționată',
      cancelled: 'Anulată',
    };
    return labels[status] || status;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return { color: 'bg-gray-100 text-gray-800', icon: <FileText className="h-5 w-5" /> };
      case 'pending_approval':
        return { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-5 w-5" /> };
      case 'approved':
        return { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-5 w-5" /> };
      case 'sent':
        return { color: 'bg-purple-100 text-purple-800', icon: <Send className="h-5 w-5" /> };
      case 'partially_received':
        return { color: 'bg-orange-100 text-orange-800', icon: <Package className="h-5 w-5" /> };
      case 'received':
        return { color: 'bg-green-100 text-green-800', icon: <CheckSquare className="h-5 w-5" /> };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-5 w-5" /> };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle className="h-5 w-5" /> };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { label: 'Urgent', color: 'bg-red-100 text-red-800' };
      case 'high':
        return { label: 'Ridicată', color: 'bg-orange-100 text-orange-800' };
      case 'medium':
        return { label: 'Medie', color: 'bg-yellow-100 text-yellow-800' };
      case 'low':
        return { label: 'Scăzută', color: 'bg-green-100 text-green-800' };
      default:
        return { label: priority, color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error || 'Comanda nu a fost găsită.'}</p>
        <button
          onClick={() => router.push('/dashboard/procurement')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Înapoi la achiziții
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(po.status);
  const priorityConfig = getPriorityConfig(po.priority);
  const totalReceived = po.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity, 0);
  const receiveProgress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/procurement')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
              <button onClick={handleCopyPONumber} className="p-1 hover:bg-gray-100 rounded">
                <Copy className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              {po.vendor.name} • Creată {formatDate(po.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.color}`}>
            {priorityConfig.label}
          </span>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${statusConfig.color}`}>
            {statusConfig.icon}
            {getStatusLabel(po.status)}
          </span>

          {po.status === 'approved' && (
            <button
              onClick={handleSendToVendor}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Trimite furnizor
            </button>
          )}

          {(po.status === 'sent' || po.status === 'partially_received') && (
            <button
              onClick={() => setShowReceiveModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <ClipboardCheck className="h-4 w-4" />
              Recepție
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>

            {showActionsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => router.push(`/dashboard/procurement/orders/${orderId}/edit`)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editează
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Printează
                  </button>
                  <button
                    onClick={() => toast.success('Export', 'Se exportă PDF...')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </button>
                  <hr className="my-1" />
                  {po.status === 'draft' && (
                    <button
                      onClick={() => handleStatusUpdate('pending_approval')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Trimite pentru aprobare
                    </button>
                  )}
                  {po.status !== 'cancelled' && po.status !== 'received' && (
                    <button
                      onClick={() => handleStatusUpdate('cancelled')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <XCircle className="h-4 w-4" />
                      Anulează
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Șterge
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Articole comandate</h2>

            <div className="space-y-3">
              {po.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === 'received' ? 'bg-green-100 text-green-800' :
                        item.status === 'partial' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status === 'received' ? 'Recepționat' :
                         item.status === 'partial' ? 'Parțial' : 'Așteptare'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{item.productCode}</p>
                    {item.description && (
                      <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{item.quantity}</p>
                    <p className="text-xs text-gray-500">{item.unit}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">{item.receivedQuantity}/{item.quantity}</p>
                    <p className="text-xs text-gray-500">recepționat</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{formatAmount(item.unitPrice, po.currency)}/{item.unit}</p>
                    <p className="font-semibold text-gray-900">{formatAmount(item.totalPrice, po.currency)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatAmount(po.subtotal, po.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">TVA (19%)</span>
                  <span>{formatAmount(po.vatAmount, po.currency)}</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-blue-600">{formatAmount(po.totalAmount, po.currency)}</span>
                </div>
              </div>
            </div>

            {/* Receive Progress */}
            {(po.status === 'sent' || po.status === 'partially_received' || po.status === 'received') && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progres recepție</span>
                  <span className="font-medium">{totalReceived} / {totalOrdered} articole</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${receiveProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Delivery Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Livrare</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Adresa livrare</p>
                <p className="font-medium text-gray-900 mt-1">{po.deliveryAddress}</p>
              </div>
              {po.expectedDeliveryDate && (
                <div>
                  <p className="text-sm text-gray-500">Data estimată livrare</p>
                  <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatDate(po.expectedDeliveryDate)}
                  </p>
                </div>
              )}
            </div>
            {po.notes && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">{po.notes}</p>
              </div>
            )}
          </div>

          {/* Linked Documents */}
          {(po.linkedRequisitionNumber || po.invoiceNumber) && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Documente legate</h2>
              <div className="space-y-3">
                {po.linkedRequisitionNumber && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Cerere de achiziție</p>
                        <p className="font-medium text-blue-800">{po.linkedRequisitionNumber}</p>
                      </div>
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-800">Vezi</button>
                  </div>
                )}
                {po.invoiceNumber && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Factură furnizor</p>
                        <p className="font-medium text-green-800">{po.invoiceNumber}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/invoices/${po.invoiceId}`)}
                      className="text-sm text-green-600 hover:text-green-800"
                    >
                      Vezi
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vendor Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Furnizor</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{po.vendor.name}</p>
                  <p className="text-sm text-gray-500">Cod: {po.vendor.code}</p>
                </div>
              </div>
              <a
                href={`mailto:${po.vendor.email}`}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {po.vendor.email}
              </a>
              {po.vendor.phone && (
                <p className="text-sm text-gray-600">{po.vendor.phone}</p>
              )}
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-500">Termen plată</p>
                <p className="font-medium">{po.vendor.paymentTerms}</p>
              </div>
              <button
                onClick={() => router.push(`/dashboard/partners/${po.vendor.id}`)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Profil furnizor
              </button>
            </div>
          </div>

          {/* Approval Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Flux aprobare</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Solicitată de</p>
                  <p className="text-sm text-gray-600">{po.requestedBy}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(po.createdAt)}</p>
                </div>
              </div>
              {po.approvedBy && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Aprobată de</p>
                    <p className="text-sm text-gray-600">{po.approvedBy}</p>
                    {po.approvedAt && (
                      <p className="text-xs text-gray-400">{formatDateTime(po.approvedAt)}</p>
                    )}
                  </div>
                </div>
              )}
              {po.sentAt && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Trimisă furnizor</p>
                    <p className="text-xs text-gray-400">{formatDateTime(po.sentAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Acțiuni rapide</h3>
            <div className="space-y-2">
              <button
                onClick={() => toast.success('Email', 'Se trimite email către furnizor...')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Contactează furnizor
              </button>
              <button
                onClick={() => toast.success('Duplicare', 'Se creează o copie...')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Duplică comanda
              </button>
              <button
                onClick={() => router.push('/dashboard/procurement/orders/new')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Comandă nouă
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recepție marfă</h2>
            <p className="text-sm text-gray-600 mb-4">Introduceți cantitățile recepționate pentru fiecare articol:</p>

            <div className="space-y-3">
              {po.items.filter(item => item.receivedQuantity < item.quantity).map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-sm text-gray-500">
                      Comandat: {item.quantity} {item.unit} | Recepționat: {item.receivedQuantity}
                    </p>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      max={item.quantity - item.receivedQuantity}
                      value={receiveQuantities[item.id] || ''}
                      onChange={(e) => setReceiveQuantities({
                        ...receiveQuantities,
                        [item.id]: parseInt(e.target.value) || 0
                      })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={handleReceiveItems}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <ClipboardCheck className="h-4 w-4" />
                Confirmă recepție
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Confirmare ștergere</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Sigur dorești să ștergi comanda <strong>{po.poNumber}</strong>? Această acțiune nu poate fi anulată.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
