'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import {
  Send,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
  TrendingUp,
  Calendar,
  Shield,
  Eye,
  FileCode,
  AlertTriangle,
  ArrowRight,
  Building2,
  Search,
  Filter,
  BarChart3,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

// Types
interface B2BDashboardData {
  user: {
    company: string;
    cui: string;
  };
  spvConnection: {
    connected: boolean;
    features: string[];
  };
  stats: {
    monthlyInvoices: number;
    pendingSubmissions: number;
    currentMonth: string;
  };
  readiness: {
    ready: boolean;
    score: number;
    recommendations: string[];
  };
  compliance: {
    mandateStartDate: string;
    currentPhase: string;
    nextDeadline: string;
    recommendations: string[];
  };
  recentSubmissions: Array<{
    id: string;
    uploadIndex: string;
    status: string;
    submittedAt: string;
  }>;
  alerts: Array<{
    type: 'info' | 'warning' | 'error';
    message: string;
  }>;
}

interface InvoiceWithStatus {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  partnerName: string;
  partnerCui: string;
  grossAmount: number;
  currency: string;
  type: string;
  efacturaStatus: string | null;
  efacturaRef: string | null;
  efacturaSubmittedAt: string | null;
}

interface InvoicesResponse {
  invoices: InvoiceWithStatus[];
  total: number;
  stats: {
    total: number;
    pending: number;
    submitted: number;
    accepted: number;
    rejected: number;
  };
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    code: string;
    message: string;
    suggestion: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
  summary: {
    invoiceNumber: string;
    totalErrors: number;
    totalWarnings: number;
    readyForSubmission: boolean;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function EfacturaB2BDashboardPage() {
  const t = useTranslations('efactura');
  const toast = useToast();

  // State
  const [dashboard, setDashboard] = useState<B2BDashboardData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWithStatus[]>([]);
  const [invoiceStats, setInvoiceStats] = useState<InvoicesResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Operation states
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [validating, setValidating] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithStatus | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewXml, setPreviewXml] = useState<string>('');

  // Get current user ID (in real app, from auth context)
  const getUserId = () => localStorage.getItem('user_id') || 'demo-user';

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();

      const response = await fetch(`${API_URL}/efactura-b2b/dashboard/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  }, []);

  // Fetch invoices with e-Factura status
  const fetchInvoices = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (periodFilter) params.append('period', periodFilter);

      const response = await fetch(
        `${API_URL}/efactura-b2b/invoices/${userId}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data: InvoicesResponse = await response.json();
        setInvoices(data.invoices);
        setInvoiceStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  }, [statusFilter, periodFilter]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDashboard(), fetchInvoices()]);
      setLoading(false);
    };
    loadData();
  }, [fetchDashboard, fetchInvoices]);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchInvoices()]);
    setRefreshing(false);
  };

  // Validate invoice before submission
  const handleValidate = async (invoice: InvoiceWithStatus) => {
    setValidating(invoice.id);
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();

      const response = await fetch(`${API_URL}/efactura-b2b/validate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId: invoice.id, userId }),
      });

      if (response.ok) {
        const result: ValidationResult = await response.json();
        setValidationResult(result);
        setSelectedInvoice(invoice);
        setShowValidationModal(true);
      }
    } catch (err) {
      console.error('Validation error:', err);
      toast.error('Eroare', 'Eroare la validare');
    } finally {
      setValidating(null);
    }
  };

  // Preview XML
  const handlePreview = async (invoice: InvoiceWithStatus) => {
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();

      const response = await fetch(
        `${API_URL}/efactura-b2b/preview/${invoice.id}?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPreviewXml(result.formatted || result.xml);
          setSelectedInvoice(invoice);
          setShowPreviewModal(true);
        } else {
          toast.error('Eroare', result.errors?.join('; ') || 'Eroare la generarea XML');
        }
      }
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Eroare', 'Eroare la previzualizare');
    }
  };

  // Submit to SPV
  const handleSubmit = async (invoice: InvoiceWithStatus) => {
    setSubmitting(invoice.id);
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();

      const response = await fetch(`${API_URL}/efactura-b2b/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId: invoice.id, userId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.compliance('e-Factura transmisă', `Upload Index: ${result.uploadIndex}`);
        await fetchInvoices();
        await fetchDashboard();
      } else {
        toast.error('Eroare transmitere', result.errors?.join('; ') || 'Eroare la transmitere');
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Eroare', 'Eroare de conexiune');
    } finally {
      setSubmitting(null);
    }
  };

  // Check submission status
  const handleCheckStatus = async (invoice: InvoiceWithStatus) => {
    if (!invoice.efacturaRef) return;

    setCheckingStatus(invoice.id);
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();

      const response = await fetch(
        `${API_URL}/efactura-b2b/status/${invoice.efacturaRef}?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success('Status actualizat', `Status: ${result.anafStatus || result.status} | Index: ${result.uploadIndex}`);
        await fetchInvoices();
      }
    } catch (err) {
      console.error('Check status error:', err);
      toast.error('Eroare', 'Eroare la verificarea statusului');
    } finally {
      setCheckingStatus(null);
    }
  };

  // Download XML
  const handleDownloadXml = async (invoice: InvoiceWithStatus) => {
    try {
      const userId = getUserId();
      window.open(
        `${API_URL}/efactura-b2b/download/${invoice.id}?userId=${userId}`,
        '_blank'
      );
      toast.success('Descărcare', `XML pentru ${invoice.invoiceNumber} inițiată`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Eroare', 'Eroare la descărcare');
    }
  };

  // Helper functions
  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'SUBMITTED':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertBgColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('ro-RO');
  const formatAmount = (amount: number, currency = 'RON') =>
    `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}`;

  // Filter invoices by search term
  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.partnerCui && inv.partnerCui.includes(searchTerm))
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Se incarca dashboard-ul B2B...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            e-Factura B2B - Dashboard Operational
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitorizare si transmitere facturi B2B catre ANAF SPV
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizeaza
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      {dashboard?.alerts && dashboard.alerts.length > 0 && (
        <div className="space-y-2">
          {dashboard.alerts.map((alert, i) => (
            <div
              key={i}
              className={`border rounded-lg p-3 flex items-center gap-3 ${getAlertBgColor(alert.type)}`}
            >
              {getAlertIcon(alert.type)}
              <span className="text-sm">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* SPV Connection */}
        <div className={`rounded-lg shadow p-4 ${dashboard?.spvConnection?.connected ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conexiune SPV</p>
              <p className={`text-lg font-semibold ${dashboard?.spvConnection?.connected ? 'text-green-700' : 'text-red-700'}`}>
                {dashboard?.spvConnection?.connected ? 'Conectat' : 'Deconectat'}
              </p>
            </div>
            <Shield className={`h-8 w-8 ${dashboard?.spvConnection?.connected ? 'text-green-400' : 'text-red-400'}`} />
          </div>
        </div>

        {/* Compliance Score */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Scor Conformitate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {dashboard?.readiness?.score || 0}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-400" />
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                (dashboard?.readiness?.score || 0) >= 80
                  ? 'bg-green-500'
                  : (dashboard?.readiness?.score || 0) >= 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${dashboard?.readiness?.score || 0}%` }}
            />
          </div>
        </div>

        {/* Pending Submissions */}
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600">In Asteptare</p>
              <p className="text-2xl font-semibold text-yellow-900">
                {invoiceStats?.pending || 0}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        {/* Submitted */}
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Transmise</p>
              <p className="text-2xl font-semibold text-blue-900">
                {invoiceStats?.submitted || 0}
              </p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        {/* Accepted */}
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Acceptate</p>
              <p className="text-2xl font-semibold text-green-900">
                {invoiceStats?.accepted || 0}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Compliance Calendar */}
      {dashboard?.compliance && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Calendar Conformitate B2B
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Faza Curenta</p>
              <p className="text-lg font-medium text-gray-900">{dashboard.compliance.currentPhase}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Termen</p>
              <p className="text-lg font-medium text-blue-900">{dashboard.compliance.nextDeadline}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600">Data Obligativitate</p>
              <p className="text-lg font-medium text-purple-900">{dashboard.compliance.mandateStartDate}</p>
            </div>
          </div>
          {dashboard.compliance.recommendations.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Recomandari:</p>
              <ul className="space-y-1">
                {dashboard.compliance.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recent Submissions */}
      {dashboard?.recentSubmissions && dashboard.recentSubmissions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-6 w-6 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Transmisii Recente
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Upload Index
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dashboard.recentSubmissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-4 py-2 text-sm font-mono text-gray-900">
                      {sub.uploadIndex}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {formatDate(sub.submittedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoices List with Filters */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Facturi pentru e-Factura B2B
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cauta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Toate statusurile</option>
                  <option value="DRAFT">In asteptare</option>
                  <option value="SUBMITTED">Transmise</option>
                  <option value="ACCEPTED">Acceptate</option>
                  <option value="REJECTED">Respinse</option>
                </select>
              </div>

              {/* Period Filter */}
              <input
                type="month"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status e-Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actiuni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </div>
                    {invoice.efacturaRef && (
                      <div className="text-xs text-gray-400 font-mono">
                        {invoice.efacturaRef}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900">{invoice.partnerName}</div>
                        <div className="text-xs text-gray-500">{invoice.partnerCui}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatAmount(invoice.grossAmount, invoice.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invoice.efacturaStatus)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.efacturaStatus)}`}>
                        {invoice.efacturaStatus || 'In asteptare'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {/* Validate */}
                      <button
                        onClick={() => handleValidate(invoice)}
                        disabled={validating === invoice.id}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded disabled:opacity-50"
                        title="Valideaza"
                      >
                        {validating === invoice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                      </button>

                      {/* Preview XML */}
                      <button
                        onClick={() => handlePreview(invoice)}
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded"
                        title="Preview XML"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Download XML */}
                      <button
                        onClick={() => handleDownloadXml(invoice)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Descarca XML"
                      >
                        <FileCode className="h-4 w-4" />
                      </button>

                      {/* Submit to SPV */}
                      {(!invoice.efacturaStatus || invoice.efacturaStatus === 'DRAFT') && (
                        <button
                          onClick={() => handleSubmit(invoice)}
                          disabled={submitting === invoice.id}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                          title="Transmite la SPV"
                        >
                          {submitting === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                      )}

                      {/* Check Status */}
                      {invoice.efacturaStatus === 'SUBMITTED' && (
                        <button
                          onClick={() => handleCheckStatus(invoice)}
                          disabled={checkingStatus === invoice.id}
                          className="p-1.5 text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50"
                          title="Verifica status"
                        >
                          {checkingStatus === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>Nu exista facturi care sa corespunda criteriilor</p>
            </div>
          )}
        </div>
      </div>

      {/* Validation Modal */}
      {showValidationModal && validationResult && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Rezultat Validare - {selectedInvoice.invoiceNumber}
                </h3>
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    setValidationResult(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Status */}
              <div className={`p-4 rounded-lg ${validationResult.valid ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-3">
                  {validationResult.valid ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                  <div>
                    <p className={`font-medium ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                      {validationResult.valid ? 'Factura valida pentru transmitere' : 'Factura invalida'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {validationResult.summary.totalErrors} erori, {validationResult.summary.totalWarnings} avertismente
                    </p>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-800 mb-2">Erori ({validationResult.errors.length})</h4>
                  <div className="space-y-2">
                    {validationResult.errors.map((err, i) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-red-800">{err.message}</p>
                        <p className="text-xs text-red-600 mt-1">
                          Camp: {err.field} | Cod: {err.code}
                        </p>
                        {err.suggestion && (
                          <p className="text-xs text-gray-600 mt-1">
                            Sugestie: {err.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-800 mb-2">Avertismente ({validationResult.warnings.length})</h4>
                  <div className="space-y-2">
                    {validationResult.warnings.map((warn, i) => (
                      <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">{warn.message}</p>
                        <p className="text-xs text-yellow-600">Camp: {warn.field}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {validationResult.valid && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowValidationModal(false);
                      handleSubmit(selectedInvoice);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Transmite la SPV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* XML Preview Modal */}
      {showPreviewModal && previewXml && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Preview XML - {selectedInvoice?.invoiceNumber}
              </h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewXml('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto whitespace-pre">
                {previewXml}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => selectedInvoice && handleDownloadXml(selectedInvoice)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Descarca XML
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
