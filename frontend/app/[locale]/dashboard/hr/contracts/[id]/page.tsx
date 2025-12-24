'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft, Edit, Trash2, FileSignature, User, Calendar, DollarSign,
  Loader2, AlertCircle, Briefcase, Download, Send, Clock, CheckCircle,
  XCircle, Building2
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Contract {
  id: string;
  contractNumber: string;
  employeeId: string;
  employeeName?: string;
  type: string;
  status: string;
  position: string;
  department?: string;
  salary: number;
  currency: string;
  startDate: string;
  endDate?: string;
  workHours: number;
  probationPeriod?: number;
  notes?: string;
  revisalSubmittedAt?: string;
  revisalRef?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ContractDetailPage() {
  const t = useTranslations('hr');
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const contractId = params.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingRevisal, setSubmittingRevisal] = useState(false);

  useEffect(() => {
    fetchContract();
  }, [contractId]);

  const fetchContract = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr-contracts/${contractId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setContract(await response.json());
      } else if (response.status === 404) {
        setError('Contractul nu a fost găsit');
      } else if (response.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
      }
    } catch (err) {
      console.error('Failed to fetch contract:', err);
      setError('Eroare de conexiune cu serverul');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    // Navigate to delete confirmation page
    router.push(`/dashboard/hr/contracts/${contractId}/delete`);
  };

  const handleDeleteConfirmed = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr-contracts/${contractId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Contract șters', 'Contractul a fost șters cu succes.');
        router.push('/dashboard/hr?tab=contracts');
      } else {
        toast.error('Eroare', 'Nu s-a putut șterge contractul.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Verificați conexiunea la server.');
    }
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr-contracts/${contractId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract_${contract?.contractNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Descărcare completă', 'Contractul a fost descărcat.');
      } else {
        toast.error('Eroare', 'Nu s-a putut descărca contractul.');
      }
    } catch (err) {
      toast.error('Eroare descărcare', 'Verificați conexiunea la server.');
    }
  };

  const handleSubmitRevisal = async () => {
    // Navigate to REVISAL submission page
    router.push(`/dashboard/hr/contracts/${contractId}/revisal`);
  };

  const handleSubmitRevisalConfirmed = async () => {
    setSubmittingRevisal(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr-contracts/${contractId}/revisal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.compliance('REVISAL', 'Contractul a fost trimis către REVISAL cu succes.');
        fetchContract();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare REVISAL', errorData.message || 'Eroare la trimiterea către REVISAL');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Verificați conexiunea la server.');
    } finally {
      setSubmittingRevisal(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PENDING_SIGNATURE': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED': return 'bg-purple-100 text-purple-800';
      case 'TERMINATED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'ACTIVE': 'Activ', 'PENDING_SIGNATURE': 'Semnătură', 'DRAFT': 'Ciornă',
      'SUSPENDED': 'Suspendat', 'TERMINATED': 'Reziliat'
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'FULL_TIME': 'Normă Întreagă', 'PART_TIME': 'Timp Parțial',
      'FIXED_TERM': 'Perioadă Determinată', 'INDEFINITE': 'Perioadă Nedeterminată'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string | undefined) => {
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

  if (error || !contract) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error || 'Contract negăsit'}</p>
          </div>
          <Link href="/dashboard/hr?tab=contracts" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Înapoi la Contracte
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
          <Link href="/dashboard/hr?tab=contracts" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract {contract.contractNumber}</h1>
            <p className="text-gray-500">{contract.employeeName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Descarcă
          </button>
          <Link
            href={`/dashboard/hr/contracts/${contractId}/edit`}
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
        {/* Contract Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Detalii Contract</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Număr Contract</p>
                <p className="font-medium">{contract.contractNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tip Contract</p>
                <p className="font-medium">{getTypeLabel(contract.type)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Poziție</p>
                <p className="font-medium">{contract.position}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Departament</p>
                <p className="font-medium">{contract.department || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data Început</p>
                <p className="font-medium">{formatDate(contract.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data Sfârșit</p>
                <p className="font-medium">{formatDate(contract.endDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ore Lucru / Zi</p>
                <p className="font-medium">{contract.workHours} ore</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Perioadă Probă</p>
                <p className="font-medium">{contract.probationPeriod || 0} zile</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Salarizare</h2>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-green-600">Salariu Brut Lunar</p>
                <p className="text-2xl font-bold text-green-900">{formatAmount(contract.salary, contract.currency)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-400" />
            </div>
          </div>

          {contract.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Note / Clauze Speciale</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{contract.notes}</p>
            </div>
          )}
        </div>

        {/* Status & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status Contract:</span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(contract.status)}`}>
                  {getStatusLabel(contract.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Creat la:</span>
                <span>{formatDate(contract.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Actualizat:</span>
                <span>{formatDate(contract.updatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">REVISAL</h2>
            {contract.revisalSubmittedAt ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>Trimis către REVISAL</span>
                </div>
                <p className="text-sm text-gray-500">
                  Data: {formatDate(contract.revisalSubmittedAt)}
                </p>
                {contract.revisalRef && (
                  <p className="text-sm text-gray-500">
                    Ref: {contract.revisalRef}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-yellow-600">
                  <XCircle className="h-5 w-5" />
                  <span>Neînregistrat REVISAL</span>
                </div>
                <button
                  onClick={handleSubmitRevisal}
                  disabled={submittingRevisal}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingRevisal ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Trimite REVISAL
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Angajat</h2>
            <Link
              href={`/dashboard/hr/employees/${contract.employeeId}`}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <User className="h-8 w-8 text-gray-400" />
              <div>
                <p className="font-medium">{contract.employeeName}</p>
                <p className="text-sm text-gray-500">{contract.position}</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
