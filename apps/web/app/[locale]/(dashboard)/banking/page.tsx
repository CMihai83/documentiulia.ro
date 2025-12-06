'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  MoreVertical,
  Landmark,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Link2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Wallet,
  PiggyBank,
} from 'lucide-react';
import { BankAccountModal } from '@/components/banking/bank-account-modal';
import { useCompanyStore } from '@/lib/store/company-store';

// Mock data for bank accounts
const mockAccounts = [
  {
    id: '1',
    accountName: 'Cont Principal',
    bankName: 'Banca Transilvania',
    bankLogo: 'BT',
    iban: 'RO49 BTRL 0301 1202 A123 4567',
    currency: 'RON',
    balance: 45678.90,
    lastSync: '2024-11-30T10:30:00',
    isDefault: true,
    accountType: 'current' as const,
    monthlyChange: 12.5,
  },
  {
    id: '2',
    accountName: 'Cont EUR',
    bankName: 'ING Bank',
    bankLogo: 'ING',
    iban: 'RO89 INGB 0001 0002 1234 5678',
    currency: 'EUR',
    balance: 8540.25,
    lastSync: '2024-11-30T10:30:00',
    isDefault: false,
    accountType: 'current' as const,
    monthlyChange: -3.2,
  },
  {
    id: '3',
    accountName: 'Cont Economii',
    bankName: 'BCR',
    bankLogo: 'BCR',
    iban: 'RO12 RNCB 0082 1234 5678 0001',
    currency: 'RON',
    balance: 125000.00,
    lastSync: '2024-11-29T18:00:00',
    isDefault: false,
    accountType: 'savings' as const,
    monthlyChange: 0.8,
  },
];

// Mock transactions
const mockTransactions = [
  {
    id: '1',
    date: '2024-11-30',
    description: 'Încasare factură - Client ABC SRL',
    amount: 5600.00,
    type: 'credit' as const,
    accountId: '1',
    category: 'Venituri',
    status: 'completed' as const,
  },
  {
    id: '2',
    date: '2024-11-29',
    description: 'Plată furnizor - Enel Energie',
    amount: -1250.50,
    type: 'debit' as const,
    accountId: '1',
    category: 'Utilități',
    status: 'completed' as const,
  },
  {
    id: '3',
    date: '2024-11-29',
    description: 'Transfer intern - Către Cont EUR',
    amount: -2000.00,
    type: 'transfer' as const,
    accountId: '1',
    category: 'Transfer',
    status: 'completed' as const,
  },
  {
    id: '4',
    date: '2024-11-28',
    description: 'Încasare factură - Client XYZ',
    amount: 3200.00,
    type: 'credit' as const,
    accountId: '1',
    category: 'Venituri',
    status: 'completed' as const,
  },
  {
    id: '5',
    date: '2024-11-28',
    description: 'Plată salarii noiembrie',
    amount: -15000.00,
    type: 'debit' as const,
    accountId: '1',
    category: 'Salarii',
    status: 'completed' as const,
  },
];

export default function BankingPage() {
  const { selectedCompanyId } = useCompanyStore();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(mockAccounts[0]?.id || null);
  const [showBalances, setShowBalances] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate total balance in RON (simple conversion)
  const totalBalance = mockAccounts.reduce((sum, acc) => {
    const convertedBalance = acc.currency === 'EUR' ? acc.balance * 4.97 : acc.balance;
    return sum + convertedBalance;
  }, 0);

  const formatCurrency = (amount: number, currency: string = 'RON') => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter transactions for selected account
  const accountTransactions = mockTransactions.filter(
    (t) => !selectedAccount || t.accountId === selectedAccount
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Conturi Bancare
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gestionează conturile și tranzacțiile firmei
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Link2 className="w-4 h-4" />
            Conectare Open Banking
          </button>
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/25"
          >
            <Plus className="w-4 h-4" />
            Adaugă Cont
          </button>
        </div>
      </div>

      {/* Total Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
              <span className="font-medium">Sold Total</span>
            </div>
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {showBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <p className="text-4xl font-bold mb-1">
            {showBalances ? formatCurrency(totalBalance) : '••••••••'}
          </p>
          <p className="text-emerald-100">
            din {mockAccounts.length} conturi active
          </p>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm">+12.500 RON luna aceasta</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockAccounts.map((account, index) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedAccount(account.id)}
            className={`p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all cursor-pointer ${
              selectedAccount === account.id
                ? 'border-emerald-500 shadow-lg shadow-emerald-500/10'
                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                  {account.bankLogo}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {account.accountName}
                  </p>
                  <p className="text-sm text-gray-500">{account.bankName}</p>
                </div>
              </div>
              {account.isDefault && (
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">
                  Implicit
                </span>
              )}
            </div>

            <div className="mb-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {showBalances ? formatCurrency(account.balance, account.currency) : '••••••'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {account.monthlyChange >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm ${account.monthlyChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {account.monthlyChange >= 0 ? '+' : ''}{account.monthlyChange}% luna aceasta
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 font-mono">
                {account.iban.slice(0, 19)}...
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <RefreshCw className="w-3 h-3" />
                {formatTime(account.lastSync)}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Add Account Card */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: mockAccounts.length * 0.1 }}
          onClick={() => setIsAccountModalOpen(true)}
          className="p-5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all min-h-[200px]"
        >
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
            <Plus className="w-6 h-6 text-emerald-600" />
          </div>
          <span className="font-medium text-gray-600 dark:text-gray-400">
            Adaugă Cont Nou
          </span>
        </motion.button>
      </div>

      {/* Transactions Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tranzacții Recente
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută tranzacție..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <button className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {accountTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Nu există tranzacții pentru acest cont
              </p>
            </div>
          ) : (
            accountTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${
                      transaction.type === 'credit'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : transaction.type === 'transfer'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {transaction.type === 'credit' ? (
                        <ArrowDownLeft className={`w-5 h-5 text-green-600`} />
                      ) : transaction.type === 'transfer' ? (
                        <RefreshCw className={`w-5 h-5 text-blue-600`} />
                      ) : (
                        <ArrowUpRight className={`w-5 h-5 text-red-600`} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {formatDate(transaction.date)}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500">
                          {transaction.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.amount >= 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'
                    }`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs text-gray-400">Confirmat</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* View All Link */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button className="w-full py-2.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center justify-center gap-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
            Vezi toate tranzacțiile
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bank Account Modal */}
      <BankAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
