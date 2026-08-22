'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { toastFromAnywhere } from '@/lib/toast-bus';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Calendar,
  FileText,
  RefreshCw,
  BarChart3,
  ListChecks,
  Loader2,
  ExternalLink,
  Info,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Backend response types (mirrors NestJS controllers/services, /api/v1 prefix)
// ---------------------------------------------------------------------------

/** GET /compliance/anaf-status/dashboard */
interface AnafOverview {
  efactura: { pending: number; submitted: number; accepted: number; rejected: number };
  saft: { lastSubmission: string | null; status: string; nextDeadline: string };
  d112: { lastSubmission: string | null; currentPeriod: string; submitted: boolean };
  d394: { lastSubmission: string | null; currentPeriod: string; submitted: boolean };
  revisal: { pendingChanges: number; lastSubmission: string | null };
}

interface AnafDeadline {
  type: string;
  name: string;
  period?: string;
  deadline: string;
  daysRemaining: number;
  status: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  pendingChanges?: number;
}

interface AnafSubmission {
  id: string;
  type: string;
  referenceId?: string;
  status: string;
  submittedAt: string;
  processedAt?: string;
  errorMessage?: string;
  indexIncarcare?: string;
}

interface AnafDashboard {
  overview: AnafOverview;
  deadlines: AnafDeadline[];
  recentSubmissions: AnafSubmission[];
  complianceScore: number;
  alerts: number;
}

/** GET /compliance/anaf-status/submissions */
interface AnafSubmissionsResponse {
  submissions: AnafSubmission[];
  count: number;
}

/** GET /saft-d406/dashboard */
interface SaftComplianceStatus {
  isCompliant: boolean;
  submissionDeadline: string;
  daysUntilDeadline: number;
  periodStatus: 'pending' | 'submitted' | 'accepted' | 'rejected' | 'overdue';
  gracePeriodActive: boolean;
  gracePeriodEnds?: string;
  recommendations: string[];
}

interface SaftReport {
  id: string;
  period: string;
  reportType: string;
  status: 'DRAFT' | 'VALIDATING' | 'VALIDATED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | string;
  validated: boolean;
  validatedAt?: string | null;
  submittedAt?: string | null;
  spvRef?: string | null;
  createdAt: string;
}

interface SaftDashboard {
  currentPeriod: { period: string; compliance: SaftComplianceStatus };
  previousPeriod: {
    period: string;
    compliance: SaftComplianceStatus;
    checklist?: { ready: boolean; checklist: { item: string; status: 'ok' | 'warning' | 'error'; detail: string }[] };
  };
  submissionStats: { draft: number; submitted: number; accepted: number; rejected: number };
  recentReports: SaftReport[];
  deadlines?: {
    currentPeriod: string;
    nextDeadline: string;
    daysUntilDeadline: number;
    isOverdue: boolean;
    gracePeriod: { active: boolean; start: string; end: string; description: string };
  };
  alerts: { type: 'info' | 'warning' | 'error'; message: string }[];
}

/** GET /deadlines/upcoming, /deadlines/overdue, /deadlines/summary */
interface StatutoryDeadline {
  id: string;
  type: string;
  description: string;
  descriptionRo: string;
  dueDate: string;
  status: 'PENDING' | 'REMINDED' | 'COMPLETED' | 'OVERDUE';
  law: string;
  penalty?: string;
}

interface DeadlinesListResponse {
  deadlines: StatutoryDeadline[];
}

interface DeadlineSummary {
  upcoming: number;
  overdue: number;
  completedThisMonth: number;
  nextDeadline: StatutoryDeadline | null;
}

/** GET /compliance/calendar/upcoming, /compliance/calendar/stats (wrapped in { success, data }) */
interface InternalDeadline {
  id: string;
  title: string;
  description: string;
  category: string;
  authority: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'waived';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface InternalCalendarUpcoming {
  success: boolean;
  data: { deadlines: InternalDeadline[] };
}

interface InternalCalendarStats {
  success: boolean;
  data: {
    totalDeadlines: number;
    pendingDeadlines: number;
    overdueDeadlines: number;
    completedThisMonth: number;
    upcomingThisWeek: number;
    upcomingThisMonth: number;
    complianceScore: number;
  };
}

/** GET /gdpr/consents, /gdpr/dsr-requests */
interface GdprConsent {
  id: string;
  purpose: string;
  granted: boolean;
  timestamp: string;
}

interface GdprDsrRequest {
  id: string;
  type: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | string;
  createdAt?: string;
}

/** GET /compliance/dashboard (SOC 2, ADMIN/ACCOUNTANT only) */
interface Soc2Dashboard {
  overallCompliance: number;
  controlsByCategory: Record<string, { compliant: number; total: number; percentage: number }>;
  incidentMetrics?: { total: number; open: number; resolved: number };
  accessReviewStats?: { total: number; reviewedInLast90Days: number };
  riskSummary?: { total: number; overdueReviews: number };
}

// ---------------------------------------------------------------------------
// Tiny resource hook — loading / error / data per endpoint
// ---------------------------------------------------------------------------

interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  status: number;
  reload: () => void;
}

function useResource<T>(path: string, params?: Record<string, string | number>): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(0);
  const [tick, setTick] = useState(0);
  const paramsKey = JSON.stringify(params ?? {});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<T>(path, { params: JSON.parse(paramsKey) })
      .then((r) => {
        if (cancelled) return;
        setStatus(r.status);
        if (r.data !== undefined && !r.error) {
          setData(r.data);
        } else {
          setData(null);
          setError(r.error || `Eroare ${r.status}`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, paramsKey, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, status, reload };
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

type ReqStatus = 'compliant' | 'warning' | 'non_compliant' | 'pending';

interface RequirementItem {
  id: string;
  name: string;
  description: string;
  category: 'anaf' | 'gdpr' | 'soc2';
  status: ReqStatus;
  detail?: string;
  source: string;
  href?: string;
}

const statusColors: Record<ReqStatus, string> = {
  compliant: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  non_compliant: 'bg-red-100 text-red-800',
  pending: 'bg-blue-100 text-blue-800',
};

const statusLabels: Record<ReqStatus, string> = {
  compliant: 'Conform',
  warning: 'Atenție',
  non_compliant: 'Neconform',
  pending: 'Fără date',
};

const categoryLabels = { anaf: 'ANAF', gdpr: 'GDPR', soc2: 'SOC 2' } as const;

const submissionStatusLabels: Record<string, string> = {
  PENDING: 'În așteptare',
  SUBMITTED: 'Depus',
  PROCESSING: 'În procesare',
  ACCEPTED: 'Acceptat',
  REJECTED: 'Respins',
  ERROR: 'Eroare',
  URGENT: 'Urgent',
  COMPLETED: 'Finalizat',
  DRAFT: 'Ciornă',
  VALIDATING: 'În validare',
  VALIDATED: 'Validat',
  NOT_SUBMITTED: 'Nedepus',
  REMINDED: 'Notificat',
  OVERDUE: 'Întârziat',
};

const submissionStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  VALIDATED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  ERROR: 'bg-red-100 text-red-800',
  OVERDUE: 'bg-red-100 text-red-800',
  URGENT: 'bg-orange-100 text-orange-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  VALIDATING: 'bg-gray-100 text-gray-800',
  NOT_SUBMITTED: 'bg-gray-100 text-gray-800',
  REMINDED: 'bg-yellow-100 text-yellow-800',
};

const saftPeriodLabels: Record<SaftComplianceStatus['periodStatus'], string> = {
  pending: 'De depus',
  submitted: 'Depus',
  accepted: 'Acceptat',
  rejected: 'Respins',
  overdue: 'Întârziat',
};

const anafTypeLabels: Record<string, string> = {
  EFACTURA: 'e-Factura',
  SAFT: 'SAF-T D406',
  D406: 'SAF-T D406',
  D112: 'D112',
  D394: 'D394',
  REVISAL: 'REVISAL',
};

function statusLabel(s: string | undefined): string {
  if (!s) return '—';
  return submissionStatusLabels[s.toUpperCase()] ?? s;
}

function statusColor(s: string | undefined): string {
  if (!s) return 'bg-gray-100 text-gray-800';
  return submissionStatusColors[s.toUpperCase()] ?? 'bg-gray-100 text-gray-800';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ro-RO');
}

function formatPeriod(period: string | undefined): string {
  if (!period) return '—';
  const [y, m] = period.split('-');
  const month = Number(m);
  if (!y || !month) return period;
  const label = new Date(Number(y), month - 1, 1).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function StatusIcon({ status, className = 'h-4 w-4' }: { status: ReqStatus; className?: string }) {
  if (status === 'compliant') return <CheckCircle className={`${className} text-green-500`} />;
  if (status === 'warning') return <AlertTriangle className={`${className} text-yellow-500`} />;
  if (status === 'non_compliant') return <AlertCircle className={`${className} text-red-500`} />;
  return <Info className={`${className} text-blue-500`} />;
}

function LoadingBlock({ label = 'Se încarcă…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <AlertCircle className="h-6 w-6 text-red-500" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-3 w-3" />
        Reîncearcă
      </Button>
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState('overview');

  const anaf = useResource<AnafDashboard>('/compliance/anaf-status/dashboard');
  const submissions = useResource<AnafSubmissionsResponse>('/compliance/anaf-status/submissions', { limit: 50 });
  const saft = useResource<SaftDashboard>('/saft-d406/dashboard');
  const upcoming = useResource<DeadlinesListResponse>('/deadlines/upcoming', { days: 90 });
  const overdue = useResource<DeadlinesListResponse>('/deadlines/overdue');
  const summary = useResource<DeadlineSummary>('/deadlines/summary');
  const internalUpcoming = useResource<InternalCalendarUpcoming>('/compliance/calendar/upcoming', { days: 90 });
  const internalStats = useResource<InternalCalendarStats>('/compliance/calendar/stats');
  const consents = useResource<GdprConsent[]>('/gdpr/consents');
  const dsr = useResource<GdprDsrRequest[]>('/gdpr/dsr-requests');
  const soc2 = useResource<Soc2Dashboard>('/compliance/dashboard');

  const reloadAll = () => {
    [anaf, submissions, saft, upcoming, overdue, summary, internalUpcoming, internalStats, consents, dsr, soc2].forEach((r) =>
      r.reload(),
    );
    toastFromAnywhere('info', 'Reîncărcare', 'Datele de conformitate se actualizează din server.');
  };

  // ---- Derived requirement items (each traced to a backend field) ----------
  const anafItems: RequirementItem[] = useMemo(() => {
    const ov = anaf.data?.overview;
    if (!ov) return [];
    const ef = ov.efactura;
    const efTotal = ef.pending + ef.submitted + ef.accepted + ef.rejected;
    const saftStatus = (ov.saft.status || '').toUpperCase();
    const items: RequirementItem[] = [
      {
        id: 'efactura',
        name: 'e-Factura (SPV)',
        description: 'Depuneri B2B/B2G înregistrate în sistem',
        category: 'anaf',
        status: ef.rejected > 0 ? 'non_compliant' : efTotal === 0 ? 'pending' : ef.pending > 0 ? 'warning' : 'compliant',
        detail:
          efTotal === 0
            ? 'Nicio depunere e-Factura înregistrată'
            : `${ef.accepted} acceptate · ${ef.submitted} depuse · ${ef.pending} în așteptare · ${ef.rejected} respinse`,
        source: 'GET /compliance/anaf-status/dashboard → overview.efactura',
        href: '/dashboard/efactura',
      },
      {
        id: 'saft',
        name: 'SAF-T D406',
        description: 'Raportare lunară XML (Ordin 1783/2021)',
        category: 'anaf',
        status:
          saftStatus === 'ACCEPTED'
            ? 'compliant'
            : saftStatus === 'REJECTED' || saftStatus === 'ERROR'
              ? 'non_compliant'
              : saftStatus === 'SUBMITTED' || saftStatus === 'PROCESSING'
                ? 'warning'
                : 'pending',
        detail: `Ultima depunere: ${formatDate(ov.saft.lastSubmission)} · Stare: ${statusLabel(saftStatus)} · Următorul termen: ${formatDate(ov.saft.nextDeadline)}`,
        source: 'GET /compliance/anaf-status/dashboard → overview.saft',
        href: '/dashboard/saft',
      },
      {
        id: 'd112',
        name: 'D112 – Contribuții sociale',
        description: `Perioada curentă ${formatPeriod(ov.d112.currentPeriod)}`,
        category: 'anaf',
        status: ov.d112.submitted ? 'compliant' : 'warning',
        detail: ov.d112.submitted ? 'Depusă pentru perioada curentă' : `Nedepusă pentru perioada curentă · Ultima depunere: ${formatDate(ov.d112.lastSubmission)}`,
        source: 'GET /compliance/anaf-status/dashboard → overview.d112',
      },
      {
        id: 'd394',
        name: 'D394 – Livrări/achiziții naționale',
        description: `Perioada curentă ${formatPeriod(ov.d394.currentPeriod)}`,
        category: 'anaf',
        status: ov.d394.submitted ? 'compliant' : 'warning',
        detail: ov.d394.submitted ? 'Depusă pentru perioada curentă' : `Nedepusă pentru perioada curentă · Ultima depunere: ${formatDate(ov.d394.lastSubmission)}`,
        source: 'GET /compliance/anaf-status/dashboard → overview.d394',
      },
      {
        id: 'revisal',
        name: 'REVISAL',
        description: 'Registrul general de evidență a salariaților',
        category: 'anaf',
        status: ov.revisal.pendingChanges > 0 ? 'warning' : 'compliant',
        detail:
          ov.revisal.pendingChanges > 0
            ? `${ov.revisal.pendingChanges} modificări de angajați de transmis · Ultima transmitere: ${formatDate(ov.revisal.lastSubmission)}`
            : `Nicio modificare în așteptare · Ultima transmitere: ${formatDate(ov.revisal.lastSubmission)}`,
        source: 'GET /compliance/anaf-status/dashboard → overview.revisal',
        href: '/dashboard/hr',
      },
    ];
    return items;
  }, [anaf.data]);

  const gdprItems: RequirementItem[] = useMemo(() => {
    const items: RequirementItem[] = [];
    if (consents.data) {
      const granted = consents.data.filter((c) => c.granted).length;
      items.push({
        id: 'gdpr-consents',
        name: 'Consimțăminte GDPR',
        description: 'Consimțăminte înregistrate pentru contul curent',
        category: 'gdpr',
        status: consents.data.length === 0 ? 'pending' : 'compliant',
        detail:
          consents.data.length === 0
            ? 'Niciun consimțământ înregistrat încă'
            : `${consents.data.length} înregistrări · ${granted} acordate · ${consents.data.length - granted} refuzate`,
        source: 'GET /gdpr/consents',
        href: '/dashboard/gdpr',
      });
    }
    if (dsr.data) {
      const open = dsr.data.filter((r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length;
      items.push({
        id: 'gdpr-dsr',
        name: 'Cereri ale persoanelor vizate (DSR)',
        description: 'Cereri de acces/ștergere/portabilitate (art. 15–20 GDPR)',
        category: 'gdpr',
        status: open > 0 ? 'warning' : dsr.data.length === 0 ? 'pending' : 'compliant',
        detail:
          dsr.data.length === 0
            ? 'Nicio cerere înregistrată'
            : `${dsr.data.length} cereri · ${open} în lucru · ${dsr.data.length - open} închise`,
        source: 'GET /gdpr/dsr-requests',
        href: '/dashboard/gdpr',
      });
    }
    return items;
  }, [consents.data, dsr.data]);

  const soc2Items: RequirementItem[] = useMemo(() => {
    const d = soc2.data;
    if (!d) return [];
    return Object.entries(d.controlsByCategory ?? {}).map(([cat, v]): RequirementItem => ({
      id: `soc2-${cat}`,
      name: `SOC 2 ${cat}`,
      description: `${v.compliant}/${v.total} controale evaluate ca fiind conforme`,
      category: 'soc2' as const,
      status: v.total === 0 ? 'pending' : v.percentage >= 100 ? 'compliant' : v.percentage === 0 ? 'pending' : 'warning',
      detail: `${v.percentage}%`,
      source: 'GET /compliance/dashboard → controlsByCategory',
    }));
  }, [soc2.data]);

  const allItems = useMemo(() => [...anafItems, ...gdprItems, ...soc2Items], [anafItems, gdprItems, soc2Items]);

  const stats = useMemo(() => {
    const compliant = allItems.filter((i) => i.status === 'compliant').length;
    const warnings = allItems.filter((i) => i.status === 'warning' || i.status === 'non_compliant').length;
    const pendingDeclarations = (anaf.data?.deadlines ?? []).filter((d) => d.status !== 'COMPLETED').length;
    const upcoming7 = (upcoming.data?.deadlines ?? []).filter((d) => {
      const n = daysUntil(d.dueDate);
      return n >= 0 && n <= 7 && d.status !== 'COMPLETED';
    }).length;
    return { compliant, warnings, total: allItems.length, pendingDeclarations, upcoming7 };
  }, [allItems, anaf.data, upcoming.data]);

  // Calendar grouping (statutory deadlines, by month)
  const calendarMonths = useMemo(() => {
    const groups = new Map<string, StatutoryDeadline[]>();
    for (const d of upcoming.data?.deadlines ?? []) {
      const k = monthKey(d.dueDate);
      groups.set(k, [...(groups.get(k) ?? []), d]);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, list]) => ({ key: k, label: formatPeriod(k), items: list.sort((a, b) => a.dueDate.localeCompare(b.dueDate)) }));
  }, [upcoming.data]);

  const scoreLoading = anaf.loading;
  const score = anaf.data?.complianceScore;
  const scoreGradient =
    score === undefined
      ? 'from-slate-500 to-slate-600'
      : score >= 80
        ? 'from-green-500 to-emerald-600'
        : score >= 50
          ? 'from-yellow-500 to-amber-600'
          : 'from-red-500 to-rose-600';

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conformitate</h1>
          <p className="text-muted-foreground">Monitorizare ANAF, SAF-T D406, GDPR și SOC 2 — date live din platformă</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reloadAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reîncarcă
          </Button>
          <Link
            href="/dashboard/anaf-status"
            className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Stare ANAF detaliată
          </Link>
        </div>
      </div>

      {/* Compliance Score Card — ANAF score computed server-side */}
      <Card className={`bg-gradient-to-r ${scoreGradient} text-white`}>
        <CardContent className="py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Scor conformitate ANAF</h2>
                <p className="text-white/80 text-sm">
                  {scoreLoading
                    ? 'Se calculează din depunerile înregistrate…'
                    : anaf.error
                      ? 'Scorul nu a putut fi calculat'
                      : 'Calculat din termene urgente, e-Facturi respinse și modificări REVISAL netransmise'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              {scoreLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : anaf.error ? (
                <Button variant="secondary" size="sm" onClick={anaf.reload}>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Reîncearcă
                </Button>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-4xl font-bold">{score ?? '—'}%</div>
                    <div className="text-xs text-white/80">Scor general</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {stats.compliant}/{stats.total}
                    </div>
                    <div className="text-xs text-white/80">Cerințe conforme</div>
                  </div>
                  {(anaf.data?.alerts ?? 0) > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-200">{anaf.data?.alerts}</div>
                      <div className="text-xs text-white/80">Termene urgente</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Prezentare
          </TabsTrigger>
          <TabsTrigger value="declarations">
            <FileText className="mr-2 h-4 w-4" />
            Declarații
          </TabsTrigger>
          <TabsTrigger value="requirements">
            <ListChecks className="mr-2 h-4 w-4" />
            Cerințe
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conforme</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{anaf.loading ? '…' : stats.compliant}</div>
                <p className="text-xs text-muted-foreground">din {stats.total} cerințe verificate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atenționări</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{anaf.loading ? '…' : stats.warnings}</div>
                <p className="text-xs text-muted-foreground">cerințe care necesită atenție</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Declarații ANAF</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{anaf.loading ? '…' : anaf.error ? '—' : stats.pendingDeclarations}</div>
                <p className="text-xs text-muted-foreground">de depus în perioada curentă</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Termene apropiate</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {upcoming.loading ? '…' : upcoming.error ? '—' : stats.upcoming7}
                </div>
                <p className="text-xs text-muted-foreground">
                  în 7 zile{summary.data ? ` · ${summary.data.upcoming} în 30 zile · ${summary.data.overdue} depășite` : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Compliance by Category */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* ANAF */}
            <CategoryCard
              title="ANAF"
              resource={anaf}
              errorMessage="Nu am putut încărca starea ANAF."
              items={anafItems}
              emptyMessage="Nicio depunere ANAF înregistrată încă."
            />

            {/* SAF-T D406 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>SAF-T D406</CardTitle>
                  {saft.data && (
                    <Badge className={saft.data.previousPeriod.compliance.isCompliant ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {saftPeriodLabels[saft.data.previousPeriod.compliance.periodStatus] ?? saft.data.previousPeriod.compliance.periodStatus}
                    </Badge>
                  )}
                </div>
                <CardDescription>Raportare lunară conform Ordin 1783/2021</CardDescription>
              </CardHeader>
              <CardContent>
                {saft.loading ? (
                  <LoadingBlock />
                ) : saft.error ? (
                  <ErrorBlock message="Nu am putut încărca starea SAF-T D406." onRetry={saft.reload} />
                ) : saft.data ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span>Perioada de raportat: {formatPeriod(saft.data.previousPeriod.period)}</span>
                      <span className="text-muted-foreground">
                        Termen {formatDate(saft.data.previousPeriod.compliance.submissionDeadline)}
                        {' · '}
                        {saft.data.previousPeriod.compliance.daysUntilDeadline >= 0
                          ? `${saft.data.previousPeriod.compliance.daysUntilDeadline} zile rămase`
                          : `depășit cu ${Math.abs(saft.data.previousPeriod.compliance.daysUntilDeadline)} zile`}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold">{saft.data.submissionStats.draft}</div>
                        <div className="text-xs text-muted-foreground">Ciorne</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">{saft.data.submissionStats.submitted}</div>
                        <div className="text-xs text-muted-foreground">Depuse</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">{saft.data.submissionStats.accepted}</div>
                        <div className="text-xs text-muted-foreground">Acceptate</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">{saft.data.submissionStats.rejected}</div>
                        <div className="text-xs text-muted-foreground">Respinse</div>
                      </div>
                    </div>
                    {saft.data.previousPeriod.compliance.gracePeriodActive && (
                      <p className="text-xs text-muted-foreground">
                        Perioadă de grație pilot activă
                        {saft.data.deadlines?.gracePeriod?.end ? ` până la ${formatDate(saft.data.deadlines.gracePeriod.end)}` : ''}.
                      </p>
                    )}
                    {saft.data.alerts.length > 0 && (
                      <ul className="space-y-1">
                        {saft.data.alerts.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            {a.type === 'error' ? (
                              <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5" />
                            ) : a.type === 'warning' ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5" />
                            ) : (
                              <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5" />
                            )}
                            <span>{a.message}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <EmptyBlock message="Niciun raport SAF-T D406 înregistrat încă." />
                )}
              </CardContent>
            </Card>

            {/* GDPR */}
            <Card>
              <CardHeader>
                <CardTitle>GDPR</CardTitle>
                <CardDescription>Consimțăminte și cereri ale persoanelor vizate</CardDescription>
              </CardHeader>
              <CardContent>
                {consents.loading || dsr.loading ? (
                  <LoadingBlock />
                ) : consents.error && dsr.error ? (
                  <ErrorBlock
                    message="Nu am putut încărca datele GDPR."
                    onRetry={() => {
                      consents.reload();
                      dsr.reload();
                    }}
                  />
                ) : gdprItems.length === 0 ? (
                  <EmptyBlock message="Nicio înregistrare GDPR disponibilă încă." />
                ) : (
                  <div className="space-y-2">
                    {gdprItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={item.status} />
                          <div>
                            <span className="text-sm">{item.name}</span>
                            {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                          </div>
                        </div>
                        <Badge className={statusColors[item.status]} variant="secondary">
                          {statusLabels[item.status]}
                        </Badge>
                      </div>
                    ))}
                    {consents.error && <p className="text-xs text-red-600">Consimțămintele nu au putut fi încărcate.</p>}
                    {dsr.error && <p className="text-xs text-red-600">Cererile DSR nu au putut fi încărcate.</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SOC 2 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>SOC 2</CardTitle>
                  {soc2.data && (
                    <Badge className={soc2.data.overallCompliance >= 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {soc2.data.overallCompliance}%
                    </Badge>
                  )}
                </div>
                <CardDescription>Controale Trust Services Criteria (CC1–CC9)</CardDescription>
              </CardHeader>
              <CardContent>
                {soc2.loading ? (
                  <LoadingBlock />
                ) : soc2.status === 403 || soc2.status === 401 ? (
                  <EmptyBlock message="Tabloul SOC 2 este disponibil doar pentru rolurile Administrator și Contabil." />
                ) : soc2.error ? (
                  <ErrorBlock message="Nu am putut încărca tabloul SOC 2." onRetry={soc2.reload} />
                ) : soc2.data ? (
                  <>
                    <Progress value={soc2.data.overallCompliance} className="h-2 mb-4" />
                    {soc2Items.length === 0 ? (
                      <EmptyBlock message="Niciun control SOC 2 evaluat încă." />
                    ) : (
                      <div className="space-y-2">
                        {soc2Items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="flex items-center gap-2">
                              <StatusIcon status={item.status} />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </div>
                        ))}
                        {soc2.data.incidentMetrics && (
                          <p className="text-xs text-muted-foreground pt-2">
                            Incidente: {soc2.data.incidentMetrics.open} deschise · {soc2.data.incidentMetrics.resolved} rezolvate
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyBlock message="Niciun control SOC 2 evaluat încă." />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        <TabsContent value="declarations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Termene declarații ANAF</CardTitle>
              <CardDescription>Declarații nedepuse pentru perioada curentă, conform depunerilor înregistrate</CardDescription>
            </CardHeader>
            <CardContent>
              {anaf.loading ? (
                <LoadingBlock />
              ) : anaf.error ? (
                <ErrorBlock message="Nu am putut încărca termenele declarațiilor." onRetry={anaf.reload} />
              ) : (anaf.data?.deadlines ?? []).length === 0 ? (
                <EmptyBlock message="Nicio declarație de depus pentru perioada curentă." />
              ) : (
                <div className="space-y-4">
                  {anaf.data?.deadlines.map((decl, idx) => {
                    const isUrgent = decl.priority === 'HIGH' && decl.status !== 'COMPLETED';
                    return (
                      <div
                        key={`${decl.type}-${decl.period ?? idx}`}
                        className={`flex flex-col gap-3 p-4 border rounded-lg md:flex-row md:items-center md:justify-between ${isUrgent ? 'border-orange-300 bg-orange-50' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${decl.status === 'COMPLETED' ? 'bg-green-100' : 'bg-muted'}`}>
                            <FileText className={`h-5 w-5 ${decl.status === 'COMPLETED' ? 'text-green-600' : ''}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{anafTypeLabels[decl.type] ?? decl.type}</Badge>
                              <span className="font-medium">{decl.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {decl.period ? formatPeriod(decl.period) : decl.pendingChanges ? `${decl.pendingChanges} modificări de transmis` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              Termen: {/^\d{4}-\d{2}-\d{2}/.test(decl.deadline) ? formatDate(decl.deadline) : 'în 24h de la modificare'}
                            </p>
                            {decl.status !== 'COMPLETED' && (
                              <p className={`text-xs ${decl.daysRemaining <= 3 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                {decl.daysRemaining > 0 ? `${decl.daysRemaining} zile rămase` : decl.daysRemaining === 0 ? 'ASTĂZI' : 'Depășit'}
                              </p>
                            )}
                          </div>
                          <Badge className={statusColor(decl.status)}>{statusLabel(decl.status)}</Badge>
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
              <CardTitle>Rapoarte SAF-T D406</CardTitle>
              <CardDescription>Rapoartele generate și depuse din platformă</CardDescription>
            </CardHeader>
            <CardContent>
              {saft.loading ? (
                <LoadingBlock />
              ) : saft.error ? (
                <ErrorBlock message="Nu am putut încărca rapoartele SAF-T D406." onRetry={saft.reload} />
              ) : (saft.data?.recentReports ?? []).length === 0 ? (
                <div className="space-y-2">
                  <EmptyBlock message="Niciun raport SAF-T D406 generat încă." />
                  <div className="text-center">
                    <Link
                      href="/dashboard/saft"
                      className="inline-flex h-8 items-center justify-center rounded-md border border-gray-300 px-3 text-sm font-medium transition-colors hover:bg-gray-100"
                    >
                      Generează SAF-T D406
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {saft.data?.recentReports.map((r) => (
                    <div key={r.id} className="flex flex-col gap-2 p-3 border rounded-lg md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{r.reportType || 'D406'}</Badge>
                        <span className="font-medium">{formatPeriod(r.period)}</span>
                        {r.spvRef && <span className="text-xs text-muted-foreground">SPV: {r.spvRef}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {r.submittedAt ? (
                          <span className="text-xs text-green-600">Depus: {formatDate(r.submittedAt)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {r.validated ? `Validat ${formatDate(r.validatedAt)}` : `Creat ${formatDate(r.createdAt)}`}
                          </span>
                        )}
                        <Badge className={statusColor(r.status)}>{statusLabel(r.status)}</Badge>
                      </div>
                    </div>
                  ))}
                  {saft.data?.previousPeriod.checklist && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-2">
                        Verificări pre-depunere {formatPeriod(saft.data.previousPeriod.period)}
                        {saft.data.previousPeriod.checklist.ready ? ' — gata de depus' : ' — necesită corecții'}
                      </p>
                      <ul className="space-y-1">
                        {saft.data.previousPeriod.checklist.checklist.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            {c.status === 'ok' ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5" />
                            ) : c.status === 'warning' ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5" />
                            )}
                            <span>
                              <span className="font-medium">{c.item}</span> — {c.detail}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Istoric depuneri ANAF</CardTitle>
              <CardDescription>Toate depunerile înregistrate (e-Factura, SAF-T, D112, D394, REVISAL)</CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.loading ? (
                <LoadingBlock />
              ) : submissions.error ? (
                <ErrorBlock message="Nu am putut încărca istoricul depunerilor." onRetry={submissions.reload} />
              ) : (submissions.data?.submissions ?? []).length === 0 ? (
                <EmptyBlock message="Nicio depunere ANAF înregistrată încă." />
              ) : (
                <div className="space-y-2">
                  {submissions.data?.submissions.map((s) => (
                    <div key={s.id} className="flex flex-col gap-2 p-3 border rounded-lg md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{anafTypeLabels[s.type] ?? s.type}</Badge>
                        <div>
                          <p className="text-sm font-medium">{s.referenceId || s.id}</p>
                          {s.errorMessage && <p className="text-xs text-red-600">{s.errorMessage}</p>}
                          {s.indexIncarcare && <p className="text-xs text-muted-foreground">Index încărcare: {s.indexIncarcare}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(s.submittedAt)}
                          {s.processedAt ? ` · procesat ${formatDate(s.processedAt)}` : ''}
                        </span>
                        <Badge className={statusColor(s.status)}>{statusLabel(s.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Toate cerințele de conformitate</CardTitle>
              <CardDescription>Fiecare stare este derivată din datele înregistrate în platformă (sursa este afișată sub fiecare cerință)</CardDescription>
            </CardHeader>
            <CardContent>
              {anaf.loading && consents.loading && soc2.loading ? (
                <LoadingBlock />
              ) : allItems.length === 0 ? (
                anaf.error ? (
                  <ErrorBlock message="Nu am putut încărca cerințele de conformitate." onRetry={reloadAll} />
                ) : (
                  <EmptyBlock message="Nicio cerință de conformitate evaluată încă." />
                )
              ) : (
                <div className="space-y-4">
                  {allItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg ${
                            item.status === 'compliant'
                              ? 'bg-green-100'
                              : item.status === 'warning'
                                ? 'bg-yellow-100'
                                : item.status === 'non_compliant'
                                  ? 'bg-red-100'
                                  : 'bg-blue-100'
                          }`}
                        >
                          <StatusIcon status={item.status} className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            <Badge variant="outline">{categoryLabels[item.category]}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                          <p className="text-[11px] text-muted-foreground/70 font-mono">Sursă: {item.source}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusColors[item.status]}>{statusLabels[item.status]}</Badge>
                        {item.href && (
                          <Link
                            href={item.href}
                            aria-label={`Deschide ${item.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-100"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                  {anaf.error && (
                    <p className="text-xs text-red-600">
                      Cerințele ANAF nu au putut fi încărcate.{' '}
                      <button type="button" className="underline" onClick={anaf.reload}>
                        Reîncearcă
                      </button>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Overdue statutory deadlines */}
          {overdue.data && overdue.data.deadlines.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-700">Termene depășite</CardTitle>
                <CardDescription>Termenele depășite pot atrage penalități</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdue.data.deadlines.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span className="text-sm">
                        {formatDate(d.dueDate)} — {d.descriptionRo || d.description}
                      </span>
                      <Badge className="bg-red-100 text-red-800">Întârziat</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Calendar obligații ANAF</CardTitle>
              <CardDescription>Termene legale în următoarele 90 de zile (Ordin 1783/2021, Legea 141/2025)</CardDescription>
            </CardHeader>
            <CardContent>
              {upcoming.loading ? (
                <LoadingBlock />
              ) : upcoming.error ? (
                <ErrorBlock message="Nu am putut încărca calendarul obligațiilor." onRetry={upcoming.reload} />
              ) : calendarMonths.length === 0 ? (
                <EmptyBlock message="Niciun termen legal programat în următoarele 90 de zile." />
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {calendarMonths.map((month) => (
                    <Card key={month.key}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{month.label}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {month.items.map((d) => {
                            const n = daysUntil(d.dueDate);
                            const urgent = n <= 7 && d.status !== 'COMPLETED';
                            return (
                              <div
                                key={d.id}
                                className={`flex items-center justify-between gap-2 p-2 rounded ${urgent ? 'bg-yellow-50' : 'bg-muted'}`}
                                title={d.penalty ? `Sancțiune: ${d.penalty}` : undefined}
                              >
                                <span className="text-sm">
                                  {new Date(d.dueDate).getDate()} — {d.descriptionRo || d.description}
                                </span>
                                {d.status === 'COMPLETED' ? (
                                  <Badge className="bg-green-100 text-green-800">Finalizat</Badge>
                                ) : urgent ? (
                                  <Badge className="bg-yellow-100 text-yellow-800">Urgent</Badge>
                                ) : (
                                  <Badge variant="outline">{n} zile</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {summary.data && (
                <p className="text-xs text-muted-foreground mt-4">
                  {summary.data.upcoming} termene în următoarele 30 de zile · {summary.data.overdue} depășite · {summary.data.completedThisMonth} finalizate luna aceasta
                  {summary.data.nextDeadline
                    ? ` · Următorul: ${formatDate(summary.data.nextDeadline.dueDate)} (${summary.data.nextDeadline.descriptionRo || summary.data.nextDeadline.description})`
                    : ''}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Obligații interne ale organizației</CardTitle>
              <CardDescription>Termene definite manual în calendarul intern de conformitate</CardDescription>
            </CardHeader>
            <CardContent>
              {internalUpcoming.loading ? (
                <LoadingBlock />
              ) : internalUpcoming.error ? (
                <ErrorBlock message="Nu am putut încărca calendarul intern." onRetry={internalUpcoming.reload} />
              ) : (internalUpcoming.data?.data?.deadlines ?? []).length === 0 ? (
                <EmptyBlock message="Nicio obligație internă programată încă." />
              ) : (
                <div className="space-y-2">
                  {internalUpcoming.data?.data.deadlines.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <span className="text-sm font-medium">{d.title}</span>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(d.dueDate)} · {d.authority} · {d.category}
                        </p>
                      </div>
                      <Badge variant="outline">{d.priority}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {internalStats.data?.data && internalStats.data.data.totalDeadlines > 0 && (
                <p className="text-xs text-muted-foreground mt-4">
                  {internalStats.data.data.pendingDeadlines} în așteptare · {internalStats.data.data.overdueDeadlines} depășite ·{' '}
                  {internalStats.data.data.upcomingThisWeek} săptămâna aceasta
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category card (ANAF) — shared pattern: loading / error / empty / list
// ---------------------------------------------------------------------------

function CategoryCard({
  title,
  resource,
  items,
  errorMessage,
  emptyMessage,
}: {
  title: string;
  resource: Resource<unknown>;
  items: RequirementItem[];
  errorMessage: string;
  emptyMessage: string;
}) {
  const compliantCount = items.filter((i) => i.status === 'compliant').length;
  const score = items.length > 0 ? Math.round((compliantCount / items.length) * 100) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {score !== null && (
            <Badge className={score === 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>{score}%</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {resource.loading ? (
          <LoadingBlock />
        ) : resource.error ? (
          <ErrorBlock message={errorMessage} onRetry={resource.reload} />
        ) : items.length === 0 ? (
          <EmptyBlock message={emptyMessage} />
        ) : (
          <>
            <Progress value={score ?? 0} className="h-2 mb-4" />
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={item.status} />
                    <div>
                      <span className="text-sm">{item.name}</span>
                      {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                    </div>
                  </div>
                  <Badge className={statusColors[item.status]} variant="secondary">
                    {statusLabels[item.status]}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
