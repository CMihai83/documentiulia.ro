'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { notifyNotAvailable, toastFromAnywhere } from '@/lib/toast-bus';
import {
  Plug,
  Search,
  Plus,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  CreditCard,
  Mail,
  Users,
  ShoppingCart,
  Building,
  FileText,
  Cloud,
  MessageSquare,
  Link2,
  ArrowRightLeft,
  Activity,
  Loader2,
  Briefcase,
  Megaphone,
  Boxes,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// =================== Types (mirror backend/src/integrations/integrations-hub.service.ts) ===================

type IntegrationCategory =
  | 'accounting'
  | 'banking'
  | 'crm'
  | 'ecommerce'
  | 'email'
  | 'erp'
  | 'hr'
  | 'marketing'
  | 'payments'
  | 'productivity'
  | 'storage'
  | 'tax'
  | 'communication';

type CatalogStatus = 'available' | 'coming_soon' | 'beta' | 'deprecated';
type ConnectionStatus = 'active' | 'inactive' | 'error' | 'pending';
type SyncStatus = 'running' | 'success' | 'partial' | 'failed';

interface CatalogIntegration {
  id: string;
  name: string;
  slug: string;
  category: IntegrationCategory;
  description: string;
  icon: string;
  website?: string;
  features: string[];
  authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
  status: CatalogStatus;
  documentationUrl?: string;
  pricing?: 'free' | 'paid' | 'freemium';
}

interface IntegrationConnection {
  id: string;
  integrationId: string;
  integrationName: string;
  status: ConnectionStatus;
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  syncErrors?: string[];
  syncStats: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastDataCount?: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface SyncLog {
  id: string;
  connectionId: string;
  type: 'manual' | 'scheduled' | 'webhook';
  direction: 'inbound' | 'outbound' | 'bidirectional';
  status: SyncStatus;
  startedAt: string;
  completedAt?: string;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
}

interface HubStats {
  totalIntegrations: number;
  availableIntegrations: number;
  connectedIntegrations: number;
  activeConnections: number;
  totalSyncs: number;
  successfulSyncs: number;
  integrationsByCategory: Record<string, number>;
}

interface SpvStatus {
  connected: boolean;
  status?: string;
  cui?: string;
  expiresAt?: string;
  lastUsedAt?: string | null;
  lastError?: string | null;
}

interface CatalogResponse {
  integrations: CatalogIntegration[];
  total: number;
}
interface CategoriesResponse {
  categories: Array<{ category: IntegrationCategory; count: number }>;
}
interface ConnectionsResponse {
  connections: IntegrationConnection[];
  total: number;
}
interface SyncLogsResponse {
  logs: SyncLog[];
  total: number;
}

// Catalog entries for which the ANAF SPV connection (GET /spv/status) is the real status source.
const SPV_CATALOG_IDS = new Set(['anaf-efactura', 'anaf-saft', 'anaf-spv']);
// Configuration for these integrations lives on the dedicated settings page.
const SETTINGS_CONFIGURABLE_IDS = new Set(['anaf-efactura', 'anaf-saft', 'anaf-spv', 'saga-accounting', 'saga', 'romanian-banks', 'banking']);
const SETTINGS_INTEGRATIONS_PATH = '/dashboard/settings/integrations';

const categoryLabels: Record<IntegrationCategory, string> = {
  accounting: 'Contabilitate',
  banking: 'Banking',
  crm: 'CRM',
  ecommerce: 'E-commerce',
  email: 'Email',
  erp: 'ERP',
  hr: 'Resurse umane',
  marketing: 'Marketing',
  payments: 'Plăți',
  productivity: 'Productivitate',
  storage: 'Stocare',
  tax: 'Fiscalitate',
  communication: 'Comunicare',
};

const categoryIcons: Record<IntegrationCategory, React.ReactNode> = {
  accounting: <FileText className="h-5 w-5" />,
  banking: <Building className="h-5 w-5" />,
  crm: <Users className="h-5 w-5" />,
  ecommerce: <ShoppingCart className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  erp: <Boxes className="h-5 w-5" />,
  hr: <Briefcase className="h-5 w-5" />,
  marketing: <Megaphone className="h-5 w-5" />,
  payments: <CreditCard className="h-5 w-5" />,
  productivity: <Zap className="h-5 w-5" />,
  storage: <Cloud className="h-5 w-5" />,
  tax: <FileText className="h-5 w-5" />,
  communication: <MessageSquare className="h-5 w-5" />,
};

const categoryColors: string[] = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#EF4444', '#A855F7', '#6B7280'];

const catalogStatusLabels: Record<CatalogStatus, string> = {
  available: 'Disponibil',
  coming_soon: 'În curând',
  beta: 'Beta',
  deprecated: 'Depreciat',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ro-RO');
};

const formatTime = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('ro-RO');
};

const labelForCategory = (cat: string) => categoryLabels[cat as IntegrationCategory] ?? cat;
const iconForCategory = (cat: string) => categoryIcons[cat as IntegrationCategory] ?? <Plug className="h-5 w-5" />;

export default function IntegrationsPage() {
  const router = useRouter();
  const goToSettings = () => router.push(SETTINGS_INTEGRATIONS_PATH);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('catalog');

  // Data
  const [catalog, setCatalog] = useState<CatalogIntegration[]>([]);
  const [categories, setCategories] = useState<Array<{ category: IntegrationCategory; count: number }>>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [stats, setStats] = useState<HubStats | null>(null);
  const [spvStatus, setSpvStatus] = useState<SpvStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConnectionsError(null);

    const [catalogRes, categoriesRes, connectionsRes, statsRes, spvRes] = await Promise.all([
      api.get<CatalogResponse>('/integrations/catalog'),
      api.get<CategoriesResponse>('/integrations/catalog/categories'),
      api.get<ConnectionsResponse>('/integrations/connections'),
      api.get<HubStats>('/integrations/stats'),
      api.get<SpvStatus>('/spv/status'),
    ]);

    // The catalog is the backbone of the page — without it we show the error state.
    if (catalogRes.status >= 200 && catalogRes.status < 300 && catalogRes.data) {
      setCatalog(Array.isArray(catalogRes.data.integrations) ? catalogRes.data.integrations : []);
    } else {
      setCatalog([]);
      setError(catalogRes.error || 'Catalogul de integrări nu a putut fi încărcat.');
    }

    if (categoriesRes.status >= 200 && categoriesRes.status < 300 && categoriesRes.data) {
      setCategories(Array.isArray(categoriesRes.data.categories) ? categoriesRes.data.categories : []);
    } else {
      setCategories([]);
    }

    if (connectionsRes.status >= 200 && connectionsRes.status < 300 && connectionsRes.data) {
      setConnections(Array.isArray(connectionsRes.data.connections) ? connectionsRes.data.connections : []);
    } else {
      setConnections([]);
      setConnectionsError(connectionsRes.error || 'Starea conexiunilor nu a putut fi verificată.');
    }

    if (statsRes.status >= 200 && statsRes.status < 300 && statsRes.data) {
      setStats(statsRes.data);
    } else {
      setStats(null);
    }

    if (spvRes.status >= 200 && spvRes.status < 300 && spvRes.data && typeof spvRes.data.connected === 'boolean') {
      setSpvStatus(spvRes.data);
    } else {
      setSpvStatus(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadSyncLogs = useCallback(async (conns: IntegrationConnection[]) => {
    if (conns.length === 0) {
      setSyncLogs([]);
      setLogsError(null);
      return;
    }
    setLogsLoading(true);
    setLogsError(null);
    const results = await Promise.all(
      conns.map((c) => api.get<SyncLogsResponse>(`/integrations/connections/${encodeURIComponent(c.id)}/sync-logs`, { params: { limit: 20 } })),
    );
    const merged: SyncLog[] = [];
    let failures = 0;
    results.forEach((r) => {
      if (r.status >= 200 && r.status < 300 && r.data && Array.isArray(r.data.logs)) {
        merged.push(...r.data.logs);
      } else {
        failures += 1;
      }
    });
    merged.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    setSyncLogs(merged);
    if (failures === results.length) {
      setLogsError('Istoricul sincronizărilor nu a putut fi încărcat.');
    } else if (failures > 0) {
      setLogsError(`Istoricul pentru ${failures} conexiune(i) nu a putut fi încărcat.`);
    }
    setLogsLoading(false);
  }, []);

  // Load logs once connections are known (and refresh when the sync/analytics tabs are opened).
  useEffect(() => {
    if (!loading && (activeTab === 'sync' || activeTab === 'analytics')) {
      void loadSyncLogs(connections);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loading, connections.length]);

  // =================== Derived data ===================

  const connectionByIntegration = useMemo(() => {
    const map = new Map<string, IntegrationConnection>();
    // Newest first from API — keep the first one per integration.
    connections.forEach((c) => {
      if (!map.has(c.integrationId)) map.set(c.integrationId, c);
    });
    return map;
  }, [connections]);

  const connectionNameById = useMemo(() => {
    const map = new Map<string, string>();
    connections.forEach((c) => map.set(c.id, c.integrationName));
    return map;
  }, [connections]);

  /** Effective per-tenant status for a catalog entry: hub connection, or SPV status for ANAF entries. */
  const getEffectiveStatus = useCallback(
    (integration: CatalogIntegration): { connected: boolean; status?: ConnectionStatus; source: 'hub' | 'spv' | 'none' } => {
      const conn = connectionByIntegration.get(integration.id);
      if (conn) return { connected: true, status: conn.status, source: 'hub' };
      if (SPV_CATALOG_IDS.has(integration.id) && spvStatus) {
        return spvStatus.connected
          ? { connected: true, status: 'active', source: 'spv' }
          : { connected: false, source: 'spv' };
      }
      return { connected: false, source: 'none' };
    },
    [connectionByIntegration, spvStatus],
  );

  const filteredIntegrations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return catalog.filter((integration) => {
      const matchesSearch =
        term === '' ||
        integration.name.toLowerCase().includes(term) ||
        (integration.description || '').toLowerCase().includes(term);
      const matchesCategory = categoryFilter === 'all' || integration.category === categoryFilter;
      const eff = getEffectiveStatus(integration);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'connected' && eff.connected) ||
        (statusFilter === 'available' && !eff.connected);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [catalog, searchTerm, categoryFilter, statusFilter, getEffectiveStatus]);

  const spvConnectedVirtual = Boolean(spvStatus?.connected) && !catalog.some((i) => SPV_CATALOG_IDS.has(i.id) && connectionByIntegration.has(i.id));

  const totalAvailable = stats?.totalIntegrations ?? catalog.length;
  const totalConnected = connections.length + (spvConnectedVirtual ? 1 : 0);
  const activeConnections = connections.filter((c) => c.status === 'active').length + (spvConnectedVirtual ? 1 : 0);
  const errorConnections = connections.filter((c) => c.status === 'error').length;
  const totalSyncs = stats?.totalSyncs ?? connections.reduce((s, c) => s + (c.syncStats?.totalSyncs ?? 0), 0);
  const successfulSyncs = stats?.successfulSyncs ?? connections.reduce((s, c) => s + (c.syncStats?.successfulSyncs ?? 0), 0);
  const overallSuccessRate = totalSyncs > 0 ? Math.round((successfulSyncs / totalSyncs) * 1000) / 10 : null;

  const categoryDistribution = useMemo(() => {
    const source: Array<{ name: string; value: number }> =
      categories.length > 0
        ? categories.map((c) => ({ name: labelForCategory(c.category), value: c.count }))
        : Object.entries(stats?.integrationsByCategory ?? {}).map(([k, v]) => ({ name: labelForCategory(k), value: v }));
    return source
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((s, i) => ({ ...s, color: categoryColors[i % categoryColors.length] }));
  }, [categories, stats]);

  const syncTrendData = useMemo(() => {
    const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
    const days: Array<{ key: string; day: string; success: number; failed: number }> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({ key: d.toDateString(), day: dayNames[d.getDay()], success: 0, failed: 0 });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));
    syncLogs.forEach((log) => {
      const d = new Date(log.startedAt);
      if (Number.isNaN(d.getTime())) return;
      const bucket = byKey.get(d.toDateString());
      if (!bucket) return;
      if (log.status === 'success') bucket.success += 1;
      else if (log.status === 'failed' || log.status === 'partial') bucket.failed += 1;
    });
    return days;
  }, [syncLogs]);
  const hasTrendData = syncTrendData.some((d) => d.success > 0 || d.failed > 0);

  // =================== Actions ===================

  const runConnectionAction = async (conn: IntegrationConnection, action: 'sync' | 'test' | 'disconnect') => {
    const key = `${conn.id}:${action}`;
    setBusyAction(key);
    try {
      const path = `/integrations/connections/${encodeURIComponent(conn.id)}/${action}`;
      if (action === 'sync') {
        const res = await api.post<SyncLog>(path, {});
        if (res.status >= 200 && res.status < 300) {
          toastFromAnywhere('success', 'Sincronizare pornită', `${conn.integrationName}: sincronizarea a fost inițiată.`);
          await loadAll();
          if (activeTab === 'sync' || activeTab === 'analytics') await loadSyncLogs(connections);
        } else {
          toastFromAnywhere('error', 'Sincronizarea nu a pornit', res.error || 'Conexiunea nu este activă sau serverul a răspuns cu eroare.');
        }
      } else if (action === 'test') {
        const res = await api.post<{ success: boolean; message?: string }>(path, {});
        if (res.status >= 200 && res.status < 300 && res.data) {
          if (res.data.success) {
            toastFromAnywhere('success', 'Test reușit', `${conn.integrationName}: conexiunea funcționează.`);
          } else {
            toastFromAnywhere('warning', 'Test eșuat', `${conn.integrationName}: conexiunea nu a răspuns corect. Verificați credențialele.`);
          }
        } else {
          toastFromAnywhere('error', 'Testul nu a putut fi rulat', res.error || 'Serverul a răspuns cu eroare.');
        }
      } else {
        const res = await api.post<{ success: boolean }>(path, {});
        if (res.status >= 200 && res.status < 300) {
          toastFromAnywhere('success', 'Integrare deconectată', `${conn.integrationName} a fost deconectată.`);
          await loadAll();
        } else {
          toastFromAnywhere('error', 'Deconectarea a eșuat', res.error || 'Serverul a răspuns cu eroare.');
        }
      }
    } finally {
      setBusyAction(null);
    }
  };

  // =================== Render helpers ===================

  const getConnectionStatusBadge = (status?: ConnectionStatus, connected = false) => {
    if (!connected || !status) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
          <XCircle className="h-3 w-3" />
          Neconectat
        </Badge>
      );
    }
    const statusConfig = {
      active: { label: 'Conectat', variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' },
      inactive: { label: 'Inactiv', variant: 'secondary' as const, icon: XCircle, color: 'text-gray-500' },
      error: { label: 'Eroare', variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-500' },
      pending: { label: 'În așteptare', variant: 'outline' as const, icon: Clock, color: 'text-yellow-500' },
    };
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getSyncStatusBadge = (status: SyncStatus) => {
    const statusConfig = {
      running: { label: 'În curs', variant: 'outline' as const, icon: RefreshCw },
      success: { label: 'Succes', variant: 'default' as const, icon: CheckCircle },
      partial: { label: 'Parțial', variant: 'secondary' as const, icon: AlertTriangle },
      failed: { label: 'Eșuat', variant: 'destructive' as const, icon: XCircle },
    };
    const config = statusConfig[status] ?? statusConfig.running;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPricingBadge = (pricing?: CatalogIntegration['pricing']) => {
    if (!pricing) return <span />;
    const pricingConfig = {
      free: { label: 'Gratuit', color: 'bg-green-100 text-green-800' },
      paid: { label: 'Plătit', color: 'bg-blue-100 text-blue-800' },
      freemium: { label: 'Freemium', color: 'bg-purple-100 text-purple-800' },
    };
    const config = pricingConfig[pricing];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const renderConnectButton = (integration: CatalogIntegration) => {
    if (SETTINGS_CONFIGURABLE_IDS.has(integration.id)) {
      return (
        <Button size="sm" onClick={goToSettings}>
          <Plug className="h-4 w-4 mr-1" />
          Configurează
        </Button>
      );
    }
    if (integration.status !== 'available') {
      return (
        <Button size="sm" variant="outline" disabled>
          <Clock className="h-4 w-4 mr-1" />
          {catalogStatusLabels[integration.status] ?? integration.status}
        </Button>
      );
    }
    return (
      <Button size="sm" variant="outline" onClick={() => notifyNotAvailable(`Conectare ${integration.name}`)}>
        <Plug className="h-4 w-4 mr-1" />
        Conectează
      </Button>
    );
  };

  const syncRateForConnection = (c: IntegrationConnection): number | null => {
    const total = c.syncStats?.totalSyncs ?? 0;
    if (total <= 0) return null;
    return Math.round(((c.syncStats?.successfulSyncs ?? 0) / total) * 1000) / 10;
  };

  // =================== Loading / error states ===================

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrări</h1>
          <p className="text-muted-foreground">Conectare cu aplicații și servicii externe</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Se încarcă catalogul și starea conexiunilor...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && catalog.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrări</h1>
          <p className="text-muted-foreground">Conectare cu aplicații și servicii externe</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Catalogul nu a putut fi încărcat</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{error}</span>
            <div>
              <Button variant="outline" size="sm" onClick={() => void loadAll()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reîncearcă
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrări</h1>
          <p className="text-muted-foreground">
            Conectare cu aplicații și servicii externe
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab('sync')}>
            <Activity className="mr-2 h-4 w-4" />
            Istoric sincronizări
          </Button>
          <Button variant="outline" onClick={() => void loadAll()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reîncarcă
          </Button>
          <Button onClick={goToSettings}>
            <Plus className="mr-2 h-4 w-4" />
            Adaugă integrare
          </Button>
        </div>
      </div>

      {connectionsError && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Starea conexiunilor nu este disponibilă</AlertTitle>
          <AlertDescription>
            {connectionsError} Integrările sunt afișate ca „Neconectat” până la verificare.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Integrări disponibile</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAvailable}</div>
            <p className="text-xs text-muted-foreground">
              În catalog
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conectate</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConnected}</div>
            <p className="text-xs text-muted-foreground">
              Din {totalAvailable} disponibile
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeConnections}</div>
            <p className="text-xs text-muted-foreground">
              {errorConnections > 0 ? `${errorConnections} cu erori` : 'Conexiuni funcționale'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rată succes sincronizări</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallSuccessRate === null ? '—' : `${overallSuccessRate}%`}</div>
            <p className="text-xs text-muted-foreground">
              {overallSuccessRate === null ? 'Nicio sincronizare înregistrată' : `${successfulSyncs} din ${totalSyncs} sincronizări`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="connected">Conectate</TabsTrigger>
          <TabsTrigger value="sync">Sincronizări</TabsTrigger>
          <TabsTrigger value="analytics">Analiză</TabsTrigger>
        </TabsList>

        {/* Catalog Tab */}
        <TabsContent value="catalog" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Catalog integrări</CardTitle>
              <CardDescription>
                Explorează și conectează aplicații. Configurarea se face per integrare — conexiunile ANAF SPV, SAGA și
                bancare se gestionează din Setări → Integrări.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Caută integrări..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate categoriile</SelectItem>
                    {(categories.length > 0
                      ? categories.map((c) => c.category)
                      : Array.from(new Set(catalog.map((i) => i.category)))
                    ).map((key) => (
                      <SelectItem key={key} value={key}>{labelForCategory(key)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    <SelectItem value="connected">Conectate</SelectItem>
                    <SelectItem value="available">Neconectate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Integration Grid */}
              {filteredIntegrations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Plug className="h-8 w-8 mb-2" />
                  <p>{catalog.length === 0 ? 'Catalogul nu conține integrări.' : 'Nicio integrare nu corespunde filtrelor.'}</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredIntegrations.map((integration) => {
                    const eff = getEffectiveStatus(integration);
                    return (
                      <Card key={integration.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-muted p-2">
                                {iconForCategory(integration.category)}
                              </div>
                              <div>
                                <CardTitle className="text-lg">{integration.name}</CardTitle>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <Badge variant="outline">
                                    {labelForCategory(integration.category)}
                                  </Badge>
                                  {integration.status !== 'available' && (
                                    <Badge variant="secondary">{catalogStatusLabels[integration.status] ?? integration.status}</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {getConnectionStatusBadge(eff.status, eff.connected)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">{integration.description}</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {(integration.features ?? []).slice(0, 3).map((feature, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                            {(integration.features ?? []).length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{integration.features.length - 3}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            {getPricingBadge(integration.pricing)}
                            {eff.connected ? (
                              SETTINGS_CONFIGURABLE_IDS.has(integration.id) || eff.source === 'spv' ? (
                                <Button variant="outline" size="sm" onClick={goToSettings}>
                                  <Settings className="h-4 w-4 mr-1" />
                                  Gestionează
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" onClick={() => setActiveTab('connected')}>
                                  <Settings className="h-4 w-4 mr-1" />
                                  Gestionează
                                </Button>
                              )
                            ) : (
                              renderConnectButton(integration)
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connected Tab */}
        <TabsContent value="connected" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integrări conectate</CardTitle>
              <CardDescription>Gestionare conexiuni pentru organizația curentă</CardDescription>
            </CardHeader>
            <CardContent>
              {connections.length === 0 && !spvConnectedVirtual ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Link2 className="h-8 w-8 mb-2" />
                  <p className="font-medium text-foreground">Nicio integrare conectată</p>
                  <p className="text-sm mt-1 max-w-md">
                    Configurarea se face per integrare: ANAF SPV, SAGA și băncile din Setări → Integrări; celelalte
                    integrări din catalog sunt în curs de implementare.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={goToSettings}>
                    <Settings className="h-4 w-4 mr-1" />
                    Deschide Setări → Integrări
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {spvConnectedVirtual && spvStatus && (
                    <div className="rounded-lg border p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="rounded-lg bg-muted p-3">
                            {categoryIcons.tax}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-lg">ANAF SPV (e-Factura / SAF-T)</span>
                              {getConnectionStatusBadge('active', true)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Conexiune OAuth ANAF{spvStatus.cui ? ` · CUI ${spvStatus.cui}` : ''}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>Ultima utilizare: {formatDateTime(spvStatus.lastUsedAt)}</span>
                              {spvStatus.expiresAt && <span>Expiră: {formatDateTime(spvStatus.expiresAt)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={goToSettings}>
                            <Settings className="h-4 w-4 mr-1" />
                            Gestionează
                          </Button>
                        </div>
                      </div>
                      {spvStatus.lastError && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Ultima eroare ANAF</span>
                          </div>
                          <p className="text-sm text-red-600 mt-1">{spvStatus.lastError}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {connections.map((conn) => {
                    const catalogEntry = catalog.find((i) => i.id === conn.integrationId);
                    const rate = syncRateForConnection(conn);
                    const busy = busyAction?.startsWith(`${conn.id}:`) ?? false;
                    return (
                      <div key={conn.id} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-muted p-3">
                              {iconForCategory(catalogEntry?.category ?? '')}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-lg">{conn.integrationName}</span>
                                {getConnectionStatusBadge(conn.status, true)}
                              </div>
                              {catalogEntry?.description && (
                                <p className="text-sm text-muted-foreground">{catalogEntry.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                                <span className="text-muted-foreground">
                                  Ultima sincronizare: {conn.lastSyncAt ? formatDateTime(conn.lastSyncAt) : 'niciodată'}
                                </span>
                                {rate === null ? (
                                  <span className="text-muted-foreground">Nicio sincronizare înregistrată</span>
                                ) : (
                                  <span className={rate >= 95 ? 'text-green-600' : 'text-yellow-600'}>
                                    Rată succes: {rate}% ({conn.syncStats.successfulSyncs}/{conn.syncStats.totalSyncs})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy || conn.status !== 'active'}
                              title={conn.status !== 'active' ? 'Sincronizarea necesită o conexiune activă' : 'Pornește o sincronizare manuală'}
                              onClick={() => void runConnectionAction(conn, 'sync')}
                            >
                              {busyAction === `${conn.id}:sync` ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                              Sincronizează
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              title="Testează conexiunea"
                              onClick={() => void runConnectionAction(conn, 'test')}
                            >
                              {busyAction === `${conn.id}:test` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Configurare conexiune"
                              onClick={() => notifyNotAvailable(`Configurare ${conn.integrationName}`)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500"
                              disabled={busy}
                              title="Deconectează"
                              onClick={() => {
                                if (typeof window !== 'undefined' && !window.confirm(`Deconectați ${conn.integrationName}?`)) return;
                                void runConnectionAction(conn, 'disconnect');
                              }}
                            >
                              {busyAction === `${conn.id}:disconnect` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        {conn.status === 'error' && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 text-red-700">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-medium">Eroare conexiune</span>
                            </div>
                            <p className="text-sm text-red-600 mt-1">
                              {conn.syncErrors && conn.syncErrors.length > 0
                                ? conn.syncErrors[0]
                                : 'Conexiunea a eșuat. Verificați credențialele sau contactați suportul.'}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Tab */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Istoric sincronizări</CardTitle>
                  <CardDescription>Jurnalizare operațiuni de sincronizare pentru conexiunile organizației</CardDescription>
                </div>
                <Button variant="outline" size="sm" disabled={logsLoading} onClick={() => void loadSyncLogs(connections)}>
                  {logsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Actualizează
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logsError && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between gap-3">
                    <span>{logsError}</span>
                    <Button variant="outline" size="sm" onClick={() => void loadSyncLogs(connections)}>Reîncearcă</Button>
                  </AlertDescription>
                </Alert>
              )}
              {logsLoading && syncLogs.length === 0 ? (
                <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Se încarcă istoricul...
                </div>
              ) : syncLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <ArrowRightLeft className="h-8 w-8 mb-2" />
                  <p className="font-medium text-foreground">Nicio sincronizare înregistrată</p>
                  <p className="text-sm mt-1">
                    {connections.length === 0
                      ? 'Nu există conexiuni active pentru care să existe istoric.'
                      : 'Porniți o sincronizare manuală din fila „Conectate”.'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {syncLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <div className="rounded-full bg-muted p-2">
                            <ArrowRightLeft className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{connectionNameById.get(log.connectionId) ?? log.connectionId}</span>
                              {getSyncStatusBadge(log.status)}
                              <Badge variant="outline">
                                {log.type === 'scheduled' ? 'Programat' : log.type === 'webhook' ? 'Webhook' : 'Manual'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDateTime(log.startedAt)}
                              {log.completedAt && ` - ${formatTime(log.completedAt)}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{log.recordsProcessed} înregistrări</p>
                          {log.recordsFailed > 0 && (
                            <p className="text-sm text-red-500">{log.recordsFailed} eșuate</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Sync Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Trend sincronizări</CardTitle>
                <CardDescription>Succes vs. eșuări în ultimele 7 zile (din jurnalele de sincronizare)</CardDescription>
              </CardHeader>
              <CardContent>
                {hasTrendData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={syncTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="success" name="Succes" fill="#10B981" />
                      <Bar dataKey="failed" name="Eșuate/parțiale" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] flex-col items-center justify-center text-center text-muted-foreground">
                    <Info className="h-8 w-8 mb-2" />
                    <p>Nicio sincronizare în ultimele 7 zile.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuție categorii</CardTitle>
                <CardDescription>Integrări din catalog după categorie</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] flex-col items-center justify-center text-center text-muted-foreground">
                    <Info className="h-8 w-8 mb-2" />
                    <p>Nu există date despre categorii.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Integration Health */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sănătate integrări</CardTitle>
                <CardDescription>Status conexiuni și rată de succes din statisticile reale de sincronizare</CardDescription>
              </CardHeader>
              <CardContent>
                {connections.length === 0 && !spvConnectedVirtual ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Link2 className="h-8 w-8 mb-2" />
                    <p>Nicio integrare conectată — nu există date de sănătate.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {spvConnectedVirtual && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className="rounded-full p-2 bg-green-100">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">ANAF SPV</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Conectat · ultima utilizare {formatDateTime(spvStatus?.lastUsedAt)}
                          </p>
                        </div>
                      </div>
                    )}
                    {connections.map((conn) => {
                      const rate = syncRateForConnection(conn);
                      return (
                        <div key={conn.id} className="flex items-center gap-3 p-3 rounded-lg border">
                          <div className={`rounded-full p-2 ${
                            conn.status === 'active' ? 'bg-green-100' :
                            conn.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
                          }`}>
                            {conn.status === 'active' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : conn.status === 'error' ? (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{conn.integrationName}</p>
                            {rate === null ? (
                              <p className="text-xs text-muted-foreground mt-1">Nicio sincronizare înregistrată</p>
                            ) : (
                              <div className="mt-1">
                                <Progress value={rate} className="h-2" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {rate}% succes ({conn.syncStats.successfulSyncs}/{conn.syncStats.totalSyncs})
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
