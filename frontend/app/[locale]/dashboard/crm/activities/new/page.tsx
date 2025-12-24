'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft, Save, Calendar, Phone, Mail, MessageSquare, CheckSquare,
  FileText, Loader2, AlertCircle, User, Target, Clock
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Contact {
  id: string;
  name: string;
  company: string | null;
}

interface Deal {
  id: string;
  title: string;
}

interface ActivityForm {
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE';
  title: string;
  description: string;
  contactId: string;
  dealId: string;
  dueDate: string;
  dueTime: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export default function NewActivityPage() {
  const t = useTranslations('crm');
  const router = useRouter();
  const searchParams = useSearchParams();

  const preselectedType = searchParams.get('type') as ActivityForm['type'] || 'TASK';
  const preselectedContactId = searchParams.get('contactId') || '';
  const preselectedDealId = searchParams.get('dealId') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState<ActivityForm>({
    type: preselectedType,
    title: '',
    description: '',
    contactId: preselectedContactId,
    dealId: preselectedDealId,
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '10:00',
    priority: 'MEDIUM',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [contactsRes, dealsRes] = await Promise.all([
        fetch(`${API_URL}/crm/contacts`, { headers }),
        fetch(`${API_URL}/crm/deals`, { headers }),
      ]);

      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.contacts || data || []);
      }

      if (dealsRes.ok) {
        const data = await dealsRes.json();
        setDeals(data.deals || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type: ActivityForm['type']) => {
    const titles: Record<string, string> = {
      'CALL': 'Apel telefonic',
      'EMAIL': 'Trimitere email',
      'MEETING': 'Întâlnire',
      'TASK': 'Sarcină de lucru',
      'NOTE': 'Notă',
    };
    setForm(prev => ({
      ...prev,
      type,
      title: prev.title || titles[type] || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const dueDateTime = form.dueDate && form.dueTime
        ? new Date(`${form.dueDate}T${form.dueTime}`).toISOString()
        : null;

      const response = await fetch(`${API_URL}/crm/activities`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          dueDate: dueDateTime,
        }),
      });

      if (response.ok) {
        // Navigate back to CRM or contact/deal page
        if (preselectedDealId) {
          router.push(`/dashboard/crm/deals/${preselectedDealId}`);
        } else if (preselectedContactId) {
          router.push(`/dashboard/crm/contacts/${preselectedContactId}`);
        } else {
          router.push('/dashboard/crm?tab=activities');
        }
      } else if (response.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Eroare la crearea activității');
      }
    } catch (err) {
      console.error('Failed to create activity:', err);
      setError('Eroare de conexiune cu serverul');
    } finally {
      setLoading(false);
    }
  };

  const activityTypes = [
    { value: 'CALL', label: 'Apel', icon: Phone, color: 'text-orange-600 bg-orange-100' },
    { value: 'EMAIL', label: 'Email', icon: Mail, color: 'text-purple-600 bg-purple-100' },
    { value: 'MEETING', label: 'Întâlnire', icon: Calendar, color: 'text-blue-600 bg-blue-100' },
    { value: 'TASK', label: 'Sarcină', icon: CheckSquare, color: 'text-green-600 bg-green-100' },
    { value: 'NOTE', label: 'Notă', icon: FileText, color: 'text-gray-600 bg-gray-100' },
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
            Activitate Nouă
          </h1>
          <p className="text-gray-500 mt-1">
            Programați o nouă activitate CRM
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
        {/* Activity Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tip Activitate
          </label>
          <div className="grid grid-cols-5 gap-2">
            {activityTypes.map(type => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value as ActivityForm['type'])}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    form.type === type.value
                      ? `${type.color} border-current`
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Titlu *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={form.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Descriere scurtă a activității"
          />
        </div>

        {/* Contact & Deal */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactId" className="block text-sm font-medium text-gray-700 mb-1">
              <User className="h-4 w-4 inline mr-2" />
              Contact
            </label>
            {loadingData ? (
              <div className="flex items-center gap-2 text-gray-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Se încarcă...
              </div>
            ) : (
              <select
                id="contactId"
                name="contactId"
                value={form.contactId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selectați contact</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="dealId" className="block text-sm font-medium text-gray-700 mb-1">
              <Target className="h-4 w-4 inline mr-2" />
              Deal (opțional)
            </label>
            {loadingData ? (
              <div className="flex items-center gap-2 text-gray-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Se încarcă...
              </div>
            ) : (
              <select
                id="dealId"
                name="dealId"
                value={form.dealId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selectați deal</option>
                {deals.map(deal => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Due Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-2" />
              Data
            </label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="h-4 w-4 inline mr-2" />
              Ora
            </label>
            <input
              type="time"
              id="dueTime"
              name="dueTime"
              value={form.dueTime}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Prioritate
          </label>
          <select
            id="priority"
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="LOW">Scăzută</option>
            <option value="MEDIUM">Medie</option>
            <option value="HIGH">Ridicată</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descriere / Note
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Detalii suplimentare despre activitate..."
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
                Salvează Activitate
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
