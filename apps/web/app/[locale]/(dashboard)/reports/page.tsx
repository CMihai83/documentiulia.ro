'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Receipt,
  Users,
  Percent,
  Filter,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useCompanyStore } from '@/lib/store/company-store';
import { useDashboard, useRevenueReport, useProfitLossReport, useVatReport } from '@/lib/api/hooks';

// Report types
type ReportType = 'profit-loss' | 'balance-sheet' | 'cash-flow' | 'vat' | 'clients' | 'expenses';
type PeriodType = 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'custom';

interface ReportConfig {
  id: ReportType;
  label: string;
  description: string;
  icon: typeof BarChart3;
  color: string;
}

const reportTypes: ReportConfig[] = [
  {
    id: 'profit-loss',
    label: 'Profit și Pierdere',
    description: 'Venituri, cheltuieli și profitul net',
    icon: TrendingUp,
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  },
  {
    id: 'balance-sheet',
    label: 'Bilanț',
    description: 'Active, pasive și capitaluri proprii',
    icon: BarChart3,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'cash-flow',
    label: 'Flux de Numerar',
    description: 'Intrări și ieșiri de cash',
    icon: DollarSign,
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  {
    id: 'vat',
    label: 'Decont TVA',
    description: 'TVA colectat și deductibil',
    icon: Percent,
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  },
  {
    id: 'clients',
    label: 'Raport Clienți',
    description: 'Analiza vânzărilor pe clienți',
    icon: Users,
    color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'expenses',
    label: 'Raport Cheltuieli',
    description: 'Cheltuieli pe categorii',
    icon: Receipt,
    color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
  },
];

const periods: { value: PeriodType; label: string }[] = [
  { value: 'this-month', label: 'Luna Aceasta' },
  { value: 'last-month', label: 'Luna Trecută' },
  { value: 'this-quarter', label: 'Trimestrul Acesta' },
  { value: 'this-year', label: 'Anul Acesta' },
  { value: 'custom', label: 'Perioadă Personalizată' },
];

// Romanian currency formatting
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Percentage formatting
function formatPercent(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

// Mock data for charts
const monthlyData = [
  { month: 'Ian', revenue: 45000, expenses: 32000 },
  { month: 'Feb', revenue: 52000, expenses: 35000 },
  { month: 'Mar', revenue: 48000, expenses: 31000 },
  { month: 'Apr', revenue: 61000, expenses: 38000 },
  { month: 'Mai', revenue: 55000, expenses: 34000 },
  { month: 'Iun', revenue: 67000, expenses: 42000 },
  { month: 'Iul', revenue: 72000, expenses: 45000 },
  { month: 'Aug', revenue: 58000, expenses: 36000 },
  { month: 'Sep', revenue: 64000, expenses: 40000 },
  { month: 'Oct', revenue: 78000, expenses: 48000 },
  { month: 'Nov', revenue: 85000, expenses: 52000 },
  { month: 'Dec', revenue: 92000, expenses: 56000 },
];

const expenseCategories = [
  { name: 'Salarii', value: 45, color: 'bg-blue-500' },
  { name: 'Chirie', value: 20, color: 'bg-green-500' },
  { name: 'Utilități', value: 10, color: 'bg-yellow-500' },
  { name: 'Marketing', value: 12, color: 'bg-purple-500' },
  { name: 'Altele', value: 13, color: 'bg-gray-500' },
];

const topClients = [
  { name: 'SC Exemplu SRL', revenue: 156420, invoices: 24 },
  { name: 'SC Digital Services SRL', revenue: 245000, invoices: 32 },
  { name: 'SC Retail Pro SRL', revenue: 387650, invoices: 45 },
  { name: 'SC Test Solutions SA', revenue: 89500, invoices: 18 },
  { name: 'PFA Ion Popescu', revenue: 12300, invoices: 5 },
];

export default function ReportsPage() {
  const t = useTranslations('reports');
  const { selectedCompanyId, selectedCompany } = useCompanyStore();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('this-month');
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);

  // Fetch reports data
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboard(selectedCompanyId || '');
  const { data: revenueData, isLoading: revenueLoading } = useRevenueReport(selectedCompanyId || '');
  const { data: profitLossData, isLoading: profitLossLoading } = useProfitLossReport(selectedCompanyId || '');
  const { data: vatData, isLoading: vatLoading } = useVatReport(selectedCompanyId || '');

  const isLoading = dashboardLoading || revenueLoading || profitLossLoading || vatLoading;

  // Calculate max for chart scaling
  const maxValue = Math.max(...monthlyData.map(d => Math.max(d.revenue, d.expenses)));

  // Summary stats
  const stats = {
    totalRevenue: monthlyData.reduce((sum, d) => sum + d.revenue, 0),
    totalExpenses: monthlyData.reduce((sum, d) => sum + d.expenses, 0),
    profit: monthlyData.reduce((sum, d) => sum + (d.revenue - d.expenses), 0),
    vatCollected: 142350,
    vatDeductible: 98420,
  };

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Selectează o firmă
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Pentru a vedea rapoartele, selectează mai întâi o firmă din meniul de sus.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Rapoarte Financiare
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Analize și rapoarte pentru {selectedCompany?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as PeriodType)}
              className="appearance-none pl-10 pr-10 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {periods.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Download className="w-5 h-5" />
            <span className="font-medium">Export</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Venituri Totale</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <div className="flex items-center gap-1 mt-1 text-green-600 dark:text-green-400">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm font-medium">+12.5%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cheltuieli Totale</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(stats.totalExpenses)}
              </p>
              <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400">
                <ArrowDownRight className="w-4 h-4" />
                <span className="text-sm font-medium">+8.2%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Profit Net</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(stats.profit)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Marjă: {formatPercent((stats.profit / stats.totalRevenue) * 100)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">TVA de Plată</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {formatCurrency(stats.vatCollected - stats.vatDeductible)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Colectat: {formatCurrency(stats.vatCollected)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Percent className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Expenses Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Venituri vs Cheltuieli
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Evoluția lunară pe anul curent
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Venituri</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Cheltuieli</span>
              </div>
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="h-64 flex items-end gap-2">
            {monthlyData.map((data, index) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end h-52">
                  <div
                    className="flex-1 bg-green-500 rounded-t transition-all hover:bg-green-400"
                    style={{ height: `${(data.revenue / maxValue) * 100}%` }}
                    title={`Venituri: ${formatCurrency(data.revenue)}`}
                  />
                  <div
                    className="flex-1 bg-red-500 rounded-t transition-all hover:bg-red-400"
                    style={{ height: `${(data.expenses / maxValue) * 100}%` }}
                    title={`Cheltuieli: ${formatCurrency(data.expenses)}`}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{data.month}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Expense Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Cheltuieli pe Categorii
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Distribuția cheltuielilor
            </p>
          </div>

          {/* Simple Pie Chart representation */}
          <div className="space-y-4">
            {expenseCategories.map((category) => (
              <div key={category.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {category.name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {category.value}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`${category.color} h-2 rounded-full transition-all`}
                    style={{ width: `${category.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Report Types Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Generează Rapoarte
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report, index) => (
            <motion.button
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => setSelectedReport(report.id)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${report.color} flex items-center justify-center`}>
                  <report.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {report.label}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {report.description}
                  </p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Top Clients */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top Clienți după Venituri
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {topClients
            .sort((a, b) => b.revenue - a.revenue)
            .map((client, index) => (
              <div
                key={client.name}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {client.invoices} facturi
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(client.revenue)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatPercent((client.revenue / stats.totalRevenue) * 100)} din total
                  </p>
                </div>
              </div>
            ))}
        </div>
      </motion.div>
    </div>
  );
}
