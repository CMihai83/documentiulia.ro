'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Bell,
  Search,
  Settings,
  Inbox,
  Archive,
  Trash2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Mail,
  BellRing,
  Clock,
  Calendar,
  Euro,
  Users,
  Building2,
  ChevronRight,
  Check,
  RefreshCw,
  Loader2,
  History,
  MailCheck,
  MailOpen,
  Send,
  Shield,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toastFromAnywhere } from '@/lib/toast-bus';
import { localePrefixFromPath } from '@/lib/locale';

// ---------------------------------------------------------------------------
// Types — mirror backend shapes
//   GET  /notifications/center/list        -> { success, data: CenterNotification[], pagination }
//   PUT  /notifications/center/item/:id/read|unread|archive
//   DELETE /notifications/center/item/:id
//   POST /notifications/center/bulk/mark-all-read
//   GET  /notifications/list               -> { notifications: HistoryEntry[], total }  (e-mail send log)
//   GET  /notifications/preferences        -> { preferences: { email: {...} } }
//   PATCH /notifications/preferences       -> { preferences: { email: {...} } }
// ---------------------------------------------------------------------------

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
type NotificationStatus = 'unread' | 'read' | 'archived' | 'dismissed';
type NotificationCategory = 'system' | 'finance' | 'hr' | 'compliance' | 'alerts' | 'reminders';

interface CenterNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  icon?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
}

interface CenterListResponse {
  success: boolean;
  data: CenterNotification[];
  pagination?: { total: number; limit: number; offset: number };
}

interface CenterItemResponse {
  success: boolean;
  data: CenterNotification | null;
  error?: string;
}

interface CenterBulkResponse {
  success: boolean;
  message?: string;
  data?: { success: boolean; affected: number; notificationIds: string[] };
}

interface CenterDeleteResponse {
  success: boolean;
  message?: string;
}

interface HistoryEntry {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface HistoryListResponse {
  notifications: HistoryEntry[];
  total: number;
  limit: number;
  offset: number;
  unreadCount: number;
}

interface EmailPreferences {
  invoiceReminders: boolean;
  overdueAlerts: boolean;
  complianceDeadlines: boolean;
  weeklyReports: boolean;
  systemAlerts: boolean;
}

interface PreferencesResponse {
  preferences: { email: EmailPreferences };
  message?: string;
}

type EmailPrefKey = keyof EmailPreferences;

// ---------------------------------------------------------------------------
// Static labels (UI only, not data)
// ---------------------------------------------------------------------------

const priorityColors: Record<NotificationPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<NotificationPriority, string> = {
  low: 'Scăzută',
  normal: 'Normală',
  high: 'Ridicată',
  urgent: 'Urgentă',
};

const categoryIcons: Record<NotificationCategory, React.ReactNode> = {
  system: <Settings className="h-4 w-4" />,
  finance: <Euro className="h-4 w-4" />,
  hr: <Users className="h-4 w-4" />,
  compliance: <Building2 className="h-4 w-4" />,
  alerts: <AlertTriangle className="h-4 w-4" />,
  reminders: <Calendar className="h-4 w-4" />,
};

const categoryLabels: Record<NotificationCategory, string> = {
  system: 'Sistem',
  finance: 'Financiar',
  hr: 'HR',
  compliance: 'Conformitate',
  alerts: 'Alerte',
  reminders: 'Memento-uri',
};

const emailPrefMeta: { key: EmailPrefKey; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: 'invoiceReminders',
    label: 'Memento-uri facturi',
    description: 'E-mail înainte de scadența facturilor emise',
    icon: <Euro className="h-4 w-4" />,
  },
  {
    key: 'overdueAlerts',
    label: 'Alerte facturi restante',
    description: 'E-mail când o factură depășește termenul de plată',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    key: 'complianceDeadlines',
    label: 'Termene de conformitate',
    description: 'Termene ANAF: D406 SAF-T, e-Factura, declarații',
    icon: <Shield className="h-4 w-4" />,
  },
  {
    key: 'weeklyReports',
    label: 'Rezumat săptămânal',
    description: 'Raport săptămânal cu activitatea și alertele importante',
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    key: 'systemAlerts',
    label: 'Alerte de sistem',
    description: 'Actualizări, mentenanță și avertizări tehnice',
    icon: <Settings className="h-4 w-4" />,
  },
];

function normalizeCategory(raw: string | undefined): NotificationCategory {
  const c = (raw || '').toLowerCase();
  if (c in categoryLabels) return c as NotificationCategory;
  if (/invoice|payment|factur|plat|bank|financ|treasury/.test(c)) return 'finance';
  if (/efactura|anaf|saft|compliance|gdpr|declar/.test(c)) return 'compliance';
  if (/hr|contract|employee|payroll|leave/.test(c)) return 'hr';
  if (/alert|stock|warning|error/.test(c)) return 'alerts';
  if (/remind|calendar|deadline|task/.test(c)) return 'reminders';
  return 'system';
}

function normalizePriority(raw: string | undefined): NotificationPriority {
  const p = (raw || '').toLowerCase();
  if (p === 'low' || p === 'normal' || p === 'high' || p === 'urgent') return p;
  if (p === 'deadline_reminder') return 'high';
  return 'normal';
}

function initialsFor(category: NotificationCategory): string {
  const map: Record<NotificationCategory, string> = {
    system: 'SY',
    finance: 'FI',
    hr: 'HR',
    compliance: 'AC',
    alerts: 'AL',
    reminders: 'CA',
  };
  return map[category];
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'chiar acum';
  if (minutes < 60) return `acum ${minutes} ${minutes === 1 ? 'minut' : 'minute'}`;
  if (hours < 24) return `acum ${hours} ${hours === 1 ? 'oră' : 'ore'}`;
  if (days < 7) return `acum ${days} ${days === 1 ? 'zi' : 'zile'}`;
  return date.toLocaleDateString('ro-RO');
}

// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Center (in-app) notifications — actionable
  const [notifications, setNotifications] = useState<CenterNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  // E-mail send history — read-only
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Preferences
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [prefsSaving, setPrefsSaving] = useState<EmailPrefKey | null>(null);

  // ----------------------------- loaders -----------------------------------

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await api.get<CenterListResponse>('/notifications/center/list', {
      params: { limit: 500, offset: 0 },
    });
    if (r.status >= 200 && r.status < 300 && r.data && Array.isArray(r.data.data)) {
      setNotifications(r.data.data);
    } else {
      setNotifications([]);
      setError(r.error || 'Notificările nu au putut fi încărcate.');
    }
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    const r = await api.get<HistoryListResponse>('/notifications/list', {
      params: { limit: 100, offset: 0 },
    });
    if (r.status >= 200 && r.status < 300 && r.data && Array.isArray(r.data.notifications)) {
      setHistory(r.data.notifications);
      setHistoryTotal(r.data.total ?? r.data.notifications.length);
    } else {
      setHistory([]);
      setHistoryTotal(0);
      setHistoryError(r.error || 'Istoricul notificărilor nu a putut fi încărcat.');
    }
    setHistoryLoading(false);
  }, []);

  const loadPreferences = useCallback(async () => {
    setPrefsLoading(true);
    setPrefsError(null);
    const r = await api.get<PreferencesResponse>('/notifications/preferences');
    if (r.status >= 200 && r.status < 300 && r.data?.preferences?.email) {
      setPrefs(r.data.preferences.email);
    } else {
      setPrefs(null);
      setPrefsError(r.error || 'Preferințele nu au putut fi încărcate.');
    }
    setPrefsLoading(false);
  }, []);

  useEffect(() => {
    void loadNotifications();
    void loadHistory();
    void loadPreferences();
  }, [loadNotifications, loadHistory, loadPreferences]);

  // Drop selections that no longer exist after a refetch
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => notifications.some((n) => n.id === id)));
  }, [notifications]);

  // ----------------------------- derived -----------------------------------

  const stats = useMemo(() => {
    const live = notifications.filter((n) => n.status !== 'dismissed');
    return {
      inbox: live.filter((n) => n.status !== 'archived').length,
      unread: live.filter((n) => n.status === 'unread').length,
      urgent: live.filter((n) => n.status === 'unread' && n.priority === 'urgent').length,
      archived: live.filter((n) => n.status === 'archived').length,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    let list = notifications.filter((n) => n.status !== 'dismissed');
    if (activeTab === 'inbox') list = list.filter((n) => n.status !== 'archived');
    else if (activeTab === 'unread') list = list.filter((n) => n.status === 'unread');
    else if (activeTab === 'archived') list = list.filter((n) => n.status === 'archived');

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== 'all') {
      list = list.filter((n) => normalizeCategory(n.category) === categoryFilter);
    }
    if (priorityFilter !== 'all') {
      list = list.filter((n) => normalizePriority(n.priority) === priorityFilter);
    }
    return list;
  }, [notifications, activeTab, searchQuery, categoryFilter, priorityFilter]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = history;
    if (q) {
      list = list.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          h.message.toLowerCase().includes(q) ||
          h.type.toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== 'all') {
      list = list.filter((h) => normalizeCategory(h.type) === categoryFilter);
    }
    return list;
  }, [history, searchQuery, categoryFilter]);

  // ----------------------------- actions -----------------------------------

  const withBusy = async (ids: string[], fn: () => Promise<void>) => {
    setBusyIds((prev) => [...prev, ...ids]);
    try {
      await fn();
    } finally {
      setBusyIds((prev) => prev.filter((id) => !ids.includes(id)));
    }
  };

  /** PUT /notifications/center/item/:id/{read|unread|archive}. Returns true on success. */
  const putItem = async (id: string, verb: 'read' | 'unread' | 'archive'): Promise<boolean> => {
    const r = await api.put<CenterItemResponse>(`/notifications/center/item/${encodeURIComponent(id)}/${verb}`);
    if (r.status >= 200 && r.status < 300 && r.data?.success && r.data.data) return true;
    return false;
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    const r = await api.delete<CenterDeleteResponse>(`/notifications/center/item/${encodeURIComponent(id)}`);
    return r.status >= 200 && r.status < 300 && !!r.data?.success;
  };

  const verbLabels = {
    read: { ok: 'marcată ca citită', fail: 'Marcarea ca citită a eșuat' },
    unread: { ok: 'marcată ca necitită', fail: 'Marcarea ca necitită a eșuat' },
    archive: { ok: 'arhivată', fail: 'Arhivarea a eșuat' },
  } as const;

  const handleSingle = async (id: string, verb: 'read' | 'unread' | 'archive') => {
    await withBusy([id], async () => {
      const ok = await putItem(id, verb);
      if (ok) {
        toastFromAnywhere('success', `Notificare ${verbLabels[verb].ok}`);
      } else {
        toastFromAnywhere(
          'error',
          verbLabels[verb].fail,
          'Notificarea nu a fost găsită pe server sau serverul nu a răspuns. Lista a fost reîncărcată.',
        );
      }
      await loadNotifications();
    });
  };

  const handleDelete = async (id: string) => {
    await withBusy([id], async () => {
      const ok = await deleteItem(id);
      if (ok) toastFromAnywhere('success', 'Notificare ștearsă');
      else toastFromAnywhere('error', 'Ștergerea a eșuat', 'Notificarea nu a fost găsită sau serverul nu a răspuns.');
      await loadNotifications();
    });
  };

  const handleBulk = async (verb: 'read' | 'archive' | 'delete') => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy(true);
    await withBusy(ids, async () => {
      const results = await Promise.all(
        ids.map((id) => (verb === 'delete' ? deleteItem(id) : putItem(id, verb))),
      );
      const okCount = results.filter(Boolean).length;
      const failCount = results.length - okCount;
      const what = verb === 'read' ? 'marcate ca citite' : verb === 'archive' ? 'arhivate' : 'șterse';
      if (failCount === 0) {
        toastFromAnywhere('success', `${okCount} notificări ${what}`);
      } else if (okCount === 0) {
        toastFromAnywhere('error', `Acțiunea a eșuat pentru toate cele ${failCount} notificări`, 'Serverul nu a confirmat nicio modificare.');
      } else {
        toastFromAnywhere('warning', `${okCount} notificări ${what}, ${failCount} au eșuat`);
      }
      setSelectedIds([]);
      await loadNotifications();
    });
    setBulkBusy(false);
  };

  const handleMarkAllRead = async () => {
    setBulkBusy(true);
    const r = await api.post<CenterBulkResponse>('/notifications/center/bulk/mark-all-read');
    if (r.status >= 200 && r.status < 300 && r.data?.success) {
      const affected = r.data.data?.affected ?? 0;
      toastFromAnywhere('success', affected > 0 ? `${affected} notificări marcate ca citite` : 'Nu există notificări necitite');
    } else {
      toastFromAnywhere('error', 'Marcarea ca citite a eșuat', r.error || 'Serverul nu a răspuns.');
    }
    await loadNotifications();
    setBulkBusy(false);
  };

  const handleOpenAction = (n: CenterNotification) => {
    if (!n.actionUrl) return;
    if (/^https?:\/\//i.test(n.actionUrl)) {
      window.open(n.actionUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const prefix = localePrefixFromPath(pathname || '');
    const target = n.actionUrl.startsWith('/') ? `${prefix}${n.actionUrl}` : n.actionUrl;
    if (n.status === 'unread') {
      // Fire-and-forget: mark read when the user follows the action
      void putItem(n.id, 'read').then(() => loadNotifications());
    }
    router.push(target);
  };

  const handlePrefToggle = async (key: EmailPrefKey, value: boolean) => {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value });
    setPrefsSaving(key);
    const r = await api.patch<PreferencesResponse>('/notifications/preferences', { email: { [key]: value } });
    if (r.status >= 200 && r.status < 300 && r.data?.preferences?.email) {
      setPrefs(r.data.preferences.email);
      toastFromAnywhere('success', 'Preferință salvată');
    } else {
      setPrefs(previous);
      toastFromAnywhere('error', 'Preferința nu a putut fi salvată', r.error || 'Serverul nu a răspuns. Modificarea a fost anulată.');
    }
    setPrefsSaving(null);
  };

  // ----------------------------- selection ---------------------------------

  const allFilteredSelected =
    filteredNotifications.length > 0 && filteredNotifications.every((n) => selectedIds.includes(n.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) setSelectedIds([]);
    else setSelectedIds(filteredNotifications.map((n) => n.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectedCount = selectedIds.length;
  const selectedHasUnread = selectedIds.some((id) => notifications.find((n) => n.id === id)?.status === 'unread');
  const selectedHasUnarchived = selectedIds.some((id) => notifications.find((n) => n.id === id)?.status !== 'archived');

  // ----------------------------- render ------------------------------------

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centru Notificări</h1>
          <p className="text-muted-foreground">
            Gestionează notificările și preferințele de comunicare
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => { void loadNotifications(); void loadHistory(); }}
            disabled={loading || historyLoading}
            aria-label="Reîncarcă notificările"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading || historyLoading ? 'animate-spin' : ''}`} />
            Reîncarcă
          </Button>
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={bulkBusy || loading || stats.unread === 0}
          >
            {bulkBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Marchează toate citite
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Inbox className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{loading ? '…' : stats.inbox}</div>
                <div className="text-sm text-muted-foreground">În inbox</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <BellRing className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{loading ? '…' : stats.unread}</div>
                <div className="text-sm text-muted-foreground">Necitite</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{loading ? '…' : stats.urgent}</div>
                <div className="text-sm text-muted-foreground">Urgente</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Archive className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{loading ? '…' : stats.archived}</div>
                <div className="text-sm text-muted-foreground">Arhivate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds([]); }}>
        <TabsList>
          <TabsTrigger value="inbox">
            <Inbox className="mr-2 h-4 w-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="unread">
            <BellRing className="mr-2 h-4 w-4" />
            Necitite
            {stats.unread > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.unread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="mr-2 h-4 w-4" />
            Arhivate
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Istoric e-mail
            {historyTotal > 0 && (
              <Badge variant="secondary" className="ml-2">
                {historyTotal}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Preferințe
          </TabsTrigger>
        </TabsList>

        {/* Inbox / Unread / Archived */}
        {(['inbox', 'unread', 'archived'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Căutare notificări..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      aria-label="Căutare notificări"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]" aria-label="Filtru categorie">
                      <SelectValue placeholder="Categorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate categoriile</SelectItem>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[160px]" aria-label="Filtru prioritate">
                      <SelectValue placeholder="Prioritate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate prioritățile</SelectItem>
                      {Object.entries(priorityLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedCount > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm">
                      {selectedCount} {selectedCount === 1 ? 'notificare selectată' : 'notificări selectate'}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulk('read')}
                        disabled={bulkBusy || !selectedHasUnread}
                      >
                        <Check className="mr-2 h-3 w-3" />
                        Marchează citite
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulk('archive')}
                        disabled={bulkBusy || !selectedHasUnarchived}
                      >
                        <Archive className="mr-2 h-3 w-3" />
                        Arhivează
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleBulk('delete')}
                        disabled={bulkBusy}
                      >
                        {bulkBusy ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Trash2 className="mr-2 h-3 w-3" />}
                        Șterge
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications List */}
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground" role="status">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Se încarcă notificările...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                    <p className="text-lg font-medium">Notificările nu au putut fi încărcate</p>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button variant="outline" onClick={() => void loadNotifications()}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reîncearcă
                    </Button>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">Nicio notificare</p>
                    <p className="text-muted-foreground">
                      {notifications.length > 0 && (searchQuery || categoryFilter !== 'all' || priorityFilter !== 'all')
                        ? 'Nicio notificare nu corespunde filtrelor selectate.'
                        : tab === 'unread'
                          ? 'Ai citit toate notificările.'
                          : tab === 'archived'
                            ? 'Nu există notificări arhivate.'
                            : 'Nu există notificări în aplicație pentru contul tău.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Select All */}
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selectează toate notificările afișate"
                      />
                      <span className="text-sm text-muted-foreground">
                        Selectează toate
                      </span>
                    </div>

                    {filteredNotifications.map((notification) => {
                      const category = normalizeCategory(notification.category);
                      const priority = normalizePriority(notification.priority);
                      const isBusy = busyIds.includes(notification.id);
                      const isUnread = notification.status === 'unread';
                      const isArchived = notification.status === 'archived';
                      return (
                        <div
                          key={notification.id}
                          className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                            isUnread ? 'bg-blue-50/50 border-blue-100' : 'hover:bg-muted/50'
                          } ${selectedIds.includes(notification.id) ? 'ring-2 ring-blue-500' : ''} ${isBusy ? 'opacity-60' : ''}`}
                        >
                          <Checkbox
                            checked={selectedIds.includes(notification.id)}
                            onCheckedChange={() => toggleSelect(notification.id)}
                            aria-label={`Selectează: ${notification.title}`}
                          />
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={`text-xs ${
                              priority === 'urgent' ? 'bg-red-100 text-red-700' :
                              priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {initialsFor(category)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {isUnread && (
                                    <div className="w-2 h-2 rounded-full bg-blue-500" aria-hidden="true" />
                                  )}
                                  <span className={`font-medium ${isUnread ? '' : 'text-muted-foreground'}`}>
                                    {notification.title}
                                  </span>
                                  <Badge className={priorityColors[priority]}>
                                    {priorityLabels[priority]}
                                  </Badge>
                                  {isArchived && <Badge variant="outline">Arhivată</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {categoryIcons[category]}
                                    <span>{categoryLabels[category]}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatRelative(notification.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {notification.actionUrl && (
                                  <Button size="sm" onClick={() => handleOpenAction(notification)} disabled={isBusy}>
                                    {notification.actionLabel || 'Deschide'}
                                    <ChevronRight className="ml-1 h-3 w-3" />
                                  </Button>
                                )}
                                {isUnread ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Marchează ca citită"
                                    aria-label="Marchează ca citită"
                                    disabled={isBusy}
                                    onClick={() => handleSingle(notification.id, 'read')}
                                  >
                                    <MailOpen className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Marchează ca necitită"
                                    aria-label="Marchează ca necitită"
                                    disabled={isBusy}
                                    onClick={() => handleSingle(notification.id, 'unread')}
                                  >
                                    <MailCheck className="h-4 w-4" />
                                  </Button>
                                )}
                                {!isArchived && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Arhivează"
                                    aria-label="Arhivează"
                                    disabled={isBusy}
                                    onClick={() => handleSingle(notification.id, 'archive')}
                                  >
                                    <Archive className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600"
                                  title="Șterge"
                                  aria-label="Șterge"
                                  disabled={isBusy}
                                  onClick={() => handleDelete(notification.id)}
                                >
                                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* E-mail send history (read-only, audit log) */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Căutare în istoric..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    aria-label="Căutare în istoric"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]" aria-label="Filtru categorie">
                    <SelectValue placeholder="Categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate categoriile</SelectItem>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Istoric notificări trimise prin e-mail
              </CardTitle>
              <CardDescription>
                Jurnalul notificărilor e-mail trimise de platformă către contul tău. Intrările sunt informative și nu pot fi modificate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground" role="status">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Se încarcă istoricul...</span>
                </div>
              ) : historyError ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <p className="text-lg font-medium">Istoricul nu a putut fi încărcat</p>
                  <p className="text-muted-foreground mb-4">{historyError}</p>
                  <Button variant="outline" onClick={() => void loadHistory()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reîncearcă
                  </Button>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">Nicio notificare</p>
                  <p className="text-muted-foreground">
                    {history.length > 0
                      ? 'Nicio intrare nu corespunde filtrelor selectate.'
                      : 'Nu a fost trimisă încă nicio notificare e-mail către contul tău.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.map((entry) => {
                    const category = normalizeCategory(entry.type);
                    return (
                      <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg border">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-xs bg-gray-100 text-gray-700">
                            <Mail className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{entry.title || 'Notificare'}</span>
                            <Badge variant="outline">{entry.type}</Badge>
                          </div>
                          {entry.message && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{entry.message}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {categoryIcons[category]}
                              <span>{categoryLabels[category]}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatRelative(entry.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {historyTotal > history.length && (
                    <p className="text-xs text-muted-foreground pt-2">
                      Se afișează {history.length} din {historyTotal} intrări.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Preferințe notificări e-mail
              </CardTitle>
              <CardDescription>
                Alege ce notificări primești prin e-mail. Modificările se salvează imediat.
                Notificările critice (bun venit, resetare parolă, export/ștergere GDPR) se trimit întotdeauna.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prefsLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground" role="status">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Se încarcă preferințele...</span>
                </div>
              ) : prefsError || !prefs ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <p className="text-lg font-medium">Preferințele nu au putut fi încărcate</p>
                  <p className="text-muted-foreground mb-4">{prefsError || 'Răspuns invalid de la server.'}</p>
                  <Button variant="outline" onClick={() => void loadPreferences()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reîncearcă
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {emailPrefMeta.map((meta) => (
                    <div key={meta.key} className="flex items-center justify-between gap-4 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-muted rounded-lg flex-shrink-0">{meta.icon}</div>
                        <div className="min-w-0">
                          <Label htmlFor={`pref-${meta.key}`} className="font-medium cursor-pointer">
                            {meta.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">{meta.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {prefsSaving === meta.key && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <Switch
                          id={`pref-${meta.key}`}
                          checked={prefs[meta.key]}
                          disabled={prefsSaving !== null}
                          onCheckedChange={(value) => handlePrefToggle(meta.key, value)}
                          aria-label={meta.label}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Notificările push, SMS și orele de liniște nu sunt încă disponibile în aplicație.
                Momentan se pot configura doar notificările prin e-mail.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
