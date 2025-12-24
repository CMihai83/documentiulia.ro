'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
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
  Clock,
  Loader2,
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

interface Activity {
  id: string;
  type: 'INVOICE' | 'PAYMENT' | 'NOTE' | 'STATUS_CHANGE';
  description: string;
  amount?: number;
  date: string;
  user?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  grossAmount: number;
  status: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function PartnerDetailPage() {
  const t = useTranslations('partners');
  const toast = useToast();
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'activity'>('overview');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    fetchPartner();
    fetchActivities();
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
      // Mock data for demo
      setPartner({
        id: partnerId,
        name: 'Exemplu SRL',
        cui: 'RO12345678',
        regCom: 'J40/1234/2020',
        address: 'Str. Exemplu nr. 10',
        city: 'București',
        county: 'București',
        country: 'Romania',
        postalCode: '010101',
        email: 'contact@exemplu.ro',
        phone: '+40 21 123 4567',
        contactPerson: 'Ion Popescu',
        bankName: 'Banca Transilvania',
        bankAccount: 'RO49BTRL0000001234567890',
        type: 'CUSTOMER',
        isActive: true,
        invoiceCount: 15,
        totalRevenue: 45000,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-12-10T14:30:00Z',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`${API_URL}/partners/${partnerId}/activities`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        // Mock activities
        setActivities([
          { id: '1', type: 'INVOICE', description: 'Factură #INV-2024-0156 emisă', amount: 5400, date: '2024-12-15', user: 'Maria' },
          { id: '2', type: 'PAYMENT', description: 'Plată primită pentru #INV-2024-0145', amount: 3200, date: '2024-12-10', user: 'Sistem' },
          { id: '3', type: 'NOTE', description: 'Contact telefonic - discuție despre contract', date: '2024-12-08', user: 'Ion' },
          { id: '4', type: 'STATUS_CHANGE', description: 'Partener activat', date: '2024-01-15', user: 'Admin' },
        ]);
      }
    } catch (err) {
      setActivities([]);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`${API_URL}/invoices?partnerId=${partnerId}&limit=10`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.data || data || []);
      } else {
        // Mock invoices
        setInvoices([
          { id: '1', invoiceNumber: 'INV-2024-0156', invoiceDate: '2024-12-15', dueDate: '2025-01-15', grossAmount: 5400, status: 'PENDING' },
          { id: '2', invoiceNumber: 'INV-2024-0145', invoiceDate: '2024-11-20', dueDate: '2024-12-20', grossAmount: 3200, status: 'PAID' },
          { id: '3', invoiceNumber: 'INV-2024-0130', invoiceDate: '2024-10-15', dueDate: '2024-11-15', grossAmount: 8900, status: 'PAID' },
        ]);
      }
    } catch (err) {
      setInvoices([]);
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
    router.push(`/dashboard/partners/${partnerId}/delete`);
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
  const formatAmount = (amount: number) => `${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`;

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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'INVOICE': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'PAYMENT': return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'NOTE': return <Edit className="h-4 w-4 text-yellow-600" />;
      case 'STATUS_CHANGE': return <ToggleRight className="h-4 w-4 text-purple-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
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
          {(['overview', 'invoices', 'activity'] as const).map((tab) => (
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
              {tab === 'invoices' && `Facturi (${invoices.length})`}
              {tab === 'activity' && `Activitate (${activities.length})`}
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
          {invoices.length === 0 ? (
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
                      {formatDate(invoice.dueDate)}
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

      {activeTab === 'activity' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Istoric activitate</h3>
          </div>
          {activities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nu există activitate pentru acest partener.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-full">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    {activity.amount && (
                      <p className="text-sm font-medium text-green-600">{formatAmount(activity.amount)}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(activity.date)}
                      {activity.user && ` • ${activity.user}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
