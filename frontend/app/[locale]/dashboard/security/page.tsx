'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Shield,
  Lock,
  Key,
  Smartphone,
  Monitor,
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  RefreshCw,
  LogOut,
  Settings,
  UserCheck,
  History,
  MapPin,
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  Activity,
} from 'lucide-react';

// Types
interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'password_change' | 'mfa_enabled' | 'failed_login' | 'api_key_created';
  description: string;
  timestamp: string;
  ip: string;
  location: string;
  status: 'success' | 'warning' | 'danger';
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed?: string;
  scopes: string[];
}

// Sample data
const sessions: Session[] = [
  {
    id: 'sess-001',
    device: 'Windows PC',
    browser: 'Chrome 120',
    location: 'București, România',
    ip: '192.168.1.100',
    lastActive: '2025-12-14T11:30:00',
    current: true,
  },
  {
    id: 'sess-002',
    device: 'iPhone 15',
    browser: 'Safari Mobile',
    location: 'București, România',
    ip: '86.123.45.67',
    lastActive: '2025-12-14T09:15:00',
    current: false,
  },
  {
    id: 'sess-003',
    device: 'MacBook Pro',
    browser: 'Firefox 121',
    location: 'Cluj-Napoca, România',
    ip: '89.234.56.78',
    lastActive: '2025-12-13T18:45:00',
    current: false,
  },
];

const securityEvents: SecurityEvent[] = [
  {
    id: 'evt-001',
    type: 'login',
    description: 'Autentificare reușită',
    timestamp: '2025-12-14T11:30:00',
    ip: '192.168.1.100',
    location: 'București, România',
    status: 'success',
  },
  {
    id: 'evt-002',
    type: 'mfa_enabled',
    description: 'Autentificare 2FA activată',
    timestamp: '2025-12-13T14:20:00',
    ip: '192.168.1.100',
    location: 'București, România',
    status: 'success',
  },
  {
    id: 'evt-003',
    type: 'failed_login',
    description: 'Încercare autentificare eșuată (parolă greșită)',
    timestamp: '2025-12-12T22:15:00',
    ip: '45.67.89.123',
    location: 'Moscova, Rusia',
    status: 'danger',
  },
  {
    id: 'evt-004',
    type: 'password_change',
    description: 'Parolă schimbată',
    timestamp: '2025-12-10T10:00:00',
    ip: '192.168.1.100',
    location: 'București, România',
    status: 'success',
  },
  {
    id: 'evt-005',
    type: 'api_key_created',
    description: 'Cheie API creată: Production API',
    timestamp: '2025-12-08T16:30:00',
    ip: '192.168.1.100',
    location: 'București, România',
    status: 'warning',
  },
];

const apiKeys: ApiKey[] = [
  {
    id: 'key-001',
    name: 'Production API',
    prefix: 'dk_live_abc1',
    createdAt: '2025-12-08',
    lastUsed: '2025-12-14T10:45:00',
    scopes: ['invoices:read', 'invoices:write', 'clients:read'],
  },
  {
    id: 'key-002',
    name: 'Development',
    prefix: 'dk_test_xyz9',
    createdAt: '2025-11-15',
    lastUsed: '2025-12-12T14:30:00',
    scopes: ['invoices:read', 'clients:read'],
  },
  {
    id: 'key-003',
    name: 'Webhook Integration',
    prefix: 'dk_live_def2',
    createdAt: '2025-10-20',
    scopes: ['webhooks:read', 'webhooks:write'],
  },
];

const securitySettings = [
  { id: 'mfa', name: 'Autentificare 2FA', description: 'Verificare suplimentară la autentificare', enabled: true },
  { id: 'session_timeout', name: 'Timeout sesiune', description: 'Deconectare automată după 30 minute inactivitate', enabled: true },
  { id: 'ip_whitelist', name: 'Whitelist IP', description: 'Restricționare acces doar la IP-uri specificate', enabled: false },
  { id: 'login_alerts', name: 'Alerte autentificare', description: 'Notificare email la fiecare autentificare', enabled: true },
  { id: 'api_rate_limit', name: 'Rate limiting API', description: 'Limitare cereri API: 1000/oră', enabled: true },
];

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  const getEventIcon = (type: SecurityEvent['type']) => {
    const icons = {
      login: CheckCircle,
      logout: LogOut,
      password_change: Key,
      mfa_enabled: Smartphone,
      failed_login: AlertTriangle,
      api_key_created: Key,
    };
    return icons[type];
  };

  const getEventStatusColor = (status: SecurityEvent['status']) => {
    const colors = {
      success: 'bg-green-100 text-green-600',
      warning: 'bg-yellow-100 text-yellow-600',
      danger: 'bg-red-100 text-red-600',
    };
    return colors[status];
  };

  const securityScore = 85;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Securitate</h1>
          <p className="text-muted-foreground">
            Gestionare securitate cont și acces
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" />
            Jurnal activitate
          </Button>
          <Button>
            <Shield className="mr-2 h-4 w-4" />
            Verificare securitate
          </Button>
        </div>
      </div>

      {/* Security Score */}
      <Card className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-background border-green-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-4">
                <ShieldCheck className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Scor securitate: {securityScore}%</h2>
                <p className="text-muted-foreground">Contul tău este bine protejat</p>
              </div>
            </div>
            <div className="w-48">
              <Progress value={securityScore} className="h-3" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>Slab</span>
                <span>Excelent</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Prezentare</TabsTrigger>
          <TabsTrigger value="sessions">Sesiuni</TabsTrigger>
          <TabsTrigger value="activity">Activitate</TabsTrigger>
          <TabsTrigger value="api">Chei API</TabsTrigger>
          <TabsTrigger value="settings">Setări</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">2FA Status</CardTitle>
                <Smartphone className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600">Activat</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Aplicație Authenticator</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Sesiuni active</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sessions.length}</div>
                <p className="text-xs text-muted-foreground">dispozitive conectate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ultima autentificare</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">Acum 30 min</div>
                <p className="text-xs text-muted-foreground">București, România</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Încercări eșuate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">1</div>
                <p className="text-xs text-muted-foreground">ultimele 30 zile</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recomandări securitate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Autentificare 2FA activată</p>
                      <p className="text-sm text-muted-foreground">Contul este protejat cu verificare în doi pași</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Parolă puternică</p>
                      <p className="text-sm text-muted-foreground">Parola îndeplinește cerințele de securitate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Whitelist IP dezactivat</p>
                      <p className="text-sm text-muted-foreground">Recomandăm restricționarea accesului pe IP</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">Activează</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activitate recentă</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {securityEvents.slice(0, 4).map((event) => {
                    const Icon = getEventIcon(event.type);
                    return (
                      <div key={event.id} className="flex items-center gap-3">
                        <div className={`rounded-full p-2 ${getEventStatusColor(event.status)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{event.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString('ro-RO')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sesiuni active</CardTitle>
                  <CardDescription>Dispozitive conectate la cont</CardDescription>
                </div>
                <Button variant="destructive" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Deconectează toate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-full p-3 ${session.current ? 'bg-green-100' : 'bg-muted'}`}>
                        <Monitor className={`h-5 w-5 ${session.current ? 'text-green-600' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{session.device}</p>
                          {session.current && <Badge>Sesiune curentă</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{session.browser}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {session.ip}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Ultima activitate: {new Date(session.lastActive).toLocaleString('ro-RO')}
                      </p>
                      {!session.current && (
                        <Button variant="outline" size="sm" className="mt-2">
                          <LogOut className="h-4 w-4 mr-1" />
                          Deconectează
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Jurnal securitate</CardTitle>
              <CardDescription>Istoric evenimente de securitate</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {securityEvents.map((event) => {
                    const Icon = getEventIcon(event.type);
                    return (
                      <div key={event.id} className="flex items-start gap-4 rounded-lg border p-4">
                        <div className={`rounded-full p-2 ${getEventStatusColor(event.status)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{event.description}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{new Date(event.timestamp).toLocaleString('ro-RO')}</span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {event.ip}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Chei API</CardTitle>
                  <CardDescription>Gestionare acces programatic</CardDescription>
                </div>
                <Button>
                  <Key className="mr-2 h-4 w-4" />
                  Cheie nouă
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div key={key.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{key.name}</span>
                        </div>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {key.prefix}••••••••••••
                        </code>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {key.scopes.map((scope) => (
                            <Badge key={scope} variant="secondary" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Creat: {key.createdAt}
                          {key.lastUsed && ` • Ultima utilizare: ${new Date(key.lastUsed).toLocaleDateString('ro-RO')}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm">
                          Revocă
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Setări securitate</CardTitle>
              <CardDescription>Configurare protecție cont</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {securitySettings.map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{setting.name}</p>
                      <p className="text-sm text-muted-foreground">{setting.description}</p>
                    </div>
                    <Switch checked={setting.enabled} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schimbare parolă</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="text-sm font-medium">Parola curentă</label>
                  <input type="password" className="w-full mt-1 px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="text-sm font-medium">Parola nouă</label>
                  <input type="password" className="w-full mt-1 px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="text-sm font-medium">Confirmă parola</label>
                  <input type="password" className="w-full mt-1 px-3 py-2 border rounded-md" />
                </div>
                <Button>Schimbă parola</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
