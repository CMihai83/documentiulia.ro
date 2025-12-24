'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ExternalLink,
  Zap,
  Database,
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
  TrendingUp,
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
  LineChart,
  Line,
} from 'recharts';

// Types
type IntegrationCategory = 'accounting' | 'banking' | 'crm' | 'ecommerce' | 'email' | 'payments' | 'storage' | 'tax' | 'communication' | 'productivity';
type IntegrationStatus = 'available' | 'coming_soon' | 'beta';
type ConnectionStatus = 'active' | 'inactive' | 'error' | 'pending';

interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  icon: string;
  features: string[];
  status: IntegrationStatus;
  authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
  pricing: 'free' | 'paid' | 'freemium';
  connected?: boolean;
  connectionStatus?: ConnectionStatus;
  lastSync?: string;
  syncSuccess?: number;
}

interface SyncLog {
  id: string;
  integrationName: string;
  type: 'manual' | 'scheduled';
  status: 'success' | 'partial' | 'failed' | 'running';
  startedAt: string;
  completedAt?: string;
  recordsProcessed: number;
  recordsFailed: number;
}

// Sample data
const integrations: Integration[] = [
  // Accounting
  {
    id: 'saga',
    name: 'SAGA Accounting',
    category: 'accounting',
    description: 'Software contabilitate românesc pentru facturi, inventar și salarizare',
    icon: 'saga',
    features: ['Sincronizare facturi', 'Management inventar', 'Salarizare', 'Export SAF-T'],
    status: 'available',
    authType: 'api_key',
    pricing: 'paid',
    connected: true,
    connectionStatus: 'active',
    lastSync: '2025-12-14T10:00:00',
    syncSuccess: 98.5,
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    category: 'accounting',
    description: 'Conectare QuickBooks Online pentru sincronizare contabilitate',
    icon: 'quickbooks',
    features: ['Sincronizare facturi', 'Cheltuieli', 'Rapoarte', 'Feed bancar'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'paid',
  },
  {
    id: 'xero',
    name: 'Xero',
    category: 'accounting',
    description: 'Software contabilitate cloud pentru afaceri mici',
    icon: 'xero',
    features: ['Facturare', 'Reconciliere bancară', 'Salarizare', 'Inventar'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'paid',
  },
  // Banking
  {
    id: 'romanian-banks',
    name: 'Bănci Românești (PSD2)',
    category: 'banking',
    description: 'Conectare conturi bancare românești via PSD2 Open Banking',
    icon: 'bank',
    features: ['Sold cont', 'Istoric tranzacții', 'Inițiere plăți'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'free',
    connected: true,
    connectionStatus: 'active',
    lastSync: '2025-12-14T09:30:00',
    syncSuccess: 100,
  },
  // Payments
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    description: 'Procesare plăți și management abonamente',
    icon: 'stripe',
    features: ['Procesare plăți', 'Abonamente', 'Facturare', 'Connect'],
    status: 'available',
    authType: 'api_key',
    pricing: 'freemium',
    connected: true,
    connectionStatus: 'active',
    lastSync: '2025-12-14T11:00:00',
    syncSuccess: 99.2,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    category: 'payments',
    description: 'Plăți online și transfer de bani',
    icon: 'paypal',
    features: ['Plăți online', 'Checkout', 'Facturi'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'freemium',
  },
  // CRM
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    description: 'Platformă CRM enterprise',
    icon: 'salesforce',
    features: ['Sincronizare contacte', 'Lead-uri', 'Oportunități', 'Rapoarte'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'paid',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    description: 'CRM, marketing și vânzări all-in-one',
    icon: 'hubspot',
    features: ['Contacte', 'Email tracking', 'Pipeline deals', 'Automatizare'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'freemium',
    connected: true,
    connectionStatus: 'error',
    lastSync: '2025-12-12T15:00:00',
    syncSuccess: 45.0,
  },
  // E-commerce
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'ecommerce',
    description: 'Platformă e-commerce',
    icon: 'shopify',
    features: ['Sincronizare comenzi', 'Catalog produse', 'Inventar', 'Clienți'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'paid',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    category: 'ecommerce',
    description: 'Plugin e-commerce WordPress',
    icon: 'woocommerce',
    features: ['Sincronizare comenzi', 'Produse', 'Import clienți'],
    status: 'available',
    authType: 'api_key',
    pricing: 'free',
  },
  // Email
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'email',
    description: 'Email marketing și automatizare',
    icon: 'mailchimp',
    features: ['Campanii email', 'Sincronizare audiență', 'Automatizare', 'Analytics'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'freemium',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'email',
    description: 'Email tranzacțional și marketing',
    icon: 'sendgrid',
    features: ['Email tranzacțional', 'Campanii', 'API Email', 'Analytics'],
    status: 'available',
    authType: 'api_key',
    pricing: 'freemium',
  },
  // Storage
  {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'storage',
    description: 'Stocare cloud și management fișiere',
    icon: 'gdrive',
    features: ['Upload fișiere', 'Sincronizare foldere', 'Backup documente', 'Partajare'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'freemium',
    connected: true,
    connectionStatus: 'active',
    lastSync: '2025-12-14T08:00:00',
    syncSuccess: 100,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'storage',
    description: 'Stocare cloud și colaborare',
    icon: 'dropbox',
    features: ['Sincronizare fișiere', 'Backup', 'Foldere echipă'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'freemium',
  },
  // Tax
  {
    id: 'anaf-efactura',
    name: 'ANAF e-Factura',
    category: 'tax',
    description: 'Sistemul e-Factura al ANAF',
    icon: 'anaf',
    features: ['Depunere e-Factura', 'Verificare status', 'Descărcare răspunsuri'],
    status: 'available',
    authType: 'custom',
    pricing: 'free',
    connected: true,
    connectionStatus: 'active',
    lastSync: '2025-12-14T07:00:00',
    syncSuccess: 100,
  },
  // Communication
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Comunicare echipă și notificări',
    icon: 'slack',
    features: ['Notificări', 'Mesaje canal', 'Bot integration'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'freemium',
    connected: true,
    connectionStatus: 'active',
    lastSync: '2025-12-14T11:30:00',
    syncSuccess: 100,
  },
  {
    id: 'ms-teams',
    name: 'Microsoft Teams',
    category: 'communication',
    description: 'Notificări și integrare Microsoft Teams',
    icon: 'teams',
    features: ['Notificări canal', 'Mesaje echipă'],
    status: 'available',
    authType: 'oauth2',
    pricing: 'freemium',
  },
  // Productivity
  {
    id: 'zapier',
    name: 'Zapier',
    category: 'productivity',
    description: 'Conectare cu 5000+ aplicații via Zapier',
    icon: 'zapier',
    features: ['Automatizare workflow', 'Trigger-uri multi-app', 'Integrări custom'],
    status: 'available',
    authType: 'api_key',
    pricing: 'freemium',
  },
];

const syncLogs: SyncLog[] = [
  {
    id: 'sync-001',
    integrationName: 'SAGA Accounting',
    type: 'scheduled',
    status: 'success',
    startedAt: '2025-12-14T10:00:00',
    completedAt: '2025-12-14T10:02:30',
    recordsProcessed: 156,
    recordsFailed: 0,
  },
  {
    id: 'sync-002',
    integrationName: 'Stripe',
    type: 'scheduled',
    status: 'success',
    startedAt: '2025-12-14T11:00:00',
    completedAt: '2025-12-14T11:01:15',
    recordsProcessed: 45,
    recordsFailed: 0,
  },
  {
    id: 'sync-003',
    integrationName: 'HubSpot',
    type: 'manual',
    status: 'partial',
    startedAt: '2025-12-12T15:00:00',
    completedAt: '2025-12-12T15:05:00',
    recordsProcessed: 234,
    recordsFailed: 12,
  },
  {
    id: 'sync-004',
    integrationName: 'Google Drive',
    type: 'scheduled',
    status: 'success',
    startedAt: '2025-12-14T08:00:00',
    completedAt: '2025-12-14T08:03:45',
    recordsProcessed: 89,
    recordsFailed: 0,
  },
  {
    id: 'sync-005',
    integrationName: 'ANAF e-Factura',
    type: 'manual',
    status: 'success',
    startedAt: '2025-12-14T07:00:00',
    completedAt: '2025-12-14T07:00:30',
    recordsProcessed: 12,
    recordsFailed: 0,
  },
];

// Chart data
const syncTrendData = [
  { day: 'Lun', success: 45, failed: 2 },
  { day: 'Mar', success: 52, failed: 1 },
  { day: 'Mie', success: 48, failed: 3 },
  { day: 'Joi', success: 56, failed: 0 },
  { day: 'Vin', success: 61, failed: 2 },
  { day: 'Sâm', success: 15, failed: 0 },
  { day: 'Dum', success: 8, failed: 0 },
];

const categoryDistribution = [
  { name: 'Contabilitate', value: 3, color: '#3B82F6' },
  { name: 'Plăți', value: 2, color: '#10B981' },
  { name: 'CRM', value: 2, color: '#F59E0B' },
  { name: 'Stocare', value: 2, color: '#8B5CF6' },
  { name: 'Comunicare', value: 2, color: '#EC4899' },
  { name: 'Altele', value: 5, color: '#6B7280' },
];

const categoryLabels: Record<IntegrationCategory, string> = {
  accounting: 'Contabilitate',
  banking: 'Banking',
  crm: 'CRM',
  ecommerce: 'E-commerce',
  email: 'Email',
  payments: 'Plăți',
  storage: 'Stocare',
  tax: 'Fiscalitate',
  communication: 'Comunicare',
  productivity: 'Productivitate',
};

const categoryIcons: Record<IntegrationCategory, React.ReactNode> = {
  accounting: <FileText className="h-5 w-5" />,
  banking: <Building className="h-5 w-5" />,
  crm: <Users className="h-5 w-5" />,
  ecommerce: <ShoppingCart className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  payments: <CreditCard className="h-5 w-5" />,
  storage: <Cloud className="h-5 w-5" />,
  tax: <FileText className="h-5 w-5" />,
  communication: <MessageSquare className="h-5 w-5" />,
  productivity: <Zap className="h-5 w-5" />,
};

export default function IntegrationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('catalog');

  const getConnectionStatusBadge = (status?: ConnectionStatus) => {
    if (!status) return null;
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

  const getSyncStatusBadge = (status: SyncLog['status']) => {
    const statusConfig = {
      running: { label: 'În curs', variant: 'outline' as const, icon: RefreshCw },
      success: { label: 'Succes', variant: 'default' as const, icon: CheckCircle },
      partial: { label: 'Parțial', variant: 'secondary' as const, icon: AlertTriangle },
      failed: { label: 'Eșuat', variant: 'destructive' as const, icon: XCircle },
    };
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPricingBadge = (pricing: Integration['pricing']) => {
    const pricingConfig = {
      free: { label: 'Gratuit', color: 'bg-green-100 text-green-800' },
      paid: { label: 'Plătit', color: 'bg-blue-100 text-blue-800' },
      freemium: { label: 'Freemium', color: 'bg-purple-100 text-purple-800' },
    };
    const config = pricingConfig[pricing];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || integration.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'connected' && integration.connected) ||
      (statusFilter === 'available' && !integration.connected);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const connectedIntegrations = integrations.filter((i) => i.connected);

  // Stats
  const totalAvailable = integrations.length;
  const totalConnected = connectedIntegrations.length;
  const activeConnections = connectedIntegrations.filter((i) => i.connectionStatus === 'active').length;
  const errorConnections = connectedIntegrations.filter((i) => i.connectionStatus === 'error').length;

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
          <Button variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Istoric sincronizări
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Adaugă integrare
          </Button>
        </div>
      </div>

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
              Funcționează corect
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cu erori</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{errorConnections}</div>
            <p className="text-xs text-muted-foreground">
              Necesită atenție
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
              <CardDescription>Explorează și conectează aplicații</CardDescription>
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
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
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
                    <SelectItem value="available">Disponibile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Integration Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredIntegrations.map((integration) => (
                  <Card key={integration.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-muted p-2">
                            {categoryIcons[integration.category]}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                            <Badge variant="outline" className="mt-1">
                              {categoryLabels[integration.category]}
                            </Badge>
                          </div>
                        </div>
                        {integration.connected && getConnectionStatusBadge(integration.connectionStatus)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{integration.description}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {integration.features.slice(0, 3).map((feature, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {integration.features.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{integration.features.length - 3}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        {getPricingBadge(integration.pricing)}
                        {integration.connected ? (
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-1" />
                            Configurare
                          </Button>
                        ) : (
                          <Button size="sm">
                            <Plug className="h-4 w-4 mr-1" />
                            Conectează
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connected Tab */}
        <TabsContent value="connected" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integrări conectate</CardTitle>
              <CardDescription>Gestionare conexiuni active</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connectedIntegrations.map((integration) => (
                  <div key={integration.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-muted p-3">
                          {categoryIcons[integration.category]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-lg">{integration.name}</span>
                            {getConnectionStatusBadge(integration.connectionStatus)}
                          </div>
                          <p className="text-sm text-muted-foreground">{integration.description}</p>
                          {integration.lastSync && (
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-muted-foreground">
                                Ultima sincronizare: {new Date(integration.lastSync).toLocaleString('ro-RO')}
                              </span>
                              {integration.syncSuccess && (
                                <span className={integration.syncSuccess >= 95 ? 'text-green-600' : 'text-yellow-600'}>
                                  Rată succes: {integration.syncSuccess}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Sincronizează
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-500">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {integration.connectionStatus === 'error' && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Eroare conexiune</span>
                        </div>
                        <p className="text-sm text-red-600 mt-1">
                          Conexiunea a eșuat. Verificați credențialele sau contactați suportul.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
                  <CardDescription>Jurnalizare operațiuni de sincronizare</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizează
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {syncLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-muted p-2">
                          <ArrowRightLeft className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{log.integrationName}</span>
                            {getSyncStatusBadge(log.status)}
                            <Badge variant="outline">{log.type === 'scheduled' ? 'Programat' : 'Manual'}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.startedAt).toLocaleString('ro-RO')}
                            {log.completedAt && ` - ${new Date(log.completedAt).toLocaleTimeString('ro-RO')}`}
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
                <CardDescription>Succes vs. eșuări ultimele 7 zile</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={syncTrendData}>
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

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuție categorii</CardTitle>
                <CardDescription>Integrări după categorie</CardDescription>
              </CardHeader>
              <CardContent>
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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Integration Health */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sănătate integrări</CardTitle>
                <CardDescription>Status conexiuni active</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {connectedIntegrations.map((integration) => (
                    <div key={integration.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className={`rounded-full p-2 ${
                        integration.connectionStatus === 'active' ? 'bg-green-100' :
                        integration.connectionStatus === 'error' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {integration.connectionStatus === 'active' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : integration.connectionStatus === 'error' ? (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{integration.name}</p>
                        {integration.syncSuccess && (
                          <div className="mt-1">
                            <Progress value={integration.syncSuccess} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">{integration.syncSuccess}% succes</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
