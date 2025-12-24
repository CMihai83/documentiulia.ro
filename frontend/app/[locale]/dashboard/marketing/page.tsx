'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail,
  Send,
  Users,
  Target,
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle,
  Eye,
  MousePointer,
  Plus,
  Search,
  Play,
  Pause,
  FileText,
  Megaphone,
  PieChart,
  ArrowUpRight,
  Sparkles,
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
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

// Types
interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'newsletter' | 'automation' | 'sms';
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  audience: number;
  sent?: number;
  opened?: number;
  clicked?: number;
  scheduledAt?: string;
  completedAt?: string;
}

interface Audience {
  id: string;
  name: string;
  count: number;
  tags: string[];
  lastUpdated: string;
}

// Sample data
const campaigns: Campaign[] = [
  {
    id: 'camp-001',
    name: 'Newsletter Decembrie 2025',
    type: 'newsletter',
    status: 'completed',
    audience: 2450,
    sent: 2450,
    opened: 1225,
    clicked: 367,
    completedAt: '2025-12-10T10:00:00',
  },
  {
    id: 'camp-002',
    name: 'Promoție Sfârșit de An',
    type: 'email',
    status: 'running',
    audience: 1850,
    sent: 1200,
    opened: 540,
    clicked: 162,
    scheduledAt: '2025-12-14T09:00:00',
  },
  {
    id: 'camp-003',
    name: 'Reminder Facturi Restante',
    type: 'automation',
    status: 'running',
    audience: 125,
    sent: 45,
    opened: 38,
    clicked: 22,
  },
  {
    id: 'camp-004',
    name: 'Anul Nou 2026 - Early Bird',
    type: 'email',
    status: 'scheduled',
    audience: 3200,
    scheduledAt: '2025-12-28T08:00:00',
  },
  {
    id: 'camp-005',
    name: 'Feedback Clienți Q4',
    type: 'email',
    status: 'draft',
    audience: 500,
  },
];

const audiences: Audience[] = [
  { id: 'aud-001', name: 'Toți abonații', count: 3250, tags: ['activi', 'newsletter'], lastUpdated: '2025-12-14' },
  { id: 'aud-002', name: 'Clienți Premium', count: 450, tags: ['premium', 'business'], lastUpdated: '2025-12-13' },
  { id: 'aud-003', name: 'Prospecți', count: 890, tags: ['leads', 'nurturing'], lastUpdated: '2025-12-12' },
  { id: 'aud-004', name: 'Inactivi 90+ zile', count: 320, tags: ['inactivi', 'reactivare'], lastUpdated: '2025-12-10' },
];

const emailPerformance = [
  { month: 'Iul', sent: 2100, opened: 1050, clicked: 315 },
  { month: 'Aug', sent: 2300, opened: 1150, clicked: 345 },
  { month: 'Sep', sent: 2450, opened: 1225, clicked: 367 },
  { month: 'Oct', sent: 2600, opened: 1430, clicked: 416 },
  { month: 'Nov', sent: 2800, opened: 1540, clicked: 462 },
  { month: 'Dec', sent: 3050, opened: 1678, clicked: 503 },
];

const audienceGrowth = [
  { week: 'S1', subscribers: 2850 },
  { week: 'S2', subscribers: 2920 },
  { week: 'S3', subscribers: 3050 },
  { week: 'S4', subscribers: 3180 },
  { week: 'S5', subscribers: 3250 },
];

const campaignTypeData = [
  { name: 'Newsletter', value: 40, color: '#3B82F6' },
  { name: 'Promoții', value: 30, color: '#10B981' },
  { name: 'Automatizări', value: 20, color: '#F59E0B' },
  { name: 'Transacționale', value: 10, color: '#8B5CF6' },
];

export default function MarketingPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [searchTerm, setSearchTerm] = useState('');

  const getCampaignStatusBadge = (status: Campaign['status']) => {
    const config = {
      draft: { label: 'Ciornă', variant: 'outline' as const, icon: FileText },
      scheduled: { label: 'Programat', variant: 'secondary' as const, icon: Calendar },
      running: { label: 'În curs', variant: 'default' as const, icon: Play },
      completed: { label: 'Finalizat', variant: 'default' as const, icon: CheckCircle },
      paused: { label: 'Pauză', variant: 'secondary' as const, icon: Pause },
    };
    const c = config[status];
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <c.icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  const getCampaignTypeBadge = (type: Campaign['type']) => {
    const config = {
      email: { label: 'Email', color: 'bg-blue-100 text-blue-800' },
      newsletter: { label: 'Newsletter', color: 'bg-green-100 text-green-800' },
      automation: { label: 'Automatizare', color: 'bg-purple-100 text-purple-800' },
      sms: { label: 'SMS', color: 'bg-orange-100 text-orange-800' },
    };
    return <Badge className={config[type].color}>{config[type].label}</Badge>;
  };

  // Stats
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened || 0), 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
  const totalSubscribers = audiences[0]?.count || 0;

  // Action handlers
  const handleAIContent = () => {
    // Navigate to AI content generator page
    router.push('/dashboard/marketing/ai-content');
  };

  const handleNewCampaign = () => {
    router.push('/dashboard/marketing/campaigns/new');
  };

  const handleViewCampaign = (campaign: Campaign) => {
    router.push(`/dashboard/marketing/campaigns/${campaign.id}`);
  };

  const handleSendCampaign = (campaign: Campaign) => {
    // Navigate to send confirmation page
    router.push(`/dashboard/marketing/campaigns/${campaign.id}/send`);
  };

  const handleNewSegment = () => {
    // Navigate to new segment creation page
    router.push('/dashboard/marketing/audiences/segments/new');
  };

  const handleEditAudience = (audience: Audience) => {
    router.push(`/dashboard/marketing/audiences/${audience.id}/edit`);
  };

  const handleCreateCampaignForAudience = (audience: Audience) => {
    router.push(`/dashboard/marketing/campaigns/new?audience=${audience.id}`);
  };

  // Campaign CRUD handlers
  const handleEditCampaign = (campaign: Campaign) => {
    router.push(`/dashboard/marketing/campaigns/${campaign.id}/edit`);
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    // Navigate to delete confirmation page
    router.push(`/dashboard/marketing/campaigns/${campaign.id}/delete`);
  };

  const handleDuplicateCampaign = (campaign: Campaign) => {
    // Navigate to duplicate page
    router.push(`/dashboard/marketing/campaigns/${campaign.id}/duplicate`);
  };

  const handlePauseCampaign = async (campaign: Campaign) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/marketing/campaigns/${campaign.id}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Campanie în pauză', `"${campaign.name}" a fost pusă în pauză.`);
      } else {
        toast.success('Campanie în pauză (Demo)', `"${campaign.name}" - funcționalitate în dezvoltare`);
      }
    } catch (err) {
      toast.success('Campanie în pauză (Demo)', `"${campaign.name}" - funcționalitate în dezvoltare`);
    }
  };

  const handleResumeCampaign = async (campaign: Campaign) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/marketing/campaigns/${campaign.id}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Campanie reluată', `"${campaign.name}" a fost reluată.`);
      } else {
        toast.success('Campanie reluată (Demo)', `"${campaign.name}" - funcționalitate în dezvoltare`);
      }
    } catch (err) {
      toast.success('Campanie reluată (Demo)', `"${campaign.name}" - funcționalitate în dezvoltare`);
    }
  };

  const handleScheduleCampaign = (campaign: Campaign) => {
    // Navigate to schedule page
    router.push(`/dashboard/marketing/campaigns/${campaign.id}/schedule`);
  };

  // A/B Testing handlers
  const handleCreateABTest = () => {
    router.push('/dashboard/marketing/ab-test/new');
  };

  const handleViewABTestResults = (campaignId: string) => {
    router.push(`/dashboard/marketing/campaigns/${campaignId}/ab-results`);
  };

  // Export and analytics handlers
  const handleExportCampaigns = async () => {
    toast.success('Export inițiat', 'Se generează raportul cu toate campaniile...');
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/marketing/campaigns/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'campaigns_report.xlsx';
        a.click();
        toast.success('Export finalizat', 'campaigns_report.xlsx');
      } else {
        toast.success('Export (Demo)', 'Funcționalitate în dezvoltare');
      }
    } catch (err) {
      toast.success('Export (Demo)', 'Funcționalitate în dezvoltare');
    }
  };

  const handleExportAudienceReport = async () => {
    toast.success('Export inițiat', 'Se generează raportul cu statistici audiențe...');
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/marketing/audiences/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audiences_report.xlsx';
        a.click();
        toast.success('Export finalizat', 'audiences_report.xlsx');
      } else {
        toast.success('Export (Demo)', 'Funcționalitate în dezvoltare');
      }
    } catch (err) {
      toast.success('Export (Demo)', 'Funcționalitate în dezvoltare');
    }
  };

  const handleViewDetailedAnalytics = () => {
    router.push('/dashboard/marketing/analytics');
  };

  const handleViewCampaignStats = (campaign: Campaign) => {
    router.push(`/dashboard/marketing/campaigns/${campaign.id}/stats`);
  };

  // Audience management handlers
  const handleDeleteAudience = (audience: Audience) => {
    if (audience.name === 'Toți abonații') {
      toast.error('Operație interzisă', 'Nu puteți șterge lista principală de abonați.');
      return;
    }
    // Navigate to delete confirmation page
    router.push(`/dashboard/marketing/audiences/${audience.id}/delete`);
  };

  const handleExportAudience = async (audience: Audience) => {
    toast.success('Export inițiat', `${audience.count.toLocaleString()} contacte vor fi exportate.`);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/marketing/audiences/${audience.id}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${audience.name.replace(/\s+/g, '_')}.csv`;
        a.click();
        toast.success('Export finalizat', `${audience.name}.csv`);
      } else {
        toast.success('Export (Demo)', 'Funcționalitate în dezvoltare');
      }
    } catch (err) {
      toast.success('Export (Demo)', 'Funcționalitate în dezvoltare');
    }
  };

  const handleImportContacts = () => {
    // Navigate to import page
    router.push('/dashboard/marketing/audiences/import');
  };

  const handleSyncWithCRM = async () => {
    toast.success('Sincronizare inițiată', 'Veți primi o notificare la finalizare.');
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/marketing/sync-crm', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Sincronizare completă', 'Contactele au fost actualizate din CRM.');
      } else {
        toast.success('Sincronizare (Demo)', 'Funcționalitate în dezvoltare');
      }
    } catch (err) {
      toast.success('Sincronizare (Demo)', 'Funcționalitate în dezvoltare');
    }
  };

  // Automation handlers
  const handleCreateAutomation = () => {
    router.push('/dashboard/marketing/automation/new');
  };

  const handleEditAutomation = (automationId: string) => {
    router.push(`/dashboard/marketing/automation/${automationId}/edit`);
  };

  const handleToggleAutomation = async (automationName: string, currentlyActive: boolean) => {
    const action = currentlyActive ? 'dezactivată' : 'activată';
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/marketing/automation/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: automationName, active: !currentlyActive }),
      });
      if (response.ok) {
        toast.success('Automatizare actualizată', `"${automationName}" a fost ${action}.`);
      } else {
        toast.success('Automatizare (Demo)', `"${automationName}" - funcționalitate în dezvoltare`);
      }
    } catch (err) {
      toast.success('Automatizare (Demo)', `"${automationName}" - funcționalitate în dezvoltare`);
    }
  };

  const handleViewAutomationStats = (automationId: string) => {
    router.push(`/dashboard/marketing/automation/${automationId}/stats`);
  };

  // Email template handlers
  const handleManageTemplates = () => {
    router.push('/dashboard/marketing/templates');
  };

  const handleCreateTemplate = () => {
    router.push('/dashboard/marketing/templates/new');
  };

  // Stats card click handlers
  const handleSubscribersClick = () => {
    setActiveTab('audiences');
  };

  const handleEmailsSentClick = () => {
    setActiveTab('analytics');
  };

  const handleOpenRateClick = () => {
    setActiveTab('analytics');
    // Show detailed analytics - tab switch provides the visualization
  };

  const handleClickRateClick = () => {
    setActiveTab('analytics');
    // Show detailed analytics - tab switch provides the visualization
  };

  // Unsubscribe management
  const handleViewUnsubscribes = () => {
    router.push('/dashboard/marketing/unsubscribes');
  };

  const handleManagePreferences = () => {
    router.push('/dashboard/marketing/preferences');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground">
            Campanii email, newsletter și automatizări
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAIContent}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Content
          </Button>
          <Button onClick={handleNewCampaign}>
            <Plus className="mr-2 h-4 w-4" />
            Campanie nouă
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Abonați</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers.toLocaleString()}</div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              +12% luna aceasta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emailuri trimise</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">luna aceasta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rată deschidere</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOpenRate}%</div>
            <Progress value={parseFloat(avgOpenRate)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Click rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15.2%</div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              +3% vs. media
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaigns">Campanii</TabsTrigger>
          <TabsTrigger value="audiences">Audiențe</TabsTrigger>
          <TabsTrigger value="automation">Automatizări</TabsTrigger>
          <TabsTrigger value="analytics">Analiză</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Campanii</CardTitle>
                  <CardDescription>Toate campaniile de email marketing</CardDescription>
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Caută campanii..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-lg">{campaign.name}</span>
                            {getCampaignTypeBadge(campaign.type)}
                            {getCampaignStatusBadge(campaign.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {campaign.audience.toLocaleString()} destinatari
                            </span>
                            {campaign.sent && (
                              <span className="flex items-center gap-1">
                                <Send className="h-4 w-4" />
                                {campaign.sent.toLocaleString()} trimise
                              </span>
                            )}
                            {campaign.opened && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                {((campaign.opened / campaign.sent!) * 100).toFixed(1)}% deschise
                              </span>
                            )}
                            {campaign.clicked && (
                              <span className="flex items-center gap-1">
                                <MousePointer className="h-4 w-4" />
                                {((campaign.clicked / campaign.sent!) * 100).toFixed(1)}% click
                              </span>
                            )}
                          </div>
                          {campaign.scheduledAt && campaign.status === 'scheduled' && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Programat: {new Date(campaign.scheduledAt).toLocaleString('ro-RO')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewCampaign(campaign)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Vezi
                          </Button>
                          {campaign.status === 'draft' && (
                            <Button size="sm" onClick={() => handleSendCampaign(campaign)}>
                              <Send className="h-4 w-4 mr-1" />
                              Trimite
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

        {/* Audiences Tab */}
        <TabsContent value="audiences" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Liste de audiență</CardTitle>
                  <CardDescription>Segmente și liste de abonați</CardDescription>
                </div>
                <Button onClick={handleNewSegment}>
                  <Plus className="mr-2 h-4 w-4" />
                  Segment nou
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {audiences.map((audience) => (
                  <Card key={audience.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{audience.name}</CardTitle>
                        <span className="text-2xl font-bold">{audience.count.toLocaleString()}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {audience.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Actualizat: {new Date(audience.lastUpdated).toLocaleDateString('ro-RO')}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditAudience(audience)}>
                          Editează
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => handleCreateCampaignForAudience(audience)}>
                          Campanie
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automatizări active</CardTitle>
              <CardDescription>Fluxuri automate de email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Welcome Series</h3>
                      <p className="text-sm text-muted-foreground">Serie de 5 emailuri pentru abonați noi</p>
                    </div>
                    <Badge>Activ</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>2,450 triggere</span>
                    <span>68% completion rate</span>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Reminder Facturi</h3>
                      <p className="text-sm text-muted-foreground">Notificare automată facturi restante</p>
                    </div>
                    <Badge>Activ</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>125 triggere luna aceasta</span>
                    <span>45% rată plată</span>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Re-engagement</h3>
                      <p className="text-sm text-muted-foreground">Reactivare abonați inactivi</p>
                    </div>
                    <Badge variant="secondary">Pauză</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performanță email</CardTitle>
                <CardDescription>Ultimele 6 luni</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={emailPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="sent" name="Trimise" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="opened" name="Deschise" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="clicked" name="Click-uri" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipuri campanii</CardTitle>
                <CardDescription>Distribuție după tip</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={campaignTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {campaignTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Creștere abonați</CardTitle>
                <CardDescription>Evoluție ultimele 5 săptămâni</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={audienceGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={['dataMin - 100', 'dataMax + 100']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="subscribers" name="Abonați" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
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
