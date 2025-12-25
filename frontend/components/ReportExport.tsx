'use client';

import { useState } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Mail,
  Calendar,
  Clock,
  Check,
  Loader2,
  X,
  ChevronDown,
  Settings,
} from 'lucide-react';

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  format: 'pdf' | 'xlsx' | 'csv' | 'xml';
}

interface ReportExportProps {
  title: string;
  description?: string;
  onExport: (format: string, options: ExportOptions) => Promise<void>;
  availableFormats?: ('pdf' | 'xlsx' | 'csv' | 'xml')[];
  showSchedule?: boolean;
  showEmail?: boolean;
}

interface ExportOptions {
  format: string;
  dateRange?: { from: string; to: string };
  includeCharts?: boolean;
  includeDetails?: boolean;
  email?: string;
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly' | null;
}

const defaultFormats: ExportOption[] = [
  {
    id: 'pdf',
    label: 'PDF',
    description: 'Document formatat pentru printare',
    icon: <FileText className="w-5 h-5 text-red-500" />,
    format: 'pdf',
  },
  {
    id: 'xlsx',
    label: 'Excel',
    description: 'Foaie de calcul editabilă',
    icon: <FileSpreadsheet className="w-5 h-5 text-green-500" />,
    format: 'xlsx',
  },
  {
    id: 'csv',
    label: 'CSV',
    description: 'Format text pentru import',
    icon: <FileText className="w-5 h-5 text-blue-500" />,
    format: 'csv',
  },
  {
    id: 'xml',
    label: 'XML',
    description: 'Format structurat ANAF',
    icon: <FileText className="w-5 h-5 text-purple-500" />,
    format: 'xml',
  },
];

export function ReportExport({
  title,
  description,
  onExport,
  availableFormats = ['pdf', 'xlsx', 'csv'],
  showSchedule = false,
  showEmail = false,
}: ReportExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeCharts: true,
    includeDetails: true,
    scheduleFrequency: null,
  });

  const formats = defaultFormats.filter(f => availableFormats.includes(f.format));

  const handleExport = async () => {
    setExporting(true);
    setExportSuccess(false);
    try {
      await onExport(selectedFormat, { ...options, format: selectedFormat });
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <Download className="w-4 h-4" />
        Exportă
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Export Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  {description && (
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Format Selection */}
            <div className="p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Format
              </p>
              <div className="grid grid-cols-2 gap-2">
                {formats.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.format)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                      selectedFormat === format.format
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {format.icon}
                    <div className="text-left">
                      <div className="font-medium text-sm text-gray-900">{format.label}</div>
                      <div className="text-xs text-gray-500">{format.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <div className="px-4 pb-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
              >
                <Settings className="w-4 h-4" />
                Opțiuni avansate
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="px-4 pb-4 space-y-3">
                {/* Include Charts */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeCharts}
                    onChange={(e) => setOptions({ ...options, includeCharts: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include grafice</span>
                </label>

                {/* Include Details */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeDetails}
                    onChange={(e) => setOptions({ ...options, includeDetails: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include detalii complete</span>
                </label>

                {/* Email Option */}
                {showEmail && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Trimite pe email
                    </label>
                    <input
                      type="email"
                      value={options.email || ''}
                      onChange={(e) => setOptions({ ...options, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Schedule Option */}
                {showSchedule && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Programează export
                    </label>
                    <select
                      value={options.scheduleFrequency || ''}
                      onChange={(e) => setOptions({
                        ...options,
                        scheduleFrequency: e.target.value as 'daily' | 'weekly' | 'monthly' | null || null
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Fără programare</option>
                      <option value="daily">Zilnic</option>
                      <option value="weekly">Săptămânal</option>
                      <option value="monthly">Lunar</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleExport}
                disabled={exporting}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  exportSuccess
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Se exportă...
                  </>
                ) : exportSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Exportat cu succes!
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Exportă {selectedFormat.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Utility function to trigger file download
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Utility function to convert data to CSV
export const convertToCSV = (data: Record<string, unknown>[], headers?: string[]): string => {
  if (data.length === 0) return '';

  const keys = headers || Object.keys(data[0]);
  const csvRows = [];

  // Header row
  csvRows.push(keys.join(','));

  // Data rows
  for (const row of data) {
    const values = keys.map(key => {
      const value = row[key];
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value ?? '').replace(/"/g, '""');
      return escaped.includes(',') ? `"${escaped}"` : escaped;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

export default ReportExport;
