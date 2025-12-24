'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  FileText,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';

interface ProfitLossReport {
  period: { start: string; end: string };
  currency: string;
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  vatCollected: number;
  vatDeductible: number;
  vatPayable: number;
  netProfit: number;
  profitMargin: number;
  previousPeriod?: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
  };
  revenue: Array<{ label: string; amount: number }>;
  expenses: Array<{ label: string; amount: number }>;
}

interface BalanceSheet {
  asOfDate: string;
  currency: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
  currentAssets: Array<{ code: string; label: string; amount: number }>;
  currentLiabilities: Array<{ code: string; label: string; amount: number }>;
  equity: Array<{ code: string; label: string; amount: number }>;
}

interface MonthlyData {
  period: string;
  monthName: string;
  revenue: number;
  expenses: number;
  profit: number;
  vatPayable: number;
}

export default function ReportsPage() {
  const t = useTranslations('reports');

  const [activeTab, setActiveTab] = useState<'pl' | 'balance' | 'monthly'>('pl');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [plReport, setPlReport] = useState<ProfitLossReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [monthlyData, setMonthlyData] = useState<{ months: MonthlyData[]; totals: any } | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Export report to PDF
  const exportToPdf = async () => {
    setExporting('pdf');
    try {
      const reportType = activeTab === 'pl' ? 'profit-loss' : activeTab === 'balance' ? 'balance-sheet' : 'monthly';
      const response = await api.get(`/export/reports/${reportType}/pdf`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raport-${reportType}-${dateRange.startDate}-${dateRange.endDate}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export PDF error:', error);
    } finally {
      setExporting(null);
    }
  };

  // Export report to Excel
  const exportToExcel = async () => {
    setExporting('excel');
    try {
      const reportType = activeTab === 'pl' ? 'profit-loss' : activeTab === 'balance' ? 'balance-sheet' : 'monthly';
      const response = await api.get(`/export/reports/${reportType}/excel`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raport-${reportType}-${dateRange.startDate}-${dateRange.endDate}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export Excel error:', error);
    } finally {
      setExporting(null);
    }
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const [plRes, balanceRes, monthlyRes] = await Promise.all([
        api.get<ProfitLossReport>(`/reports/profit-loss?${params}`),
        api.get<BalanceSheet>(`/reports/balance-sheet?endDate=${dateRange.endDate}`),
        api.get<{ months: MonthlyData[]; totals: any }>(`/reports/monthly?year=${new Date().getFullYear()}`),
      ]);

      if (plRes.data) setPlReport(plRes.data);
      if (balanceRes.data) setBalanceSheet(balanceRes.data);
      if (monthlyRes.data) setMonthlyData(monthlyRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatCurrency = (amount: number, currency = 'RON') => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title') || 'Rapoarte Financiare'}</h1>
          <p className="text-gray-500">{t('subtitle') || 'Analiza financiara si situatii contabile'}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border rounded-lg p-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="text-sm border-none focus:ring-0"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="text-sm border-none focus:ring-0"
            />
          </div>
          <button
            onClick={fetchReports}
            className="p-2 bg-white border rounded-lg hover:bg-gray-50"
            title={t('refresh') || 'Actualizează'}
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Export buttons */}
          <div className="flex items-center gap-1 bg-white border rounded-lg">
            <button
              onClick={exportToPdf}
              disabled={exporting !== null || loading}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 rounded-l-lg border-r"
              title={t('exportPdf') || 'Exportă PDF'}
            >
              {exporting === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={exporting !== null || loading}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 rounded-r-lg"
              title={t('exportExcel') || 'Exportă Excel'}
            >
              {exporting === 'excel' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('pl')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'pl'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <PieChart className="h-4 w-4 inline mr-2" />
          {t('profitLoss') || 'Profit si Pierdere'}
        </button>
        <button
          onClick={() => setActiveTab('balance')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'balance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="h-4 w-4 inline mr-2" />
          {t('balanceSheet') || 'Bilant Contabil'}
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'monthly'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          {t('monthlyComparison') || 'Comparatie Lunara'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Profit & Loss Tab */}
          {activeTab === 'pl' && plReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t('revenue') || 'Venituri'}</span>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(plReport.totalRevenue, plReport.currency)}
                  </p>
                  {plReport.previousPeriod && (
                    <p className={`text-sm mt-1 flex items-center ${
                      getChangePercent(plReport.totalRevenue, plReport.previousPeriod.totalRevenue) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {getChangePercent(plReport.totalRevenue, plReport.previousPeriod.totalRevenue) >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {formatPercent(getChangePercent(plReport.totalRevenue, plReport.previousPeriod.totalRevenue))}
                    </p>
                  )}
                </div>

                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t('expenses') || 'Cheltuieli'}</span>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(plReport.totalExpenses, plReport.currency)}
                  </p>
                  {plReport.previousPeriod && (
                    <p className={`text-sm mt-1 flex items-center ${
                      getChangePercent(plReport.totalExpenses, plReport.previousPeriod.totalExpenses) <= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {getChangePercent(plReport.totalExpenses, plReport.previousPeriod.totalExpenses) <= 0 ? (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      )}
                      {formatPercent(getChangePercent(plReport.totalExpenses, plReport.previousPeriod.totalExpenses))}
                    </p>
                  )}
                </div>

                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t('netProfit') || 'Profit Net'}</span>
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className={`text-2xl font-bold mt-1 ${
                    plReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(plReport.netProfit, plReport.currency)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('margin') || 'Marja'}: {plReport.profitMargin.toFixed(1)}%
                  </p>
                </div>

                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t('vatPayable') || 'TVA de Plata'}</span>
                    <FileText className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className={`text-2xl font-bold mt-1 ${
                    plReport.vatPayable >= 0 ? 'text-purple-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(Math.abs(plReport.vatPayable), plReport.currency)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {plReport.vatPayable >= 0
                      ? (t('toPay') || 'De plata')
                      : (t('toRecover') || 'De recuperat')}
                  </p>
                </div>
              </div>

              {/* Revenue & Expenses Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('revenueByPartner') || 'Venituri pe Clienti'}</h3>
                  <div className="space-y-3">
                    {plReport.revenue.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate max-w-[60%]">{item.label}</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(item.amount, plReport.currency)}
                        </span>
                      </div>
                    ))}
                    {plReport.revenue.length === 0 && (
                      <p className="text-sm text-gray-400">{t('noData') || 'Nu exista date'}</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('expensesBySupplier') || 'Cheltuieli pe Furnizori'}</h3>
                  <div className="space-y-3">
                    {plReport.expenses.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate max-w-[60%]">{item.label}</span>
                        <span className="text-sm font-medium text-red-600">
                          {formatCurrency(item.amount, plReport.currency)}
                        </span>
                      </div>
                    ))}
                    {plReport.expenses.length === 0 && (
                      <p className="text-sm text-gray-400">{t('noData') || 'Nu exista date'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* VAT Summary */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('vatSummary') || 'Sumar TVA'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">{t('vatCollected') || 'TVA Colectat'}</p>
                    <p className="text-xl font-bold text-green-800">
                      {formatCurrency(plReport.vatCollected, plReport.currency)}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700">{t('vatDeductible') || 'TVA Deductibil'}</p>
                    <p className="text-xl font-bold text-red-800">
                      {formatCurrency(plReport.vatDeductible, plReport.currency)}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${plReport.vatPayable >= 0 ? 'bg-purple-50' : 'bg-blue-50'}`}>
                    <p className={`text-sm ${plReport.vatPayable >= 0 ? 'text-purple-700' : 'text-blue-700'}`}>
                      {plReport.vatPayable >= 0
                        ? (t('vatPayable') || 'TVA de Plata')
                        : (t('vatRecoverable') || 'TVA de Recuperat')}
                    </p>
                    <p className={`text-xl font-bold ${plReport.vatPayable >= 0 ? 'text-purple-800' : 'text-blue-800'}`}>
                      {formatCurrency(Math.abs(plReport.vatPayable), plReport.currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Balance Sheet Tab */}
          {activeTab === 'balance' && balanceSheet && (
            <div className="space-y-6">
              {/* Balance Check */}
              <div className={`p-4 rounded-lg ${balanceSheet.isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm font-medium ${balanceSheet.isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                  {balanceSheet.isBalanced
                    ? (t('balanceOk') || 'Bilantul este echilibrat: Active = Pasive + Capitaluri')
                    : (t('balanceError') || 'Atentie: Bilantul nu este echilibrat!')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('assets') || 'Active'}</h3>
                  <div className="space-y-3">
                    {balanceSheet.currentAssets.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium">{formatCurrency(item.amount, balanceSheet.currency)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between font-semibold">
                      <span>{t('totalAssets') || 'Total Active'}</span>
                      <span className="text-blue-600">{formatCurrency(balanceSheet.totalAssets, balanceSheet.currency)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('liabilities') || 'Datorii'}</h3>
                  <div className="space-y-3">
                    {balanceSheet.currentLiabilities.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium">{formatCurrency(item.amount, balanceSheet.currency)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between font-semibold">
                      <span>{t('totalLiabilities') || 'Total Datorii'}</span>
                      <span className="text-red-600">{formatCurrency(balanceSheet.totalLiabilities, balanceSheet.currency)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('equity') || 'Capitaluri Proprii'}</h3>
                  <div className="space-y-3">
                    {balanceSheet.equity.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.label}</span>
                        <span className={`font-medium ${item.amount >= 0 ? '' : 'text-red-600'}`}>
                          {formatCurrency(item.amount, balanceSheet.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between font-semibold">
                      <span>{t('totalEquity') || 'Total Capitaluri'}</span>
                      <span className={balanceSheet.totalEquity >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(balanceSheet.totalEquity, balanceSheet.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Comparison Tab */}
          {activeTab === 'monthly' && monthlyData && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('month') || 'Luna'}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('revenue') || 'Venituri'}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('expenses') || 'Cheltuieli'}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('profit') || 'Profit'}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('vat') || 'TVA'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {monthlyData.months.map((month, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                            {month.monthName}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">
                            {formatCurrency(month.revenue)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">
                            {formatCurrency(month.expenses)}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${
                            month.profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(month.profit)}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${
                            month.vatPayable >= 0 ? 'text-purple-600' : 'text-blue-600'
                          }`}>
                            {formatCurrency(month.vatPayable)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-900">{t('total') || 'Total'}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-600">
                          {formatCurrency(monthlyData.totals.revenue)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">
                          {formatCurrency(monthlyData.totals.expenses)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${
                          monthlyData.totals.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(monthlyData.totals.profit)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${
                          monthlyData.totals.vatPayable >= 0 ? 'text-purple-600' : 'text-blue-600'
                        }`}>
                          {formatCurrency(monthlyData.totals.vatPayable)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
