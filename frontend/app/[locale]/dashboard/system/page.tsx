'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Server,
  Database,
  Clock,
  Cpu,
  HardDrive,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wifi,
  Globe,
  Shield,
  Zap,
  BarChart3,
} from 'lucide-react';

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    api: string;
    database: string;
  };
  version: string;
  compliance: {
    anaf: string;
    vat: string;
    efactura: string;
  };
}

interface HealthMetrics {
  timestamp: string;
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: string;
  };
  endpoints: Record<string, number>;
  statusCodes: Record<string, number>;
  uptime: {
    milliseconds: number;
    formatted: string;
  };
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
  lastReset: string;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthData = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

      const [healthRes, metricsRes] = await Promise.all([
        fetch(`${API_URL}/health`),
        fetch(`${API_URL}/health/metrics`),
      ]);

      if (healthRes.ok) {
        setHealth(await healthRes.json());
      }
      if (metricsRes.ok) {
        setMetrics(await metricsRes.json());
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();

    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 10000);
      return () => clearInterval(interval);
    }
  }, [fetchHealthData, autoRefresh]);

  const getStatusIcon = (status: string) => {
    if (status === 'healthy' || status === 'ok') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (status === 'degraded') {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy' || status === 'ok') return 'bg-green-100 text-green-800';
    if (status === 'degraded') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const parseMemory = (memStr: string): number => {
    const match = memStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
  };

  const successRate = metrics
    ? ((metrics.requests.successful / Math.max(metrics.requests.total, 1)) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-600" />
            Stare Sistem
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitorizare in timp real a infrastructurii
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh (10s)
          </label>
          <button
            onClick={fetchHealthData}
            disabled={loading}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizeaza
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      {health && (
        <div className={`p-4 rounded-lg ${health.status === 'ok' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(health.status)}
              <div>
                <h2 className="font-semibold text-gray-900">
                  {health.status === 'ok' ? 'Toate sistemele functioneaza normal' : 'Probleme detectate'}
                </h2>
                <p className="text-sm text-gray-600">
                  Ultima verificare: {new Date(health.timestamp).toLocaleString('ro-RO')}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
              {health.status.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* API Status */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-900">API Server</span>
            </div>
            {health && getStatusIcon(health.services.api)}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Versiune</span>
              <span className="font-medium">{health?.version || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Uptime</span>
              <span className="font-medium">{metrics ? formatUptime(metrics.uptime.milliseconds) : '-'}</span>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-900">Baza de date</span>
            </div>
            {health && getStatusIcon(health.services.database)}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tip</span>
              <span className="font-medium">PostgreSQL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className={`px-2 py-0.5 rounded text-xs ${health?.services.database === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {health?.services.database || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-900">Memorie</span>
            </div>
            <HardDrive className="w-5 h-5 text-blue-500" />
          </div>
          {metrics && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Heap Used</span>
                <span className="font-medium">{metrics.memory.heapUsed}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(parseMemory(metrics.memory.heapUsed) / parseMemory(metrics.memory.heapTotal)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>{metrics.memory.heapTotal}</span>
              </div>
            </div>
          )}
        </div>

        {/* Request Stats */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-900">Cereri</span>
            </div>
            <BarChart3 className="w-5 h-5 text-purple-500" />
          </div>
          {metrics && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-medium">{metrics.requests.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Rata succes</span>
                <span className={`font-medium ${parseFloat(successRate) >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {successRate}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Timp mediu</span>
                <span className="font-medium">{metrics.requests.averageResponseTime}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compliance Status */}
      {health && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-600" />
              Conformitate Legislativa
            </h3>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">ANAF Integration</div>
              <div className="font-medium text-gray-900">{health.compliance.anaf}</div>
              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Activ
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Cote TVA</div>
              <div className="font-medium text-gray-900">{health.compliance.vat}</div>
              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                21%/11% din Aug 2025
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">e-Factura Format</div>
              <div className="font-medium text-gray-900">{health.compliance.efactura}</div>
              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                SPV Ready
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Endpoint Statistics */}
      {metrics && metrics.endpoints && Object.keys(metrics.endpoints).length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-600" />
              Statistici Endpoint-uri
            </h3>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="pb-3">Endpoint</th>
                    <th className="pb-3 text-right">Cereri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(metrics.endpoints)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([endpoint, count]) => (
                      <tr key={endpoint}>
                        <td className="py-2 text-sm font-mono text-gray-900">{endpoint}</td>
                        <td className="py-2 text-sm text-right text-gray-600">{count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Status Codes */}
      {metrics && metrics.statusCodes && Object.keys(metrics.statusCodes).length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary-600" />
              Coduri de Raspuns HTTP
            </h3>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-3">
              {Object.entries(metrics.statusCodes).map(([code, count]) => (
                <div
                  key={code}
                  className={`px-4 py-2 rounded-lg ${
                    code.startsWith('2') ? 'bg-green-100 text-green-800' :
                    code.startsWith('3') ? 'bg-blue-100 text-blue-800' :
                    code.startsWith('4') ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  <span className="font-bold">{code}</span>
                  <span className="ml-2 text-sm opacity-75">({count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>Ultima actualizare: {lastUpdate.toLocaleString('ro-RO')}</p>
      </div>
    </div>
  );
}
