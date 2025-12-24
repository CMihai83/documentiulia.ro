'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  X,
  Bug,
  Globe,
  Zap,
  AlertCircle,
} from 'lucide-react';

interface ErrorLog {
  id: string;
  message: string;
  stack: string;
  type: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  source: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface ErrorsResponse {
  errors: ErrorLog[];
  total: number;
  page: number;
  limit: number;
}

const ERROR_TYPES = [
  { value: '', label: 'Toate tipurile' },
  { value: 'ReactComponentError', label: 'Eroare Component React', icon: Bug },
  { value: 'UnhandledError', label: 'Eroare Neașteptată', icon: AlertTriangle },
  { value: 'PromiseRejection', label: 'Promise Respins', icon: Zap },
  { value: 'NetworkError', label: 'Eroare Rețea', icon: Globe },
  { value: 'APIError', label: 'Eroare API', icon: AlertCircle },
];

export default function ErrorsAdminPage() {
  const t = useTranslations('admin');
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (typeFilter) queryParams.append('type', typeFilter);

      const response = await fetch(`/api/errors?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch errors');
      }

      const data: ErrorsResponse = await response.json();
      setErrors(data.errors || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch errors:', error);
      setErrors([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const totalPages = Math.ceil(total / limit);

  const getTypeIcon = (type: string) => {
    const typeInfo = ERROR_TYPES.find(t => t.value === type);
    const Icon = typeInfo?.icon || AlertTriangle;
    return <Icon className="w-4 h-4" />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ReactComponentError':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'UnhandledError':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'PromiseRejection':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'NetworkError':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'APIError':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bug className="w-6 h-6 text-red-500" />
            Jurnal de Erori
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {total} erori înregistrate
          </p>
        </div>
        <button
          onClick={fetchErrors}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Reîmprospătează
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtre</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {ERROR_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => {
                setTypeFilter(type.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                typeFilter === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Errors Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tip
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mesaj
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilizator
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Se încarcă...
                  </td>
                </tr>
              ) : errors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    Nu există erori înregistrate.
                  </td>
                </tr>
              ) : (
                errors.map((error) => (
                  <tr
                    key={error.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {format(new Date(error.createdAt), 'dd MMM yyyy HH:mm', { locale: ro })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(error.type)}`}>
                        {getTypeIcon(error.type)}
                        {error.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                      {error.message}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {error.url || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {error.userId || 'Anonim'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedError(error)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Vezi detalii"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500">
              Pagina {page} din {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {getTypeIcon(selectedError.type)}
                Detalii Eroare
              </h3>
              <button
                onClick={() => setSelectedError(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Mesaj</label>
                  <p className="mt-1 text-gray-900 dark:text-white font-mono text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    {selectedError.message}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Tip</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedError.type)}`}>
                        {selectedError.type}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Data</label>
                    <p className="mt-1 text-gray-900 dark:text-white text-sm">
                      {format(new Date(selectedError.createdAt), 'dd MMMM yyyy, HH:mm:ss', { locale: ro })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">URL</label>
                  <p className="mt-1 text-gray-900 dark:text-white text-sm break-all">
                    {selectedError.url || '-'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Utilizator</label>
                  <p className="mt-1 text-gray-900 dark:text-white text-sm">
                    {selectedError.userId || 'Anonim'}
                  </p>
                </div>

                {selectedError.stack && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Stack Trace</label>
                    <pre className="mt-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {selectedError.stack}
                    </pre>
                  </div>
                )}

                {selectedError.componentStack && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Component Stack</label>
                    <pre className="mt-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {selectedError.componentStack}
                    </pre>
                  </div>
                )}

                {selectedError.userAgent && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">User Agent</label>
                    <p className="mt-1 text-gray-700 dark:text-gray-300 text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-lg break-all">
                      {selectedError.userAgent}
                    </p>
                  </div>
                )}

                {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Metadata</label>
                    <pre className="mt-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedError.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
