'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft, Edit, Trash2, Target, DollarSign, Calendar, Percent,
  Loader2, AlertCircle, User, Building2, Activity, Plus, CheckCircle,
  Phone, Mail, MessageSquare
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Deal {
  id: string;
  title: string;
  contactId: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactCompany?: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expectedCloseDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
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

export default function DealDetailPage() {
  const t = useTranslations('crm');
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeal();
  }, [dealId]);

  const fetchDeal = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [dealRes, activitiesRes] = await Promise.all([
        fetch(`${API_URL}/crm/deals/${dealId}`, { headers }),
        fetch(`${API_URL}/crm/activities?dealId=${dealId}`, { headers }),
      ]);

      if (dealRes.ok) {
        setDeal(await dealRes.json());
      } else if (dealRes.status === 404) {
        setError('Dealul nu a fost găsit');
      } else if (dealRes.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
      }

      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.activities || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch deal:', err);
      setError('Eroare de conexiune cu serverul');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    router.push(`/dashboard/crm/deals/${dealId}/delete`);
  };

  const handleDeleteConfirmed = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/crm/deals/${dealId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Deal șters', 'Dealul a fost șters cu succes.');
        router.push('/dashboard/crm?tab=pipeline');
      } else {
        toast.error('Eroare', 'Nu s-a putut șterge dealul.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Verificați conexiunea la server.');
    }
  };

  const handleUpdateStage = async (newStage: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/crm/deals/${dealId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: newStage }),
      });

      if (response.ok) {
        toast.success('Etapă actualizată', `Deal mutat în etapa ${newStage}`);
        fetchDeal();
      } else {
        toast.error('Eroare', 'Nu s-a putut actualiza etapa.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Verificați conexiunea la server.');
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'LEAD': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'QUALIFIED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PROPOSAL': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'NEGOTIATION': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'WON': return 'bg-green-100 text-green-800 border-green-300';
      case 'LOST': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      'LEAD': 'Lead', 'QUALIFIED': 'Calificat', 'PROPOSAL': 'Propunere',
      'NEGOTIATION': 'Negociere', 'WON': 'Câștigat', 'LOST': 'Pierdut'
    };
    return labels[stage] || stage;
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

  const stages = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error || 'Deal negăsit'}</p>
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
            <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
            <p className="text-gray-500">{deal.contactName || deal.contactCompany}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/crm/deals/${dealId}/edit`}
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

      {/* Stage Pipeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Etapă Pipeline</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {stages.filter(s => s !== 'LOST').map((stage, index) => (
            <button
              key={stage}
              onClick={() => handleUpdateStage(stage)}
              className={`flex-shrink-0 px-4 py-2 rounded-md border-2 font-medium text-sm transition-all ${
                deal.stage === stage
                  ? getStageColor(stage)
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {index + 1}. {getStageLabel(stage)}
            </button>
          ))}
        </div>
        {deal.stage !== 'WON' && deal.stage !== 'LOST' && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleUpdateStage('WON')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Marchează Câștigat
            </button>
            <button
              onClick={() => handleUpdateStage('LOST')}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              Marchează Pierdut
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Detalii Deal</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Valoare:</span>
                <span className="font-bold text-xl text-blue-600">{formatAmount(deal.value, deal.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Probabilitate:</span>
                <span className="font-medium">{deal.probability}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Data Estimată:</span>
                <span>{formatDate(deal.expectedCloseDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Creat:</span>
                <span>{formatDate(deal.createdAt)}</span>
              </div>
              <div className="pt-4 border-t">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStageColor(deal.stage)}`}>
                  {getStageLabel(deal.stage)}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Contact</h2>
            <div className="space-y-3">
              {deal.contactName && (
                <Link href={`/dashboard/crm/contacts/${deal.contactId}`} className="flex items-center gap-3 text-blue-600 hover:underline">
                  <User className="h-5 w-5" />
                  {deal.contactName}
                </Link>
              )}
              {deal.contactCompany && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Building2 className="h-5 w-5" />
                  {deal.contactCompany}
                </div>
              )}
              {deal.contactEmail && (
                <a href={`mailto:${deal.contactEmail}`} className="flex items-center gap-3 text-blue-600 hover:underline">
                  <Mail className="h-5 w-5" />
                  {deal.contactEmail}
                </a>
              )}
              {deal.contactPhone && (
                <a href={`tel:${deal.contactPhone}`} className="flex items-center gap-3 text-blue-600 hover:underline">
                  <Phone className="h-5 w-5" />
                  {deal.contactPhone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Activities & Notes */}
        <div className="lg:col-span-2 space-y-6">
          {deal.description && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Descriere</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{deal.description}</p>
            </div>
          )}

          {/* Activities */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Activități ({activities.length})
              </h2>
              <Link
                href={`/dashboard/crm/activities/new?dealId=${dealId}&contactId=${deal.contactId}`}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Adaugă
              </Link>
            </div>
            {activities.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nu există activități</p>
            ) : (
              <div className="space-y-3">
                {activities.map(activity => (
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="font-medium text-gray-900 mb-4">Acțiuni Rapide</h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/dashboard/crm/activities/new?type=CALL&dealId=${dealId}&contactId=${deal.contactId}`}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md"
              >
                <Phone className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Programează Apel</span>
              </Link>
              <Link
                href={`/dashboard/crm/activities/new?type=EMAIL&dealId=${dealId}&contactId=${deal.contactId}`}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md"
              >
                <Mail className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Trimite Email</span>
              </Link>
              <Link
                href={`/dashboard/crm/activities/new?type=MEETING&dealId=${dealId}&contactId=${deal.contactId}`}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md"
              >
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Programează Întâlnire</span>
              </Link>
              <Link
                href={`/dashboard/crm/activities/new?type=NOTE&dealId=${dealId}&contactId=${deal.contactId}`}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md"
              >
                <MessageSquare className="h-4 w-4 text-green-600" />
                <span className="text-sm">Adaugă Notă</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
