'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import {
  ShoppingCart,
  FileCheck,
  Truck,
  Building2,
  ClipboardList,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Plus,
  FileText,
  Search,
  Filter,
  Loader2,
  ChevronDown,
  ArrowUpRight,
  Calendar,
  Tag,
} from 'lucide-react';

// TODO: Replace with actual API interfaces
interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  vendorId: string;
  items: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  createdAt: Date;
  deliveryDate?: Date;
  approvedBy?: string;
}

interface PurchaseRequisition {
  id: string;
  prNumber: string;
  requestedBy: string;
  department: string;
  items: number;
  estimatedAmount: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  createdAt: Date;
  approver?: string;
}

interface Vendor {
  id: string;
  name: string;
  code: string;
  category: string;
  totalSpend: number;
  poCount: number;
  rating: number;
  paymentTerms: string;
  status: 'active' | 'inactive' | 'blocked';
}

interface ProcurementMetrics {
  openPOs: number;
  pendingApprovals: number;
  totalSpendMTD: number;
  activeVendors: number;
  avgPOValue: number;
  onTimeDeliveryRate: number;
  costSavings: number;
  poProcessingTime: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function ProcurementDashboardPage() {
  const router = useRouter();
  const t = useTranslations('procurement');
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('purchase-orders');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const [metrics, setMetrics] = useState<ProcurementMetrics | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const getToken = () => localStorage.getItem('auth_token');
  const getUserId = () => {
    try {
      const token = getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.userId;
      }
    } catch {
      return null;
    }
    return null;
  };

  // TODO: Replace with actual API calls
  const fetchProcurementData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const userId = getUserId();
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // TODO: Implement actual API calls to /api/v1/procurement endpoints
      // const [metricsRes, posRes, requisitionsRes, vendorsRes] = await Promise.all([
      //   fetch(`${API_URL}/v1/procurement/metrics?userId=${userId}`, { headers }),
      //   fetch(`${API_URL}/v1/procurement/purchase-orders?userId=${userId}`, { headers }),
      //   fetch(`${API_URL}/v1/procurement/requisitions?userId=${userId}&status=pending`, { headers }),
      //   fetch(`${API_URL}/v1/procurement/vendors?userId=${userId}&sortBy=spend`, { headers }),
      // ]);

      // Mock data for now
      setMetrics({
        openPOs: 24,
        pendingApprovals: 7,
        totalSpendMTD: 145230.50,
        activeVendors: 38,
        avgPOValue: 6051.27,
        onTimeDeliveryRate: 92.5,
        costSavings: 8420.00,
        poProcessingTime: 2.3,
      });

      setPurchaseOrders([
        {
          id: '1',
          poNumber: 'PO-2025-0156',
          vendor: 'Office Supplies SRL',
          vendorId: 'V001',
          items: 12,
          totalAmount: 4850.00,
          currency: 'RON',
          status: 'approved',
          createdAt: new Date('2025-12-10'),
          deliveryDate: new Date('2025-12-18'),
          approvedBy: 'Maria Popescu',
        },
        {
          id: '2',
          poNumber: 'PO-2025-0155',
          vendor: 'Tech Solutions Ltd',
          vendorId: 'V023',
          items: 5,
          totalAmount: 12300.00,
          currency: 'RON',
          status: 'sent',
          createdAt: new Date('2025-12-09'),
          deliveryDate: new Date('2025-12-20'),
        },
        {
          id: '3',
          poNumber: 'PO-2025-0154',
          vendor: 'Acme Hardware',
          vendorId: 'V015',
          items: 8,
          totalAmount: 6750.00,
          currency: 'RON',
          status: 'partially_received',
          createdAt: new Date('2025-12-08'),
          deliveryDate: new Date('2025-12-15'),
        },
        {
          id: '4',
          poNumber: 'PO-2025-0153',
          vendor: 'Global Distributors',
          vendorId: 'V042',
          items: 20,
          totalAmount: 18900.00,
          currency: 'RON',
          status: 'pending_approval',
          createdAt: new Date('2025-12-07'),
        },
      ]);

      setRequisitions([
        {
          id: '1',
          prNumber: 'PR-2025-0089',
          requestedBy: 'Ion Ionescu',
          department: 'IT',
          items: 3,
          estimatedAmount: 5200.00,
          priority: 'high',
          status: 'pending',
          createdAt: new Date('2025-12-11'),
        },
        {
          id: '2',
          prNumber: 'PR-2025-0088',
          requestedBy: 'Ana Maria',
          department: 'HR',
          items: 7,
          estimatedAmount: 1850.00,
          priority: 'medium',
          status: 'pending',
          createdAt: new Date('2025-12-10'),
        },
        {
          id: '3',
          prNumber: 'PR-2025-0087',
          requestedBy: 'Georgel Marinescu',
          department: 'Operations',
          items: 15,
          estimatedAmount: 8900.00,
          priority: 'urgent',
          status: 'pending',
          createdAt: new Date('2025-12-09'),
        },
      ]);

      setVendors([
        {
          id: 'V023',
          name: 'Tech Solutions Ltd',
          code: 'TECH001',
          category: 'IT Equipment',
          totalSpend: 45230.00,
          poCount: 12,
          rating: 4.8,
          paymentTerms: 'Net 30',
          status: 'active',
        },
        {
          id: 'V042',
          name: 'Global Distributors',
          code: 'GLOB001',
          category: 'General Supplies',
          totalSpend: 32150.00,
          poCount: 18,
          rating: 4.5,
          paymentTerms: 'Net 45',
          status: 'active',
        },
        {
          id: 'V015',
          name: 'Acme Hardware',
          code: 'ACME001',
          category: 'Hardware',
          totalSpend: 28640.00,
          poCount: 9,
          rating: 4.2,
          paymentTerms: 'Net 30',
          status: 'active',
        },
        {
          id: 'V001',
          name: 'Office Supplies SRL',
          code: 'OFF001',
          category: 'Office Supplies',
          totalSpend: 21450.00,
          poCount: 24,
          rating: 4.6,
          paymentTerms: 'Net 15',
          status: 'active',
        },
      ]);
    } catch (error) {
      console.error('Error fetching procurement data:', error);
      toast.error('Eroare încărcare', 'Nu s-au putut încărca datele de procurement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurementData();
  }, []);

  const formatCurrency = (amount: number, currency: string = 'RON') => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      pending: { label: 'In Asteptare', className: 'bg-yellow-100 text-yellow-800' },
      pending_approval: { label: 'Spre Aprobare', className: 'bg-orange-100 text-orange-800' },
      approved: { label: 'Aprobat', className: 'bg-green-100 text-green-800' },
      sent: { label: 'Trimis', className: 'bg-blue-100 text-blue-800' },
      partially_received: { label: 'Partial Receptionat', className: 'bg-purple-100 text-purple-800' },
      received: { label: 'Receptionat', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Anulat', className: 'bg-red-100 text-red-800' },
      rejected: { label: 'Respins', className: 'bg-red-100 text-red-800' },
      converted: { label: 'Convertit', className: 'bg-blue-100 text-blue-800' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return <span className={`px-2 py-1 text-xs rounded-full ${config.className}`}>{config.label}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      low: { label: 'Scazuta', className: 'bg-gray-100 text-gray-700' },
      medium: { label: 'Medie', className: 'bg-blue-100 text-blue-700' },
      high: { label: 'Ridicata', className: 'bg-orange-100 text-orange-700' },
      urgent: { label: 'Urgenta', className: 'bg-red-100 text-red-700' },
    };

    const config = priorityConfig[priority] || priorityConfig.medium;
    return <span className={`px-2 py-1 text-xs rounded-full font-medium ${config.className}`}>{config.label}</span>;
  };

  const filterOptions = [
    { value: 'all', label: 'Toate' },
    { value: 'pending_approval', label: 'Spre Aprobare' },
    { value: 'approved', label: 'Aprobate' },
    { value: 'sent', label: 'Trimise' },
    { value: 'received', label: 'Receptionate' },
  ];

  // Quick Action Handlers
  const handleNewRequisition = () => {
    router.push('/dashboard/procurement/requisitions/new');
  };

  const handleNewPurchaseOrder = () => {
    router.push('/dashboard/procurement/purchase-orders/new');
  };

  const handleRequestQuote = () => {
    // TODO: Implement proper modal for RFQ
    toast.success('Cerere ofertă', 'Funcționalitatea de cerere ofertă va fi disponibilă în curând.');
  };

  // Purchase Order Handlers
  const handleViewPO = (po: PurchaseOrder) => {
    router.push(`/dashboard/procurement/purchase-orders/${po.id}`);
  };

  const handlePODetails = (po: PurchaseOrder) => {
    router.push(`/dashboard/procurement/purchase-orders/${po.id}`);
  };

  // Requisition Handlers
  const handleViewRequisition = (req: PurchaseRequisition) => {
    router.push(`/dashboard/procurement/requisitions/${req.id}`);
  };

  const handleApproveRequisition = async (req: PurchaseRequisition) => {
    try {
      // TODO: POST /api/v1/procurement/requisitions/:id/approve
      setRequisitions(prev => prev.map(r =>
        r.id === req.id ? { ...r, status: 'approved' as const } : r
      ));
      toast.success('Cerere aprobată', `Cererea ${req.prNumber} de la ${req.requestedBy} a fost aprobată. Se poate crea comanda de achiziție.`);
    } catch (error) {
      toast.error('Eroare aprobare', `Nu s-a putut aproba cererea ${req.prNumber}.`);
    }
  };

  const handleRejectRequisition = async (req: PurchaseRequisition) => {
    try {
      // TODO: POST /api/v1/procurement/requisitions/:id/reject with reason modal
      setRequisitions(prev => prev.map(r =>
        r.id === req.id ? { ...r, status: 'rejected' as const } : r
      ));
      toast.error('Cerere respinsă', `Cererea ${req.prNumber} a fost respinsă.`);
    } catch (error) {
      toast.error('Eroare respingere', `Nu s-a putut respinge cererea ${req.prNumber}.`);
    }
  };

  // Vendor Handlers
  const handleAddVendor = () => {
    router.push('/dashboard/procurement/vendors/new');
  };

  const handleVendorDetails = (vendor: Vendor) => {
    router.push(`/dashboard/procurement/vendors/${vendor.id}`);
  };

  // Receipt Handlers
  const handleNewReceipt = () => {
    router.push('/dashboard/procurement/receipts/new');
  };

  const handleCreateFirstReceipt = () => {
    router.push('/dashboard/procurement/receipts/new');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Se incarca datele de procurement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestionare achizitii, comenzi, furnizori si receptii
          </p>
        </div>
        <button
          onClick={fetchProcurementData}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizeaza
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Comenzi Deschise</span>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics?.openPOs || 0}</div>
          <p className="text-xs text-gray-500 mt-1">Active in acest moment</p>
          <div className="flex items-center mt-2 text-blue-600">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span className="text-xs">+12% fata de luna trecuta</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Aprobare Pendinte</span>
            <FileCheck className="h-4 w-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics?.pendingApprovals || 0}</div>
          <p className="text-xs text-gray-500 mt-1">Necesita aprobare</p>
          {(metrics?.pendingApprovals || 0) > 5 && (
            <div className="flex items-center mt-2 text-orange-600">
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span className="text-xs">Actiune necesara</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Cheltuieli (MTD)</span>
            <DollarSign className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(metrics?.totalSpendMTD || 0)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Media: {formatCurrency(metrics?.avgPOValue || 0)}/PO</p>
          <div className="flex items-center mt-2 text-green-600">
            <Tag className="w-3 h-3 mr-1" />
            <span className="text-xs">Economii: {formatCurrency(metrics?.costSavings || 0)}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Furnizori Activi</span>
            <Building2 className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics?.activeVendors || 0}</div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${metrics?.onTimeDeliveryRate || 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Livrari la timp: {metrics?.onTimeDeliveryRate || 0}%
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actiuni Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleNewRequisition}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <div className="bg-blue-100 p-3 rounded-lg">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900">Cerere Noua</div>
              <div className="text-sm text-gray-500">Creeaza cerere de achizitie</div>
            </div>
          </button>

          <button
            onClick={handleNewPurchaseOrder}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
          >
            <div className="bg-green-100 p-3 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900">Comanda Noua</div>
              <div className="text-sm text-gray-500">Creeaza comanda de achizitie</div>
            </div>
          </button>

          <button
            onClick={handleRequestQuote}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
          >
            <div className="bg-purple-100 p-3 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900">Cerere Oferta</div>
              <div className="text-sm text-gray-500">Solicita cotatie furnizor</div>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('purchase-orders')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'purchase-orders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Comenzi de Achizitie
          </button>
          <button
            onClick={() => setActiveTab('requisitions')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'requisitions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Cereri de Achizitie
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'vendors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Furnizori
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'receipts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            Receptii Marfa
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'purchase-orders' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Comenzi de Achizitie</h2>
                <p className="text-sm text-gray-500">Gestioneaza si monitorizeaza comenzile active</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cauta comanda..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white text-sm hover:bg-gray-50"
                  >
                    <Filter className="w-4 h-4" />
                    {filterOptions.find(f => f.value === selectedFilter)?.label}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                      {filterOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSelectedFilter(option.value);
                            setShowFilterDropdown(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            selectedFilter === option.value ? 'bg-blue-50 text-blue-600' : ''
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleNewPurchaseOrder}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Comanda Noua
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numar PO</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Furnizor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Articole</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valoare</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Creare</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Livrare</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actiuni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        onClick={() => handleViewPO(po)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        {po.poNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{po.vendor}</div>
                      <div className="text-xs text-gray-500">{po.vendorId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Package className="w-4 h-4 mr-1" />
                        {po.items}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(po.totalAmount, po.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(po.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {po.createdAt.toLocaleDateString('ro-RO')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {po.deliveryDate ? po.deliveryDate.toLocaleDateString('ro-RO') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handlePODetails(po)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      >
                        Detalii
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'requisitions' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Cereri de Achizitie</h2>
                <p className="text-sm text-gray-500">
                  Cereri in asteptarea aprobarii - {requisitions.filter(r => r.status === 'pending').length} pendinte
                </p>
              </div>
              <button
                onClick={handleNewRequisition}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Cerere Noua
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {requisitions.map((req) => (
                <div
                  key={req.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">{req.prNumber}</h3>
                        {getPriorityBadge(req.priority)}
                        {getStatusBadge(req.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Solicitat de:</span>
                          <div className="font-medium text-gray-900">{req.requestedBy}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Departament:</span>
                          <div className="font-medium text-gray-900">{req.department}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Articole:</span>
                          <div className="font-medium text-gray-900">{req.items}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Valoare estimata:</span>
                          <div className="font-medium text-gray-900">
                            {formatCurrency(req.estimatedAmount)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Creat: {req.createdAt.toLocaleDateString('ro-RO')}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveRequisition(req)}
                            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Aproba
                          </button>
                          <button
                            onClick={() => handleRejectRequisition(req)}
                            className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700"
                          >
                            Respinge
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleViewRequisition(req)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1.5 border border-blue-600 rounded"
                      >
                        Detalii
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Top Furnizori</h2>
                <p className="text-sm text-gray-500">Clasament dupa valoarea totala a cheltuielilor</p>
              </div>
              <button
                onClick={handleAddVendor}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adauga Furnizor
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {vendors.map((vendor, index) => (
                <div
                  key={vendor.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-blue-100 text-blue-600 font-bold rounded-full w-10 h-10 flex items-center justify-center">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900">{vendor.name}</h3>
                          <span className="text-xs text-gray-500">({vendor.code})</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            vendor.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {vendor.status === 'active' ? 'Activ' : 'Inactiv'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Categorie:</span>
                            <div className="font-medium text-gray-900">{vendor.category}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Total Cheltuieli:</span>
                            <div className="font-bold text-blue-600">
                              {formatCurrency(vendor.totalSpend)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Comenzi:</span>
                            <div className="font-medium text-gray-900">{vendor.poCount}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Rating:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-gray-900">{vendor.rating}</span>
                              <span className="text-yellow-500">★</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Termeni Plata:</span>
                            <div className="font-medium text-gray-900">{vendor.paymentTerms}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleVendorDetails(vendor)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 ml-4"
                    >
                      Detalii
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'receipts' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Receptii Marfa</h2>
                <p className="text-sm text-gray-500">Gestionare receptii si control calitate</p>
              </div>
              <button
                onClick={handleNewReceipt}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Receptie Noua
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center py-12 text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Modulul Receptii Marfa</p>
              <p className="text-sm mt-2">
                Sectiunea pentru inregistrarea si urmarirea receptiilor marfurilor
              </p>
              <p className="text-sm mt-1">
                Include verificare cantitati, control calitate si actualizare stoc
              </p>
              <button
                onClick={handleCreateFirstReceipt}
                className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Creeaza Prima Receptie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
