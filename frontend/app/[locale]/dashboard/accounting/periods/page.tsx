'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  Calendar,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileText,
  Loader2,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

interface AccountingPeriod {
  id: string;
  period: string;
  year: number;
  month: number;
  status: 'OPEN' | 'CLOSING' | 'CLOSED' | 'LOCKED';
  closedAt?: string;
  closedBy?: string;
  lockedAt?: string;
  reopenedCount: number;
  validationErrors: string[];
  closingChecklist: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'passed' | 'failed' | 'warning';
  message?: string;
  required: boolean;
}

interface PeriodSummary {
  totalInvoices: number;
  totalPayments: number;
  totalJournalEntries: number;
  revenue: number;
  expenses: number;
  netIncome: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checklist: ChecklistItem[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function PeriodClosingPage() {
  const router = useRouter();
  const toast = useToast();
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [periodDetails, setPeriodDetails] = useState<{
    period: AccountingPeriod;
    summary: PeriodSummary;
    validation: ValidationResult;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => localStorage.getItem('user_id') || 'demo-user';

  const fetchPeriods = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();
      const year = new Date().getFullYear();

      const response = await fetch(`${API_URL}/accounting/periods/${userId}?year=${year}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPeriods(data);

        // Auto-select previous month if not selected
        if (!selectedPeriod && data.length > 0) {
          const now = new Date();
          const prevPeriod = now.getMonth() === 0
            ? `${now.getFullYear() - 1}-12`
            : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
          setSelectedPeriod(prevPeriod);
        }
      }
    } catch (err) {
      console.error('Failed to fetch periods:', err);
      setError('Eroare la incarcarea perioadelor');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  const fetchPeriodDetails = useCallback(async (period: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();

      const response = await fetch(`${API_URL}/accounting/periods/${userId}/${period}/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPeriodDetails(data);
      }
    } catch (err) {
      console.error('Failed to fetch period details:', err);
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPeriodDetails(selectedPeriod);
    }
  }, [selectedPeriod, fetchPeriodDetails]);

  const handleClosePeriod = async () => {
    router.push(`/dashboard/accounting/periods/${selectedPeriod}/close`);
  };

  const handleClosePeriodConfirmed = async () => {
    setActionLoading('close');
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();

      const response = await fetch(`${API_URL}/accounting/periods/${userId}/${selectedPeriod}/close`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ closedBy: userId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Perioada închisă', 'Perioada a fost închisă cu succes!');
        await fetchPeriods();
        await fetchPeriodDetails(selectedPeriod);
      } else {
        toast.error('Eroare', result.errors?.join(', ') || 'Închiderea a eșuat');
      }
    } catch (err) {
      console.error('Close error:', err);
      toast.error('Eroare', 'Eroare la închiderea perioadei');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLockPeriod = async () => {
    router.push(`/dashboard/accounting/periods/${selectedPeriod}/lock`);
  };

  const handleLockPeriodConfirmed = async () => {
    setActionLoading('lock');
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();

      const response = await fetch(`${API_URL}/accounting/periods/${userId}/${selectedPeriod}/lock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Perioada blocată', 'Perioada a fost blocată!');
        await fetchPeriods();
        await fetchPeriodDetails(selectedPeriod);
      } else {
        const result = await response.json();
        toast.error('Eroare', result.message || 'Blocarea a eșuat');
      }
    } catch (err) {
      console.error('Lock error:', err);
      toast.error('Eroare', 'Eroare la blocarea perioadei');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopenPeriod = async () => {
    router.push(`/dashboard/accounting/periods/${selectedPeriod}/reopen`);
  };

  const handleReopenPeriodConfirmed = async (reason: string) => {
    setActionLoading('reopen');
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();

      const response = await fetch(`${API_URL}/accounting/periods/${userId}/${selectedPeriod}/reopen`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        toast.success('Perioada redeschisă', 'Perioada a fost redeschisă!');
        await fetchPeriods();
        await fetchPeriodDetails(selectedPeriod);
      } else {
        const result = await response.json();
        toast.error('Eroare', result.message || 'Redeschiderea a eșuat');
      }
    } catch (err) {
      console.error('Reopen error:', err);
      toast.error('Eroare', 'Eroare la redeschiderea perioadei');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'LOCKED': return <Lock className="h-5 w-5 text-red-500" />;
      case 'CLOSED': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'CLOSING': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <Unlock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LOCKED': return 'bg-red-100 text-red-800';
      case 'CLOSED': return 'bg-green-100 text-green-800';
      case 'CLOSING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getChecklistIcon = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatAmount = (amount: number) =>
    `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`;

  const formatMonth = (period: string) => {
    const [year, month] = period.split('-');
    const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Se incarca perioadele...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inchidere Perioade Contabile</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestionare si inchidere perioade lunare
          </p>
        </div>
        <button
          onClick={() => fetchPeriods()}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizeaza
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Period List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Perioade {new Date().getFullYear()}
          </h2>
          <div className="space-y-2">
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              const period = `${new Date().getFullYear()}-${String(month).padStart(2, '0')}`;
              const periodData = periods.find(p => p.period === period);
              const status = periodData?.status || 'OPEN';
              const isSelected = selectedPeriod === period;
              const isFuture = new Date(new Date().getFullYear(), month - 1, 1) > new Date();

              return (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  disabled={isFuture}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : isFuture
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status)}
                    <span className="font-medium">{formatMonth(period)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Period Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPeriod && periodDetails ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Venituri</p>
                  <p className="text-2xl font-semibold text-green-900">
                    {formatAmount(periodDetails.summary.revenue)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600">Cheltuieli</p>
                  <p className="text-2xl font-semibold text-red-900">
                    {formatAmount(periodDetails.summary.expenses)}
                  </p>
                </div>
                <div className={`rounded-lg p-4 ${periodDetails.summary.netIncome >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                  <p className={`text-sm ${periodDetails.summary.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    Rezultat Net
                  </p>
                  <p className={`text-2xl font-semibold ${periodDetails.summary.netIncome >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                    {formatAmount(periodDetails.summary.netIncome)}
                  </p>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Perioada {formatMonth(selectedPeriod)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(periodDetails.period.status)}
                      <span className={`px-2 py-1 text-sm font-medium rounded-full ${getStatusColor(periodDetails.period.status)}`}>
                        {periodDetails.period.status}
                      </span>
                      {periodDetails.period.closedAt && (
                        <span className="text-sm text-gray-500">
                          Inchisa: {new Date(periodDetails.period.closedAt).toLocaleDateString('ro-RO')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {periodDetails.period.status === 'OPEN' && (
                      <button
                        onClick={handleClosePeriod}
                        disabled={actionLoading === 'close' || !periodDetails.validation.valid}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {actionLoading === 'close' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Inchide Perioada
                      </button>
                    )}
                    {periodDetails.period.status === 'CLOSED' && (
                      <>
                        <button
                          onClick={handleReopenPeriod}
                          disabled={actionLoading === 'reopen'}
                          className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {actionLoading === 'reopen' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                          Redeschide
                        </button>
                        <button
                          onClick={handleLockPeriod}
                          disabled={actionLoading === 'lock'}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {actionLoading === 'lock' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                          Blocheaza
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{periodDetails.summary.totalInvoices}</p>
                    <p className="text-sm text-gray-500">Facturi</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{periodDetails.summary.totalPayments}</p>
                    <p className="text-sm text-gray-500">Plati</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{periodDetails.summary.totalJournalEntries}</p>
                    <p className="text-sm text-gray-500">Inregistrari</p>
                  </div>
                </div>
              </div>

              {/* Validation Checklist */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  Lista de Verificare pentru Inchidere
                </h3>

                {/* Validation Status */}
                <div className={`p-4 rounded-lg mb-4 ${periodDetails.validation.valid ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2">
                    {periodDetails.validation.valid ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-medium ${periodDetails.validation.valid ? 'text-green-800' : 'text-red-800'}`}>
                      {periodDetails.validation.valid ? 'Pregatit pentru inchidere' : 'Nu poate fi inchis - erori de validare'}
                    </span>
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="space-y-3">
                  {periodDetails.validation.checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        item.status === 'passed' ? 'border-green-200 bg-green-50' :
                        item.status === 'failed' ? 'border-red-200 bg-red-50' :
                        item.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        'border-gray-200'
                      }`}
                    >
                      {getChecklistIcon(item.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          {item.required && (
                            <span className="text-xs text-red-600 font-medium">OBLIGATORIU</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        {item.message && (
                          <p className={`text-sm mt-1 ${
                            item.status === 'failed' ? 'text-red-600' :
                            item.status === 'warning' ? 'text-yellow-600' :
                            'text-gray-500'
                          }`}>
                            {item.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Errors & Warnings */}
                {periodDetails.validation.errors.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">Erori</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {periodDetails.validation.errors.map((err, i) => (
                        <li key={i} className="text-sm text-red-700">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {periodDetails.validation.warnings.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">Avertismente</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {periodDetails.validation.warnings.map((warn, i) => (
                        <li key={i} className="text-sm text-yellow-700">{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Selectati o perioada pentru a vedea detaliile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
