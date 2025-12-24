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
  Shield,
  FileText,
  Download,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  User,
  Database,
  Lock,
  RefreshCw,
  Search,
  Plus,
  Settings,
  FileCheck,
  History,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// Types
interface DsrRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'DATA_ACCESS' | 'DATA_DELETION' | 'DATA_PORTABILITY' | 'DATA_RECTIFICATION' | 'WITHDRAW_CONSENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  reason: string;
  createdAt: string;
  deadline: string;
  processedBy?: string;
  processedAt?: string;
}

interface ConsentRecord {
  id: string;
  purpose: string;
  description: string;
  granted: boolean;
  lastUpdated: string;
  category: 'essential' | 'functional' | 'analytics' | 'marketing';
}

interface DataInventory {
  category: string;
  dataTypes: string[];
  purpose: string;
  retention: string;
  legalBasis: string;
  recordCount: number;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  userId: string;
  userName: string;
  timestamp: string;
  ipAddress: string;
  details: string;
}

// Sample data
const dsrRequests: DsrRequest[] = [
  {
    id: 'DSR-001',
    userId: 'user-1',
    userName: 'Maria Ionescu',
    userEmail: 'maria.ionescu@example.com',
    type: 'DATA_ACCESS',
    status: 'PENDING',
    reason: 'Doresc să văd toate datele personale stocate',
    createdAt: '2025-12-12T10:00:00',
    deadline: '2025-01-11T10:00:00',
  },
  {
    id: 'DSR-002',
    userId: 'user-2',
    userName: 'Andrei Popescu',
    userEmail: 'andrei.popescu@example.com',
    type: 'DATA_DELETION',
    status: 'IN_PROGRESS',
    reason: 'Închidere cont și ștergere date',
    createdAt: '2025-12-10T14:30:00',
    deadline: '2025-01-09T14:30:00',
    processedBy: 'Admin DPO',
  },
  {
    id: 'DSR-003',
    userId: 'user-3',
    userName: 'Elena Dumitrescu',
    userEmail: 'elena.d@example.com',
    type: 'DATA_PORTABILITY',
    status: 'COMPLETED',
    reason: 'Export date pentru transfer la alt furnizor',
    createdAt: '2025-12-05T09:00:00',
    deadline: '2025-01-04T09:00:00',
    processedBy: 'Admin DPO',
    processedAt: '2025-12-08T16:00:00',
  },
  {
    id: 'DSR-004',
    userId: 'user-4',
    userName: 'Ion Georgescu',
    userEmail: 'ion.g@example.com',
    type: 'DATA_RECTIFICATION',
    status: 'COMPLETED',
    reason: 'Corectare adresă și nume companie',
    createdAt: '2025-12-01T11:00:00',
    deadline: '2025-12-31T11:00:00',
    processedBy: 'Admin DPO',
    processedAt: '2025-12-03T14:00:00',
  },
  {
    id: 'DSR-005',
    userId: 'user-5',
    userName: 'Ana Marin',
    userEmail: 'ana.marin@example.com',
    type: 'WITHDRAW_CONSENT',
    status: 'REJECTED',
    reason: 'Retragere consimțământ marketing',
    createdAt: '2025-11-28T08:00:00',
    deadline: '2025-12-28T08:00:00',
    processedBy: 'Admin DPO',
    processedAt: '2025-11-29T10:00:00',
  },
];

const consentRecords: ConsentRecord[] = [
  {
    id: 'consent-1',
    purpose: 'Cookie-uri esențiale',
    description: 'Necesare pentru funcționarea platformei',
    granted: true,
    lastUpdated: '2025-01-01T00:00:00',
    category: 'essential',
  },
  {
    id: 'consent-2',
    purpose: 'Cookie-uri funcționale',
    description: 'Îmbunătățesc experiența utilizatorului',
    granted: true,
    lastUpdated: '2025-06-15T10:00:00',
    category: 'functional',
  },
  {
    id: 'consent-3',
    purpose: 'Cookie-uri analitice',
    description: 'Analiză trafic și comportament utilizatori',
    granted: true,
    lastUpdated: '2025-06-15T10:00:00',
    category: 'analytics',
  },
  {
    id: 'consent-4',
    purpose: 'Comunicări marketing',
    description: 'Newsletter și oferte personalizate',
    granted: false,
    lastUpdated: '2025-08-20T14:30:00',
    category: 'marketing',
  },
  {
    id: 'consent-5',
    purpose: 'Partajare date parteneri',
    description: 'Transmitere date către parteneri terți',
    granted: false,
    lastUpdated: '2025-06-15T10:00:00',
    category: 'marketing',
  },
];

const dataInventory: DataInventory[] = [
  {
    category: 'Date de identitate',
    dataTypes: ['Nume', 'Email', 'CUI/CIF', 'Adresă'],
    purpose: 'Gestionare cont și furnizare servicii',
    retention: 'Durata contului + 10 ani',
    legalBasis: 'Art. 6(1)(b) GDPR - Executare contract',
    recordCount: 1245,
  },
  {
    category: 'Date financiare',
    dataTypes: ['Facturi', 'Tranzacții', 'Calcule TVA', 'IBAN'],
    purpose: 'Servicii contabilitate și conformitate fiscală',
    retention: '10 ani (legislație fiscală RO)',
    legalBasis: 'Art. 6(1)(c) GDPR - Obligație legală',
    recordCount: 45678,
  },
  {
    category: 'Date HR',
    dataTypes: ['Dosare angajați', 'Salarii', 'Rețineri fiscale'],
    purpose: 'Gestionare HR și procesare salarizare',
    retention: 'Angajare + 50 ani (legislație muncii)',
    legalBasis: 'Art. 6(1)(c) GDPR - Obligație legală',
    recordCount: 3456,
  },
  {
    category: 'Date tehnice',
    dataTypes: ['Adrese IP', 'Timestamp login', 'User agent'],
    purpose: 'Securitate și administrare sistem',
    retention: '12 luni',
    legalBasis: 'Art. 6(1)(f) GDPR - Interes legitim',
    recordCount: 125890,
  },
  {
    category: 'Documente',
    dataTypes: ['Facturi încărcate', 'Contracte', 'Chitanțe'],
    purpose: 'Management documente și procesare OCR',
    retention: '10 ani (conformitate fiscală)',
    legalBasis: 'Art. 6(1)(b) GDPR - Executare contract',
    recordCount: 23456,
  },
];

const auditLogs: AuditLog[] = [
  {
    id: 'log-1',
    action: 'DATA_EXPORT',
    entity: 'User',
    userId: 'user-3',
    userName: 'Elena Dumitrescu',
    timestamp: '2025-12-08T16:00:00',
    ipAddress: '192.168.1.100',
    details: 'Export complet date personale - DSR-003',
  },
  {
    id: 'log-2',
    action: 'CONSENT_UPDATED',
    entity: 'Consent',
    userId: 'user-4',
    userName: 'Ion Georgescu',
    timestamp: '2025-12-07T14:30:00',
    ipAddress: '10.0.0.55',
    details: 'Consimțământ marketing revocat',
  },
  {
    id: 'log-3',
    action: 'DATA_ACCESS',
    entity: 'FinancialData',
    userId: 'user-1',
    userName: 'Maria Ionescu',
    timestamp: '2025-12-06T10:15:00',
    ipAddress: '192.168.1.101',
    details: 'Vizualizare rapoarte financiare',
  },
  {
    id: 'log-4',
    action: 'DATA_RECTIFICATION',
    entity: 'UserProfile',
    userId: 'user-4',
    userName: 'Ion Georgescu',
    timestamp: '2025-12-03T14:00:00',
    ipAddress: '10.0.0.55',
    details: 'Corectare adresă companie - DSR-004',
  },
  {
    id: 'log-5',
    action: 'LOGIN',
    entity: 'Session',
    userId: 'admin-1',
    userName: 'Admin DPO',
    timestamp: '2025-12-02T09:00:00',
    ipAddress: '192.168.1.1',
    details: 'Autentificare cu 2FA',
  },
];

// Chart data
const dsrTypeData = [
  { name: 'Acces date', value: 12, color: '#3B82F6' },
  { name: 'Ștergere', value: 8, color: '#EF4444' },
  { name: 'Portabilitate', value: 5, color: '#10B981' },
  { name: 'Rectificare', value: 15, color: '#F59E0B' },
  { name: 'Retragere consent', value: 3, color: '#8B5CF6' },
];

const dsrMonthlyData = [
  { month: 'Ian', pending: 5, completed: 3, rejected: 1 },
  { month: 'Feb', pending: 3, completed: 5, rejected: 0 },
  { month: 'Mar', pending: 4, completed: 6, rejected: 2 },
  { month: 'Apr', pending: 2, completed: 4, rejected: 1 },
  { month: 'Mai', pending: 6, completed: 5, rejected: 0 },
  { month: 'Iun', pending: 3, completed: 7, rejected: 1 },
];

export default function GdprPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dsrFilter, setDsrFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  const getDsrStatusBadge = (status: DsrRequest['status']) => {
    const statusConfig = {
      PENDING: { label: 'În așteptare', variant: 'outline' as const, icon: Clock },
      IN_PROGRESS: { label: 'În procesare', variant: 'default' as const, icon: RefreshCw },
      COMPLETED: { label: 'Finalizat', variant: 'default' as const, icon: CheckCircle },
      REJECTED: { label: 'Respins', variant: 'destructive' as const, icon: XCircle },
    };
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getDsrTypeBadge = (type: DsrRequest['type']) => {
    const typeConfig = {
      DATA_ACCESS: { label: 'Acces date', color: 'bg-blue-100 text-blue-800', icon: Eye },
      DATA_DELETION: { label: 'Ștergere', color: 'bg-red-100 text-red-800', icon: Trash2 },
      DATA_PORTABILITY: { label: 'Portabilitate', color: 'bg-green-100 text-green-800', icon: Download },
      DATA_RECTIFICATION: { label: 'Rectificare', color: 'bg-yellow-100 text-yellow-800', icon: FileCheck },
      WITHDRAW_CONSENT: { label: 'Retragere consent', color: 'bg-purple-100 text-purple-800', icon: XCircle },
    };
    const config = typeConfig[type];
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getConsentCategoryColor = (category: ConsentRecord['category']) => {
    const colors = {
      essential: 'bg-gray-100 text-gray-800',
      functional: 'bg-blue-100 text-blue-800',
      analytics: 'bg-green-100 text-green-800',
      marketing: 'bg-purple-100 text-purple-800',
    };
    return colors[category];
  };

  const filteredDsrRequests = dsrRequests.filter((dsr) => {
    const matchesSearch = dsr.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dsr.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dsr.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = dsrFilter === 'all' || dsr.status === dsrFilter;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const pendingDsrCount = dsrRequests.filter(d => d.status === 'PENDING').length;
  const inProgressDsrCount = dsrRequests.filter(d => d.status === 'IN_PROGRESS').length;
  const completedDsrCount = dsrRequests.filter(d => d.status === 'COMPLETED').length;
  const avgProcessingDays = 3.2;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GDPR & Protecția Datelor</h1>
          <p className="text-muted-foreground">
            Gestionare conformitate GDPR, cereri DSR și consimțământ utilizatori
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Raport conformitate
          </Button>
          <Button>
            <Shield className="mr-2 h-4 w-4" />
            Audit GDPR
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cereri DSR în așteptare</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDsrCount}</div>
            <p className="text-xs text-muted-foreground">
              Deadline: 30 zile conform GDPR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">În procesare</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressDsrCount}</div>
            <p className="text-xs text-muted-foreground">
              Timp mediu: {avgProcessingDays} zile
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Finalizate luna aceasta</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedDsrCount}</div>
            <p className="text-xs text-muted-foreground">
              +15% față de luna trecută
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scor conformitate</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <Progress value={94} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Prezentare</TabsTrigger>
          <TabsTrigger value="dsr">Cereri DSR</TabsTrigger>
          <TabsTrigger value="consent">Consimțământ</TabsTrigger>
          <TabsTrigger value="inventory">Inventar date</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* DSR by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Cereri DSR după tip</CardTitle>
                <CardDescription>Distribuția cererilor în ultimele 6 luni</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dsrTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {dsrTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly DSR Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Trend cereri DSR</CardTitle>
                <CardDescription>Evoluție lunară a cererilor</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dsrMonthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="pending" name="În așteptare" fill="#F59E0B" />
                    <Bar dataKey="completed" name="Finalizate" fill="#10B981" />
                    <Bar dataKey="rejected" name="Respinse" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acțiuni rapide GDPR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button variant="outline" className="h-24 flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  <span>Export date</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <Trash2 className="h-6 w-6 mb-2" />
                  <span>Cerere ștergere</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <Settings className="h-6 w-6 mb-2" />
                  <span>Setări consent</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  <span>Politică privacy</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DSR Requests Tab */}
        <TabsContent value="dsr" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Cereri DSR (Data Subject Requests)</CardTitle>
                  <CardDescription>Gestionare cereri conform Art. 15-22 GDPR</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Cerere nouă
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Caută după nume, email sau ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={dsrFilter} onValueChange={setDsrFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    <SelectItem value="PENDING">În așteptare</SelectItem>
                    <SelectItem value="IN_PROGRESS">În procesare</SelectItem>
                    <SelectItem value="COMPLETED">Finalizate</SelectItem>
                    <SelectItem value="REJECTED">Respinse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* DSR List */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {filteredDsrRequests.map((dsr) => (
                    <div key={dsr.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="rounded-full bg-muted p-2">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{dsr.userName}</span>
                              <span className="text-sm text-muted-foreground">({dsr.id})</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{dsr.userEmail}</p>
                            <p className="mt-2 text-sm">{dsr.reason}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {getDsrTypeBadge(dsr.type)}
                              {getDsrStatusBadge(dsr.status)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Creat: {new Date(dsr.createdAt).toLocaleDateString('ro-RO')}
                          </p>
                          <p className="text-sm font-medium text-orange-600">
                            Deadline: {new Date(dsr.deadline).toLocaleDateString('ro-RO')}
                          </p>
                          {dsr.processedAt && (
                            <p className="text-sm text-green-600">
                              Procesat: {new Date(dsr.processedAt).toLocaleDateString('ro-RO')}
                            </p>
                          )}
                          <div className="mt-2 flex gap-2 justify-end">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm">Procesează</Button>
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

        {/* Consent Tab */}
        <TabsContent value="consent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestionare consimțământ</CardTitle>
              <CardDescription>
                Setări consimțământ conform Art. 7 GDPR - consimțământ explicit și specific
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {consentRecords.map((consent) => (
                  <div key={consent.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-full p-2 ${consent.granted ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {consent.granted ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{consent.purpose}</span>
                          <Badge className={getConsentCategoryColor(consent.category)}>
                            {consent.category === 'essential' && 'Esențial'}
                            {consent.category === 'functional' && 'Funcțional'}
                            {consent.category === 'analytics' && 'Analiză'}
                            {consent.category === 'marketing' && 'Marketing'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{consent.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ultima actualizare: {new Date(consent.lastUpdated).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={consent.granted ? 'default' : 'secondary'}>
                        {consent.granted ? 'Acordat' : 'Revocat'}
                      </Badge>
                      {consent.category !== 'essential' && (
                        <Button variant="outline" size="sm">
                          {consent.granted ? 'Revocă' : 'Acordă'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Consent History */}
          <Card>
            <CardHeader>
              <CardTitle>Istoric consimțământ</CardTitle>
              <CardDescription>Jurnalizare modificări consimțământ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-4 py-2 text-sm">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">20.08.2025</span>
                  <span>Consimțământ marketing revocat</span>
                </div>
                <div className="flex items-center gap-4 py-2 text-sm">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">15.06.2025</span>
                  <span>Consimțământ inițial acordat pentru toate categoriile</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventar date personale</CardTitle>
              <CardDescription>
                Registru activități de prelucrare conform Art. 30 GDPR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataInventory.map((item, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{item.category}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.dataTypes.map((type, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">{item.recordCount.toLocaleString()} înregistrări</Badge>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Scop:</span>
                        <p>{item.purpose}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Retenție:</span>
                        <p>{item.retention}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bază legală:</span>
                        <p>{item.legalBasis}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audit trail</CardTitle>
                  <CardDescription>
                    Jurnal acces și modificări date - retenție 5 ani
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 rounded-lg border p-3">
                      <div className="rounded-full bg-muted p-2">
                        <Lock className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.action}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString('ro-RO')}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{log.details}</p>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                          <span>Utilizator: {log.userName}</span>
                          <span>IP: {log.ipAddress}</span>
                          <span>Entitate: {log.entity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
