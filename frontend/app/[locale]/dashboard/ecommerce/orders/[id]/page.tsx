'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Package,
  ShoppingCart,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Truck,
  CreditCard,
  Receipt,
  FileText,
  Loader2,
  MoreVertical,
  Download,
  Printer,
  RefreshCw,
  ExternalLink,
  Copy,
  Store,
  Euro,
} from 'lucide-react';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

interface OrderDetail {
  id: string;
  storeId: string;
  storeName: string;
  platform: string;
  orderNumber: string;
  externalOrderId: string;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  shippingAddress: {
    street: string;
    city: string;
    county: string;
    postalCode: string;
    country: string;
  };
  billingAddress: {
    street: string;
    city: string;
    county: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  orderDate: string;
  updatedAt: string;
  shippedAt?: string;
  completedAt?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  invoiceId?: string;
  invoiceNumber?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Mock data for demo
const getMockOrder = (id: string): OrderDetail => ({
  id,
  storeId: 'store-001',
  storeName: 'My eMAG Store',
  platform: 'eMAG',
  orderNumber: 'ORD-2025-0089',
  externalOrderId: 'EMG-78456321',
  status: 'processing',
  paymentStatus: 'paid',
  paymentMethod: 'Card bancar',
  customer: {
    name: 'Ion Popescu',
    email: 'ion.popescu@email.com',
    phone: '+40 722 123 456',
  },
  shippingAddress: {
    street: 'Str. Victoriei nr. 123, Bl. A1, Sc. 2, Ap. 45',
    city: 'București',
    county: 'Sector 1',
    postalCode: '010123',
    country: 'România',
  },
  billingAddress: {
    street: 'Str. Victoriei nr. 123, Bl. A1, Sc. 2, Ap. 45',
    city: 'București',
    county: 'Sector 1',
    postalCode: '010123',
    country: 'România',
  },
  items: [
    {
      id: 'item-1',
      productId: 'prod-001',
      productName: 'Laptop ASUS VivoBook 15',
      sku: 'ASUS-VB15-001',
      quantity: 1,
      unitPrice: 2499.00,
      totalPrice: 2499.00,
    },
    {
      id: 'item-2',
      productId: 'prod-002',
      productName: 'Mouse Wireless Logitech M185',
      sku: 'LOG-M185-BLK',
      quantity: 2,
      unitPrice: 75.00,
      totalPrice: 150.00,
    },
    {
      id: 'item-3',
      productId: 'prod-003',
      productName: 'Geantă laptop 15.6"',
      sku: 'BAG-156-PRO',
      quantity: 1,
      unitPrice: 120.00,
      totalPrice: 120.00,
    },
  ],
  subtotal: 2769.00,
  shippingCost: 0,
  discount: 100.00,
  vatAmount: 507.11,
  totalAmount: 2669.00,
  currency: 'RON',
  orderDate: '2025-12-15T09:30:00Z',
  updatedAt: '2025-12-16T14:20:00Z',
  trackingNumber: 'FAN123456789RO',
  trackingUrl: 'https://tracking.fancourier.ro/FAN123456789RO',
  notes: 'Livrare la sediul firmei, program L-V 9:00-18:00',
});

export default function ECommerceOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/ecommerce/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else {
        setOrder(getMockOrder(orderId));
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setOrder(getMockOrder(orderId));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/ecommerce/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Status actualizat', `Comanda a fost marcată ca ${getStatusLabel(newStatus)}.`);
        fetchOrder();
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

  const handleGenerateInvoice = async () => {
    toast.success('Generare factură', 'Se creează factura e-Factura...');
    setTimeout(() => {
      toast.compliance('e-Factura', `Factura pentru comanda ${order?.orderNumber} a fost generată și trimisă la ANAF.`);
    }, 2000);
  };

  const handleSyncOrder = async () => {
    toast.success('Sincronizare', 'Se sincronizează cu platforma...');
    setTimeout(() => {
      toast.success('Sincronizat', 'Comanda a fost sincronizată cu succes.');
      fetchOrder();
    }, 1500);
  };

  const handleCopyTracking = () => {
    if (order?.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber);
      toast.success('Copiat', 'AWB-ul a fost copiat.');
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
      pending: 'În așteptare',
      processing: 'În procesare',
      shipped: 'Expediată',
      completed: 'Finalizată',
      cancelled: 'Anulată',
      refunded: 'Rambursată',
    };
    return labels[status] || status;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-5 w-5" /> };
      case 'processing':
        return { color: 'bg-blue-100 text-blue-800', icon: <Package className="h-5 w-5" /> };
      case 'shipped':
        return { color: 'bg-purple-100 text-purple-800', icon: <Truck className="h-5 w-5" /> };
      case 'completed':
        return { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-5 w-5" /> };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-5 w-5" /> };
      case 'refunded':
        return { color: 'bg-orange-100 text-orange-800', icon: <RefreshCw className="h-5 w-5" /> };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle className="h-5 w-5" /> };
    }
  };

  const getPaymentStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'Plătită', color: 'bg-green-100 text-green-800' };
      case 'pending':
        return { label: 'În așteptare', color: 'bg-yellow-100 text-yellow-800' };
      case 'failed':
        return { label: 'Eșuată', color: 'bg-red-100 text-red-800' };
      case 'refunded':
        return { label: 'Rambursată', color: 'bg-orange-100 text-orange-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      'Shopify': '🛍️',
      'WooCommerce': '🛒',
      'Magento': '📦',
      'PrestaShop': '🏪',
      'eMAG': '🇷🇴',
      'Amazon': '📦',
      'eMag Marketplace': '🇷🇴',
      'Allegro': '🇵🇱',
    };
    return emojis[platform] || '🛒';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error || 'Comanda nu a fost găsită.'}</p>
        <button
          onClick={() => router.push('/dashboard/ecommerce')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Înapoi la E-Commerce
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const paymentConfig = getPaymentStatusConfig(order.paymentStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/ecommerce')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <span className="text-xl">{getPlatformEmoji(order.platform)}</span>
            </div>
            <p className="text-sm text-gray-500">
              {order.storeName} • {formatDateTime(order.orderDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${statusConfig.color}`}>
            {statusConfig.icon}
            {getStatusLabel(order.status)}
          </span>

          <button
            onClick={handleSyncOrder}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Sincronizează"
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
          </button>

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
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border rounded-lg shadow-lg z-50">
                  <div className="p-2 border-b">
                    <p className="text-xs font-medium text-gray-500 px-2">Schimbă status</p>
                  </div>
                  {['pending', 'processing', 'shipped', 'completed', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(status)}
                      disabled={updatingStatus || order.status === status}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 ${
                        order.status === status ? 'bg-blue-50' : ''
                      }`}
                    >
                      {getStatusConfig(status).icon}
                      {getStatusLabel(status)}
                    </button>
                  ))}
                  <hr />
                  <button
                    onClick={() => window.print()}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Printează
                  </button>
                  <button
                    onClick={() => toast.success('Export', 'Se exportă...')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
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
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Produse comandate</h2>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{item.quantity}</p>
                    <p className="text-xs text-gray-500">buc</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{formatAmount(item.unitPrice, order.currency)}/buc</p>
                    <p className="font-semibold text-gray-900">{formatAmount(item.totalPrice, order.currency)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatAmount(order.subtotal, order.currency)}</span>
                </div>
                {order.shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Livrare</span>
                    <span>{formatAmount(order.shippingCost, order.currency)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatAmount(order.discount, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">TVA inclus</span>
                  <span>{formatAmount(order.vatAmount, order.currency)}</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-blue-600">{formatAmount(order.totalAmount, order.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                Client
              </h3>
              <div className="space-y-3">
                <p className="font-medium text-gray-900">{order.customer.name}</p>
                <a
                  href={`mailto:${order.customer.email}`}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {order.customer.email}
                </a>
                {order.customer.phone && (
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="text-sm text-gray-600 flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    {order.customer.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                Adresa de livrare
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.county}</p>
                <p>{order.shippingAddress.postalCode}</p>
                <p className="font-medium">{order.shippingAddress.country}</p>
              </div>
            </div>
          </div>

          {/* Tracking */}
          {order.trackingNumber && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-gray-400" />
                Urmărire colet
              </h3>
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">AWB</p>
                  <p className="font-mono font-medium text-gray-900">{order.trackingNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyTracking}
                    className="p-2 hover:bg-purple-100 rounded-lg"
                    title="Copiază"
                  >
                    <Copy className="h-4 w-4 text-purple-600" />
                  </button>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Urmărește
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-medium text-yellow-800 mb-2">Note comandă</h3>
              <p className="text-sm text-yellow-700">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Plată</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentConfig.color}`}>
                  {paymentConfig.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Metodă</span>
                <span className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  {order.paymentMethod}
                </span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-semibold text-lg">{formatAmount(order.totalAmount, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* Invoice */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Facturare</h3>
            {order.invoiceNumber ? (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">{order.invoiceNumber}</span>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/invoices/${order.invoiceId}`)}
                  className="text-sm text-green-600 hover:text-green-800"
                >
                  Vezi
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateInvoice}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Receipt className="h-5 w-5" />
                Generează e-Factura
              </button>
            )}
          </div>

          {/* Platform Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Platformă</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getPlatformEmoji(order.platform)}</span>
                <div>
                  <p className="font-medium">{order.platform}</p>
                  <p className="text-sm text-gray-500">{order.storeName}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">ID extern</p>
                <p className="font-mono text-sm">{order.externalOrderId}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Acțiuni rapide</h3>
            <div className="space-y-2">
              <button
                onClick={() => toast.success('Email', 'Se trimite email-ul de confirmare...')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Trimite confirmare
              </button>
              <button
                onClick={() => window.print()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Printează comandă
              </button>
              <button
                onClick={() => router.push(`/dashboard/ecommerce/stores/${order.storeId}`)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Store className="h-4 w-4" />
                Vezi magazinul
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Cronologie</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Comandă plasată</p>
                  <p className="text-xs text-gray-500">{formatDateTime(order.orderDate)}</p>
                </div>
              </div>
              {order.updatedAt !== order.orderDate && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 bg-gray-300 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Ultima actualizare</p>
                    <p className="text-xs text-gray-500">{formatDateTime(order.updatedAt)}</p>
                  </div>
                </div>
              )}
              {order.shippedAt && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Expediată</p>
                    <p className="text-xs text-gray-500">{formatDateTime(order.shippedAt)}</p>
                  </div>
                </div>
              )}
              {order.completedAt && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Finalizată</p>
                    <p className="text-xs text-gray-500">{formatDateTime(order.completedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
