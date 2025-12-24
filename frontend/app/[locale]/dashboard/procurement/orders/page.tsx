'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  AlertCircle,
  Building2,
  Calendar
} from 'lucide-react';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  supplierCui: string;
  orderDate: string;
  expectedDelivery: string;
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'partial' | 'received' | 'cancelled';
  itemCount: number;
  totalAmount: number;
  currency: string;
}

const mockOrders: PurchaseOrder[] = [
  {
    id: '1',
    orderNumber: 'PO-2025-0145',
    supplier: 'Tech Distribution SRL',
    supplierCui: 'RO12345678',
    orderDate: '2025-12-20',
    expectedDelivery: '2025-12-27',
    status: 'sent',
    itemCount: 5,
    totalAmount: 24500,
    currency: 'RON',
  },
  {
    id: '2',
    orderNumber: 'PO-2025-0144',
    supplier: 'Office Solutions SA',
    supplierCui: 'RO87654321',
    orderDate: '2025-12-18',
    expectedDelivery: '2025-12-25',
    status: 'partial',
    itemCount: 12,
    totalAmount: 8750,
    currency: 'RON',
  },
  {
    id: '3',
    orderNumber: 'PO-2025-0143',
    supplier: 'Import Direct SRL',
    supplierCui: 'RO11223344',
    orderDate: '2025-12-15',
    expectedDelivery: '2025-12-22',
    status: 'received',
    itemCount: 3,
    totalAmount: 15200,
    currency: 'EUR',
  },
  {
    id: '4',
    orderNumber: 'PO-2025-0142',
    supplier: 'Food Distributor SRL',
    supplierCui: 'RO44332211',
    orderDate: '2025-12-14',
    expectedDelivery: '2025-12-21',
    status: 'pending',
    itemCount: 8,
    totalAmount: 4200,
    currency: 'RON',
  },
  {
    id: '5',
    orderNumber: 'PO-2025-0141',
    supplier: 'Tech Distribution SRL',
    supplierCui: 'RO12345678',
    orderDate: '2025-12-10',
    expectedDelivery: '2025-12-17',
    status: 'cancelled',
    itemCount: 2,
    totalAmount: 6800,
    currency: 'RON',
  },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    const styles: Record<PurchaseOrder['status'], { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Ciornă' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'În așteptare' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Aprobat' },
      sent: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Trimis' },
      partial: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Parțial primit' },
      received: { bg: 'bg-green-100', text: 'text-green-800', label: 'Recepționat' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Anulat' },
    };
    const style = styles[status];
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const stats = {
    total: mockOrders.length,
    pending: mockOrders.filter(o => o.status === 'pending').length,
    inTransit: mockOrders.filter(o => o.status === 'sent').length,
    received: mockOrders.filter(o => o.status === 'received').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comenzi de achiziție</h1>
          <p className="text-gray-500">Gestionați comenzile către furnizori</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => router.push('/dashboard/procurement/orders/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Comandă nouă
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total comenzi</span>
            <ShoppingCart className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">În așteptare</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">În tranzit</span>
            <Truck className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-1">{stats.inTransit}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Recepționate</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.received}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Caută după număr comandă sau furnizor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Toate statusurile</option>
            <option value="draft">Ciornă</option>
            <option value="pending">În așteptare</option>
            <option value="approved">Aprobat</option>
            <option value="sent">Trimis</option>
            <option value="partial">Parțial primit</option>
            <option value="received">Recepționat</option>
            <option value="cancelled">Anulat</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nr. comandă</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Furnizor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Data</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Livrare</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Produse</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="font-mono font-medium text-blue-600">{order.orderNumber}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{order.supplier}</p>
                        <p className="text-xs text-gray-500">{order.supplierCui}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(order.orderDate)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {formatDate(order.expectedDelivery)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">{order.itemCount}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/dashboard/procurement/orders/${order.id}`)}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nu s-au găsit comenzi</p>
            <p className="text-sm text-gray-400">Încercați să modificați criteriile de căutare</p>
          </div>
        )}
      </div>
    </div>
  );
}
