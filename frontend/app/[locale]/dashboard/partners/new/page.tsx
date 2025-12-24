'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Search,
  CheckCircle,
  AlertCircle,
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

export default function NewPartnerPage() {
  const t = useTranslations('partners');
  const toast = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState<PartnerForm>(initialFormState);
  const [saving, setSaving] = useState(false);
  const [lookingUpCui, setLookingUpCui] = useState(false);
  const [cuiVerified, setCuiVerified] = useState<boolean | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const handleLookupCui = async () => {
    if (!formData.cui.trim()) {
      toast.error('CUI necesar', 'Introduceți un CUI pentru a căuta în ANAF.');
      return;
    }

    setLookingUpCui(true);
    setCuiVerified(null);
    try {
      // Try to fetch from ANAF API
      const response = await fetch(`${API_URL}/anaf/company/${formData.cui.replace('RO', '')}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const companyData = await response.json();
        setFormData((prev) => ({
          ...prev,
          name: companyData.denumire || companyData.name || prev.name,
          address: companyData.adresa || companyData.address || prev.address,
          city: companyData.localitate || companyData.city || prev.city,
          county: companyData.judet || companyData.county || prev.county,
          regCom: companyData.nrRegCom || companyData.regCom || prev.regCom,
        }));
        setCuiVerified(true);
        toast.success('CUI verificat', 'Datele companiei au fost preluate din ANAF.');
      } else {
        setCuiVerified(false);
        toast.error('CUI negăsit', 'Compania nu a fost găsită în baza de date ANAF.');
      }
    } catch (err) {
      console.error('CUI lookup error:', err);
      setCuiVerified(false);
      toast.error('Eroare', 'Nu s-a putut verifica CUI-ul. Verificați conexiunea.');
    } finally {
      setLookingUpCui(false);
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
      const response = await fetch(`${API_URL}/partners`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create partner');
      }

      const newPartner = await response.json();
      toast.success('Partener creat', `${formData.name} a fost adăugat cu succes.`);
      router.push(`/dashboard/partners/${newPartner.id || ''}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare la creare';
      toast.error('Eroare', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof PartnerForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'cui') {
      setCuiVerified(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard/partners')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partener nou</h1>
          <p className="text-gray-500">Adăugați un client sau furnizor</p>
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
            {/* CUI with lookup */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CUI / CIF
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={formData.cui}
                    onChange={(e) => handleChange('cui', e.target.value)}
                    placeholder="RO12345678"
                    className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                      cuiVerified === true
                        ? 'border-green-500 bg-green-50'
                        : cuiVerified === false
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {cuiVerified === true && (
                    <CheckCircle className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                  )}
                  {cuiVerified === false && (
                    <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleLookupCui}
                  disabled={lookingUpCui || !formData.cui.trim()}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
                  title="Verifică în ANAF"
                >
                  {lookingUpCui ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  ANAF
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Introduceți CUI-ul și apăsați ANAF pentru autocompletare
              </p>
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
            onClick={() => router.push('/dashboard/partners')}
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
            Creează partener
          </button>
        </div>
      </form>
    </div>
  );
}
