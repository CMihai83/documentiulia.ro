'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  Building,
  Mail,
  Phone,
  FileText,
  Download,
  Send,
  Eye,
  Search,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Calendar,
  MessageSquare,
  Link2,
  Settings,
  ExternalLink,
  Copy,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Types
interface PortalClient {
  id: string;
  name: string;
  email: string;
  company: string;
  cui: string;
  phone: string;
  portalEnabled: boolean;
  lastAccess?: string;
  documentsShared: number;
  invoicesPending: number;
  totalInvoiced: number;
  portalUrl: string;
}

interface SharedDocument {
  id: string;
  name: string;
  type: string;
  sharedAt: string;
  viewedAt?: string;
  downloadedAt?: string;
  clientName: string;
  status: 'pending' | 'viewed' | 'downloaded' | 'signed';
}

// Sample data
const portalClients: PortalClient[] = [
  {
    id: 'client-001',
    name: 'Maria Ionescu',
    email: 'maria@techcorp.ro',
    company: 'TechCorp SRL',
    cui: 'RO12345678',
    phone: '+40 722 123 456',
    portalEnabled: true,
    lastAccess: '2025-12-14T09:30:00',
    documentsShared: 45,
    invoicesPending: 2,
    totalInvoiced: 125000,
    portalUrl: 'https://portal.documentiulia.ro/c/techcorp',
  },
  {
    id: 'client-002',
    name: 'Andrei Popescu',
    email: 'andrei@globalsoft.ro',
    company: 'GlobalSoft SA',
    cui: 'RO23456789',
    phone: '+40 733 234 567',
    portalEnabled: true,
    lastAccess: '2025-12-13T16:45:00',
    documentsShared: 32,
    invoicesPending: 0,
    totalInvoiced: 89000,
    portalUrl: 'https://portal.documentiulia.ro/c/globalsoft',
  },
  {
    id: 'client-003',
    name: 'Elena Gheorghe',
    email: 'elena@startupx.ro',
    company: 'StartupX SRL',
    cui: 'RO34567890',
    phone: '+40 744 345 678',
    portalEnabled: true,
    lastAccess: '2025-12-10T11:20:00',
    documentsShared: 18,
    invoicesPending: 3,
    totalInvoiced: 45000,
    portalUrl: 'https://portal.documentiulia.ro/c/startupx',
  },
  {
    id: 'client-004',
    name: 'Ion Dumitrescu',
    email: 'ion@consulting.ro',
    company: 'Consulting Pro SRL',
    cui: 'RO45678901',
    phone: '+40 755 456 789',
    portalEnabled: false,
    documentsShared: 0,
    invoicesPending: 1,
    totalInvoiced: 28000,
    portalUrl: 'https://portal.documentiulia.ro/c/consultingpro',
  },
];

const sharedDocuments: SharedDocument[] = [
  {
    id: 'doc-001',
    name: 'Factură PRO-2025-0892',
    type: 'Factură',
    sharedAt: '2025-12-14T10:00:00',
    viewedAt: '2025-12-14T10:15:00',
    clientName: 'TechCorp SRL',
    status: 'viewed',
  },
  {
    id: 'doc-002',
    name: 'Contract servicii 2025',
    type: 'Contract',
    sharedAt: '2025-12-13T14:30:00',
    viewedAt: '2025-12-13T15:00:00',
    downloadedAt: '2025-12-13T15:02:00',
    clientName: 'GlobalSoft SA',
    status: 'downloaded',
  },
  {
    id: 'doc-003',
    name: 'Factură PRO-2025-0891',
    type: 'Factură',
    sharedAt: '2025-12-12T09:00:00',
    clientName: 'StartupX SRL',
    status: 'pending',
  },
  {
    id: 'doc-004',
    name: 'Raport lunar noiembrie',
    type: 'Raport',
    sharedAt: '2025-12-10T16:00:00',
    viewedAt: '2025-12-11T09:30:00',
    clientName: 'TechCorp SRL',
    status: 'viewed',
  },
];

const activityData = [
  { day: 'Lun', views: 12, downloads: 5 },
  { day: 'Mar', views: 18, downloads: 8 },
  { day: 'Mie', views: 15, downloads: 6 },
  { day: 'Joi', views: 22, downloads: 10 },
  { day: 'Vin', views: 28, downloads: 12 },
  { day: 'Sâm', views: 8, downloads: 3 },
  { day: 'Dum', views: 5, downloads: 2 },
];

const documentTypeData = [
  { name: 'Facturi', value: 45, color: '#3B82F6' },
  { name: 'Contracte', value: 20, color: '#10B981' },
  { name: 'Rapoarte', value: 25, color: '#F59E0B' },
  { name: 'Altele', value: 10, color: '#8B5CF6' },
];

export default function ClientPortalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('clients');

  const getDocumentStatusBadge = (status: SharedDocument['status']) => {
    const config = {
      pending: { label: 'Nevăzut', variant: 'outline' as const, icon: Clock },
      viewed: { label: 'Văzut', variant: 'secondary' as const, icon: Eye },
      downloaded: { label: 'Descărcat', variant: 'default' as const, icon: Download },
      signed: { label: 'Semnat', variant: 'default' as const, icon: CheckCircle },
    };
    const c = config[status];
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <c.icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  const filteredClients = portalClients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activePortals = portalClients.filter((c) => c.portalEnabled).length;
  const totalDocuments = portalClients.reduce((sum, c) => sum + c.documentsShared, 0);
  const pendingInvoices = portalClients.reduce((sum, c) => sum + c.invoicesPending, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portal Clienți</h1>
          <p className="text-muted-foreground">
            Acces securizat pentru clienții dvs. la documente și facturi
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Configurare portal
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Invită client
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Portaluri active</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePortals}</div>
            <p className="text-xs text-muted-foreground">din {portalClients.length} clienți</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Documente partajate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground">total partajate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Facturi în așteptare</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">neplătite</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Accesări azi</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">vizualizări documente</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clients">Clienți</TabsTrigger>
          <TabsTrigger value="documents">Documente</TabsTrigger>
          <TabsTrigger value="activity">Activitate</TabsTrigger>
          <TabsTrigger value="settings">Setări</TabsTrigger>
        </TabsList>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Clienți cu acces portal</CardTitle>
                  <CardDescription>Gestionare acces și documente partajate</CardDescription>
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Caută clienți..."
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
                  {filteredClients.map((client) => (
                    <div key={client.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>{client.company.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-lg">{client.company}</span>
                              <Badge variant={client.portalEnabled ? 'default' : 'secondary'}>
                                {client.portalEnabled ? 'Portal activ' : 'Portal inactiv'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{client.name}</p>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {client.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {client.cui}
                              </span>
                            </div>
                            {client.portalEnabled && client.lastAccess && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Ultima accesare: {new Date(client.lastAccess).toLocaleString('ro-RO')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Documente partajate</p>
                          <p className="text-xl font-bold">{client.documentsShared}</p>
                          {client.invoicesPending > 0 && (
                            <Badge variant="destructive" className="mt-1">
                              {client.invoicesPending} facturi neplătite
                            </Badge>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm">
                              <Send className="h-4 w-4 mr-1" />
                              Partajează
                            </Button>
                            <Button variant="outline" size="sm">
                              <Copy className="h-4 w-4 mr-1" />
                              Link
                            </Button>
                            <Button size="sm">
                              <ExternalLink className="h-4 w-4" />
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

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documente partajate recent</CardTitle>
              <CardDescription>Urmărire vizualizări și descărcări</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {sharedDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-muted p-2">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{doc.clientName}</span>
                            <span>Partajat: {new Date(doc.sharedAt).toLocaleDateString('ro-RO')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getDocumentStatusBadge(doc.status)}
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Activitate portal</CardTitle>
                <CardDescription>Vizualizări și descărcări ultimele 7 zile</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="views" name="Vizualizări" fill="#3B82F6" />
                    <Bar dataKey="downloads" name="Descărcări" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipuri documente</CardTitle>
                <CardDescription>Distribuție după tip</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={documentTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {documentTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurare portal</CardTitle>
              <CardDescription>Personalizare aspect și funcționalități</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Branding personalizat</p>
                  <p className="text-sm text-muted-foreground">Logo și culori companie</p>
                </div>
                <Button variant="outline">Configurează</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notificări email</p>
                  <p className="text-sm text-muted-foreground">Alertă când clientul accesează documente</p>
                </div>
                <Button variant="outline">Configurează</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Semnătură electronică</p>
                  <p className="text-sm text-muted-foreground">Permite clienților să semneze documente</p>
                </div>
                <Badge>Activat</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Domeniu personalizat</p>
                  <p className="text-sm text-muted-foreground">portal.compania-ta.ro</p>
                </div>
                <Button variant="outline">Configurează</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
