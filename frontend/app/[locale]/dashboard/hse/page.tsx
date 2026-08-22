'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, AlertTriangle, CheckCircle, Clock, Users,
  MapPin, Activity, RefreshCw, Plus,
  Eye, Edit, Calendar, AlertCircle, Leaf, Zap, Droplet,
  Thermometer, ClipboardCheck, Award, BarChart3,
  Search, Download, Info
} from 'lucide-react';
import { api } from '@/lib/api';
import { notifyNotAvailable, toastFromAnywhere } from '@/lib/toast-bus';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// ---------------------------------------------------------------------------
// Backend shapes (NestJS /api/v1/hse/*) — see backend/src/hse/*.service.ts
// ---------------------------------------------------------------------------

/** GET /hse/summary → RiskRegisterSummary */
interface RiskRegisterSummary {
  totalRisks: number;
  byLevel?: Partial<Record<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', number>>;
  byStatus?: Record<string, number>;
  controlsOverdue?: number;
  reviewsOverdue?: number;
}

/** GET /hse/risk-assessments → RiskAssessment[] (backend) */
interface BackendRiskAssessment {
  id: string;
  title: string;
  description?: string;
  hazard?: { category?: string; name?: string } | null;
  location?: { name?: string } | null;
  residualRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  initialRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  reviewDate?: string;
  nextReviewDate?: string;
}

/** GET /hse/incidents → Incident[] (backend) */
interface BackendIncident {
  id: string;
  incidentNumber?: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  occurredAt: string;
  reportedAt?: string;
  locationDescription?: string;
  department?: string;
  lostWorkDays?: number;
  restrictedWorkDays?: number;
  recordable?: boolean;
}

/** GET /hse/dashboard/audits → Audit[] (backend) */
interface BackendAudit {
  id: string;
  auditNumber?: string;
  title: string;
  standard: 'ISO_45001' | 'ISO_14001';
  type: string;
  status: string;
  scheduledDate: string;
  findings?: unknown[] | number;
  overallScore?: number;
}

/** GET /hse/iso45001/score */
interface ISO45001Score {
  score: number;
  compliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
  notApplicable: number;
  recommendations?: string[];
}

// ---------------------------------------------------------------------------
// View models
// ---------------------------------------------------------------------------

interface RiskAssessment {
  id: string;
  title: string;
  description: string;
  riskLevel: string;
  status: string;
  location: string;
  category: string;
  nextReview: string | null;
}

interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  occurredAt: string;
  location: string;
  lostWorkDays: number;
  recordable: boolean;
}

interface AuditItem {
  id: string;
  title: string;
  standard: 'ISO_45001' | 'ISO_14001';
  type: string;
  status: string;
  scheduledDate: string;
  findings: number;
  overallScore: number | null;
}

/** A KPI card. `value === null` renders "—" (no data source) — never an invented number. */
interface KPI {
  name: string;
  value: number | null;
  unit: string;
  hint?: string;
}

type TabType = 'dashboard' | 'risks' | 'incidents' | 'audits' | 'training' | 'compliance';
type Section = 'summary' | 'risks' | 'incidents' | 'audits' | 'iso45001';

const LEVEL_LABEL: Record<string, string> = {
  CRITICAL: 'Critic',
  EXTREME: 'Extrem',
  HIGH: 'Ridicat',
  MEDIUM: 'Mediu',
  LOW: 'Scăzut',
};

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  INJURY: 'Accidentare',
  ILLNESS: 'Îmbolnăvire profesională',
  NEAR_MISS: 'Aproape de incident',
  PROPERTY_DAMAGE: 'Daune materiale',
  ENVIRONMENTAL: 'Mediu',
  SECURITY: 'Securitate',
  FIRE: 'Incendiu',
  SPILL: 'Deversare',
  VEHICLE: 'Vehicul',
  EQUIPMENT_FAILURE: 'Defecțiune echipament',
  UNSAFE_ACT: 'Act nesigur',
  UNSAFE_CONDITION: 'Condiție nesigură',
  // legacy labels (older records)
  FIRST_AID: 'Prim ajutor',
  LOST_TIME: 'Zile pierdute',
  FATALITY: 'Fatal',
};

const INCIDENT_SEVERITY_LABEL: Record<string, string> = {
  MINOR: 'Minoră',
  MODERATE: 'Moderată',
  SERIOUS: 'Gravă',
  MAJOR: 'Majoră',
  FATAL: 'Fatală',
  LOW: 'Scăzută',
  MEDIUM: 'Medie',
  HIGH: 'Ridicată',
  CRITICAL: 'Critică',
};

const INCIDENT_STATUS_LABEL: Record<string, string> = {
  REPORTED: 'Raportat',
  UNDER_INVESTIGATION: 'În investigare',
  ROOT_CAUSE_IDENTIFIED: 'Cauză identificată',
  CAPA_IN_PROGRESS: 'Acțiuni corective',
  CLOSED: 'Închis',
  REOPENED: 'Redeschis',
  OPEN: 'Deschis',
  INVESTIGATING: 'În investigare',
};

const ASSESSMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Ciornă',
  PENDING_REVIEW: 'În revizuire',
  UNDER_REVIEW: 'În revizuire',
  APPROVED: 'Aprobat',
  REJECTED: 'Respins',
  REQUIRES_UPDATE: 'Necesită actualizare',
  ARCHIVED: 'Arhivat',
};

const AUDIT_STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planificat',
  SCHEDULED: 'Programat',
  IN_PROGRESS: 'În desfășurare',
  COMPLETED: 'Finalizat',
  CANCELLED: 'Anulat',
};

const AUDIT_TYPE_LABEL: Record<string, string> = {
  INTERNAL: 'Intern',
  EXTERNAL: 'Extern',
  SURVEILLANCE: 'Supraveghere',
  CERTIFICATION: 'Certificare',
  RECERTIFICATION: 'Recertificare',
};

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Normalizers — backend shape → view model (defensive against partial data)
// ---------------------------------------------------------------------------

function toRisk(r: BackendRiskAssessment): RiskAssessment {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    riskLevel: r.residualRiskLevel ?? r.initialRiskLevel ?? 'LOW',
    status: r.status,
    location: r.location?.name ?? '—',
    category: r.hazard?.category ?? '—',
    nextReview: r.nextReviewDate ?? r.reviewDate ?? null,
  };
}

function toIncident(i: BackendIncident): Incident {
  return {
    id: i.id,
    incidentNumber: i.incidentNumber ?? '',
    title: i.title,
    type: i.type,
    severity: i.severity,
    status: i.status,
    occurredAt: i.occurredAt ?? i.reportedAt ?? '',
    location: i.locationDescription || i.department || '—',
    lostWorkDays: Number(i.lostWorkDays ?? 0) || 0,
    recordable: Boolean(i.recordable),
  };
}

function toAudit(a: BackendAudit): AuditItem {
  return {
    id: a.id,
    title: a.title,
    standard: a.standard,
    type: a.type,
    status: a.status,
    scheduledDate: a.scheduledDate,
    findings: Array.isArray(a.findings) ? a.findings.length : Number(a.findings ?? 0) || 0,
    overallScore: typeof a.overallScore === 'number' ? a.overallScore : null,
  };
}

/**
 * Safety indicators computed ONLY from the real incident register (last 12 months).
 * Rates (TRIR/LTIR) need hours worked — POST /hse/dashboard/kpis/safety is a pure
 * calculator that requires that input and the platform has no source for it yet,
 * so those cards stay "—" instead of showing an invented number.
 */
function deriveSafetyKPIs(incidents: Incident[], now = new Date()): KPI[] {
  const since = now.getTime() - 365 * DAY_MS;
  const lastYear = incidents.filter((i) => {
    const t = new Date(i.occurredAt).getTime();
    return !Number.isNaN(t) && t >= since;
  });
  const nearMisses = lastYear.filter((i) => i.type === 'NEAR_MISS').length;
  const lostDays = lastYear.reduce((sum, i) => sum + i.lostWorkDays, 0);

  const latest = incidents
    .filter((i) => i.type !== 'NEAR_MISS')
    .map((i) => new Date(i.occurredAt).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];
  const daysSince = latest !== undefined ? Math.max(0, Math.floor((now.getTime() - latest) / DAY_MS)) : null;

  return [
    { name: 'Incidente raportate', value: lastYear.length, unit: '', hint: 'ultimele 12 luni' },
    { name: 'Aproape de incident', value: nearMisses, unit: '', hint: 'ultimele 12 luni' },
    { name: 'Zile de muncă pierdute', value: lostDays, unit: 'zile', hint: 'ultimele 12 luni' },
    {
      name: 'Zile de la ultimul incident',
      value: daysSince,
      unit: 'zile',
      hint: daysSince === null ? 'Niciun incident înregistrat' : undefined,
    },
    { name: 'TRIR', value: null, unit: '', hint: 'Necesită ore lucrate (nu există sursă de date)' },
    { name: 'LTIR', value: null, unit: '', hint: 'Necesită ore lucrate (nu există sursă de date)' },
  ];
}

/** Environmental KPIs have no data source in the platform yet — cards render "—". */
const ENV_KPIS_UNAVAILABLE: KPI[] = [
  { name: 'Deșeuri reciclate', value: null, unit: '%' },
  { name: 'Energie regenerabilă', value: null, unit: '%' },
  { name: 'Emisii CO₂', value: null, unit: 't' },
  { name: 'Consum apă', value: null, unit: 'm³' },
];

export default function HSEPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [trainingCourses, setTrainingCourses] = useState<any[]>([]);
  const [trainingLoading, setTrainingLoading] = useState(false);

  useEffect(() => {
    // Load SSM training courses when the tab is opened (REQ-038)
    if (activeTab !== 'training' || trainingCourses.length > 0) return;
    (async () => {
      setTrainingLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_URL}/hse/training/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTrainingCourses(Array.isArray(data) ? data : data?.courses || []);
        }
      } catch (err) {
        console.error('Failed to load HSE trainings:', err);
      } finally {
        setTrainingLoading(false);
      }
    })();
  }, [activeTab]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<Section, string>>>({});
  const [summary, setSummary] = useState<RiskRegisterSummary | null>(null);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [iso45001, setIso45001] = useState<ISO45001Score | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const errors: Partial<Record<Section, string>> = {};

    const [summaryRes, risksRes, incidentsRes, auditsRes, isoRes] = await Promise.all([
      api.get<RiskRegisterSummary>('/hse/summary'),
      api.get<BackendRiskAssessment[]>('/hse/risk-assessments'),
      api.get<BackendIncident[]>('/hse/incidents'),
      api.get<BackendAudit[]>('/hse/dashboard/audits'),
      api.get<ISO45001Score>('/hse/iso45001/score'),
    ]);

    if (summaryRes.error || !summaryRes.data) {
      errors.summary = summaryRes.error || 'Rezumatul riscurilor nu a putut fi încărcat';
      setSummary(null);
    } else {
      setSummary(summaryRes.data);
    }

    if (risksRes.error || !risksRes.data) {
      errors.risks = risksRes.error || 'Evaluările de risc nu au putut fi încărcate';
      setRisks([]);
    } else {
      setRisks((Array.isArray(risksRes.data) ? risksRes.data : []).map(toRisk));
    }

    if (incidentsRes.error || !incidentsRes.data) {
      errors.incidents = incidentsRes.error || 'Registrul de incidente nu a putut fi încărcat';
      setIncidents([]);
    } else {
      setIncidents((Array.isArray(incidentsRes.data) ? incidentsRes.data : []).map(toIncident));
    }

    if (auditsRes.error || !auditsRes.data) {
      errors.audits = auditsRes.error || 'Auditurile nu au putut fi încărcate';
      setAudits([]);
    } else {
      setAudits((Array.isArray(auditsRes.data) ? auditsRes.data : []).map(toAudit));
    }

    if (isoRes.error || !isoRes.data) {
      errors.iso45001 = isoRes.error || 'Scorul ISO 45001 nu a putut fi încărcat';
      setIso45001(null);
    } else {
      setIso45001(isoRes.data);
    }

    setSectionErrors(errors);

    // Everything failed (typically network / backend down) → page-level error with retry.
    const coreFailed = [summaryRes, risksRes, incidentsRes, auditsRes].every((r) => r.error || !r.data);
    if (coreFailed) {
      setError(
        summaryRes.status === 0 || incidentsRes.status === 0
          ? 'Nu s-a putut contacta serverul. Verifică conexiunea și încearcă din nou.'
          : 'Eroare la încărcarea datelor HSE',
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ----- derived (all from real data; null → "—") -----
  const safetyKPIs: KPI[] | null = sectionErrors.incidents ? null : deriveSafetyKPIs(incidents);
  const openIncidents = incidents.filter((i) => i.status !== 'CLOSED').length;
  const highRisks = (summary?.byLevel?.HIGH ?? 0) + (summary?.byLevel?.CRITICAL ?? 0);
  const overdueTasks = (summary?.controlsOverdue ?? 0) + (summary?.reviewsOverdue ?? 0);

  const iso14001Audits = audits.filter((a) => a.standard === 'ISO_14001' && a.status === 'COMPLETED' && a.overallScore !== null);
  const iso14001Score =
    iso14001Audits.length > 0
      ? Math.round(iso14001Audits.reduce((sum, a) => sum + (a.overallScore ?? 0), 0) / iso14001Audits.length)
      : null;
  const iso45001Applicable = iso45001
    ? iso45001.compliant + iso45001.partiallyCompliant + iso45001.nonCompliant
    : 0;

  // ----- presentation helpers -----
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'EXTREME': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-400 text-yellow-900';
      case 'LOW': return 'bg-green-500 text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'CLOSED':
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING_REVIEW':
      case 'UNDER_REVIEW':
      case 'UNDER_INVESTIGATION':
      case 'ROOT_CAUSE_IDENTIFIED':
      case 'CAPA_IN_PROGRESS':
      case 'INVESTIGATING':
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
      case 'PLANNED':
      case 'SCHEDULED':
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      case 'OPEN':
      case 'REPORTED':
      case 'REOPENED':
      case 'REQUIRES_UPDATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'FATAL':
      case 'MAJOR':
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'SERIOUS':
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MODERATE':
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'MINOR':
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ro-RO');
  };

  const formatValue = (v: number | null) => (v === null ? '—' : v.toLocaleString('ro-RO'));

  // ----- action handlers -----
  const handleReportIncident = () => {
    router.push('/dashboard/hse/incidents/new');
  };

  const handleNewRiskAssessment = () => {
    router.push('/dashboard/hse/risks/new');
  };

  const handleViewRisk = (_risk: RiskAssessment) => {
    notifyNotAvailable('Vizualizare evaluare de risc');
  };

  const handleEditRisk = (_risk: RiskAssessment) => {
    notifyNotAvailable('Editare evaluare de risc');
  };

  const handleViewIncident = (_incident: Incident) => {
    notifyNotAvailable('Detalii incident');
  };

  const handleInvestigateIncident = (_incident: Incident) => {
    notifyNotAvailable('Investigare incident');
  };

  const handleScheduleAudit = () => {
    router.push('/dashboard/hse/audits/new');
  };

  const handleViewAudit = (_audit: AuditItem) => {
    notifyNotAvailable('Detalii audit');
  };

  const handleDownloadAuditReport = async (audit: AuditItem) => {
    // GET /hse/dashboard/audits/:auditId/report returns a JSON report (no PDF renderer yet).
    const res = await api.get<unknown>(`/hse/dashboard/audits/${audit.id}/report`);
    if (res.error || !res.data) {
      toastFromAnywhere('error', 'Raport indisponibil', res.error || 'Raportul nu este disponibil momentan');
      return;
    }
    try {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `raport_audit_${audit.title.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toastFromAnywhere('success', 'Raport descărcat', audit.title);
    } catch (err) {
      console.error('Failed to download audit report:', err);
      toastFromAnywhere('error', 'Eroare la descărcarea raportului');
    }
  };

  const handleViewISO45001Details = () => {
    router.push('/dashboard/hse/compliance/iso45001');
  };

  const handleViewISO14001Details = () => {
    router.push('/dashboard/hse/compliance/iso14001');
  };

  const handleQuickAction = (action: string) => {
    const actions: Record<string, string> = {
      'incident': '/dashboard/hse/incidents/new',
      'risk': '/dashboard/hse/risks/new',
    };
    if (actions[action]) {
      router.push(actions[action]);
      return;
    }
    // 'checklist' (PSSR) and 'export' have no page yet — say so instead of a 404.
    notifyNotAvailable(action === 'checklist' ? 'Checklist PSSR' : 'Export raport HSE');
  };

  // Plain render helper (not a nested component) so it does not remount on every render.
  const renderSectionError = (message: string) => (
    <div className="px-6 py-6 text-center">
      <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
      <p className="text-sm text-red-700">{message}</p>
      <button onClick={fetchData} className="mt-3 text-sm text-blue-600 hover:text-blue-800">
        Reîncearcă
      </button>
    </div>
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Eroare</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Încearcă din nou
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sănătate, Securitate și Mediu</h1>
          <p className="text-gray-500 mt-1">
            Management HSE conform ISO 45001:2018 și ISO 14001:2015
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            aria-label="Reîncarcă datele"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleReportIncident} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Raportare Incident
          </button>
        </div>
      </div>

      {/* Summary Cards — GET /hse/summary + registers; "—" where a source is missing */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-white rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Riscuri Totale</p>
                <p className="text-xl font-bold text-gray-900">{summary ? summary.totalRisks : '—'}</p>
              </div>
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600">Risc Ridicat</p>
                <p className="text-xl font-bold text-red-900">{summary ? highRisks : '—'}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-600">Risc Mediu</p>
                <p className="text-xl font-bold text-yellow-900">{summary ? summary.byLevel?.MEDIUM ?? 0 : '—'}</p>
              </div>
              <Activity className="h-6 w-6 text-yellow-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600">Risc Scăzut</p>
                <p className="text-xl font-bold text-green-900">{summary ? summary.byLevel?.LOW ?? 0 : '—'}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600">Incidente deschise</p>
                <p className="text-xl font-bold text-orange-900">{sectionErrors.incidents ? '—' : openIncidents}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-orange-400" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600">Restante</p>
                <p className="text-xl font-bold text-purple-900">{summary ? overdueTasks : '—'}</p>
              </div>
              <Clock className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div className="bg-indigo-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-600">Conformitate ISO 45001</p>
                <p className="text-xl font-bold text-indigo-900">{iso45001 ? `${iso45001.score}%` : '—'}</p>
              </div>
              <Award className="h-6 w-6 text-indigo-400" />
            </div>
          </div>
          <div className="bg-teal-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-teal-600">Audituri</p>
                <p className="text-xl font-bold text-teal-900">{sectionErrors.audits ? '—' : audits.length}</p>
              </div>
              <ClipboardCheck className="h-6 w-6 text-teal-400" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { key: 'risks', label: 'Riscuri', icon: Shield },
            { key: 'incidents', label: 'Incidente', icon: AlertTriangle },
            { key: 'audits', label: 'Audituri', icon: ClipboardCheck },
            { key: 'training', label: 'Instruiri', icon: Users },
            { key: 'compliance', label: 'Conformitate', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 text-gray-500">Se încarcă...</p>
        </div>
      ) : activeTab === 'dashboard' ? (
        /* Dashboard View */
        <div className="space-y-6">
          {/* KPIs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Safety KPIs — derived from GET /hse/incidents */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Indicatori Siguranță</h3>
              </div>
              {safetyKPIs === null ? (
                renderSectionError(sectionErrors.incidents || 'Indicatorii de siguranță nu sunt disponibili')
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {safetyKPIs.map((kpi) => (
                    <div key={kpi.name} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-500">{kpi.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-bold ${kpi.value === null ? 'text-gray-400' : 'text-gray-900'}`}>
                          {formatValue(kpi.value)}
                        </span>
                        {kpi.value !== null && kpi.unit && <span className="text-sm text-gray-500">{kpi.unit}</span>}
                      </div>
                      {kpi.hint && (
                        <div className="mt-1 text-xs text-gray-400">{kpi.hint}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Environmental KPIs — no data source yet; rendered as "—" */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Indicatori Mediu</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {ENV_KPIS_UNAVAILABLE.map((kpi, idx) => {
                  const icons = [Leaf, Zap, Thermometer, Droplet];
                  const Icon = icons[idx % icons.length];
                  return (
                    <div key={kpi.name} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Icon className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-500">{kpi.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-400">—</span>
                        <span className="text-sm text-gray-400">{kpi.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
                <Info className="h-4 w-4 shrink-0 text-gray-400" />
                <p>
                  Măsurătorile de deșeuri, energie, apă și emisii nu sunt încă colectate în platformă.
                  Indicatorii vor apărea după configurarea sursei de date — nu afișăm valori estimate.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Risks */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Riscuri Recente</h3>
                <button
                  onClick={() => setActiveTab('risks')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Vezi toate →
                </button>
              </div>
              <div className="divide-y divide-gray-200">
                {sectionErrors.risks ? (
                  renderSectionError(sectionErrors.risks)
                ) : (
                  <>
                    {risks.slice(0, 5).map((risk) => (
                      <div key={risk.id} className="px-6 py-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{risk.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{risk.location}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getRiskLevelColor(risk.riskLevel)}`}>
                            {LEVEL_LABEL[risk.riskLevel] ?? risk.riskLevel}
                          </span>
                        </div>
                      </div>
                    ))}
                    {risks.length === 0 && (
                      <div className="px-6 py-8 text-center text-gray-500">
                        Nu există riscuri înregistrate
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Recent Incidents — GET /hse/incidents */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Incidente Recente</h3>
                <button
                  onClick={() => setActiveTab('incidents')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Vezi toate →
                </button>
              </div>
              <div className="divide-y divide-gray-200">
                {sectionErrors.incidents ? (
                  renderSectionError(sectionErrors.incidents)
                ) : (
                  <>
                    {incidents.slice(0, 5).map((incident) => (
                      <div key={incident.id} className="px-6 py-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{incident.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500">
                                {formatDate(incident.occurredAt)}
                              </span>
                              <span className={`px-1.5 py-0.5 text-xs rounded ${getStatusColor(incident.status)}`}>
                                {INCIDENT_STATUS_LABEL[incident.status] ?? incident.status}
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityColor(incident.severity)}`}>
                            {INCIDENT_SEVERITY_LABEL[incident.severity] ?? incident.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                    {incidents.length === 0 && (
                      <div className="px-6 py-8 text-center text-gray-500">
                        Fără incidente raportate
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'risks' ? (
        /* Risks Tab */
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută riscuri..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">Toate nivelurile</option>
                <option value="CRITICAL">Critic</option>
                <option value="HIGH">Ridicat</option>
                <option value="MEDIUM">Mediu</option>
                <option value="LOW">Scăzut</option>
              </select>
            </div>
            <button onClick={handleNewRiskAssessment} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Evaluare Nouă
            </button>
          </div>
          {sectionErrors.risks ? (
            renderSectionError(sectionErrors.risks)
          ) : risks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nu există evaluări de risc</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titlu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorie</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Locație</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nivel Risc</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revizuire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {risks
                    .filter(r => riskFilter === 'all' || r.riskLevel === riskFilter)
                    .filter(r => searchQuery === '' || r.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((risk) => (
                      <tr key={risk.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{risk.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{risk.description}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{risk.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {risk.location}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getRiskLevelColor(risk.riskLevel)}`}>
                            {LEVEL_LABEL[risk.riskLevel] ?? risk.riskLevel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(risk.status)}`}>
                            {ASSESSMENT_STATUS_LABEL[risk.status] ?? risk.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(risk.nextReview)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex space-x-2">
                            <button onClick={() => handleViewRisk(risk)} className="text-blue-600 hover:text-blue-900" title="Vizualizare">
                              <Eye className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleEditRisk(risk)} className="text-green-600 hover:text-green-900" title="Editare">
                              <Edit className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'incidents' ? (
        /* Incidents Tab — GET /hse/incidents */
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Registru Incidente</h3>
            <button onClick={handleReportIncident} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Raportare Incident
            </button>
          </div>
          {sectionErrors.incidents ? (
            renderSectionError(sectionErrors.incidents)
          ) : incidents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Fără incidente raportate</p>
              <p className="text-sm mt-2">Incidentele raportate vor apărea aici.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incident</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Locație</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severitate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{incident.title}</div>
                        {incident.incidentNumber && (
                          <div className="text-xs text-gray-500">{incident.incidentNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {INCIDENT_TYPE_LABEL[incident.type] ?? incident.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {incident.location}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(incident.severity)}`}>
                          {INCIDENT_SEVERITY_LABEL[incident.severity] ?? incident.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(incident.status)}`}>
                          {INCIDENT_STATUS_LABEL[incident.status] ?? incident.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(incident.occurredAt)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex space-x-2">
                          <button onClick={() => handleViewIncident(incident)} className="text-blue-600 hover:text-blue-900" title="Vizualizare">
                            <Eye className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleInvestigateIncident(incident)} className="text-green-600 hover:text-green-900" title="Investigare">
                            <ClipboardCheck className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'audits' ? (
        /* Audits Tab — GET /hse/dashboard/audits */
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Audituri ISO</h3>
            <button onClick={handleScheduleAudit} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Programare Audit
            </button>
          </div>
          {sectionErrors.audits ? (
            renderSectionError(sectionErrors.audits)
          ) : audits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nu există audituri programate</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Audit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Standard</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Constatări</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {audits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{audit.title}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs rounded ${
                          audit.standard === 'ISO_45001' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {String(audit.standard).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{AUDIT_TYPE_LABEL[audit.type] ?? audit.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(audit.scheduledDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(audit.status)}`}>
                          {AUDIT_STATUS_LABEL[audit.status] ?? audit.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{audit.findings}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex space-x-2">
                          <button onClick={() => handleViewAudit(audit)} className="text-blue-600 hover:text-blue-900" title="Vizualizare">
                            <Eye className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleDownloadAuditReport(audit)} className="text-gray-600 hover:text-gray-900" title="Raport">
                            <Download className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'compliance' ? (
        /* Compliance Tab — ISO 45001 from GET /hse/iso45001/score; ISO 14001 from completed audits */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ISO 45001 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">ISO 45001:2018</h3>
                  <p className="text-sm text-gray-500">Sisteme de management al SSM</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {sectionErrors.iso45001 || !iso45001 ? (
                renderSectionError(sectionErrors.iso45001 || 'Scorul ISO 45001 nu este disponibil')
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">Scor conformitate</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {iso45001Applicable > 0 ? `${iso45001.score}%` : '—'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${iso45001Applicable > 0 ? Math.min(iso45001.score, 100) : 0}%` }}
                    />
                  </div>
                  {iso45001Applicable === 0 ? (
                    <p className="text-sm text-gray-500">
                      Nicio clauză evaluată încă ({iso45001.notApplicable} clauze neevaluate). Scorul apare după prima evaluare a clauzelor.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Clauze conforme</span>
                        <span className="font-medium text-green-600">{iso45001.compliant}/{iso45001Applicable}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Parțial conforme</span>
                        <span className="font-medium text-yellow-600">{iso45001.partiallyCompliant}/{iso45001Applicable}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Neconforme</span>
                        <span className="font-medium text-red-600">{iso45001.nonCompliant}/{iso45001Applicable}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
              <button onClick={handleViewISO45001Details} className="mt-4 w-full bg-blue-50 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-100">
                Vezi detalii clauze
              </button>
            </div>
          </div>

          {/* ISO 14001 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Leaf className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">ISO 14001:2015</h3>
                  <p className="text-sm text-gray-500">Sisteme de management de mediu</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {sectionErrors.audits ? (
                renderSectionError(sectionErrors.audits)
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">Scor conformitate</span>
                    <span className="text-2xl font-bold text-green-600">
                      {iso14001Score === null ? '—' : `${iso14001Score}%`}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-green-600 rounded-full"
                      style={{ width: `${iso14001Score === null ? 0 : Math.min(iso14001Score, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {iso14001Score === null
                      ? 'Niciun audit ISO 14001 finalizat. Scorul se calculează din auditurile finalizate.'
                      : `Media scorului din ${iso14001Audits.length} ${iso14001Audits.length === 1 ? 'audit finalizat' : 'audituri finalizate'}.`}
                  </p>
                </>
              )}
              <button onClick={handleViewISO14001Details} className="mt-4 w-full bg-green-50 text-green-600 px-4 py-2 rounded-md hover:bg-green-100">
                Vezi detalii clauze
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Training Tab (REQ-038: wired to hse/training/courses) */
        <div className="bg-white rounded-lg shadow p-6">
          {trainingLoading ? (
            <p className="text-center py-12 text-gray-500">Se încarcă instruirile…</p>
          ) : trainingCourses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nicio instruire SSM înregistrată încă.</p>
              <p className="text-sm mt-2">Cursurile de instruire vor apărea aici după configurare.</p>
            </div>
          ) : (
            <div className="divide-y">
              {trainingCourses.map((c: any) => (
                <div key={c.id || c.courseId} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{c.title || c.name}</p>
                    {c.description && <p className="text-sm text-gray-500 mt-0.5">{c.description}</p>}
                  </div>
                  <div className="text-right text-sm text-gray-500 shrink-0">
                    {c.durationHours ? `${c.durationHours}h` : null}
                    {c.mandatory ? <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Obligatoriu</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-4">Acțiuni Rapide HSE</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => handleQuickAction('incident')} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm">Raportare Incident</span>
          </button>
          <button onClick={() => handleQuickAction('risk')} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="text-sm">Evaluare Risc</span>
          </button>
          <button onClick={() => handleQuickAction('checklist')} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <ClipboardCheck className="h-5 w-5 text-purple-600" />
            <span className="text-sm">Checklist PSSR</span>
          </button>
          <button onClick={() => handleQuickAction('export')} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <Download className="h-5 w-5 text-green-600" />
            <span className="text-sm">Export Raport</span>
          </button>
        </div>
      </div>
    </div>
  );
}
