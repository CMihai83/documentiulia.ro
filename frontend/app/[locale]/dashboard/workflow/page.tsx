'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { toastFromAnywhere } from '@/lib/toast-bus';
import {
  Workflow,
  Play,
  Pause,
  Plus,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Search,
  Activity,
  RefreshCw,
  Loader2,
  Archive,
  XCircle,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types — mirror backend/src/automation/workflow-engine.service.ts
// ---------------------------------------------------------------------------
type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
type NodeType = 'trigger' | 'condition' | 'action' | 'delay' | 'loop' | 'parallel' | 'subworkflow' | 'end';
type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting';

interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  position: { x: number; y: number };
  config: {
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
    actionType?: string;
    [key: string]: unknown;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  lastExecutedAt?: string;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  version: number;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  stats: WorkflowStats;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  trigger: { type: string; data: Record<string, unknown> };
  context?: { metadata?: { workflowName?: string } };
  nodeExecutions: { nodeId: string; status: ExecutionStatus }[];
  startedAt: string;
  completedAt?: string;
  duration?: number;
  error?: { code: string; message: string };
}

interface GlobalStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  executionsByStatus: Record<string, number>;
  avgExecutionTime: number;
  topWorkflows: { workflow: WorkflowDefinition; executionCount: number }[];
}

/** Backend returns HTTP 200 with `{ error }` for not-found / validation failures. */
type MaybeError<T> = T | { error: string };
const hasError = (d: unknown): d is { error: string } =>
  !!d && typeof d === 'object' && typeof (d as { error?: unknown }).error === 'string';

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual',
  schedule: 'Programat',
  webhook: 'Webhook',
  event: 'Eveniment',
  'invoice.created': 'Factură creată',
  'client.created': 'Client creat',
  'payment.received': 'Plată primită',
  'document.uploaded': 'Document încărcat',
};

const EXEC_STATUS_LABELS: Record<ExecutionStatus, string> = {
  pending: 'În așteptare',
  running: 'În curs',
  completed: 'Succes',
  failed: 'Eșuat',
  cancelled: 'Anulat',
  waiting: 'Așteaptă',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function WorkflowPage() {
  const [activeTab, setActiveTab] = useState('workflows');
  const [searchTerm, setSearchTerm] = useState('');

  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);

    const [wfRes, statsRes] = await Promise.all([
      api.get<{ workflows: WorkflowDefinition[]; total: number }>('/automation/workflows'),
      api.get<GlobalStats>('/automation/workflows/stats'),
    ]);

    if (wfRes.error || !wfRes.data) {
      setLoadError(wfRes.error || 'Nu am putut încărca workflow-urile.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const list = Array.isArray(wfRes.data.workflows) ? wfRes.data.workflows : [];
    setWorkflows(list);
    setStats(statsRes.data && !hasError(statsRes.data) ? statsRes.data : null);

    // No global executions endpoint — aggregate per workflow (bounded).
    const execLists = await Promise.all(
      list.slice(0, 25).map((wf) =>
        api.get<{ executions: WorkflowExecution[]; total: number }>(
          `/automation/workflows/${encodeURIComponent(wf.id)}/executions`,
          { params: { limit: 20 } },
        ),
      ),
    );
    const merged = execLists
      .flatMap((r) => (r.data && Array.isArray(r.data.executions) ? r.data.executions : []))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    setExecutions(merged);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // ------------------------------------------------------------------ actions
  const runAction = async (
    wf: WorkflowDefinition,
    action: 'activate' | 'pause' | 'execute' | 'archive',
  ) => {
    setBusyId(wf.id);
    const path = `/automation/workflows/${encodeURIComponent(wf.id)}/${action}`;
    const body = action === 'execute' ? { trigger: { type: 'manual', data: {} }, input: {} } : undefined;
    const res = await api.post<MaybeError<WorkflowDefinition | WorkflowExecution>>(path, body);
    setBusyId(null);

    const titles: Record<typeof action, string> = {
      activate: 'Activare workflow',
      pause: 'Pauză workflow',
      execute: 'Rulare workflow',
      archive: 'Arhivare workflow',
    };

    if (res.error || !res.data) {
      toastFromAnywhere('error', `${titles[action]} a eșuat`, res.error || 'Serverul nu a răspuns.');
      return;
    }
    if (hasError(res.data)) {
      toastFromAnywhere('error', `${titles[action]} a eșuat`, translateBackendError(res.data.error));
      return;
    }

    const okMsg: Record<typeof action, string> = {
      activate: `„${wf.name}” este acum activ.`,
      pause: `„${wf.name}” a fost pus pe pauză.`,
      execute: `Execuția pentru „${wf.name}” a pornit.`,
      archive: `„${wf.name}” a fost arhivat.`,
    };
    toastFromAnywhere('success', titles[action], okMsg[action]);
    await fetchAll(true);
  };

  const createWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      toastFromAnywhere('warning', 'Nume obligatoriu', 'Introduceți un nume pentru workflow.');
      return;
    }
    setCreating(true);
    // Minimal valid skeleton (the engine requires a trigger and an end node to
    // activate). The visual node editor is not available yet; this is honest
    // about what gets created.
    const res = await api.post<MaybeError<WorkflowDefinition>>('/automation/workflows', {
      name,
      description: newDescription.trim() || undefined,
      nodes: [
        {
          id: 'trigger_manual',
          type: 'trigger',
          name: 'Declanșator manual',
          position: { x: 0, y: 0 },
          config: { triggerType: 'manual' },
        },
        {
          id: 'end',
          type: 'end',
          name: 'Sfârșit',
          position: { x: 300, y: 0 },
          config: {},
        },
      ],
      edges: [{ id: 'e_trigger_end', source: 'trigger_manual', target: 'end' }],
    });
    setCreating(false);

    if (res.error || !res.data || hasError(res.data)) {
      const msg = res.error || (hasError(res.data) ? res.data.error : 'Serverul nu a răspuns.');
      toastFromAnywhere('error', 'Crearea workflow-ului a eșuat', msg);
      return;
    }
    toastFromAnywhere('success', 'Workflow creat', `„${name}” a fost creat ca ciornă (declanșator manual → sfârșit).`);
    setNewName('');
    setNewDescription('');
    setShowCreate(false);
    await fetchAll(true);
  };

  // ------------------------------------------------------------------ derived
  const filteredWorkflows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return workflows
      .filter((wf) => wf.status !== 'archived')
      .filter(
        (wf) =>
          !q ||
          wf.name.toLowerCase().includes(q) ||
          (wf.description || '').toLowerCase().includes(q),
      );
  }, [workflows, searchTerm]);

  const workflowNameById = useMemo(() => {
    const m = new Map<string, string>();
    workflows.forEach((w) => m.set(w.id, w.name));
    return m;
  }, [workflows]);

  const totalWorkflows = stats?.totalWorkflows ?? workflows.length;
  const activeWorkflows = stats?.activeWorkflows ?? workflows.filter((w) => w.status === 'active').length;
  const totalExecutions = stats?.totalExecutions ?? executions.length;
  const completedCount = stats?.executionsByStatus?.completed ?? executions.filter((e) => e.status === 'completed').length;
  const failedCount = stats?.executionsByStatus?.failed ?? executions.filter((e) => e.status === 'failed').length;
  const finished = completedCount + failedCount;
  const successRate = finished > 0 ? (completedCount / finished) * 100 : null;
  const avgMs = stats?.avgExecutionTime ?? 0;

  const triggerUsage = useMemo(() => {
    const m = new Map<string, { label: string; workflows: number; executions: number }>();
    workflows.forEach((wf) => {
      wf.nodes
        .filter((n) => n.type === 'trigger')
        .forEach((n) => {
          const key = n.config?.triggerType || 'manual';
          const cur = m.get(key) || { label: TRIGGER_LABELS[key] || key, workflows: 0, executions: 0 };
          cur.workflows += 1;
          m.set(key, cur);
        });
    });
    executions.forEach((ex) => {
      const key = ex.trigger?.type || 'manual';
      const cur = m.get(key) || { label: TRIGGER_LABELS[key] || key, workflows: 0, executions: 0 };
      cur.executions += 1;
      m.set(key, cur);
    });
    return Array.from(m.entries()).map(([key, v]) => ({ key, ...v }));
  }, [workflows, executions]);

  const statusChart = useMemo(() => {
    const by = stats?.executionsByStatus || {};
    const order: ExecutionStatus[] = ['completed', 'failed', 'running', 'pending', 'waiting', 'cancelled'];
    return order.map((s) => ({ status: EXEC_STATUS_LABELS[s], count: by[s] || 0 }));
  }, [stats]);

  // ------------------------------------------------------------------ helpers
  const getStatusBadge = (status: WorkflowStatus) => {
    const config: Record<WorkflowStatus, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: React.ElementType }> = {
      active: { label: 'Activ', variant: 'default', icon: Play },
      paused: { label: 'Pauză', variant: 'secondary', icon: Pause },
      draft: { label: 'Ciornă', variant: 'outline', icon: GitBranch },
      archived: { label: 'Arhivat', variant: 'outline', icon: Archive },
    };
    const c = config[status] ?? config.draft;
    const Icon = c.icon;
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  const getExecutionStatusBadge = (status: ExecutionStatus) => {
    const variant: 'default' | 'secondary' | 'destructive' | 'outline' =
      status === 'completed' ? 'default' : status === 'failed' ? 'destructive' : status === 'cancelled' ? 'outline' : 'secondary';
    return <Badge variant={variant}>{EXEC_STATUS_LABELS[status] ?? status}</Badge>;
  };

  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('ro-RO') : '—');
  const formatDuration = (ms?: number) =>
    ms === undefined || ms === null ? '—' : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;

  // ------------------------------------------------------------------ render
  const header = (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Automatizări</h1>
        <p className="text-muted-foreground">Workflow-uri și procese automatizate</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => void fetchAll(true)} disabled={loading || refreshing}>
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Reîncarcă
        </Button>
        <Button variant="outline" onClick={() => setActiveTab('executions')}>
          <Activity className="mr-2 h-4 w-4" />
          Istoric execuții
        </Button>
        <Button onClick={() => { setShowCreate((v) => !v); setActiveTab('workflows'); }}>
          <Plus className="mr-2 h-4 w-4" />
          Workflow nou
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Se încarcă workflow-urile…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        {header}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Nu am putut încărca automatizările</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{loadError}</span>
            <div>
              <Button variant="outline" size="sm" onClick={() => void fetchAll()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reîncearcă
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const createForm = showCreate && (
    <Card>
      <CardHeader>
        <CardTitle>Workflow nou</CardTitle>
        <CardDescription>
          Se creează ca ciornă cu un schelet minim (declanșator manual → sfârșit). Editorul vizual
          pentru acțiuni nu este încă disponibil în aplicație.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={createWorkflow} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wf-name">Nume</Label>
            <Input
              id="wf-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex. Reminder facturi restante"
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wf-desc">Descriere (opțional)</Label>
            <Input
              id="wf-desc"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Ce face acest workflow?"
              maxLength={300}
            />
          </div>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Creează
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
              Renunță
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {header}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Stocare temporară</AlertTitle>
        <AlertDescription>
          Motorul de workflow-uri păstrează deocamdată datele în memoria serverului; la repornire lista poate fi
          goală. Cifrele de mai jos sunt cele reale raportate de server.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Workflow-uri active</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkflows}</div>
            <p className="text-xs text-muted-foreground">din {totalWorkflows} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Execuții totale</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions.toLocaleString('ro-RO')}</div>
            <p className="text-xs text-muted-foreground">înregistrate de server</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rată succes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate === null ? '—' : `${successRate.toFixed(1)}%`}</div>
            <p className="text-xs text-muted-foreground">
              {successRate === null ? 'nicio execuție finalizată' : `${completedCount} reușite / ${failedCount} eșuate`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Durată medie</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions > 0 ? formatDuration(avgMs) : '—'}</div>
            <p className="text-xs text-muted-foreground">per execuție</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflows">Workflow-uri</TabsTrigger>
          <TabsTrigger value="executions">Execuții</TabsTrigger>
          <TabsTrigger value="triggers">Triggere</TabsTrigger>
          <TabsTrigger value="analytics">Analiză</TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          {createForm}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Toate workflow-urile</CardTitle>
                  <CardDescription>Gestionare procese automatizate</CardDescription>
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Caută workflow..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {workflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Workflow className="h-6 w-6 text-primary" />
                  </div>
                  <p className="mt-4 font-medium">Niciun workflow</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Nu există încă automatizări pentru organizația ta. Creează primul workflow pentru a începe.
                  </p>
                  <Button className="mt-4" onClick={() => setShowCreate(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Creează primul workflow
                  </Button>
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Niciun workflow nu corespunde căutării „{searchTerm}”.
                </p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {filteredWorkflows.map((workflow) => {
                      const triggerNode = workflow.nodes.find((n) => n.type === 'trigger');
                      const triggerKey = triggerNode?.config?.triggerType || 'manual';
                      const actionCount = workflow.nodes.filter((n) => n.type !== 'trigger' && n.type !== 'end').length;
                      const wfSuccess =
                        workflow.stats.totalExecutions > 0
                          ? (workflow.stats.successfulExecutions / workflow.stats.totalExecutions) * 100
                          : null;
                      const busy = busyId === workflow.id;
                      return (
                        <div key={workflow.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="rounded-lg bg-primary/10 p-2">
                                <GitBranch className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-lg font-medium">{workflow.name}</span>
                                  {getStatusBadge(workflow.status)}
                                </div>
                                {workflow.description && (
                                  <p className="text-sm text-muted-foreground">{workflow.description}</p>
                                )}
                                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    {triggerNode ? TRIGGER_LABELS[triggerKey] || triggerKey : 'Fără declanșator'}
                                  </Badge>
                                  <ArrowRight className="h-4 w-4" />
                                  <span>{actionCount} {actionCount === 1 ? 'acțiune' : 'acțiuni'}</span>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Ultima execuție: {formatDate(workflow.stats.lastExecutedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{workflow.stats.totalExecutions.toLocaleString('ro-RO')}</p>
                              <p className="text-sm text-muted-foreground">execuții</p>
                              {wfSuccess !== null && (
                                <Badge variant={wfSuccess >= 95 ? 'default' : 'secondary'} className="mt-1">
                                  {wfSuccess.toFixed(1)}% succes
                                </Badge>
                              )}
                              <div className="mt-3 flex flex-wrap justify-end gap-2">
                                {workflow.status === 'active' && (
                                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void runAction(workflow, 'execute')}>
                                    {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
                                    Rulează
                                  </Button>
                                )}
                                {workflow.status === 'active' ? (
                                  <Button size="sm" disabled={busy} onClick={() => void runAction(workflow, 'pause')}>
                                    <Pause className="mr-1 h-4 w-4" />
                                    Pauză
                                  </Button>
                                ) : (
                                  <Button size="sm" disabled={busy} onClick={() => void runAction(workflow, 'activate')}>
                                    {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
                                    Activează
                                  </Button>
                                )}
                                {workflow.status !== 'active' && (
                                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => void runAction(workflow, 'archive')}>
                                    <Archive className="mr-1 h-4 w-4" />
                                    Arhivează
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execuții recente</CardTitle>
              <CardDescription>Istoric rulări workflow-uri (ultimele 20 per workflow)</CardDescription>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nicio execuție înregistrată. Activează un workflow și apasă „Rulează” pentru a porni prima execuție.
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {executions.map((exec) => {
                      const name = exec.context?.metadata?.workflowName || workflowNameById.get(exec.workflowId) || exec.workflowId;
                      const done = exec.nodeExecutions?.filter((n) => n.status === 'completed').length ?? 0;
                      const totalNodes = workflows.find((w) => w.id === exec.workflowId)?.nodes.length;
                      const isRunning = exec.status === 'running' || exec.status === 'pending' || exec.status === 'waiting';
                      return (
                        <div key={exec.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`rounded-full p-2 ${
                                exec.status === 'completed'
                                  ? 'bg-green-100'
                                  : exec.status === 'failed'
                                    ? 'bg-red-100'
                                    : exec.status === 'cancelled'
                                      ? 'bg-gray-100'
                                      : 'bg-blue-100'
                              }`}
                            >
                              {exec.status === 'completed' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : exec.status === 'failed' ? (
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                              ) : exec.status === 'cancelled' ? (
                                <XCircle className="h-5 w-5 text-gray-600" />
                              ) : (
                                <Activity className="h-5 w-5 animate-pulse text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{name}</p>
                              <p className="text-sm text-muted-foreground">
                                Declanșator: {TRIGGER_LABELS[exec.trigger?.type] || exec.trigger?.type || '—'}
                              </p>
                              {exec.error?.message && (
                                <p className="mt-1 text-xs text-red-600">{exec.error.message}</p>
                              )}
                              <p className="mt-1 text-xs text-muted-foreground">{formatDate(exec.startedAt)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {getExecutionStatusBadge(exec.status)}
                            <p className="mt-1 text-sm text-muted-foreground">
                              {done}{totalNodes ? `/${totalNodes}` : ''} noduri
                            </p>
                            {!isRunning && (
                              <p className="text-xs text-muted-foreground">{formatDuration(exec.duration)} durată</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Triggere folosite</CardTitle>
              <CardDescription>Declanșatoare configurate în workflow-urile existente</CardDescription>
            </CardHeader>
            <CardContent>
              {triggerUsage.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Niciun declanșator configurat încă — apare aici după ce creezi un workflow.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {triggerUsage.map((t) => (
                    <Card key={t.key}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Zap className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{t.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {t.workflows} {t.workflows === 1 ? 'workflow' : 'workflow-uri'} · {t.executions} execuții
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execuții după stare</CardTitle>
              <CardDescription>Distribuția execuțiilor raportată de server</CardDescription>
            </CardHeader>
            <CardContent>
              {totalExecutions === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nu există execuții de analizat încă.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Execuții" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {stats && stats.topWorkflows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cele mai rulate workflow-uri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topWorkflows.map((t) => (
                    <div key={t.workflow.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="font-medium">{t.workflow.name}</span>
                      <span className="text-muted-foreground">{t.executionCount} execuții</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Map known engine error strings to Romanian; pass through anything else. */
function translateBackendError(msg: string): string {
  if (/not found/i.test(msg)) return 'Workflow-ul nu mai există pe server (posibil repornire). Reîncarcă lista.';
  if (/not active/i.test(msg)) return 'Workflow-ul nu este activ. Activează-l înainte de rulare.';
  if (/validation failed/i.test(msg)) {
    return `Validarea a eșuat: ${msg
      .replace(/^Workflow validation failed:\s*/i, '')
      .replace(/Workflow must have at least one trigger node/gi, 'lipsește nodul declanșator')
      .replace(/Workflow must have at least one end node/gi, 'lipsește nodul de sfârșit')
      .replace(/Unconnected nodes:/gi, 'noduri neconectate:')}`;
  }
  return msg;
}
