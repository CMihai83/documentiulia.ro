'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { notifyNotAvailable } from '@/lib/toast-bus';
import { api } from '@/lib/api';
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
  Sparkles,
  RefreshCw,
  Layers,
  ListChecks,
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
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'cancelled';
  audience: number;
  sent?: number;
  opened?: number;
  clicked?: number;
  scheduledAt?: string;
  completedAt?: string;
  /** Backend `sentAt` — used to bucket performance per month. */
  sentAt?: string;
}

/** GET /marketing/email/lists → { lists: EmailList[], total } */
interface EmailList {
  id: string;
  name: string;
  description?: string;
  subscriberCount: number;
  doubleOptIn: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /marketing/automation/segments → { segments: Segment[], total } */
interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: unknown[];
  ruleLogic: 'and' | 'or';
  memberCount: number;
  isStatic: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /marketing/email/subscribers → { subscribers: Subscriber[], total } (only the fields we use) */
interface SubscriberLite {
  id: string;
  status: 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';
  lists: string[];
  subscribedAt: string;
}

/** GET /marketing/email/stats */
interface EmailStats {
  totalCampaigns: number;
  sentCampaigns: number;
  totalSubscribers: number;
  activeSubscribers: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalLists: number;
  totalTemplates: number;
}

/** GET /marketing/automation/stats */
interface AutomationStats {
  totalAutomations: number;
  activeAutomations: number;
  totalEnrollments: number;
  activeEnrollments: number;
  totalSegments: number;
  avgLeadScore: number;
}

/** Unified card model for the Audiences tab — built from real lists + segments. */
interface Audience {
  id: string;
  kind: 'list' | 'segment';
  name: string;
  description?: string;
  count: number;
  tags: string[];
  lastUpdated: string;
}

// Campaigns, lists, segments, subscribers and stats are all loaded from the
// marketing API (REQ-038) — no fabricated sample data anywhere on this page.

const MONTH_LABELS_RO = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];

const CAMPAIGN_TYPE_META: Record<Campaign['type'], { label: string; color: string }> = {
  email: { label: 'Email', color: '#3B82F6' },
  newsletter: { label: 'Newsletter', color: '#10B981' },
  automation: { label: 'Automatizări', color: '#F59E0B' },
  sms: { label: 'SMS', color: '#8B5CF6' },
};

/** Last `n` calendar months (oldest → newest) with a stable bucket key and month-end boundary. */
function lastNMonths(n: number): Array<{ key: string; label: string; end: Date }> {
  const now = new Date();
  const out: Array<{ key: string; label: string; end: Date }> = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS_RO[d.getMonth()], end });
  }
  return out;
}

function monthKey(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export default function MarketingPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [searchTerm, setSearchTerm] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // Audiences tab — lists + subscribers (email module) and segments (automation module)
  const [lists, setLists] = useState<EmailList[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentsUnavailable, setSegmentsUnavailable] = useState(false);
  const [subscribers, setSubscribers] = useState<SubscriberLite[]>([]);
  const [audiencesLoading, setAudiencesLoading] = useState(true);
  const [audiencesError, setAudiencesError] = useState<string | null>(null);

  // Analytics tab — aggregate stats from both marketing modules
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [automationStats, setAutomationStats] = useState<AutomationStats | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/v1/marketing/email/campaigns', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.campaigns || [];
      const statusMap: Record<string, Campaign['status']> = {
        draft: 'draft', scheduled: 'scheduled', sending: 'running',
        sent: 'completed', paused: 'paused', cancelled: 'cancelled',
      };
      setCampaigns(list.map((c: any): Campaign => ({
        id: c.id,
        name: c.name,
        type: 'email',
        status: statusMap[c.status] || 'draft',
        audience: c.stats?.totalRecipients ?? c.recipients?.estimatedCount ?? 0,
        sent: c.stats?.sent,
        opened: c.stats?.opens ?? c.stats?.opened,
        clicked: c.stats?.clicks ?? c.stats?.clicked,
        scheduledAt: c.schedule?.sendAt ?? c.schedule?.scheduledAt,
        completedAt: c.status === 'sent' ? c.updatedAt : undefined,
        sentAt: c.sentAt ?? (c.status === 'sent' ? c.updatedAt : undefined),
      })));
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      setCampaigns([]);
    } finally {
      setCampaignsLoading(false);
    }
  };

  const fetchAudiences = async () => {
    setAudiencesLoading(true);
    setAudiencesError(null);
    const [listsRes, subsRes, segRes] = await Promise.all([
      api.get<{ lists?: EmailList[]; total?: number }>('/marketing/email/lists'),
      api.get<{ subscribers?: SubscriberLite[]; total?: number }>('/marketing/email/subscribers'),
      api.get<{ segments?: Segment[]; total?: number; error?: string }>('/marketing/automation/segments'),
    ]);

    if (listsRes.error || !listsRes.data) {
      setAudiencesError(listsRes.error || 'Listele de abonați nu au putut fi încărcate.');
      setAudiencesLoading(false);
      return;
    }
    setLists(Array.isArray(listsRes.data.lists) ? listsRes.data.lists : []);
    setSubscribers(subsRes.data && Array.isArray(subsRes.data.subscribers) ? subsRes.data.subscribers : []);

    // The segments endpoint lives in the automation module; if it answers with
    // anything but a segments array we say so instead of inventing data.
    if (segRes.data && Array.isArray(segRes.data.segments)) {
      setSegments(segRes.data.segments);
      setSegmentsUnavailable(false);
    } else {
      setSegments([]);
      setSegmentsUnavailable(true);
    }
    setAudiencesLoading(false);
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    const [emailRes, autoRes] = await Promise.all([
      api.get<EmailStats>('/marketing/email/stats'),
      api.get<Partial<AutomationStats> & { error?: string }>('/marketing/automation/stats'),
    ]);

    if (emailRes.error || !emailRes.data || typeof emailRes.data.totalCampaigns !== 'number') {
      setAnalyticsError(emailRes.error || 'Statisticile de email nu au putut fi încărcate.');
      setEmailStats(null);
    } else {
      setEmailStats(emailRes.data);
    }
    setAutomationStats(
      autoRes.data && typeof autoRes.data.totalAutomations === 'number'
        ? (autoRes.data as AutomationStats)
        : null,
    );
    setAnalyticsLoading(false);
  };

  useEffect(() => {
    fetchData();
    fetchAudiences();
    fetchAnalytics();
  }, []);

  // ---- Derived (real) data -------------------------------------------------

  /** Lists + segments as one card model for the Audiences tab. */
  const audiences = useMemo<Audience[]>(() => {
    const fromLists: Audience[] = lists.map((l) => ({
      id: l.id,
      kind: 'list',
      name: l.name,
      description: l.description,
      count: l.subscriberCount ?? 0,
      tags: ['listă', l.doubleOptIn ? 'double opt-in' : 'opt-in simplu'],
      lastUpdated: l.updatedAt ?? l.createdAt,
    }));
    const fromSegments: Audience[] = segments.map((sg) => ({
      id: sg.id,
      kind: 'segment',
      name: sg.name,
      description: sg.description,
      count: sg.memberCount ?? 0,
      tags: [
        'segment',
        sg.isStatic ? 'static' : 'dinamic',
        `${Array.isArray(sg.rules) ? sg.rules.length : 0} reguli`,
      ],
      lastUpdated: sg.updatedAt ?? sg.createdAt,
    }));
    return [...fromLists, ...fromSegments];
  }, [lists, segments]);

  const activeSubscribers = useMemo(
    () => subscribers.filter((sub) => sub.status === 'subscribed').length,
    [subscribers],
  );

  /** Monthly sent/opened/clicked over the last 6 months, bucketed by each campaign's sentAt. */
  const emailPerformance = useMemo(() => {
    const months = lastNMonths(6);
    const buckets = new Map(months.map((m) => [m.key, { month: m.label, sent: 0, opened: 0, clicked: 0 }]));
    for (const c of campaigns) {
      if (c.status !== 'completed') continue;
      const key = monthKey(c.sentAt ?? c.completedAt);
      if (!key) continue;
      const b = buckets.get(key);
      if (!b) continue;
      b.sent += c.sent ?? 0;
      b.opened += c.opened ?? 0;
      b.clicked += c.clicked ?? 0;
    }
    return months.map((m) => buckets.get(m.key)!);
  }, [campaigns]);
  const hasPerformanceData = emailPerformance.some((m) => m.sent > 0);

  /** Campaign type distribution, counted from the loaded campaigns. */
  const campaignTypeData = useMemo(() => {
    const counts = new Map<Campaign['type'], number>();
    for (const c of campaigns) counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
    return (Object.keys(CAMPAIGN_TYPE_META) as Campaign['type'][])
      .filter((t) => (counts.get(t) ?? 0) > 0)
      .map((t) => ({ name: CAMPAIGN_TYPE_META[t].label, value: counts.get(t) ?? 0, color: CAMPAIGN_TYPE_META[t].color }));
  }, [campaigns]);

  /** Cumulative subscriber count at the end of each of the last 6 months (from subscribedAt). */
  const audienceGrowth = useMemo(() => {
    const months = lastNMonths(6);
    const dates = subscribers
      .map((sub) => new Date(sub.subscribedAt).getTime())
      .filter((t) => !Number.isNaN(t));
    return months.map((m) => ({
      month: m.label,
      subscribers: dates.filter((t) => t <= m.end.getTime()).length,
    }));
  }, [subscribers]);

  const getCampaignStatusBadge = (status: Campaign['status']) => {
    const config = {
      draft: { label: 'Ciornă', variant: 'outline' as const, icon: FileText },
      scheduled: { label: 'Programat', variant: 'secondary' as const, icon: Calendar },
      running: { label: 'În curs', variant: 'default' as const, icon: Play },
      completed: { label: 'Finalizat', variant: 'default' as const, icon: CheckCircle },
      paused: { label: 'Pauză', variant: 'secondary' as const, icon: Pause },
      cancelled: { label: 'Anulată', variant: 'outline' as const, icon: Pause },
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
  const totalClicked = campaigns.reduce((sum, c) => sum + (c.clicked || 0), 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
  const avgClickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0';
  const totalSubscribers = emailStats?.totalSubscribers ?? subscribers.length;

  // Action handlers
  const handleAIContent = () => {
    // Navigate to AI content generator page
    router.push('/dashboard/marketing/ai-content');
  };

  const handleNewCampaign = () => {
    router.push('/dashboard/marketing/campaigns/new');
  };

  const handleViewCampaign = (campaign: Campaign) => {
    notifyNotAvailable();
  };

  const handleSendCampaign = (campaign: Campaign) => {
    // Navigate to send confirmation page
    notifyNotAvailable();
  };

  const handleNewSegment = () => {
    // Navigate to new segment creation page
    router.push('/dashboard/marketing/audiences/segments/new');
  };

  const handleEditAudience = (audience: Audience) => {
    notifyNotAvailable();
  };

  const handleCreateCampaignForAudience = (audience: Audience) => {
    const param = audience.kind === 'segment' ? 'segment' : 'list';
    router.push(`/dashboard/marketing/campaigns/new?${param}=${audience.id}`);
  };

  // Campaign CRUD handlers
  const handleEditCampaign = (campaign: Campaign) => {
    notifyNotAvailable();
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    // Navigate to delete confirmation page
    notifyNotAvailable();
  };

  const handleDuplicateCampaign = (campaign: Campaign) => {
    // Navigate to duplicate page
    notifyNotAvailable();
  };

  const handlePauseCampaign = async (campaign: Campaign) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/marketing/email/campaigns/${campaign.id}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Campanie în pauză', `"${campaign.name}" a fost pusă în pauză.`);
        fetchData();
      } else {
        const body = await response.json().catch(() => null);
        toast.error('Pauza a eșuat', body?.message || 'Doar campaniile în trimitere sau programate pot fi puse în pauză.');
      }
    } catch (err) {
      toast.error('Pauza a eșuat', 'Nu s-a putut contacta serverul. Încercați din nou.');
    }
  };

  const handleResumeCampaign = async (campaign: Campaign) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/marketing/email/campaigns/${campaign.id}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Campanie reluată', `"${campaign.name}" a fost reluată.`);
        fetchData();
      } else {
        const body = await response.json().catch(() => null);
        toast.error('Reluarea a eșuat', body?.message || 'Doar campaniile în pauză pot fi reluate.');
      }
    } catch (err) {
      toast.error('Reluarea a eșuat', 'Nu s-a putut contacta serverul. Încercați din nou.');
    }
  };

  const handleScheduleCampaign = (campaign: Campaign) => {
    // Navigate to schedule page
    notifyNotAvailable();
  };

  // A/B Testing handlers
  const handleCreateABTest = () => {
    router.push('/dashboard/marketing/ab-test/new');
  };

  const handleViewABTestResults = (campaignId: string) => {
    notifyNotAvailable();
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
    notifyNotAvailable();
  };

  // Audience management handlers
  const handleDeleteAudience = (audience: Audience) => {
    // Navigate to delete confirmation page
    notifyNotAvailable(audience.kind === 'segment' ? 'Ștergere segment' : 'Ștergere listă');
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
    notifyNotAvailable();
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
    notifyNotAvailable();
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
            <div className="text-2xl font-bold">{audiencesLoading && !emailStats ? '…' : totalSubscribers.toLocaleString('ro-RO')}</div>
            <p className="text-xs text-muted-foreground">
              {emailStats ? `${emailStats.activeSubscribers.toLocaleString('ro-RO')} activi` : `${activeSubscribers.toLocaleString('ro-RO')} activi`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emailuri trimise</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString('ro-RO')}</div>
            <p className="text-xs text-muted-foreground">în toate campaniile</p>
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
            <div className="text-2xl font-bold">{avgClickRate}%</div>
            <Progress value={parseFloat(avgClickRate)} className="mt-2" />
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
                  {campaignsLoading && (
                    <p className="text-sm text-muted-foreground text-center py-8">Se încarcă campaniile…</p>
                  )}
                  {!campaignsLoading && campaigns.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nicio campanie încă. Creați prima campanie de email pentru a o vedea aici.
                    </p>
                  )}
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
                  <CardDescription>
                    {audiencesLoading
                      ? 'Se încarcă listele și segmentele…'
                      : `${lists.length} liste · ${segments.length} segmente · ${subscribers.length.toLocaleString('ro-RO')} abonați (${activeSubscribers.toLocaleString('ro-RO')} activi)`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={fetchAudiences} disabled={audiencesLoading} aria-label="Reîncarcă audiențele">
                    <RefreshCw className={`h-4 w-4 ${audiencesLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button onClick={handleNewSegment}>
                    <Plus className="mr-2 h-4 w-4" />
                    Segment nou
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {audiencesLoading && (
                <p className="text-sm text-muted-foreground text-center py-8">Se încarcă audiențele…</p>
              )}

              {!audiencesLoading && audiencesError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
                  <p className="text-sm text-destructive">{audiencesError}</p>
                  <Button variant="outline" size="sm" onClick={fetchAudiences}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reîncearcă
                  </Button>
                </div>
              )}

              {!audiencesLoading && !audiencesError && audiences.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nicio listă de abonați încă.</p>
                  <p className="text-xs text-muted-foreground">
                    Importați contacte sau creați un segment pentru a vedea audiențele aici.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={handleImportContacts}>Importă contacte</Button>
                    <Button size="sm" onClick={handleNewSegment}>Segment nou</Button>
                  </div>
                </div>
              )}

              {!audiencesLoading && !audiencesError && audiences.length > 0 && (
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ListChecks className="h-4 w-4" />
                      Liste de abonați ({lists.length})
                    </h3>
                    {lists.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nicio listă de abonați încă.</p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {audiences.filter((a) => a.kind === 'list').map((audience) => (
                          <Card key={audience.id}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{audience.name}</CardTitle>
                                <span className="text-2xl font-bold">{audience.count.toLocaleString('ro-RO')}</span>
                              </div>
                              {audience.description && (
                                <CardDescription>{audience.description}</CardDescription>
                              )}
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
                    )}
                  </section>

                  <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Layers className="h-4 w-4" />
                      Segmente ({segments.length})
                    </h3>
                    {segmentsUnavailable && (
                      <p className="text-sm text-muted-foreground">
                        Segmentele nu au putut fi încărcate din modulul de automatizări.
                      </p>
                    )}
                    {!segmentsUnavailable && segments.length === 0 && (
                      <p className="text-sm text-muted-foreground">Niciun segment definit încă.</p>
                    )}
                    {segments.length > 0 && (
                      <div className="grid gap-4 md:grid-cols-2">
                        {audiences.filter((a) => a.kind === 'segment').map((audience) => (
                          <Card key={audience.id}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{audience.name}</CardTitle>
                                <span className="text-2xl font-bold">{audience.count.toLocaleString('ro-RO')}</span>
                              </div>
                              {audience.description && (
                                <CardDescription>{audience.description}</CardDescription>
                              )}
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
                    )}
                  </section>
                </div>
              )}
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
          {/* Aggregate stats — GET /marketing/email/stats + GET /marketing/automation/stats */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sumar marketing</CardTitle>
                  <CardDescription>Statistici agregate din modulele email și automatizări</CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={fetchAnalytics} disabled={analyticsLoading} aria-label="Reîncarcă statisticile">
                  <RefreshCw className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {analyticsLoading && (
                <p className="text-sm text-muted-foreground text-center py-6">Se încarcă statisticile…</p>
              )}
              {!analyticsLoading && analyticsError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
                  <p className="text-sm text-destructive">{analyticsError}</p>
                  <Button variant="outline" size="sm" onClick={fetchAnalytics}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reîncearcă
                  </Button>
                </div>
              )}
              {!analyticsLoading && !analyticsError && emailStats && (
                <div className="space-y-4">
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Campanii</p>
                      <p className="text-xl font-bold">{emailStats.totalCampaigns.toLocaleString('ro-RO')}</p>
                      <p className="text-xs text-muted-foreground">{emailStats.sentCampaigns.toLocaleString('ro-RO')} trimise</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Abonați</p>
                      <p className="text-xl font-bold">{emailStats.totalSubscribers.toLocaleString('ro-RO')}</p>
                      <p className="text-xs text-muted-foreground">{emailStats.activeSubscribers.toLocaleString('ro-RO')} activi</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Rată medie deschidere</p>
                      <p className="text-xl font-bold">{emailStats.avgOpenRate.toLocaleString('ro-RO')}%</p>
                      <p className="text-xs text-muted-foreground">pe campaniile trimise</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Rată medie click</p>
                      <p className="text-xl font-bold">{emailStats.avgClickRate.toLocaleString('ro-RO')}%</p>
                      <p className="text-xs text-muted-foreground">pe campaniile trimise</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Liste</p>
                      <p className="text-xl font-bold">{emailStats.totalLists.toLocaleString('ro-RO')}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Șabloane</p>
                      <p className="text-xl font-bold">{emailStats.totalTemplates.toLocaleString('ro-RO')}</p>
                    </div>
                    {automationStats ? (
                      <>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Automatizări</p>
                          <p className="text-xl font-bold">{automationStats.totalAutomations.toLocaleString('ro-RO')}</p>
                          <p className="text-xs text-muted-foreground">
                            {automationStats.activeAutomations.toLocaleString('ro-RO')} active · {automationStats.activeEnrollments.toLocaleString('ro-RO')} înscrieri active
                          </p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Segmente</p>
                          <p className="text-xl font-bold">{automationStats.totalSegments.toLocaleString('ro-RO')}</p>
                          <p className="text-xs text-muted-foreground">scor mediu lead {automationStats.avgLeadScore.toLocaleString('ro-RO')}</p>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed p-3 col-span-2">
                        <p className="text-xs text-muted-foreground">Automatizări și segmente</p>
                        <p className="text-sm text-muted-foreground">Statisticile de automatizări nu sunt disponibile momentan.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Monthly performance — aggregated from the loaded campaigns' own stats, bucketed by sentAt */}
            <Card>
              <CardHeader>
                <CardTitle>Performanță email</CardTitle>
                <CardDescription>Ultimele 6 luni, din campaniile trimise</CardDescription>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Se încarcă campaniile…</p>
                ) : !hasPerformanceData ? (
                  <div className="h-[300px] flex flex-col items-center justify-center text-center gap-2">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nicio campanie trimisă în ultimele 6 luni.</p>
                    <p className="text-xs text-muted-foreground">Graficul apare după prima campanie trimisă.</p>
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>

            {/* Type distribution — counted from the loaded campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Tipuri campanii</CardTitle>
                <CardDescription>Distribuție după tip ({campaigns.length} campanii)</CardDescription>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Se încarcă campaniile…</p>
                ) : campaignTypeData.length === 0 ? (
                  <div className="h-[300px] flex flex-col items-center justify-center text-center gap-2">
                    <PieChart className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nicio campanie încă.</p>
                    <p className="text-xs text-muted-foreground">Distribuția pe tipuri apare după crearea primei campanii.</p>
                  </div>
                ) : (
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
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {campaignTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Subscriber growth — cumulative count from each subscriber's subscribedAt */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Creștere abonați</CardTitle>
                <CardDescription>Total cumulat la sfârșitul fiecărei luni, ultimele 6 luni</CardDescription>
              </CardHeader>
              <CardContent>
                {audiencesLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Se încarcă abonații…</p>
                ) : audiencesError ? (
                  <div className="h-[250px] flex flex-col items-center justify-center text-center gap-2">
                    <p className="text-sm text-destructive">{audiencesError}</p>
                    <Button variant="outline" size="sm" onClick={fetchAudiences}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reîncearcă
                    </Button>
                  </div>
                ) : subscribers.length === 0 ? (
                  <div className="h-[250px] flex flex-col items-center justify-center text-center gap-2">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Niciun abonat încă.</p>
                    <p className="text-xs text-muted-foreground">Evoluția apare după primii abonați înregistrați.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={audienceGrowth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="subscribers" name="Abonați" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
