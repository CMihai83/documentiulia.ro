'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Package,
  Barcode,
  MapPin,
  Warehouse,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  History,
  Plus,
  Minus,
  RefreshCw,
  MoreVertical,
  Download,
  Printer,
  Copy,
  ExternalLink,
  Euro,
  ShoppingCart,
  Truck,
  Bell,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  vatRate: number;
  currency: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStockLevel: number;
  maxStockLevel?: number;
  barcode?: string;
  location?: string;
  supplier?: string;
  supplierId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastStockUpdate?: string;
  imageUrl?: string;
}

interface StockMovement {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN' | 'DAMAGED';
  quantity: number;
  unitCost?: number;
  reference?: string;
  referenceType?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

interface StockHistory {
  date: string;
  stock: number;
  value: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Mock data for demo
const getMockProduct = (id: string): Product => ({
  id,
  code: 'PROD-001',
  name: 'Hârtie A4 500 coli',
  description: 'Hârtie de copiat și imprimat de înaltă calitate, 80g/m², albă, format A4, 500 coli per top. Ideală pentru imprimante laser și inkjet.',
  category: 'Papetărie',
  brand: 'XEROX',
  unit: 'top',
  purchasePrice: 25.00,
  salePrice: 35.00,
  vatRate: 19,
  currency: 'RON',
  currentStock: 150,
  reservedStock: 20,
  availableStock: 130,
  minStockLevel: 50,
  maxStockLevel: 500,
  barcode: '5941234567890',
  location: 'Depozit A - Raft 1',
  supplier: 'Office Direct SRL',
  supplierId: 'sup-001',
  isActive: true,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2025-12-15T14:30:00Z',
  lastStockUpdate: '2025-12-15T14:30:00Z',
});

const getMockMovements = (): StockMovement[] => [
  {
    id: 'm1',
    type: 'IN',
    quantity: 100,
    unitCost: 25.00,
    reference: 'PO-2025-0089',
    referenceType: 'PURCHASE_ORDER',
    notes: 'Recepție comandă furnizor',
    createdAt: '2025-12-15T14:30:00Z',
    createdBy: 'Maria Ionescu',
  },
  {
    id: 'm2',
    type: 'OUT',
    quantity: 30,
    reference: 'FV-2025-0156',
    referenceType: 'INVOICE',
    notes: 'Livrare client Tech Solutions SRL',
    createdAt: '2025-12-14T09:15:00Z',
    createdBy: 'Ion Popescu',
  },
  {
    id: 'm3',
    type: 'OUT',
    quantity: 20,
    reference: 'FV-2025-0149',
    referenceType: 'INVOICE',
    notes: 'Livrare client ABC Company',
    createdAt: '2025-12-12T11:45:00Z',
    createdBy: 'Ion Popescu',
  },
  {
    id: 'm4',
    type: 'ADJUSTMENT',
    quantity: -5,
    notes: 'Inventar - diferențe constatate',
    createdAt: '2025-12-10T16:00:00Z',
    createdBy: 'Admin',
  },
  {
    id: 'm5',
    type: 'IN',
    quantity: 200,
    unitCost: 24.50,
    reference: 'PO-2025-0075',
    referenceType: 'PURCHASE_ORDER',
    notes: 'Recepție comandă furnizor',
    createdAt: '2025-12-01T10:00:00Z',
    createdBy: 'Maria Ionescu',
  },
];

const getMockStockHistory = (): StockHistory[] => {
  const data: StockHistory[] = [];
  let stock = 100;
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    stock += Math.floor(Math.random() * 40) - 15;
    stock = Math.max(0, stock);
    data.push({
      date: date.toISOString().split('T')[0],
      stock,
      value: stock * 25,
    });
  }
  return data;
};

export default function InventoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAction, setStockAction] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  const [submittingStock, setSubmittingStock] = useState(false);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const [productRes, movementsRes] = await Promise.all([
        fetch(`${API_URL}/inventory/products/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/inventory/products/${productId}/movements?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (productRes.ok) {
        const data = await productRes.json();
        setProduct(data);
      } else {
        setProduct(getMockProduct(productId));
      }

      if (movementsRes.ok) {
        const movData = await movementsRes.json();
        setMovements(movData.data || movData);
      } else {
        setMovements(getMockMovements());
      }

      setStockHistory(getMockStockHistory());
    } catch (err) {
      console.error('Error fetching product:', err);
      setProduct(getMockProduct(productId));
      setMovements(getMockMovements());
      setStockHistory(getMockStockHistory());
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/inventory/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Produs șters', 'Produsul a fost șters cu succes.');
        router.push('/dashboard/inventory');
      } else {
        toast.error('Eroare', 'Nu s-a putut șterge produsul.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut șterge produsul.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleStockUpdate = async () => {
    if (!stockQuantity || parseFloat(stockQuantity) <= 0) {
      toast.error('Eroare', 'Introduceți o cantitate validă.');
      return;
    }

    setSubmittingStock(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/inventory/products/${productId}/stock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: stockAction,
          quantity: parseFloat(stockQuantity),
          notes: stockNotes,
        }),
      });

      if (response.ok) {
        toast.success('Stoc actualizat', `Mișcare de stoc înregistrată cu succes.`);
        setShowStockModal(false);
        setStockQuantity('');
        setStockNotes('');
        fetchProduct();
      } else {
        toast.error('Eroare', 'Nu s-a putut actualiza stocul.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut actualiza stocul.');
    } finally {
      setSubmittingStock(false);
    }
  };

  const handleCopyBarcode = () => {
    if (product?.barcode) {
      navigator.clipboard.writeText(product.barcode);
      toast.success('Copiat', 'Codul de bare a fost copiat.');
    }
  };

  const handlePrintLabel = () => {
    toast.success('Printare', 'Se generează eticheta...');
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'short',
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

  const getMovementTypeConfig = (type: StockMovement['type']) => {
    switch (type) {
      case 'IN':
        return { label: 'Intrare', color: 'bg-green-100 text-green-800', icon: <ArrowDownRight className="h-4 w-4" /> };
      case 'OUT':
        return { label: 'Ieșire', color: 'bg-red-100 text-red-800', icon: <ArrowUpRight className="h-4 w-4" /> };
      case 'ADJUSTMENT':
        return { label: 'Ajustare', color: 'bg-blue-100 text-blue-800', icon: <RefreshCw className="h-4 w-4" /> };
      case 'TRANSFER':
        return { label: 'Transfer', color: 'bg-purple-100 text-purple-800', icon: <Truck className="h-4 w-4" /> };
      case 'RETURN':
        return { label: 'Retur', color: 'bg-orange-100 text-orange-800', icon: <RefreshCw className="h-4 w-4" /> };
      case 'DAMAGED':
        return { label: 'Deteriorat', color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle className="h-4 w-4" /> };
      default:
        return { label: type, color: 'bg-gray-100 text-gray-800', icon: <Package className="h-4 w-4" /> };
    }
  };

  const getStockStatus = (product: Product) => {
    const available = product.availableStock;
    const min = product.minStockLevel;
    const max = product.maxStockLevel;

    if (available <= 0) {
      return { label: 'Stoc epuizat', color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-5 w-5 text-red-600" /> };
    }
    if (available < min) {
      return { label: 'Stoc redus', color: 'bg-orange-100 text-orange-800', icon: <AlertTriangle className="h-5 w-5 text-orange-600" /> };
    }
    if (max && available > max) {
      return { label: 'Suprastoc', color: 'bg-purple-100 text-purple-800', icon: <TrendingUp className="h-5 w-5 text-purple-600" /> };
    }
    return { label: 'Stoc OK', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-5 w-5 text-green-600" /> };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error || 'Produsul nu a fost găsit.'}</p>
        <button
          onClick={() => router.push('/dashboard/inventory')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Înapoi la inventar
        </button>
      </div>
    );
  }

  const stockStatus = getStockStatus(product);
  const stockPercentage = product.maxStockLevel
    ? Math.min(100, (product.currentStock / product.maxStockLevel) * 100)
    : 50;
  const stockValue = product.currentStock * product.purchasePrice;
  const marginPercent = ((product.salePrice - product.purchasePrice) / product.purchasePrice) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/inventory')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              {!product.isActive && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">Inactiv</span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Cod: {product.code} {product.brand && `• ${product.brand}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${stockStatus.color}`}>
            {stockStatus.icon}
            {stockStatus.label}
          </span>

          <button
            onClick={() => router.push(`/dashboard/inventory/${productId}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Editează
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
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-50">
                  <button
                    onClick={handlePrintLabel}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Printează etichetă
                  </button>
                  <button
                    onClick={() => toast.success('Export', 'Se exportă datele...')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Șterge produsul
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
          {/* Stock Overview */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Stoc curent</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => { setStockAction('IN'); setShowStockModal(true); }}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Intrare
                </button>
                <button
                  onClick={() => { setStockAction('OUT'); setShowStockModal(true); }}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
                >
                  <Minus className="h-4 w-4" />
                  Ieșire
                </button>
                <button
                  onClick={() => { setStockAction('ADJUSTMENT'); setShowStockModal(true); }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Ajustare
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-3xl font-bold text-blue-600">{product.currentStock}</p>
                <p className="text-sm text-gray-600 mt-1">Stoc total</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <p className="text-3xl font-bold text-orange-600">{product.reservedStock}</p>
                <p className="text-sm text-gray-600 mt-1">Rezervat</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-3xl font-bold text-green-600">{product.availableStock}</p>
                <p className="text-sm text-gray-600 mt-1">Disponibil</p>
              </div>
            </div>

            {/* Stock Level Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Nivel stoc</span>
                <span className="font-medium">
                  {product.currentStock} / {product.maxStockLevel || '∞'} {product.unit}
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    product.currentStock <= product.minStockLevel
                      ? 'bg-red-500'
                      : product.maxStockLevel && product.currentStock > product.maxStockLevel
                      ? 'bg-purple-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${stockPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Min: {product.minStockLevel}</span>
                {product.maxStockLevel && <span>Max: {product.maxStockLevel}</span>}
              </div>
            </div>
          </div>

          {/* Stock History Chart */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Evoluție stoc (ultimele 30 zile)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [`${value} ${product.unit}`, 'Stoc']}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Area type="monotone" dataKey="stock" stroke="#3B82F6" fill="#93C5FD" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Movements */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Mișcări recente</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                Vezi toate
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {movements.map((movement) => {
                const config = getMovementTypeConfig(movement.type);
                return (
                  <div key={movement.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium px-2 py-0.5 rounded ${config.color}`}>
                          {config.label}
                        </span>
                        <span className={`font-semibold ${movement.type === 'OUT' || movement.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {movement.type === 'OUT' ? '-' : '+'}{Math.abs(movement.quantity)} {product.unit}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 truncate">{movement.notes}</p>
                      {movement.reference && (
                        <p className="text-xs text-gray-500">Ref: {movement.reference}</p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-600">{formatDateTime(movement.createdAt)}</p>
                      <p className="text-gray-400 text-xs">{movement.createdBy}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Informații produs</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Categorie</p>
                <p className="font-medium text-gray-900">{product.category}</p>
              </div>

              {product.brand && (
                <div>
                  <p className="text-sm text-gray-500">Brand</p>
                  <p className="font-medium text-gray-900">{product.brand}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Unitate măsură</p>
                <p className="font-medium text-gray-900">{product.unit}</p>
              </div>

              {product.barcode && (
                <div>
                  <p className="text-sm text-gray-500">Cod de bare</p>
                  <div className="flex items-center gap-2">
                    <Barcode className="h-4 w-4 text-gray-400" />
                    <p className="font-mono text-sm text-gray-900">{product.barcode}</p>
                    <button onClick={handleCopyBarcode} className="p-1 hover:bg-gray-100 rounded">
                      <Copy className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}

              {product.location && (
                <div>
                  <p className="text-sm text-gray-500">Locație</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-gray-900">{product.location}</p>
                  </div>
                </div>
              )}

              {product.supplier && (
                <div>
                  <p className="text-sm text-gray-500">Furnizor</p>
                  <button
                    onClick={() => router.push(`/dashboard/partners/${product.supplierId}`)}
                    className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Truck className="h-4 w-4" />
                    {product.supplier}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Prețuri</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Preț achiziție</span>
                <span className="font-medium">{formatAmount(product.purchasePrice, product.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Preț vânzare</span>
                <span className="font-medium">{formatAmount(product.salePrice, product.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TVA</span>
                <span className="font-medium">{product.vatRate}%</span>
              </div>
              <hr />
              <div className="flex justify-between text-green-600">
                <span>Marjă</span>
                <span className="font-semibold">{marginPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Stock Value */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
            <h3 className="font-medium text-blue-100 mb-2">Valoare stoc</h3>
            <p className="text-3xl font-bold">{formatAmount(stockValue, product.currency)}</p>
            <p className="text-sm text-blue-100 mt-2">
              {product.currentStock} {product.unit} × {formatAmount(product.purchasePrice, product.currency)}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Acțiuni rapide</h3>
            <div className="space-y-2">
              <button
                onClick={() => toast.success('Comandă', 'Se creează comanda...')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Creează comandă
              </button>
              <button
                onClick={() => toast.success('Alertă', 'Se configurează alerta...')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                Setează alertă stoc
              </button>
              <button
                onClick={() => router.push(`/dashboard/inventory/${productId}/history`)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                Istoric complet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Update Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {stockAction === 'IN' ? 'Intrare stoc' : stockAction === 'OUT' ? 'Ieșire stoc' : 'Ajustare stoc'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantitate ({product.unit}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Motivul mișcării de stoc..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowStockModal(false)}
                disabled={submittingStock}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={handleStockUpdate}
                disabled={submittingStock || !stockQuantity}
                className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 ${
                  stockAction === 'IN' ? 'bg-green-600 hover:bg-green-700' :
                  stockAction === 'OUT' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {submittingStock && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvează
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
              Sigur dorești să ștergi produsul <strong>{product.name}</strong>? Această acțiune nu poate fi anulată.
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
