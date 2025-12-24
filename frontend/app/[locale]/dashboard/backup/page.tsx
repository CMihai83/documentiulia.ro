'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  HardDrive,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Database,
  FileText,
  FolderArchive,
  Shield,
  Settings,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  History,
  Server,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// Types
interface Backup {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'completed' | 'running' | 'failed' | 'scheduled';
  size: string;
  createdAt: string;
  duration?: string;
  storage: 'local' | 'cloud' | 'both';
  retentionDays: number;
}

interface BackupJob {
  id: string;
  name: string;
  schedule: string;
  lastRun?: string;
  nextRun: string;
  status: 'active' | 'paused';
  type: 'full' | 'incremental';
}

// Sample data
const backups: Backup[] = [
  {
    id: 'bkp-001',
    name: 'Backup complet zilnic',
    type: 'full',
    status: 'completed',
    size: '2.4 GB',
    createdAt: '2025-12-14T02:00:00',
    duration: '15 min',
    storage: 'both',
    retentionDays: 30,
  },
  {
    id: 'bkp-002',
    name: 'Backup incremental',
    type: 'incremental',
    status: 'completed',
    size: '156 MB',
    createdAt: '2025-12-14T08:00:00',
    duration: '2 min',
    storage: 'cloud',
    retentionDays: 7,
  },
  {
    id: 'bkp-003',
    name: 'Backup incremental',
    type: 'incremental',
    status: 'running',
    size: '~120 MB',
    createdAt: '2025-12-14T12:00:00',
    storage: 'cloud',
    retentionDays: 7,
  },
  {
    id: 'bkp-004',
    name: 'Backup complet săptămânal',
    type: 'full',
    status: 'completed',
    size: '2.3 GB',
    createdAt: '2025-12-08T03:00:00',
    duration: '14 min',
    storage: 'both',
    retentionDays: 90,
  },
  {
    id: 'bkp-005',
    name: 'Backup incremental',
    type: 'incremental',
    status: 'failed',
    size: '-',
    createdAt: '2025-12-13T14:00:00',
    storage: 'cloud',
    retentionDays: 7,
  },
];

const backupJobs: BackupJob[] = [
  {
    id: 'job-001',
    name: 'Backup zilnic complet',
    schedule: 'Zilnic la 02:00',
    lastRun: '2025-12-14T02:00:00',
    nextRun: '2025-12-15T02:00:00',
    status: 'active',
    type: 'full',
  },
  {
    id: 'job-002',
    name: 'Backup incremental 4h',
    schedule: 'La fiecare 4 ore',
    lastRun: '2025-12-14T12:00:00',
    nextRun: '2025-12-14T16:00:00',
    status: 'active',
    type: 'incremental',
  },
  {
    id: 'job-003',
    name: 'Backup săptămânal',
    schedule: 'Duminică la 03:00',
    lastRun: '2025-12-08T03:00:00',
    nextRun: '2025-12-15T03:00:00',
    status: 'active',
    type: 'full',
  },
];

const storageTrend = [
  { date: 'Ian', size: 1.2 },
  { date: 'Feb', size: 1.4 },
  { date: 'Mar', size: 1.5 },
  { date: 'Apr', size: 1.7 },
  { date: 'Mai', size: 1.9 },
  { date: 'Iun', size: 2.0 },
  { date: 'Iul', size: 2.1 },
  { date: 'Aug', size: 2.2 },
  { date: 'Sep', size: 2.3 },
  { date: 'Oct', size: 2.3 },
  { date: 'Nov', size: 2.4 },
  { date: 'Dec', size: 2.5 },
];

const backupStats = [
  { name: 'Bază de date', size: 1.8, color: '#3B82F6' },
  { name: 'Documente', size: 0.5, color: '#10B981' },
  { name: 'Configurări', size: 0.1, color: '#F59E0B' },
  { name: 'Logs', size: 0.1, color: '#8B5CF6' },
];

export default function BackupPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const getBackupStatusBadge = (status: Backup['status']) => {
    const config = {
      completed: { label: 'Complet', variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' },
      running: { label: 'În curs', variant: 'secondary' as const, icon: RefreshCw, color: 'text-blue-500' },
      failed: { label: 'Eșuat', variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-500' },
      scheduled: { label: 'Programat', variant: 'outline' as const, icon: Clock, color: 'text-muted-foreground' },
    };
    const c = config[status];
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <c.icon className={`h-3 w-3 ${c.color} ${status === 'running' ? 'animate-spin' : ''}`} />
        {c.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: Backup['type']) => {
    const config = {
      full: { label: 'Complet', color: 'bg-blue-100 text-blue-800' },
      incremental: { label: 'Incremental', color: 'bg-green-100 text-green-800' },
      differential: { label: 'Diferențial', color: 'bg-purple-100 text-purple-800' },
    };
    return <Badge className={config[type].color}>{config[type].label}</Badge>;
  };

  const totalBackupSize = 2.5;
  const cloudUsed = 8.5;
  const cloudLimit = 50;
  const lastBackup = new Date('2025-12-14T12:00:00');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup & Restore</h1>
          <p className="text-muted-foreground">
            Gestionare backup-uri și recuperare date
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Restaurare
          </Button>
          <Button>
            <Play className="mr-2 h-4 w-4" />
            Backup acum
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ultimul backup</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">Acum 2 ore</div>
            <p className="text-xs text-muted-foreground">
              {lastBackup.toLocaleString('ro-RO')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dimensiune date</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBackupSize} GB</div>
            <p className="text-xs text-muted-foreground">date de backup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stocare cloud</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cloudUsed} GB</div>
            <Progress value={(cloudUsed / cloudLimit) * 100} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">din {cloudLimit} GB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Backup-uri reținute</CardTitle>
            <FolderArchive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">ultimele 90 zile</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Prezentare</TabsTrigger>
          <TabsTrigger value="history">Istoric</TabsTrigger>
          <TabsTrigger value="jobs">Joburi</TabsTrigger>
          <TabsTrigger value="settings">Setări</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Evoluție stocare</CardTitle>
                <CardDescription>Creștere date în ultimele 12 luni</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={storageTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} GB`} />
                    <Area type="monotone" dataKey="size" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuție date</CardTitle>
                <CardDescription>Ce ocupă spațiu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {backupStats.map((stat) => (
                    <div key={stat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{stat.name}</span>
                        <span className="text-sm text-muted-foreground">{stat.size} GB</span>
                      </div>
                      <Progress value={(stat.size / totalBackupSize) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Backups */}
          <Card>
            <CardHeader>
              <CardTitle>Backup-uri recente</CardTitle>
              <CardDescription>Ultimele 5 backup-uri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {backups.slice(0, 5).map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-full p-2 ${
                        backup.status === 'completed' ? 'bg-green-100' :
                        backup.status === 'running' ? 'bg-blue-100' : 'bg-red-100'
                      }`}>
                        <HardDrive className={`h-5 w-5 ${
                          backup.status === 'completed' ? 'text-green-600' :
                          backup.status === 'running' ? 'text-blue-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{backup.name}</span>
                          {getTypeBadge(backup.type)}
                          {getBackupStatusBadge(backup.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(backup.createdAt).toLocaleString('ro-RO')}
                          {backup.duration && ` • Durată: ${backup.duration}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{backup.size}</p>
                        <p className="text-xs text-muted-foreground">
                          {backup.storage === 'both' ? 'Local + Cloud' :
                           backup.storage === 'cloud' ? 'Cloud' : 'Local'}
                        </p>
                      </div>
                      {backup.status === 'completed' && (
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Istoric complet</CardTitle>
                  <CardDescription>Toate backup-urile</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Curățare vechi
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className={`rounded-full p-2 ${
                          backup.status === 'completed' ? 'bg-green-100' :
                          backup.status === 'running' ? 'bg-blue-100' : 'bg-red-100'
                        }`}>
                          <HardDrive className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{backup.name}</span>
                            {getTypeBadge(backup.type)}
                            {getBackupStatusBadge(backup.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(backup.createdAt).toLocaleString('ro-RO')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{backup.size}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Joburi programate</CardTitle>
                  <CardDescription>Backup-uri automate</CardDescription>
                </div>
                <Button>
                  <Calendar className="mr-2 h-4 w-4" />
                  Job nou
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backupJobs.map((job) => (
                  <div key={job.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-lg">{job.name}</span>
                          <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                            {job.status === 'active' ? 'Activ' : 'Pauză'}
                          </Badge>
                          <Badge variant="outline">{job.type === 'full' ? 'Complet' : 'Incremental'}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {job.schedule}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {job.lastRun && (
                            <span>Ultima rulare: {new Date(job.lastRun).toLocaleString('ro-RO')}</span>
                          )}
                          <span>Următoarea: {new Date(job.nextRun).toLocaleString('ro-RO')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Rulează acum
                        </Button>
                        <Button variant="outline" size="sm">
                          {job.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
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
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stocare backup</CardTitle>
                <CardDescription>Configurare destinații backup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Stocare locală</p>
                      <p className="text-sm text-muted-foreground">/var/backups</p>
                    </div>
                  </div>
                  <Badge>Activat</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Cloud className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">AWS S3</p>
                      <p className="text-sm text-muted-foreground">s3://documentiulia-backups</p>
                    </div>
                  </div>
                  <Badge>Activat</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Adaugă destinație
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Politică retenție</CardTitle>
                <CardDescription>Cât timp păstrăm backup-urile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Backup-uri zilnice</p>
                    <p className="text-sm text-muted-foreground">Păstrare 30 zile</p>
                  </div>
                  <Button variant="outline" size="sm">Editează</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Backup-uri săptămânale</p>
                    <p className="text-sm text-muted-foreground">Păstrare 90 zile</p>
                  </div>
                  <Button variant="outline" size="sm">Editează</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Backup-uri lunare</p>
                    <p className="text-sm text-muted-foreground">Păstrare 1 an</p>
                  </div>
                  <Button variant="outline" size="sm">Editează</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Notificări</CardTitle>
                <CardDescription>Alerte pentru evenimente backup</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <span>Backup complet cu succes</span>
                    <Badge variant="secondary">Email</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Backup eșuat</span>
                    <Badge>Email + Slack</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Stocare aproape plină (80%)</span>
                    <Badge>Email</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Restaurare efectuată</span>
                    <Badge>Email + Slack</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
