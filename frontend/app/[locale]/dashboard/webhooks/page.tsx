'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Webhook,
  Plus,
  Settings,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Copy,
  Eye,
  EyeOff,
  Send,
  Activity,
  Zap,
  Globe,
  Key,
  RotateCcw,
} from 'lucide-react';
import {
  LineChart,
  Line,
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

// Types
type WebhookStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED' | 'FAILED';
type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRYING';

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  secret: string;
  consecutiveFailures: number;
  lastDeliveryAt?: string;
  lastSuccessAt?: string;
  createdAt: string;
  deliveryRate: number;
  totalDeliveries: number;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  webhookName: string;
  event: string;
  status: DeliveryStatus;
  attempts: number;
  maxRetries: number;
  lastStatusCode?: number;
  createdAt: string;
  completedAt?: string;
  durationMs: number;
  payload: string;
}

interface WebhookEvent {
  event: string;
  label: string;
  category: string;
}

// Sample data
const webhookEndpoints: WebhookEndpoint[] = [
  {
    id: 'webhook-001',
    name: 'Sistem ERP Principal',
    url: 'https://erp.company.ro/api/webhooks/documentiulia',
    events: ['invoice.created', 'invoice.paid', 'payment.received'],
    status: 'ACTIVE',
    secret: 'whsec_abc123def456789...',
    consecutiveFailures: 0,
    lastDeliveryAt: '2025-12-14T10:30:00',
    lastSuccessAt: '2025-12-14T10:30:00',
    createdAt: '2025-06-01T00:00:00',
    deliveryRate: 99.5,
    totalDeliveries: 1245,
  },
  {
    id: 'webhook-002',
    name: 'Notificări Slack',
    url: 'https://hooks.slack.com/services/T00/B00/xxx',
    events: ['invoice.overdue', 'anaf.submission.failed', 'payment.failed'],
    status: 'ACTIVE',
    secret: 'whsec_slack789xyz...',
    consecutiveFailures: 0,
    lastDeliveryAt: '2025-12-13T16:45:00',
    lastSuccessAt: '2025-12-13T16:45:00',
    createdAt: '2025-08-15T00:00:00',
    deliveryRate: 100,
    totalDeliveries: 456,
  },
  {
    id: 'webhook-003',
    name: 'Sistem CRM',
    url: 'https://crm.example.ro/hooks/incoming',
    events: ['client.created', 'client.updated', 'invoice.created'],
    status: 'PAUSED',
    secret: 'whsec_crm456abc...',
    consecutiveFailures: 0,
    lastDeliveryAt: '2025-12-10T14:20:00',
    lastSuccessAt: '2025-12-10T14:20:00',
    createdAt: '2025-07-20T00:00:00',
    deliveryRate: 98.2,
    totalDeliveries: 789,
  },
  {
    id: 'webhook-004',
    name: 'Backup Analytics',
    url: 'https://analytics.backup.ro/webhook',
    events: ['report.generated', 'document.created'],
    status: 'FAILED',
    secret: 'whsec_analytics123...',
    consecutiveFailures: 12,
    lastDeliveryAt: '2025-12-12T08:00:00',
    createdAt: '2025-09-01T00:00:00',
    deliveryRate: 45.5,
    totalDeliveries: 234,
  },
];

const recentDeliveries: WebhookDelivery[] = [
  {
    id: 'del-001',
    webhookId: 'webhook-001',
    webhookName: 'Sistem ERP Principal',
    event: 'invoice.created',
    status: 'DELIVERED',
    attempts: 1,
    maxRetries: 3,
    lastStatusCode: 200,
    createdAt: '2025-12-14T10:30:00',
    completedAt: '2025-12-14T10:30:01',
    durationMs: 145,
    payload: '{"invoice_id": "INV-2025-0892", "amount": 4500.00}',
  },
  {
    id: 'del-002',
    webhookId: 'webhook-002',
    webhookName: 'Notificări Slack',
    event: 'invoice.overdue',
    status: 'DELIVERED',
    attempts: 1,
    maxRetries: 3,
    lastStatusCode: 200,
    createdAt: '2025-12-13T16:45:00',
    completedAt: '2025-12-13T16:45:00',
    durationMs: 89,
    payload: '{"invoice_id": "INV-2025-0756", "days_overdue": 15}',
  },
  {
    id: 'del-003',
    webhookId: 'webhook-004',
    webhookName: 'Backup Analytics',
    event: 'report.generated',
    status: 'FAILED',
    attempts: 3,
    maxRetries: 3,
    lastStatusCode: 503,
    createdAt: '2025-12-12T08:00:00',
    completedAt: '2025-12-12T08:05:00',
    durationMs: 5000,
    payload: '{"report_type": "monthly", "period": "2025-11"}',
  },
  {
    id: 'del-004',
    webhookId: 'webhook-001',
    webhookName: 'Sistem ERP Principal',
    event: 'payment.received',
    status: 'RETRYING',
    attempts: 2,
    maxRetries: 3,
    lastStatusCode: 500,
    createdAt: '2025-12-14T09:15:00',
    durationMs: 2500,
    payload: '{"payment_id": "PAY-2025-0456", "amount": 2500.00}',
  },
  {
    id: 'del-005',
    webhookId: 'webhook-003',
    webhookName: 'Sistem CRM',
    event: 'client.created',
    status: 'PENDING',
    attempts: 0,
    maxRetries: 3,
    createdAt: '2025-12-14T11:00:00',
    durationMs: 0,
    payload: '{"client_id": "CL-2025-0123", "name": "Test SRL"}',
  },
];

const availableEvents: WebhookEvent[] = [
  { event: 'invoice.created', label: 'Factură Creată', category: 'Facturi' },
  { event: 'invoice.updated', label: 'Factură Actualizată', category: 'Facturi' },
  { event: 'invoice.deleted', label: 'Factură Ștearsă', category: 'Facturi' },
  { event: 'invoice.paid', label: 'Factură Plătită', category: 'Facturi' },
  { event: 'invoice.overdue', label: 'Factură Restantă', category: 'Facturi' },
  { event: 'client.created', label: 'Client Creat', category: 'Clienți' },
  { event: 'client.updated', label: 'Client Actualizat', category: 'Clienți' },
  { event: 'client.deleted', label: 'Client Șters', category: 'Clienți' },
  { event: 'payment.received', label: 'Plată Primită', category: 'Plăți' },
  { event: 'payment.failed', label: 'Plată Eșuată', category: 'Plăți' },
  { event: 'document.created', label: 'Document Creat', category: 'Documente' },
  { event: 'document.signed', label: 'Document Semnat', category: 'Documente' },
  { event: 'anaf.submission.success', label: 'Depunere ANAF Reușită', category: 'ANAF' },
  { event: 'anaf.submission.failed', label: 'Depunere ANAF Eșuată', category: 'ANAF' },
  { event: 'employee.hired', label: 'Angajat Nou', category: 'Angajați' },
  { event: 'employee.terminated', label: 'Angajat Concediat', category: 'Angajați' },
  { event: 'report.generated', label: 'Raport Generat', category: 'Rapoarte' },
];

// Chart data
const deliveryTrendData = [
  { day: 'Lun', success: 145, failed: 2 },
  { day: 'Mar', success: 132, failed: 1 },
  { day: 'Mie', success: 156, failed: 3 },
  { day: 'Joi', success: 148, failed: 0 },
  { day: 'Vin', success: 167, failed: 1 },
  { day: 'Sâm', success: 45, failed: 0 },
  { day: 'Dum', success: 23, failed: 0 },
];

const eventDistributionData = [
  { name: 'Facturi', value: 45, color: '#3B82F6' },
  { name: 'Plăți', value: 25, color: '#10B981' },
  { name: 'Clienți', value: 15, color: '#F59E0B' },
  { name: 'ANAF', value: 10, color: '#EF4444' },
  { name: 'Altele', value: 5, color: '#8B5CF6' },
];

const responseTimeData = [
  { hour: '00:00', avgMs: 120 },
  { hour: '04:00', avgMs: 95 },
  { hour: '08:00', avgMs: 180 },
  { hour: '12:00', avgMs: 210 },
  { hour: '16:00', avgMs: 195 },
  { hour: '20:00', avgMs: 145 },
];

export default function WebhooksPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('endpoints');
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  const getStatusBadge = (status: WebhookStatus) => {
    const statusConfig = {
      ACTIVE: { label: 'Activ', variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' },
      PAUSED: { label: 'Pauză', variant: 'secondary' as const, icon: Pause, color: 'text-yellow-500' },
      DISABLED: { label: 'Dezactivat', variant: 'outline' as const, icon: XCircle, color: 'text-gray-500' },
      FAILED: { label: 'Eșuat', variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-500' },
    };
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getDeliveryStatusBadge = (status: DeliveryStatus) => {
    const statusConfig = {
      PENDING: { label: 'În așteptare', variant: 'outline' as const, icon: Clock },
      SENT: { label: 'Trimis', variant: 'secondary' as const, icon: Send },
      DELIVERED: { label: 'Livrat', variant: 'default' as const, icon: CheckCircle },
      FAILED: { label: 'Eșuat', variant: 'destructive' as const, icon: XCircle },
      RETRYING: { label: 'Reîncercare', variant: 'secondary' as const, icon: RefreshCw },
    };
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const toggleSecretVisibility = (webhookId: string) => {
    setShowSecret((prev) => ({ ...prev, [webhookId]: !prev[webhookId] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredEndpoints = webhookEndpoints.filter((endpoint) => {
    const matchesSearch = endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || endpoint.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const totalEndpoints = webhookEndpoints.length;
  const activeEndpoints = webhookEndpoints.filter((e) => e.status === 'ACTIVE').length;
  const totalDeliveries = webhookEndpoints.reduce((sum, e) => sum + e.totalDeliveries, 0);
  const avgDeliveryRate = webhookEndpoints.reduce((sum, e) => sum + e.deliveryRate, 0) / totalEndpoints;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Gestionare endpoint-uri webhook și monitorizare livrări
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Log evenimente
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Webhook nou
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total endpoint-uri</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEndpoints}</div>
            <p className="text-xs text-muted-foreground">
              {activeEndpoints} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Livrări totale</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeliveries.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Ultima lună
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rată succes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDeliveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Medie toate endpoint-urile
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Timp răspuns mediu</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156ms</div>
            <p className="text-xs text-muted-foreground">
              P95: 245ms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="endpoints">Endpoint-uri</TabsTrigger>
          <TabsTrigger value="deliveries">Livrări</TabsTrigger>
          <TabsTrigger value="events">Evenimente</TabsTrigger>
          <TabsTrigger value="analytics">Analiză</TabsTrigger>
        </TabsList>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Endpoint-uri Webhook</CardTitle>
                  <CardDescription>Gestionare URL-uri și configurare evenimente</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Caută după nume sau URL..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">În pauză</SelectItem>
                    <SelectItem value="FAILED">Eșuate</SelectItem>
                    <SelectItem value="DISABLED">Dezactivate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Endpoints List */}
              <div className="space-y-4">
                {filteredEndpoints.map((endpoint) => (
                  <div key={endpoint.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Webhook className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium text-lg">{endpoint.name}</span>
                          {getStatusBadge(endpoint.status)}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <code className="text-sm bg-muted px-2 py-1 rounded">{endpoint.url}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(endpoint.url)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {showSecret[endpoint.id] ? endpoint.secret : '••••••••••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSecretVisibility(endpoint.id)}
                          >
                            {showSecret[endpoint.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(endpoint.secret)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {endpoint.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {availableEvents.find((e) => e.event === event)?.label || event}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Livrări: {endpoint.totalDeliveries.toLocaleString()}</span>
                          <span>Rată succes: {endpoint.deliveryRate}%</span>
                          {endpoint.consecutiveFailures > 0 && (
                            <span className="text-red-500">
                              Eșuări consecutive: {endpoint.consecutiveFailures}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm">
                          <Send className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                        {endpoint.status === 'ACTIVE' ? (
                          <Button variant="outline" size="sm">
                            <Pause className="h-4 w-4 mr-1" />
                            Pauză
                          </Button>
                        ) : endpoint.status === 'PAUSED' ? (
                          <Button variant="outline" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Activează
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Istoric livrări</CardTitle>
                  <CardDescription>Jurnalizare încercări de livrare webhook</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizează
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {recentDeliveries.map((delivery) => (
                    <div key={delivery.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{delivery.webhookName}</span>
                            {getDeliveryStatusBadge(delivery.status)}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{delivery.event}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(delivery.createdAt).toLocaleString('ro-RO')}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span>Încercări: {delivery.attempts}/{delivery.maxRetries}</span>
                            {delivery.lastStatusCode && (
                              <span className="ml-4">
                                HTTP: <code className={delivery.lastStatusCode >= 200 && delivery.lastStatusCode < 300 ? 'text-green-600' : 'text-red-600'}>
                                  {delivery.lastStatusCode}
                                </code>
                              </span>
                            )}
                            {delivery.durationMs > 0 && (
                              <span className="ml-4">Durată: {delivery.durationMs}ms</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Payload
                          </Button>
                          {delivery.status === 'FAILED' && (
                            <Button variant="outline" size="sm">
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Reîncearcă
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evenimente disponibile</CardTitle>
              <CardDescription>Lista completă de evenimente la care vă puteți abona</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(
                  availableEvents.reduce((acc, event) => {
                    if (!acc[event.category]) acc[event.category] = [];
                    acc[event.category].push(event);
                    return acc;
                  }, {} as Record<string, WebhookEvent[]>)
                ).map(([category, events]) => (
                  <div key={category} className="rounded-lg border p-4">
                    <h3 className="font-medium mb-3">{category}</h3>
                    <div className="space-y-2">
                      {events.map((event) => (
                        <div key={event.event} className="flex items-center justify-between">
                          <div>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{event.event}</code>
                            <p className="text-sm text-muted-foreground mt-1">{event.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Webhook Signature */}
          <Card>
            <CardHeader>
              <CardTitle>Verificare semnătură</CardTitle>
              <CardDescription>Cum să validați autenticitatea webhook-urilor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Fiecare webhook trimis include un header <code>X-Webhook-Signature</code> care conține
                  semnătura HMAC-SHA256 a payload-ului, generată folosind secret-ul webhook-ului.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <code className="text-sm">
                    {`const crypto = require('crypto');

const signature = req.headers['x-webhook-signature'];
const payload = JSON.stringify(req.body);
const expectedSig = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');

if (signature !== expectedSig) {
  throw new Error('Invalid signature');
}`}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Delivery Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Trend livrări</CardTitle>
                <CardDescription>Succes vs. eșuări ultimele 7 zile</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={deliveryTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="success" name="Succes" fill="#10B981" />
                    <Bar dataKey="failed" name="Eșuate" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Event Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuție evenimente</CardTitle>
                <CardDescription>Evenimente declanșate după categorie</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={eventDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {eventDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Timp răspuns pe ore</CardTitle>
                <CardDescription>Latența medie în milisecunde</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="avgMs"
                      name="Timp mediu (ms)"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
