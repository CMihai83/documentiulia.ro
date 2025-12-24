'use client';

import { useState, memo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useComplianceAlerts } from '@/contexts/NotificationContext';
import { useDashboardSummary, useInvalidateDashboard } from '@/hooks/useDashboardData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Upload, FileText, TrendingUp, RefreshCw } from 'lucide-react';
import { SkeletonDashboard } from '@/components/ui/Skeleton';

interface CashFlowItem {
  month: string;
  income: number;
  expenses: number;
}

interface VatSummaryItem {
  name: string;
  value: number;
  color: string;
}

interface ActivityItem {
  type: 'invoice' | 'document' | 'audit' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  entityId?: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

interface DashboardData {
  cashFlow: CashFlowItem[];
  vatSummary: VatSummaryItem[];
  recentActivity: ActivityItem[];
  totalIncome: number;
  totalExpenses: number;
  vatCollected: number;
  vatDeductible: number;
  vatPayable: number;
  invoiceCount: number;
  pendingInvoices: number;
}

// Fallback static data for when API is unavailable
const fallbackCashFlow: CashFlowItem[] = [
  { month: 'Ian', income: 45000, expenses: 32000 },
  { month: 'Feb', income: 52000, expenses: 35000 },
  { month: 'Mar', income: 48000, expenses: 30000 },
  { month: 'Apr', income: 61000, expenses: 42000 },
  { month: 'Mai', income: 55000, expenses: 38000 },
  { month: 'Iun', income: 67000, expenses: 45000 },
];

const fallbackVatData: VatSummaryItem[] = [
  { name: 'TVA Colectat', value: 12600, color: '#3b82f6' },
  { name: 'TVA Deductibil', value: 8400, color: '#22c55e' },
  { name: 'TVA de Plată', value: 4200, color: '#f59e0b' },
];

// Memoized chart components for performance
const CashFlowChart = memo(function CashFlowChart({
  data,
  title,
}: {
  data: CashFlowItem[];
  title: string;
}) {
  return (
    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-sm">
      <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2 dark:text-white">
        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
        {title}
      </h2>
      <div className="h-48 sm:h-64 md:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-600" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              className="dark:fill-gray-400"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              className="dark:fill-gray-400"
            />
            <Tooltip
              formatter={(value) => `${Number(value).toLocaleString()} RON`}
              contentStyle={{ backgroundColor: 'var(--bg-tooltip)', borderColor: 'var(--border-tooltip)' }}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#22c55e"
              strokeWidth={2}
              name="Venituri"
              dot={{ r: 2 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={2}
              name="Cheltuieli"
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

const VatPieChart = memo(function VatPieChart({
  data,
  title,
}: {
  data: VatSummaryItem[];
  title: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-sm">
      <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 dark:text-white">
        {title}
      </h2>
      <div className="h-36 sm:h-48 md:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${Number(value).toLocaleString()} RON`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1 sm:space-y-2 mt-3 sm:mt-4">
        {data.map((item) => (
          <div key={item.name} className="flex justify-between text-xs sm:text-sm dark:text-gray-300">
            <span className="flex items-center gap-1 sm:gap-2">
              <span
                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="font-semibold whitespace-nowrap ml-2">
              {item.value.toLocaleString()} RON
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

const DocumentUpload = memo(function DocumentUpload({
  uploadedFiles,
  setUploadedFiles,
  title,
  dragDropText,
}: {
  uploadedFiles: File[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  title: string;
  dragDropText: string;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    onDrop: (files) => setUploadedFiles((prev) => [...prev, ...files]),
  });

  return (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-sm">
      <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2 dark:text-white">
        <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
        {title}
      </h2>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 active:border-primary-500'
        }`}
        role="button"
        aria-label={dragDropText}
      >
        <input {...getInputProps()} />
        <FileText className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto text-gray-400 mb-2 sm:mb-4" />
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{dragDropText}</p>
        <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1 sm:mt-2">
          PDF, PNG, JPG (max 10MB)
        </p>
      </div>
      {uploadedFiles.length > 0 && (
        <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2 max-h-32 overflow-y-auto">
          {uploadedFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs sm:text-sm"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-primary-600 flex-shrink-0" />
              <span className="truncate dark:text-gray-300">{file.name}</span>
              <span className="text-gray-400 ml-auto whitespace-nowrap">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export function DashboardClient() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const toast = useToast();
  const { logout } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // React Query hook for dashboard data with caching
  const { data: dashboardData, isLoading, isFetching, refetch } = useDashboardSummary();
  const { invalidateSummary } = useInvalidateDashboard();

  // Show compliance deadline alerts on dashboard load
  useComplianceAlerts();

  // File management handlers
  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessFile = async (file: File) => {
    setProcessingFile(file.name);
    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/v1/ocr/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // Navigate to OCR results page
        router.push(`/dashboard/ocr?result=${result.id}`);
      } else {
        // Show toast notification instead of alert
        console.error('OCR processing failed');
      }
    } catch (err) {
      console.error('OCR processing error:', err);
    } finally {
      setProcessingFile(null);
    }
  };

  const handleProcessAllFiles = async () => {
    if (uploadedFiles.length === 0) {
      return;
    }

    router.push(`/dashboard/ocr/batch-process?count=${uploadedFiles.length}`);
  };

  const handleProcessAllFilesConfirmed = async () => {
    const token = localStorage.getItem('auth_token');
    const results = [];

    for (const file of uploadedFiles) {
      setProcessingFile(file.name);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/v1/ocr/process`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (response.ok) {
          results.push(await response.json());
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
      }
    }

    setProcessingFile(null);
    setUploadedFiles([]);

    // Navigate to documents page with processed files
    if (results.length > 0) {
      toast.success('Procesare completă', `${results.length} fișier(e) au fost procesate cu succes.`);
      router.push('/dashboard/documents?filter=recent');
    }
  };

  // Navigation handlers - KPI drill-downs
  const handleCashFlowClick = (dataPoint?: CashFlowItem) => {
    if (dataPoint) {
      router.push(`/dashboard/finance?month=${dataPoint.month}`);
    } else {
      router.push('/dashboard/finance');
    }
  };

  const handleVatClick = (segment?: string) => {
    if (segment) {
      router.push(`/dashboard/vat?type=${segment}`);
    } else {
      router.push('/dashboard/vat');
    }
  };

  const handleIncomeClick = () => {
    router.push('/dashboard/invoices?type=income');
  };

  const handleExpensesClick = () => {
    router.push('/dashboard/expenses');
  };

  const handleInvoicesClick = () => {
    router.push('/dashboard/invoices');
  };

  const handlePendingInvoicesClick = () => {
    router.push('/dashboard/invoices?status=pending');
  };

  // Quick action handlers
  const handleNewInvoice = () => {
    router.push('/dashboard/invoices/new');
  };

  const handleNewExpense = () => {
    router.push('/dashboard/expenses/new');
  };

  const handleRunVatReport = () => {
    router.push('/dashboard/vat/report');
  };

  const handleViewCalendar = () => {
    router.push('/dashboard/scheduling');
  };

  const handleViewNotifications = () => {
    router.push('/dashboard/notifications');
  };

  // Export handlers
  const handleExportDashboard = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/export/dashboard?format=pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard_report_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Dashboard export failed');
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleExportCashFlow = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/export/cash-flow?format=xlsx`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cash_flow_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Cash flow export error:', err);
    }
  };

  const handleExportVatSummary = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/export/vat-summary?format=pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vat_summary_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('VAT summary export error:', err);
    }
  };

  // Refresh handlers - using React Query's refetch
  const handleRefreshData = () => {
    refetch();
  };

  const handleRefreshCashFlow = () => {
    refetch();
  };

  const handleRefreshVat = () => {
    refetch();
  };

  // Period selection handlers
  const handleChangePeriod = (period: string) => {
    setSelectedPeriod(period);
    invalidateSummary();
  };

  // Alert handlers
  const handleComplianceAlert = (alertType: string) => {
    switch (alertType) {
      case 'vat':
        router.push('/dashboard/vat');
        break;
      case 'saft':
        router.push('/dashboard/saft');
        break;
      case 'efactura':
        router.push('/dashboard/efactura');
        break;
      default:
        router.push('/dashboard/compliance');
    }
  };

  // Widget configuration handlers
  const handleConfigureWidgets = () => {
    router.push('/dashboard/settings/widgets');
  };

  const handleHideWidget = (widgetName: string) => {
    router.push(`/dashboard/settings/widgets/hide?name=${encodeURIComponent(widgetName)}`);
  };

  const handleHideWidgetConfirmed = (widgetName: string) => {
    // Store hidden widget preference
    const hiddenWidgets = JSON.parse(localStorage.getItem('hiddenWidgets') || '[]');
    hiddenWidgets.push(widgetName);
    localStorage.setItem('hiddenWidgets', JSON.stringify(hiddenWidgets));
    toast.success('Widget ascuns', `Widget-ul "${widgetName}" a fost ascuns.`);
    // Trigger re-render
    window.location.reload();
  };

  // AI assistant handlers
  const handleAskAI = async (question: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/ai/assistant`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, context: 'dashboard' }),
      });

      if (response.ok) {
        const result = await response.json();
        // Navigate to AI assistant with response
        router.push(`/dashboard/ai-assistant?q=${encodeURIComponent(question)}&answer=${result.id}`);
      }
    } catch (err) {
      console.error('AI assistant error:', err);
      router.push(`/dashboard/ai-assistant?q=${encodeURIComponent(question)}`);
    }
  };

  const handleGetAIInsights = () => {
    router.push('/dashboard/ai-assistant');
  };

  // Module navigation
  const handleNavigateToModule = (module: string) => {
    const routes: Record<string, string> = {
      finance: '/dashboard/finance',
      hr: '/dashboard/hr',
      crm: '/dashboard/crm',
      inventory: '/dashboard/inventory',
      analytics: '/dashboard/analytics',
      compliance: '/dashboard/compliance',
      reports: '/dashboard/reports',
      settings: '/dashboard/settings',
    };

    if (routes[module]) {
      router.push(routes[module]);
    }
  };

  // Search handler
  const handleGlobalSearch = (query: string) => {
    if (!query.trim()) return;
    router.push(`/dashboard/search?q=${encodeURIComponent(query)}`);
  };

  // Get data from React Query hook (with fallback placeholders)
  const cashFlowData = dashboardData?.cashFlow || fallbackCashFlow;
  const vatData = dashboardData?.vatSummary || fallbackVatData;

  // Show skeleton while loading initial data
  if (isLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <>
      {/* Background refresh indicator */}
      {isFetching && !isLoading && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Se actualizează...</span>
        </div>
      )}

      {/* Main Charts Grid - Stack on mobile, side-by-side on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <CashFlowChart data={cashFlowData} title={t('cashFlow')} />
        <VatPieChart data={vatData} title={t('vatSummary')} />
      </div>

      {/* Document Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <DocumentUpload
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          title={t('uploadDoc')}
          dragDropText={t('dragDrop')}
        />
      </div>
    </>
  );
}
