import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Filter } from 'lucide-react';
import { generalLedgerService, type GeneralLedgerEntry, type GeneralLedgerSummary } from '../../services/accounting/generalLedgerService';

const GeneralLedgerPage: React.FC = () => {
  const [entries, setEntries] = useState<GeneralLedgerEntry[]>([]);
  const [summary, setSummary] = useState<GeneralLedgerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'entries' | 'summary'>('entries');

  // Filters
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [entryType, setEntryType] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [selectedAccount, startDate, endDate, entryType, view]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = {
        account_id: selectedAccount || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        entry_type: entryType !== 'all' ? entryType : undefined,
      };

      if (view === 'entries') {
        const response = await generalLedgerService.list(filters);
        setEntries(response.entries || []);
      } else {
        const summaryData = await generalLedgerService.getSummary(filters);
        setSummary(summaryData);
      }
    } catch (error) {
      console.error('Error loading general ledger:', error);
      alert('Eroare la încărcarea registrului general');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      const blob = await generalLedgerService.exportToExcel({
        account_id: selectedAccount || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `general-ledger-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Eroare la exportul în Excel');
    }
  };

  // Preset date ranges helper
  const setDateRange = (range: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    let start: Date;
    let end: Date = today;

    switch (range) {
      case 'today':
        start = today;
        break;
      case 'week':
        start = new Date(today);
        start.setDate(day - today.getDay()); // Start of week (Sunday)
        break;
      case 'month':
        start = new Date(year, month, 1); // First day of month
        break;
      case 'quarter':
        const quarter = Math.floor(month / 3);
        start = new Date(year, quarter * 3, 1); // First day of quarter
        break;
      case 'year':
        start = new Date(year, 0, 1); // January 1st
        break;
      default:
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Registru General (General Ledger)</h1>
              <p className="mt-1 text-sm text-gray-500">
                Vizualizare completă a tuturor tranzacțiilor contabile
              </p>
            </div>
            <button
              onClick={handleExportToExcel}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Filtre</h3>
          </div>

          {/* Preset Date Range Buttons */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Perioade Predefinite
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDateRange('today')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Astăzi
              </button>
              <button
                onClick={() => setDateRange('week')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Săptămâna Aceasta
              </button>
              <button
                onClick={() => setDateRange('month')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Luna Aceasta
              </button>
              <button
                onClick={() => setDateRange('quarter')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Trimestrul Acesta
              </button>
              <button
                onClick={() => setDateRange('year')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Anul Acesta
              </button>
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Resetează
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cont
              </label>
              <input
                type="text"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                placeholder="Cod sau nume cont..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data început
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data sfârșit
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tip înregistrare
              </label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">Toate</option>
                <option value="general">General</option>
                <option value="invoice">Factură</option>
                <option value="payment">Plată</option>
                <option value="expense">Cheltuială</option>
              </select>
            </div>
          </div>

          {/* View Tabs */}
          <div className="mt-4 border-t pt-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setView('entries')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  view === 'entries'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Înregistrări Detaliate
              </button>
              <button
                onClick={() => setView('summary')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  view === 'summary'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sumar Conturi
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : view === 'entries' ? (
          /* Entries Table */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cont
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descriere
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referință
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sold
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        Nu există înregistrări pentru filtrele selectate
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(entry.transaction_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.account_code}
                          </div>
                          <div className="text-sm text-gray-500">{entry.account_name}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {entry.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.reference}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className={`text-sm font-medium ${
                            entry.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(entry.balance)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Summary Table */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cont
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sold Inițial
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Debit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Credit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sold Final
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summary.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Nu există date pentru perioada selectată
                      </td>
                    </tr>
                  ) : (
                    summary.map((item) => (
                      <tr key={item.account_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.account_code}
                          </div>
                          <div className="text-sm text-gray-500">{item.account_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(item.opening_balance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                          {formatCurrency(item.total_debit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                          {formatCurrency(item.total_credit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className={`text-sm font-medium ${
                            item.closing_balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(item.closing_balance)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralLedgerPage;
