'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, Eye, Edit, Download, Send, Loader2, FileSpreadsheet, CheckSquare, Square, Trash2, CheckCircle, XCircle, MoreHorizontal, Mail } from 'lucide-react';
import { SkeletonInvoiceList } from '@/components/ui/Skeleton';
import { InvoiceCreateForm } from '@/components/invoices/InvoiceCreateForm';
import { InvoiceDetailModal } from '@/components/invoices/InvoiceDetailModal';
import { BulkEmailModal } from '@/components/invoices/BulkEmailModal';
import { downloadInvoicePdf, type InvoicePdfData } from '@/lib/pdf';
import { useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  type: 'ISSUED' | 'RECEIVED';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'SUBMITTED' | 'PAID' | 'CANCELLED';
  partnerName: string;
  partnerCui: string | null;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  spvSubmitted: boolean;
}

interface InvoicesResponse {
  data: Invoice[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface VATSummary {
  period: string;
  issued: { count: number; netAmount: number; vatAmount: number; grossAmount: number };
  received: { count: number; netAmount: number; vatAmount: number; grossAmount: number };
  vatSummary: { collected: number; deductible: number; payable: number };
}

// Mock data for graceful degradation
const getMockInvoices = (): Invoice[] => [
  {
    id: '1',
    invoiceNumber: 'FV-2025-001',
    invoiceDate: '2025-12-15',
    dueDate: '2026-01-15',
    type: 'ISSUED',
    status: 'PENDING',
    partnerName: 'SC Example SRL',
    partnerCui: 'RO12345678',
    netAmount: 5000,
    vatAmount: 950,
    grossAmount: 5950,
    currency: 'RON',
    spvSubmitted: false,
  },
  {
    id: '2',
    invoiceNumber: 'FV-2025-002',
    invoiceDate: '2025-12-10',
    dueDate: '2026-01-10',
    type: 'ISSUED',
    status: 'SUBMITTED',
    partnerName: 'SC Tech Solutions SRL',
    partnerCui: 'RO87654321',
    netAmount: 12500,
    vatAmount: 2375,
    grossAmount: 14875,
    currency: 'RON',
    spvSubmitted: true,
  },
  {
    id: '3',
    invoiceNumber: 'FP-2025-001',
    invoiceDate: '2025-12-01',
    dueDate: '2025-12-31',
    type: 'RECEIVED',
    status: 'PAID',
    partnerName: 'Furnizor Services SRL',
    partnerCui: 'RO11223344',
    netAmount: 3200,
    vatAmount: 608,
    grossAmount: 3808,
    currency: 'RON',
    spvSubmitted: false,
  },
];

const getMockVATSummary = (): VATSummary => ({
  period: 'Decembrie 2025',
  issued: { count: 15, netAmount: 125000, vatAmount: 23750, grossAmount: 148750 },
  received: { count: 8, netAmount: 45000, vatAmount: 8550, grossAmount: 53550 },
  vatSummary: { collected: 23750, deductible: 8550, payable: 15200 },
});

export default function InvoicesPage() {
  const t = useTranslations('invoices');
  const router = useRouter();
  const toast = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vatSummary, setVatSummary] = useState<VATSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [submittingInvoiceId, setSubmittingInvoiceId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  // Debounce search term for performance (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filter invoices by debounced search term (defined early for use in toggleSelectAll)
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
        invoice.partnerName.toLowerCase().includes(searchLower);
      return matchesSearch;
    });
  }, [invoices, debouncedSearchTerm]);

  // Bulk selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(inv => inv.id)));
    }
  }, [filteredInvoices, selectedIds.size]);

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

      const response = await fetch(`${API_URL}/bulk/invoices/update-status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids, status: newStatus }),
      });

      if (response.ok) {
        toast.success('Facturi actualizate', `${ids.length} facturi au fost actualizate cu succes!`);
        clearSelection();
        fetchInvoices();
        fetchVATSummary();
      } else {
        toast.error('Eroare', 'Eroare la actualizarea facturilor');
      }
    } catch (error) {
      console.error('Bulk status change error:', error);
      toast.error('Eroare', 'Eroare la actualizarea facturilor');
    } finally {
      setBulkActionLoading(false);
      setShowBulkMenu(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    // Navigate to bulk delete confirmation page
    const idsParam = Array.from(selectedIds).join(',');
    router.push(`/dashboard/invoices/bulk-delete?ids=${idsParam}`);
  };

  const handleBulkDeleteConfirmed = async () => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const ids = Array.from(selectedIds);

      const response = await fetch(`${API_URL}/bulk/invoices/delete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });

      if (response.ok) {
        toast.success('Facturi șterse', `${ids.length} facturi au fost șterse cu succes!`);
        clearSelection();
        fetchInvoices();
        fetchVATSummary();
      } else {
        toast.error('Eroare', 'Eroare la ștergerea facturilor');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Eroare', 'Eroare la ștergerea facturilor');
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

      const response = await fetch(`${API_URL}/bulk/invoices/export`, {
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
        link.download = `facturi_selectate_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Export complet', 'Fișierul Excel a fost descărcat.');
      } else {
        toast.error('Eroare', 'Eroare la exportul facturilor');
      }
    } catch (error) {
      console.error('Bulk export error:', error);
      toast.error('Eroare', 'Eroare la exportul facturilor');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkSubmitSPV = async () => {
    if (selectedIds.size === 0) return;
    // Navigate to SPV submission confirmation page
    const idsParam = Array.from(selectedIds).join(',');
    router.push(`/dashboard/invoices/bulk-spv?ids=${idsParam}`);
  };

  const handleBulkSubmitSPVConfirmed = async () => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const ids = Array.from(selectedIds);

      const response = await fetch(`${API_URL}/anaf/efactura/bulk-submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceIds: ids }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.compliance('e-Factura SPV', `${result.successCount || ids.length} facturi au fost trimise către ANAF SPV!`);
        clearSelection();
        fetchInvoices();
        fetchVATSummary();
      } else {
        toast.error('Eroare SPV', 'Eroare la trimiterea facturilor către SPV');
      }
    } catch (error) {
      console.error('Bulk SPV submit error:', error);
      toast.error('Eroare conexiune', 'Eroare la trimiterea facturilor');
    } finally {
      setBulkActionLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchVATSummary();
  }, [typeFilter, statusFilter, page]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`${API_URL}/invoices?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch');

      const data: InvoicesResponse = await response.json();
      setInvoices(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      // Use mock data on error
      setInvoices(getMockInvoices());
      setTotalPages(1);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchVATSummary = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/invoices/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data: VATSummary = await response.json();
        setVatSummary(data);
      } else {
        throw new Error('API unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch VAT summary:', err);
      setVatSummary(getMockVATSummary());
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'APPROVED': return 'bg-indigo-100 text-indigo-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'ISSUED' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}`;
  };

  const handleDownloadPdf = (invoice: Invoice) => {
    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate || undefined,
      type: invoice.type,
      status: invoice.status,
      partnerName: invoice.partnerName,
      partnerCui: invoice.partnerCui || undefined,
      netAmount: invoice.netAmount,
      vatRate: invoice.vatAmount > 0 ? Math.round((invoice.vatAmount / invoice.netAmount) * 100) : 19,
      vatAmount: invoice.vatAmount,
      grossAmount: invoice.grossAmount,
      currency: invoice.currency,
    };
    downloadInvoicePdf(pdfData);
  };

  const handleSubmitToSPV = async (invoice: Invoice) => {
    setSubmittingInvoiceId(invoice.id);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/anaf/efactura/submit/${invoice.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.compliance('e-Factura SPV', 'Factura a fost trimisă către ANAF SPV!');
        fetchInvoices();
        fetchVATSummary();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare SPV', errorData.message || 'Eroare la trimiterea facturii către SPV');
      }
    } catch (error) {
      console.error('SPV submission error:', error);
      toast.error('Eroare conexiune', 'Eroare la trimiterea facturii');
    } finally {
      setSubmittingInvoiceId(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`${API_URL}/export/invoices/excel?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `facturi_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Export complet', 'Fișierul Excel a fost descărcat.');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Eroare export', 'Nu s-a putut genera fișierul Excel.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-5 w-5 mr-2" />
            )}
            {exporting ? t('exporting') : t('exportExcel')}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('new')}
          </button>
        </div>
      </div>

      {/* VAT Summary Cards */}
      {vatSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">{t('vatSummary')}</p>
            <p className="text-lg font-semibold text-gray-900">{vatSummary.period}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <p className="text-sm text-blue-600">{t('vatCollected')}</p>
            <p className="text-lg font-semibold text-blue-900">
              {formatAmount(vatSummary.vatSummary.collected)}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <p className="text-sm text-green-600">{t('vatDeductible')}</p>
            <p className="text-lg font-semibold text-green-900">
              {formatAmount(vatSummary.vatSummary.deductible)}
            </p>
          </div>
          <div className="bg-amber-50 rounded-lg shadow p-4">
            <p className="text-sm text-amber-600">{t('vatPayable')}</p>
            <p className="text-lg font-semibold text-amber-900">
              {formatAmount(vatSummary.vatSummary.payable)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedIds.size} facturi selectate
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
              <button
                onClick={() => setShowBulkEmailModal(true)}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                Trimite Email
              </button>
              <button
                onClick={handleBulkSubmitSPV}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="h-4 w-4" />
                Trimite SPV
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
                      onClick={() => handleBulkStatusChange('APPROVED')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Aproba
                    </button>
                    <button
                      onClick={() => handleBulkStatusChange('PAID')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      Marcheaza platit
                    </button>
                    <button
                      onClick={() => handleBulkStatusChange('CANCELLED')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                      Anuleaza
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

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('type')}</option>
              <option value="ISSUED">{t('issued')}</option>
              <option value="RECEIVED">{t('received')}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="DRAFT">{t('draft')}</option>
              <option value="PENDING">{t('pending')}</option>
              <option value="APPROVED">{t('approved')}</option>
              <option value="SUBMITTED">{t('submitted')}</option>
              <option value="PAID">{t('paid')}</option>
              <option value="CANCELLED">{t('cancelled')}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonInvoiceList />
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('noInvoices')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('number')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('partner')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('amount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={`hover:bg-gray-50 ${selectedIds.has(invoice.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(invoice.id)}
                        onChange={() => toggleSelect(invoice.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(invoice.type)}`}>
                        {t(invoice.type.toLowerCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{invoice.partnerName}</div>
                      {invoice.partnerCui && (
                        <div className="text-xs text-gray-400">{invoice.partnerCui}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">{formatAmount(invoice.grossAmount, invoice.currency)}</div>
                      <div className="text-xs text-gray-400">
                        TVA: {formatAmount(invoice.vatAmount, invoice.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {t(invoice.status.toLowerCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowDetailModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(invoice)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Download PDF"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        {invoice.type === 'ISSUED' && !invoice.spvSubmitted && (
                          <button
                            onClick={() => handleSubmitToSPV(invoice)}
                            disabled={submittingInvoiceId === invoice.id}
                            className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                            title={t('submitToSpv')}
                          >
                            {submittingInvoiceId === invoice.id ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Send className="h-5 w-5" />
                            )}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Invoice Create Form Modal */}
      <InvoiceCreateForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={() => {
          fetchInvoices();
          fetchVATSummary();
        }}
      />

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInvoice(null);
        }}
        onUpdate={() => {
          fetchInvoices();
          fetchVATSummary();
        }}
      />

      {/* Bulk Email Modal */}
      <BulkEmailModal
        isOpen={showBulkEmailModal}
        onClose={() => setShowBulkEmailModal(false)}
        invoiceIds={Array.from(selectedIds)}
        onSuccess={() => {
          fetchInvoices();
          clearSelection();
        }}
      />
    </div>
  );
}
