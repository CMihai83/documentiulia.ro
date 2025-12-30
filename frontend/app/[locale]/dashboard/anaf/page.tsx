'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileText,
  Send,
  Download,
  Eye,
  ArrowLeft,
  Shield,
  AlertCircle,
  Calendar,
  Zap
} from 'lucide-react';

interface ComplianceStatus {
  category: string;
  status: 'compliant' | 'warning' | 'error' | 'pending';
  lastCheck: string;
  nextCheck: string;
  details: string;
}

interface SubmissionStatus {
  id: string;
  type: 'SAF-T' | 'e-Factura' | 'VAT' | 'Payroll';
  period: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'pending';
  submittedAt: string;
  processedAt?: string;
  errorMessage?: string;
}

interface Deadline {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'upcoming' | 'due_soon' | 'overdue' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

export default function ANAFStatusPage() {
  const t = useTranslations('anaf');
  const [complianceStatuses, setComplianceStatuses] = useState<ComplianceStatus[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionStatus[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchANAFData();
  }, []);

  const fetchANAFData = async () => {
    setRefreshing(true);
    try {
      // Mock data - replace with actual API calls
      setComplianceStatuses([
        {
          category: 'SAF-T D406',
          status: 'compliant',
          lastCheck: '2025-12-24T10:00:00Z',
          nextCheck: '2026-01-31T23:59:59Z',
          details: 'Ultima declarație trimisă: 24 decembrie 2025'
        },
        {
          category: 'e-Factura',
          status: 'compliant',
          lastCheck: '2025-12-24T09:30:00Z',
          nextCheck: '2026-01-15T23:59:59Z',
          details: '35 facturi acceptate, 5 în procesare, 3 în așteptare'
        },
        {
          category: 'TVA Lunar',
          status: 'warning',
          lastCheck: '2025-12-20T14:00:00Z',
          nextCheck: '2026-01-25T23:59:59Z',
          details: 'Declarația pentru decembrie trebuie depusă până la 25 ianuarie'
        },
        {
          category: 'Declarații Salariale',
          status: 'compliant',
          lastCheck: '2025-12-23T16:00:00Z',
          nextCheck: '2026-01-15T23:59:59Z',
          details: 'D112 pentru decembrie 2025 depus cu succes'
        }
      ]);

      setSubmissions([
        {
          id: '1',
          type: 'SAF-T',
          period: 'decembrie 2025',
          status: 'accepted',
          submittedAt: '2025-12-24T10:00:00Z',
          processedAt: '2025-12-24T10:30:00Z'
        },
        {
          id: '2',
          type: 'e-Factura',
          period: 'decembrie 2025',
          status: 'submitted',
          submittedAt: '2025-12-24T09:30:00Z'
        },
        {
          id: '3',
          type: 'VAT',
          period: 'decembrie 2025',
          status: 'pending',
          submittedAt: '2025-12-20T14:00:00Z'
        }
      ]);

      setDeadlines([
        {
          id: '1',
          title: 'Declarație TVA 394',
          description: 'Declarație lunară TVA pentru decembrie 2025',
          dueDate: '2026-01-25T23:59:59Z',
          status: 'upcoming',
          priority: 'high'
        },
        {
          id: '2',
          title: 'SAF-T D406',
          description: 'Raport standard audit financiar decembrie 2025',
          dueDate: '2026-01-31T23:59:59Z',
          status: 'upcoming',
          priority: 'high'
        },
        {
          id: '3',
          title: 'Declarație 112',
          description: 'Declarație privind obligațiile de plată a contribuțiilor',
          dueDate: '2026-01-15T23:59:59Z',
          status: 'upcoming',
          priority: 'medium'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch ANAF data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return `Întârziat cu ${Math.abs(daysUntil)} zile`;
    } else if (daysUntil === 0) {
      return 'Astăzi';
    } else if (daysUntil === 1) {
      return 'Mâine';
    } else if (daysUntil <= 7) {
      return `În ${daysUntil} zile`;
    } else {
      return date.toLocaleDateString('ro-RO');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Înapoi la Dashboard
          </Link>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Status ANAF</h1>
          </div>
        </div>
        <button
          onClick={fetchANAFData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizează
        </button>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {complianceStatuses.map((status, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">{status.category}</h3>
              {getStatusIcon(status.status)}
            </div>
            <p className="text-xs text-gray-600 mb-2">{status.details}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Ultima verificare: {formatDate(status.lastCheck)}</span>
            </div>
            <div className="mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                {status.status === 'compliant' ? 'Conform' :
                 status.status === 'warning' ? 'Atenție' :
                 status.status === 'error' ? 'Eroare' : 'În așteptare'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Trimiteri Recente</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tip
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Perioadă
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trimis la
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{submission.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {submission.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                      {submission.status === 'accepted' ? 'Acceptat' :
                       submission.status === 'submitted' ? 'Trimis' :
                       submission.status === 'rejected' ? 'Respins' :
                       submission.status === 'pending' ? 'În așteptare' : submission.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(submission.submittedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      {submission.status === 'accepted' && (
                        <button className="text-green-600 hover:text-green-900">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Termene Limită</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {deadlines.map((deadline) => (
              <div key={deadline.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{deadline.title}</h3>
                    <p className="text-sm text-gray-600">{deadline.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatDueDate(deadline.dueDate)}</p>
                    <div className="flex space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(deadline.priority)}`}>
                        {deadline.priority === 'high' ? 'Înaltă' : deadline.priority === 'medium' ? 'Medie' : 'Scăzută'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deadline.status)}`}>
                        {deadline.status === 'upcoming' ? 'În așteptare' :
                         deadline.status === 'due_soon' ? 'În curând' :
                         deadline.status === 'overdue' ? 'Întârziat' : 'Finalizat'}
                      </span>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                    <Send className="w-4 h-4" />
                    Depune
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Acțiuni Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
            <FileText className="w-5 h-5" />
            Generează SAF-T
          </button>
          <button className="flex items-center justify-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
            <Send className="w-5 h-5" />
            Trimite e-Factură
          </button>
          <button className="flex items-center justify-center gap-2 p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100">
            <Download className="w-5 h-5" />
            Descarcă Declarații
          </button>
        </div>
      </div>
    </div>
  );
}