'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  Search,
  Plus,
  MoreVertical,
  Calendar,
  Tag,
  Building2,
  Edit,
  Trash2,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Camera,
  Upload,
  FileText,
  CreditCard,
  Banknote,
  Wallet,
  TrendingDown,
  Loader2,
  PieChart,
} from 'lucide-react';
import { useCompanyStore } from '@/lib/store/company-store';
import { useExpenses, useExpensesByCategory } from '@/lib/api/hooks';
import { ExpenseModal } from '@/components/expenses/expense-modal';

// Expense status types
type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid';

// Expense category types
type ExpenseCategory = 'office' | 'travel' | 'utilities' | 'marketing' | 'salaries' | 'supplies' | 'services' | 'other';

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  date: string;
  vendor?: string;
  invoiceNumber?: string;
  vatAmount?: number;
  deductible: boolean;
  hasReceipt: boolean;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

// Status configuration
const statusConfig: Record<ExpenseStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'În așteptare', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800', icon: Clock },
  approved: { label: 'Aprobată', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', icon: CheckCircle },
  rejected: { label: 'Respinsă', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', icon: AlertCircle },
  paid: { label: 'Plătită', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', icon: Banknote },
};

// Category configuration with Romanian labels
const categoryConfig: Record<ExpenseCategory, { label: string; color: string; icon: typeof Receipt }> = {
  office: { label: 'Birou', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Building2 },
  travel: { label: 'Deplasări', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Calendar },
  utilities: { label: 'Utilități', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Wallet },
  marketing: { label: 'Marketing', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400', icon: TrendingDown },
  salaries: { label: 'Salarii', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Banknote },
  supplies: { label: 'Consumabile', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Tag },
  services: { label: 'Servicii', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: CreditCard },
  other: { label: 'Altele', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: Receipt },
};

// Romanian currency formatting
function formatCurrency(amount: number, currency: string = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Romanian date formatting
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Mock data for demonstration
const mockExpenses: Expense[] = [
  {
    id: '1',
    description: 'Rechizite birou - papetărie',
    amount: 345.50,
    currency: 'RON',
    category: 'office',
    status: 'paid',
    date: '2024-01-18',
    vendor: 'Office Direct SRL',
    invoiceNumber: 'FT-2024-0156',
    vatAmount: 65.65,
    deductible: true,
    hasReceipt: true,
    createdAt: '2024-01-18T10:30:00',
  },
  {
    id: '2',
    description: 'Deplasare București - întâlnire client',
    amount: 1250.00,
    currency: 'RON',
    category: 'travel',
    status: 'approved',
    date: '2024-01-16',
    vendor: 'OMV Petrom',
    vatAmount: 237.50,
    deductible: true,
    hasReceipt: true,
    notes: 'Transport și cazare 2 nopți',
    createdAt: '2024-01-16T14:20:00',
  },
  {
    id: '3',
    description: 'Factură energie electrică - Ianuarie',
    amount: 890.75,
    currency: 'RON',
    category: 'utilities',
    status: 'pending',
    date: '2024-01-15',
    vendor: 'Enel Energie',
    invoiceNumber: 'EE-2024-789456',
    vatAmount: 169.24,
    deductible: true,
    hasReceipt: true,
    createdAt: '2024-01-15T09:00:00',
  },
  {
    id: '4',
    description: 'Campanie Google Ads - Ianuarie',
    amount: 2500.00,
    currency: 'RON',
    category: 'marketing',
    status: 'paid',
    date: '2024-01-10',
    vendor: 'Google Ireland Ltd',
    deductible: true,
    hasReceipt: true,
    createdAt: '2024-01-10T08:00:00',
  },
  {
    id: '5',
    description: 'Toner imprimantă HP',
    amount: 425.00,
    currency: 'RON',
    category: 'supplies',
    status: 'paid',
    date: '2024-01-08',
    vendor: 'PC Garage SRL',
    invoiceNumber: 'PCG-2024-1234',
    vatAmount: 80.75,
    deductible: true,
    hasReceipt: true,
    createdAt: '2024-01-08T11:30:00',
  },
  {
    id: '6',
    description: 'Abonament software contabilitate',
    amount: 199.00,
    currency: 'RON',
    category: 'services',
    status: 'paid',
    date: '2024-01-05',
    vendor: 'SoftOne Romania',
    deductible: true,
    hasReceipt: true,
    createdAt: '2024-01-05T10:00:00',
  },
  {
    id: '7',
    description: 'Masa de protocol - întâlnire partener',
    amount: 580.00,
    currency: 'RON',
    category: 'other',
    status: 'rejected',
    date: '2024-01-03',
    vendor: 'Restaurant La Mama',
    deductible: false,
    hasReceipt: true,
    notes: 'Depășește limita deductibilă',
    createdAt: '2024-01-03T13:00:00',
  },
];

export default function ExpensesPage() {
  const t = useTranslations('expenses');
  const { selectedCompanyId, selectedCompany } = useCompanyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const itemsPerPage = 10;

  // Fetch expenses
  const { data: expensesData, isLoading } = useExpenses(selectedCompanyId || '');
  const { data: categoryData } = useExpensesByCategory(selectedCompanyId || '');

  // Use mock data for now
  const expenses = mockExpenses;

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch =
      searchQuery === '' ||
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    pending: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0),
    thisMonth: expenses.filter(e => {
      const expenseDate = new Date(e.date);
      const now = new Date();
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
    }).reduce((sum, e) => sum + e.amount, 0),
    deductible: expenses.filter(e => e.deductible).reduce((sum, e) => sum + e.amount, 0),
  };

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Receipt className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Selectează o firmă
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Pentru a vedea cheltuielile, selectează mai întâi o firmă din meniul de sus.
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
            Cheltuieli
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestionează cheltuielile pentru {selectedCompany?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Camera className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Scanează bon</span>
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Adaugă Cheltuială</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Cheltuieli</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(stats.total)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Luna Aceasta</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(stats.thisMonth)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
              <p className="text-sm text-gray-500 dark:text-gray-400">De Aprobat</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {formatCurrency(stats.pending)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Deductibile</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(stats.deductible)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Caută după descriere sau furnizor..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as ExpenseCategory | 'all');
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate categoriile</option>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ExpenseStatus | 'all');
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate statusurile</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Export Button */}
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="w-5 h-5 text-gray-500" />
              <span className="hidden sm:inline text-gray-700 dark:text-gray-300">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nu există cheltuieli
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Nicio cheltuială nu corespunde filtrelor selectate.'
                : 'Adaugă prima ta cheltuială pentru a începe.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="col-span-4">Descriere</div>
              <div className="col-span-2">Categorie</div>
              <div className="col-span-2">Data</div>
              <div className="col-span-2 text-right">Sumă</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1"></div>
            </div>

            {/* Expense Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedExpenses.map((expense, index) => {
                const StatusIcon = statusConfig[expense.status].icon;
                const CategoryIcon = categoryConfig[expense.category].icon;
                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {/* Desktop */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${categoryConfig[expense.category].color}`}>
                            <CategoryIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
                              {expense.description}
                            </p>
                            {expense.vendor && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {expense.vendor}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${categoryConfig[expense.category].color}`}>
                          {categoryConfig[expense.category].label}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(expense.date)}
                        </p>
                        {expense.invoiceNumber && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {expense.invoiceNumber}
                          </p>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                        {expense.vatAmount && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            TVA: {formatCurrency(expense.vatAmount, expense.currency)}
                          </p>
                        )}
                      </div>
                      <div className="col-span-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig[expense.status].color}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="hidden lg:inline">{statusConfig[expense.status].label}</span>
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <div className="relative group">
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          {/* Dropdown menu */}
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <div className="p-1">
                              <button
                                onClick={() => setSelectedExpense(expense)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                              >
                                <Eye className="w-4 h-4" />
                                Vizualizează
                              </button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                <Edit className="w-4 h-4" />
                                Editează
                              </button>
                              {expense.hasReceipt && (
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                  <FileText className="w-4 h-4" />
                                  Vezi bon
                                </button>
                              )}
                              <hr className="my-1 border-gray-200 dark:border-gray-700" />
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                                <Trash2 className="w-4 h-4" />
                                Șterge
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${categoryConfig[expense.category].color}`}>
                            <CategoryIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {expense.description}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {expense.vendor || categoryConfig[expense.category].label}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig[expense.status].color}`}>
                          <StatusIcon className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatDate(expense.date)}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(expense.amount, expense.currency)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Afișez {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} din {filteredExpenses.length} cheltuieli
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-4 py-2 text-sm font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Expense Detail Modal */}
      <AnimatePresence>
        {selectedExpense && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedExpense(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${categoryConfig[selectedExpense.category].color}`}>
                      {(() => {
                        const Icon = categoryConfig[selectedExpense.category].icon;
                        return <Icon className="w-7 h-7" />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedExpense.description}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {categoryConfig[selectedExpense.category].label}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedExpense(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {/* Amount and Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sumă totală</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                    </p>
                    {selectedExpense.vatAmount && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        din care TVA: {formatCurrency(selectedExpense.vatAmount, selectedExpense.currency)}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${statusConfig[selectedExpense.status].color}`}>
                    {(() => {
                      const Icon = statusConfig[selectedExpense.status].icon;
                      return <Icon className="w-4 h-4" />;
                    })()}
                    {statusConfig[selectedExpense.status].label}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Data</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedExpense.date)}
                    </p>
                  </div>
                  {selectedExpense.vendor && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Furnizor</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedExpense.vendor}
                      </p>
                    </div>
                  )}
                  {selectedExpense.invoiceNumber && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nr. Factură</p>
                      <p className="font-mono text-gray-900 dark:text-white">
                        {selectedExpense.invoiceNumber}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Deductibilă fiscal</p>
                    <p className={`font-medium ${selectedExpense.deductible ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {selectedExpense.deductible ? 'Da' : 'Nu'}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {selectedExpense.notes && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Note:</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      {selectedExpense.notes}
                    </p>
                  </div>
                )}

                {/* Receipt Status */}
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  selectedExpense.hasReceipt
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {selectedExpense.hasReceipt ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Document justificativ atașat</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span>Lipsește documentul justificativ</span>
                    </>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Editează
                </button>
                {selectedExpense.hasReceipt && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Vezi document
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
