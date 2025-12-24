'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Workflow,
  Play,
  Pause,
  Plus,
  Settings,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Mail,
  FileText,
  Users,
  Bell,
  Calendar,
  Database,
  Search,
  MoreHorizontal,
  Activity,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

// Types
interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: string[];
  status: 'active' | 'paused' | 'draft';
  executions: number;
  lastRun?: string;
  successRate: number;
}

interface Execution {
  id: string;
  workflowName: string;
  trigger: string;
  status: 'success' | 'failed' | 'running';
  startedAt: string;
  duration: number;
  actionsCompleted: number;
  totalActions: number;
}

// Sample data
const workflows: WorkflowItem[] = [
  {
    id: 'wf-001',
    name: 'Factură → e-Factura ANAF',
    description: 'Trimite automat facturile noi la ANAF',
    trigger: 'Factură creată',
    actions: ['Validare XML', 'Trimitere ANAF', 'Update status', 'Notificare email'],
    status: 'active',
    executions: 1245,
    lastRun: '2025-12-14T10:30:00',
    successRate: 98.5,
  },
  {
    id: 'wf-002',
    name: 'Reminder facturi restante',
    description: 'Trimite reminder automat la 7, 14, 30 zile',
    trigger: 'Factură restantă',
    actions: ['Verificare scadență', 'Generare email', 'Trimitere client', 'Log activitate'],
    status: 'active',
    executions: 456,
    lastRun: '2025-12-14T08:00:00',
    successRate: 100,
  },
  {
    id: 'wf-003',
    name: 'Onboarding client nou',
    description: 'Configurare automată pentru clienți noi',
    trigger: 'Client creat',
    actions: ['Creare folder', 'Email bun venit', 'Assignare account manager', 'Notificare Slack'],
    status: 'active',
    executions: 89,
    lastRun: '2025-12-13T16:45:00',
    successRate: 95.5,
  },
  {
    id: 'wf-004',
    name: 'Raport lunar automat',
    description: 'Generează și trimite rapoarte la început de lună',
    trigger: 'Prima zi a lunii',
    actions: ['Agregare date', 'Generare PDF', 'Trimitere email', 'Arhivare'],
    status: 'active',
    executions: 24,
    lastRun: '2025-12-01T06:00:00',
    successRate: 100,
  },
  {
    id: 'wf-005',
    name: 'Aprobare cheltuieli',
    description: 'Flux de aprobare pentru cheltuieli',
    trigger: 'Cheltuială creată > 1000 RON',
    actions: ['Notificare manager', 'Așteptare aprobare', 'Update status', 'Notificare solicitant'],
    status: 'paused',
    executions: 156,
    lastRun: '2025-12-10T14:20:00',
    successRate: 92.3,
  },
  {
    id: 'wf-006',
    name: 'Backup zilnic documente',
    description: 'Backup automat la sfârșitul zilei',
    trigger: 'Zilnic la 23:00',
    actions: ['Export documente', 'Compresie', 'Upload cloud', 'Verificare integritate'],
    status: 'draft',
    executions: 0,
    successRate: 0,
  },
];

const recentExecutions: Execution[] = [
  {
    id: 'exec-001',
    workflowName: 'Factură → e-Factura ANAF',
    trigger: 'Factură PRO-2025-0892 creată',
    status: 'success',
    startedAt: '2025-12-14T10:30:00',
    duration: 2.3,
    actionsCompleted: 4,
    totalActions: 4,
  },
  {
    id: 'exec-002',
    workflowName: 'Reminder facturi restante',
    trigger: 'Factură PRO-2025-0756 restantă 14 zile',
    status: 'success',
    startedAt: '2025-12-14T08:00:00',
    duration: 1.1,
    actionsCompleted: 4,
    totalActions: 4,
  },
  {
    id: 'exec-003',
    workflowName: 'Factură → e-Factura ANAF',
    trigger: 'Factură PRO-2025-0891 creată',
    status: 'failed',
    startedAt: '2025-12-14T09:15:00',
    duration: 5.2,
    actionsCompleted: 2,
    totalActions: 4,
  },
  {
    id: 'exec-004',
    workflowName: 'Onboarding client nou',
    trigger: 'Client TechStart SRL creat',
    status: 'running',
    startedAt: '2025-12-14T10:45:00',
    duration: 0,
    actionsCompleted: 2,
    totalActions: 4,
  },
];

const executionStats = [
  { day: 'Lun', success: 45, failed: 2 },
  { day: 'Mar', success: 52, failed: 1 },
  { day: 'Mie', success: 48, failed: 3 },
  { day: 'Joi', success: 56, failed: 0 },
  { day: 'Vin', success: 61, failed: 2 },
  { day: 'Sâm', success: 15, failed: 0 },
  { day: 'Dum', success: 8, failed: 0 },
];

const triggers = [
  { name: 'Factură creată', icon: FileText, count: 1245 },
  { name: 'Client creat', icon: Users, count: 89 },
  { name: 'Plată primită', icon: CheckCircle, count: 567 },
  { name: 'Document încărcat', icon: Database, count: 234 },
  { name: 'Programat', icon: Calendar, count: 156 },
  { name: 'Manual', icon: Play, count: 45 },
];

export default function WorkflowPage() {
  const [activeTab, setActiveTab] = useState('workflows');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadge = (status: WorkflowItem['status']) => {
    const config = {
      active: { label: 'Activ', variant: 'default' as const, icon: Play },
      paused: { label: 'Pauză', variant: 'secondary' as const, icon: Pause },
      draft: { label: 'Ciornă', variant: 'outline' as const, icon: FileText },
    };
    const c = config[status];
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <c.icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  const getExecutionStatusBadge = (status: Execution['status']) => {
    const config = {
      success: { label: 'Succes', variant: 'default' as const, color: 'text-green-500' },
      failed: { label: 'Eșuat', variant: 'destructive' as const, color: 'text-red-500' },
      running: { label: 'În curs', variant: 'secondary' as const, color: 'text-blue-500' },
    };
    return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
  };

  const filteredWorkflows = workflows.filter(
    (wf) =>
      wf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wf.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeWorkflows = workflows.filter((w) => w.status === 'active').length;
  const totalExecutions = workflows.reduce((sum, w) => sum + w.executions, 0);
  const avgSuccessRate = workflows.filter(w => w.executions > 0).reduce((sum, w) => sum + w.successRate, 0) / workflows.filter(w => w.executions > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automatizări</h1>
          <p className="text-muted-foreground">
            Workflow-uri și procese automatizate
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Istoric execuții
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Workflow nou
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Workflow-uri active</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkflows}</div>
            <p className="text-xs text-muted-foreground">din {workflows.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Execuții totale</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">toate timpurile</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rată succes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">medie globală</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Timp economisit</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~45h</div>
            <p className="text-xs text-muted-foreground">luna aceasta</p>
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
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {filteredWorkflows.map((workflow) => (
                    <div key={workflow.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <GitBranch className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-lg">{workflow.name}</span>
                              {getStatusBadge(workflow.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{workflow.description}</p>
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {workflow.trigger}
                              </Badge>
                              <ArrowRight className="h-4 w-4" />
                              <span>{workflow.actions.length} acțiuni</span>
                            </div>
                            {workflow.lastRun && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Ultima execuție: {new Date(workflow.lastRun).toLocaleString('ro-RO')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{workflow.executions.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">execuții</p>
                          {workflow.executions > 0 && (
                            <Badge variant={workflow.successRate >= 95 ? 'default' : 'secondary'} className="mt-1">
                              {workflow.successRate}% succes
                            </Badge>
                          )}
                          <div className="flex gap-2 mt-3 justify-end">
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button size="sm">
                              {workflow.status === 'active' ? 'Pauză' : 'Activează'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execuții recente</CardTitle>
              <CardDescription>Istoric rulări workflow-uri</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {recentExecutions.map((exec) => (
                    <div key={exec.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className={`rounded-full p-2 ${
                          exec.status === 'success' ? 'bg-green-100' :
                          exec.status === 'failed' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          {exec.status === 'success' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                           exec.status === 'failed' ? <AlertTriangle className="h-5 w-5 text-red-600" /> :
                           <Activity className="h-5 w-5 text-blue-600 animate-pulse" />}
                        </div>
                        <div>
                          <p className="font-medium">{exec.workflowName}</p>
                          <p className="text-sm text-muted-foreground">{exec.trigger}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(exec.startedAt).toLocaleString('ro-RO')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getExecutionStatusBadge(exec.status)}
                        <p className="text-sm text-muted-foreground mt-1">
                          {exec.actionsCompleted}/{exec.totalActions} acțiuni
                        </p>
                        {exec.duration > 0 && (
                          <p className="text-xs text-muted-foreground">{exec.duration}s durată</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Triggere disponibile</CardTitle>
              <CardDescription>Evenimente care pot declanșa workflow-uri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {triggers.map((trigger) => (
                  <Card key={trigger.name}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <trigger.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{trigger.name}</p>
                          <p className="text-sm text-muted-foreground">{trigger.count} execuții</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execuții pe zile</CardTitle>
              <CardDescription>Ultimele 7 zile</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={executionStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="success" name="Succes" fill="#10B981" />
                  <Bar dataKey="failed" name="Eșuate" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
