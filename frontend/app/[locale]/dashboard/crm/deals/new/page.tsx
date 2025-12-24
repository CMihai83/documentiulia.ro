'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft, Save, Target, DollarSign, Calendar, Percent,
  Loader2, AlertCircle, User
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Contact {
  id: string;
  name: string;
  company: string | null;
}

interface DealForm {
  title: string;
  contactId: string;
  value: number;
  currency: string;
  stage: 'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  probability: number;
  expectedCloseDate: string;
  description: string;
}

export default function NewDealPage() {
  const t = useTranslations('crm');
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedContactId = searchParams.get('contactId');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  const [form, setForm] = useState<DealForm>({
    title: '',
    contactId: preselectedContactId || '',
    value: 0,
    currency: 'RON',
    stage: 'LEAD',
    probability: 20,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/crm/contacts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleStageChange = (stage: string) => {
    const probabilities: Record<string, number> = {
      'LEAD': 20, 'QUALIFIED': 40, 'PROPOSAL': 60, 'NEGOTIATION': 80, 'WON': 100, 'LOST': 0
    };
    setForm(prev => ({
      ...prev,
      stage: stage as DealForm['stage'],
      probability: probabilities[stage] || prev.probability
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/crm/deals`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/crm/deals/${data.id}`);
      } else if (response.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Eroare la crearea dealului');
      }
    } catch (err) {
      console.error('Failed to create deal:', err);
      setError('Eroare de conexiune cu serverul');
    } finally {
      setLoading(false);
    }
  };

  const stages = [
    { value: 'LEAD', label: 'Lead', color: 'bg-gray-100 border-gray-300' },
    { value: 'QUALIFIED', label: 'Calificat', color: 'bg-blue-100 border-blue-300' },
    { value: 'PROPOSAL', label: 'Propunere', color: 'bg-yellow-100 border-yellow-300' },
    { value: 'NEGOTIATION', label: 'Negociere', color: 'bg-purple-100 border-purple-300' },
    { value: 'WON', label: 'Câștigat', color: 'bg-green-100 border-green-300' },
    { value: 'LOST', label: 'Pierdut', color: 'bg-red-100 border-red-300' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/crm" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('newDeal') || 'Deal Nou'}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('newDealDescription') || 'Adăugați o nouă oportunitate de vânzare'}
          </p>
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
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            <Target className="h-4 w-4 inline mr-2" />
            Titlu Deal *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={form.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Implementare ERP - Client"
          />
        </div>

        {/* Contact */}
        <div>
          <label htmlFor="contactId" className="block text-sm font-medium text-gray-700 mb-1">
            <User className="h-4 w-4 inline mr-2" />
            Contact *
          </label>
          {loadingContacts ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Se încarcă contactele...
            </div>
          ) : (
            <select
              id="contactId"
              name="contactId"
              required
              value={form.contactId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selectați un contact</option>
              {contacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.name} {contact.company && `(${contact.company})`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Value & Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="h-4 w-4 inline mr-2" />
              Valoare *
            </label>
            <input
              type="number"
              id="value"
              name="value"
              required
              min="0"
              step="0.01"
              value={form.value}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Monedă
            </label>
            <select
              id="currency"
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {/* Stage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Etapă
          </label>
          <div className="grid grid-cols-3 gap-2">
            {stages.map(stage => (
              <button
                key={stage.value}
                type="button"
                onClick={() => handleStageChange(stage.value)}
                className={`px-3 py-2 text-sm font-medium rounded-md border-2 transition-colors ${
                  form.stage === stage.value
                    ? `${stage.color} border-current`
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>

        {/* Probability & Expected Close */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="probability" className="block text-sm font-medium text-gray-700 mb-1">
              <Percent className="h-4 w-4 inline mr-2" />
              Probabilitate (%)
            </label>
            <input
              type="number"
              id="probability"
              name="probability"
              min="0"
              max="100"
              value={form.probability}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="expectedCloseDate" className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-2" />
              Data Estimată Închidere
            </label>
            <input
              type="date"
              id="expectedCloseDate"
              name="expectedCloseDate"
              value={form.expectedCloseDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descriere
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Detalii despre oportunitate..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link href="/dashboard/crm" className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Anulează
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Se salvează...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvează Deal
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
