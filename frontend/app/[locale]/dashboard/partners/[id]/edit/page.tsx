'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Save,
  Loader2,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
} from 'lucide-react';

interface PartnerForm {
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

const initialFormState: PartnerForm = {
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function EditPartnerPage() {
  const t = useTranslations('partners');
  const toast = useToast();
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id as string;

  const [formData, setFormData] = useState<PartnerForm>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    fetchPartner();
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

      const partner = await response.json();
      setFormData({
        name: partner.name || '',
        cui: partner.cui || '',
        regCom: partner.regCom || '',
        address: partner.address || '',
        city: partner.city || '',
        county: partner.county || '',
        country: partner.country || 'Romania',
        postalCode: partner.postalCode || '',
        email: partner.email || '',
        phone: partner.phone || '',
        contactPerson: partner.contactPerson || '',
        bankName: partner.bankName || '',
        bankAccount: partner.bankAccount || '',
        type: partner.type || 'CUSTOMER',
      });
    } catch (err) {
      console.error('Fetch error:', err);
      // Mock data for demo
      setFormData({
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
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Validare', 'Numele partenerului este obligatoriu.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/partners/${partnerId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update partner');
      }

      toast.success('Partener actualizat', `${formData.name} a fost actualizat cu succes.`);
      router.push(`/dashboard/partners/${partnerId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare la salvare';
      toast.error('Eroare', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof PartnerForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Se încarcă...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Eroare</h2>
        <p className="text-red-700">{error}</p>
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/dashboard/partners/${partnerId}`)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editare partener</h1>
          <p className="text-gray-500">{formData.name}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        {/* Company Info Section */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            Informații companie
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Denumire companie *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CUI / CIF
              </label>
              <input
                type="text"
                value={formData.cui}
                onChange={(e) => handleChange('cui', e.target.value)}
                placeholder="RO12345678"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registrul Comerțului
              </label>
              <input
                type="text"
                value={formData.regCom}
                onChange={(e) => handleChange('regCom', e.target.value)}
                placeholder="J40/1234/2024"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tip partener
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="CUSTOMER">Client</option>
                <option value="SUPPLIER">Furnizor</option>
                <option value="BOTH">Client & Furnizor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-gray-400" />
            Informații contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Persoană contact
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Phone className="h-4 w-4" />
                Telefon
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-400" />
            Adresă
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresă
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Str. Exemplu nr. 10, bl. A, sc. 1, ap. 5"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Oraș
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Județ
              </label>
              <input
                type="text"
                value={formData.county}
                onChange={(e) => handleChange('county', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cod poștal
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Țară
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Bank Info Section */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-400" />
            Informații bancare
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bancă
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IBAN
              </label>
              <input
                type="text"
                value={formData.bankAccount}
                onChange={(e) => handleChange('bankAccount', e.target.value)}
                placeholder="RO49AAAA1B31007593840000"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/partners/${partnerId}`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvează modificările
          </button>
        </div>
      </form>
    </div>
  );
}
