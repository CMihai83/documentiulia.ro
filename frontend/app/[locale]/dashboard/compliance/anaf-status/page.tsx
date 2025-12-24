'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Loader2,
  RefreshCw,
  Shield,
  TrendingUp,
  Bell,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  FileCheck,
  Users,
  Receipt,
  Building,
} from 'lucide-react';

interface ComplianceOverview {
  efactura: {
    pending: number;
    submitted: number;
    accepted: number;
    rejected: number;
  };
  saft: {
    lastSubmission: string | null;
    status: string;
    nextDeadline: string;
  };
  d112: {
    lastSubmission: string | null;
    currentPeriod: string;
    submitted: boolean;
  };
  d394: {
    lastSubmission: string | null;
    currentPeriod: string;
    submitted: boolean;
  };
  revisal: {
    pendingChanges: number;
    lastSubmission: string | null;
  };
}

interface Deadline {
  type: string;
  name: string;
  period?: string;
  deadline: string;
  daysRemaining: number;
  status: string;
  priority: string;
  pendingChanges?: number;
}

interface Submission {
  id: string;
  type: string;
  referenceId: string;
  status: string;
  submittedAt: string;
  errorMessage?: string;
}

export default function AnafStatusPage() {
  const t = useTranslations('compliance');
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [deadlines, setDeadlines] = useState<{ urgent: Deadline[]; upcoming: Deadline[] }>({ urgent: [], upcoming: [] });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [complianceScore, setComplianceScore] = useState(100);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [dashboardRes, deadlinesRes, submissionsRes] = await Promise.all([
        fetch('/api/v1/compliance/anaf-status/dashboard', { headers }),
        fetch('/api/v1/compliance/anaf-status/deadlines', { headers }),
        fetch('/api/v1/compliance/anaf-status/submissions?limit=10', { headers }),
      ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setOverview(data.overview);
        setComplianceScore(data.complianceScore || 100);
      }

      if (deadlinesRes.ok) {
        const data = await deadlinesRes.json();
        setDeadlines({ urgent: data.urgent || [], upcoming: data.upcoming || [] });
      }

      if (submissionsRes.ok) {
        const data = await submissionsRes.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error('Error fetching ANAF status:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      ERROR: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      EFACTURA: Receipt,
      SAFT: FileText,
      D112: Users,
      D394: TrendingUp,
      REVISAL: Building,
      D406: FileCheck,
    };
    return icons[type] || FileText;
  };

  const getTypeLink = (type: string) => {
    const links: Record<string, string> = {
      EFACTURA: '/dashboard/invoices',
      D112: '/dashboard/finance/d112',
      D394: '/dashboard/finance/d394',
      REVISAL: '/dashboard/compliance/revisal',
      SAFT: '/dashboard/finance/saft',
    };
    return links[type] || '#';
  };

  const handleRetrySubmission = async (submission: Submission) => {
    router.push(`/dashboard/compliance/submissions/${submission.id}/retry`);
  };

  const handleRetrySubmissionConfirmed = async (submissionId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/compliance/submissions/${submissionId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Depunere retrimisă', 'Depunerea a fost retrimisă cu succes!');
        fetchData();
      } else {
        toast.error('Eroare', 'Eroare la retrimiterea depunerii.');
      }
    } catch (err) {
      console.error('Retry error:', err);
      toast.error('Eroare', 'Eroare la retrimiterea depunerii.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Status ANAF</h1>
          <p className="text-gray-600">Monitorizare conformitate si depuneri ANAF</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizeaza
        </button>
      </div>

      {/* Compliance Score */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-sm p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-6 h-6" />
              <span className="text-lg font-medium">Scor Conformitate</span>
            </div>
            <p className="text-4xl font-bold">{complianceScore}%</p>
            <p className="text-primary-200 mt-1">
              {complianceScore >= 90 ? 'Excelent - toate obligatiile sunt la zi' :
               complianceScore >= 70 ? 'Bun - atentie la termenele apropiate' :
               'Necesita atentie - verificati termenele restante'}
            </p>
          </div>
          <div className="w-32 h-32 relative">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="white"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${complianceScore * 3.52} 352`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle className="w-10 h-10" />
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Deadlines */}
      {deadlines.urgent.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-800">Atentie! Termene urgente</span>
          </div>
          <div className="space-y-2">
            {deadlines.urgent.map((d, i) => (
              <Link
                key={i}
                href={getTypeLink(d.type)}
                className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-red-50 transition"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">{d.name}</p>
                    <p className="text-sm text-gray-500">
                      {d.period || ''} - Termen: {d.deadline}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                    {d.daysRemaining} zile
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Overview Cards */}
      {overview && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* e-Factura */}
          <Link href="/dashboard/invoices" className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <span className="font-medium">e-Factura</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Acceptate</span>
                <p className="font-semibold text-green-600">{overview.efactura.accepted}</p>
              </div>
              <div>
                <span className="text-gray-500">In asteptare</span>
                <p className="font-semibold text-yellow-600">{overview.efactura.pending}</p>
              </div>
              <div>
                <span className="text-gray-500">Trimise</span>
                <p className="font-semibold text-blue-600">{overview.efactura.submitted}</p>
              </div>
              <div>
                <span className="text-gray-500">Respinse</span>
                <p className="font-semibold text-red-600">{overview.efactura.rejected}</p>
              </div>
            </div>
          </Link>

          {/* D112 */}
          <Link href="/dashboard/finance/d112" className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="font-medium">D112</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Perioada curenta</p>
              <p className="font-semibold">{overview.d112.currentPeriod}</p>
              <div className="mt-2">
                {overview.d112.submitted ? (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Depus</span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Nedepus</span>
                )}
              </div>
            </div>
          </Link>

          {/* D394 */}
          <Link href="/dashboard/finance/d394" className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="font-medium">D394</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Perioada curenta</p>
              <p className="font-semibold">{overview.d394.currentPeriod}</p>
              <div className="mt-2">
                {overview.d394.submitted ? (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Depus</span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Nedepus</span>
                )}
              </div>
            </div>
          </Link>

          {/* REVISAL */}
          <Link href="/dashboard/compliance/revisal" className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-orange-600" />
                <span className="font-medium">REVISAL</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Modificari in asteptare</p>
              <p className="font-semibold">{overview.revisal.pendingChanges}</p>
              <div className="mt-2">
                {overview.revisal.pendingChanges > 0 ? (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Necesita atentie</span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">La zi</span>
                )}
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendar Obligatii
        </h3>
        <div className="space-y-3">
          {deadlines.upcoming.length === 0 && deadlines.urgent.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Toate obligatiile sunt la zi!</p>
          ) : (
            deadlines.upcoming.map((d, i) => (
              <Link
                key={i}
                href={getTypeLink(d.type)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{d.name}</p>
                    <p className="text-sm text-gray-500">Termen: {d.deadline}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    d.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    d.daysRemaining <= 7 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {d.status === 'COMPLETED' ? 'Completat' : `${d.daysRemaining} zile`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Depuneri Recente</h3>
        </div>
        <div className="divide-y">
          {submissions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nicio depunere recenta</p>
          ) : (
            submissions.map((sub, i) => {
              const Icon = getTypeIcon(sub.type);
              return (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sub.type}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(sub.submittedAt).toLocaleDateString('ro-RO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(sub.status)}`}>
                      {sub.status}
                    </span>
                    {sub.status === 'REJECTED' && (
                      <button onClick={() => handleRetrySubmission(sub)} className="p-1 hover:bg-gray-100 rounded" title="Reîncercați depunerea">
                        <RotateCcw className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4">
        <Link
          href="/dashboard/compliance/revisal"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition"
        >
          <div className="p-2 bg-orange-100 rounded-lg">
            <Building className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-medium">REVISAL</p>
            <p className="text-sm text-gray-500">Registru angajati</p>
          </div>
        </Link>

        <Link
          href="/dashboard/finance/d112"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition"
        >
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium">D112</p>
            <p className="text-sm text-gray-500">Contributii sociale</p>
          </div>
        </Link>

        <Link
          href="/dashboard/finance/d394"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition"
        >
          <div className="p-2 bg-green-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium">D394</p>
            <p className="text-sm text-gray-500">Declaratie TVA</p>
          </div>
        </Link>

        <Link
          href="/dashboard/saft"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition"
        >
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">SAF-T D406</p>
            <p className="text-sm text-gray-500">Raportare lunara</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
