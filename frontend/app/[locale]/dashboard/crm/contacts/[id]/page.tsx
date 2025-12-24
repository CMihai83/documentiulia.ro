'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft, Edit, Trash2, Mail, Phone, Building2, Briefcase,
  Calendar, Clock, MessageSquare, Target, Loader2, AlertCircle,
  Plus, Activity
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: 'LEAD' | 'CUSTOMER' | 'PARTNER' | 'INACTIVE';
  notes: string | null;
  createdAt: string;
  lastContactedAt: string | null;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
}

export default function ContactDetailPage() {
  const t = useTranslations('crm');
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContact();
  }, [contactId]);

  const fetchContact = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [contactRes, dealsRes, activitiesRes] = await Promise.all([
        fetch(`${API_URL}/crm/contacts/${contactId}`, { headers }),
        fetch(`${API_URL}/crm/deals?contactId=${contactId}`, { headers }),
        fetch(`${API_URL}/crm/activities?contactId=${contactId}`, { headers }),
      ]);

      if (contactRes.ok) {
        setContact(await contactRes.json());
      } else if (contactRes.status === 404) {
        setError('Contactul nu a fost găsit');
      } else if (contactRes.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
      }

      if (dealsRes.ok) {
        const data = await dealsRes.json();
        setDeals(data.deals || data || []);
      }

      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.activities || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch contact:', err);
      setError('Eroare de conexiune cu serverul');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    router.push(`/dashboard/crm/contacts/${contactId}/delete`);
  };

  const handleDeleteConfirmed = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/crm/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Contact șters', 'Contactul a fost șters cu succes.');
        router.push('/dashboard/crm?tab=contacts');
      } else {
        toast.error('Eroare', 'Nu s-a putut șterge contactul.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Verificați conexiunea la server.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CUSTOMER': return 'bg-green-100 text-green-800';
      case 'LEAD': return 'bg-yellow-100 text-yellow-800';
      case 'PARTNER': return 'bg-blue-100 text-blue-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'LEAD': 'Lead', 'CUSTOMER': 'Client', 'PARTNER': 'Partener', 'INACTIVE': 'Inactiv'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency', currency, minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error || 'Contact negăsit'}</p>
          </div>
          <Link href="/dashboard/crm" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Înapoi la CRM
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/crm" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
            <p className="text-gray-500">{contact.company || 'Fără companie'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/crm/contacts/${contactId}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Editează
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Șterge
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Informații Contact</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                  {contact.email}
                </a>
              </div>
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <span>{contact.company}</span>
                </div>
              )}
              {contact.position && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  <span>{contact.position}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contact.status)}`}>
                  {getStatusLabel(contact.status)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Detalii</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Creat la:</span>
                <span>{formatDate(contact.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ultimul contact:</span>
                <span>{formatDate(contact.lastContactedAt)}</span>
              </div>
            </div>
            {contact.notes && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Note</h3>
                <p className="text-sm text-gray-600">{contact.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Deals & Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deals */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Dealuri ({deals.length})
              </h2>
              <Link
                href={`/dashboard/crm/deals/new?contactId=${contactId}`}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Adaugă Deal
              </Link>
            </div>
            {deals.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nu există dealuri</p>
            ) : (
              <div className="space-y-3">
                {deals.map(deal => (
                  <Link
                    key={deal.id}
                    href={`/dashboard/crm/deals/${deal.id}`}
                    className="block p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{deal.title}</h3>
                        <p className="text-sm text-gray-500">{deal.stage}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600">{formatAmount(deal.value, deal.currency)}</p>
                        <p className="text-xs text-gray-500">{deal.probability}% probabilitate</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Activities */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Activități ({activities.length})
              </h2>
              <Link
                href={`/dashboard/crm/activities/new?contactId=${contactId}`}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Adaugă Activitate
              </Link>
            </div>
            {activities.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nu există activități</p>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map(activity => (
                  <div key={activity.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{activity.title}</h3>
                        <p className="text-sm text-gray-500">{activity.type}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        activity.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {activity.status === 'COMPLETED' ? 'Completat' : 'În așteptare'}
                      </span>
                    </div>
                    {activity.dueDate && (
                      <p className="text-xs text-gray-400 mt-2">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDate(activity.dueDate)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
