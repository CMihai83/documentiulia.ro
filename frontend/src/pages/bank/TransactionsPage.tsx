import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface BankTransaction {
  id: string;
  transaction_date: string;
  amount: number;
  currency: string;
  description: string;
  clean_description: string;
  counterparty_name: string | null;
  category: string;
  subcategory: string | null;
  category_confidence: number;
  transaction_type: string;
  status: string;
  institution_name: string;
  account_name: string;
  account_number: string;
}

interface TransactionStats {
  total_transactions: number;
  total_income: number;
  total_expenses: number;
  active_connections: number;
  pending_transactions: number;
  matched_transactions: number;
}

const TransactionsPage: React.FC = () => {
  const { token, companyId } = useAuth();
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date_from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    category: '',
    status: '',
  });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, [filters]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', '100');

      const response = await fetch(
        `https://documentiulia.ro/api/v1/bank/transactions.php?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || '',
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      params.append('from_date', filters.date_from);
      params.append('to_date', filters.date_to);

      const response = await fetch(
        `https://documentiulia.ro/api/v1/bank/transaction-stats.php?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || '',
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleUpdateCategory = async (transactionId: string, category: string) => {
    try {
      const response = await fetch('https://documentiulia.ro/api/v1/bank/transactions.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || '',
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          category: category,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTransactions();
        setEditingCategory(null);
      } else {
        alert('Eroare: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Eroare la actualizare categorie');
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      'income_salary': 'Venit - Salariu',
      'income_refund': 'Venit - Rambursare',
      'income_other': 'Venit - Altele',
      'groceries': 'Alimente',
      'transportation_fuel': 'Transport - Combustibil',
      'dining_out': 'Restaurante',
      'utilities': 'Utilități',
      'rent': 'Chirie',
      'cash_withdrawal': 'Retragere numerar',
      'uncategorized': 'Necategorizat',
    };
    return labels[category] || category;
  };

  const getCategoryBadge = (category: string, confidence: number) => {
    const isIncome = category.startsWith('income_');
    const bgColor = isIncome ? 'bg-green-100' : confidence >= 70 ? 'bg-blue-100' : 'bg-gray-100';
    const textColor = isIncome ? 'text-green-800' : confidence >= 70 ? 'text-blue-800' : 'text-gray-800';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {getCategoryLabel(category)}
        {confidence < 100 && (
          <span className="ml-1 text-xs opacity-75">({Math.round(confidence)}%)</span>
        )}
      </span>
    );
  };

  const formatAmount = (amount: number, currency: string) => {
    const color = amount >= 0 ? 'text-green-600' : 'text-red-600';
    const sign = amount >= 0 ? '+' : '';
    return (
      <span className={`font-semibold ${color}`}>
        {sign}{amount.toFixed(2)} {currency}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tranzacții bancare</h1>
        <p className="mt-2 text-sm text-gray-600">
          Vizualizați și gestionați toate tranzacțiile sincronizate din conturile bancare
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total tranzacții</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.total_transactions}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total venituri</dt>
              <dd className="mt-1 text-3xl font-semibold text-green-600">
                +{Number(stats.total_income).toFixed(2)} RON
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total cheltuieli</dt>
              <dd className="mt-1 text-3xl font-semibold text-red-600">
                -{Number(stats.total_expenses).toFixed(2)} RON
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Reconciliate</dt>
              <dd className="mt-1 text-3xl font-semibold text-blue-600">{stats.matched_transactions}</dd>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filtre</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">De la data</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Până la data</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Categorie</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Toate categoriile</option>
              <option value="groceries">Alimente</option>
              <option value="transportation_fuel">Transport</option>
              <option value="dining_out">Restaurante</option>
              <option value="utilities">Utilități</option>
              <option value="income_salary">Salariu</option>
              <option value="uncategorized">Necategorizat</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Toate statusurile</option>
              <option value="booked">Confirmat</option>
              <option value="pending">În așteptare</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Se încarcă...</div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nicio tranzacție</h3>
            <p className="mt-1 text-sm text-gray-500">Nu s-au găsit tranzacții pentru criteriile selectate.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descriere</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cont</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categorie</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sumă</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{transaction.clean_description || transaction.description}</div>
                      {transaction.counterparty_name && (
                        <div className="text-xs text-gray-500">{transaction.counterparty_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{transaction.institution_name}</div>
                      <div className="text-xs">****{transaction.account_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCategory === transaction.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="groceries">Alimente</option>
                            <option value="transportation_fuel">Transport</option>
                            <option value="dining_out">Restaurante</option>
                            <option value="utilities">Utilități</option>
                            <option value="rent">Chirie</option>
                            <option value="income_salary">Salariu</option>
                            <option value="uncategorized">Necategorizat</option>
                          </select>
                          <button
                            onClick={() => handleUpdateCategory(transaction.id, newCategory)}
                            className="text-green-600 hover:text-green-900"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="text-red-600 hover:text-red-900"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingCategory(transaction.id);
                            setNewCategory(transaction.category);
                          }}
                          className="cursor-pointer"
                        >
                          {getCategoryBadge(transaction.category, transaction.category_confidence)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {formatAmount(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">
                        Reconciliază
                      </button>
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
};

export default TransactionsPage;
