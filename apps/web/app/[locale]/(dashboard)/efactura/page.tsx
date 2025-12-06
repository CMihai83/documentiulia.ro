'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  Settings,
  ExternalLink,
  ChevronRight,
  Download,
  Eye,
  RotateCcw,
  Shield,
  Zap,
  FileCheck,
  ArrowUpRight,
  History,
  HelpCircle,
  Loader2,
  Upload,
} from 'lucide-react';
import { useCompanyStore } from '@/lib/store/company-store';
import { useEfacturaStatus, useEfacturaConfig, useInvoices } from '@/lib/api/hooks';

// e-Factura submission status types
type EfacturaSubmissionStatus = 'pending' | 'processing' | 'accepted' | 'rejected' | 'error';

interface EfacturaSubmission {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  submittedAt: string;
  status: EfacturaSubmissionStatus;
  anafIndexId?: string;
  errorMessage?: string;
  downloadId?: string;
}

// Status configuration
const statusConfig: Record<EfacturaSubmissionStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'În așteptare', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  processing: { label: 'Se procesează', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: RefreshCw },
  accepted: { label: 'Acceptată', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  rejected: { label: 'Respinsă', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  error: { label: 'Eroare', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Mock data for demonstration
const mockSubmissions: EfacturaSubmission[] = [
  {
    id: '1',
    invoiceId: 'inv-001',
    invoiceNumber: 'FCT-2024-0042',
    clientName: 'SC Exemplu SRL',
    amount: 15420.50,
    currency: 'RON',
    submittedAt: '2024-01-15T10:30:00',
    status: 'accepted',
    anafIndexId: '4526789012',
  },
  {
    id: '2',
    invoiceId: 'inv-002',
    invoiceNumber: 'FCT-2024-0043',
    clientName: 'SC Test Solutions SA',
    amount: 8750.00,
    currency: 'RON',
    submittedAt: '2024-01-16T14:20:00',
    status: 'processing',
  },
  {
    id: '3',
    invoiceId: 'inv-003',
    invoiceNumber: 'FCT-2024-0044',
    clientName: 'PFA Ion Popescu',
    amount: 2340.00,
    currency: 'RON',
    submittedAt: '2024-01-17T09:15:00',
    status: 'rejected',
    errorMessage: 'Cod fiscal incorect pentru client',
  },
  {
    id: '4',
    invoiceId: 'inv-004',
    invoiceNumber: 'FCT-2024-0045',
    clientName: 'SC Digital Services SRL',
    amount: 45000.00,
    currency: 'RON',
    submittedAt: '2024-01-17T16:45:00',
    status: 'pending',
  },
];

export default function EfacturaPage() {
  const t = useTranslations('efactura');
  const { selectedCompanyId, selectedCompany } = useCompanyStore();
  const [activeTab, setActiveTab] = useState<'submissions' | 'pending' | 'settings'>('submissions');
  const [selectedSubmission, setSelectedSubmission] = useState<EfacturaSubmission | null>(null);

  // Fetch data
  const { data: statusData, isLoading: statusLoading } = useEfacturaStatus(selectedCompanyId || '');
  const { data: configData, isLoading: configLoading } = useEfacturaConfig(selectedCompanyId || '');
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices(selectedCompanyId || '', { status: 'sent' });

  // Use mock data for now
  const submissions = mockSubmissions;
  const pendingInvoices = (invoicesData?.data as unknown[]) || [];

  // Stats
  const stats = {
    total: submissions.length,
    accepted: submissions.filter(s => s.status === 'accepted').length,
    pending: submissions.filter(s => s.status === 'pending' || s.status === 'processing').length,
    rejected: submissions.filter(s => s.status === 'rejected' || s.status === 'error').length,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiStatus = statusData?.data as any;
  const isConnected = apiStatus?.connected ?? false;

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Selectează o firmă
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Pentru a accesa e-Factura, selectează mai întâi o firmă din meniul de sus.
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
            e-Factura ANAF
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Sistem de raportare e-Factura pentru {selectedCompany?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            isConnected
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            {isConnected ? 'Conectat la ANAF' : 'Neconectat'}
          </div>
          <a
            href="https://www.anaf.ro/anaf/internet/ANAF/info_publice/e-factura"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ExternalLink className="w-4 h-4" />
            Documentație ANAF
          </a>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Total transmise</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Acceptate</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.accepted}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
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
              <p className="text-sm text-gray-500 dark:text-gray-400">În așteptare</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.pending}</p>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Respinse</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'submissions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Istoric transmisii
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              De transmis
              {pendingInvoices.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                  {pendingInvoices.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Setări
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'submissions' && (
          <motion.div
            key="submissions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Submissions Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="col-span-3">Factură</div>
                <div className="col-span-2">Client</div>
                <div className="col-span-2 text-right">Valoare</div>
                <div className="col-span-2">Data transmiterii</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1"></div>
              </div>

              {/* Submissions List */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {submissions.map((submission) => {
                  const StatusIcon = statusConfig[submission.status].icon;
                  return (
                    <motion.div
                      key={submission.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {/* Desktop */}
                      <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                        <div className="col-span-3">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {submission.invoiceNumber}
                          </p>
                          {submission.anafIndexId && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Index ANAF: {submission.anafIndexId}
                            </p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-gray-900 dark:text-white truncate">
                            {submission.clientName}
                          </p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(submission.amount, submission.currency)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(submission.submittedAt)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[submission.status].color}`}>
                            <StatusIcon className={`w-3.5 h-3.5 ${submission.status === 'processing' ? 'animate-spin' : ''}`} />
                            {statusConfig[submission.status].label}
                          </span>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => setSelectedSubmission(submission)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {submission.invoiceNumber}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {submission.clientName}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[submission.status].color}`}>
                            <StatusIcon className={`w-3.5 h-3.5 ${submission.status === 'processing' ? 'animate-spin' : ''}`} />
                            {statusConfig[submission.status].label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatDate(submission.submittedAt)}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(submission.amount, submission.currency)}
                          </span>
                        </div>
                        {submission.errorMessage && (
                          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                            {submission.errorMessage}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">
                    Facturi eligibile pentru e-Factura
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Aici vezi facturile emise care pot fi transmise către ANAF. Selectează facturile pe care dorești să le transmiți și apasă &quot;Transmite la ANAF&quot;.
                  </p>
                </div>
              </div>
            </div>

            {invoicesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : pendingInvoices.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <FileCheck className="w-16 h-16 text-green-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Toate facturile au fost transmise
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Nu există facturi în așteptare pentru transmitere la ANAF.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-gray-500 dark:text-gray-400">
                  {pendingInvoices.length} facturi disponibile pentru transmitere
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* ANAF Connection Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Conexiune ANAF SPV
                </h3>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isConnected
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Shield className={`w-6 h-6 ${
                      isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {isConnected ? 'Conectat la Spațiul Privat Virtual' : 'Neconectat la ANAF'}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {isConnected
                        ? `CUI: ${selectedCompany?.cui} • Ultimul certificat valid până la 31 Dec 2025`
                        : 'Încarcă certificatul digital pentru a te conecta la sistemul e-Factura ANAF.'
                      }
                    </p>
                    <button className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isConnected
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}>
                      {isConnected ? 'Reînnoiește certificatul' : 'Conectează-te la ANAF'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-submit Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Transmitere automată
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Transmite automat facturile noi
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Facturile emise vor fi trimise automat la ANAF
                    </p>
                  </div>
                  <button
                    className="relative w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors"
                    aria-label="Toggle auto-submit"
                  >
                    <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform" />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Notificări pentru erori
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Primește email când o factură este respinsă
                    </p>
                  </div>
                  <button
                    className="relative w-12 h-6 rounded-full bg-blue-600 transition-colors"
                    aria-label="Toggle notifications"
                  >
                    <span className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                  <HelpCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Ai nevoie de ajutor?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Consultă documentația noastră sau contactează suportul pentru asistență cu e-Factura.
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <a
                      href="/help/efactura"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                    >
                      Documentație
                      <ChevronRight className="w-4 h-4" />
                    </a>
                    <a
                      href="/support"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                    >
                      Contactează suportul
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSubmission(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Detalii transmisie
                  </h2>
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <XCircle className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Factură</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedSubmission.invoiceNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Client</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedSubmission.clientName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Valoare</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedSubmission.amount, selectedSubmission.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[selectedSubmission.status].color}`}>
                      {statusConfig[selectedSubmission.status].label}
                    </span>
                  </div>
                </div>
                {selectedSubmission.anafIndexId && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Index ANAF</p>
                    <p className="font-mono text-gray-900 dark:text-white">
                      {selectedSubmission.anafIndexId}
                    </p>
                  </div>
                )}
                {selectedSubmission.errorMessage && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Eroare:</p>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {selectedSubmission.errorMessage}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                {selectedSubmission.status === 'rejected' && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <RotateCcw className="w-4 h-4" />
                    Retransmite
                  </button>
                )}
                {selectedSubmission.anafIndexId && (
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Download className="w-4 h-4" />
                    Descarcă XML
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
