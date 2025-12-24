'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Upload, CheckCircle, XCircle, Clock, Loader2, RefreshCw, AlertCircle, Calendar, Shield, Info } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface GracePeriodStatus {
  isInGracePeriod: boolean;
  isPilotPhase: boolean;
  daysRemaining: number;
  phaseLabel: string;
  startDate: Date;
  endDate: Date;
}

interface SAFTReport {
  id: string;
  period: string;
  reportType: string;
  status: 'DRAFT' | 'VALIDATING' | 'VALIDATED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  validated: boolean;
  validatedAt: string | null;
  submittedAt: string | null;
  spvRef: string | null;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function SAFTPage() {
  const t = useTranslations('saft');
  const toast = useToast();
  const [reports, setReports] = useState<SAFTReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [gracePeriod, setGracePeriod] = useState<GracePeriodStatus | null>(null);

  // SAF-T D406 Grace Period Calculation (Order 1783/2021)
  // Pilot phase: Sept 2025 - Aug 2026 with 6-month grace period
  const calculateGracePeriod = useCallback((): GracePeriodStatus => {
    const today = new Date();
    const pilotStart = new Date('2025-09-01');
    const pilotEnd = new Date('2026-08-31');
    const graceEnd = new Date('2027-02-28'); // 6 months after pilot

    let status: GracePeriodStatus;

    if (today < pilotStart) {
      // Before pilot phase
      const daysUntilPilot = Math.ceil((pilotStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      status = {
        isInGracePeriod: false,
        isPilotPhase: false,
        daysRemaining: daysUntilPilot,
        phaseLabel: 'Pre-pilot',
        startDate: pilotStart,
        endDate: pilotEnd,
      };
    } else if (today >= pilotStart && today <= pilotEnd) {
      // In pilot phase
      const daysRemaining = Math.ceil((pilotEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      status = {
        isInGracePeriod: true,
        isPilotPhase: true,
        daysRemaining,
        phaseLabel: 'Perioada pilot',
        startDate: pilotStart,
        endDate: pilotEnd,
      };
    } else if (today > pilotEnd && today <= graceEnd) {
      // In grace period after pilot
      const daysRemaining = Math.ceil((graceEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      status = {
        isInGracePeriod: true,
        isPilotPhase: false,
        daysRemaining,
        phaseLabel: 'Perioadă de grație',
        startDate: pilotEnd,
        endDate: graceEnd,
      };
    } else {
      // After grace period - mandatory
      status = {
        isInGracePeriod: false,
        isPilotPhase: false,
        daysRemaining: 0,
        phaseLabel: 'Obligatoriu',
        startDate: graceEnd,
        endDate: new Date('2099-12-31'),
      };
    }

    return status;
  }, []);

  // Mock data for demo mode
  const getMockReports = (): SAFTReport[] => {
    const now = new Date();
    return [
      {
        id: 'saft-001',
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        reportType: 'D406',
        status: 'VALIDATED',
        validated: true,
        validatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        submittedAt: null,
        spvRef: null,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'saft-002',
        period: `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0') || '12'}`,
        reportType: 'D406',
        status: 'ACCEPTED',
        validated: true,
        validatedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        submittedAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        spvRef: 'SPV-2024-D406-' + Math.random().toString(36).substring(7).toUpperCase(),
        createdAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'saft-003',
        period: `${now.getFullYear()}-${String(now.getMonth() - 1 > 0 ? now.getMonth() - 1 : 11).padStart(2, '0')}`,
        reportType: 'D406',
        status: 'ACCEPTED',
        validated: true,
        validatedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        submittedAt: new Date(now.getTime() - 58 * 24 * 60 * 60 * 1000).toISOString(),
        spvRef: 'SPV-2024-D406-' + Math.random().toString(36).substring(7).toUpperCase(),
        createdAt: new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  };

  function getCurrentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function getPeriodOptions() {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });
      options.push({ value: period, label });
    }
    return options;
  }

  useEffect(() => {
    fetchReports();
    setGracePeriod(calculateGracePeriod());
  }, [calculateGracePeriod]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/saft`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data || []);
      } else if (response.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
      } else {
        // Fallback to mock data for demo
        console.log('Using mock SAF-T data for demo');
        setReports(getMockReports());
      }
    } catch (err) {
      console.error('Failed to fetch SAF-T reports:', err);
      // Fallback to mock data on error
      setReports(getMockReports());
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/saft-d406/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period: selectedPeriod }),
      });

      if (response.ok) {
        toast.success('SAF-T generat', 'Raportul D406 a fost generat cu succes.');
        await fetchReports();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare', errorData.message || 'Eroare la generarea raportului');
      }
    } catch (err) {
      console.error('Failed to generate SAF-T report:', err);
      toast.error('Eroare conexiune', 'Nu s-a putut genera raportul SAF-T.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/saft-d406/download/${reportId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saft-d406-${reportId}.xml`;
        a.click();
        toast.success('Descărcare completă', 'Raportul SAF-T XML a fost descărcat.');
      } else {
        toast.error('Eroare', 'Eroare la descărcarea raportului');
      }
    } catch (err) {
      console.error('Failed to download report:', err);
      toast.error('Eroare conexiune', 'Nu s-a putut descărca raportul.');
    }
  };

  const submitToSPV = async (reportId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/saft-d406/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        toast.compliance('SAF-T D406', 'Raportul a fost trimis către SPV ANAF.');
        await fetchReports();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare SPV', errorData.message || 'Eroare la trimiterea către SPV');
      }
    } catch (err) {
      console.error('Failed to submit to SPV:', err);
      toast.error('Eroare conexiune', 'Nu s-a putut trimite raportul.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'SUBMITTED':
      case 'VALIDATING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'VALIDATED':
        return 'bg-blue-100 text-blue-800';
      case 'SUBMITTED':
        return 'bg-indigo-100 text-indigo-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'VALIDATING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });
  };

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Eroare</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={() => { setError(null); setLoading(true); fetchReports(); }}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Încearcă din nou
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title') || 'SAF-T D406'}</h1>
          <p className="text-gray-500 mt-1">
            {t('subtitle') || 'Rapoarte SAF-T conform Ordinului ANAF 1783/2021'}
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="p-2 text-gray-500 hover:text-gray-700"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Grace Period Status Banner */}
      {gracePeriod && (
        <div className={`rounded-lg p-4 border-l-4 ${
          gracePeriod.isInGracePeriod
            ? 'bg-green-50 border-green-500'
            : gracePeriod.phaseLabel === 'Pre-pilot'
            ? 'bg-yellow-50 border-yellow-500'
            : 'bg-red-50 border-red-500'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {gracePeriod.isInGracePeriod ? (
                <Shield className={`h-6 w-6 ${gracePeriod.isPilotPhase ? 'text-green-600' : 'text-green-500'}`} />
              ) : gracePeriod.phaseLabel === 'Pre-pilot' ? (
                <Calendar className="h-6 w-6 text-yellow-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${
                  gracePeriod.isInGracePeriod
                    ? 'text-green-800'
                    : gracePeriod.phaseLabel === 'Pre-pilot'
                    ? 'text-yellow-800'
                    : 'text-red-800'
                }`}>
                  SAF-T D406: {gracePeriod.phaseLabel}
                </h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  gracePeriod.isInGracePeriod
                    ? 'bg-green-200 text-green-800'
                    : gracePeriod.phaseLabel === 'Pre-pilot'
                    ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-red-200 text-red-800'
                }`}>
                  Ordinul 1783/2021
                </span>
              </div>
              <p className={`mt-1 text-sm ${
                gracePeriod.isInGracePeriod
                  ? 'text-green-700'
                  : gracePeriod.phaseLabel === 'Pre-pilot'
                  ? 'text-yellow-700'
                  : 'text-red-700'
              }`}>
                {gracePeriod.phaseLabel === 'Pre-pilot' && (
                  <>Perioada pilot începe pe 1 septembrie 2025. <strong>{gracePeriod.daysRemaining} zile</strong> până la începerea fazei pilot.</>
                )}
                {gracePeriod.isPilotPhase && (
                  <>Sunteți în perioada pilot (sept 2025 - aug 2026). Neconformitățile nu vor fi sancționate. <strong>{gracePeriod.daysRemaining} zile</strong> rămase în faza pilot.</>
                )}
                {gracePeriod.phaseLabel === 'Perioadă de grație' && (
                  <>Perioada de grație de 6 luni după pilot. <strong>{gracePeriod.daysRemaining} zile</strong> rămase până la aplicarea sancțiunilor.</>
                )}
                {gracePeriod.phaseLabel === 'Obligatoriu' && (
                  <>Raportarea SAF-T D406 este obligatorie. Neconformitățile pot atrage sancțiuni conform legislației în vigoare.</>
                )}
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className={gracePeriod.isInGracePeriod ? 'text-green-600' : gracePeriod.phaseLabel === 'Pre-pilot' ? 'text-yellow-600' : 'text-red-600'}>
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Pilot: Sept 2025 - Aug 2026
                </span>
                <span className={gracePeriod.isInGracePeriod ? 'text-green-600' : gracePeriod.phaseLabel === 'Pre-pilot' ? 'text-yellow-600' : 'text-red-600'}>
                  <Shield className="h-3 w-3 inline mr-1" />
                  Grație: +6 luni
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              {t('infoTitle') || 'Despre SAF-T D406'}
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('info1') || 'Obligatoriu pentru contribuabilii mari din ianuarie 2025'}</li>
                <li>{t('info2') || 'Raportare lunară în format XML standardizat OECD'}</li>
                <li>{t('info3') || 'Perioada pilot: sept 2025 - aug 2026 cu grație 6 luni'}</li>
                <li>Validare automată XML cu DUKIntegrator înainte de trimitere</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Generate New Report */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {t('generateTitle') || 'Genereaza Raport SAF-T'}
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('period') || 'Perioada'}
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {getPeriodOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={generateReport}
            disabled={generating}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {t('generating') || 'Se genereaza...'}
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 mr-2" />
                {t('generate') || 'Genereaza D406'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {t('reportsTitle') || 'Rapoarte Generate'}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500">{t('loading') || 'Se incarca...'}</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>{t('noReports') || 'Nu exista rapoarte SAF-T generate'}</p>
            <p className="text-sm mt-2">{t('noReportsHint') || 'Selectati o perioada si generati primul raport'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('periodColumn') || 'Perioada'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('typeColumn') || 'Tip'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('statusColumn') || 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('createdColumn') || 'Creat'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('submittedColumn') || 'Trimis'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actionsColumn') || 'Actiuni'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(report.status)}
                        <span className="ml-2 font-medium text-gray-900">
                          {formatPeriod(report.period)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.reportType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.submittedAt)}
                      {report.spvRef && (
                        <div className="text-xs text-gray-400">Ref: {report.spvRef}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => downloadReport(report.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('download') || 'Descarca'}
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        {report.status === 'VALIDATED' && (
                          <button
                            onClick={() => submitToSPV(report.id)}
                            className="text-green-600 hover:text-green-900"
                            title={t('submitSPV') || 'Trimite la SPV'}
                          >
                            <Upload className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
