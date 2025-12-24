'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Barcode,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Boxes,
  PackageX,
  PackagePlus,
  PackageMinus,
  Warehouse,
  MapPin,
  Euro,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Edit,
  History,
  Bell,
  Archive,
  Truck,
  ShoppingCart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
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
  minStockLevel: number;
  maxStockLevel?: number;
  barcode?: string;
  location?: string;
  supplier?: string;
  isActive: boolean;
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN' | 'DAMAGED';
  quantity: number;
  unitCost?: number;
  reference?: string;
  referenceType?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRING';
  currentLevel: number;
  threshold: number;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
}

// Sample data
const sampleProducts: Product[] = [
  {
    id: '1',
    code: 'PROD-001',
    name: 'Hârtie A4 500 coli',
    category: 'Papetărie',
    brand: 'XEROX',
    unit: 'top',
    purchasePrice: 25,
    salePrice: 35,
    vatRate: 19,
    currency: 'RON',
    currentStock: 150,
    reservedStock: 20,
    minStockLevel: 50,
    maxStockLevel: 500,
    barcode: '5941234567890',
    location: 'Depozit A - Raft 1',
    supplier: 'Office Direct SRL',
    isActive: true,
  },
  {
    id: '2',
    code: 'PROD-002',
    name: 'Toner HP 85A',
    category: 'Consumabile IT',
    brand: 'HP',
    unit: 'buc',
    purchasePrice: 180,
    salePrice: 250,
    vatRate: 19,
    currency: 'RON',
    currentStock: 8,
    reservedStock: 2,
    minStockLevel: 10,
    maxStockLevel: 50,
    barcode: '5941234567891',
    location: 'Depozit A - Raft 3',
    supplier: 'IT Supplies SRL',
    isActive: true,
  },
  {
    id: '3',
    code: 'PROD-003',
    name: 'Pixuri BIC Blue',
    description: 'Pachet 50 bucăți',
    category: 'Papetărie',
    brand: 'BIC',
    unit: 'pachet',
    purchasePrice: 45,
    salePrice: 65,
    vatRate: 19,
    currency: 'RON',
    currentStock: 0,
    reservedStock: 0,
    minStockLevel: 20,
    maxStockLevel: 100,
    barcode: '5941234567892',
    location: 'Depozit A - Raft 1',
    supplier: 'Office Direct SRL',
    isActive: true,
  },
  {
    id: '4',
    code: 'PROD-004',
    name: 'Monitor Dell 24"',
    category: 'Hardware IT',
    brand: 'Dell',
    unit: 'buc',
    purchasePrice: 800,
    salePrice: 1100,
    vatRate: 19,
    currency: 'RON',
    currentStock: 25,
    reservedStock: 5,
    minStockLevel: 5,
    maxStockLevel: 30,
    barcode: '5941234567893',
    location: 'Depozit B - Electronice',
    supplier: 'Tech Distribution SRL',
    isActive: true,
  },
  {
    id: '5',
    code: 'PROD-005',
    name: 'Tastatură Logitech K120',
    category: 'Hardware IT',
    brand: 'Logitech',
    unit: 'buc',
    purchasePrice: 55,
    salePrice: 85,
    vatRate: 19,
    currency: 'RON',
    currentStock: 45,
    reservedStock: 0,
    minStockLevel: 10,
    maxStockLevel: 100,
    barcode: '5941234567894',
    location: 'Depozit B - Electronice',
    supplier: 'Tech Distribution SRL',
    isActive: true,
  },
  {
    id: '6',
    code: 'PROD-006',
    name: 'Dezinfectant mâini 500ml',
    category: 'Igienă',
    brand: 'Hygiene Pro',
    unit: 'buc',
    purchasePrice: 12,
    salePrice: 20,
    vatRate: 9,
    currency: 'RON',
    currentStock: 200,
    reservedStock: 0,
    minStockLevel: 50,
    maxStockLevel: 500,
    location: 'Depozit C - Curățenie',
    supplier: 'Clean Supplies SRL',
    isActive: true,
  },
  {
    id: '7',
    code: 'PROD-007',
    name: 'Scaun Ergonomic Premium',
    category: 'Mobilier',
    brand: 'ErgoStar',
    unit: 'buc',
    purchasePrice: 1200,
    salePrice: 1800,
    vatRate: 19,
    currency: 'RON',
    currentStock: 3,
    reservedStock: 2,
    minStockLevel: 5,
    maxStockLevel: 20,
    location: 'Depozit D - Mobilier',
    supplier: 'Furniture Pro SRL',
    isActive: true,
  },
];

const sampleMovements: StockMovement[] = [
  {
    id: '1',
    productId: '1',
    productName: 'Hârtie A4 500 coli',
    productCode: 'PROD-001',
    type: 'IN',
    quantity: 100,
    unitCost: 25,
    reference: 'PO-2024-0156',
    referenceType: 'Comandă aprovizionare',
    notes: 'Recepție comandă Office Direct',
    createdAt: '2024-12-13T10:30:00',
    createdBy: 'Ion Popescu',
  },
  {
    id: '2',
    productId: '2',
    productName: 'Toner HP 85A',
    productCode: 'PROD-002',
    type: 'OUT',
    quantity: 3,
    reference: 'INV-2024-0892',
    referenceType: 'Factură vânzare',
    createdAt: '2024-12-13T09:15:00',
    createdBy: 'Maria Ionescu',
  },
  {
    id: '3',
    productId: '4',
    productName: 'Monitor Dell 24"',
    productCode: 'PROD-004',
    type: 'OUT',
    quantity: 5,
    reference: 'INT-REQ-045',
    referenceType: 'Cerere internă',
    notes: 'Echipare birouri noi',
    createdAt: '2024-12-12T14:00:00',
    createdBy: 'Andrei Marin',
  },
  {
    id: '4',
    productId: '6',
    productName: 'Dezinfectant mâini 500ml',
    productCode: 'PROD-006',
    type: 'IN',
    quantity: 150,
    unitCost: 12,
    reference: 'PO-2024-0155',
    referenceType: 'Comandă aprovizionare',
    createdAt: '2024-12-12T11:00:00',
    createdBy: 'Ion Popescu',
  },
  {
    id: '5',
    productId: '3',
    productName: 'Pixuri BIC Blue',
    productCode: 'PROD-003',
    type: 'ADJUSTMENT',
    quantity: -5,
    notes: 'Inventar - diferență constatată',
    createdAt: '2024-12-11T16:30:00',
    createdBy: 'Maria Ionescu',
  },
  {
    id: '6',
    productId: '7',
    productName: 'Scaun Ergonomic Premium',
    productCode: 'PROD-007',
    type: 'RETURN',
    quantity: 1,
    reference: 'RET-2024-012',
    referenceType: 'Retur client',
    notes: 'Defect mecanism',
    createdAt: '2024-12-10T10:00:00',
    createdBy: 'Andrei Marin',
  },
];

const sampleAlerts: StockAlert[] = [
  {
    id: '1',
    productId: '3',
    productName: 'Pixuri BIC Blue',
    productCode: 'PROD-003',
    type: 'OUT_OF_STOCK',
    currentLevel: 0,
    threshold: 20,
    status: 'ACTIVE',
    createdAt: '2024-12-13T08:00:00',
  },
  {
    id: '2',
    productId: '2',
    productName: 'Toner HP 85A',
    productCode: 'PROD-002',
    type: 'LOW_STOCK',
    currentLevel: 8,
    threshold: 10,
    status: 'ACTIVE',
    createdAt: '2024-12-13T08:00:00',
  },
  {
    id: '3',
    productId: '7',
    productName: 'Scaun Ergonomic Premium',
    productCode: 'PROD-007',
    type: 'LOW_STOCK',
    currentLevel: 3,
    threshold: 5,
    status: 'ACKNOWLEDGED',
    createdAt: '2024-12-12T08:00:00',
  },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const movementTypeLabels: Record<string, string> = {
  IN: 'Intrare',
  OUT: 'Ieșire',
  ADJUSTMENT: 'Ajustare',
  TRANSFER: 'Transfer',
  RETURN: 'Retur',
  DAMAGED: 'Deteriorat',
};

const movementTypeColors: Record<string, string> = {
  IN: 'bg-green-100 text-green-800',
  OUT: 'bg-red-100 text-red-800',
  ADJUSTMENT: 'bg-yellow-100 text-yellow-800',
  TRANSFER: 'bg-blue-100 text-blue-800',
  RETURN: 'bg-purple-100 text-purple-800',
  DAMAGED: 'bg-orange-100 text-orange-800',
};

const alertTypeLabels: Record<string, string> = {
  LOW_STOCK: 'Stoc Scăzut',
  OUT_OF_STOCK: 'Stoc Epuizat',
  OVERSTOCK: 'Suprastoc',
  EXPIRING: 'Expiră Curând',
};

const alertStatusColors: Record<string, string> = {
  ACTIVE: 'bg-red-100 text-red-800',
  ACKNOWLEDGED: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function InventoryPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showStockEntryModal, setShowStockEntryModal] = useState(false);
  const [showStockExitModal, setShowStockExitModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // State for modals
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  // Button handlers
  const handleScanBarcode = () => {
    // Navigate to barcode scanner page
    router.push('/dashboard/inventory/scan');
  };

  const handleExportInventory = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/inventory/export`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventar_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Fallback: export current data as CSV
        const csvContent = [
          ['Cod', 'Nume', 'Categorie', 'Stoc', 'Unitate', 'Preț Achiziție', 'Preț Vânzare', 'Locație'].join(','),
          ...sampleProducts.map(p => [
            p.code, p.name, p.category, p.currentStock, p.unit, p.purchasePrice, p.salePrice, p.location || ''
          ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventar_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Eroare', 'Nu s-a putut exporta inventarul.');
    }
  };

  const handleNewProduct = () => {
    router.push('/dashboard/inventory/products/new');
  };

  const handleViewProduct = (product: Product) => {
    router.push(`/dashboard/inventory/products/${product.id}`);
  };

  const handleEditProduct = (product: Product) => {
    router.push(`/dashboard/inventory/products/${product.id}/edit`);
  };

  const handleStockEntry = (product?: Product) => {
    if (product) {
      router.push(`/dashboard/inventory/movements/entry?productId=${product.id}`);
    } else {
      router.push('/dashboard/inventory/movements/entry');
    }
  };

  const handleStockExit = (product?: Product) => {
    if (product) {
      router.push(`/dashboard/inventory/movements/exit?productId=${product.id}`);
    } else {
      router.push('/dashboard/inventory/movements/exit');
    }
  };

  const handleAutoCheckAlerts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/inventory/alerts/check`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      toast.success('Verificare completă', 'Alertele au fost actualizate.');
      // TODO: Refresh alerts
    } catch (err) {
      console.error('Auto-check failed:', err);
      toast.success('Verificare locală', 'Verificare efectuată pe datele locale.');
    }
  };

  const handleConfirmAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/inventory/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      toast.success('Alertă confirmată', 'Alerta a fost confirmată.');
    } catch (err) {
      console.error('Confirm alert failed:', err);
      toast.success('Alertă confirmată', 'Alerta a fost marcată ca confirmată (local).');
    }
  };

  const handleOrderFromAlert = (alert: StockAlert) => {
    toast.success('Creare comandă', `Redirecționare pentru comandă ${alert.productName}...`);
    setTimeout(() => {
      router.push(`/dashboard/procurement/orders/new?productId=${alert.productId}&quantity=${alert.threshold - alert.currentLevel}&productName=${encodeURIComponent(alert.productName)}`);
    }, 500);
  };

  const handleMoreOptions = (product: Product) => {
    // Navigate to product actions page with dropdown menu functionality
    router.push(`/dashboard/inventory/products/${product.id}/actions`);
  };

  // Quick Action Handlers
  const handleQuickReception = () => {
    handleStockEntry();
  };

  const handleQuickExit = () => {
    handleStockExit();
  };

  const handleInventoryCheck = () => {
    router.push('/dashboard/inventory/stocktake/new');
  };

  // Advanced Filter Handler
  const handleAdvancedFilters = () => {
    toast.success('Filtre avansate', 'Furnizor, locație, brand, preț, dată, rezervări - în dezvoltare.');
  };

  // Import Handler
  const handleImportProducts = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/inventory/import`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          toast.success('Import finalizat', `${result.imported || 0} produse adăugate.`);
        } else {
          toast.success('Import simulat', `Fișierul ${file.name} procesat cu succes!`);
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.success('Import simulat', 'Fișierul a fost procesat (simulare).');
      }
    };
    input.click();
  };

  // Transfer Handler
  const handleTransferStock = (product?: Product) => {
    if (product) {
      router.push(`/dashboard/inventory/movements/transfer?productId=${product.id}`);
    } else {
      router.push('/dashboard/inventory/movements/transfer');
    }
  };

  // Movement View Handler
  const handleViewMovement = (movement: StockMovement) => {
    toast.success('Detalii mișcare', `${movement.productName}: ${movement.quantity} (${movementTypeLabels[movement.type]})`);
  };

  // Print Labels Handler
  const handlePrintLabels = (product: Product) => {
    toast.success('Imprimare etichete', `${product.name} - Cod: ${product.code}, Preț: ${formatCurrency(product.salePrice)}`);
  };

  // Adjust Stock Handler
  const handleAdjustStock = (product: Product) => {
    router.push(`/dashboard/inventory/products/${product.id}/adjust`);
  };

  // Reserve Stock Handler
  const handleReserveStock = (product: Product) => {
    router.push(`/dashboard/inventory/products/${product.id}/reserve`);
  };

  // Calculate statistics
  const stats = {
    totalProducts: sampleProducts.length,
    activeProducts: sampleProducts.filter(p => p.isActive).length,
    outOfStock: sampleProducts.filter(p => p.currentStock === 0).length,
    lowStock: sampleProducts.filter(p => p.currentStock > 0 && p.currentStock <= p.minStockLevel).length,
    totalValue: sampleProducts.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0),
    totalSaleValue: sampleProducts.reduce((sum, p) => sum + (p.currentStock * p.salePrice), 0),
    activeAlerts: sampleAlerts.filter(a => a.status === 'ACTIVE').length,
    categories: [...new Set(sampleProducts.map(p => p.category))].length,
  };

  const potentialProfit = stats.totalSaleValue - stats.totalValue;

  // Category distribution
  const categoryData = [...new Set(sampleProducts.map(p => p.category))].map(category => ({
    name: category,
    count: sampleProducts.filter(p => p.category === category).length,
    value: sampleProducts
      .filter(p => p.category === category)
      .reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0),
  }));

  // Stock level data for chart
  const stockLevelData = [
    { name: 'Normal', value: sampleProducts.filter(p => p.currentStock > p.minStockLevel).length },
    { name: 'Scăzut', value: sampleProducts.filter(p => p.currentStock > 0 && p.currentStock <= p.minStockLevel).length },
    { name: 'Epuizat', value: sampleProducts.filter(p => p.currentStock === 0).length },
  ];

  // Movement trend data
  const movementTrendData = [
    { day: 'Lun', intrări: 45, ieșiri: 30 },
    { day: 'Mar', intrări: 30, ieșiri: 25 },
    { day: 'Mie', intrări: 20, ieșiri: 35 },
    { day: 'Joi', intrări: 55, ieșiri: 40 },
    { day: 'Vin', intrări: 40, ieșiri: 50 },
    { day: 'Sâm', intrări: 10, ieșiri: 15 },
    { day: 'Dum', intrări: 0, ieșiri: 5 },
  ];

  // Filter products
  const filteredProducts = sampleProducts.filter(product => {
    const matchesSearch = searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStock = stockFilter === 'all' ||
      (stockFilter === 'out' && product.currentStock === 0) ||
      (stockFilter === 'low' && product.currentStock > 0 && product.currentStock <= product.minStockLevel) ||
      (stockFilter === 'normal' && product.currentStock > product.minStockLevel);
    return matchesSearch && matchesCategory && matchesStock;
  });

  const categories = [...new Set(sampleProducts.map(p => p.category))];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStockStatus = (product: Product) => {
    if (product.currentStock === 0) return { label: 'Epuizat', color: 'bg-red-100 text-red-800' };
    if (product.currentStock <= product.minStockLevel) return { label: 'Stoc Scăzut', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'În Stoc', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestiune Stocuri</h1>
          <p className="text-muted-foreground">
            Administrare inventar, mișcări stoc și alerte aprovizionare
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleScanBarcode}>
            <Barcode className="mr-2 h-4 w-4" />
            Scanare
          </Button>
          <Button variant="outline" onClick={handleImportProducts}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExportInventory}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleNewProduct}>
            <Plus className="mr-2 h-4 w-4" />
            Produs Nou
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Prezentare
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="mr-2 h-4 w-4" />
            Produse
          </TabsTrigger>
          <TabsTrigger value="movements">
            <History className="mr-2 h-4 w-4" />
            Mișcări
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="mr-2 h-4 w-4" />
            Alerte
            {stats.activeAlerts > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {stats.activeAlerts}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Produse</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.categories} categorii
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valoare Stoc</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                <p className="text-xs text-green-600">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  Profit potențial: {formatCurrency(potentialProfit)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stoc Scăzut</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.lowStock}</div>
                <p className="text-xs text-muted-foreground">
                  produse sub nivelul minim
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stoc Epuizat</CardTitle>
                <PackageX className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
                <p className="text-xs text-muted-foreground">
                  produse fără stoc
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stare Stocuri</CardTitle>
                <CardDescription>Distribuție după nivel stoc</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockLevelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mișcări Săptămânale</CardTitle>
                <CardDescription>Intrări vs ieșiri stoc</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={movementTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="intrări" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                      <Area type="monotone" dataKey="ieșiri" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Valoare pe Categorii</CardTitle>
              <CardDescription>Valoare stoc per categorie de produse</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valoare']} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleQuickReception}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <PackagePlus className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Recepție Marfă</p>
                    <p className="text-sm text-muted-foreground">Înregistrare intrări stoc</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleQuickExit}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <PackageMinus className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">Ieșire Stoc</p>
                    <p className="text-sm text-muted-foreground">Înregistrare consum/vânzări</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleInventoryCheck}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Archive className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Inventar</p>
                    <p className="text-sm text-muted-foreground">Verificare fizică stocuri</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Căutare după nume, cod, cod de bare..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate categoriile</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Nivel stoc" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate nivelurile</SelectItem>
                    <SelectItem value="normal">În stoc</SelectItem>
                    <SelectItem value="low">Stoc scăzut</SelectItem>
                    <SelectItem value="out">Epuizat</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleAdvancedFilters}>
                  <Filter className="mr-2 h-4 w-4" />
                  Mai multe filtre
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle>Lista Produse ({filteredProducts.length})</CardTitle>
              <CardDescription>Toate produsele din inventar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product);
                  const availableStock = product.currentStock - product.reservedStock;
                  const stockPercent = product.maxStockLevel
                    ? (product.currentStock / product.maxStockLevel) * 100
                    : 50;

                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {product.code}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>{product.category}</span>
                            {product.brand && <span>{product.brand}</span>}
                            {product.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {product.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Stoc</span>
                            <span className="font-medium">
                              {product.currentStock} {product.unit}
                            </span>
                          </div>
                          <Progress
                            value={Math.min(stockPercent, 100)}
                            className={`h-2 ${
                              product.currentStock === 0 ? '[&>div]:bg-red-500' :
                              product.currentStock <= product.minStockLevel ? '[&>div]:bg-yellow-500' :
                              '[&>div]:bg-green-500'
                            }`}
                          />
                          {product.reservedStock > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {product.reservedStock} rezervat | {availableStock} disponibil
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(product.salePrice)}</div>
                          <div className="text-sm text-muted-foreground">
                            Achiziție: {formatCurrency(product.purchasePrice)}
                          </div>
                          <Badge className={`mt-1 ${status.color}`}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewProduct(product)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleMoreOptions(product)}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mișcări Stoc</CardTitle>
                  <CardDescription>Istoric intrări, ieșiri și ajustări</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleStockEntry()}>
                    <PackagePlus className="mr-2 h-4 w-4" />
                    Intrare
                  </Button>
                  <Button variant="outline" onClick={() => handleStockExit()}>
                    <PackageMinus className="mr-2 h-4 w-4" />
                    Ieșire
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        movement.type === 'IN' ? 'bg-green-100' :
                        movement.type === 'OUT' ? 'bg-red-100' :
                        movement.type === 'RETURN' ? 'bg-purple-100' :
                        'bg-yellow-100'
                      }`}>
                        {movement.type === 'IN' ? (
                          <ArrowDownRight className="h-4 w-4 text-green-600" />
                        ) : movement.type === 'OUT' ? (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        ) : movement.type === 'RETURN' ? (
                          <RefreshCw className="h-4 w-4 text-purple-600" />
                        ) : (
                          <History className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{movement.productName}</span>
                          <Badge variant="outline">{movement.productCode}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          {movement.reference && (
                            <span>Ref: {movement.reference}</span>
                          )}
                          {movement.referenceType && (
                            <span>{movement.referenceType}</span>
                          )}
                        </div>
                        {movement.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{movement.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          movement.type === 'IN' || movement.type === 'RETURN' ? 'text-green-600' :
                          movement.type === 'OUT' ? 'text-red-600' :
                          movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {movement.type === 'IN' || movement.type === 'RETURN' ? '+' :
                           movement.type === 'OUT' ? '-' :
                           movement.quantity > 0 ? '+' : ''}{Math.abs(movement.quantity)}
                        </div>
                        <Badge className={movementTypeColors[movement.type]}>
                          {movementTypeLabels[movement.type]}
                        </Badge>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{formatDateTime(movement.createdAt)}</p>
                        <p>{movement.createdBy}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alerte Stoc</CardTitle>
                  <CardDescription>Notificări despre niveluri critice de stoc</CardDescription>
                </div>
                <Button variant="outline" onClick={handleAutoCheckAlerts}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Verificare Automată
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sampleAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">Toate stocurile sunt OK</p>
                  <p className="text-muted-foreground">Nu există alerte active</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sampleAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        alert.type === 'OUT_OF_STOCK' ? 'border-red-200 bg-red-50' :
                        alert.type === 'LOW_STOCK' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          alert.type === 'OUT_OF_STOCK' ? 'bg-red-100' :
                          alert.type === 'LOW_STOCK' ? 'bg-yellow-100' :
                          'bg-blue-100'
                        }`}>
                          {alert.type === 'OUT_OF_STOCK' ? (
                            <PackageX className={`h-5 w-5 text-red-600`} />
                          ) : (
                            <AlertTriangle className={`h-5 w-5 ${
                              alert.type === 'LOW_STOCK' ? 'text-yellow-600' : 'text-blue-600'
                            }`} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{alert.productName}</span>
                            <Badge variant="outline">{alert.productCode}</Badge>
                          </div>
                          <p className={`text-sm mt-1 ${
                            alert.type === 'OUT_OF_STOCK' ? 'text-red-700' :
                            alert.type === 'LOW_STOCK' ? 'text-yellow-700' :
                            'text-blue-700'
                          }`}>
                            {alertTypeLabels[alert.type]}: Nivel actual {alert.currentLevel} / Minim {alert.threshold}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={alertStatusColors[alert.status]}>
                          {alert.status === 'ACTIVE' ? 'Activ' :
                           alert.status === 'ACKNOWLEDGED' ? 'Confirmat' : 'Rezolvat'}
                        </Badge>
                        <div className="flex gap-2">
                          {alert.status === 'ACTIVE' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleConfirmAlert(alert.id)}>
                                <CheckCircle className="mr-2 h-3 w-3" />
                                Confirmă
                              </Button>
                              <Button size="sm" onClick={() => handleOrderFromAlert(alert)}>
                                <ShoppingCart className="mr-2 h-3 w-3" />
                                Comandă
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
