'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Server,
  Cpu,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Bell,
  Zap,
  Globe,
  Shield,
  AlertCircle,
  Loader2,
  Database,
  Gauge,
  History,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { api } from '@/lib/api';
import { toastFromAnywhere } from '@/lib/toast-bus';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/Skeleton';

// ---------------------------------------------------------------------------
// Backend contracts (backend/src/monitoring/monitoring.service.ts)
// ---------------------------------------------------------------------------

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertStatus = 'firing' | 'resolved' | 'acknowledged';

interface HealthCheck {
  name: string;
  status: HealthStatus;
  message?: string;
  latency?: number;
  lastChecked: string;
  details?: Record<string, unknown>;
}

interface SystemMetrics {
  cpu: { usage: number; loadAverage: number[]; cores: number };
  memory: { total: number; used: number; free: number; usagePercent: number };
  process: {
    uptime: number;
    pid: number;
    memoryUsage: { rss: number; heapTotal: number; heapUsed: number; external: number };
    cpuUsage: { user: number; system: number };
  };
  disk?: { total: number; used: number; free: number; usagePercent: number };
}

interface ApplicationMetrics {
  requests: { total: number; successful: number; failed: number; perSecond: number };
  latency: { avg: number; p50: number; p95: number; p99: number; max: number };
  errors: { total: number; byType: Record<string, number>; rate: number };
  activeConnections: number;
  queueLength: number;
}

interface MonitoringAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  value: number;
  threshold: number;
  labels: Record<string, string>;
  firedAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

interface DashboardResponse {
  system: SystemMetrics;
  application: ApplicationMetrics;
  health: { overall: HealthStatus; checks: HealthCheck[] };
  alerts: { active: number; critical: number; warning: number; recent: MonitoringAlert[] };
  timestamp: string;
}

interface MetricSeries {
  name: string;
  dataPoints: { timestamp: string; value: number }[];
}

type TimeRange = '1h' | '24h' | '7d' | '30d';
type Tab = 'overview' | 'services' | 'alerts' | 'resources';

const RANGE_MS: Record<TimeRange, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const AUTO_REFRESH_MS = 30_000;
const FORBIDDEN_MESSAGE = 'Monitorizarea este disponibilă doar administratorilor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatUptime(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}z ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}

function formatRelative(iso: string | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = Math.max(0, Date.now() - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `acum ${s} sec`;
  const m = Math.floor(s / 60);
  if (m < 60) return `acum ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `acum ${h} ${h === 1 ? 'oră' : 'ore'}`;
  const d = Math.floor(h / 24);
  return `acum ${d} ${d === 1 ? 'zi' : 'zile'}`;
}

function formatTimeLabel(iso: string, range: TimeRange): string {
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return '';
  if (range === '7d' || range === '30d') {
    return dt.toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  return dt.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return '—';
  return dt.toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Reduce a long series to at most `max` points (keeps first/last). */
function downsample<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const step = points.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

/** Merge several series on a 10-second bucket (backend samples every 10 s). */
function mergeSeries(
  series: Record<string, MetricSeries | null>,
  range: TimeRange,
): Array<Record<string, number | string>> {
  const buckets = new Map<number, Record<string, number | string>>();
  Object.entries(series).forEach(([key, s]) => {
    s?.dataPoints.forEach(dp => {
      const t = new Date(dp.timestamp).getTime();
      if (!Number.isFinite(t)) return;
      const bucket = Math.round(t / 10_000) * 10_000;
      const row = buckets.get(bucket) ?? { ts: bucket, time: formatTimeLabel(new Date(bucket).toISOString(), range) };
      row[key] = Math.round(dp.value * 100) / 100;
      buckets.set(bucket, row);
    });
  });
  return downsample(
    Array.from(buckets.values()).sort((a, b) => Number(a.ts) - Number(b.ts)),
    300,
  );
}

/** GET /monitoring/alerts is served by MonitoringController (Alert[]); the
 *  AlertingController variant returns { alerts, stats }. Accept both. */
function normalizeAlerts(data: unknown): MonitoringAlert[] {
  if (Array.isArray(data)) return data as MonitoringAlert[];
  if (data && typeof data === 'object' && Array.isArray((data as { alerts?: unknown }).alerts)) {
    return (data as { alerts: MonitoringAlert[] }).alerts;
  }
  return [];
}

const HEALTH_LABELS: Record<string, string> = {
  api: 'API Principal',
  database: 'Bază de date',
  memory: 'Memorie proces',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MonitoringPage() {
  const { user } = useAuth();

  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<MonitoringAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<MonitoringAlert[]>([]);
  const [cpuSeries, setCpuSeries] = useState<MetricSeries | null>(null);
  const [memSeries, setMemSeries] = useState<MetricSeries | null>(null);
  const [latencySeries, setLatencySeries] = useState<MetricSeries | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ---- Data loading -------------------------------------------------------

  const loadHistory = useCallback(async (range: TimeRange): Promise<boolean> => {
    const since = new Date(Date.now() - RANGE_MS[range]).toISOString();
    const [cpu, mem, lat] = await Promise.all([
      api.get<MetricSeries | null>('/monitoring/metrics/system.cpu.usage/history', { params: { since } }),
      api.get<MetricSeries | null>('/monitoring/metrics/system.memory.usage/history', { params: { since } }),
      api.get<MetricSeries | null>('/monitoring/metrics/app.requests.latency/history', { params: { since } }),
    ]);
    if ([cpu, mem, lat].some(r => r.status === 403)) return false;
    setCpuSeries(cpu.status >= 200 && cpu.status < 300 ? cpu.data ?? null : null);
    setMemSeries(mem.status >= 200 && mem.status < 300 ? mem.data ?? null : null);
    setLatencySeries(lat.status >= 200 && lat.status < 300 ? lat.data ?? null : null);
    return true;
  }, []);

  const loadAll = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent' = 'refresh') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      setError(null);

      const [dash, checks, alerts, history] = await Promise.all([
        api.get<DashboardResponse>('/monitoring/dashboard'),
        api.get<HealthCheck[]>('/monitoring/health/checks'),
        api.get<unknown>('/monitoring/alerts'),
        api.get<MonitoringAlert[]>('/monitoring/alerts/history', { params: { limit: 50 } }),
      ]);

      if ([dash, checks, alerts, history].some(r => r.status === 403)) {
        setForbidden(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setForbidden(false);

      if (dash.status < 200 || dash.status >= 300 || !dash.data) {
        const msg =
          dash.status === 0
            ? 'Serverul nu răspunde. Verificați conexiunea și reîncercați.'
            : dash.error || `Eroare la încărcarea datelor de monitorizare (cod ${dash.status}).`;
        setError(msg);
        if (mode !== 'silent') toastFromAnywhere('error', 'Monitorizare indisponibilă', msg);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setDashboard(dash.data);
      setHealthChecks(
        checks.status >= 200 && checks.status < 300 && Array.isArray(checks.data)
          ? checks.data
          : dash.data.health?.checks ?? [],
      );
      setActiveAlerts(
        alerts.status >= 200 && alerts.status < 300 ? normalizeAlerts(alerts.data) : dash.data.alerts?.recent ?? [],
      );
      setAlertHistory(
        history.status >= 200 && history.status < 300 && Array.isArray(history.data) ? history.data : [],
      );

      const ok = await loadHistory(timeRange);
      if (!ok) setForbidden(true);

      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    },
    [loadHistory, timeRange],
  );

  // Initial load
  useEffect(() => {
    void loadAll('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh while the page is visible and accessible
  useEffect(() => {
    if (forbidden) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadAll('silent');
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [forbidden, loadAll]);

  // Reload chart history when the time range changes
  const handleRangeChange = async (range: TimeRange) => {
    setTimeRange(range);
    if (forbidden || loading) return;
    setHistoryLoading(true);
    const ok = await loadHistory(range);
    if (!ok) setForbidden(true);
    setHistoryLoading(false);
  };

  // ---- Actions ------------------------------------------------------------

  const acknowledgeOne = async (alertId: string, quiet = false): Promise<boolean> => {
    const r = await api.post<{ success: boolean }>(`/monitoring/alerts/${alertId}/acknowledge`, {
      acknowledgedBy: user?.email ?? user?.name ?? 'utilizator',
    });
    if (r.status === 403) {
      setForbidden(true);
      return false;
    }
    if (r.status < 200 || r.status >= 300 || !r.data?.success) {
      if (!quiet) {
        toastFromAnywhere(
          'error',
          'Alerta nu a putut fi confirmată',
          r.error || 'Alerta nu mai este activă sau serverul a respins cererea.',
        );
      }
      return false;
    }
    return true;
  };

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    const ok = await acknowledgeOne(alertId);
    if (ok) {
      toastFromAnywhere('success', 'Alertă confirmată');
      setActiveAlerts(prev =>
        prev.map(a =>
          a.id === alertId
            ? { ...a, status: 'acknowledged' as const, acknowledgedAt: new Date().toISOString(), acknowledgedBy: user?.email }
            : a,
        ),
      );
    }
    setAcknowledging(null);
  };

  const handleAcknowledgeAll = async () => {
    const firing = activeAlerts.filter(a => a.status === 'firing');
    if (firing.length === 0) return;
    setAcknowledging('__all__');
    let done = 0;
    for (const a of firing) {
      if (await acknowledgeOne(a.id, true)) done++;
    }
    setAcknowledging(null);
    if (done > 0) {
      toastFromAnywhere('success', `${done} ${done === 1 ? 'alertă confirmată' : 'alerte confirmate'}`);
    }
    if (done < firing.length) {
      toastFromAnywhere('warning', 'Unele alerte nu au putut fi confirmate', `${firing.length - done} rămase`);
    }
    void loadAll('silent');
  };

  // ---- Derived ------------------------------------------------------------

  const system = dashboard?.system;
  const app = dashboard?.application;
  const overall: HealthStatus | undefined = dashboard?.health?.overall;

  const healthyServices = healthChecks.filter(c => c.status === 'healthy').length;
  const degradedServices = healthChecks.filter(c => c.status === 'degraded').length;
  const downServices = healthChecks.filter(c => c.status === 'unhealthy').length;
  const totalServices = healthChecks.length;

  const firingAlerts = activeAlerts.filter(a => a.status === 'firing').length;

  const resourceChart = useMemo(
    () => mergeSeries({ cpu: cpuSeries, memory: memSeries }, timeRange),
    [cpuSeries, memSeries, timeRange],
  );
  const latencyChart = useMemo(
    () => mergeSeries({ latency: latencySeries }, timeRange),
    [latencySeries, timeRange],
  );

  // ---- Render helpers -----------------------------------------------------

  const getStatusIcon = (status: HealthStatus | string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" aria-hidden="true" />;
    }
  };

  const getStatusBadge = (status: HealthStatus | string) => {
    switch (status) {
      case 'healthy':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Operațional</span>;
      case 'degraded':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Degradat</span>;
      case 'unhealthy':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Indisponibil</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Necunoscut</span>;
    }
  };

  const getAlertIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" aria-hidden="true" />;
    }
  };

  const severityLabel = (s: AlertSeverity) => (s === 'critical' ? 'Critic' : s === 'warning' ? 'Avertisment' : 'Informare');
  const alertStatusLabel = (s: AlertStatus) =>
    s === 'firing' ? 'Activă' : s === 'acknowledged' ? 'Confirmată' : 'Rezolvată';

  const overallCardClass =
    overall === 'healthy'
      ? 'border-green-200 bg-green-50'
      : overall === 'degraded'
        ? 'border-yellow-200 bg-yellow-50'
        : overall === 'unhealthy'
          ? 'border-red-200 bg-red-50'
          : 'border-gray-200 bg-gray-50';

  const overallLabel =
    overall === 'healthy' ? 'Toate OK' : overall === 'degraded' ? 'Atenție' : overall === 'unhealthy' ? 'Probleme' : '—';

  const tabButton = (tab: Tab, label: string, Icon: React.ElementType, badge?: number) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      aria-selected={activeTab === tab}
      role="tab"
      className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
        activeTab === tab
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{badge}</span>
      )}
    </button>
  );

  // ---- Forbidden / loading / error states ---------------------------------

  const header = (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monitorizare Sistem</h1>
        <p className="text-gray-500 mt-1">Starea serviciilor și performanța platformei în timp real</p>
        {lastUpdated && !forbidden && (
          <p className="text-xs text-gray-400 mt-1">
            Actualizat {formatRelative(lastUpdated.toISOString())} · reîmprospătare automată la 30 s
          </p>
        )}
      </div>
      {!forbidden && (
        <div className="flex flex-wrap gap-2">
          <div className="flex border rounded-lg overflow-hidden" role="group" aria-label="Interval de timp">
            {(['1h', '24h', '7d', '30d'] as TimeRange[]).map(range => (
              <button
                key={range}
                type="button"
                onClick={() => void handleRangeChange(range)}
                aria-pressed={timeRange === range}
                className={`px-3 py-1.5 text-sm ${
                  timeRange === range ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => void loadAll('refresh')} disabled={refreshing || loading}>
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Reîmprospătare
          </Button>
        </div>
      )}
    </div>
  );

  if (forbidden) {
    return (
      <div className="p-6 space-y-6">
        {header}
        <div className="bg-white rounded-lg shadow p-10 flex flex-col items-center text-center">
          <div className="p-4 rounded-full bg-gray-100 mb-4">
            <Shield className="h-8 w-8 text-gray-500" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{FORBIDDEN_MESSAGE}</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-md">
            Contul dumneavoastră nu are rolul necesar pentru a vedea starea infrastructurii. Dacă aveți nevoie de
            acces, contactați administratorul organizației.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6" aria-busy="true">
        {header}
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Se încarcă datele de monitorizare...
        </p>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="p-6 space-y-6">
        {header}
        <div className="bg-white rounded-lg shadow p-10 flex flex-col items-center text-center" role="alert">
          <div className="p-4 rounded-full bg-red-50 mb-4">
            <XCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Nu am putut încărca monitorizarea</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-md">{error}</p>
          <Button className="mt-4" variant="primary" onClick={() => void loadAll('initial')}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reîncearcă
          </Button>
        </div>
      </div>
    );
  }

  // ---- Main render --------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      {header}

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800" role="status">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Ultima reîmprospătare a eșuat: {error}. Se afișează datele anterioare.
          </span>
          <Button size="sm" variant="outline" onClick={() => void loadAll('refresh')}>
            Reîncearcă
          </Button>
        </div>
      )}

      {/* Status Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className={`rounded-lg shadow p-4 border ${overallCardClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Stare generală</p>
              <p className="text-2xl font-bold">{overallLabel}</p>
              <p className="text-sm text-gray-500">
                {totalServices > 0 ? `${healthyServices}/${totalServices} verificări OK` : 'Nicio verificare raportată'}
              </p>
            </div>
            <div
              className={`p-3 rounded-full ${
                overall === 'healthy' ? 'bg-green-200' : overall === 'unhealthy' ? 'bg-red-200' : 'bg-yellow-200'
              }`}
            >
              {overall === 'healthy' ? (
                <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
              ) : overall === 'unhealthy' ? (
                <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-600" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Utilizare CPU</p>
              <p className="text-2xl font-bold">{system ? `${Math.round(system.cpu.usage)}%` : '—'}</p>
              {system && <p className="text-xs text-gray-500">{system.cpu.cores} nuclee</p>}
            </div>
            <Cpu className="h-8 w-8 text-blue-500" aria-hidden="true" />
          </div>
          <Progress className="mt-2 h-2" value={system?.cpu.usage ?? 0} aria-label="Utilizare CPU" />
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Memorie RAM</p>
              <p className="text-2xl font-bold">{system ? `${Math.round(system.memory.usagePercent)}%` : '—'}</p>
              {system && (
                <p className="text-xs text-gray-500">
                  {formatBytes(system.memory.used)} / {formatBytes(system.memory.total)}
                </p>
              )}
            </div>
            <Server className="h-8 w-8 text-purple-500" aria-hidden="true" />
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(100, system?.memory.usagePercent ?? 0)}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Alerte active</p>
              <p className="text-2xl font-bold">{firingAlerts}</p>
              <p className="text-sm text-gray-500">
                {activeAlerts.length} {activeAlerts.length === 1 ? 'alertă în total' : 'alerte în total'}
                {dashboard && dashboard.alerts.critical > 0 ? ` · ${dashboard.alerts.critical} critice` : ''}
              </p>
            </div>
            <Bell className={`h-8 w-8 ${firingAlerts > 0 ? 'text-yellow-500' : 'text-gray-400'}`} aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px" role="tablist" aria-label="Secțiuni monitorizare">
            {tabButton('overview', 'Prezentare', Activity)}
            {tabButton('services', 'Servicii', Server)}
            {tabButton('alerts', 'Alerte', Bell, firingAlerts)}
            {tabButton('resources', 'Resurse', Cpu)}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* CPU / RAM history */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Performanță sistem</h3>
                      <p className="text-sm text-gray-500 mb-4">CPU și memorie (%) — interval {timeRange}</p>
                    </div>
                    {historyLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden="true" />}
                  </div>
                  <div className="h-[300px]">
                    {resourceChart.length === 0 ? (
                      <EmptyChart text="Nu există încă istoric de metrici pentru intervalul selectat." />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={resourceChart}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" minTickGap={32} />
                          <YAxis domain={[0, 100]} unit="%" />
                          <Tooltip formatter={(v) => `${v}%`} />
                          <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} name="CPU %" connectNulls />
                          <Area type="monotone" dataKey="memory" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} name="RAM %" connectNulls />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Latency history */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-1">Timp de răspuns API</h3>
                  <p className="text-sm text-gray-500 mb-4">Latență per cerere (ms) — interval {timeRange}</p>
                  <div className="h-[300px]">
                    {latencyChart.length === 0 ? (
                      <EmptyChart text="Nu s-au înregistrat cereri în intervalul selectat." />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={latencyChart}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" minTickGap={32} />
                          <YAxis unit=" ms" />
                          <Tooltip formatter={(v) => `${v} ms`} />
                          <Line type="monotone" dataKey="latency" stroke="#22c55e" strokeWidth={2} dot={false} name="Latență API" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Istoricul metricilor este păstrat în memoria serverului (ultimele ~1000 de eșantioane, ~10 s interval), deci
                intervalele 7d/30d pot afișa doar datele de la ultima repornire.
              </p>

              {/* Quick Stats — all from /monitoring/dashboard.application / .system */}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                <StatTile icon={Zap} label="Cereri totale" value={app ? app.requests.total.toLocaleString('ro-RO') : '—'} sub={app ? `${app.requests.perSecond}/s acum` : undefined} />
                <StatTile icon={Gauge} label="Latență medie" value={app ? `${Math.round(app.latency.avg)} ms` : '—'} sub={app ? `p95 ${Math.round(app.latency.p95)} ms · p99 ${Math.round(app.latency.p99)} ms` : undefined} />
                <StatTile
                  icon={AlertCircle}
                  label="Rată erori"
                  value={app ? `${app.errors.rate.toFixed(2)}%` : '—'}
                  sub={app ? `${app.errors.total} erori din ${app.requests.total}` : undefined}
                  tone={app && app.errors.rate > 5 ? 'bad' : app && app.errors.rate > 1 ? 'warn' : 'ok'}
                />
                <StatTile icon={Activity} label="Conexiuni active" value={app ? String(app.activeConnections) : '—'} sub={app ? `coadă: ${app.queueLength}` : undefined} />
                <StatTile icon={Globe} label="Uptime proces" value={formatUptime(system?.process.uptime)} sub={system ? `PID ${system.process.pid}` : undefined} />
                <StatTile icon={Database} label="Bază de date" value={healthChecks.find(c => c.name.toLowerCase() === 'database')?.status === 'healthy' ? 'OK' : healthChecks.find(c => c.name.toLowerCase() === 'database') ? 'Problemă' : '—'} sub={(() => { const db = healthChecks.find(c => c.name.toLowerCase() === 'database'); return db?.latency !== undefined ? `${db.latency} ms` : undefined; })()} />
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-lg font-semibold">Starea serviciilor</h3>
                <div className="flex gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{healthyServices} OK</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{degradedServices} Degradat</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{downServices} Indisponibil</span>
                </div>
              </div>
              {healthChecks.length === 0 ? (
                <EmptyBlock icon={Server} title="Nicio verificare de sănătate raportată" text="Backend-ul nu a publicat încă rezultate pentru verificările de sănătate." />
              ) : (
                <div className="space-y-3">
                  {healthChecks.map(check => (
                    <div key={check.name} className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(check.status)}
                        <div>
                          <h4 className="font-medium">{HEALTH_LABELS[check.name.toLowerCase()] ?? check.name}</h4>
                          <p className="text-sm text-gray-500">
                            Ultima verificare: {formatRelative(check.lastChecked)}
                            {check.message ? ` · ${check.message}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-medium">{check.latency !== undefined ? `${check.latency} ms` : '—'}</p>
                          <p className="text-xs text-gray-500">Răspuns</p>
                        </div>
                        {getStatusBadge(check.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4">
                Verificările rulează la fiecare 30 s pe server. Serviciile externe (ANAF SPV, OCR, e-mail) nu sunt încă incluse în
                monitorizarea automată.
              </p>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-8">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="text-lg font-semibold">Alerte active</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleAcknowledgeAll()}
                    disabled={firingAlerts === 0 || acknowledging !== null}
                  >
                    {acknowledging === '__all__' && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    Confirmă toate ({firingAlerts})
                  </Button>
                </div>
                {activeAlerts.length === 0 ? (
                  <EmptyBlock icon={CheckCircle} title="Nicio alertă activă" text="Toate regulile de alertare sunt în parametri normali." tone="ok" />
                ) : (
                  <div className="space-y-3">
                    {activeAlerts.map(alert => (
                      <div
                        key={alert.id}
                        className={`flex flex-col gap-3 p-4 border rounded-lg sm:flex-row sm:items-start sm:justify-between ${
                          alert.status === 'firing'
                            ? alert.severity === 'critical'
                              ? 'bg-red-50 border-l-4 border-l-red-500'
                              : 'bg-yellow-50 border-l-4 border-l-yellow-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {getAlertIcon(alert.severity)}
                          <div>
                            <p className="font-medium">{alert.message || alert.ruleName}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{alert.ruleName}</span>
                              <Badge variant="outline">{severityLabel(alert.severity)}</Badge>
                              <span>•</span>
                              <span title={formatDateTime(alert.firedAt)}>{formatRelative(alert.firedAt)}</span>
                              <span>•</span>
                              <span>
                                valoare {Number.isFinite(alert.value) ? Math.round(alert.value * 100) / 100 : '—'} / prag {alert.threshold}
                              </span>
                              {alert.status === 'acknowledged' && (
                                <span className="text-xs text-gray-400">
                                  · confirmată{alert.acknowledgedBy ? ` de ${alert.acknowledgedBy}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {alert.status === 'firing' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleAcknowledge(alert.id)}
                            disabled={acknowledging !== null}
                          >
                            {acknowledging === alert.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                            Confirmă
                          </Button>
                        ) : (
                          <Badge variant="secondary">{alertStatusLabel(alert.status)}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-4 w-4 text-gray-500" aria-hidden="true" />
                  <h3 className="text-lg font-semibold">Istoric alerte</h3>
                  <span className="text-sm text-gray-400">(ultimele {alertHistory.length})</span>
                </div>
                {alertHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 border rounded-lg p-4">Nu există alerte în istoric.</p>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-2">Severitate</th>
                          <th className="px-4 py-2">Regulă</th>
                          <th className="px-4 py-2">Mesaj</th>
                          <th className="px-4 py-2">Declanșată</th>
                          <th className="px-4 py-2">Rezolvată</th>
                          <th className="px-4 py-2">Stare</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {alertHistory.map(a => (
                          <tr key={`${a.id}-${a.firedAt}`} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center gap-1">
                                {getAlertIcon(a.severity)}
                                {severityLabel(a.severity)}
                              </span>
                            </td>
                            <td className="px-4 py-2">{a.ruleName}</td>
                            <td className="px-4 py-2 text-gray-600">{a.message}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(a.firedAt)}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(a.resolvedAt)}</td>
                            <td className="px-4 py-2">
                              <Badge variant={a.status === 'firing' ? 'destructive' : 'secondary'}>{alertStatusLabel(a.status)}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Utilizare CPU</h3>
                {system ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl font-bold">{Math.round(system.cpu.usage)}%</span>
                      <span className="text-gray-500">{system.cpu.cores} nuclee</span>
                    </div>
                    <Progress value={system.cpu.usage} aria-label="Utilizare CPU" />
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {(['1 min', '5 min', '15 min'] as const).map((label, i) => (
                        <div key={label} className="p-2 bg-gray-100 rounded text-center">
                          <p className="font-medium">Load {label}</p>
                          <p className="text-gray-500">{system.cpu.loadAverage[i] !== undefined ? system.cpu.loadAverage[i].toFixed(2) : '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Indisponibil</p>
                )}
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Memorie RAM (server)</h3>
                {system ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl font-bold">{Math.round(system.memory.usagePercent)}%</span>
                      <span className="text-gray-500">
                        {formatBytes(system.memory.used)} / {formatBytes(system.memory.total)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div className="bg-purple-600 h-4 rounded-full" style={{ width: `${Math.min(100, system.memory.usagePercent)}%` }} />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Utilizată</span><span>{formatBytes(system.memory.used)}</span></div>
                      <div className="flex justify-between"><span>Liberă</span><span>{formatBytes(system.memory.free)}</span></div>
                      <div className="flex justify-between"><span>Total</span><span>{formatBytes(system.memory.total)}</span></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Indisponibil</p>
                )}
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Proces API (Node.js)</h3>
                {system ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Uptime</span><span>{formatUptime(system.process.uptime)}</span></div>
                    <div className="flex justify-between"><span>PID</span><span>{system.process.pid}</span></div>
                    <div className="flex justify-between"><span>RSS</span><span>{formatBytes(system.process.memoryUsage.rss)}</span></div>
                    <div className="flex justify-between"><span>Heap utilizat</span><span>{formatBytes(system.process.memoryUsage.heapUsed)}</span></div>
                    <div className="flex justify-between"><span>Heap total</span><span>{formatBytes(system.process.memoryUsage.heapTotal)}</span></div>
                    <div className="flex justify-between"><span>Memorie externă</span><span>{formatBytes(system.process.memoryUsage.external)}</span></div>
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Heap utilizat / total</span>
                        <span>
                          {system.process.memoryUsage.heapTotal > 0
                            ? `${Math.round((system.process.memoryUsage.heapUsed / system.process.memoryUsage.heapTotal) * 100)}%`
                            : '—'}
                        </span>
                      </div>
                      <Progress
                        className="h-2"
                        value={
                          system.process.memoryUsage.heapTotal > 0
                            ? (system.process.memoryUsage.heapUsed / system.process.memoryUsage.heapTotal) * 100
                            : 0
                        }
                        aria-label="Heap utilizat"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Indisponibil</p>
                )}
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Stocare</h3>
                {system?.disk ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl font-bold">{Math.round(system.disk.usagePercent)}%</span>
                      <span className="text-gray-500">
                        {formatBytes(system.disk.used)} / {formatBytes(system.disk.total)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div className="bg-green-600 h-4 rounded-full" style={{ width: `${Math.min(100, system.disk.usagePercent)}%` }} />
                    </div>
                    <div className="flex justify-between text-sm"><span>Liber</span><span>{formatBytes(system.disk.free)}</span></div>
                  </div>
                ) : (
                  <EmptyBlock
                    icon={HardDrive}
                    title="Metricile de stocare nu sunt disponibile"
                    text="Backend-ul nu raportează încă utilizarea discului. Metricile de rețea nu sunt nici ele expuse."
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers (local to this page)
// ---------------------------------------------------------------------------

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'ok' ? 'text-green-600' : tone === 'warn' ? 'text-yellow-600' : tone === 'bad' ? 'text-red-600' : 'text-gray-900';
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="mt-1">
        <span className={`text-2xl font-bold ${toneClass}`}>{value}</span>
        {sub && <p className="text-xs text-gray-500 mt-0.5 truncate" title={sub}>{sub}</p>}
      </div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-gray-500 text-center px-4">
      <span>{text}</span>
    </div>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  text,
  tone = 'neutral',
}: {
  icon: React.ElementType;
  title: string;
  text: string;
  tone?: 'neutral' | 'ok';
}) {
  return (
    <div className="border rounded-lg p-8 flex flex-col items-center text-center">
      <div className={`p-3 rounded-full mb-3 ${tone === 'ok' ? 'bg-green-50' : 'bg-gray-100'}`}>
        <Icon className={`h-6 w-6 ${tone === 'ok' ? 'text-green-600' : 'text-gray-500'}`} aria-hidden="true" />
      </div>
      <p className="font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500 mt-1 max-w-md">{text}</p>
    </div>
  );
}
