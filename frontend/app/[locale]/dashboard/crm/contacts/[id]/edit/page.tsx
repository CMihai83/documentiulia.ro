'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft, Save, User, Mail, Phone, Building2, Briefcase,
  Loader2, AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  status: 'LEAD' | 'CUSTOMER' | 'PARTNER' | 'INACTIVE';
  notes: string;
}

export default function EditContactPage() {
  const t = useTranslations('crm');
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const contactId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    status: 'LEAD',
    notes: '',
  });

  useEffect(() => {
    fetchContact();
  }, [contactId]);

  const fetchContact = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/crm/contacts/${contactId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          company: data.company || '',
          position: data.position || '',
          status: data.status || 'LEAD',
          notes: data.notes || '',
        });
      } else if (response.status === 404) {
        setError('Contactul nu a fost găsit');
      } else if (response.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
      }
    } catch (err) {
      console.error('Failed to fetch contact:', err);
      setError('Eroare de conexiune cu serverul');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/crm/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        toast.success('Contact actualizat', 'Modificările au fost salvate cu succes.');
        router.push(`/dashboard/crm/contacts/${contactId}`);
      } else if (response.status === 401) {
        toast.error('Sesiune expirată', 'Vă rugăm să vă autentificați din nou.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare', errorData.message || 'Eroare la actualizarea contactului');
      }
    } catch (err) {
      console.error('Failed to update contact:', err);
      toast.error('Eroare conexiune', 'Verificați conexiunea la server.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/crm/contacts/${contactId}`}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('editContact') || 'Editare Contact'}
          </h1>
          <p className="text-gray-500 mt-1">{form.name}</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            <User className="h-4 w-4 inline mr-2" />
            {t('contactName') || 'Nume Contact'} *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            <Mail className="h-4 w-4 inline mr-2" />
            {t('email') || 'Email'} *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            <Phone className="h-4 w-4 inline mr-2" />
            {t('phone') || 'Telefon'}
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Company */}
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
            <Building2 className="h-4 w-4 inline mr-2" />
            {t('company') || 'Companie'}
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={form.company}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Position */}
        <div>
          <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
            <Briefcase className="h-4 w-4 inline mr-2" />
            {t('position') || 'Poziție'}
          </label>
          <input
            type="text"
            id="position"
            name="position"
            value={form.position}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            {t('status') || 'Status'}
          </label>
          <select
            id="status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="LEAD">Lead</option>
            <option value="CUSTOMER">Client</option>
            <option value="PARTNER">Partener</option>
            <option value="INACTIVE">Inactiv</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            {t('notes') || 'Note'}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link
            href={`/dashboard/crm/contacts/${contactId}`}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            {t('cancel') || 'Anulează'}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('saving') || 'Se salvează...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t('saveChanges') || 'Salvează Modificările'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
