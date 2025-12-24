'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building,
  Receipt,
  X,
  Loader2,
  CheckSquare,
  FileSpreadsheet,
  MoreHorizontal,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  method: string;
  paymentDate: string;
  reference: string | null;
  description: string | null;
  bankName: string | null;
  bankAccount: string | null;
  status: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    partnerName: string;
    grossAmount: number;
    currency: string;
  };
}

interface PaymentsResponse {
  data: Payment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface DashboardStats {
  unpaid: { total: number; count: number };
  partiallyPaid: { total: number; count: number };
  overdue: { count: number };
  thisMonth: { paid: number; paymentsCount: number };
  receivables: { total: number; count: number };
  payables: { total: number; count: number };
}

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  partnerName: string;
  grossAmount: number;
  dueDate: string;
  totalPaid: number;
  remaining: number;
  daysOverdue: number;
  currency: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  partnerName: string;
  grossAmount: number;
  currency: string;
  paymentStatus: string;
}

export default function PaymentsPage() {
  const t = useTranslations('payments');
  const router = useRouter();
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    currency: 'RON',
    method: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    bankName: '',
    bankAccount: '',
  });

  // Filter payments by search term (defined early for use in toggleSelectAll)
  const filteredPayments = payments.filter(payment => {
    const matchesSearch =
      payment.invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.reference?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Bulk selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredPayments.length && filteredPayments.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPayments.map(p => p.id)));
    }
  }, [filteredPayments, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }, [selectedIds]);

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowBulkMenu(false);
  };

  // Bulk action handlers
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const ids = Array.from(selectedIds);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/bulk/payments/update-status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids, status: newStatus }),
      });

      if (response.ok) {
        toast.success('Plăți actualizate', `${ids.length} plăți au fost actualizate cu succes!`);
        clearSelection();
        fetchData();
      } else {
        toast.error('Eroare', 'Nu s-au putut actualiza plățile.');
      }
    } catch (error) {
      console.error('Bulk status change error:', error);
      toast.error('Eroare', 'Nu s-au putut actualiza plățile.');
    } finally {
      setBulkActionLoading(false);
      setShowBulkMenu(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const idsParam = Array.from(selectedIds).join(',');
    router.push(`/dashboard/payments/bulk-delete?ids=${idsParam}&count=${selectedIds.size}`);
  };

  const handleBulkDeleteConfirmed = async () => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const ids = Array.from(selectedIds);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/bulk/payments/delete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });

      if (response.ok) {
        toast.success('Plăți șterse', `${ids.length} plăți au fost șterse cu succes!`);
        clearSelection();
        fetchData();
      } else {
        toast.error('Eroare', 'Nu s-au putut șterge plățile.');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Eroare', 'Nu s-au putut șterge plățile.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const ids = Array.from(selectedIds);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/bulk/payments/export`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids, format: 'excel' }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `plati_selectate_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Export finalizat', 'Fișierul Excel a fost descărcat.');
      } else {
        toast.error('Eroare', 'Nu s-a putut exporta plățile.');
      }
    } catch (error) {
      console.error('Bulk export error:', error);
      toast.error('Eroare', 'Nu s-a putut exporta plățile.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, methodFilter, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, statsRes, overdueRes] = await Promise.all([
        api.get<PaymentsResponse>(`/payments?page=${page}&limit=20${methodFilter !== 'all' ? `&method=${methodFilter}` : ''}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`),
        api.get<DashboardStats>('/payments/dashboard'),
        api.get<OverdueInvoice[]>('/payments/overdue'),
      ]);

      if (paymentsRes.data) {
        setPayments(paymentsRes.data.data || []);
        setTotalPages(paymentsRes.data.meta?.totalPages || 1);
      }

      if (statsRes.data) {
        setStats(statsRes.data);
      }

      if (overdueRes.data) {
        setOverdueInvoices(overdueRes.data);
      }

      setError(null);
    } catch (err) {
      setError('Eroare la incarcarea datelor');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnpaidInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const response = await api.get<{ data: Invoice[] }>('/invoices?paymentStatus=UNPAID,PARTIAL&limit=100');
      if (response.data?.data) {
        setUnpaidInvoices(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch unpaid invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const openPaymentModal = () => {
    setShowPaymentModal(true);
    fetchUnpaidInvoices();
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.invoiceId || !paymentForm.amount) return;

    setSubmitting(true);
    try {
      const response = await api.post('/payments', {
        invoiceId: paymentForm.invoiceId,
        amount: parseFloat(paymentForm.amount),
        currency: paymentForm.currency,
        method: paymentForm.method,
        paymentDate: new Date(paymentForm.paymentDate),
        reference: paymentForm.reference || undefined,
        description: paymentForm.description || undefined,
        bankName: paymentForm.bankName || undefined,
        bankAccount: paymentForm.bankAccount || undefined,
      });

      if (response.status === 201) {
        setShowPaymentModal(false);
        setPaymentForm({
          invoiceId: '',
          amount: '',
          currency: 'RON',
          method: 'BANK_TRANSFER',
          paymentDate: new Date().toISOString().split('T')[0],
          reference: '',
          description: '',
          bankName: '',
          bankAccount: '',
        });
        toast.success('Plată înregistrată', 'Plata a fost înregistrată cu succes!');
        fetchData();
      } else {
        toast.error('Eroare', response.error || 'Nu s-a putut înregistra plata.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut înregistra plata.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  const getMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      BANK_TRANSFER: 'Transfer Bancar',
      CARD: 'Card',
      CASH: 'Numerar',
      CHECK: 'Cec',
      OTHER: 'Altele',
    };
    return methods[method] || method;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'REFUNDED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <button
          onClick={openPaymentModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('recordPayment')}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('unpaidInvoices')}</p>
                <p className="text-2xl font-bold text-red-600">{formatAmount(stats.unpaid.total)}</p>
                <p className="text-xs text-gray-400">{stats.unpaid.count} {t('invoicesCount')}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('overdueCount')}</p>
                <p className="text-2xl font-bold text-orange-600">{stats.overdue.count}</p>
                <p className="text-xs text-gray-400">{t('invoicesOverdue')}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('receivables')}</p>
                <p className="text-2xl font-bold text-green-600">{formatAmount(stats.receivables.total)}</p>
                <p className="text-xs text-gray-400">{stats.receivables.count} {t('invoicesCount')}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('payables')}</p>
                <p className="text-2xl font-bold text-blue-600">{formatAmount(stats.payables.total)}</p>
                <p className="text-xs text-gray-400">{stats.payables.count} {t('invoicesCount')}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <TrendingDown className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      {stats && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium opacity-90">{t('thisMonth')}</h3>
              <p className="text-3xl font-bold mt-1">{formatAmount(stats.thisMonth.paid)}</p>
              <p className="text-sm opacity-75">{stats.thisMonth.paymentsCount} {t('paymentsRecorded')}</p>
            </div>
            <div className="bg-white/20 p-4 rounded-full">
              <CreditCard className="h-8 w-8" />
            </div>
          </div>
        </div>
      )}

      {/* Overdue Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800">{t('overdueAlert')}</h3>
          </div>
          <div className="space-y-2">
            {overdueInvoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between bg-white p-3 rounded border border-red-100">
                <div>
                  <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{invoice.partnerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-red-600">{formatAmount(invoice.remaining, invoice.currency)}</p>
                  <p className="text-xs text-red-500">{invoice.daysOverdue} {t('daysOverdue')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t('recentPayments')}</h3>

        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedIds.size} plati selectate
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Deselecteaza
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkExport}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowBulkMenu(!showBulkMenu)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 flex items-center gap-1"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  Status
                </button>
                {showBulkMenu && (
                  <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => handleBulkStatusChange('COMPLETED')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Finalizat
                    </button>
                    <button
                      onClick={() => handleBulkStatusChange('CANCELLED')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                      Anulat
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Sterge
              </button>
              {bulkActionLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchPayments')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('allMethods')}</option>
              <option value="BANK_TRANSFER">{t('bankTransfer')}</option>
              <option value="CARD">{t('card')}</option>
              <option value="CASH">{t('cash')}</option>
              <option value="CHECK">{t('check')}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="COMPLETED">{t('completed')}</option>
              <option value="PENDING">{t('pending')}</option>
              <option value="CANCELLED">{t('cancelled')}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('noPayments')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredPayments.length && filteredPayments.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('invoice')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('partner')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('amount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('method')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className={`hover:bg-gray-50 ${selectedIds.has(payment.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(payment.id)}
                        onChange={() => toggleSelect(payment.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Receipt className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {payment.invoice.invoiceNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">
                          {payment.invoice.partnerName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {formatAmount(payment.amount, payment.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {getMethodLabel(payment.method)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {formatDate(payment.paymentDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              {t('previous')}
            </button>
            <span className="px-3 py-1">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              {t('next')}
            </button>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{t('recordPayment')}</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-4 space-y-4">
              {/* Invoice Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('selectInvoice')} *
                </label>
                {loadingInvoices ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <select
                    value={paymentForm.invoiceId}
                    onChange={(e) => {
                      const invoice = unpaidInvoices.find(inv => inv.id === e.target.value);
                      setPaymentForm({
                        ...paymentForm,
                        invoiceId: e.target.value,
                        currency: invoice?.currency || 'RON',
                      });
                    }}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('selectInvoicePlaceholder')}</option>
                    {unpaidInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} - {invoice.partnerName} ({formatAmount(invoice.grossAmount, invoice.currency)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('amount')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('currency')}
                  </label>
                  <select
                    value={paymentForm.currency}
                    onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="RON">RON</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {/* Method and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('method')} *
                  </label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="BANK_TRANSFER">{t('bankTransfer')}</option>
                    <option value="CARD">{t('card')}</option>
                    <option value="CASH">{t('cash')}</option>
                    <option value="CHECK">{t('check')}</option>
                    <option value="OTHER">{t('other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('paymentDate')} *
                  </label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('reference')}
                </label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder={t('referencePlaceholder')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Bank Details (shown for bank transfer) */}
              {paymentForm.method === 'BANK_TRANSFER' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('bankName')}
                    </label>
                    <input
                      type="text"
                      value={paymentForm.bankName}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('bankAccount')}
                    </label>
                    <input
                      type="text"
                      value={paymentForm.bankAccount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bankAccount: e.target.value })}
                      placeholder="IBAN"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('description')}
                </label>
                <textarea
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !paymentForm.invoiceId || !paymentForm.amount}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
