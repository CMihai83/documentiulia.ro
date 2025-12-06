'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Receipt,
  FileText,
  Eye,
  Edit,
  Trash2,
  Upload,
} from 'lucide-react';
import { BillModal } from '@/components/bills/bill-modal';
import { useCompanyStore } from '@/lib/store/company-store';

// Mock data for bills
const mockBills = [
  {
    id: '1',
    invoiceNumber: 'FV-2024-0234',
    vendorName: 'Enel Energie',
    vendorCui: 'RO14399273',
    issueDate: '2024-11-15',
    dueDate: '2024-12-15',
    total: 1250.50,
    vatAmount: 199.50,
    currency: 'RON',
    status: 'pending' as const,
    category: 'utilitati',
  },
  {
    id: '2',
    invoiceNumber: 'VDF-11-2024',
    vendorName: 'Vodafone Romania',
    vendorCui: 'RO11574966',
    issueDate: '2024-11-10',
    dueDate: '2024-12-10',
    total: 450.00,
    vatAmount: 71.85,
    currency: 'RON',
    status: 'paid' as const,
    category: 'servicii',
  },
  {
    id: '3',
    invoiceNumber: 'DEDEMAN-78432',
    vendorName: 'Dedeman',
    vendorCui: 'RO4194681',
    issueDate: '2024-11-05',
    dueDate: '2024-11-20',
    total: 3450.00,
    vatAmount: 551.05,
    currency: 'RON',
    status: 'overdue' as const,
    category: 'materiale',
  },
  {
    id: '4',
    invoiceNumber: 'EMAG-2024-98765',
    vendorName: 'EMAG',
    vendorCui: 'RO14399840',
    issueDate: '2024-11-20',
    dueDate: '2024-12-20',
    total: 5999.99,
    vatAmount: 957.98,
    currency: 'RON',
    status: 'pending' as const,
    category: 'echipamente',
  },
  {
    id: '5',
    invoiceNumber: 'ORG-NOV-2024',
    vendorName: 'Orange Romania',
    vendorCui: 'RO9010105',
    issueDate: '2024-11-01',
    dueDate: '2024-11-30',
    total: 289.00,
    vatAmount: 46.15,
    currency: 'RON',
    status: 'paid' as const,
    category: 'servicii',
  },
];

type BillStatus = 'pending' | 'paid' | 'overdue' | 'partial';
type FilterStatus = 'all' | BillStatus;

const statusConfig = {
  pending: {
    label: 'De Plată',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
  },
  paid: {
    label: 'Plătită',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
  },
  overdue: {
    label: 'Restantă',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertCircle,
  },
  partial: {
    label: 'Plată Parțială',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: TrendingUp,
  },
};

const categoryLabels: Record<string, string> = {
  materiale: 'Materiale',
  servicii: 'Servicii',
  utilitati: 'Utilități',
  chirie: 'Chirie',
  transport: 'Transport',
  echipamente: 'Echipamente',
  it: 'IT & Software',
  marketing: 'Marketing',
  consultanta: 'Consultanță',
  salarii: 'Salarii',
  asigurari: 'Asigurări',
  impozite: 'Impozite',
  altele: 'Altele',
};

export default function BillsPage() {
  const { selectedCompanyId } = useCompanyStore();
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedBill, setSelectedBill] = useState<string | null>(null);

  // Calculate stats
  const stats = {
    totalPending: mockBills
      .filter((b) => b.status === 'pending')
      .reduce((sum, b) => sum + b.total, 0),
    totalOverdue: mockBills
      .filter((b) => b.status === 'overdue')
      .reduce((sum, b) => sum + b.total, 0),
    totalVatDeductible: mockBills
      .filter((b) => b.status !== 'paid')
      .reduce((sum, b) => sum + b.vatAmount, 0),
    countPending: mockBills.filter((b) => b.status === 'pending').length,
    countOverdue: mockBills.filter((b) => b.status === 'overdue').length,
  };

  // Filter bills
  const filteredBills = mockBills.filter((bill) => {
    const matchesSearch =
      bill.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || bill.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number, currency: string = 'RON') => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Facturi Primite
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gestionează facturile de la furnizori
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Upload className="w-4 h-4" />
            Import e-Factura
          </button>
          <button
            onClick={() => setIsBillModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/25"
          >
            <Plus className="w-4 h-4" />
            Adaugă Factură
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">De Plată</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(stats.totalPending)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{stats.countPending} facturi</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Restante</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(stats.totalOverdue)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{stats.countOverdue} facturi</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">TVA Deductibil</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(stats.totalVatDeductible)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Pentru recuperat</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Facturi</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {mockBills.length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Luna aceasta</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Caută după număr factură sau furnizor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Toate Statusurile</option>
            <option value="pending">De Plată</option>
            <option value="paid">Plătite</option>
            <option value="overdue">Restante</option>
          </select>
          <button className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Filter className="w-5 h-5 text-gray-500" />
          </button>
          <button className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Download className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-900 text-sm font-medium text-gray-500">
          <div className="col-span-3">Furnizor / Nr. Factură</div>
          <div className="col-span-2">Categorie</div>
          <div className="col-span-2">Data Emiterii</div>
          <div className="col-span-2">Scadență</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-1"></div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {filteredBills.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Nu există facturi care să corespundă criteriilor
              </p>
            </div>
          ) : (
            filteredBills.map((bill, index) => {
              const StatusIcon = statusConfig[bill.status].icon;
              return (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {/* Desktop View */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                          <Building2 className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {bill.vendorName}
                          </p>
                          <p className="text-sm text-gray-500">{bill.invoiceNumber}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                        {categoryLabels[bill.category] || bill.category}
                      </span>
                    </div>
                    <div className="col-span-2 text-gray-600 dark:text-gray-300">
                      {formatDate(bill.issueDate)}
                    </div>
                    <div className="col-span-2">
                      <span className={bill.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                        {formatDate(bill.dueDate)}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(bill.total, bill.currency)}
                      </p>
                      <p className="text-xs text-gray-400">
                        TVA: {formatCurrency(bill.vatAmount, bill.currency)}
                      </p>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[bill.status].color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[bill.status].label}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end gap-1">
                      <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <Edit className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                          <Building2 className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {bill.vendorName}
                          </p>
                          <p className="text-sm text-gray-500">{bill.invoiceNumber}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[bill.status].color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[bill.status].label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-sm">
                        <span className="text-gray-500">Scadență: </span>
                        <span className={bill.status === 'overdue' ? 'text-red-600' : ''}>
                          {formatDate(bill.dueDate)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(bill.total, bill.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Bill Modal */}
      <BillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
