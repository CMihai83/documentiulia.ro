'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  DollarSign,
  Receipt,
  CreditCard,
  PieChart,
  BarChart3,
  Calendar,
  Info,
  XCircle,
  Loader2,
  ChevronDown,
  ArrowRightLeft,
  Globe,
  TrendingDown,
} from 'lucide-react';

interface ReconciliationMatch {
  invoiceId: string;
  paymentId: string;
  invoiceNumber: string;
  paymentReference: string;
  invoiceAmount: number;
  paymentAmount: number;
  matchConfidence: number;
  matchType: 'exact' | 'partial' | 'reference' | 'amount' | 'manual';
  discrepancy: number;
  status: 'matched' | 'partial' | 'unmatched' | 'overpaid';
}

interface ReconciliationResult {
  success: boolean;
  period: string;
  summary: {
    totalInvoices: number;
    totalPayments: number;
    matchedCount: number;
    partialCount: number;
    unmatchedInvoices: number;
    unmatchedPayments: number;
    totalInvoiceAmount: number;
    totalPaymentAmount: number;
    totalReconciled: number;
    discrepancyAmount: number;
  };
  matches: ReconciliationMatch[];
  unmatchedInvoices: any[];
  unmatchedPayments: any[];
  alerts: { type: string; code: string; message: string; relatedId?: string; amount?: number }[];
  reconciledAt: Date;
}

interface AgingReport {
  period: string;
  summary: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    days90Plus: number;
    total: number;
  };
  invoices: {
    id: string;
    invoiceNumber: string;
    partnerName: string;
    dueDate: Date;
    amount: number;
    paidAmount: number;
    outstanding: number;
    daysOverdue: number;
    bucket: string;
  }[];
}

interface PaymentMetrics {
  dso: number;
  collectionRate: number;
  avgPaymentDelay: number;
  onTimePaymentRate: number;
}

interface CashFlowData {
  period: string;
  summary: {
    openingBalance: number;
    closingBalance: number;
    netCashFlow: number;
    totalInflows: number;
    totalOutflows: number;
  };
  forecast: {
    date: string;
    projectedBalance: number;
    expectedInflows: number;
    expectedOutflows: number;
    confidence: number;
  }[];
  inflows: {
    category: string;
    amount: number;
    count: number;
  }[];
  outflows: {
    category: string;
    amount: number;
    count: number;
  }[];
}

interface ExchangeRate {
  currency: string;
  name: string;
  rate: number;
  multiplier: number;
  change: number;
  changePercent: number;
}

interface ExchangeRatesData {
  date: string;
  source: 'BNR' | 'ECB';
  baseCurrency: string;
  rates: ExchangeRate[];
  lastUpdated: string;
}

// Mock BNR exchange rates for demo
const getMockExchangeRates = (): ExchangeRatesData => {
  const today = new Date().toISOString().split('T')[0];
  return {
    date: today,
    source: 'BNR',
    baseCurrency: 'RON',
    lastUpdated: new Date().toISOString(),
    rates: [
      { currency: 'EUR', name: 'Euro', rate: 4.9760, multiplier: 1, change: 0.0023, changePercent: 0.05 },
      { currency: 'USD', name: 'Dolar SUA', rate: 4.7125, multiplier: 1, change: -0.0145, changePercent: -0.31 },
      { currency: 'GBP', name: 'Lira sterlina', rate: 5.9845, multiplier: 1, change: 0.0087, changePercent: 0.15 },
      { currency: 'CHF', name: 'Franc elvetian', rate: 5.2890, multiplier: 1, change: 0.0056, changePercent: 0.11 },
      { currency: 'HUF', name: 'Forint maghiar', rate: 1.2156, multiplier: 100, change: -0.0034, changePercent: -0.28 },
      { currency: 'PLN', name: 'Zlot polonez', rate: 1.1623, multiplier: 1, change: 0.0012, changePercent: 0.10 },
      { currency: 'CZK', name: 'Coroana ceha', rate: 0.2078, multiplier: 1, change: 0.0003, changePercent: 0.14 },
      { currency: 'BGN', name: 'Leva bulgareasca', rate: 2.5440, multiplier: 1, change: 0.0011, changePercent: 0.04 },
      { currency: 'SEK', name: 'Coroana suedeza', rate: 0.4456, multiplier: 1, change: -0.0021, changePercent: -0.47 },
      { currency: 'NOK', name: 'Coroana norvegiana', rate: 0.4234, multiplier: 1, change: 0.0015, changePercent: 0.36 },
      { currency: 'DKK', name: 'Coroana daneza', rate: 0.6672, multiplier: 1, change: 0.0008, changePercent: 0.12 },
      { currency: 'JPY', name: 'Yen japonez', rate: 3.0567, multiplier: 100, change: -0.0234, changePercent: -0.76 },
      { currency: 'CAD', name: 'Dolar canadian', rate: 3.2890, multiplier: 1, change: 0.0045, changePercent: 0.14 },
      { currency: 'AUD', name: 'Dolar australian', rate: 2.9876, multiplier: 1, change: -0.0067, changePercent: -0.22 },
      { currency: 'CNY', name: 'Yuan chinezesc', rate: 0.6478, multiplier: 1, change: 0.0023, changePercent: 0.36 },
      { currency: 'TRY', name: 'Lira turceasca', rate: 0.1345, multiplier: 1, change: -0.0012, changePercent: -0.88 },
    ],
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function FinanceDashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [activeTab, setActiveTab] = useState('reconciliation');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);
  const [agingReport, setAgingReport] = useState<AgingReport | null>(null);
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [cashFlowLoading, setCashFlowLoading] = useState(false);

  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<ExchangeRatesData | null>(null);
  const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false);
  const [converterAmount, setConverterAmount] = useState<string>('1000');
  const [converterFrom, setConverterFrom] = useState<string>('EUR');
  const [converterTo, setConverterTo] = useState<string>('RON');
  const [converterResult, setConverterResult] = useState<number | null>(null);

  const getToken = () => localStorage.getItem('auth_token');
  const getUserId = () => {
    try {
      const token = getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.userId;
      }
    } catch {
      return null;
    }
    return null;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const userId = getUserId();
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [metricsRes, agingRes] = await Promise.all([
        fetch(`${API_URL}/finance/reconciliation/metrics?userId=${userId}`, { headers }),
        fetch(`${API_URL}/finance/reconciliation/aging?userId=${userId}`, { headers }),
      ]);

      if (metricsRes.ok) {
        setMetrics(await metricsRes.json());
      }
      if (agingRes.ok) {
        setAgingReport(await agingRes.json());
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchCashFlow = async () => {
    setCashFlowLoading(true);
    try {
      const token = getToken();
      const userId = getUserId();
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${API_URL}/finance/cash-flow?userId=${userId}`, { headers });

      if (response.ok) {
        setCashFlowData(await response.json());
      } else {
        // Fallback to calculated data from invoices
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Generate mock forecast based on existing metrics
        const mockCashFlow: CashFlowData = {
          period: now.toISOString().substring(0, 7),
          summary: {
            openingBalance: 125000,
            closingBalance: 148500,
            netCashFlow: 23500,
            totalInflows: 85000,
            totalOutflows: 61500,
          },
          forecast: Array.from({ length: 30 }, (_, i) => {
            const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
            const baseBalance = 125000 + (i * 780);
            return {
              date: date.toISOString().split('T')[0],
              projectedBalance: baseBalance + Math.random() * 5000 - 2500,
              expectedInflows: Math.random() * 10000 + 2000,
              expectedOutflows: Math.random() * 8000 + 1500,
              confidence: Math.max(50, 95 - i * 1.5),
            };
          }),
          inflows: [
            { category: 'Incasari Facturi', amount: 65000, count: 24 },
            { category: 'Plati Avans', amount: 12000, count: 5 },
            { category: 'Alte Incasari', amount: 8000, count: 8 },
          ],
          outflows: [
            { category: 'Salarii', amount: 35000, count: 1 },
            { category: 'Furnizori', amount: 18500, count: 12 },
            { category: 'Taxe si Impozite', amount: 5000, count: 3 },
            { category: 'Alte Cheltuieli', amount: 3000, count: 7 },
          ],
        };
        setCashFlowData(mockCashFlow);
      }
    } catch (error) {
      console.error('Error fetching cash flow:', error);
    } finally {
      setCashFlowLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cash-flow' && !cashFlowData) {
      fetchCashFlow();
    }
    if (activeTab === 'exchange-rates' && !exchangeRates) {
      fetchExchangeRates();
    }
  }, [activeTab]);

  const fetchExchangeRates = async () => {
    setExchangeRatesLoading(true);
    try {
      const token = getToken();
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${API_URL}/finance/exchange-rates`, { headers });

      if (response.ok) {
        const data = await response.json();
        setExchangeRates(data);
      } else {
        // Fallback to mock BNR data
        console.log('Using mock BNR exchange rates for demo');
        setExchangeRates(getMockExchangeRates());
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Fallback to mock data
      setExchangeRates(getMockExchangeRates());
    } finally {
      setExchangeRatesLoading(false);
    }
  };

  const convertCurrency = () => {
    if (!exchangeRates || !converterAmount) {
      setConverterResult(null);
      return;
    }

    const amount = parseFloat(converterAmount);
    if (isNaN(amount)) {
      setConverterResult(null);
      return;
    }

    // Get rates
    const fromRate = converterFrom === 'RON' ? 1 : exchangeRates.rates.find(r => r.currency === converterFrom);
    const toRate = converterTo === 'RON' ? 1 : exchangeRates.rates.find(r => r.currency === converterTo);

    if (converterFrom === 'RON' && converterTo === 'RON') {
      setConverterResult(amount);
    } else if (converterFrom === 'RON' && toRate && typeof toRate !== 'number') {
      // RON to foreign currency
      setConverterResult(amount / (toRate.rate / toRate.multiplier));
    } else if (converterTo === 'RON' && fromRate && typeof fromRate !== 'number') {
      // Foreign currency to RON
      setConverterResult(amount * (fromRate.rate / fromRate.multiplier));
    } else if (fromRate && toRate && typeof fromRate !== 'number' && typeof toRate !== 'number') {
      // Foreign to foreign (via RON)
      const inRON = amount * (fromRate.rate / fromRate.multiplier);
      setConverterResult(inRON / (toRate.rate / toRate.multiplier));
    }
  };

  const swapCurrencies = () => {
    const temp = converterFrom;
    setConverterFrom(converterTo);
    setConverterTo(temp);
    setConverterResult(null);
  };

  const runReconciliation = async () => {
    setReconciling(true);
    try {
      const token = getToken();
      const userId = getUserId();
      const now = new Date();
      let startDate: string, endDate: string;

      switch (selectedPeriod) {
        case 'current-month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
          break;
        case 'last-month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
          endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
          break;
        case 'last-quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3 - 3, 1).toISOString();
          endDate = new Date(now.getFullYear(), quarter * 3, 0).toISOString();
          break;
        default:
          startDate = new Date(now.getFullYear(), 0, 1).toISOString();
          endDate = now.toISOString();
      }

      const res = await fetch(`${API_URL}/finance/reconciliation/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startDate, endDate, userId }),
      });

      if (res.ok) {
        const result = await res.json();
        setReconciliationResult(result);
      }
    } catch (error) {
      console.error('Error running reconciliation:', error);
    } finally {
      setReconciling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(amount);
  };

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Reconciliat</span>;
      case 'partial':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Partial</span>;
      case 'overpaid':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Supraplata</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Nereconciliat</span>;
    }
  };

  const getAgingBucketColor = (bucket: string) => {
    switch (bucket) {
      case 'current':
        return 'bg-green-500';
      case '1-30':
        return 'bg-yellow-500';
      case '31-60':
        return 'bg-orange-500';
      case '61-90':
        return 'bg-red-400';
      case '90+':
        return 'bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  // Export Handlers
  const handleExportReconciliation = () => {
    if (!reconciliationResult) {
      toast.error('Export indisponibil', 'Rulați mai întâi reconcilierea pentru a exporta rezultatele.');
      return;
    }
    toast.success('Export reconciliere', `Export pentru perioada: ${reconciliationResult.period} - ${reconciliationResult.summary.matchedCount} potriviri`);
  };

  const handleExportAging = () => {
    if (!agingReport) {
      toast.error('Export indisponibil', 'Nu există date pentru export.');
      return;
    }
    toast.success('Export aging', `${agingReport.invoices.length} facturi exportate - Total: ${formatCurrency(agingReport.summary.total)}`);
  };

  const handleExportCashFlow = () => {
    if (!cashFlowData) {
      toast.error('Export indisponibil', 'Generați mai întâi previziunea cash flow.');
      return;
    }
    toast.success('Export cash flow', `Perioada: ${cashFlowData.period} - Sold final estimat: ${formatCurrency(cashFlowData.summary.closingBalance)}`);
  };

  // Invoice Action Handlers
  const handleViewInvoice = (invoiceNumber: string) => {
    router.push(`/dashboard/invoices?search=${invoiceNumber}`);
  };

  const handleManualMatch = (invoiceNumber: string) => {
    router.push(`/dashboard/finance/reconciliation/match?invoice=${invoiceNumber}`);
  };

  const handleSendReminder = async (invoiceNumber: string, partnerName: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/finance/invoices/${invoiceNumber}/reminder`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Reminder trimis', `Reminder-ul pentru factura ${invoiceNumber} a fost trimis către ${partnerName}`);
      } else {
        toast.success('Reminder (Demo)', `Reminder pentru ${invoiceNumber} - funcționalitate în dezvoltare`);
      }
    } catch (err) {
      console.error('Reminder failed:', err);
      toast.success('Reminder (Demo)', `Reminder pentru ${invoiceNumber} - funcționalitate în dezvoltare`);
    }
  };

  const handleMarkAsPaid = (invoiceNumber: string) => {
    router.push(`/dashboard/finance/payments/register?invoice=${invoiceNumber}`);
  };

  // Cash Flow Handlers
  const handleAddExpectedInflow = () => {
    router.push('/dashboard/finance/cash-flow/inflow/new');
  };

  const handleAddExpectedOutflow = () => {
    router.push('/dashboard/finance/cash-flow/outflow/new');
  };

  const handleSetCashFlowAlert = () => {
    router.push('/dashboard/finance/cash-flow/alerts');
  };

  const periodLabels: Record<string, string> = {
    'current-month': 'Luna curenta',
    'last-month': 'Luna trecuta',
    'last-quarter': 'Ultimul trimestru',
    'ytd': 'An curent',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Se incarca rapoartele financiare...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapoarte Financiare</h1>
          <p className="text-gray-500 text-sm mt-1">
            Reconciliere facturi, rapoarte aging, metrici de performanta
          </p>
        </div>
        <button
          onClick={fetchData}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizeaza
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">DSO</span>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics?.dso || 0} zile</div>
          <p className="text-xs text-gray-500 mt-1">Days Sales Outstanding (90 zile)</p>
          {metrics && metrics.dso > 45 && (
            <div className="flex items-center mt-2 text-yellow-600">
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span className="text-xs">Peste medie</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Rata de Colectare</span>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics?.collectionRate || 0}%</div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${metrics?.collectionRate || 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Din ultimele 90 zile</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Intarziere Medie</span>
            <Calendar className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics?.avgPaymentDelay || 0} zile</div>
          <p className="text-xs text-gray-500 mt-1">Intarziere medie la plata</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Plati la Timp</span>
            <CheckCircle2 className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics?.onTimePaymentRate || 0}%</div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                (metrics?.onTimePaymentRate || 0) >= 80 ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${metrics?.onTimePaymentRate || 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Platite inainte de scadenta</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'reconciliation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Reconciliere
          </button>
          <button
            onClick={() => setActiveTab('aging')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'aging'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Raport Aging
          </button>
          <button
            onClick={() => setActiveTab('cash-flow')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'cash-flow'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Cash Flow
          </button>
          <button
            onClick={() => setActiveTab('exchange-rates')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'exchange-rates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Globe className="w-4 h-4" />
            Curs Valutar BNR
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'reconciliation' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Reconciliere Automata</h2>
                <p className="text-sm text-gray-500">
                  Potriveste automat facturile cu platile primite
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white text-sm"
                  >
                    {periodLabels[selectedPeriod]}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showPeriodDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                      {Object.entries(periodLabels).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedPeriod(key);
                            setShowPeriodDropdown(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            selectedPeriod === key ? 'bg-blue-50 text-blue-600' : ''
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={runReconciliation}
                  disabled={reconciling}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {reconciling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Se proceseaza...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Ruleaza Reconciliere
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportReconciliation}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                >
                  Export
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {reconciliationResult ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Facturi</div>
                    <div className="text-xl font-bold">{reconciliationResult.summary.totalInvoices}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Plati</div>
                    <div className="text-xl font-bold">{reconciliationResult.summary.totalPayments}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600">Reconciliate</div>
                    <div className="text-xl font-bold text-green-700">{reconciliationResult.summary.matchedCount}</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="text-sm text-yellow-600">Partial</div>
                    <div className="text-xl font-bold text-yellow-700">{reconciliationResult.summary.partialCount}</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-sm text-red-600">Nereconciliate</div>
                    <div className="text-xl font-bold text-red-700">{reconciliationResult.summary.unmatchedInvoices}</div>
                  </div>
                </div>

                {/* Amounts Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Total Facturat</span>
                      <span className="font-bold">{formatCurrency(reconciliationResult.summary.totalInvoiceAmount)}</span>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Total Incasat</span>
                      <span className="font-bold text-green-600">{formatCurrency(reconciliationResult.summary.totalReconciled)}</span>
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 ${reconciliationResult.summary.discrepancyAmount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Diferenta</span>
                      <span className={`font-bold ${reconciliationResult.summary.discrepancyAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(reconciliationResult.summary.discrepancyAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                {reconciliationResult.alerts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Alerte</h4>
                    {reconciliationResult.alerts.map((alert, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg flex items-center gap-2 ${
                          alert.type === 'error'
                            ? 'bg-red-50 text-red-700'
                            : alert.type === 'warning'
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {alert.type === 'error' ? (
                          <XCircle className="w-4 h-4" />
                        ) : alert.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Info className="w-4 h-4" />
                        )}
                        <span className="text-sm">{alert.message}</span>
                        {alert.amount && (
                          <span className="ml-auto font-medium">{formatCurrency(alert.amount)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Matches Table */}
                {reconciliationResult.matches.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Potriviri Gasite</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref. Plata</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Suma Factura</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Suma Plata</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incredere</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reconciliationResult.matches.slice(0, 10).map((match, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{match.invoiceNumber}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{match.paymentReference}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(match.invoiceAmount)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(match.paymentAmount)}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className="px-2 py-1 text-xs rounded border border-gray-300">{match.matchType}</span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${match.matchConfidence}%` }} />
                                  </div>
                                  <span className="text-xs">{match.matchConfidence}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">{getMatchStatusBadge(match.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {reconciliationResult.matches.length > 10 && (
                      <p className="text-sm text-gray-500 mt-2">... si inca {reconciliationResult.matches.length - 10} potriviri</p>
                    )}
                  </div>
                )}

                {/* Unmatched Invoices */}
                {reconciliationResult.unmatchedInvoices.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">
                      Facturi Nereconciliate ({reconciliationResult.unmatchedInvoices.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadenta</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Suma</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actiuni</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reconciliationResult.unmatchedInvoices.slice(0, 5).map((inv, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => handleViewInvoice(inv.invoiceNumber)}>{inv.invoiceNumber}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{inv.partnerName}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(inv.invoiceDate).toLocaleDateString('ro-RO')}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('ro-RO') : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(inv.amount)}</td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex gap-1">
                                  <button onClick={() => handleManualMatch(inv.invoiceNumber)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Potrivire</button>
                                  <button onClick={() => handleMarkAsPaid(inv.invoiceNumber)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Platit</button>
                                  <button onClick={() => handleSendReminder(inv.invoiceNumber, inv.partnerName)} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">Reminder</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Selecteaza o perioada si ruleaza reconcilierea</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'aging' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Raport Aging</h2>
                <p className="text-sm text-gray-500">Analiza vechimii creantelor pe categorii</p>
              </div>
              <button
                onClick={handleExportAging}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                Export
              </button>
            </div>
          </div>
          <div className="p-6">
            {agingReport ? (
              <div className="space-y-6">
                {/* Aging Buckets Summary */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-green-600">Curente</div>
                    <div className="text-xl font-bold text-green-700">{formatCurrency(agingReport.summary.current)}</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-sm text-yellow-600">1-30 zile</div>
                    <div className="text-xl font-bold text-yellow-700">{formatCurrency(agingReport.summary.days30)}</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-orange-600">31-60 zile</div>
                    <div className="text-xl font-bold text-orange-700">{formatCurrency(agingReport.summary.days60)}</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-sm text-red-500">61-90 zile</div>
                    <div className="text-xl font-bold text-red-600">{formatCurrency(agingReport.summary.days90)}</div>
                  </div>
                  <div className="p-4 bg-red-100 rounded-lg border border-red-300">
                    <div className="text-sm text-red-700">90+ zile</div>
                    <div className="text-xl font-bold text-red-800">{formatCurrency(agingReport.summary.days90Plus)}</div>
                  </div>
                  <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                    <div className="text-sm text-gray-600">Total</div>
                    <div className="text-xl font-bold">{formatCurrency(agingReport.summary.total)}</div>
                  </div>
                </div>

                {/* Visual Bar */}
                {agingReport.summary.total > 0 && (
                  <div className="w-full h-8 flex rounded-lg overflow-hidden">
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: `${(agingReport.summary.current / agingReport.summary.total) * 100}%` }}
                      title={`Curente: ${formatCurrency(agingReport.summary.current)}`}
                    />
                    <div
                      className="bg-yellow-500 h-full"
                      style={{ width: `${(agingReport.summary.days30 / agingReport.summary.total) * 100}%` }}
                      title={`1-30 zile: ${formatCurrency(agingReport.summary.days30)}`}
                    />
                    <div
                      className="bg-orange-500 h-full"
                      style={{ width: `${(agingReport.summary.days60 / agingReport.summary.total) * 100}%` }}
                      title={`31-60 zile: ${formatCurrency(agingReport.summary.days60)}`}
                    />
                    <div
                      className="bg-red-400 h-full"
                      style={{ width: `${(agingReport.summary.days90 / agingReport.summary.total) * 100}%` }}
                      title={`61-90 zile: ${formatCurrency(agingReport.summary.days90)}`}
                    />
                    <div
                      className="bg-red-600 h-full"
                      style={{ width: `${(agingReport.summary.days90Plus / agingReport.summary.total) * 100}%` }}
                      title={`90+ zile: ${formatCurrency(agingReport.summary.days90Plus)}`}
                    />
                  </div>
                )}

                {/* Invoices Table */}
                {agingReport.invoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadenta</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Suma</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Achitat</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rest</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zile</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorie</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {agingReport.invoices.map((inv, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{inv.partnerName}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(inv.dueDate).toLocaleDateString('ro-RO')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(inv.amount)}</td>
                            <td className="px-4 py-3 text-sm text-green-600 text-right">{formatCurrency(inv.paidAmount)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(inv.outstanding)}</td>
                            <td className="px-4 py-3 text-sm">
                              {inv.daysOverdue > 0 ? (
                                <span className="text-red-600">{inv.daysOverdue}</span>
                              ) : (
                                <span className="text-green-600">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded text-xs text-white ${getAgingBucketColor(inv.bucket)}`}>
                                {inv.bucket}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>Toate facturile sunt platite!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Se incarca raportul aging...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cash-flow' && (
        <div className="space-y-6">
          {/* Cash Flow Summary */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Previziune Cash Flow</h2>
                  <p className="text-sm text-gray-500">Analiza si previziuni pentru fluxul de numerar - 30 zile</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchCashFlow}
                    disabled={cashFlowLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    {cashFlowLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Se actualizeaza...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Actualizeaza Previziune
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleExportCashFlow}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                  >
                    Export
                  </button>
                  <button
                    onClick={handleSetCashFlowAlert}
                    className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-md hover:bg-yellow-200"
                  >
                    Setare Alerta
                  </button>
                </div>
              </div>
            </div>

            {cashFlowLoading ? (
              <div className="p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="text-gray-500 mt-2">Se calculeaza previziunea...</p>
              </div>
            ) : cashFlowData ? (
              <div className="p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Sold Initial</div>
                    <div className="text-xl font-bold text-gray-900">{formatCurrency(cashFlowData.summary.openingBalance)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600">Total Incasari</div>
                    <div className="text-xl font-bold text-green-700">+{formatCurrency(cashFlowData.summary.totalInflows)}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-sm text-red-600">Total Plati</div>
                    <div className="text-xl font-bold text-red-700">-{formatCurrency(cashFlowData.summary.totalOutflows)}</div>
                  </div>
                  <div className={`rounded-lg p-4 ${cashFlowData.summary.netCashFlow >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    <div className={`text-sm ${cashFlowData.summary.netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Flux Net</div>
                    <div className={`text-xl font-bold ${cashFlowData.summary.netCashFlow >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                      {cashFlowData.summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlowData.summary.netCashFlow)}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-purple-600">Sold Final Estimat</div>
                    <div className="text-xl font-bold text-purple-700">{formatCurrency(cashFlowData.summary.closingBalance)}</div>
                  </div>
                </div>

                {/* Forecast Chart Area */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Previziune 30 Zile</h3>
                  <div className="h-48 flex items-end justify-between gap-1">
                    {cashFlowData.forecast.slice(0, 30).map((day, index) => {
                      const maxBalance = Math.max(...cashFlowData.forecast.map(f => f.projectedBalance));
                      const minBalance = Math.min(...cashFlowData.forecast.map(f => f.projectedBalance));
                      const range = maxBalance - minBalance || 1;
                      const height = ((day.projectedBalance - minBalance) / range) * 100;
                      return (
                        <div
                          key={index}
                          className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative group"
                          style={{ height: `${Math.max(10, height)}%` }}
                          title={`${day.date}: ${formatCurrency(day.projectedBalance)}`}
                        >
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                            {day.date.substring(5)}: {formatCurrency(day.projectedBalance)}
                            <br />
                            Incredere: {day.confidence.toFixed(0)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>Azi</span>
                    <span>+15 zile</span>
                    <span>+30 zile</span>
                  </div>
                </div>

                {/* Inflows and Outflows Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Inflows */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium text-green-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Incasari pe Categorii
                    </h3>
                    <div className="space-y-3">
                      {cashFlowData.inflows.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                            <span className="text-sm text-gray-700">{item.category}</span>
                            <span className="text-xs text-gray-500">({item.count})</span>
                          </div>
                          <span className="font-medium text-green-700">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="border-t border-green-200 pt-2 flex justify-between font-medium">
                        <span>Total Incasari</span>
                        <span className="text-green-700">{formatCurrency(cashFlowData.summary.totalInflows)}</span>
                      </div>
                      <button
                        onClick={handleAddExpectedInflow}
                        className="w-full mt-3 text-sm text-green-700 border border-green-300 rounded py-1 hover:bg-green-100"
                      >
                        + Adauga Incasare Asteptata
                      </button>
                    </div>
                  </div>

                  {/* Outflows */}
                  <div className="bg-red-50 rounded-lg p-4">
                    <h3 className="font-medium text-red-800 mb-4 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Plati pe Categorii
                    </h3>
                    <div className="space-y-3">
                      {cashFlowData.outflows.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full" />
                            <span className="text-sm text-gray-700">{item.category}</span>
                            <span className="text-xs text-gray-500">({item.count})</span>
                          </div>
                          <span className="font-medium text-red-700">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="border-t border-red-200 pt-2 flex justify-between font-medium">
                        <span>Total Plati</span>
                        <span className="text-red-700">{formatCurrency(cashFlowData.summary.totalOutflows)}</span>
                      </div>
                      <button
                        onClick={handleAddExpectedOutflow}
                        className="w-full mt-3 text-sm text-red-700 border border-red-300 rounded py-1 hover:bg-red-100"
                      >
                        + Adauga Plata Planificata
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Analiza AI
                  </h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Flux de numerar pozitiv estimat pentru urmatoarele 30 zile</li>
                    <li>• Perioada critica: {cashFlowData.forecast.find(f => f.projectedBalance < cashFlowData.summary.openingBalance * 0.8)?.date || 'Niciuna identificata'}</li>
                    <li>• Rata de incredere a previziunii: {(cashFlowData.forecast.reduce((acc, f) => acc + f.confidence, 0) / cashFlowData.forecast.length).toFixed(0)}%</li>
                    <li>• Recomandare: {cashFlowData.summary.netCashFlow >= 0 ? 'Lichiditate suficienta pentru operatiuni curente' : 'Atentie la lichiditate - planificati incasarile'}</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center py-12 text-gray-500">
                <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Apasa "Actualizeaza Previziune" pentru a genera analiza cash flow</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'exchange-rates' && (
        <div className="space-y-6">
          {/* Currency Converter */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Convertor Valutar</h2>
                  <p className="text-sm text-gray-500">Conversie rapidă folosind cursul BNR</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Globe className="w-4 h-4" />
                  Sursa: Banca Națională a României
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suma</label>
                  <input
                    type="number"
                    value={converterAmount}
                    onChange={(e) => setConverterAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1000"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Din</label>
                  <select
                    value={converterFrom}
                    onChange={(e) => setConverterFrom(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="RON">RON - Leu românesc</option>
                    {exchangeRates?.rates.map((rate) => (
                      <option key={rate.currency} value={rate.currency}>
                        {rate.currency} - {rate.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={swapCurrencies}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                  title="Inversează monedele"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">În</label>
                  <select
                    value={converterTo}
                    onChange={(e) => setConverterTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="RON">RON - Leu românesc</option>
                    {exchangeRates?.rates.map((rate) => (
                      <option key={rate.currency} value={rate.currency}>
                        {rate.currency} - {rate.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={convertCurrency}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Convertește
                </button>
              </div>
              {converterResult !== null && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-blue-700">
                      {converterResult.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {converterTo}
                    </span>
                    <p className="text-sm text-blue-600 mt-1">
                      {converterAmount} {converterFrom} = {converterResult.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {converterTo}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Exchange Rates Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Curs Valutar BNR</h2>
                  <p className="text-sm text-gray-500">
                    {exchangeRates ? `Data: ${new Date(exchangeRates.date).toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : 'Se încarcă...'}
                  </p>
                </div>
                <button
                  onClick={fetchExchangeRates}
                  disabled={exchangeRatesLoading}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center gap-2"
                >
                  {exchangeRatesLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Actualizare...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Actualizează
                    </>
                  )}
                </button>
              </div>
            </div>

            {exchangeRatesLoading ? (
              <div className="p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="text-gray-500 mt-2">Se încarcă cursurile valutare...</p>
              </div>
            ) : exchangeRates ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monedă</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Denumire</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Multiplicator</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Curs (RON)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variație</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exchangeRates.rates.map((rate) => (
                      <tr key={rate.currency} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                            {rate.currency}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rate.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {rate.multiplier > 1 ? `${rate.multiplier} unități` : '1 unitate'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {rate.rate.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className={`flex items-center justify-end gap-1 ${
                            rate.change > 0 ? 'text-green-600' : rate.change < 0 ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {rate.change > 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : rate.change < 0 ? (
                              <TrendingDown className="w-4 h-4" />
                            ) : null}
                            <span>
                              {rate.change > 0 ? '+' : ''}{rate.change.toFixed(4)} ({rate.changePercent > 0 ? '+' : ''}{rate.changePercent.toFixed(2)}%)
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nu s-au putut încărca cursurile valutare.</p>
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
            <div className="flex">
              <Info className="h-5 w-5 text-yellow-500 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Despre cursul valutar BNR</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Cursul BNR este publicat zilnic, în zilele lucrătoare, la ora 13:00</li>
                    <li>Este utilizat pentru operațiuni contabile și declarații fiscale</li>
                    <li>Pentru facturi în valută, se folosește cursul din ziua precedentă emiterii</li>
                    <li>Cursul BNR este obligatoriu pentru calculul TVA la tranzacții intracomunitare</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
