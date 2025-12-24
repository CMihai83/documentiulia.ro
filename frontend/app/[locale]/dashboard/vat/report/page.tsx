'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Download,
  Send,
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  ChevronDown,
  Building2,
  Receipt,
  Percent
} from 'lucide-react';

interface VATSummary {
  collected: number;
  deductible: number;
  payable: number;
  refundable: number;
}

interface VATBreakdown {
  rate: number;
  label: string;
  taxableBase: number;
  vatAmount: number;
  transactionCount: number;
}

interface VATTransaction {
  id: string;
  date: string;
  type: 'sale' | 'purchase';
  partner: string;
  invoiceNumber: string;
  taxableBase: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

const MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

const QUARTERS = [
  { value: 1, label: 'T1 (Ian - Mar)' },
  { value: 2, label: 'T2 (Apr - Iun)' },
  { value: 3, label: 'T3 (Iul - Sep)' },
  { value: 4, label: 'T4 (Oct - Dec)' },
];

export default function VATReportPage() {
  const router = useRouter();
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'breakdown' | 'transactions'>('summary');

  // Mock data - would come from API
  const [summary, setSummary] = useState<VATSummary>({
    collected: 45230.50,
    deductible: 28150.75,
    payable: 17079.75,
    refundable: 0,
  });

  const [breakdown, setBreakdown] = useState<VATBreakdown[]>([
    { rate: 19, label: '19% - Standard', taxableBase: 185000, vatAmount: 35150, transactionCount: 145 },
    { rate: 9, label: '9% - Redus', taxableBase: 52000, vatAmount: 4680, transactionCount: 38 },
    { rate: 5, label: '5% - Special', taxableBase: 28000, vatAmount: 1400, transactionCount: 12 },
    { rate: 0, label: '0% - Scutit', taxableBase: 15000, vatAmount: 0, transactionCount: 8 },
  ]);

  const [transactions, setTransactions] = useState<VATTransaction[]>([
    { id: '1', date: '2025-12-01', type: 'sale', partner: 'Tech Solutions SRL', invoiceNumber: 'FAC-2025-0145', taxableBase: 5000, vatRate: 19, vatAmount: 950, total: 5950 },
    { id: '2', date: '2025-12-02', type: 'purchase', partner: 'Office Supplies SA', invoiceNumber: 'FACT-8821', taxableBase: 2500, vatRate: 19, vatAmount: 475, total: 2975 },
    { id: '3', date: '2025-12-03', type: 'sale', partner: 'Farmacia Central', invoiceNumber: 'FAC-2025-0146', taxableBase: 8000, vatRate: 9, vatAmount: 720, total: 8720 },
    { id: '4', date: '2025-12-05', type: 'purchase', partner: 'Food Distributor SRL', invoiceNumber: 'FV-2025-445', taxableBase: 3200, vatRate: 9, vatAmount: 288, total: 3488 },
    { id: '5', date: '2025-12-08', type: 'sale', partner: 'Construction Pro SA', invoiceNumber: 'FAC-2025-0147', taxableBase: 12000, vatRate: 19, vatAmount: 2280, total: 14280 },
  ]);

  const [submissionStatus, setSubmissionStatus] = useState<'pending' | 'submitted' | 'accepted' | 'rejected'>('pending');
  const [deadline, setDeadline] = useState<string>('2026-01-25');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleRefreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  const handleExportD406 = async () => {
    setIsExporting(true);
    try {
      // Simulate SAF-T D406 XML generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create mock XML content
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:RO_1.0">
  <Header>
    <AuditFileVersion>RO_CIUS_1.0</AuditFileVersion>
    <AuditFileCountry>RO</AuditFileCountry>
    <AuditFileDateCreated>${new Date().toISOString().split('T')[0]}</AuditFileDateCreated>
    <SoftwareCompanyName>DocumentIulia.ro</SoftwareCompanyName>
    <SoftwareID>DOCUMENTIULIA_ERP</SoftwareID>
    <SoftwareVersion>2.0.0</SoftwareVersion>
    <TaxAccountingBasis>Invoice</TaxAccountingBasis>
    <Company>
      <RegistrationNumber>RO12345678</RegistrationNumber>
    </Company>
    <SelectionCriteria>
      <SelectionStartDate>${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01</SelectionStartDate>
      <SelectionEndDate>${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}</SelectionEndDate>
    </SelectionCriteria>
  </Header>
  <MasterFiles>
    <!-- Master data would be here -->
  </MasterFiles>
  <GeneralLedgerEntries>
    <!-- Journal entries would be here -->
  </GeneralLedgerEntries>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${breakdown.reduce((acc, b) => acc + b.transactionCount, 0)}</NumberOfEntries>
      <TotalDebit>${summary.collected.toFixed(2)}</TotalDebit>
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

      // Download file
      const blob = new Blob([xmlContent], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `D406_${selectedYear}_${String(selectedMonth + 1).padStart(2, '0')}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubmitToANAF = async () => {
    // This would integrate with ANAF SPV API
    alert('Funcționalitatea de trimitere directă la ANAF SPV va fi disponibilă în curând. Vă rugăm să exportați fișierul D406 și să îl încărcați manual pe portal.anaf.ro.');
  };

  const getPeriodLabel = () => {
    if (periodType === 'monthly') {
      return `${MONTHS[selectedMonth]} ${selectedYear}`;
    }
    return `${QUARTERS.find(q => q.value === selectedQuarter)?.label} ${selectedYear}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-amber-100 text-amber-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted': return 'Acceptat ANAF';
      case 'submitted': return 'Trimis - În procesare';
      case 'rejected': return 'Respins';
      default: return 'În așteptare';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const daysUntilDeadline = () => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Raport TVA</h1>
            <p className="text-gray-500">Generare și trimitere declarație D406 SAF-T</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizează
          </button>
          <button
            onClick={handleExportD406}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Se exportă...' : 'Export D406 XML'}
          </button>
          <button
            onClick={handleSubmitToANAF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Send className="w-4 h-4" />
            Trimite la ANAF
          </button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Perioadă:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPeriodType('monthly')}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                periodType === 'monthly'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Lunar
            </button>
            <button
              onClick={() => setPeriodType('quarterly')}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                periodType === 'quarterly'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Trimestrial
            </button>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {periodType === 'monthly' ? (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          ) : (
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {QUARTERS.map(quarter => (
                <option key={quarter.value} value={quarter.value}>{quarter.label}</option>
              ))}
            </select>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(submissionStatus)}`}>
              {getStatusLabel(submissionStatus)}
            </span>
          </div>
        </div>
      </div>

      {/* Deadline Alert */}
      {submissionStatus === 'pending' && daysUntilDeadline() <= 10 && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          daysUntilDeadline() <= 3 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
        }`}>
          <AlertCircle className={`w-5 h-5 ${daysUntilDeadline() <= 3 ? 'text-red-600' : 'text-amber-600'}`} />
          <div>
            <p className={`font-medium ${daysUntilDeadline() <= 3 ? 'text-red-800' : 'text-amber-800'}`}>
              Termen limită: {formatDate(deadline)}
            </p>
            <p className={`text-sm ${daysUntilDeadline() <= 3 ? 'text-red-600' : 'text-amber-600'}`}>
              Mai aveți {daysUntilDeadline()} zile pentru a trimite declarația D406 pentru {getPeriodLabel()}.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">TVA Colectat</span>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.collected)}</p>
          <p className="text-xs text-gray-500 mt-1">Din vânzări</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">TVA Deductibil</span>
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingDown className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.deductible)}</p>
          <p className="text-xs text-gray-500 mt-1">Din achiziții</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">TVA de Plată</span>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calculator className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.payable)}</p>
          <p className="text-xs text-gray-500 mt-1">Sold de plată</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Tranzacții</span>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Receipt className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {breakdown.reduce((acc, b) => acc + b.transactionCount, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Documente procesate</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sumar pe cote TVA
            </button>
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'breakdown'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Detalii pe categorii
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tranzacții
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Cotă TVA</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Bază impozabilă</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">TVA calculat</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Nr. tranzacții</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            item.rate === 19 ? 'bg-blue-500' :
                            item.rate === 9 ? 'bg-green-500' :
                            item.rate === 5 ? 'bg-amber-500' : 'bg-gray-400'
                          }`} />
                          <span className="font-medium text-gray-900">{item.label}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-900">
                        {formatCurrency(item.taxableBase)}
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-gray-900">
                        {formatCurrency(item.vatAmount)}
                      </td>
                      <td className="py-4 px-4 text-right text-gray-600">
                        {item.transactionCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-4 px-4 text-gray-900">Total</td>
                    <td className="py-4 px-4 text-right text-gray-900">
                      {formatCurrency(breakdown.reduce((acc, b) => acc + b.taxableBase, 0))}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-900">
                      {formatCurrency(breakdown.reduce((acc, b) => acc + b.vatAmount, 0))}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600">
                      {breakdown.reduce((acc, b) => acc + b.transactionCount, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Breakdown Tab */}
          {activeTab === 'breakdown' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  TVA Colectat (Vânzări)
                </h3>
                <div className="space-y-3">
                  {breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(item.vatAmount * 0.6)} {/* Mock: 60% from sales */}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-medium text-gray-900">Total colectat</span>
                    <span className="font-bold text-green-600">{formatCurrency(summary.collected)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-blue-600" />
                  TVA Deductibil (Achiziții)
                </h3>
                <div className="space-y-3">
                  {breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(item.vatAmount * 0.4)} {/* Mock: 40% from purchases */}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-medium text-gray-900">Total deductibil</span>
                    <span className="font-bold text-blue-600">{formatCurrency(summary.deductible)}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-blue-900">Sold TVA</h3>
                    <p className="text-sm text-blue-700">
                      TVA Colectat ({formatCurrency(summary.collected)}) - TVA Deductibil ({formatCurrency(summary.deductible)})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.payable)}</p>
                    <p className="text-sm text-blue-600">de plată la buget</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Data</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tip</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Partener</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nr. factură</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Bază</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Cotă</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">TVA</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{formatDate(tx.date)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          tx.type === 'sale' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {tx.type === 'sale' ? 'Vânzare' : 'Achiziție'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{tx.partner}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 font-mono">{tx.invoiceNumber}</td>
                      <td className="py-3 px-4 text-right text-sm text-gray-900">{formatCurrency(tx.taxableBase)}</td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">{tx.vatRate}%</td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">{formatCurrency(tx.vatAmount)}</td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">{formatCurrency(tx.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Afișate {transactions.length} din {breakdown.reduce((acc, b) => acc + b.transactionCount, 0)} tranzacții
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Vezi toate tranzacțiile →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compliance Info */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="w-5 h-5 text-gray-400 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-1">Informații conformitate ANAF</p>
            <ul className="space-y-1">
              <li>• Declarația SAF-T D406 trebuie depusă lunar, până pe data de 25 a lunii următoare</li>
              <li>• Format obligatoriu: XML conform standardului RO_CIUS UBL 2.1</li>
              <li>• Perioada pilot: Septembrie 2025 - August 2026 (perioadă de grație 6 luni)</li>
              <li>• Limită dimensiune fișier: 500 MB (PDF + XML)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
