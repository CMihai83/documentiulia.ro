'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Users,
  Calendar,
  ChevronRight,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface AccountSummary {
  type: string;
  name: string;
  balance: number;
  change: number;
  trend: 'up' | 'down';
}

const accountSummaries: AccountSummary[] = [
  { type: 'asset', name: 'Active Totale', balance: 2450000, change: 5.2, trend: 'up' },
  { type: 'liability', name: 'Pasive Totale', balance: 980000, change: -2.1, trend: 'down' },
  { type: 'equity', name: 'Capitaluri Proprii', balance: 1470000, change: 8.3, trend: 'up' },
  { type: 'revenue', name: 'Venituri (YTD)', balance: 3200000, change: 12.5, trend: 'up' },
  { type: 'expense', name: 'Cheltuieli (YTD)', balance: 2750000, change: 7.8, trend: 'up' },
  { type: 'profit', name: 'Profit Net (YTD)', balance: 450000, change: 25.4, trend: 'up' }
];

const recentTransactions = [
  { id: 1, date: '2025-12-24', description: 'Încasare factură #2458', debit: 0, credit: 15000, account: '411' },
  { id: 2, date: '2025-12-24', description: 'Plată furnizor SC Tech SRL', debit: 8500, credit: 0, account: '401' },
  { id: 3, date: '2025-12-23', description: 'Salariu decembrie', debit: 45000, credit: 0, account: '641' },
  { id: 4, date: '2025-12-23', description: 'Vânzare servicii consultanță', debit: 0, credit: 25000, account: '704' },
  { id: 5, date: '2025-12-22', description: 'Achiziție materiale', debit: 3200, credit: 0, account: '302' }
];

const quickActions = [
  { name: 'Fișă cont', icon: FileSpreadsheet, href: '/dashboard/accounting/general-ledger', color: 'blue' },
  { name: 'De încasat', icon: ArrowDownRight, href: '/dashboard/accounting/accounts-receivable', color: 'green' },
  { name: 'De plătit', icon: ArrowUpRight, href: '/dashboard/accounting/accounts-payable', color: 'red' },
  { name: 'Balanță', icon: Calculator, href: '/dashboard/accounting/trial-balance', color: 'purple' },
  { name: 'Bilanț', icon: BookOpen, href: '/dashboard/accounting/balance-sheet', color: 'indigo' },
  { name: 'Profit & Pierdere', icon: BarChart3, href: '/dashboard/accounting/income-statement', color: 'amber' }
];

const pendingTasks = [
  { id: 1, task: 'Reconciliere bancară decembrie', dueDate: '2025-12-28', priority: 'high' },
  { id: 2, task: 'Închidere lună decembrie', dueDate: '2025-12-31', priority: 'high' },
  { id: 3, task: 'Verificare balanță', dueDate: '2025-01-05', priority: 'medium' },
  { id: 4, task: 'Raport trimestrial Q4', dueDate: '2025-01-15', priority: 'medium' }
];

export default function AccountingPage() {
  const router = useRouter();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      asset: 'text-blue-600 bg-blue-100',
      liability: 'text-red-600 bg-red-100',
      equity: 'text-purple-600 bg-purple-100',
      revenue: 'text-green-600 bg-green-100',
      expense: 'text-orange-600 bg-orange-100',
      profit: 'text-emerald-600 bg-emerald-100'
    };
    return colors[type] || 'text-gray-600 bg-gray-100';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'text-red-700 bg-red-100',
      medium: 'text-amber-700 bg-amber-100',
      low: 'text-green-700 bg-green-100'
    };
    return colors[priority] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contabilitate</h1>
          <p className="text-gray-500">Gestionați registrele contabile și situațiile financiare</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <Calendar className="w-4 h-4" />
            Decembrie 2024
          </button>
          <button
            onClick={() => router.push('/dashboard/accounting/journal-entry')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <BookOpen className="w-4 h-4" />
            Notă contabilă
          </button>
        </div>
      </div>

      {/* Account Summaries */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {accountSummaries.map((account, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(account.type)}`}>
                {account.type === 'asset' && 'Active'}
                {account.type === 'liability' && 'Pasive'}
                {account.type === 'equity' && 'Capitaluri'}
                {account.type === 'revenue' && 'Venituri'}
                {account.type === 'expense' && 'Cheltuieli'}
                {account.type === 'profit' && 'Profit'}
              </span>
              {account.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(account.balance)}</p>
            <p className="text-xs text-gray-500">{account.name}</p>
            <p className={`text-xs mt-1 ${account.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {account.change >= 0 ? '+' : ''}{account.change}% vs. luna trecută
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={() => router.push(action.href)}
              className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition group"
            >
              <div className={`w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center bg-${action.color}-100 text-${action.color}-600`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{action.name}</p>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Tranzacții Recente</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Vezi toate <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Data</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Descriere</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Cont</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">Debit</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 text-sm text-gray-600">{tx.date}</td>
                    <td className="py-2 px-4 text-sm text-gray-900">{tx.description}</td>
                    <td className="py-2 px-4">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{tx.account}</span>
                    </td>
                    <td className="py-2 px-4 text-sm text-right text-gray-900">
                      {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                    </td>
                    <td className="py-2 px-4 text-sm text-right text-gray-900">
                      {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Sarcini în Așteptare</h2>
          </div>
          <div className="p-4 space-y-3">
            {pendingTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="mt-0.5">
                  {task.priority === 'high' ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{task.task}</p>
                  <p className="text-xs text-gray-500">Termen: {task.dueDate}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority === 'high' ? 'Urgent' : 'Mediu'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Overview Charts */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-500" />
            Structura Activelor
          </h3>
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-400 text-sm">Grafic în dezvoltare</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
            Evoluție Venituri vs Cheltuieli
          </h3>
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-400 text-sm">Grafic în dezvoltare</p>
          </div>
        </div>
      </div>
    </div>
  );
}
