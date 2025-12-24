'use client';

import { useState } from 'react';
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
  Filter,
  Settings,
  Inbox,
  Archive,
  Trash2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Mail,
  MessageSquare,
  Smartphone,
  BellRing,
  Clock,
  Calendar,
  FileText,
  Euro,
  Users,
  Building2,
  ChevronRight,
  MoreHorizontal,
  Check,
  X,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
} from 'lucide-react';

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
type NotificationStatus = 'unread' | 'read' | 'archived';
type NotificationCategory = 'system' | 'finance' | 'hr' | 'compliance' | 'alerts' | 'reminders';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  icon?: string;
  actionUrl?: string;
  actionLabel?: string;
  sender?: string;
  senderInitials?: string;
  createdAt: string;
}

interface NotificationPreference {
  category: NotificationCategory;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

// Sample notifications
const sampleNotifications: Notification[] = [
  {
    id: '1',
    title: 'Factură nouă recepționată',
    message: 'Factura #INV-2024-0892 de la Furnizor SRL a fost primită și necesită aprobare.',
    type: 'invoice_received',
    category: 'finance',
    priority: 'high',
    status: 'unread',
    actionUrl: '/dashboard/invoices/INV-2024-0892',
    actionLabel: 'Vizualizare',
    sender: 'Sistem Facturare',
    senderInitials: 'SF',
    createdAt: '2024-12-14T09:30:00',
  },
  {
    id: '2',
    title: 'Termen limită ANAF mâine',
    message: 'Declarația D406 SAF-T pentru luna noiembrie trebuie depusă până mâine, 15 decembrie.',
    type: 'deadline_reminder',
    category: 'compliance',
    priority: 'urgent',
    status: 'unread',
    actionUrl: '/dashboard/anaf/d406',
    actionLabel: 'Depune acum',
    sender: 'ANAF Compliance',
    senderInitials: 'AC',
    createdAt: '2024-12-14T08:00:00',
  },
  {
    id: '3',
    title: 'Contract semnat',
    message: 'Contractul pentru Andrei Marin a fost semnat de ambele părți și este acum activ.',
    type: 'contract_signed',
    category: 'hr',
    priority: 'normal',
    status: 'unread',
    actionUrl: '/dashboard/contracts/3',
    actionLabel: 'Vezi contract',
    sender: 'HR System',
    senderInitials: 'HR',
    createdAt: '2024-12-14T07:15:00',
  },
  {
    id: '4',
    title: 'Stoc scăzut: Toner HP 85A',
    message: 'Produsul PROD-002 are doar 8 unități în stoc. Nivelul minim este 10.',
    type: 'low_stock_alert',
    category: 'alerts',
    priority: 'high',
    status: 'read',
    actionUrl: '/dashboard/inventory?filter=low_stock',
    actionLabel: 'Comandă',
    sender: 'Inventar',
    senderInitials: 'IN',
    createdAt: '2024-12-13T16:00:00',
  },
  {
    id: '5',
    title: 'Plată procesată cu succes',
    message: 'Plata de 15.000 RON către Furnizor ABC a fost procesată cu succes.',
    type: 'payment_processed',
    category: 'finance',
    priority: 'normal',
    status: 'read',
    sender: 'Trezorerie',
    senderInitials: 'TR',
    createdAt: '2024-12-13T14:30:00',
  },
  {
    id: '6',
    title: 'Ședință programată',
    message: 'Ați fost invitat la ședința "Buget Q1 2025" pe 16 decembrie la 10:00.',
    type: 'calendar_event',
    category: 'reminders',
    priority: 'normal',
    status: 'read',
    actionUrl: '/dashboard/calendar',
    actionLabel: 'Vezi calendar',
    sender: 'Calendar',
    senderInitials: 'CA',
    createdAt: '2024-12-13T11:00:00',
  },
  {
    id: '7',
    title: 'Backup completat',
    message: 'Backup-ul zilnic al bazei de date a fost completat cu succes.',
    type: 'system_backup',
    category: 'system',
    priority: 'low',
    status: 'read',
    sender: 'Sistem',
    senderInitials: 'SY',
    createdAt: '2024-12-13T03:00:00',
  },
  {
    id: '8',
    title: 'Reconciliere bancară completată',
    message: '156 tranzacții au fost potrivite automat. 3 necesită verificare manuală.',
    type: 'bank_reconciliation',
    category: 'finance',
    priority: 'normal',
    status: 'archived',
    actionUrl: '/dashboard/bank-reconciliation',
    actionLabel: 'Verifică',
    sender: 'Reconciliere',
    senderInitials: 'RB',
    createdAt: '2024-12-12T18:00:00',
  },
];

const samplePreferences: NotificationPreference[] = [
  {
    category: 'finance',
    label: 'Financiar',
    description: 'Facturi, plăți, reconcilieri bancare',
    email: true,
    push: true,
    sms: false,
    inApp: true,
  },
  {
    category: 'compliance',
    label: 'Conformitate',
    description: 'Termene ANAF, declarații, raportări',
    email: true,
    push: true,
    sms: true,
    inApp: true,
  },
  {
    category: 'hr',
    label: 'Resurse Umane',
    description: 'Contracte, concedii, cereri angajați',
    email: true,
    push: false,
    sms: false,
    inApp: true,
  },
  {
    category: 'alerts',
    label: 'Alerte',
    description: 'Stoc scăzut, probleme sistem, avertizări',
    email: true,
    push: true,
    sms: false,
    inApp: true,
  },
  {
    category: 'reminders',
    label: 'Memento-uri',
    description: 'Calendar, task-uri, termene interne',
    email: false,
    push: true,
    sms: false,
    inApp: true,
  },
  {
    category: 'system',
    label: 'Sistem',
    description: 'Backup-uri, actualizări, mentenanță',
    email: false,
    push: false,
    sms: false,
    inApp: true,
  },
];

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

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [preferences, setPreferences] = useState(samplePreferences);
  const [muteAll, setMuteAll] = useState(false);

  // Calculate statistics
  const stats = {
    total: sampleNotifications.length,
    unread: sampleNotifications.filter(n => n.status === 'unread').length,
    urgent: sampleNotifications.filter(n => n.priority === 'urgent' && n.status === 'unread').length,
    archived: sampleNotifications.filter(n => n.status === 'archived').length,
  };

  // Filter notifications based on tab and filters
  const getFilteredNotifications = () => {
    let filtered = sampleNotifications;

    // Filter by tab (status)
    if (activeTab === 'inbox') {
      filtered = filtered.filter(n => n.status !== 'archived');
    } else if (activeTab === 'unread') {
      filtered = filtered.filter(n => n.status === 'unread');
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(n => n.status === 'archived');
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(n => n.category === categoryFilter);
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(n => n.priority === priorityFilter);
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `acum ${minutes} minute`;
    if (hours < 24) return `acum ${hours} ore`;
    if (days < 7) return `acum ${days} zile`;
    return date.toLocaleDateString('ro-RO');
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedNotifications.includes(id)) {
      setSelectedNotifications(selectedNotifications.filter(nId => nId !== id));
    } else {
      setSelectedNotifications([...selectedNotifications, id]);
    }
  };

  const updatePreference = (
    category: NotificationCategory,
    channel: 'email' | 'push' | 'sms' | 'inApp',
    value: boolean
  ) => {
    setPreferences(preferences.map(p =>
      p.category === category ? { ...p, [channel]: value } : p
    ));
  };

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="mute-all"
              checked={muteAll}
              onCheckedChange={setMuteAll}
            />
            <Label htmlFor="mute-all" className="flex items-center gap-1 cursor-pointer">
              {muteAll ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muteAll ? 'Sunet dezactivat' : 'Sunet activat'}
            </Label>
          </div>
          <Button variant="outline">
            <CheckCircle className="mr-2 h-4 w-4" />
            Marchează citite
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
                <div className="text-2xl font-bold">{stats.total - stats.archived}</div>
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
                <div className="text-2xl font-bold">{stats.unread}</div>
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
                <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
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
                <div className="text-2xl font-bold">{stats.archived}</div>
                <div className="text-sm text-muted-foreground">Arhivate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Preferințe
          </TabsTrigger>
        </TabsList>

        {/* Inbox/Unread/Archived Tab */}
        {['inbox', 'unread', 'archived'].map(tab => (
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
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Categorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate</SelectItem>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Prioritate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate</SelectItem>
                      {Object.entries(priorityLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedNotifications.length > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {selectedNotifications.length} notificar{selectedNotifications.length > 1 ? 'i' : 'e'} selectat{selectedNotifications.length > 1 ? 'e' : 'ă'}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Check className="mr-2 h-3 w-3" />
                        Marchează citite
                      </Button>
                      <Button variant="outline" size="sm">
                        <Archive className="mr-2 h-3 w-3" />
                        Arhivează
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        <Trash2 className="mr-2 h-3 w-3" />
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
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">Nicio notificare</p>
                    <p className="text-muted-foreground">
                      {activeTab === 'unread' ? 'Ai citit toate notificările!' : 'Nu există notificări în această secțiune.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Select All */}
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Checkbox
                        checked={selectedNotifications.length === filteredNotifications.length}
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="text-sm text-muted-foreground">
                        Selectează toate
                      </span>
                    </div>

                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                          notification.status === 'unread' ? 'bg-blue-50/50 border-blue-100' : 'hover:bg-muted/50'
                        } ${selectedNotifications.includes(notification.id) ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => {}}
                      >
                        <Checkbox
                          checked={selectedNotifications.includes(notification.id)}
                          onCheckedChange={() => toggleSelect(notification.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={`text-xs ${
                            notification.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            notification.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {notification.senderInitials || 'SY'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                {notification.status === 'unread' && (
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                )}
                                <span className={`font-medium ${notification.status === 'unread' ? '' : 'text-muted-foreground'}`}>
                                  {notification.title}
                                </span>
                                <Badge className={priorityColors[notification.priority]}>
                                  {priorityLabels[notification.priority]}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  {categoryIcons[notification.category]}
                                  <span>{categoryLabels[notification.category]}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDate(notification.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {notification.actionUrl && (
                                <Button size="sm">
                                  {notification.actionLabel || 'Acțiune'}
                                  <ChevronRight className="ml-1 h-3 w-3" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferințe Notificări</CardTitle>
              <CardDescription>
                Configurează cum și când primești notificări pentru fiecare categorie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Channel Headers */}
                <div className="grid grid-cols-5 gap-4 pb-4 border-b">
                  <div className="col-span-1"></div>
                  <div className="flex flex-col items-center gap-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Email</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Push</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">SMS</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">In-App</span>
                  </div>
                </div>

                {/* Preferences by Category */}
                {preferences.map((pref) => (
                  <div key={pref.category} className="grid grid-cols-5 gap-4 items-center py-4 border-b last:border-0">
                    <div className="col-span-1">
                      <div className="flex items-center gap-2">
                        {categoryIcons[pref.category]}
                        <div>
                          <p className="font-medium">{pref.label}</p>
                          <p className="text-xs text-muted-foreground">{pref.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={pref.email}
                        onCheckedChange={(value) => updatePreference(pref.category, 'email', value)}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={pref.push}
                        onCheckedChange={(value) => updatePreference(pref.category, 'push', value)}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={pref.sms}
                        onCheckedChange={(value) => updatePreference(pref.category, 'sms', value)}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={pref.inApp}
                        onCheckedChange={(value) => updatePreference(pref.category, 'inApp', value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Ore de Liniște</CardTitle>
              <CardDescription>
                Dezactivează notificările push și SMS în anumite intervale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <VolumeX className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Activează ore de liniște</p>
                      <p className="text-sm text-muted-foreground">Nu primi notificări în intervalul specificat</p>
                    </div>
                  </div>
                  <Switch />
                </div>
                <div className="grid grid-cols-2 gap-4 pl-12">
                  <div>
                    <Label>Ora de început</Label>
                    <Input type="time" defaultValue="22:00" className="mt-1" />
                  </div>
                  <div>
                    <Label>Ora de sfârșit</Label>
                    <Input type="time" defaultValue="07:00" className="mt-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Digest */}
          <Card>
            <CardHeader>
              <CardTitle>Rezumat Email</CardTitle>
              <CardDescription>
                Primește un rezumat periodic al notificărilor importante
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Rezumat zilnic</p>
                      <p className="text-sm text-muted-foreground">Primește un email cu rezumatul zilei la ora 08:00</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Rezumat săptămânal</p>
                      <p className="text-sm text-muted-foreground">Primește un email cu rezumatul săptămânii luni dimineața</p>
                    </div>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button>
              <Check className="mr-2 h-4 w-4" />
              Salvează preferințele
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
