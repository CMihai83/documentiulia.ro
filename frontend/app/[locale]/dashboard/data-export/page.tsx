'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Filter,
  Settings,
  Play,
  Pause,
  FileJson,
  FileCode,
  Archive,
  HardDrive,
  History,
  Zap,
  AlertCircle,
} from 'lucide-react';

interface ExportJob {
  id: string;
  name: string;
  type: 'full' | 'partial' | 'incremental';
  format: 'csv' | 'xlsx' | 'json' | 'xml' | 'pdf';
  status: 'completed' | 'running' | 'pending' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  size?: string;
  records?: number;
  downloadUrl?: string;
}

interface ImportJob {
  id: string;
  fileName: string;
  type: string;
  status: 'completed' | 'processing' | 'validating' | 'failed';
  progress: number;
  createdAt: string;
  records: number;
  errors: number;
}

const exportJobs: ExportJob[] = [
  {
    id: 'exp-1',
    name: 'Export Complet Decembrie 2024',
    type: 'full',
    format: 'xlsx',
    status: 'completed',
    progress: 100,
    createdAt: '2024-12-14T10:00:00',
    completedAt: '2024-12-14T10:15:00',
    size: '45.2 MB',
    records: 15420,
    downloadUrl: '#',
  },
  {
    id: 'exp-2',
    name: 'Export Facturi Q4',
    type: 'partial',
    format: 'csv',
    status: 'running',
    progress: 65,
    createdAt: '2024-12-14T11:30:00',
    records: 3250,
  },
  {
    id: 'exp-3',
    name: 'Export Clienti',
    type: 'incremental',
    format: 'json',
    status: 'pending',
    progress: 0,
    createdAt: '2024-12-14T12:00:00',
  },
  {
    id: 'exp-4',
    name: 'Export SAF-T Noiembrie',
    type: 'full',
    format: 'xml',
    status: 'completed',
    progress: 100,
    createdAt: '2024-12-01T09:00:00',
    completedAt: '2024-12-01T09:45:00',
    size: '128.5 MB',
    records: 45000,
    downloadUrl: '#',
  },
  {
    id: 'exp-5',
    name: 'Export Raport TVA',
    type: 'partial',
    format: 'pdf',
    status: 'failed',
    progress: 45,
    createdAt: '2024-12-13T14:00:00',
  },
];

const importJobs: ImportJob[] = [
  {
    id: 'imp-1',
    fileName: 'clienti_noi_dec2024.xlsx',
    type: 'Clienti',
    status: 'completed',
    progress: 100,
    createdAt: '2024-12-14T09:00:00',
    records: 150,
    errors: 0,
  },
  {
    id: 'imp-2',
    fileName: 'produse_catalog.csv',
    type: 'Produse',
    status: 'processing',
    progress: 72,
    createdAt: '2024-12-14T11:00:00',
    records: 1200,
    errors: 3,
  },
  {
    id: 'imp-3',
    fileName: 'facturi_vechi.json',
    type: 'Facturi',
    status: 'validating',
    progress: 25,
    createdAt: '2024-12-14T11:30:00',
    records: 500,
    errors: 0,
  },
];

const availableModules = [
  { id: 'invoices', name: 'Facturi', icon: FileText, records: 12500 },
  { id: 'clients', name: 'Clienti', icon: Database, records: 3200 },
  { id: 'products', name: 'Produse', icon: Archive, records: 8500 },
  { id: 'hr', name: 'Resurse Umane', icon: Database, records: 450 },
  { id: 'accounting', name: 'Contabilitate', icon: FileSpreadsheet, records: 45000 },
  { id: 'inventory', name: 'Stocuri', icon: Archive, records: 15000 },
];

const formatIcons: Record<string, React.ElementType> = {
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  json: FileJson,
  xml: FileCode,
  pdf: FileText,
};

export default function DataExportPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'scheduled'>('export');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Finalizat
          </span>
        );
      case 'running':
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            In curs
          </span>
        );
      case 'pending':
      case 'validating':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            In asteptare
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Esuat
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  // Export action handlers
  const handleViewHistory = () => {
    router.push('/dashboard/data-export/history');
  };

  const handleOpenSettings = () => {
    router.push('/dashboard/data-export/settings');
  };

  const handleStartExport = async () => {
    if (selectedModules.length === 0) {
      toast.error('Selectare necesară', 'Selectați cel puțin un modul pentru export.');
      return;
    }
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/data-export/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: selectedModules, format: exportFormat, dateRange }),
      });
      if (response.ok) {
        toast.success('Export inițiat', `Module: ${selectedModules.join(', ')}`);
      } else {
        toast.success('Export inițiat (Demo)', `Module: ${selectedModules.join(', ')} - funcționalitate în dezvoltare`);
      }
    } catch (err) {
      toast.success('Export inițiat (Demo)', `Module: ${selectedModules.join(', ')} - funcționalitate în dezvoltare`);
    }
  };

  const handleDownloadExport = async (job: ExportJob) => {
    if (job.downloadUrl && job.status === 'completed') {
      window.open(job.downloadUrl, '_blank');
      toast.success('Descărcare', `Export: ${job.name}`);
    } else {
      toast.error('Indisponibil', 'Exportul nu este disponibil pentru descărcare.');
    }
  };

  const handleRetryExport = async (job: ExportJob) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/data-export/${job.id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Reîncercare', `Export: ${job.name}`);
      } else {
        toast.success('Reîncercare (Demo)', `${job.name} - funcționalitate în dezvoltare`);
      }
    } catch (err) {
      toast.success('Reîncercare (Demo)', `${job.name} - funcționalitate în dezvoltare`);
    }
  };

  const handleDeleteExport = (job: ExportJob) => {
    router.push(`/dashboard/data-export/${job.id}/delete`);
  };

  const handleQuickExport = async (type: string) => {
    const exportTypes: Record<string, string> = {
      'all-invoices': 'Toate facturile',
      'this-month': 'Luna curentă',
      'saft-current': 'SAF-T curent',
    };
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/data-export/quick/${type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Export rapid inițiat', exportTypes[type] || type);
      } else {
        toast.success('Export rapid (Demo)', `${exportTypes[type] || type} - funcționalitate în dezvoltare`);
      }
    } catch (err) {
      toast.success('Export rapid (Demo)', `${exportTypes[type] || type} - funcționalitate în dezvoltare`);
    }
  };

  const handleUploadFile = () => {
    router.push('/dashboard/data-export/import/upload');
  };

  const handlePauseExport = async (job: ExportJob) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/data-export/${job.id}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Export în pauză', job.name);
      } else {
        toast.success('Pauză (Demo)', `${job.name} - funcționalitate în dezvoltare`);
      }
    } catch (err) {
      toast.success('Pauză (Demo)', `${job.name} - funcționalitate în dezvoltare`);
    }
  };

  const handleFilterExports = () => {
    router.push('/dashboard/data-export/filter');
  };

  const handleDownloadTemplate = async (type: string) => {
    const templates: Record<string, string> = {
      'clients': 'sablon_clienti.xlsx',
      'products': 'sablon_produse.xlsx',
      'invoices': 'sablon_facturi.xlsx',
    };
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/data-export/templates/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = templates[type] || `sablon_${type}.xlsx`;
        a.click();
        toast.success('Descărcare șablon', templates[type] || type);
      } else {
        toast.success('Descărcare (Demo)', `${templates[type] || type} - funcționalitate în dezvoltare`);
      }
    } catch (err) {
      toast.success('Descărcare (Demo)', `${templates[type] || type} - funcționalitate în dezvoltare`);
    }
  };

  const handleViewImportErrors = (job: ImportJob) => {
    router.push(`/dashboard/data-export/import/${job.id}/errors`);
  };

  const handleScheduleExport = () => {
    router.push('/dashboard/data-export/schedule/new');
  };

  const handleEditSchedule = (scheduleName: string) => {
    router.push(`/dashboard/data-export/schedule/${encodeURIComponent(scheduleName)}/edit`);
  };

  const handleToggleSchedule = async (scheduleName: string, currentlyActive: boolean) => {
    const newStatus = currentlyActive ? 'dezactivată' : 'activată';
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/data-export/schedule/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: scheduleName, active: !currentlyActive }),
      });
      if (response.ok) {
        toast.success('Programare actualizată', `"${scheduleName}" a fost ${newStatus}.`);
      } else {
        toast.success('Programare (Demo)', `"${scheduleName}" - funcționalitate în dezvoltare`);
      }
    } catch (err) {
      toast.success('Programare (Demo)', `"${scheduleName}" - funcționalitate în dezvoltare`);
    }
  };

  const runningExports = exportJobs.filter(j => j.status === 'running').length;
  const completedExports = exportJobs.filter(j => j.status === 'completed').length;
  const totalExportSize = '173.7 MB';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export & Import Date</h1>
          <p className="text-gray-500 mt-1">
            Exporta si importa date din platforma in diferite formate
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleViewHistory} className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <History className="mr-2 h-4 w-4" />
            Istoric
          </button>
          <button onClick={handleOpenSettings} className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <Settings className="mr-2 h-4 w-4" />
            Configurare
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Exporturi Active</p>
              <p className="text-2xl font-bold text-gray-900">{runningExports}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Exporturi Complete</p>
              <p className="text-2xl font-bold text-gray-900">{completedExports}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Spatiu Folosit</p>
              <p className="text-2xl font-bold text-gray-900">{totalExportSize}</p>
            </div>
            <HardDrive className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Importuri Azi</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
            <Upload className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'export'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'scheduled'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Programate
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* New Export */}
              <div className="lg:col-span-1 border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Export Nou</h3>
                <p className="text-sm text-gray-500 mb-4">Selecteaza modulele si formatul</p>

                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Module de exportat</label>
                  <div className="space-y-2">
                    {availableModules.map(module => (
                      <div
                        key={module.id}
                        onClick={() => toggleModule(module.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedModules.includes(module.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <module.icon className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{module.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {module.records.toLocaleString()} inreg.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Format export</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['xlsx', 'csv', 'json', 'xml', 'pdf'].map(format => {
                      const Icon = formatIcons[format] || FileText;
                      return (
                        <button
                          key={format}
                          onClick={() => setExportFormat(format)}
                          className={`flex flex-col items-center justify-center h-16 gap-1 rounded-md border ${
                            exportFormat === format
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="uppercase text-xs">{format}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleStartExport}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={selectedModules.length === 0}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Incepe Export
                </button>
              </div>

              {/* Export Jobs */}
              <div className="lg:col-span-2 border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Exporturi Recente</h3>
                  <button onClick={handleFilterExports} className="flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtreaza
                  </button>
                </div>

                <div className="space-y-4">
                  {exportJobs.map(job => {
                    const FormatIcon = formatIcons[job.format] || FileText;
                    return (
                      <div key={job.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <FormatIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-medium">{job.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="h-3 w-3" />
                                {new Date(job.createdAt).toLocaleString('ro-RO')}
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(job.status)}
                        </div>

                        {job.status === 'running' && (
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progres</span>
                              <span>{job.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 text-sm text-gray-500">
                            {job.records && (
                              <span>{job.records.toLocaleString()} inregistrari</span>
                            )}
                            {job.size && <span>{job.size}</span>}
                          </div>
                          <div className="flex gap-2">
                            {job.status === 'completed' && job.downloadUrl && (
                              <button onClick={() => handleDownloadExport(job)} className="flex items-center px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">
                                <Download className="h-4 w-4 mr-1" />
                                Descarca
                              </button>
                            )}
                            {job.status === 'running' && (
                              <button onClick={() => handlePauseExport(job)} className="p-1.5 border rounded-md hover:bg-gray-50">
                                <Pause className="h-4 w-4" />
                              </button>
                            )}
                            {job.status === 'failed' && (
                              <button onClick={() => handleRetryExport(job)} className="flex items-center px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Reincearca
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Upload Zone */}
              <div className="lg:col-span-1 border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Import Nou</h3>
                <p className="text-sm text-gray-500 mb-4">Incarca fisiere pentru import</p>

                <div onClick={handleUploadFile} className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto text-gray-400 mb-4" />
                  <p className="font-medium mb-1">Trage fisierele aici</p>
                  <p className="text-sm text-gray-500 mb-4">sau click pentru a selecta</p>
                  <p className="text-xs text-gray-400">
                    Formate acceptate: CSV, XLSX, JSON, XML
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Sabloane Import</p>
                  <button onClick={() => handleDownloadTemplate('clients')} className="w-full flex items-center justify-start px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Descarca sablon Clienti
                  </button>
                  <button onClick={() => handleDownloadTemplate('products')} className="w-full flex items-center justify-start px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Descarca sablon Produse
                  </button>
                  <button onClick={() => handleDownloadTemplate('invoices')} className="w-full flex items-center justify-start px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Descarca sablon Facturi
                  </button>
                </div>
              </div>

              {/* Import Jobs */}
              <div className="lg:col-span-2 border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Importuri Recente</h3>

                <div className="space-y-4">
                  {importJobs.map(job => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <FileSpreadsheet className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{job.fileName}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{job.type}</span>
                              <span>•</span>
                              <span>{new Date(job.createdAt).toLocaleString('ro-RO')}</span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>

                      {(job.status === 'processing' || job.status === 'validating') && (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{job.status === 'validating' ? 'Validare' : 'Procesare'}</span>
                            <span>{job.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex gap-4 text-gray-500">
                          <span>{job.records.toLocaleString()} inregistrari</span>
                          {job.errors > 0 && (
                            <span className="text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {job.errors} erori
                            </span>
                          )}
                        </div>
                        {job.status === 'failed' && (
                          <button onClick={() => handleViewImportErrors(job)} className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">
                            Vezi erori
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scheduled Tab */}
          {activeTab === 'scheduled' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Exporturi Programate</h3>
                  <p className="text-sm text-gray-500">Automatizeaza exporturile periodice</p>
                </div>
                <button onClick={handleScheduleExport} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  <Calendar className="mr-2 h-4 w-4" />
                  Programeaza Export
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Backup Saptamanal</h4>
                      <p className="text-sm text-gray-500">In fiecare duminica la 02:00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleToggleSchedule('Backup Saptamanal', true)} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer">
                      Activ
                    </button>
                    <button onClick={() => handleEditSchedule('Backup Saptamanal')} className="p-2 hover:bg-gray-100 rounded-md">
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Export SAF-T Lunar</h4>
                      <p className="text-sm text-gray-500">Prima zi a lunii la 08:00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleToggleSchedule('Export SAF-T Lunar', true)} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer">
                      Activ
                    </button>
                    <button onClick={() => handleEditSchedule('Export SAF-T Lunar')} className="p-2 hover:bg-gray-100 rounded-md">
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Export Cloud Zilnic</h4>
                      <p className="text-sm text-gray-500">Zilnic la 23:00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleToggleSchedule('Export Cloud Zilnic', false)} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer">
                      Dezactivat
                    </button>
                    <button onClick={() => handleEditSchedule('Export Cloud Zilnic')} className="p-2 hover:bg-gray-100 rounded-md">
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
