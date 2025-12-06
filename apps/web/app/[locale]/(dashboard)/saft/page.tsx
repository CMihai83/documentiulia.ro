'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  FileCode,
  Send,
  Eye,
  RefreshCw,
  HelpCircle,
  ChevronRight,
  Shield,
  Database,
  Loader2,
  FileCheck,
  AlertTriangle,
  Info,
  Play,
  Settings,
} from 'lucide-react';
import { useCompanyStore } from '@/lib/store/company-store';
import { useSaftHistory, useGenerateSaft } from '@/lib/api/hooks';

// SAF-T status types
type SaftStatus = 'draft' | 'generating' | 'generated' | 'validating' | 'validated' | 'submitted' | 'accepted' | 'rejected';

interface SaftReport {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  status: SaftStatus;
  createdAt: string;
  submittedAt?: string;
  fileSize?: number;
  recordCount?: number;
  validationErrors?: number;
  validationWarnings?: number;
  anafResponseId?: string;
  errorMessage?: string;
}

// Status configuration
const statusConfig: Record<SaftStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: 'Ciornă', color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', icon: FileText },
  generating: { label: 'Se generează', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', icon: RefreshCw },
  generated: { label: 'Generat', color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800', icon: FileCode },
  validating: { label: 'Se validează', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800', icon: RefreshCw },
  validated: { label: 'Validat', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', icon: CheckCircle },
  submitted: { label: 'Trimis', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', icon: Send },
  accepted: { label: 'Acceptat', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', icon: CheckCircle },
  rejected: { label: 'Respins', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', icon: XCircle },
};

// Romanian date formatting
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Mock data
const mockReports: SaftReport[] = [
  {
    id: '1',
    period: 'Decembrie 2024',
    periodStart: '2024-12-01',
    periodEnd: '2024-12-31',
    status: 'accepted',
    createdAt: '2025-01-05T10:30:00',
    submittedAt: '2025-01-10T14:20:00',
    fileSize: 2456789,
    recordCount: 1245,
    validationErrors: 0,
    validationWarnings: 2,
    anafResponseId: 'SAFT-2025-001234',
  },
  {
    id: '2',
    period: 'Noiembrie 2024',
    periodStart: '2024-11-01',
    periodEnd: '2024-11-30',
    status: 'accepted',
    createdAt: '2024-12-03T09:15:00',
    submittedAt: '2024-12-08T11:45:00',
    fileSize: 2134567,
    recordCount: 1156,
    validationErrors: 0,
    validationWarnings: 0,
    anafResponseId: 'SAFT-2024-012345',
  },
  {
    id: '3',
    period: 'Octombrie 2024',
    periodStart: '2024-10-01',
    periodEnd: '2024-10-31',
    status: 'accepted',
    createdAt: '2024-11-04T08:00:00',
    submittedAt: '2024-11-09T15:30:00',
    fileSize: 1987654,
    recordCount: 1089,
    validationErrors: 0,
    validationWarnings: 1,
    anafResponseId: 'SAFT-2024-011234',
  },
  {
    id: '4',
    period: 'Ianuarie 2025',
    periodStart: '2025-01-01',
    periodEnd: '2025-01-31',
    status: 'generating',
    createdAt: '2025-01-20T10:00:00',
    recordCount: 0,
  },
];

// Available periods for generation
const availablePeriods = [
  { value: '2025-01', label: 'Ianuarie 2025' },
  { value: '2024-12', label: 'Decembrie 2024' },
  { value: '2024-11', label: 'Noiembrie 2024' },
  { value: '2024-10', label: 'Octombrie 2024' },
  { value: '2024-09', label: 'Septembrie 2024' },
];

export default function SaftPage() {
  const t = useTranslations('saft');
  const { selectedCompanyId, selectedCompany } = useCompanyStore();
  const [selectedPeriod, setSelectedPeriod] = useState('2025-01');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SaftReport | null>(null);

  // Fetch SAF-T history
  const { data: historyData, isLoading } = useSaftHistory(selectedCompanyId || '');
  const generateSaft = useGenerateSaft(selectedCompanyId || '');

  // Use mock data
  const reports = mockReports;

  // Stats
  const stats = {
    total: reports.length,
    accepted: reports.filter(r => r.status === 'accepted').length,
    pending: reports.filter(r => ['draft', 'generating', 'generated', 'validating', 'validated', 'submitted'].includes(r.status)).length,
    rejected: reports.filter(r => r.status === 'rejected').length,
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileCode className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Selectează o firmă
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Pentru a accesa SAF-T, selectează mai întâi o firmă din meniul de sus.
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
            SAF-T D406
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Raportare fiscală conformă ANAF pentru {selectedCompany?.name}
          </p>
        </div>
        <a
          href="https://www.anaf.ro/anaf/internet/ANAF/info_publice/saft"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <HelpCircle className="w-4 h-4" />
          Documentație ANAF
        </a>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              Ce este SAF-T D406?
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              SAF-T (Standard Audit File for Tax) este un format standardizat de raportare fiscală către ANAF.
              Declarația D406 include toate tranzacțiile contabile ale firmei și trebuie depusă lunar.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Rapoarte</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              <p className="text-sm text-gray-500 dark:text-gray-400">În Procesare</p>
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

      {/* Generate New Report */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileCode className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Generează Raport SAF-T
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Selectează perioada și generează fișierul XML
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-10 pr-10 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availablePeriods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Se generează...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Generează</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generation Progress */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Se procesează datele...</span>
                <span className="text-gray-900 dark:text-white font-medium">35%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '35%' }}
                  transition={{ duration: 1 }}
                  className="bg-blue-600 h-2 rounded-full"
                />
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Date master
                </span>
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                  Tranzacții
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  Validare
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Reports History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Istoric Rapoarte
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <FileCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Niciun raport generat
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Generează primul raport SAF-T pentru a începe.
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="col-span-3">Perioadă</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Înregistrări</div>
              <div className="col-span-2">Dimensiune</div>
              <div className="col-span-2">Validare</div>
              <div className="col-span-1"></div>
            </div>

            {/* Report Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {reports.map((report, index) => {
                const StatusIcon = statusConfig[report.status].icon;
                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {/* Desktop */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {report.period}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Creat: {formatDate(report.createdAt)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[report.status].color}`}>
                          <StatusIcon className={`w-3.5 h-3.5 ${report.status === 'generating' || report.status === 'validating' ? 'animate-spin' : ''}`} />
                          {statusConfig[report.status].label}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-900 dark:text-white">
                          {report.recordCount?.toLocaleString('ro-RO') || '-'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-900 dark:text-white">
                          {report.fileSize ? formatFileSize(report.fileSize) : '-'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        {report.validationErrors !== undefined && report.validationWarnings !== undefined ? (
                          <div className="flex items-center gap-2">
                            {report.validationErrors === 0 ? (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm">OK</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <XCircle className="w-4 h-4" />
                                <span className="text-sm">{report.validationErrors} erori</span>
                              </span>
                            )}
                            {report.validationWarnings > 0 && (
                              <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm">{report.validationWarnings}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <div className="col-span-1 flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Vizualizează"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        {report.status === 'generated' || report.status === 'validated' || report.status === 'accepted' ? (
                          <button
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Descarcă XML"
                          >
                            <Download className="w-4 h-4 text-gray-500" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {report.period}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(report.createdAt)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[report.status].color}`}>
                          <StatusIcon className={`w-3.5 h-3.5 ${report.status === 'generating' || report.status === 'validating' ? 'animate-spin' : ''}`} />
                          {statusConfig[report.status].label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {report.recordCount?.toLocaleString('ro-RO') || '-'} înregistrări
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {report.fileSize ? formatFileSize(report.fileSize) : '-'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedReport(null)}
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
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Raport SAF-T
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedReport.period}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <XCircle className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[selectedReport.status].color} mt-1`}>
                      {statusConfig[selectedReport.status].label}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Înregistrări</p>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">
                      {selectedReport.recordCount?.toLocaleString('ro-RO') || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Dimensiune fișier</p>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">
                      {selectedReport.fileSize ? formatFileSize(selectedReport.fileSize) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Data creării</p>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">
                      {formatDate(selectedReport.createdAt)}
                    </p>
                  </div>
                </div>

                {selectedReport.anafResponseId && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ID Răspuns ANAF:
                    </p>
                    <p className="font-mono text-green-800 dark:text-green-200 mt-1">
                      {selectedReport.anafResponseId}
                    </p>
                  </div>
                )}

                {selectedReport.validationWarnings && selectedReport.validationWarnings > 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        {selectedReport.validationWarnings} avertismente de validare
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                {selectedReport.status === 'validated' && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Send className="w-4 h-4" />
                    Trimite la ANAF
                  </button>
                )}
                {(selectedReport.status === 'generated' || selectedReport.status === 'validated' || selectedReport.status === 'accepted') && (
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
