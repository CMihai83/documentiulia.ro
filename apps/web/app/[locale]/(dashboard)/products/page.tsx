'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Search,
  Plus,
  MoreVertical,
  Tag,
  Edit,
  Trash2,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Boxes,
  DollarSign,
  Percent,
  Archive,
  Copy,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useCompanyStore } from '@/lib/store/company-store';
import { useProducts, useLowStockProducts } from '@/lib/api/hooks';
import { ProductModal } from '@/components/products/product-modal';

// Product types
type ProductType = 'product' | 'service';
type ProductStatus = 'active' | 'inactive' | 'low_stock' | 'out_of_stock';

interface Product {
  id: string;
  name: string;
  code: string;
  type: ProductType;
  category?: string;
  description?: string;
  unit: string;
  price: number;
  vatRate: number;
  currency: string;
  stock?: number;
  minStock?: number;
  status: ProductStatus;
  costPrice?: number;
  barcode?: string;
  createdAt: string;
}

// Status configuration
const statusConfig: Record<ProductStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: 'Activ', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', icon: CheckCircle },
  inactive: { label: 'Inactiv', color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', icon: Archive },
  low_stock: { label: 'Stoc redus', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800', icon: AlertTriangle },
  out_of_stock: { label: 'Epuizat', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', icon: AlertTriangle },
};

// Type configuration
const typeConfig: Record<ProductType, { label: string; color: string }> = {
  product: { label: 'Produs', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  service: { label: 'Serviciu', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

// VAT rates in Romania
const vatRates = [
  { value: 19, label: 'TVA Standard (19%)' },
  { value: 9, label: 'TVA Redus (9%)' },
  { value: 5, label: 'TVA Redus (5%)' },
  { value: 0, label: 'TVA 0%' },
];

// Romanian currency formatting
function formatCurrency(amount: number, currency: string = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Mock data for demonstration
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Consultanță fiscală',
    code: 'SRV-001',
    type: 'service',
    category: 'Servicii profesionale',
    description: 'Consultanță fiscală și contabilă pentru IMM-uri',
    unit: 'oră',
    price: 250.00,
    vatRate: 19,
    currency: 'RON',
    status: 'active',
    createdAt: '2023-01-15',
  },
  {
    id: '2',
    name: 'Laptop HP ProBook 450',
    code: 'PRD-001',
    type: 'product',
    category: 'Echipamente IT',
    description: 'Laptop business cu procesor Intel i7',
    unit: 'buc',
    price: 4500.00,
    vatRate: 19,
    currency: 'RON',
    stock: 15,
    minStock: 5,
    status: 'active',
    costPrice: 3800.00,
    barcode: '5901234123457',
    createdAt: '2023-02-20',
  },
  {
    id: '3',
    name: 'Imprimantă HP LaserJet Pro',
    code: 'PRD-002',
    type: 'product',
    category: 'Echipamente IT',
    unit: 'buc',
    price: 1850.00,
    vatRate: 19,
    currency: 'RON',
    stock: 3,
    minStock: 5,
    status: 'low_stock',
    costPrice: 1500.00,
    createdAt: '2023-03-10',
  },
  {
    id: '4',
    name: 'Servicii contabilitate lunară',
    code: 'SRV-002',
    type: 'service',
    category: 'Servicii profesionale',
    description: 'Servicii complete de contabilitate pentru firme mici',
    unit: 'lună',
    price: 800.00,
    vatRate: 19,
    currency: 'RON',
    status: 'active',
    createdAt: '2023-01-20',
  },
  {
    id: '5',
    name: 'Toner HP 83A',
    code: 'PRD-003',
    type: 'product',
    category: 'Consumabile',
    unit: 'buc',
    price: 180.00,
    vatRate: 19,
    currency: 'RON',
    stock: 0,
    minStock: 10,
    status: 'out_of_stock',
    costPrice: 140.00,
    barcode: '5901234123458',
    createdAt: '2023-04-05',
  },
  {
    id: '6',
    name: 'Monitor Dell 27"',
    code: 'PRD-004',
    type: 'product',
    category: 'Echipamente IT',
    unit: 'buc',
    price: 1250.00,
    vatRate: 19,
    currency: 'RON',
    stock: 8,
    minStock: 3,
    status: 'active',
    costPrice: 980.00,
    createdAt: '2023-05-12',
  },
  {
    id: '7',
    name: 'Audit financiar',
    code: 'SRV-003',
    type: 'service',
    category: 'Servicii profesionale',
    unit: 'proiect',
    price: 5000.00,
    vatRate: 19,
    currency: 'RON',
    status: 'active',
    createdAt: '2023-06-01',
  },
  {
    id: '8',
    name: 'Scaun ergonomic birou',
    code: 'PRD-005',
    type: 'product',
    category: 'Mobilier',
    unit: 'buc',
    price: 950.00,
    vatRate: 19,
    currency: 'RON',
    stock: 12,
    minStock: 5,
    status: 'active',
    costPrice: 720.00,
    createdAt: '2023-07-15',
  },
];

export default function ProductsPage() {
  const t = useTranslations('products');
  const { selectedCompanyId, selectedCompany } = useCompanyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const itemsPerPage = 10;

  // Fetch products
  const { data: productsData, isLoading } = useProducts(selectedCompanyId || '');
  const { data: lowStockData } = useLowStockProducts(selectedCompanyId || '');

  // Use mock data for now
  const products = mockProducts;

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch =
      searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || product.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    totalProducts: products.filter(p => p.type === 'product').length,
    totalServices: products.filter(p => p.type === 'service').length,
    lowStock: products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock').length,
    totalValue: products
      .filter(p => p.type === 'product' && p.stock)
      .reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0),
  };

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Selectează o firmă
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Pentru a vedea produsele, selectează mai întâi o firmă din meniul de sus.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Produse și Servicii
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestionează catalogul pentru {selectedCompany?.name}
          </p>
        </div>
        <button
          onClick={() => setIsProductModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Adaugă Produs</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Produse</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalProducts}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Boxes className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Servicii</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalServices}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Tag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Stoc Redus/Epuizat</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.lowStock}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valoare Stoc</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(stats.totalValue)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStock > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                Atenție la stoc!
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {stats.lowStock} produs(e) au stocul redus sau epuizat. Verifică și reaprovizionează.
              </p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors">
              Vezi toate
            </button>
          </div>
        </motion.div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Caută după nume sau cod..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as ProductType | 'all');
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate tipurile</option>
              <option value="product">Produse</option>
              <option value="service">Servicii</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ProductStatus | 'all');
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate statusurile</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Export Button */}
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="w-5 h-5 text-gray-500" />
              <span className="hidden sm:inline text-gray-700 dark:text-gray-300">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nu există produse
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Niciun produs nu corespunde filtrelor selectate.'
                : 'Adaugă primul tău produs pentru a începe.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="col-span-4">Produs/Serviciu</div>
              <div className="col-span-2">Tip</div>
              <div className="col-span-2 text-right">Preț</div>
              <div className="col-span-2 text-center">Stoc</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1"></div>
            </div>

            {/* Product Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedProducts.map((product, index) => {
                const StatusIcon = statusConfig[product.status].icon;
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {/* Desktop */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            product.type === 'product'
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : 'bg-purple-100 dark:bg-purple-900/30'
                          }`}>
                            {product.type === 'product' ? (
                              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Tag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                              {product.code}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${typeConfig[product.type].color}`}>
                          {typeConfig[product.type].label}
                        </span>
                        {product.category && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {product.category}
                          </p>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(product.price, product.currency)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          TVA {product.vatRate}%
                        </p>
                      </div>
                      <div className="col-span-2 text-center">
                        {product.type === 'product' ? (
                          <div>
                            <p className={`font-medium ${
                              product.stock === 0
                                ? 'text-red-600 dark:text-red-400'
                                : (product.stock || 0) <= (product.minStock || 0)
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-gray-900 dark:text-white'
                            }`}>
                              {product.stock ?? '-'} {product.unit}
                            </p>
                            {product.minStock !== undefined && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Min: {product.minStock}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <div className="col-span-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig[product.status].color}`}>
                          <StatusIcon className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <div className="relative group">
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          {/* Dropdown menu */}
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <div className="p-1">
                              <button
                                onClick={() => setSelectedProduct(product)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                              >
                                <Eye className="w-4 h-4" />
                                Vizualizează
                              </button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                <Edit className="w-4 h-4" />
                                Editează
                              </button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                <Copy className="w-4 h-4" />
                                Duplică
                              </button>
                              <hr className="my-1 border-gray-200 dark:border-gray-700" />
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                                <Trash2 className="w-4 h-4" />
                                Șterge
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            product.type === 'product'
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : 'bg-purple-100 dark:bg-purple-900/30'
                          }`}>
                            {product.type === 'product' ? (
                              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Tag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                              {product.code}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig[product.status].color}`}>
                          <StatusIcon className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeConfig[product.type].color}`}>
                            {typeConfig[product.type].label}
                          </span>
                          {product.type === 'product' && product.stock !== undefined && (
                            <span className="text-gray-500 dark:text-gray-400">
                              Stoc: {product.stock}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(product.price, product.currency)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Afișez {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} din {filteredProducts.length} articole
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-4 py-2 text-sm font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      selectedProduct.type === 'product'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-purple-100 dark:bg-purple-900/30'
                    }`}>
                      {selectedProduct.type === 'product' ? (
                        <Package className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Tag className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedProduct.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {selectedProduct.code}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {/* Price and Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Preț vânzare</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(selectedProduct.price, selectedProduct.currency)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      + TVA {selectedProduct.vatRate}%
                    </p>
                  </div>
                  {selectedProduct.type === 'product' && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Stoc curent</p>
                      <p className={`text-2xl font-bold ${
                        selectedProduct.stock === 0
                          ? 'text-red-600 dark:text-red-400'
                          : (selectedProduct.stock || 0) <= (selectedProduct.minStock || 0)
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                      }`}>
                        {selectedProduct.stock ?? 0} {selectedProduct.unit}
                      </p>
                      {selectedProduct.minStock !== undefined && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Minim: {selectedProduct.minStock} {selectedProduct.unit}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tip</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${typeConfig[selectedProduct.type].color}`}>
                      {typeConfig[selectedProduct.type].label}
                    </span>
                  </div>
                  {selectedProduct.category && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Categorie</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedProduct.category}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unitate de măsură</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedProduct.unit}
                    </p>
                  </div>
                  {selectedProduct.costPrice && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Preț achiziție</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedProduct.costPrice, selectedProduct.currency)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Margin calculation */}
                {selectedProduct.costPrice && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-300">Marjă de profit</p>
                        <p className="text-lg font-bold text-green-800 dark:text-green-200">
                          {formatCurrency(selectedProduct.price - selectedProduct.costPrice, selectedProduct.currency)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-lg font-bold">
                          {Math.round(((selectedProduct.price - selectedProduct.costPrice) / selectedProduct.costPrice) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedProduct.description && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Descriere</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {/* Barcode */}
                {selectedProduct.barcode && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cod de bare</p>
                      <p className="font-mono text-gray-900 dark:text-white">
                        {selectedProduct.barcode}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Editează
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Adaugă pe factură
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
