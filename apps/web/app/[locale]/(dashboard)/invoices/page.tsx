'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  FileText,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Copy,
  Mail,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useInvoices, useInvoiceStats } from '@/lib/api/hooks';
import { useCompanyStore } from '@/lib/store/company-store';
import { InvoiceModal } from '@/components/invoices/invoice-modal';

// Invoice status types
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientCui?: string;
  issueDate: string;
  dueDate: string;
  total: number;
  currency: string;
  status: InvoiceStatus;
  efacturaStatus?: 'pending' | 'uploaded' | 'validated' | 'rejected';
  items?: number;
}

// Status configuration with Romanian labels
const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: {
    label: 'Ciornă',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: FileText,
  },
  sent: {
    label: 'Trimisă',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Send,
  },
  paid: {
    label: 'Plătită',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Restantă',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Anulată',
    color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
    icon: XCircle,
  },
};

// Format currency in Romanian format
function formatCurrency(amount: number, currency: string = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format date in Romanian format
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Status badge component
function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

// e-Factura badge
function EfacturaBadge({ status }: { status?: string }) {
  if (!status) return null;

  const configs: Record<string, { label: string; color: string }> = {
    pending: { label: 'e-Factura: În așteptare', color: 'bg-yellow-100 text-yellow-700' },
    uploaded: { label: 'e-Factura: Încărcată', color: 'bg-blue-100 text-blue-700' },
    validated: { label: 'e-Factura: Validată', color: 'bg-green-100 text-green-700' },
    rejected: { label: 'e-Factura: Respinsă', color: 'bg-red-100 text-red-700' },
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export default function InvoicesPage() {
  const t = useTranslations('invoices');
  const { selectedCompanyId } = useCompanyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch invoices from API
  const { data: invoicesData, isLoading, error } = useInvoices(
    selectedCompanyId || '',
    {
      page: currentPage.toString(),
      limit: '10',
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(searchQuery && { search: searchQuery }),
    }
  );

  // Fetch invoice stats
  const { data: statsData } = useInvoiceStats(selectedCompanyId || '');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoices = (invoicesData?.data as any)?.items || invoicesData?.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pagination = (invoicesData?.data as any)?.pagination || { total: 0, pages: 1 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = statsData?.data as any;

  // Stats summary
  const statsSummary = [
    {
      label: 'Total Facturi',
      value: stats?.total || invoices.length,
      color: 'text-gray-900 dark:text-white',
    },
    {
      label: 'Neîncasate',
      value: formatCurrency(stats?.outstanding?.amount || 0),
      subValue: `${stats?.outstanding?.count || 0} facturi`,
      color: 'text-blue-600',
    },
    {
      label: 'Restante',
      value: formatCurrency(stats?.overdue?.amount || 0),
      subValue: `${stats?.overdue?.count || 0} facturi`,
      color: 'text-red-600',
    },
    {
      label: 'Încasate Luna Aceasta',
      value: formatCurrency(stats?.paidThisMonth || 0),
      color: 'text-green-600',
    },
  ];

  // Show message if no company selected
  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Selectează o firmă</h2>
        <p className="text-gray-500">
          Pentru a vedea facturile, selectează mai întâi o firmă din meniul de sus.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestionează facturile emise către clienți
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('new')}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsSummary.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            {stat.subValue && (
              <p className="text-xs text-gray-400 mt-0.5">{stat.subValue}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Caută după număr, client sau CUI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
            className="px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toate Statusurile</option>
            <option value="draft">{statusConfig.draft.label}</option>
            <option value="sent">{statusConfig.sent.label}</option>
            <option value="paid">{statusConfig.paid.label}</option>
            <option value="overdue">{statusConfig.overdue.label}</option>
            <option value="cancelled">{statusConfig.cancelled.label}</option>
          </select>
        </div>

        {/* Export Button */}
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      {/* Invoices Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-gray-500">Eroare la încărcarea facturilor</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-blue-600 hover:underline"
            >
              Încearcă din nou
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nicio factură găsită</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Încearcă să modifici filtrele de căutare'
                : 'Creează prima ta factură pentru a începe'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Creează Factură
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900 text-sm font-medium text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <div className="col-span-2">Număr</div>
              <div className="col-span-3">Client</div>
              <div className="col-span-2">Data</div>
              <div className="col-span-2 text-right">Sumă</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1"></div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoices.map((invoice: Invoice, index: number) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                >
                  {/* Desktop View */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-center">
                    <div className="col-span-2">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {invoice.number}
                      </Link>
                      {invoice.efacturaStatus && (
                        <div className="mt-1">
                          <EfacturaBadge status={invoice.efacturaStatus} />
                        </div>
                      )}
                    </div>

                    <div className="col-span-3">
                      <p className="font-medium truncate">{invoice.clientName}</p>
                      {invoice.clientCui && (
                        <p className="text-sm text-gray-500">CUI: {invoice.clientCui}</p>
                      )}
                    </div>

                    <div className="col-span-2 text-sm">
                      <p>{formatDate(invoice.issueDate)}</p>
                      <p className="text-gray-500">
                        Scadentă: {formatDate(invoice.dueDate)}
                      </p>
                    </div>

                    <div className="col-span-2 text-right">
                      <p className="font-semibold">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </p>
                      {invoice.items && (
                        <p className="text-sm text-gray-500">
                          {invoice.items} articole
                        </p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <StatusBadge status={invoice.status} />
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <div className="relative group">
                        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <MoreHorizontal className="w-5 h-5 text-gray-400" />
                        </button>

                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <div className="py-1">
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Eye className="w-4 h-4" />
                              Vizualizează
                            </Link>
                            <Link
                              href={`/invoices/${invoice.id}/edit`}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Edit className="w-4 h-4" />
                              Editează
                            </Link>
                            <button className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full">
                              <Copy className="w-4 h-4" />
                              Duplică
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full">
                              <Mail className="w-4 h-4" />
                              Trimite Email
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full">
                              <Download className="w-4 h-4" />
                              Descarcă PDF
                            </button>
                            <hr className="my-1 border-gray-200 dark:border-gray-700" />
                            <button className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full">
                              <Trash2 className="w-4 h-4" />
                              Șterge
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium text-blue-600"
                        >
                          {invoice.number}
                        </Link>
                        <p className="font-medium mt-1">{invoice.clientName}</p>
                      </div>
                      <StatusBadge status={invoice.status} />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {formatDate(invoice.issueDate)}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </span>
                    </div>

                    {invoice.efacturaStatus && (
                      <EfacturaBadge status={invoice.efacturaStatus} />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">
                  Pagina {currentPage} din {pagination.pages} ({pagination.total} facturi)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={currentPage === pagination.pages}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Refresh the invoices list
          window.location.reload();
        }}
      />
    </div>
  );
}
