'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Edit,
  Trash2,
  FileText,
  Calendar,
  TrendingUp,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ToggleRight,
  ToggleLeft,
  ExternalLink,
} from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  cui: string | null;
  regCom: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  country: string;
  postalCode: string | null;
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  bankName: string | null;
  bankAccount: string | null;
  type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  isActive: boolean;
  invoiceCount: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  grossAmount: number | string;
  status: string;
  partnerId?: string | null;
}

interface InvoiceListResponse {
  data?: Invoice[];
  meta?: { total?: number };
}

// GET /invoices does not (yet) filter by partnerId server-side, so we pull a
// larger page and filter client-side to never show another partner's invoices.
const INVOICE_FETCH_LIMIT = 100;

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function PartnerDetailPage() {
  const t = useTranslations('partners');
  const toast = useToast();
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesLoadError, setInvoicesLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices'>('overview');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    fetchPartner();
    fetchInvoices();
  }, [partnerId]);

  const fetchPartner = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/partners/${partnerId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Partenerul nu a fost găsit.');
        } else {
          throw new Error('Failed to fetch partner');
        }
        return;
      }

      const data = await response.json();
      setPartner(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Nu am putut încărca partenerul. Reîncearcă. / Could not load the partner. Please retry.');
      setPartner(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    setInvoicesLoadError(false);
    try {
      const r = await api.get<InvoiceListResponse | Invoice[]>('/invoices', {
        params: { partnerId, limit: INVOICE_FETCH_LIMIT },
      });

      if (r.status < 200 || r.status >= 300 || !r.data) {
        // Never fabricate history: empty list + explicit error banner.
        setInvoices([]);
        setInvoicesLoadError(true);
        return;
      }

      const list: Invoice[] = Array.isArray(r.data) ? r.data : (r.data.data ?? []);
      // Backend ignores partnerId today; keep only this partner's invoices.
      setInvoices(list.filter((inv) => inv.partnerId === partnerId));
    } catch (err) {
      console.error('Fetch invoices error:', err);
      setInvoices([]);
      setInvoicesLoadError(true);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!partner) return;
    try {
      const response = await fetch(`${API_URL}/partners/${partnerId}/toggle-active`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setPartner({ ...partner, isActive: !partner.isActive });
        toast.success('Status actualizat', `Partenerul a fost ${partner.isActive ? 'dezactivat' : 'activat'}.`);
      } else {
        toast.error('Eroare', 'Nu s-a putut actualiza statusul.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut actualiza statusul.');
    }
  };

  const handleDelete = async () => {
    if (!partner) return;
    if (!window.confirm('Sigur doriți să ștergeți? Acțiunea nu poate fi anulată.')) return;
    const r = await api.delete(`/partners/${partnerId}`);
    if (r.status >= 200 && r.status < 300) { toast.success('Partener șters'); router.push('/dashboard/partners'); }
    else toast.error('Acțiunea a eșuat', r.error || 'Încercați din nou sau contactați echipa.');
  };

  const handleDeleteConfirmed = async () => {
    if (!partner) return;
    try {
      const response = await fetch(`${API_URL}/partners/${partnerId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast.success('Partener șters', `${partner.name} a fost șters cu succes.`);
        router.push('/dashboard/partners');
      } else {
        toast.error('Eroare', 'Nu s-a putut șterge partenerul.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut șterge partenerul.');
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('ro-RO');
  const formatAmount = (amount: number | string) =>
    `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CUSTOMER': return 'bg-blue-100 text-blue-800';
      case 'SUPPLIER': return 'bg-purple-100 text-purple-800';
      case 'BOTH': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CUSTOMER': return 'Client';
      case 'SUPPLIER': return 'Furnizor';
      case 'BOTH': return 'Client & Furnizor';
      default: return type;
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
      {error && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-200" role="status">{error}</div>
      )}
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Se încarcă...</span>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Eroare</h2>
        <p className="text-red-700">{error || 'Partenerul nu a fost găsit.'}</p>
        <button
          onClick={() => router.push('/dashboard/partners')}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Înapoi la parteneri
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/partners')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{partner.name}</h1>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTypeColor(partner.type)}`}>
                {getTypeLabel(partner.type)}
              </span>
              {partner.isActive ? (
                <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">Activ</span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">Inactiv</span>
              )}
            </div>
            <p className="text-gray-500 mt-1">{partner.cui || 'Fără CUI'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleToggleActive}
            className={`px-4 py-2 rounded-md flex items-center gap-2 ${
              partner.isActive
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {partner.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
            {partner.isActive ? 'Dezactivează' : 'Activează'}
          </button>
          <button
            onClick={() => router.push(`/dashboard/partners/${partnerId}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Editează
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Șterge
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Facturi</p>
              <p className="text-2xl font-semibold">{partner.invoiceCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">Total încasări</p>
              <p className="text-2xl font-semibold">{formatAmount(partner.totalRevenue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500">Partener din</p>
              <p className="text-2xl font-semibold">{formatDate(partner.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {(['overview', 'invoices'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 border-b-2 text-sm font-medium ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' && 'Detalii'}
              {tab === 'invoices' && (invoicesLoadError ? 'Facturi' : `Facturi (${invoices.length})`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              Informații contact
            </h3>
            <div className="space-y-4">
              {partner.contactPerson && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 w-24 text-sm">Persoană contact</span>
                  <span className="text-gray-900">{partner.contactPerson}</span>
                </div>
              )}
              {partner.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                  <a href={`mailto:${partner.email}`} className="text-blue-600 hover:underline">
                    {partner.email}
                  </a>
                </div>
              )}
              {partner.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                  <a href={`tel:${partner.phone}`} className="text-blue-600 hover:underline">
                    {partner.phone}
                  </a>
                </div>
              )}
              {partner.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-900">
                    {partner.address}
                    {partner.city && `, ${partner.city}`}
                    {partner.county && `, ${partner.county}`}
                    {partner.postalCode && ` ${partner.postalCode}`}
                    {partner.country && `, ${partner.country}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Business Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-400" />
              Informații fiscale și bancare
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-gray-400 w-24 text-sm">CUI</span>
                <span className="text-gray-900 font-mono">{partner.cui || '-'}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400 w-24 text-sm">Reg. Com.</span>
                <span className="text-gray-900">{partner.regCom || '-'}</span>
              </div>
              {partner.bankName && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 w-24 text-sm">Bancă</span>
                  <span className="text-gray-900">{partner.bankName}</span>
                </div>
              )}
              {partner.bankAccount && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 w-24 text-sm">IBAN</span>
                  <span className="text-gray-900 font-mono text-sm">{partner.bankAccount}</span>
                </div>
              )}
              <div className="pt-4 border-t text-xs text-gray-500">
                <p>Creat: {formatDate(partner.createdAt)}</p>
                <p>Ultima actualizare: {formatDate(partner.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Facturi recente</h3>
            <button
              onClick={() => router.push(`/dashboard/invoices/new?partnerId=${partnerId}`)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Factură nouă
            </button>
          </div>
          {invoicesLoading ? (
            <div className="p-8 flex items-center justify-center text-gray-500" role="status">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="ml-2">Se încarcă facturile...</span>
            </div>
          ) : invoicesLoadError ? (
            <div
              className="m-4 rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-start justify-between gap-4"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Nu am putut încărca istoricul</p>
                  <p className="text-sm text-amber-800">
                    Facturile acestui partener nu au putut fi încărcate. Reîncearcă.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchInvoices}
                className="px-3 py-1.5 text-sm rounded-md border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 flex items-center gap-2 shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
                Reîncearcă
              </button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nu există facturi pentru acest partener.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Număr</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadență</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sumă</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatAmount(invoice.grossAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getInvoiceStatusColor(invoice.status)}`}>
                        {invoice.status === 'PAID' ? 'Plătită' : invoice.status === 'PENDING' ? 'În așteptare' : invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
