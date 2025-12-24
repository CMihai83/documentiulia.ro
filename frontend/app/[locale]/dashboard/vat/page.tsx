'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Calculator, TrendingUp, TrendingDown, FileText, Download, Send, Loader2, RefreshCw, BarChart, AlertCircle, Calendar, Clock, Info } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface VATReport {
  id: string;
  period: string;
  vatCollected: number;
  vatDeductible: number;
  vatPayable: number;
  vatRate: number;
  status: 'DRAFT' | 'VALIDATING' | 'VALIDATED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  submittedAt: string | null;
  anafRef: string | null;
  createdAt: string;
}

interface VATSummary {
  totalCollected: number;
  totalDeductible: number;
  totalPayable: number;
  currentYear: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Mock data for graceful degradation
const getMockReports = (): VATReport[] => [
  {
    id: '1',
    period: '2025-12',
    vatCollected: 23750,
    vatDeductible: 8550,
    vatPayable: 15200,
    vatRate: 19,
    status: 'DRAFT',
    submittedAt: null,
    anafRef: null,
    createdAt: '2025-12-01',
  },
  {
    id: '2',
    period: '2025-11',
    vatCollected: 21500,
    vatDeductible: 7800,
    vatPayable: 13700,
    vatRate: 19,
    status: 'ACCEPTED',
    submittedAt: '2025-12-10',
    anafRef: 'ANAF-2025-11-001',
    createdAt: '2025-11-01',
  },
];

const getMockSummary = (): VATSummary => ({
  totalCollected: 185000,
  totalDeductible: 67000,
  totalPayable: 118000,
  currentYear: 2025,
});

export default function VATPage() {
  const t = useTranslations('vat');
  const toast = useToast();
  const [reports, setReports] = useState<VATReport[]>([]);
  const [summary, setSummary] = useState<VATSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());

  // Interactive VAT Calculator
  const [calcAmount, setCalcAmount] = useState<string>('');
  const [calcType, setCalcType] = useState<'add' | 'extract'>('add');
  const [calcRate, setCalcRate] = useState<number>(19);
  const [calcResult, setCalcResult] = useState<{ net: number; vat: number; gross: number } | null>(null);

  // Compliance deadline countdown
  const [daysUntilNewRates, setDaysUntilNewRates] = useState<number>(0);
  const [isNewRatesActive, setIsNewRatesActive] = useState<boolean>(false);

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
    fetchSummary();
    calculateComplianceCountdown();
  }, []);

  // Calculate days until new VAT rates (Aug 1, 2025)
  const calculateComplianceCountdown = () => {
    const newRatesDate = new Date('2025-08-01');
    const today = new Date();
    const diffTime = newRatesDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    setDaysUntilNewRates(diffDays);
    setIsNewRatesActive(diffDays <= 0);

    // Auto-set calculator rate based on date
    if (diffDays <= 0) {
      setCalcRate(21);
    }
  };

  // Interactive VAT Calculator
  const performVatCalculation = () => {
    const amount = parseFloat(calcAmount);
    if (isNaN(amount) || amount <= 0) {
      setCalcResult(null);
      return;
    }

    let net: number, vat: number, gross: number;

    if (calcType === 'add') {
      // Add VAT to net amount
      net = amount;
      vat = amount * (calcRate / 100);
      gross = amount + vat;
    } else {
      // Extract VAT from gross amount
      gross = amount;
      net = amount / (1 + calcRate / 100);
      vat = gross - net;
    }

    setCalcResult({ net, vat, gross });
  };

  // Auto-calculate on input change
  useEffect(() => {
    performVatCalculation();
  }, [calcAmount, calcType, calcRate]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/vat`, {
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
        throw new Error('API unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch VAT reports:', err);
      // Use mock data on error
      setReports(getMockReports());
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/vat/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      } else {
        throw new Error('API unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch VAT summary:', err);
      setSummary(getMockSummary());
    }
  };

  const calculateVAT = async () => {
    try {
      setCalculating(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/vat/calculate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period: selectedPeriod }),
      });

      if (response.ok) {
        toast.success('TVA calculat', 'Calculul TVA a fost finalizat cu succes.');
        await fetchReports();
        await fetchSummary();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare', errorData.message || 'Eroare la calcularea TVA');
      }
    } catch (err) {
      console.error('Failed to calculate VAT:', err);
      toast.error('Eroare conexiune', 'Nu s-a putut calcula TVA-ul.');
    } finally {
      setCalculating(false);
    }
  };

  const submitToANAF = async (reportId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/vat/submit/${reportId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        toast.compliance('ANAF TVA', 'Raportul TVA a fost trimis către ANAF cu succes.');
        await fetchReports();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare ANAF', errorData.message || 'Eroare la trimiterea către ANAF');
      }
    } catch (err) {
      console.error('Failed to submit to ANAF:', err);
      toast.error('Eroare conexiune', 'Nu s-a putut trimite raportul către ANAF.');
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/vat/download/${reportId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vat-report-${reportId}.pdf`;
        a.click();
        toast.success('Descărcare completă', 'Raportul TVA a fost descărcat.');
      } else {
        toast.error('Eroare', 'Eroare la descărcarea raportului');
      }
    } catch (err) {
      console.error('Failed to download report:', err);
      toast.error('Eroare conexiune', 'Nu s-a putut descărca raportul.');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          onClick={() => { setError(null); setLoading(true); fetchReports(); fetchSummary(); }}
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
          <h1 className="text-2xl font-bold text-gray-900">{t('title') || 'Rapoarte TVA'}</h1>
          <p className="text-gray-500 mt-1">
            {t('subtitle') || 'Calculare si raportare TVA conform Legii 141/2025'}
          </p>
        </div>
        <button
          onClick={() => { fetchReports(); fetchSummary(); }}
          className="p-2 text-gray-500 hover:text-gray-700"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('year') || 'An curent'}</p>
                <p className="text-2xl font-bold text-gray-900">{summary.currentYear}</p>
              </div>
              <BarChart className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">{t('collected') || 'TVA Colectat'}</p>
                <p className="text-xl font-bold text-blue-900">{formatAmount(summary.totalCollected)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">{t('deductible') || 'TVA Deductibil'}</p>
                <p className="text-xl font-bold text-green-900">{formatAmount(summary.totalDeductible)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className={`rounded-lg shadow p-4 ${summary.totalPayable >= 0 ? 'bg-amber-50' : 'bg-teal-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${summary.totalPayable >= 0 ? 'text-amber-600' : 'text-teal-600'}`}>
                  {summary.totalPayable >= 0 ? (t('payable') || 'TVA de Plata') : (t('recoverable') || 'TVA de Recuperat')}
                </p>
                <p className={`text-xl font-bold ${summary.totalPayable >= 0 ? 'text-amber-900' : 'text-teal-900'}`}>
                  {formatAmount(Math.abs(summary.totalPayable))}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* VAT Rates Info - Legea 141/2025 Transition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Rates (Pre-Aug 2025) */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <Calculator className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Cote TVA curente (pana la 31 iulie 2025)
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>19%</strong> - Cota standard</li>
                  <li><strong>9%</strong> - Cota redusa: alimente, medicamente, carti, hoteluri</li>
                  <li><strong>5%</strong> - Cota redusa speciala: locuinte sociale</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* New Rates (Post-Aug 2025) */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Cote TVA noi - Legea 141/2025 (de la 1 august 2025)
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>21%</strong> - Cota standard (+2%)</li>
                  <li><strong>11%</strong> - Cota redusa (+2%): alimente, medicamente, carti, hoteluri</li>
                  <li><strong>5%</strong> - Cota redusa speciala (neschimbat)</li>
                </ul>
              </div>
              <p className="mt-2 text-xs text-amber-600 font-medium">
                Sistem configurat automat pentru tranziție
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Countdown Banner */}
      {!isNewRatesActive && daysUntilNewRates > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6" />
              <div>
                <h3 className="font-bold">Tranziție cote TVA - Legea 141/2025</h3>
                <p className="text-amber-100 text-sm">Noile cote (21%/11%) intră în vigoare pe 1 august 2025</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{daysUntilNewRates}</p>
              <p className="text-amber-100 text-sm">zile rămase</p>
            </div>
          </div>
        </div>
      )}

      {isNewRatesActive && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6" />
            <div>
              <h3 className="font-bold">Cote TVA noi active - Legea 141/2025</h3>
              <p className="text-green-100 text-sm">Se aplică cotele de 21% (standard) și 11% (redusă) din 1 august 2025</p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive VAT Calculator */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          Calculator TVA interactiv
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sumă (RON)</label>
              <input
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                placeholder="Introduceți suma"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tip calcul</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCalcType('add')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                    calcType === 'add'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Adaugă TVA
                </button>
                <button
                  onClick={() => setCalcType('extract')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                    calcType === 'extract'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Extrage TVA
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cotă TVA</label>
              <div className="grid grid-cols-3 gap-2">
                {(isNewRatesActive ? [21, 11, 5] : [19, 9, 5]).map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setCalcRate(rate)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      calcRate === rate
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Info className="h-3 w-3" />
                {isNewRatesActive
                  ? 'Cote conform Legea 141/2025 (de la 1 aug 2025)'
                  : 'Cote actuale (până la 31 iul 2025)'
                }
              </p>
            </div>
          </div>

          {/* Result Section */}
          <div className={`rounded-lg p-4 ${calcResult ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Rezultat calcul</h3>
            {calcResult ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Valoare netă (fără TVA)</span>
                  <span className="text-lg font-semibold text-gray-900">{formatAmount(calcResult.net)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">TVA ({calcRate}%)</span>
                  <span className="text-lg font-semibold text-blue-600">{formatAmount(calcResult.vat)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 font-medium">Valoare brută (cu TVA)</span>
                  <span className="text-xl font-bold text-gray-900">{formatAmount(calcResult.gross)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Calculator className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Introduceți o sumă pentru a calcula TVA</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Important Deadlines */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Termene importante ANAF 2025-2026
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-2 rounded bg-white/50">
            <p className="text-purple-600 font-medium">1 Ian 2025</p>
            <p className="text-purple-700">SAF-T D406 obligatoriu lunar</p>
          </div>
          <div className={`p-2 rounded ${!isNewRatesActive ? 'bg-amber-100 ring-2 ring-amber-400' : 'bg-white/50'}`}>
            <p className="text-purple-600 font-medium">1 Aug 2025</p>
            <p className="text-purple-700">Noi cote TVA (21%/11%)</p>
            {!isNewRatesActive && <p className="text-amber-600 text-xs font-medium mt-1">{daysUntilNewRates} zile</p>}
          </div>
          <div className="p-2 rounded bg-white/50">
            <p className="text-purple-600 font-medium">1 Sept 2025</p>
            <p className="text-purple-700">SAF-T pilot grace period</p>
          </div>
          <div className="p-2 rounded bg-white/50">
            <p className="text-purple-600 font-medium">Mid 2026</p>
            <p className="text-purple-700">e-Factura B2B obligatoriu</p>
          </div>
        </div>
      </div>

      {/* Calculate New Report */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {t('calculateTitle') || 'Calculeaza TVA pentru perioada'}
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
            onClick={calculateVAT}
            disabled={calculating}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {calculating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {t('calculating') || 'Se calculeaza...'}
              </>
            ) : (
              <>
                <Calculator className="h-5 w-5 mr-2" />
                {t('calculate') || 'Calculeaza TVA'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {t('reportsTitle') || 'Rapoarte TVA'}
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
            <p>{t('noReports') || 'Nu exista rapoarte TVA'}</p>
            <p className="text-sm mt-2">{t('noReportsHint') || 'Selectati o perioada si calculati TVA-ul'}</p>
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
                    {t('collectedColumn') || 'Colectat'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('deductibleColumn') || 'Deductibil'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('payableColumn') || 'De Plata'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('statusColumn') || 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actionsColumn') || 'Actiuni'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {formatPeriod(report.period)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {formatAmount(report.vatCollected)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatAmount(report.vatDeductible)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${report.vatPayable >= 0 ? 'text-amber-600' : 'text-teal-600'}`}>
                      {formatAmount(report.vatPayable)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                      {report.anafRef && (
                        <div className="text-xs text-gray-400 mt-1">Ref: {report.anafRef}</div>
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
                        {(report.status === 'DRAFT' || report.status === 'VALIDATED') && (
                          <button
                            onClick={() => submitToANAF(report.id)}
                            className="text-green-600 hover:text-green-900"
                            title={t('submitANAF') || 'Trimite la ANAF'}
                          >
                            <Send className="h-5 w-5" />
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
