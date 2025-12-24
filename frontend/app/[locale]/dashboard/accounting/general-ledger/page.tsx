'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Filter,
  FileText,
} from 'lucide-react';

interface LedgerEntry {
  date: string;
  entryId: string;
  description: string;
  reference?: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface AccountGroup {
  accountCode: string;
  accountName: string;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
}

interface ChartAccount {
  code: string;
  name: string;
  type: string;
  balance: number;
  debit: number;
  credit: number;
}

export default function GeneralLedgerPage() {
  const t = useTranslations('accounting');

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [byAccount, setByAccount] = useState<AccountGroup[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartAccount[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState({
    accountCode: '',
    startDate: '',
    endDate: '',
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (filters.accountCode) params.append('accountCode', filters.accountCode);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const [ledgerRes, chartRes] = await Promise.all([
        fetch(`/api/v1/accounting/general-ledger?${params}`, { headers }),
        fetch('/api/v1/accounting/chart-of-accounts', { headers }),
      ]);

      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setEntries(data.entries || []);
        setByAccount(data.byAccount || []);
      }

      if (chartRes.ok) {
        const data = await chartRes.json();
        setChartOfAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchData();
  };

  const toggleAccount = (code: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedAccounts(newExpanded);
  };

  const getAccountTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      ASSET: 'bg-blue-100 text-blue-800',
      LIABILITY: 'bg-red-100 text-red-800',
      EQUITY: 'bg-purple-100 text-purple-800',
      REVENUE: 'bg-green-100 text-green-800',
      EXPENSE: 'bg-orange-100 text-orange-800',
    };
    const labels: Record<string, string> = {
      ASSET: 'Activ',
      LIABILITY: 'Pasiv',
      EQUITY: 'Capital',
      REVENUE: 'Venit',
      EXPENSE: 'Cheltuiala',
    };
    return { color: colors[type] || 'bg-gray-100 text-gray-800', label: labels[type] || type };
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
        a.download = 'registru_general.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
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
          <h1 className="text-2xl font-bold text-gray-900">Registru General</h1>
          <p className="text-gray-600">Cartea Mare - Miscari pe conturi</p>
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
            Export
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
          <h3 className="font-semibold text-gray-900 mb-4">Filtre</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cont</label>
              <select
                value={filters.accountCode}
                onChange={(e) => setFilters({ ...filters, accountCode: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Toate conturile</option>
                {chartOfAccounts.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>
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
                Aplica filtre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Conturi Active</p>
              <p className="text-xl font-bold">{byAccount.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Inregistrari</p>
              <p className="text-xl font-bold">{entries.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Perioada</p>
              <p className="text-sm font-medium">
                {filters.startDate || 'Inceput'} - {filters.endDate || 'Prezent'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger by Account */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Registru pe Conturi
          </h3>
        </div>

        {byAccount.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nu exista inregistrari pentru perioada selectata
          </div>
        ) : (
          <div className="divide-y">
            {byAccount.map((group) => {
              const isExpanded = expandedAccounts.has(group.accountCode);
              const account = chartOfAccounts.find(a => a.code === group.accountCode);
              const typeBadge = account ? getAccountTypeBadge(account.type) : { color: '', label: '' };

              return (
                <div key={group.accountCode}>
                  <button
                    onClick={() => toggleAccount(group.accountCode)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium">
                          {group.accountCode} - {group.accountName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {group.entries.length} inregistrari
                        </p>
                      </div>
                      {typeBadge.label && (
                        <span className={`px-2 py-1 text-xs rounded-full ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-8 text-right">
                      <div>
                        <p className="text-sm text-gray-500">Debit</p>
                        <p className="font-medium text-green-600">{group.totalDebit.toLocaleString('ro-RO')} RON</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Credit</p>
                        <p className="font-medium text-red-600">{group.totalCredit.toLocaleString('ro-RO')} RON</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Sold</p>
                        <p className="font-bold">
                          {(group.totalDebit - group.totalCredit).toLocaleString('ro-RO')} RON
                        </p>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50 border-t">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Referinta</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descriere</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {group.entries.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-gray-100">
                              <td className="px-4 py-2 text-sm">
                                {new Date(entry.date).toLocaleDateString('ro-RO')}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">{entry.reference || '-'}</td>
                              <td className="px-4 py-2 text-sm">{entry.description}</td>
                              <td className="px-4 py-2 text-sm text-right text-green-600">
                                {entry.debit > 0 ? entry.debit.toLocaleString('ro-RO') : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-red-600">
                                {entry.credit > 0 ? entry.credit.toLocaleString('ro-RO') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
