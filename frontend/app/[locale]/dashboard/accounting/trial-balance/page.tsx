'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import {
  Scale,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Filter,
} from 'lucide-react';

interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

interface Totals {
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export default function TrialBalancePage() {
  const t = useTranslations('accounting');

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [balanced, setBalanced] = useState(true);

  const now = new Date();
  const [filters, setFilters] = useState({
    startDate: `${now.getFullYear()}-01-01`,
    endDate: now.toISOString().split('T')[0],
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/v1/accounting/trial-balance?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRows(data.rows || []);
        setTotals(data.totals || null);
        setBalanced(data.balanced);
      }
    } catch (err) {
      console.error('Error fetching trial balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchData();
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/v1/accounting/export/trial-balance?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `balanta_verificare_${filters.startDate}_${filters.endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const getAccountTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      ASSET: 'bg-blue-100 text-blue-800',
      LIABILITY: 'bg-red-100 text-red-800',
      EQUITY: 'bg-purple-100 text-purple-800',
      REVENUE: 'bg-green-100 text-green-800',
      EXPENSE: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold text-gray-900">Balanta de Verificare</h1>
          <p className="text-gray-600">Situatie centralizatoare a conturilor</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ${showFilters ? 'bg-gray-100' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filtre
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizeaza
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Perioada</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data inceput</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data sfarsit</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilter}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Genereaza balanta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Status */}
      <div className={`p-4 rounded-lg flex items-center gap-3 ${balanced ? 'bg-green-50' : 'bg-red-50'}`}>
        {balanced ? (
          <>
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Balanta este echilibrata</p>
              <p className="text-sm text-green-700">Total debit = Total credit</p>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Balanta nu este echilibrata!</p>
              <p className="text-sm text-red-700">Verificati inregistrarile contabile</p>
            </div>
          </>
        )}
      </div>

      {/* Summary Cards */}
      {totals && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <Scale className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Rulaje Perioada</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Debit</p>
                <p className="text-lg font-bold text-green-600">{totals.periodDebit.toLocaleString('ro-RO')} RON</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Credit</p>
                <p className="text-lg font-bold text-red-600">{totals.periodCredit.toLocaleString('ro-RO')} RON</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <Scale className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Solduri Finale</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Debit</p>
                <p className="text-lg font-bold text-green-600">{totals.closingDebit.toLocaleString('ro-RO')} RON</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Credit</p>
                <p className="text-lg font-bold text-red-600">{totals.closingCredit.toLocaleString('ro-RO')} RON</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Perioada</span>
            </div>
            <p className="text-lg font-bold">{filters.startDate}</p>
            <p className="text-sm text-gray-500">pana la {filters.endDate}</p>
          </div>
        </div>
      )}

      {/* Trial Balance Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Balanta de Verificare - {rows.length} conturi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" rowSpan={2}>Cont</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" rowSpan={2}>Denumire</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" rowSpan={2}>Tip</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l" colSpan={2}>Rulaje Perioada</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l" colSpan={2}>Solduri Finale</th>
              </tr>
              <tr>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-l">Debit</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-l">Debit</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nu exista inregistrari pentru perioada selectata
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{row.accountCode}</td>
                    <td className="px-4 py-3 text-sm">{row.accountName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getAccountTypeBadge(row.accountType)}`}>
                        {row.accountType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600 border-l">
                      {row.periodDebit > 0 ? row.periodDebit.toLocaleString('ro-RO') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">
                      {row.periodCredit > 0 ? row.periodCredit.toLocaleString('ro-RO') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600 border-l">
                      {row.closingDebit > 0 ? row.closingDebit.toLocaleString('ro-RO') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                      {row.closingCredit > 0 ? row.closingCredit.toLocaleString('ro-RO') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {totals && (
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right text-green-700 border-l">
                    {totals.periodDebit.toLocaleString('ro-RO')}
                  </td>
                  <td className="px-4 py-3 text-right text-red-700">
                    {totals.periodCredit.toLocaleString('ro-RO')}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700 border-l">
                    {totals.closingDebit.toLocaleString('ro-RO')}
                  </td>
                  <td className="px-4 py-3 text-right text-red-700">
                    {totals.closingCredit.toLocaleString('ro-RO')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
