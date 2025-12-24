'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Building2,
  Users,
  TrendingUp,
  FileUp,
  Loader2,
  X,
  Eye,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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

interface PartnerStats {
  total: number;
  customers: number;
  suppliers: number;
  both: number;
  active: number;
  inactive: number;
}

interface PartnersResponse {
  data: Partner[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CreatePartnerForm {
  name: string;
  cui: string;
  regCom: string;
  address: string;
  city: string;
  county: string;
  country: string;
  postalCode: string;
  email: string;
  phone: string;
  contactPerson: string;
  bankName: string;
  bankAccount: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
}

const initialFormState: CreatePartnerForm = {
  name: '',
  cui: '',
  regCom: '',
  address: '',
  city: '',
  county: '',
  country: 'Romania',
  postalCode: '',
  email: '',
  phone: '',
  contactPerson: '',
  bankName: '',
  bankAccount: '',
  type: 'CUSTOMER',
};

export default function PartnersPage() {
  const t = useTranslations('partners');
  const toast = useToast();
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<CreatePartnerForm>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  // Debounce search term for API calls (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    fetchPartners();
    fetchStats();
  }, [typeFilter, activeFilter, page, debouncedSearchTerm]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(activeFilter !== 'all' && { isActive: activeFilter }),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
      });

      const response = await fetch(`${API_URL}/partners?${params}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch partners');

      const data: PartnersResponse = await response.json();
      setPartners(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setError(null);
    } catch (err) {
      setError(t('error'));
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL, page, typeFilter, activeFilter, debouncedSearchTerm, t]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/partners/stats`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data: PartnerStats = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch partner stats:', err);
    }
  }, [API_URL]);

  const handleSearch = () => {
    setPage(1);
    fetchPartners();
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingPartner
        ? `${API_URL}/partners/${editingPartner.id}`
        : `${API_URL}/partners`;

      const response = await fetch(url, {
        method: editingPartner ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to save partner');
      }

      setShowCreateModal(false);
      setEditingPartner(null);
      setFormData(initialFormState);
      fetchPartners();
      fetchStats();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error saving partner';
      toast.error('Eroare', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      cui: partner.cui || '',
      regCom: partner.regCom || '',
      address: partner.address || '',
      city: partner.city || '',
      county: partner.county || '',
      country: partner.country,
      postalCode: partner.postalCode || '',
      email: partner.email || '',
      phone: partner.phone || '',
      contactPerson: partner.contactPerson || '',
      bankName: partner.bankName || '',
      bankAccount: partner.bankAccount || '',
      type: partner.type,
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (partner: Partner) => {
    router.push(`/dashboard/partners/${partner.id}/delete`);
  };

  const handleDeleteConfirmed = async (partnerId: string, partnerName: string) => {
    try {
      const response = await fetch(`${API_URL}/partners/${partnerId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete partner');

      toast.success('Partener șters', `${partnerName} a fost șters cu succes.`);
      fetchPartners();
      fetchStats();
    } catch (err) {
      toast.error('Eroare', t('deleteError'));
    }
  };

  const handleToggleActive = async (partner: Partner) => {
    try {
      const response = await fetch(`${API_URL}/partners/${partner.id}/toggle-active`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to toggle partner status');

      toast.success('Status actualizat', `${partner.name}: ${partner.isActive ? 'dezactivat' : 'activat'}`);
      fetchPartners();
      fetchStats();
    } catch (err) {
      toast.error('Eroare', t('toggleError'));
    }
  };

  const handleImportFromInvoices = async () => {
    setImporting(true);
    try {
      const response = await fetch(`${API_URL}/partners/import`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to import partners');

      const result = await response.json();
      toast.success('Import finalizat', t('importSuccess', { imported: result.imported, total: result.total }));
      fetchPartners();
      fetchStats();
    } catch (err) {
      toast.error('Eroare', t('importError'));
    } finally {
      setImporting(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CUSTOMER':
        return 'bg-blue-100 text-blue-800';
      case 'SUPPLIER':
        return 'bg-purple-100 text-purple-800';
      case 'BOTH':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: number) => {
    return Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 }) + ' RON';
  };

  const filteredPartners = partners.filter((partner) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      partner.name.toLowerCase().includes(search) ||
      (partner.cui && partner.cui.toLowerCase().includes(search)) ||
      (partner.email && partner.email.toLowerCase().includes(search)) ||
      (partner.contactPerson && partner.contactPerson.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={handleImportFromInvoices}
            disabled={importing}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <FileUp className="h-5 w-5 mr-2" />
            )}
            {t('importFromInvoices')}
          </button>
          <button
            onClick={() => router.push('/dashboard/partners/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('addPartner')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500">{t('totalPartners')}</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-400 mr-3" />
              <div>
                <p className="text-sm text-blue-600">{t('customers')}</p>
                <p className="text-2xl font-semibold text-blue-900">{stats.customers}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-400 mr-3" />
              <div>
                <p className="text-sm text-purple-600">{t('suppliers')}</p>
                <p className="text-2xl font-semibold text-purple-900">{stats.suppliers}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="flex items-center">
              <ToggleRight className="h-8 w-8 text-green-400 mr-3" />
              <div>
                <p className="text-sm text-green-600">{t('active')}</p>
                <p className="text-2xl font-semibold text-green-900">{stats.active}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('allTypes')}</option>
              <option value="CUSTOMER">{t('customer')}</option>
              <option value="SUPPLIER">{t('supplier')}</option>
              <option value="BOTH">{t('both')}</option>
            </select>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('allStatus')}</option>
              <option value="true">{t('activeOnly')}</option>
              <option value="false">{t('inactiveOnly')}</option>
            </select>
          </div>
        </div>

        {/* Partners Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : filteredPartners.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('noPartners')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('cui')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('contact')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('invoicesCount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('totalRevenue')}
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
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/dashboard/partners/${partner.id}`)}
                        className="text-left hover:text-blue-600"
                      >
                        <div className="text-sm font-medium text-gray-900 hover:text-blue-600">{partner.name}</div>
                        {partner.city && (
                          <div className="text-xs text-gray-400">{partner.city}, {partner.county}</div>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {partner.cui || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(partner.type)}`}>
                        {t(partner.type.toLowerCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{partner.contactPerson || '-'}</div>
                      {partner.email && (
                        <div className="text-xs text-gray-400">{partner.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {partner.invoiceCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatAmount(partner.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(partner)}
                        className={`flex items-center ${
                          partner.isActive ? 'text-green-600' : 'text-gray-400'
                        }`}
                        title={partner.isActive ? t('deactivate') : t('activate')}
                      >
                        {partner.isActive ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/dashboard/partners/${partner.id}`)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Vezi detalii"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/partners/${partner.id}/edit`)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('edit')}
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(partner)}
                          className="text-red-600 hover:text-red-900"
                          title={t('delete')}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              {t('previous')}
            </button>
            <span className="px-3 py-1">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              {t('next')}
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingPartner ? t('editPartner') : t('addPartner')}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPartner(null);
                  setFormData(initialFormState);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('cui')}
                  </label>
                  <input
                    type="text"
                    value={formData.cui}
                    onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                    placeholder="RO12345678"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('regCom')}
                  </label>
                  <input
                    type="text"
                    value={formData.regCom}
                    onChange={(e) => setFormData({ ...formData, regCom: e.target.value })}
                    placeholder="J40/1234/2024"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('type')}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as 'CUSTOMER' | 'SUPPLIER' | 'BOTH',
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="CUSTOMER">{t('customer')}</option>
                    <option value="SUPPLIER">{t('supplier')}</option>
                    <option value="BOTH">{t('both')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contactPerson')}
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPerson: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('phone')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('address')}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('city')}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('county')}
                  </label>
                  <input
                    type="text"
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('country')}
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('postalCode')}
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('bankName')}
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('bankAccount')}
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount}
                    onChange={(e) =>
                      setFormData({ ...formData, bankAccount: e.target.value })
                    }
                    placeholder="RO49AAAA1B31007593840000"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPartner(null);
                    setFormData(initialFormState);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingPartner ? t('save') : t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
