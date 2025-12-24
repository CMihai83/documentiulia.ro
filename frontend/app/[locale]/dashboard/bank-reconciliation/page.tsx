'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Building2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  Download,
  Upload,
  Filter,
  Search,
  ChevronDown,
  Link2,
  Link2Off,
  FileText,
  TrendingUp,
  Loader2,
  Plus,
  Settings,
  Eye,
  MoreVertical,
} from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  currency: string;
  balance: number;
  lastSync: Date;
  status: 'active' | 'inactive' | 'pending_verification';
  psd2Connected: boolean;
}

interface BankTransaction {
  id: string;
  accountId: string;
  date: Date;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  counterparty: string;
  type: 'credit' | 'debit';
  reconciliationStatus: 'pending' | 'matched' | 'unmatched' | 'disputed';
  matchedInvoiceId?: string;
}

interface ReconciliationSession {
  id: string;
  accountId: string;
  startDate: Date;
  endDate: Date;
  status: 'in_progress' | 'completed' | 'reviewed';
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  disputedTransactions: number;
}

interface DashboardStats {
  accounts: {
    total: number;
    active: number;
    psd2Connected: number;
    totalBalance: number;
  };
  transactions: {
    pending: number;
    matched: number;
    unmatched: number;
    disputed: number;
  };
  reconciliation: {
    lastSessionDate?: Date;
    matchRate: number;
    pendingReview: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function BankReconciliationPage() {
  const t = useTranslations('bankReconciliation');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'transactions' | 'sessions'>('overview');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [sessions, setSessions] = useState<ReconciliationSession[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      setStats({
        accounts: {
          total: 3,
          active: 3,
          psd2Connected: 2,
          totalBalance: 179450.50,
        },
        transactions: {
          pending: 12,
          matched: 145,
          unmatched: 5,
          disputed: 2,
        },
        reconciliation: {
          lastSessionDate: new Date(),
          matchRate: 89.5,
          pendingReview: 1,
        },
      });

      setAccounts([
        {
          id: 'acc-001',
          bankName: 'Banca Transilvania',
          accountNumber: 'RO49BTRL...',
          iban: 'RO49BTRLRONCRT0123456789',
          currency: 'RON',
          balance: 125750.50,
          lastSync: new Date(),
          status: 'active',
          psd2Connected: true,
        },
        {
          id: 'acc-002',
          bankName: 'ING Bank',
          accountNumber: 'RO84INGB...',
          iban: 'RO84INGBRONN123456789012',
          currency: 'RON',
          balance: 45200.00,
          lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'active',
          psd2Connected: true,
        },
        {
          id: 'acc-003',
          bankName: 'BCR',
          accountNumber: 'RO65RNCB...',
          iban: 'RO65RNCBRONN098765432109',
          currency: 'EUR',
          balance: 8500.00,
          lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: 'active',
          psd2Connected: false,
        },
      ]);

      setTransactions([
        {
          id: 'txn-001',
          accountId: 'acc-001',
          date: new Date(),
          amount: 15000,
          currency: 'RON',
          description: 'Încasare factură FC-2024-0125',
          reference: 'REF-12345',
          counterparty: 'ABC SRL',
          type: 'credit',
          reconciliationStatus: 'matched',
          matchedInvoiceId: 'INV-125',
        },
        {
          id: 'txn-002',
          accountId: 'acc-001',
          date: new Date(Date.now() - 86400000),
          amount: -3500,
          currency: 'RON',
          description: 'Plată furnizor materiale',
          reference: 'REF-12346',
          counterparty: 'XYZ IMPEX',
          type: 'debit',
          reconciliationStatus: 'pending',
        },
        {
          id: 'txn-003',
          accountId: 'acc-001',
          date: new Date(Date.now() - 172800000),
          amount: -8500,
          currency: 'RON',
          description: 'Salarii noiembrie 2024',
          reference: 'SALARY-NOV',
          counterparty: 'SALARIES',
          type: 'debit',
          reconciliationStatus: 'matched',
        },
        {
          id: 'txn-004',
          accountId: 'acc-002',
          date: new Date(Date.now() - 259200000),
          amount: 25000,
          currency: 'RON',
          description: 'Încasare comandă #1234',
          reference: 'ORD-1234',
          counterparty: 'EURO TECH',
          type: 'credit',
          reconciliationStatus: 'unmatched',
        },
        {
          id: 'txn-005',
          accountId: 'acc-001',
          date: new Date(Date.now() - 345600000),
          amount: -1200,
          currency: 'RON',
          description: 'ENEL factură energie',
          reference: 'ENEL-12345',
          counterparty: 'ENEL ENERGIE',
          type: 'debit',
          reconciliationStatus: 'matched',
        },
      ]);

      setSessions([
        {
          id: 'session-001',
          accountId: 'acc-001',
          startDate: new Date(Date.now() - 30 * 86400000),
          endDate: new Date(),
          status: 'completed',
          totalTransactions: 145,
          matchedTransactions: 138,
          unmatchedTransactions: 5,
          disputedTransactions: 2,
        },
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAccount = async (accountId: string) => {
    setSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  const handleAutoMatch = async () => {
    setSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      matched: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      unmatched: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      disputed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    const labels: Record<string, string> = {
      pending: 'În așteptare',
      matched: 'Potrivit',
      unmatched: 'Nepotrivit',
      disputed: 'Contestat',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'RON') => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const filteredTransactions = transactions.filter(txn => {
    if (selectedAccount && txn.accountId !== selectedAccount) return false;
    if (statusFilter !== 'all' && txn.reconciliationStatus !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        txn.description.toLowerCase().includes(query) ||
        txn.counterparty.toLowerCase().includes(query) ||
        txn.reference.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reconciliere Bancară
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            PSD2 & potrivire automată tranzacții
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleAutoMatch()}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
            Auto-Potrivire
          </button>
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sold Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(stats?.accounts.totalBalance || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {stats?.accounts.active} conturi active
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tranzacții Potrivite</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {stats?.transactions.matched || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {stats?.reconciliation.matchRate}% rată de potrivire
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">În Așteptare</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {stats?.transactions.pending || 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Necesită verificare
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nepotrivite</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {(stats?.transactions.unmatched || 0) + (stats?.transactions.disputed || 0)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Necesită acțiune
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {[
            { key: 'overview', label: 'Prezentare Generală' },
            { key: 'accounts', label: 'Conturi Bancare' },
            { key: 'transactions', label: 'Tranzacții' },
            { key: 'sessions', label: 'Sesiuni Reconciliere' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">Tranzacții Recente</h3>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Vezi toate
              </button>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.slice(0, 5).map(txn => (
                <div key={txn.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${txn.type === 'credit' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {txn.type === 'credit' ? (
                        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400 rotate-180" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{txn.counterparty}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{txn.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.type === 'credit' ? '+' : ''}{formatCurrency(txn.amount, txn.currency)}
                    </p>
                    {getStatusBadge(txn.reconciliationStatus)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bank Accounts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">Conturi Bancare</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Adaugă cont
              </button>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {accounts.map(account => (
                <div key={account.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{account.bankName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{account.iban}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.psd2Connected ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Link2 className="w-3 h-3" />
                          PSD2
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Link2Off className="w-3 h-3" />
                          Manual
                        </span>
                      )}
                      <button
                        onClick={() => handleSyncAccount(account.id)}
                        disabled={syncing}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${syncing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Ultima sincronizare: {formatDate(account.lastSync)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'accounts' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">Conturi Bancare Conectate</h3>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Conectează Cont Nou
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bancă</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">IBAN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sold</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Conexiune</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ultima Sincronizare</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {accounts.map(account => (
                  <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{account.bankName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">{account.iban}</td>
                    <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(account.balance, account.currency)}
                    </td>
                    <td className="px-4 py-4">
                      {account.psd2Connected ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                          PSD2 Conectat
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(account.lastSync)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSyncAccount(account.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="Sincronizează"
                        >
                          <RefreshCw className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Setări">
                          <Settings className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Caută tranzacții..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={selectedAccount || ''}
              onChange={e => setSelectedAccount(e.target.value || null)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Toate conturile</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.bankName}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Toate statusurile</option>
              <option value="pending">În așteptare</option>
              <option value="matched">Potrivite</option>
              <option value="unmatched">Nepotrivite</option>
              <option value="disputed">Contestate</option>
            </select>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Descriere</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contrapartidă</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sumă</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map(txn => (
                  <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(txn.date)}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{txn.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ref: {txn.reference}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{txn.counterparty}</td>
                    <td className={`px-4 py-4 text-sm font-semibold text-right ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.amount >= 0 ? '+' : ''}{formatCurrency(txn.amount, txn.currency)}
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(txn.reconciliationStatus)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {txn.reconciliationStatus === 'pending' && (
                          <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                            Potrivește
                          </button>
                        )}
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">Istoric Sesiuni Reconciliere</h3>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Sesiune Nouă
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cont</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Perioadă</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Potrivite</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nepotrivite</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sessions.map(session => {
                  const account = accounts.find(a => a.id === session.accountId);
                  return (
                    <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{account?.bankName}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(session.startDate).toLocaleDateString('ro-RO')} - {new Date(session.endDate).toLocaleDateString('ro-RO')}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{session.totalTransactions}</td>
                      <td className="px-4 py-4">
                        <span className="text-green-600 font-medium">{session.matchedTransactions}</span>
                        <span className="text-gray-400 text-xs ml-1">
                          ({Math.round((session.matchedTransactions / session.totalTransactions) * 100)}%)
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-red-600 font-medium">{session.unmatchedTransactions + session.disputedTransactions}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : session.status === 'reviewed'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {session.status === 'completed' ? 'Finalizat' : session.status === 'reviewed' ? 'Verificat' : 'În progres'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Vezi detalii">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Descarcă raport">
                            <Download className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
