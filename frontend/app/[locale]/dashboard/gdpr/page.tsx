'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { toastFromAnywhere } from '@/lib/toast-bus';
import { localePrefixFromPath } from '@/lib/locale';
import { useAuth } from '@/contexts/AuthContext';
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
  Loader2,
  Inbox,
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

// ---------------------------------------------------------------------------
// Types — mirror backend/src/gdpr/gdpr.dto.ts (NestJS, prefix /api/v1)
// ---------------------------------------------------------------------------
type DsrType =
  | 'DATA_EXPORT'
  | 'DATA_DELETION'
  | 'DATA_ACCESS'
  | 'DATA_RECTIFICATION'
  | 'CONSENT_WITHDRAWAL';

type DsrStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'COMPLETED' | 'REJECTED';

interface DsrRequest {
  id: string;
  userId: string;
  type: DsrType | string;
  status: DsrStatus | string;
  reason?: string | null;
  additionalDetails?: string | null;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  processedBy?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

type ConsentPurpose = 'ESSENTIAL' | 'ANALYTICS' | 'MARKETING' | 'PERSONALIZATION' | 'THIRD_PARTY_SHARING';

interface ConsentRecord {
  id: string;
  userId: string;
  purpose: ConsentPurpose | string;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

interface DataInventoryItem {
  category: string;
  dataTypes: string[];
  purpose: string;
  retention: string;
  legalBasis: string;
}

interface AuditLogEntry {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
  createdAt: string;
}

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const idle = <T,>(): AsyncState<T> => ({ data: null, loading: true, error: null });

// ---------------------------------------------------------------------------
// Labels (Romanian, with diacritics)
// ---------------------------------------------------------------------------
const DSR_TYPE_LABELS: Record<DsrType, string> = {
  DATA_ACCESS: 'Acces date (Art. 15)',
  DATA_EXPORT: 'Portabilitate (Art. 20)',
  DATA_DELETION: 'Ștergere (Art. 17)',
  DATA_RECTIFICATION: 'Rectificare (Art. 16)',
  CONSENT_WITHDRAWAL: 'Retragere consimțământ (Art. 7)',
};

const DSR_TYPE_COLORS: Record<DsrType, string> = {
  DATA_ACCESS: '#3B82F6',
  DATA_EXPORT: '#10B981',
  DATA_DELETION: '#EF4444',
  DATA_RECTIFICATION: '#F59E0B',
  CONSENT_WITHDRAWAL: '#8B5CF6',
};

const DSR_STATUS_LABELS: Record<DsrStatus, string> = {
  PENDING: 'În așteptare',
  IN_PROGRESS: 'În procesare',
  APPROVED: 'Aprobat',
  COMPLETED: 'Finalizat',
  REJECTED: 'Respins',
};

const CONSENT_PURPOSES: { key: ConsentPurpose; label: string; description: string; category: string; locked: boolean }[] = [
  { key: 'ESSENTIAL', label: 'Cookie-uri și prelucrări esențiale', description: 'Necesare pentru funcționarea platformei (autentificare, securitate).', category: 'Esențial', locked: true },
  { key: 'ANALYTICS', label: 'Analiză utilizare', description: 'Statistici anonimizate de trafic și utilizare a aplicației.', category: 'Analiză', locked: false },
  { key: 'MARKETING', label: 'Comunicări marketing', description: 'Newsletter, noutăți legislative și oferte.', category: 'Marketing', locked: false },
  { key: 'PERSONALIZATION', label: 'Personalizare', description: 'Recomandări și conținut adaptat activității dvs.', category: 'Funcțional', locked: false },
  { key: 'THIRD_PARTY_SHARING', label: 'Partajare cu terți', description: 'Transmiterea datelor către parteneri (integrări, furnizori).', category: 'Marketing', locked: false },
];

const RO_MONTHS = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];
const GDPR_DEADLINE_DAYS = 30; // Art. 12(3) GDPR — răspuns în cel mult o lună

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ro-RO');
}

function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ro-RO');
}

function deadlineOf(createdAt: string): Date {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + GDPR_DEADLINE_DAYS);
  return d;
}

function isOpen(status: string): boolean {
  return status === 'PENDING' || status === 'IN_PROGRESS' || status === 'APPROVED';
}

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

// ---------------------------------------------------------------------------
// Small shared UI states
// ---------------------------------------------------------------------------
function LoadingBlock({ label = 'Se încarcă…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Reîncearcă
      </Button>
    </div>
  );
}

function EmptyBlock({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function GdprPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const pathname = usePathname();
  const localePrefix = localePrefixFromPath(pathname || '');

  const [searchTerm, setSearchTerm] = useState('');
  const [dsrFilter, setDsrFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  // --- DSR requests ---------------------------------------------------------
  const [dsr, setDsr] = useState<AsyncState<DsrRequest[]>>(idle());
  const loadDsr = useCallback(async () => {
    setDsr((s) => ({ ...s, loading: true, error: null }));
    const r = await api.get<DsrRequest[]>('/gdpr/dsr-requests');
    if (r.status === 200 && Array.isArray(r.data)) {
      setDsr({ data: r.data, loading: false, error: null });
    } else {
      setDsr({ data: null, loading: false, error: r.error || 'Cererile DSR nu au putut fi încărcate.' });
    }
  }, []);

  // --- Consents -------------------------------------------------------------
  const [consents, setConsents] = useState<AsyncState<ConsentRecord[]>>(idle());
  const loadConsents = useCallback(async () => {
    setConsents((s) => ({ ...s, loading: true, error: null }));
    const r = await api.get<ConsentRecord[]>('/gdpr/consents');
    if (r.status === 200 && Array.isArray(r.data)) {
      setConsents({ data: r.data, loading: false, error: null });
    } else {
      setConsents({ data: null, loading: false, error: r.error || 'Consimțămintele nu au putut fi încărcate.' });
    }
  }, []);

  // --- Data inventory -------------------------------------------------------
  const [inventory, setInventory] = useState<AsyncState<DataInventoryItem[]>>(idle());
  const loadInventory = useCallback(async () => {
    setInventory((s) => ({ ...s, loading: true, error: null }));
    const r = await api.get<{ inventory: DataInventoryItem[] } | DataInventoryItem[]>('/gdpr/data-inventory');
    if (r.status === 200 && r.data) {
      const list = Array.isArray(r.data) ? r.data : r.data.inventory;
      setInventory({ data: Array.isArray(list) ? list : [], loading: false, error: null });
    } else {
      setInventory({ data: null, loading: false, error: r.error || 'Inventarul de date nu a putut fi încărcat.' });
    }
  }, []);

  // --- Audit trail ----------------------------------------------------------
  // Admin: /audit (tenant-scoped, paginated). Others: /audit-logs (own entries).
  const [audit, setAudit] = useState<AsyncState<AuditLogEntry[]>>(idle());
  const loadAudit = useCallback(async () => {
    setAudit((s) => ({ ...s, loading: true, error: null }));
    if (isAdmin) {
      const r = await api.get<{ data: AuditLogEntry[] }>('/audit', { params: { limit: 50 } });
      if (r.status === 200 && r.data && Array.isArray(r.data.data)) {
        setAudit({ data: r.data.data, loading: false, error: null });
        return;
      }
    }
    const r2 = await api.get<AuditLogEntry[]>('/audit-logs', { params: { limit: 50 } });
    if (r2.status === 200 && Array.isArray(r2.data)) {
      setAudit({ data: r2.data, loading: false, error: null });
    } else {
      setAudit({ data: null, loading: false, error: r2.error || 'Jurnalul de audit nu a putut fi încărcat.' });
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadDsr();
    void loadConsents();
    void loadInventory();
  }, [loadDsr, loadConsents, loadInventory]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  // --- Derived stats & charts (client-side, from real list) -----------------
  const dsrList = useMemo(() => dsr.data ?? [], [dsr.data]);

  const pendingDsrCount = dsrList.filter((d) => d.status === 'PENDING').length;
  const inProgressDsrCount = dsrList.filter((d) => d.status === 'IN_PROGRESS' || d.status === 'APPROVED').length;

  const now = new Date();
  const completedThisMonth = dsrList.filter((d) => {
    if (d.status !== 'COMPLETED') return false;
    const when = new Date(d.processedAt || d.updatedAt);
    return when.getFullYear() === now.getFullYear() && when.getMonth() === now.getMonth();
  }).length;

  const overdueCount = dsrList.filter((d) => isOpen(d.status) && deadlineOf(d.createdAt) < now).length;

  const avgProcessingDays = useMemo(() => {
    const done = dsrList.filter((d) => d.status === 'COMPLETED' && d.processedAt);
    if (done.length === 0) return null;
    const total = done.reduce((acc, d) => {
      const ms = new Date(d.processedAt as string).getTime() - new Date(d.createdAt).getTime();
      return acc + Math.max(0, ms) / 86_400_000;
    }, 0);
    return total / done.length;
  }, [dsrList]);

  const dsrTypeData = useMemo(() => {
    const counts = new Map<string, number>();
    dsrList.forEach((d) => counts.set(d.type, (counts.get(d.type) ?? 0) + 1));
    return Array.from(counts.entries()).map(([type, value]) => ({
      name: DSR_TYPE_LABELS[type as DsrType] ?? type,
      value,
      color: DSR_TYPE_COLORS[type as DsrType] ?? '#6B7280',
    }));
  }, [dsrList]);

  const dsrMonthlyData = useMemo(() => {
    const buckets: { key: string; month: string; pending: number; completed: number; rejected: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: RO_MONTHS[d.getMonth()], pending: 0, completed: 0, rejected: 0 });
    }
    dsrList.forEach((r) => {
      const c = new Date(r.createdAt);
      const b = buckets.find((x) => x.key === `${c.getFullYear()}-${c.getMonth()}`);
      if (!b) return;
      if (r.status === 'COMPLETED') b.completed += 1;
      else if (r.status === 'REJECTED') b.rejected += 1;
      else b.pending += 1;
    });
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsrList]);

  const filteredDsrRequests = dsrList.filter((d) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      d.id.toLowerCase().includes(q) ||
      d.userId.toLowerCase().includes(q) ||
      (d.reason ?? '').toLowerCase().includes(q);
    const matchesFilter = dsrFilter === 'all' || d.status === dsrFilter;
    return matchesSearch && matchesFilter;
  });

  // --- DSR: create ----------------------------------------------------------
  const [showNewForm, setShowNewForm] = useState(false);
  const [newType, setNewType] = useState<DsrType>('DATA_ACCESS');
  const [newReason, setNewReason] = useState('');
  const [creating, setCreating] = useState(false);

  const openNewForm = (type: DsrType) => {
    setNewType(type);
    setShowNewForm(true);
    setActiveTab('dsr');
  };

  const submitNewDsr = async () => {
    if (!newReason.trim()) {
      toastFromAnywhere('warning', 'Motiv lipsă', 'Descrieți pe scurt motivul cererii.');
      return;
    }
    setCreating(true);
    const r = await api.post<DsrRequest>('/gdpr/dsr-requests', { type: newType, reason: newReason.trim() });
    setCreating(false);
    if (r.status === 201 || r.status === 200) {
      toastFromAnywhere('success', 'Cerere înregistrată', 'Cererea DSR a fost creată. Termen legal de răspuns: 30 de zile.');
      setNewReason('');
      setShowNewForm(false);
      void loadDsr();
    } else {
      toastFromAnywhere('error', 'Cererea nu a fost înregistrată', r.error || 'Eroare la comunicarea cu serverul.');
    }
  };

  // --- DSR: update status (admin) ------------------------------------------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<DsrStatus>('IN_PROGRESS');
  const [editNotes, setEditNotes] = useState('');
  const [editRejection, setEditRejection] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (req: DsrRequest) => {
    setEditingId(req.id);
    setEditStatus(req.status === 'PENDING' ? 'IN_PROGRESS' : (req.status as DsrStatus));
    setEditNotes(req.adminNotes ?? '');
    setEditRejection(req.rejectionReason ?? '');
  };

  const saveStatus = async () => {
    if (!editingId) return;
    if (editStatus === 'REJECTED' && !editRejection.trim()) {
      toastFromAnywhere('warning', 'Motiv respingere lipsă', 'Pentru respingere este necesar un motiv (Art. 12(4) GDPR).');
      return;
    }
    setSaving(true);
    const body: { status: DsrStatus; adminNotes?: string; rejectionReason?: string } = { status: editStatus };
    if (editNotes.trim()) body.adminNotes = editNotes.trim();
    if (editStatus === 'REJECTED') body.rejectionReason = editRejection.trim();
    const r = await api.patch<DsrRequest>(`/gdpr/dsr-requests/${editingId}`, body);
    setSaving(false);
    if (r.status === 200) {
      toastFromAnywhere('success', 'Status actualizat', `Cererea ${shortId(editingId)} este acum: ${DSR_STATUS_LABELS[editStatus]}.`);
      setEditingId(null);
      void loadDsr();
    } else if (r.status === 403) {
      toastFromAnywhere('error', 'Acces interzis', 'Doar administratorii (DPO) pot modifica statusul cererilor DSR.');
    } else {
      toastFromAnywhere('error', 'Statusul nu a fost salvat', r.error || 'Eroare la comunicarea cu serverul.');
    }
  };

  // --- Consent toggle --------------------------------------------------------
  const [togglingPurpose, setTogglingPurpose] = useState<string | null>(null);
  const toggleConsent = async (purpose: ConsentPurpose, granted: boolean) => {
    setTogglingPurpose(purpose);
    const r = await api.put<ConsentRecord>('/gdpr/consents', { purpose, granted });
    setTogglingPurpose(null);
    if (r.status === 200 || r.status === 201) {
      toastFromAnywhere('success', granted ? 'Consimțământ acordat' : 'Consimțământ revocat', 'Modificarea a fost jurnalizată cu IP și dată.');
      void loadConsents();
    } else {
      toastFromAnywhere('error', 'Consimțământul nu a fost actualizat', r.error || 'Eroare la comunicarea cu serverul.');
    }
  };

  const consentByPurpose = useMemo(() => {
    const m = new Map<string, ConsentRecord>();
    (consents.data ?? []).forEach((c) => m.set(c.purpose, c));
    return m;
  }, [consents.data]);

  const consentHistory = useMemo(
    () => [...(consents.data ?? [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [consents.data],
  );

  // --- Export (Art. 20) -----------------------------------------------------
  const [exporting, setExporting] = useState(false);
  const exportMyData = async () => {
    setExporting(true);
    // Backend answers with Content-Type: application/json (attachment), so the
    // helper already parses it; we re-serialise to a downloadable file.
    const r = await api.get<Record<string, unknown>>('/gdpr/export');
    setExporting(false);
    if (r.status === 200 && r.data) {
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdpr-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toastFromAnywhere('success', 'Export generat', 'Fișierul JSON cu datele dvs. a fost descărcat.');
    } else {
      toastFromAnywhere('error', 'Exportul nu a reușit', r.error || 'Eroare la comunicarea cu serverul.');
    }
  };

  // --- Badges ---------------------------------------------------------------
  const getDsrStatusBadge = (status: string) => {
    const cfg: Record<DsrStatus, { variant: 'outline' | 'default' | 'destructive' | 'secondary'; icon: React.ElementType }> = {
      PENDING: { variant: 'outline', icon: Clock },
      IN_PROGRESS: { variant: 'default', icon: RefreshCw },
      APPROVED: { variant: 'secondary', icon: FileCheck },
      COMPLETED: { variant: 'default', icon: CheckCircle },
      REJECTED: { variant: 'destructive', icon: XCircle },
    };
    const c = cfg[status as DsrStatus] ?? { variant: 'outline' as const, icon: Clock };
    const Icon = c.icon;
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {DSR_STATUS_LABELS[status as DsrStatus] ?? status}
      </Badge>
    );
  };

  const getDsrTypeBadge = (type: string) => {
    const cfg: Record<DsrType, { color: string; icon: React.ElementType }> = {
      DATA_ACCESS: { color: 'bg-blue-100 text-blue-800', icon: Eye },
      DATA_DELETION: { color: 'bg-red-100 text-red-800', icon: Trash2 },
      DATA_EXPORT: { color: 'bg-green-100 text-green-800', icon: Download },
      DATA_RECTIFICATION: { color: 'bg-yellow-100 text-yellow-800', icon: FileCheck },
      CONSENT_WITHDRAWAL: { color: 'bg-purple-100 text-purple-800', icon: XCircle },
    };
    const c = cfg[type as DsrType] ?? { color: 'bg-gray-100 text-gray-800', icon: FileText };
    const Icon = c.icon;
    return (
      <Badge className={`${c.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {DSR_TYPE_LABELS[type as DsrType] ?? type}
      </Badge>
    );
  };

  const getConsentCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Esențial: 'bg-gray-100 text-gray-800',
      Funcțional: 'bg-blue-100 text-blue-800',
      Analiză: 'bg-green-100 text-green-800',
      Marketing: 'bg-purple-100 text-purple-800',
    };
    return colors[category] ?? 'bg-gray-100 text-gray-800';
  };

  const hasDsrData = !dsr.loading && !dsr.error && dsrList.length > 0;

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
          <Button variant="outline" onClick={() => void exportMyData()} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export datele mele
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void loadDsr();
              void loadConsents();
              void loadInventory();
              void loadAudit();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reîncarcă
          </Button>
        </div>
      </div>

      {/* Stats Cards — derived from the real DSR list */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cereri DSR în așteptare</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dsr.loading ? '…' : dsr.error ? '—' : pendingDsrCount}</div>
            <p className="text-xs text-muted-foreground">Termen legal: 30 zile (Art. 12(3) GDPR)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">În procesare</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dsr.loading ? '…' : dsr.error ? '—' : inProgressDsrCount}</div>
            <p className="text-xs text-muted-foreground">
              {avgProcessingDays === null
                ? 'Timp mediu: nu există cereri finalizate'
                : `Timp mediu de rezolvare: ${avgProcessingDays.toFixed(1)} zile`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Finalizate luna aceasta</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dsr.loading ? '…' : dsr.error ? '—' : completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {RO_MONTHS[now.getMonth()]} {now.getFullYear()} · total înregistrate: {dsr.error ? '—' : dsrList.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cereri cu termen depășit</CardTitle>
            <Shield className={`h-4 w-4 ${overdueCount > 0 ? 'text-red-500' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : ''}`}>
              {dsr.loading ? '…' : dsr.error ? '—' : overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {overdueCount > 0 ? 'Răspundeți de urgență — risc de sancțiune ANSPDCP' : 'Toate cererile deschise sunt în termen'}
            </p>
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
            <Card>
              <CardHeader>
                <CardTitle>Cereri DSR după tip</CardTitle>
                <CardDescription>Distribuția tuturor cererilor înregistrate</CardDescription>
              </CardHeader>
              <CardContent>
                {dsr.loading && <LoadingBlock />}
                {dsr.error && <ErrorBlock message={dsr.error} onRetry={() => void loadDsr()} />}
                {!dsr.loading && !dsr.error && dsrList.length === 0 && (
                  <EmptyBlock title="Nu există încă cereri DSR" hint="Graficul se populează automat din cererile reale." />
                )}
                {hasDsrData && (
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
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {dsrTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trend cereri DSR</CardTitle>
                <CardDescription>Ultimele 6 luni, după luna înregistrării</CardDescription>
              </CardHeader>
              <CardContent>
                {dsr.loading && <LoadingBlock />}
                {dsr.error && <ErrorBlock message={dsr.error} onRetry={() => void loadDsr()} />}
                {!dsr.loading && !dsr.error && dsrList.length === 0 && (
                  <EmptyBlock title="Nu există încă date pentru trend" />
                )}
                {hasDsrData && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dsrMonthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="pending" name="Deschise" fill="#F59E0B" />
                      <Bar dataKey="completed" name="Finalizate" fill="#10B981" />
                      <Bar dataKey="rejected" name="Respinse" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Acțiuni rapide GDPR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button variant="outline" className="h-24 flex-col" onClick={() => void exportMyData()} disabled={exporting}>
                  <Download className="h-6 w-6 mb-2" />
                  <span>Export date (Art. 20)</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col" onClick={() => openNewForm('DATA_DELETION')}>
                  <Trash2 className="h-6 w-6 mb-2" />
                  <span>Cerere ștergere (Art. 17)</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col" onClick={() => setActiveTab('consent')}>
                  <Settings className="h-6 w-6 mb-2" />
                  <span>Setări consimțământ</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col"
                  onClick={() => window.open(`${localePrefix}/privacy`, '_blank', 'noopener,noreferrer')}
                >
                  <FileText className="h-6 w-6 mb-2" />
                  <span>Politică de confidențialitate</span>
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
                <Button onClick={() => setShowNewForm((v) => !v)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cerere nouă
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showNewForm && (
                <div className="mb-6 rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-medium">Cerere DSR nouă</p>
                  <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
                    <Select value={newType} onValueChange={(v) => setNewType(v as DsrType)}>
                      <SelectTrigger aria-label="Tip cerere">
                        <SelectValue placeholder="Tip cerere" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(DSR_TYPE_LABELS) as DsrType[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {DSR_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Motivul cererii (obligatoriu)"
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                      aria-label="Motivul cererii"
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => void submitNewDsr()} disabled={creating}>
                        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Trimite
                      </Button>
                      <Button variant="ghost" onClick={() => setShowNewForm(false)}>
                        Anulează
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Caută după ID cerere, ID utilizator sau motiv…"
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
                    <SelectItem value="APPROVED">Aprobate</SelectItem>
                    <SelectItem value="COMPLETED">Finalizate</SelectItem>
                    <SelectItem value="REJECTED">Respinse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dsr.loading && <LoadingBlock label="Se încarcă cererile DSR…" />}
              {dsr.error && <ErrorBlock message={dsr.error} onRetry={() => void loadDsr()} />}
              {!dsr.loading && !dsr.error && dsrList.length === 0 && (
                <EmptyBlock
                  title="Nu există încă cereri DSR"
                  hint="Cererile persoanelor vizate (acces, ștergere, portabilitate, rectificare) vor apărea aici."
                />
              )}
              {!dsr.loading && !dsr.error && dsrList.length > 0 && filteredDsrRequests.length === 0 && (
                <EmptyBlock title="Nicio cerere nu corespunde filtrelor" />
              )}

              {filteredDsrRequests.length > 0 && (
                <ScrollArea className="h-[480px]">
                  <div className="space-y-4 pr-3">
                    {filteredDsrRequests.map((req) => {
                      const deadline = deadlineOf(req.createdAt);
                      const overdue = isOpen(req.status) && deadline < now;
                      const editing = editingId === req.id;
                      return (
                        <div key={req.id} className={`rounded-lg border p-4 ${overdue ? 'border-red-300' : ''}`}>
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-start gap-4">
                              <div className="rounded-full bg-muted p-2">
                                <User className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">Cerere {shortId(req.id)}</span>
                                  <span className="text-sm text-muted-foreground">Utilizator: {shortId(req.userId)}</span>
                                </div>
                                <p className="mt-2 text-sm">{req.reason || <span className="text-muted-foreground">Fără motiv specificat</span>}</p>
                                {req.additionalDetails && (
                                  <p className="text-xs text-muted-foreground mt-1">{req.additionalDetails}</p>
                                )}
                                {req.adminNotes && (
                                  <p className="text-xs mt-1"><span className="text-muted-foreground">Note DPO:</span> {req.adminNotes}</p>
                                )}
                                {req.rejectionReason && (
                                  <p className="text-xs mt-1 text-red-600"><span className="text-muted-foreground">Motiv respingere:</span> {req.rejectionReason}</p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {getDsrTypeBadge(req.type)}
                                  {getDsrStatusBadge(req.status)}
                                  {overdue && (
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Termen depășit
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm text-muted-foreground">Creat: {fmtDate(req.createdAt)}</p>
                              <p className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-orange-600'}`}>
                                Termen legal: {deadline.toLocaleDateString('ro-RO')}
                              </p>
                              {req.processedAt && (
                                <p className="text-sm text-green-600">Procesat: {fmtDate(req.processedAt)}</p>
                              )}
                              {isAdmin && !editing && (
                                <div className="mt-2 flex gap-2 justify-end">
                                  <Button size="sm" onClick={() => startEdit(req)}>
                                    {isOpen(req.status) ? 'Procesează' : 'Modifică status'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          {isAdmin && editing && (
                            <div className="mt-4 rounded-md bg-muted/40 p-3 space-y-3">
                              <div className="grid gap-3 md:grid-cols-[200px_1fr]">
                                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as DsrStatus)}>
                                  <SelectTrigger aria-label="Status nou">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(DSR_STATUS_LABELS) as DsrStatus[]).map((s) => (
                                      <SelectItem key={s} value={s}>
                                        {DSR_STATUS_LABELS[s]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder="Note interne DPO (opțional)"
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  aria-label="Note DPO"
                                />
                              </div>
                              {editStatus === 'REJECTED' && (
                                <Input
                                  placeholder="Motivul respingerii (obligatoriu, comunicat persoanei vizate)"
                                  value={editRejection}
                                  onChange={(e) => setEditRejection(e.target.value)}
                                  aria-label="Motiv respingere"
                                />
                              )}
                              <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={saving}>
                                  Anulează
                                </Button>
                                <Button size="sm" onClick={() => void saveStatus()} disabled={saving}>
                                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Salvează status
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {!isAdmin && !dsr.loading && !dsr.error && dsrList.length > 0 && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Modificarea statusului cererilor este rezervată administratorului (DPO).
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consent Tab */}
        <TabsContent value="consent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestionare consimțământ</CardTitle>
              <CardDescription>
                Setări consimțământ conform Art. 7 GDPR — explicit, specific și revocabil oricând
              </CardDescription>
            </CardHeader>
            <CardContent>
              {consents.loading && <LoadingBlock label="Se încarcă consimțămintele…" />}
              {consents.error && <ErrorBlock message={consents.error} onRetry={() => void loadConsents()} />}
              {!consents.loading && !consents.error && (
                <div className="space-y-4">
                  {CONSENT_PURPOSES.map((p) => {
                    const rec = consentByPurpose.get(p.key);
                    const granted = p.locked ? true : rec?.granted ?? false;
                    const recorded = p.locked || Boolean(rec);
                    const busy = togglingPurpose === p.key;
                    return (
                      <div key={p.key} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`rounded-full p-2 ${granted ? 'bg-green-100' : 'bg-gray-100'}`}>
                            {granted ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{p.label}</span>
                              <Badge className={getConsentCategoryColor(p.category)}>{p.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{p.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {p.locked
                                ? 'Bază legală: interes legitim / executare contract — nu necesită consimțământ'
                                : rec
                                  ? `Ultima actualizare: ${fmtDateTime(rec.timestamp)}${rec.ipAddress ? ` · IP ${rec.ipAddress}` : ''}`
                                  : 'Nicio opțiune înregistrată încă'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={granted ? 'default' : 'secondary'}>
                            {p.locked ? 'Necesar' : !recorded ? 'Neînregistrat' : granted ? 'Acordat' : 'Revocat'}
                          </Badge>
                          {!p.locked && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => void toggleConsent(p.key, !granted)}
                            >
                              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {granted ? 'Revocă' : 'Acordă'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Istoric consimțământ</CardTitle>
              <CardDescription>Ultima modificare înregistrată pentru fiecare scop</CardDescription>
            </CardHeader>
            <CardContent>
              {consents.loading && <LoadingBlock />}
              {consents.error && <ErrorBlock message={consents.error} onRetry={() => void loadConsents()} />}
              {!consents.loading && !consents.error && consentHistory.length === 0 && (
                <EmptyBlock title="Nu există încă modificări de consimțământ înregistrate" />
              )}
              {!consents.loading && !consents.error && consentHistory.length > 0 && (
                <div className="space-y-2">
                  {consentHistory.map((c) => {
                    const meta = CONSENT_PURPOSES.find((p) => p.key === c.purpose);
                    return (
                      <div key={c.id} className="flex flex-wrap items-center gap-4 py-2 text-sm">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{fmtDateTime(c.timestamp)}</span>
                        <span>
                          {meta?.label ?? c.purpose}: {c.granted ? 'acordat' : 'revocat'}
                        </span>
                        {c.ipAddress && <span className="text-xs text-muted-foreground">IP {c.ipAddress}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventar date personale</CardTitle>
              <CardDescription>
                Registru categorii de prelucrare conform Art. 30 GDPR (categorii, scop, retenție, bază legală)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inventory.loading && <LoadingBlock label="Se încarcă inventarul de date…" />}
              {inventory.error && <ErrorBlock message={inventory.error} onRetry={() => void loadInventory()} />}
              {!inventory.loading && !inventory.error && (inventory.data?.length ?? 0) === 0 && (
                <EmptyBlock title="Nu există încă date în inventar" />
              )}
              {!inventory.loading && !inventory.error && (inventory.data?.length ?? 0) > 0 && (
                <div className="space-y-4">
                  {(inventory.data ?? []).map((item, index) => (
                    <div key={`${item.category}-${index}`} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Database className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{item.category}</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(item.dataTypes ?? []).map((type, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
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
                  <p className="text-xs text-muted-foreground">
                    Numărul de înregistrări pe categorie nu este încă furnizat de server — nu este afișat.
                  </p>
                </div>
              )}
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
                    {isAdmin
                      ? 'Jurnal acces și modificări date pentru organizație (ultimele 50 de intrări)'
                      : 'Jurnalul acțiunilor contului dvs. (ultimele 50 de intrări)'}
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => void loadAudit()} disabled={audit.loading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reîncarcă
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {audit.loading && <LoadingBlock label="Se încarcă jurnalul de audit…" />}
              {audit.error && <ErrorBlock message={audit.error} onRetry={() => void loadAudit()} />}
              {!audit.loading && !audit.error && (audit.data?.length ?? 0) === 0 && (
                <EmptyBlock title="Nu există încă intrări în jurnalul de audit" />
              )}
              {!audit.loading && !audit.error && (audit.data?.length ?? 0) > 0 && (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-3">
                    {(audit.data ?? []).map((log) => {
                      const detailsText =
                        typeof log.details === 'string'
                          ? log.details
                          : log.details && Object.keys(log.details).length > 0
                            ? JSON.stringify(log.details)
                            : null;
                      return (
                        <div key={log.id} className="flex items-start gap-4 rounded-lg border p-3">
                          <div className="rounded-full bg-muted p-2">
                            <Lock className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{log.action}</Badge>
                              <span className="text-sm text-muted-foreground">{fmtDateTime(log.createdAt)}</span>
                            </div>
                            {detailsText && <p className="text-sm mt-1 break-all">{detailsText}</p>}
                            <div className="flex flex-wrap gap-4 mt-1 text-xs text-muted-foreground">
                              <span>Utilizator: {log.userName || log.userEmail || shortId(log.userId)}</span>
                              {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                              <span>Entitate: {log.entity}{log.entityId ? ` (${shortId(log.entityId)})` : ''}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
