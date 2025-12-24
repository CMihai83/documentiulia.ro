'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Eye, Calendar, User, Activity, Database, Loader2 } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  organizationId?: string;
  organizationName?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  topActions: { action: string; count: number }[];
  topEntities: { entity: string; count: number }[];
}

export default function AuditLogsPage() {
  const t = useTranslations('audit');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [actions, setActions] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const limit = 20;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchFilters();
  }, [actionFilter, entityFilter, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(entityFilter !== 'all' && { entity: entityFilter }),
      });

      const response = await fetch(`${API_URL}/audit?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError(t('noAccess'));
          setLogs([]);
          return;
        }
        throw new Error('Failed to fetch audit logs');
      }

      const data: AuditLogsResponse = await response.json();
      setLogs(data.data || []);
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(t('error'));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/audit/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data: AuditStats = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit stats:', err);
    }
  };

  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const [actionsRes, entitiesRes] = await Promise.all([
        fetch(`${API_URL}/audit/actions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/audit/entities`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (actionsRes.ok) {
        const actionsData = await actionsRes.json();
        setActions(actionsData);
      }
      if (entitiesRes.ok) {
        const entitiesData = await entitiesRes.json();
        setEntities(entitiesData);
      }
    } catch (err) {
      console.error('Failed to fetch filters:', err);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.entity.toLowerCase().includes(term) ||
      log.userName?.toLowerCase().includes(term) ||
      log.userEmail?.toLowerCase().includes(term) ||
      log.entityId?.toLowerCase().includes(term)
    );
  });

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ro-RO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return `${minutes} ${t('minutesAgo')}`;
    if (hours < 24) return `${hours} ${t('hoursAgo')}`;
    return `${days} ${t('daysAgo')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <button
          onClick={() => {
            fetchLogs();
            fetchStats();
          }}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          {t('refresh')}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">{t('totalLogs')}</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalLogs.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">{t('todayLogs')}</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.todayLogs.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-2">{t('topActions')}</p>
            <div className="space-y-1">
              {stats.topActions.slice(0, 3).map((a) => (
                <div key={a.action} className="flex justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded ${getActionColor(a.action)}`}>{a.action}</span>
                  <span className="text-gray-600">{a.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-2">{t('topEntities')}</p>
            <div className="space-y-1">
              {stats.topEntities.slice(0, 3).map((e) => (
                <div key={e.entity} className="flex justify-between text-sm">
                  <span className="text-gray-700">{e.entity}</span>
                  <span className="text-gray-600">{e.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('allActions')}</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(0);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('allEntities')}</option>
              {entities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-500 mb-4">
          {t('showing')} {filteredLogs.length} {t('of')} {total} {t('results')}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('noLogs')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('timestamp')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('action')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('entity')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('ipAddress')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('details')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{formatDate(log.createdAt)}</div>
                      <div className="text-xs text-gray-400">{formatRelativeTime(log.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.userName || t('unknownUser')}</div>
                          <div className="text-xs text-gray-500">{log.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Database className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">{log.entity}</div>
                          {log.entityId && <div className="text-xs text-gray-400">ID: {log.entityId.slice(0, 8)}...</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('viewDetails')}
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              {t('previous')}
            </button>
            <span className="px-3 py-1">
              {page + 1} / {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              {t('next')}
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{t('logDetails')}</h3>
                <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-700">
                  &times;
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{t('action')}:</span>
                    <span className={`ml-2 px-2 py-1 rounded ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('entity')}:</span>
                    <span className="ml-2 text-gray-900">{selectedLog.entity}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('user')}:</span>
                    <span className="ml-2 text-gray-900">{selectedLog.userName || selectedLog.userEmail}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('timestamp')}:</span>
                    <span className="ml-2 text-gray-900">{formatDate(selectedLog.createdAt)}</span>
                  </div>
                  {selectedLog.entityId && (
                    <div className="col-span-2">
                      <span className="text-gray-500">{t('entityId')}:</span>
                      <span className="ml-2 text-gray-900 font-mono">{selectedLog.entityId}</span>
                    </div>
                  )}
                  {selectedLog.ipAddress && (
                    <div>
                      <span className="text-gray-500">{t('ipAddress')}:</span>
                      <span className="ml-2 text-gray-900">{selectedLog.ipAddress}</span>
                    </div>
                  )}
                </div>
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <p className="text-gray-500 mb-2">{t('details')}:</p>
                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
