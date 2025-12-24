'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Barcode,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  vatRate: number;
  status: 'active' | 'inactive' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Laptop Dell Latitude 5520',
    sku: 'ELE-LAP-001',
    category: 'Electronice',
    currentStock: 15,
    minStock: 5,
    maxStock: 50,
    unit: 'buc',
    purchasePrice: 4500,
    salePrice: 5200,
    vatRate: 19,
    status: 'active',
    lastUpdated: '2025-12-20',
  },
  {
    id: '2',
    name: 'Monitor LG 27" 4K',
    sku: 'ELE-MON-002',
    category: 'Electronice',
    currentStock: 3,
    minStock: 5,
    maxStock: 30,
    unit: 'buc',
    purchasePrice: 1200,
    salePrice: 1450,
    vatRate: 19,
    status: 'low_stock',
    lastUpdated: '2025-12-18',
  },
  {
    id: '3',
    name: 'Hârtie A4 Premium (500 coli)',
    sku: 'OFF-PAP-001',
    category: 'Birotică',
    currentStock: 250,
    minStock: 50,
    maxStock: 500,
    unit: 'top',
    purchasePrice: 22,
    salePrice: 28,
    vatRate: 19,
    status: 'active',
    lastUpdated: '2025-12-22',
  },
  {
    id: '4',
    name: 'Toner HP LaserJet Pro',
    sku: 'OFF-TON-002',
    category: 'Birotică',
    currentStock: 0,
    minStock: 10,
    maxStock: 50,
    unit: 'buc',
    purchasePrice: 280,
    salePrice: 350,
    vatRate: 19,
    status: 'out_of_stock',
    lastUpdated: '2025-12-15',
  },
  {
    id: '5',
    name: 'Scaun ergonomic Premium',
    sku: 'MOB-SCN-001',
    category: 'Mobilier',
    currentStock: 8,
    minStock: 3,
    maxStock: 20,
    unit: 'buc',
    purchasePrice: 850,
    salePrice: 1100,
    vatRate: 19,
    status: 'active',
    lastUpdated: '2025-12-19',
  },
];

const CATEGORIES = ['Toate', 'Electronice', 'Birotică', 'Mobilier', 'Consumabile'];

export default function ProductsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toate');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Toate' || product.category === selectedCategory;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: Product['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Activ</span>;
      case 'inactive':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Inactiv</span>;
      case 'low_stock':
        return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">Stoc redus</span>;
      case 'out_of_stock':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Fără stoc</span>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const stats = {
    total: mockProducts.length,
    active: mockProducts.filter(p => p.status === 'active').length,
    lowStock: mockProducts.filter(p => p.status === 'low_stock').length,
    outOfStock: mockProducts.filter(p => p.status === 'out_of_stock').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalog Produse</h1>
          <p className="text-gray-500">Gestionați produsele din inventar</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => router.push('/dashboard/inventory/products/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Produs nou
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total produse</span>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Active</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Stoc redus</span>
            <TrendingDown className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.lowStock}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Fără stoc</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.outOfStock}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Caută după nume sau SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Toate statusurile</option>
            <option value="active">Active</option>
            <option value="low_stock">Stoc redus</option>
            <option value="out_of_stock">Fără stoc</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Produs</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Categorie</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Stoc</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Preț vânzare</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">{product.name}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm text-gray-600">{product.sku}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{product.category}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-medium ${
                      product.currentStock === 0 ? 'text-red-600' :
                      product.currentStock < product.minStock ? 'text-amber-600' : 'text-gray-900'
                    }`}>
                      {product.currentStock} {product.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {formatCurrency(product.salePrice)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {getStatusBadge(product.status)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/dashboard/inventory/${product.id}`)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                        title="Vizualizare"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                        title="Editare"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-red-50 rounded-lg transition"
                        title="Șterge"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nu s-au găsit produse</p>
            <p className="text-sm text-gray-400">Încercați să modificați criteriile de căutare</p>
          </div>
        )}
      </div>
    </div>
  );
}
