'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  Store,
  Package,
  ShoppingCart,
  DollarSign,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Users,
  RefreshCw,
  FileText,
  Link as LinkIcon,
  Zap,
  Globe,
} from 'lucide-react';

// TODO: Replace with actual API endpoints
// Backend endpoints: /api/v1/ecommerce/*
// - GET /platforms - supported platforms
// - POST /stores/connect - connect a store
// - GET /stores - list connected stores
// - GET /stores/:storeId/products - list products
// - GET /stores/:storeId/orders - list orders
// - GET /stores/:storeId/customers - list customers
// - GET /stores/:storeId/inventory - inventory levels
// - GET /stores/:storeId/analytics - store analytics

type PlatformType = 'Shopify' | 'WooCommerce' | 'Magento' | 'PrestaShop' | 'eMAG' | 'Amazon' | 'eMag Marketplace' | 'Allegro';

interface Store {
  id: string;
  name: string;
  platform: PlatformType;
  status: 'connected' | 'disconnected' | 'error';
  url: string;
  lastSync: string;
}

interface Product {
  id: string;
  storeId: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  category: string;
  image?: string;
}

interface Order {
  id: string;
  storeId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  totalAmount: number;
  currency: string;
  itemCount: number;
  orderDate: string;
  platform: string;
}

interface Analytics {
  totalRevenue: number;
  ordersCount: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: Array<{ name: string; sales: number }>;
  revenueByDay: Array<{ date: string; revenue: number }>;
}

const platformLogos: Record<PlatformType, string> = {
  Shopify: '🛍️',
  WooCommerce: '🛒',
  Magento: '📦',
  PrestaShop: '🏪',
  eMAG: '🇷🇴',
  Amazon: '📦',
  'eMag Marketplace': '🇷🇴',
  Allegro: '🇵🇱',
};

const platformColors: Record<PlatformType, string> = {
  Shopify: 'bg-green-50 text-green-700 border-green-200',
  WooCommerce: 'bg-purple-50 text-purple-700 border-purple-200',
  Magento: 'bg-orange-50 text-orange-700 border-orange-200',
  PrestaShop: 'bg-pink-50 text-pink-700 border-pink-200',
  eMAG: 'bg-red-50 text-red-700 border-red-200',
  Amazon: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'eMag Marketplace': 'bg-red-50 text-red-700 border-red-200',
  Allegro: 'bg-orange-50 text-orange-700 border-orange-200',
};

// Platform categories for the connect modal
const platformCategories = {
  'E-commerce Platforms': ['Shopify', 'WooCommerce', 'Magento', 'PrestaShop'] as PlatformType[],
  'Romanian Marketplaces': ['eMAG', 'eMag Marketplace'] as PlatformType[],
  'International Marketplaces': ['Amazon', 'Allegro'] as PlatformType[],
};

export default function EcommercePage() {
  const t = useTranslations('ecommerce');
  const toast = useToast();

  // Mock data - TODO: Replace with API calls
  const [stores, setStores] = useState<Store[]>([
    {
      id: '1',
      name: 'Main Store',
      platform: 'Shopify',
      status: 'connected',
      url: 'https://mystore.shopify.com',
      lastSync: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'WooCommerce Store',
      platform: 'WooCommerce',
      status: 'connected',
      url: 'https://shop.example.com',
      lastSync: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      name: 'eMAG Marketplace',
      platform: 'eMAG',
      status: 'connected',
      url: 'https://marketplace.emag.ro',
      lastSync: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);

  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      storeId: '1',
      name: 'Premium Laptop',
      sku: 'LAP-001',
      price: 4999.99,
      stock: 15,
      stockStatus: 'in_stock',
      category: 'Electronics',
    },
    {
      id: '2',
      storeId: '1',
      name: 'Wireless Mouse',
      sku: 'MSE-002',
      price: 129.99,
      stock: 3,
      stockStatus: 'low_stock',
      category: 'Accessories',
    },
    {
      id: '3',
      storeId: '2',
      name: 'Mechanical Keyboard',
      sku: 'KBD-003',
      price: 399.99,
      stock: 0,
      stockStatus: 'out_of_stock',
      category: 'Accessories',
    },
  ]);

  const [orders, setOrders] = useState<Order[]>([
    {
      id: '1',
      storeId: '1',
      orderNumber: 'ORD-2025-001',
      customerName: 'Ion Popescu',
      customerEmail: 'ion@example.com',
      status: 'processing',
      totalAmount: 5499.98,
      currency: 'RON',
      itemCount: 2,
      orderDate: new Date().toISOString(),
      platform: 'Shopify',
    },
    {
      id: '2',
      storeId: '1',
      orderNumber: 'ORD-2025-002',
      customerName: 'Maria Ionescu',
      customerEmail: 'maria@example.com',
      status: 'completed',
      totalAmount: 1299.99,
      currency: 'RON',
      itemCount: 1,
      orderDate: new Date(Date.now() - 86400000).toISOString(),
      platform: 'Shopify',
    },
    {
      id: '3',
      storeId: '2',
      orderNumber: 'ORD-2025-003',
      customerName: 'Andrei Vasile',
      customerEmail: 'andrei@example.com',
      status: 'pending',
      totalAmount: 899.99,
      currency: 'RON',
      itemCount: 3,
      orderDate: new Date(Date.now() - 43200000).toISOString(),
      platform: 'WooCommerce',
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [showConnectModal, setShowConnectModal] = useState(false);

  // TODO: Implement API integration
  useEffect(() => {
    // fetchStores();
    // fetchProducts();
    // fetchOrders();
  }, [selectedStore]);

  const fetchStores = async () => {
    // TODO: GET /api/v1/ecommerce/stores
    setLoading(true);
    try {
      // const response = await fetch('/api/v1/ecommerce/stores');
      // const data = await response.json();
      // setStores(data);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      toast.error('Eroare încărcare', 'Nu s-au putut încărca magazinele.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (storeId?: string) => {
    // TODO: GET /api/v1/ecommerce/stores/:storeId/products
    setLoading(true);
    try {
      // const endpoint = storeId
      //   ? `/api/v1/ecommerce/stores/${storeId}/products`
      //   : '/api/v1/ecommerce/products';
      // const response = await fetch(endpoint);
      // const data = await response.json();
      // setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Eroare încărcare', 'Nu s-au putut încărca produsele.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (storeId?: string) => {
    // TODO: GET /api/v1/ecommerce/stores/:storeId/orders
    setLoading(true);
    try {
      // const endpoint = storeId
      //   ? `/api/v1/ecommerce/stores/${storeId}/orders`
      //   : '/api/v1/ecommerce/orders';
      // const response = await fetch(endpoint);
      // const data = await response.json();
      // setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Eroare încărcare', 'Nu s-au putut încărca comenzile.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStore = async (platform: string) => {
    // TODO: POST /api/v1/ecommerce/stores/connect
    try {
      toast.success('Platformă conectată', `Se inițializează conexiunea cu ${platform}...`);
      // Simulate connection process
      setShowConnectModal(false);
      toast.success('Conexiune reușită', `Magazinul ${platform} a fost conectat cu succes!`);
    } catch (error) {
      toast.error('Eroare conexiune', `Nu s-a putut conecta la ${platform}. Încercați din nou.`);
    }
  };

  const handleSyncStore = async (storeId: string) => {
    // TODO: POST /api/v1/ecommerce/stores/:storeId/sync
    const store = stores.find(s => s.id === storeId);
    const storeName = store?.name || storeId;
    try {
      toast.success('Sincronizare', `Se sincronizează ${storeName}...`);
      // Update last sync time
      setStores(prev => prev.map(s =>
        s.id === storeId ? { ...s, lastSync: new Date().toISOString() } : s
      ));
      toast.success('Sincronizare completă', `${storeName} a fost sincronizat cu succes!`);
    } catch (error) {
      toast.error('Eroare sincronizare', `Nu s-a putut sincroniza ${storeName}.`);
    }
  };

  const handleGenerateInvoice = async (order: Order) => {
    try {
      toast.success('Generare factură', `Se generează factura pentru comanda ${order.orderNumber}...`);
      // TODO: POST /api/v1/invoices with order data
      // Simulate invoice generation
      setTimeout(() => {
        toast.compliance('e-Factura', `Factura pentru ${order.orderNumber} a fost generată și trimisă la ANAF.`);
      }, 1500);
    } catch (error) {
      toast.error('Eroare', `Nu s-a putut genera factura pentru ${order.orderNumber}.`);
    }
  };

  const handleBulkGenerateInvoices = async () => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    if (completedOrders.length === 0) {
      toast.error('Nicio comandă', 'Nu există comenzi finalizate pentru facturare.');
      return;
    }
    toast.success('Facturare în masă', `Se generează ${completedOrders.length} facturi...`);
    setTimeout(() => {
      toast.compliance('e-Factura', `${completedOrders.length} facturi generate și trimise la ANAF SPV.`);
    }, 2000);
  };

  // Calculate summary metrics
  const totalProducts = products.length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const connectedStores = stores.filter(s => s.status === 'connected').length;

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}`;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesStore = selectedStore === 'all' || order.storeId === selectedStore;
    return matchesSearch && matchesStatus && matchesStore;
  });

  const filteredProducts = products.filter(product => {
    const matchesStore = selectedStore === 'all' || product.storeId === selectedStore;
    return matchesStore;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">E-commerce Dashboard</h1>
          <p className="text-sm text-gray-600">Manage your online stores and orders</p>
        </div>
        <button
          onClick={() => setShowConnectModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Connect Store
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Connected Stores</p>
              <p className="text-2xl font-semibold text-gray-900">{connectedStores}</p>
            </div>
            <Store className="h-10 w-10 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{totalProducts}</p>
            </div>
            <Package className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{pendingOrders}</p>
            </div>
            <ShoppingCart className="h-10 w-10 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">{formatAmount(totalRevenue)}</p>
            </div>
            <DollarSign className="h-10 w-10 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Connected Stores Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Connected Stores</h2>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stores.map((store) => (
            <div
              key={store.id}
              className={`border rounded-lg p-4 ${platformColors[store.platform]}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{platformLogos[store.platform]}</span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    store.status === 'connected'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {store.status}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{store.name}</h3>
              <p className="text-xs text-gray-600 mb-2">{store.platform}</p>
              <p className="text-xs text-gray-500">Last sync: {formatDate(store.lastSync)}</p>
              <button
                onClick={() => handleSyncStore(store.id)}
                className="mt-3 w-full bg-white border border-gray-300 rounded px-3 py-1 text-xs font-medium hover:bg-gray-50 flex items-center justify-center"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Logos Section - Connect New Store */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Conectează Platformă E-commerce</h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {Object.entries(platformCategories).map(([category, platforms]) => (
              <div key={category} className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  {category === 'Romanian Marketplaces' && <Globe className="h-4 w-4 text-red-500" />}
                  {category === 'International Marketplaces' && <Globe className="h-4 w-4 text-blue-500" />}
                  {category === 'E-commerce Platforms' && <Store className="h-4 w-4 text-green-500" />}
                  {category}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => handleConnectStore(platform)}
                      className={`border-2 rounded-lg p-4 hover:shadow-md transition text-center ${platformColors[platform]}`}
                    >
                      <div className="text-3xl mb-2">{platformLogos[platform]}</div>
                      <div className="font-semibold text-sm">{platform}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Info Banner */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Integrare automată cu facturare</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Comenzile finalizate pot fi transformate automat în facturi e-Factura și trimise la ANAF SPV.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowConnectModal(false)}
              className="w-full mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Anulează
            </button>
          </div>
        </div>
      )}

      {/* Orders Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Comenzi Recente</h2>
          <button
            onClick={handleBulkGenerateInvoices}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center text-sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generează Facturi
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{order.customerName}</div>
                      <div className="text-xs text-gray-400">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.platform}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.itemCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatAmount(order.totalAmount, order.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${getOrderStatusColor(
                          order.status
                        )}`}
                      >
                        {getOrderStatusIcon(order.status)}
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900" title="Vizualizare">
                          <Eye className="h-5 w-5" />
                        </button>
                        <button className="text-green-600 hover:text-green-900" title="Editare">
                          <Edit className="h-5 w-5" />
                        </button>
                        {order.status === 'completed' && (
                          <button
                            onClick={() => handleGenerateInvoice(order)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Generează factură"
                          >
                            <FileText className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All Products
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${getStockStatusColor(
                    product.stockStatus
                  )}`}
                >
                  {product.stockStatus.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{product.category}</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">
                  {formatAmount(product.price)}
                </span>
                <span className="text-sm text-gray-500">Stock: {product.stock}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Analytics
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <TrendingUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-sm text-gray-600">Average Order Value</p>
            <p className="text-2xl font-bold text-gray-900">{formatAmount(1899.99)}</p>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-sm text-gray-600">Total Customers</p>
            <p className="text-2xl font-bold text-gray-900">247</p>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <ShoppingCart className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <p className="text-2xl font-bold text-gray-900">3.2%</p>
          </div>
        </div>
        {/* TODO: Add charts for revenue trends, top products, etc. */}
        <div className="mt-6 h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-2" />
            <p>Grafice venituri și analize în curând...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
