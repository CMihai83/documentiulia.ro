'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { notifyNotAvailable, toastFromAnywhere } from '@/lib/toast-bus';
import { api } from '@/lib/api';
import {
  ClipboardCheck,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Award,
  BarChart3,
  RefreshCw,
  Plus,
  Search,
  Filter,
  FileText,
  Users,
  Calendar,
  AlertCircle,
  Target,
  Activity,
  CheckCircle,
  Factory,
  Loader2,
  Inbox,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Backend response shapes (NestJS /api/v1, see backend/src/quality/*.service.ts)
// Only the fields this page reads are declared.
// ---------------------------------------------------------------------------

type ApiInspectionResult = 'pass' | 'fail' | 'conditional_pass' | 'pending';
type ApiInspectionStatus =
  | 'planned'
  | 'in_progress'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'cancelled';

interface ApiInspection {
  id: string;
  inspectionNumber: string;
  type: string;
  status: ApiInspectionStatus;
  result: ApiInspectionResult;
  itemCode?: string;
  itemName?: string;
  supplierName?: string;
  inspectedByName?: string;
  plannedDate?: string;
  completedAt?: string;
  createdAt: string;
  acceptanceRate?: number;
  totalDefects?: number;
}

type ApiNCRStatus =
  | 'draft'
  | 'open'
  | 'under_investigation'
  | 'pending_disposition'
  | 'disposition_approved'
  | 'in_progress'
  | 'pending_verification'
  | 'closed'
  | 'cancelled';

interface ApiNCR {
  id: string;
  ncrNumber: string;
  status: ApiNCRStatus;
  type: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  title: string;
  detectedDate: string;
  detectedByName?: string;
  assignedToName?: string;
  departmentName?: string;
  supplierName?: string;
  dueDate?: string;
  capaNumber?: string;
  createdAt: string;
}

type ApiCAPAStatus =
  | 'draft'
  | 'open'
  | 'investigation'
  | 'action_planning'
  | 'implementation'
  | 'verification'
  | 'effectiveness_check'
  | 'closed'
  | 'cancelled';

interface ApiCAPAAction {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'verified' | 'overdue' | 'cancelled';
}

interface ApiCAPA {
  id: string;
  capaNumber: string;
  status: ApiCAPAStatus;
  type: 'corrective' | 'preventive' | 'both';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  ownerName?: string;
  targetDate?: string;
  ncrNumber?: string;
  correctiveActions?: ApiCAPAAction[];
  preventiveActions?: ApiCAPAAction[];
  createdAt: string;
}

type ApiDocumentStatus =
  | 'draft'
  | 'pending_review'
  | 'under_review'
  | 'pending_approval'
  | 'approved'
  | 'released'
  | 'obsolete'
  | 'archived';

interface ApiQualityDocument {
  id: string;
  documentNumber: string;
  title: string;
  type: string;
  status: ApiDocumentStatus;
  version: string;
  approverName?: string;
  approvedAt?: string;
  nextReviewDate?: string;
}

interface ApiSupplierQualification {
  id: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  status: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  overallScore: number;
  activeNCRCount: number;
  lastAuditDate?: string;
  nextAuditDate?: string;
  performanceMetrics?: {
    qualityRate?: number;
    onTimeDeliveryRate?: number;
    defectRate?: number;
    totalOrders?: number;
    totalDefects?: number;
  };
}

interface ApiSupplierMetrics {
  totalSuppliers: number;
  averageScore: number;
  averageQualityRate: number;
  averageOnTimeDelivery: number;
  suppliersRequiringAudit: number;
  suppliersExpiringSoon: number;
}

interface ApiCertification {
  id: string;
  status: string;
}

// ---------------------------------------------------------------------------
// UI types (what the page renders)
// ---------------------------------------------------------------------------

interface QualitySummary {
  openNCRs: number | null;
  totalNCRs: number | null;
  pendingCAPAs: number | null;
  resolvedCAPAs: number | null;
  inspectionPassRate: number | null;
  completedInspections: number | null;
  pendingInspections: number | null;
  totalInspections: number | null;
  supplierScoreAvg: number | null;
  totalSuppliers: number | null;
  certifications: number | null;
}

type InspectionUiStatus = 'PASS' | 'FAIL' | 'PENDING' | 'CONDITIONAL' | 'ON_HOLD' | 'CANCELLED';

interface Inspection {
  id: string;
  inspectionNumber: string;
  type: string;
  product: string;
  inspector: string;
  date: string;
  status: InspectionUiStatus;
  score: number | null;
  findings: number;
}

type NCRUiStatus = 'OPEN' | 'IN_REVIEW' | 'CLOSED' | 'CANCELLED';
type NCRUiSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'OBSERVATION';

interface NonConformance {
  id: string;
  ncrNumber: string;
  title: string;
  severity: NCRUiSeverity;
  status: NCRUiStatus;
  reportedBy: string;
  reportedDate: string;
  dueDate?: string;
  assignedTo?: string;
  department: string;
  relatedCAPA?: string;
}

type CAPAUiStatus = 'OPEN' | 'IN_PROGRESS' | 'VERIFICATION' | 'CLOSED' | 'CANCELLED';
type CAPAUiType = 'CORRECTIVE' | 'PREVENTIVE' | 'BOTH';
type CAPAUiPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface CAPA {
  id: string;
  capaNumber: string;
  title: string;
  type: CAPAUiType;
  status: CAPAUiStatus;
  priority: CAPAUiPriority;
  owner: string;
  dueDate?: string;
  completionPercentage: number | null;
  totalActions: number;
  relatedNCR?: string;
}

type DocumentUiStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'OBSOLETE';

interface QualityDocument {
  id: string;
  documentNumber: string;
  title: string;
  type: string;
  rawType: string;
  version: string;
  status: DocumentUiStatus;
  approvedBy?: string;
  approvedDate?: string;
  nextReviewDate?: string;
}

interface SupplierQuality {
  id: string;
  supplierName: string;
  supplierCode: string;
  qualityScore: number;
  status: string;
  riskLevel: string;
  qualityRate: number | null;
  onTimeDeliveryRate: number | null;
  totalOrders: number | null;
  totalDefects: number | null;
  openNCRs: number;
  lastAuditDate?: string;
  nextAuditDate?: string;
}

type TabType = 'dashboard' | 'inspections' | 'ncr' | 'capa' | 'documents' | 'suppliers';
type SectionKey = 'inspections' | 'ncr' | 'capa' | 'documents' | 'suppliers';

// ---------------------------------------------------------------------------
// Label / colour helpers (Romanian with diacritics)
// ---------------------------------------------------------------------------

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    PASS: 'bg-green-100 text-green-800',
    FAIL: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONDITIONAL: 'bg-orange-100 text-orange-800',
    ON_HOLD: 'bg-orange-100 text-orange-800',
    OPEN: 'bg-red-100 text-red-800',
    IN_REVIEW: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    VERIFICATION: 'bg-purple-100 text-purple-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
    REJECTED: 'bg-red-100 text-red-800',
    CRITICAL: 'bg-red-100 text-red-800',
    MAJOR: 'bg-orange-100 text-orange-800',
    MINOR: 'bg-yellow-100 text-yellow-800',
    OBSERVATION: 'bg-gray-100 text-gray-700',
    HIGH: 'bg-red-100 text-red-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
    CORRECTIVE: 'bg-blue-100 text-blue-800',
    PREVENTIVE: 'bg-purple-100 text-purple-800',
    BOTH: 'bg-indigo-100 text-indigo-800',
    DRAFT: 'bg-gray-100 text-gray-800',
    REVIEW: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    OBSOLETE: 'bg-red-100 text-red-800',
    // supplier qualification status
    qualified: 'bg-green-100 text-green-800',
    conditionally_qualified: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-blue-100 text-blue-800',
    under_evaluation: 'bg-blue-100 text-blue-800',
    on_hold: 'bg-orange-100 text-orange-800',
    disqualified: 'bg-red-100 text-red-800',
    expired: 'bg-red-100 text-red-800',
    // supplier risk
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    PASS: 'Trecut',
    FAIL: 'Picat',
    PENDING: 'În așteptare',
    CONDITIONAL: 'Condiționat',
    ON_HOLD: 'Suspendat',
    OPEN: 'Deschis',
    IN_REVIEW: 'În analiză',
    IN_PROGRESS: 'În desfășurare',
    VERIFICATION: 'Verificare',
    COMPLETED: 'Finalizat',
    CLOSED: 'Închis',
    CANCELLED: 'Anulat',
    REJECTED: 'Respins',
    CRITICAL: 'Critic',
    MAJOR: 'Major',
    MINOR: 'Minor',
    OBSERVATION: 'Observație',
    HIGH: 'Ridicat',
    MEDIUM: 'Mediu',
    LOW: 'Scăzut',
    CORRECTIVE: 'Corectiv',
    PREVENTIVE: 'Preventiv',
    BOTH: 'Corectiv + Preventiv',
    DRAFT: 'Ciornă',
    REVIEW: 'În revizuire',
    APPROVED: 'Aprobat',
    OBSOLETE: 'Învechit',
    qualified: 'Calificat',
    conditionally_qualified: 'Calificat condiționat',
    pending: 'În așteptare',
    under_evaluation: 'În evaluare',
    on_hold: 'Suspendat',
    disqualified: 'Descalificat',
    expired: 'Expirat',
    low: 'Scăzut',
    medium: 'Mediu',
    high: 'Ridicat',
    critical: 'Critic',
  };
  return labels[status] || status;
};

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  incoming: 'Recepție',
  in_process: 'În proces',
  final: 'Finală',
  receiving: 'Primire',
  shipping: 'Expediere',
  periodic: 'Periodică',
  random: 'Aleatorie',
  customer_return: 'Retur client',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  procedure: 'Procedură',
  work_instruction: 'Instrucțiune de lucru',
  specification: 'Specificație',
  standard: 'Standard',
  form: 'Formular',
  template: 'Șablon',
  policy: 'Politică',
  manual: 'Manual',
  drawing: 'Desen',
  certificate: 'Certificat',
  audit_report: 'Raport audit',
  inspection_record: 'Înregistrare inspecție',
  calibration_record: 'Înregistrare calibrare',
  training_record: 'Înregistrare instruire',
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'MAJOR':
      return <AlertOctagon className="w-4 h-4 text-orange-600" />;
    case 'MINOR':
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-600" />;
  }
};

const fmtDate = (value?: string | null): string => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ro-RO');
};

const isOverdue = (value?: string | null): boolean => {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d < new Date();
};

const fmtNumber = (value: number | null | undefined, suffix = ''): string =>
  value === null || value === undefined || Number.isNaN(value) ? '—' : `${Math.round(value)}${suffix}`;

// ---------------------------------------------------------------------------
// Mappers: backend -> UI
// ---------------------------------------------------------------------------

const mapInspection = (i: ApiInspection): Inspection => {
  let status: InspectionUiStatus = 'PENDING';
  if (i.status === 'on_hold') status = 'ON_HOLD';
  else if (i.status === 'cancelled') status = 'CANCELLED';
  else if (i.status === 'approved' || i.status === 'rejected') {
    if (i.result === 'pass') status = 'PASS';
    else if (i.result === 'fail') status = 'FAIL';
    else if (i.result === 'conditional_pass') status = 'CONDITIONAL';
  }
  const isCompleted = i.status === 'approved' || i.status === 'rejected';
  const productParts = [i.itemCode, i.itemName].filter(Boolean);
  return {
    id: i.id,
    inspectionNumber: i.inspectionNumber,
    type: INSPECTION_TYPE_LABELS[i.type] || i.type,
    product: productParts.length > 0 ? productParts.join(' — ') : '—',
    inspector: i.inspectedByName || '—',
    date: i.completedAt || i.plannedDate || i.createdAt,
    status,
    score: isCompleted && typeof i.acceptanceRate === 'number' ? Math.round(i.acceptanceRate) : null,
    findings: i.totalDefects ?? 0,
  };
};

const mapNCRStatus = (s: ApiNCRStatus): NCRUiStatus => {
  if (s === 'closed') return 'CLOSED';
  if (s === 'cancelled') return 'CANCELLED';
  if (s === 'draft' || s === 'open') return 'OPEN';
  return 'IN_REVIEW';
};

const mapNCR = (n: ApiNCR): NonConformance => ({
  id: n.id,
  ncrNumber: n.ncrNumber,
  title: n.title,
  severity: (n.severity || 'minor').toUpperCase() as NCRUiSeverity,
  status: mapNCRStatus(n.status),
  reportedBy: n.detectedByName || '—',
  reportedDate: n.detectedDate || n.createdAt,
  dueDate: n.dueDate,
  assignedTo: n.assignedToName,
  department: n.departmentName || n.supplierName || '—',
  relatedCAPA: n.capaNumber,
});

const mapCAPAStatus = (s: ApiCAPAStatus): CAPAUiStatus => {
  if (s === 'closed') return 'CLOSED';
  if (s === 'cancelled') return 'CANCELLED';
  if (s === 'draft' || s === 'open') return 'OPEN';
  if (s === 'verification' || s === 'effectiveness_check') return 'VERIFICATION';
  return 'IN_PROGRESS';
};

const mapCAPA = (c: ApiCAPA): CAPA => {
  const actions = [...(c.correctiveActions || []), ...(c.preventiveActions || [])];
  const done = actions.filter((a) => a.status === 'completed' || a.status === 'verified').length;
  let completionPercentage: number | null = null;
  if (actions.length > 0) completionPercentage = Math.round((done / actions.length) * 100);
  else if (c.status === 'closed') completionPercentage = 100;
  return {
    id: c.id,
    capaNumber: c.capaNumber,
    title: c.title,
    type: (c.type || 'corrective').toUpperCase() as CAPAUiType,
    status: mapCAPAStatus(c.status),
    priority: (c.priority || 'medium').toUpperCase() as CAPAUiPriority,
    owner: c.ownerName || '—',
    dueDate: c.targetDate,
    completionPercentage,
    totalActions: actions.length,
    relatedNCR: c.ncrNumber,
  };
};

const mapDocumentStatus = (s: ApiDocumentStatus): DocumentUiStatus => {
  if (s === 'approved' || s === 'released') return 'APPROVED';
  if (s === 'obsolete' || s === 'archived') return 'OBSOLETE';
  if (s === 'draft') return 'DRAFT';
  return 'REVIEW';
};

const mapDocument = (d: ApiQualityDocument): QualityDocument => ({
  id: d.id,
  documentNumber: d.documentNumber,
  title: d.title,
  type: DOCUMENT_TYPE_LABELS[d.type] || d.type,
  rawType: d.type,
  version: d.version,
  status: mapDocumentStatus(d.status),
  approvedBy: d.approverName,
  approvedDate: d.approvedAt,
  nextReviewDate: d.nextReviewDate,
});

const mapSupplier = (s: ApiSupplierQualification): SupplierQuality => ({
  id: s.id,
  supplierName: s.supplierName,
  supplierCode: s.supplierCode,
  qualityScore: s.overallScore ?? 0,
  status: s.status,
  riskLevel: s.riskLevel,
  qualityRate: s.performanceMetrics?.qualityRate ?? null,
  onTimeDeliveryRate: s.performanceMetrics?.onTimeDeliveryRate ?? null,
  totalOrders: s.performanceMetrics?.totalOrders ?? null,
  totalDefects: s.performanceMetrics?.totalDefects ?? null,
  openNCRs: s.activeNCRCount ?? 0,
  lastAuditDate: s.lastAuditDate,
  nextAuditDate: s.nextAuditDate,
});

// ---------------------------------------------------------------------------
// Small presentational helpers for section states
// ---------------------------------------------------------------------------

function SectionLoading({ text = 'Se încarcă…' }: { text?: string }) {
  return (
    <div role="status" className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>{text}</span>
    </div>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="p-6 text-center rounded-lg border border-amber-300 bg-amber-50 text-amber-900">
      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
      <p className="font-medium">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-400 bg-white hover:bg-amber-100 text-sm"
      >
        <RefreshCw className="w-4 h-4" />
        Reîncearcă
      </button>
    </div>
  );
}

function SectionEmpty({ text, icon: Icon = Inbox }: { text: string; icon?: typeof Inbox }) {
  return (
    <div className="p-8 text-center text-gray-500">
      <Icon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
      <p>{text}</p>
    </div>
  );
}

const SECTION_ERROR_TEXT: Record<SectionKey, string> = {
  inspections: 'Nu am putut încărca inspecțiile.',
  ncr: 'Nu am putut încărca neconformitățile.',
  capa: 'Nu am putut încărca acțiunile CAPA.',
  documents: 'Nu am putut încărca documentele de calitate.',
  suppliers: 'Nu am putut încărca evaluările furnizorilor.',
};

const SECTION_ENDPOINT: Record<SectionKey, string> = {
  inspections: '/quality-inspections',
  ncr: '/non-conformance',
  capa: '/capa',
  documents: '/quality-documents',
  suppliers: '/supplier-quality',
};

const ALL_SECTIONS: SectionKey[] = ['inspections', 'ncr', 'capa', 'documents', 'suppliers'];

const initialFlags = (value: boolean): Record<SectionKey, boolean> => ({
  inspections: value,
  ncr: value,
  capa: value,
  documents: value,
  suppliers: value,
});

const initialErrors = (): Record<SectionKey, string | null> => ({
  inspections: null,
  ncr: null,
  capa: null,
  documents: null,
  suppliers: null,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function QualityPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ncrs, setNCRs] = useState<NonConformance[]>([]);
  const [capas, setCAPAs] = useState<CAPA[]>([]);
  const [documents, setDocuments] = useState<QualityDocument[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierQuality[]>([]);
  const [supplierMetrics, setSupplierMetrics] = useState<ApiSupplierMetrics | null>(null);
  const [certificationsCount, setCertificationsCount] = useState<number | null>(null);

  const [sectionLoading, setSectionLoading] = useState<Record<SectionKey, boolean>>(initialFlags(true));
  const [sectionError, setSectionError] = useState<Record<SectionKey, string | null>>(initialErrors());
  const [initialLoading, setInitialLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [capaTypeFilter, setCapaTypeFilter] = useState<string>('all');
  const [capaPriorityFilter, setCapaPriorityFilter] = useState<string>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [docStatusFilter, setDocStatusFilter] = useState<string>('all');

  // -------------------------------------------------------------------------
  // Data loading — one function per backend list, all real endpoints.
  // -------------------------------------------------------------------------

  const loadSection = useCallback(async (key: SectionKey): Promise<boolean> => {
    const setLoadingFor = (k: SectionKey, value: boolean) =>
      setSectionLoading((prev) => ({ ...prev, [k]: value }));
    const setErrorFor = (k: SectionKey, value: string | null) =>
      setSectionError((prev) => ({ ...prev, [k]: value }));

    setLoadingFor(key, true);
    try {
      switch (key) {
        case 'inspections': {
          const res = await api.get<ApiInspection[]>(SECTION_ENDPOINT.inspections);
          if (res.error || !Array.isArray(res.data)) throw new Error(res.error || 'Răspuns neașteptat de la server');
          setInspections(res.data.map(mapInspection));
          break;
        }
        case 'ncr': {
          const res = await api.get<ApiNCR[]>(SECTION_ENDPOINT.ncr);
          if (res.error || !Array.isArray(res.data)) throw new Error(res.error || 'Răspuns neașteptat de la server');
          setNCRs(res.data.map(mapNCR));
          break;
        }
        case 'capa': {
          const res = await api.get<ApiCAPA[]>(SECTION_ENDPOINT.capa);
          if (res.error || !Array.isArray(res.data)) throw new Error(res.error || 'Răspuns neașteptat de la server');
          setCAPAs(res.data.map(mapCAPA));
          break;
        }
        case 'documents': {
          const res = await api.get<ApiQualityDocument[]>(SECTION_ENDPOINT.documents);
          if (res.error || !Array.isArray(res.data)) throw new Error(res.error || 'Răspuns neașteptat de la server');
          setDocuments(res.data.map(mapDocument));
          break;
        }
        case 'suppliers': {
          // List is the source of truth for the tab; metrics + certifications
          // are best-effort extras for the summary cards (null = unavailable).
          const [listRes, metricsRes, certRes] = await Promise.all([
            api.get<ApiSupplierQualification[]>(SECTION_ENDPOINT.suppliers),
            api.get<ApiSupplierMetrics>('/supplier-quality/metrics'),
            api.get<ApiCertification[]>('/certifications'),
          ]);
          setSupplierMetrics(!metricsRes.error && metricsRes.data ? metricsRes.data : null);
          setCertificationsCount(!certRes.error && Array.isArray(certRes.data) ? certRes.data.length : null);
          if (listRes.error || !Array.isArray(listRes.data)) {
            throw new Error(listRes.error || 'Răspuns neașteptat de la server');
          }
          setSuppliers(listRes.data.map(mapSupplier));
          break;
        }
      }
      setErrorFor(key, null);
      return true;
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Eroare necunoscută';
      setErrorFor(key, `${SECTION_ERROR_TEXT[key]} (${detail})`);
      return false;
    } finally {
      setLoadingFor(key, false);
    }
  }, []);

  const fetchAll = useCallback(async (notifyOnFailure = false) => {
    const results = await Promise.all(ALL_SECTIONS.map((key) => loadSection(key)));
    setInitialLoading(false);
    const failed = results.filter((ok) => !ok).length;
    if (notifyOnFailure) {
      if (failed === 0) {
        toastFromAnywhere('success', 'Date actualizate', 'Modulul de calitate a fost reîncărcat.');
      } else {
        toastFromAnywhere(
          'error',
          'Reîncărcare parțială',
          `${failed} din ${ALL_SECTIONS.length} secțiuni nu au putut fi încărcate. Vezi detaliile în fiecare tab.`,
        );
      }
    }
  }, [loadSection]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Reset text search / status filter when switching tabs (they are tab-specific)
  useEffect(() => {
    setSearchTerm('');
    setFilterStatus('all');
  }, [activeTab]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const summary = useMemo<QualitySummary>(() => {
    const inspOk = !sectionError.inspections;
    const ncrOk = !sectionError.ncr;
    const capaOk = !sectionError.capa;
    const supOk = !sectionError.suppliers;

    const completed = inspections.filter((i) => i.status === 'PASS' || i.status === 'FAIL' || i.status === 'CONDITIONAL');
    const passed = completed.filter((i) => i.status === 'PASS' || i.status === 'CONDITIONAL');
    const pendingInsp = inspections.filter((i) => i.status === 'PENDING' || i.status === 'ON_HOLD');

    const openNcr = ncrs.filter((n) => n.status === 'OPEN' || n.status === 'IN_REVIEW');
    const openCapa = capas.filter((c) => c.status !== 'CLOSED' && c.status !== 'CANCELLED');
    const closedCapa = capas.filter((c) => c.status === 'CLOSED');

    let supplierAvg: number | null = null;
    if (supOk) {
      if (supplierMetrics && typeof supplierMetrics.averageScore === 'number') supplierAvg = supplierMetrics.averageScore;
      else if (suppliers.length > 0) supplierAvg = suppliers.reduce((acc, s) => acc + s.qualityScore, 0) / suppliers.length;
    }

    return {
      openNCRs: ncrOk ? openNcr.length : null,
      totalNCRs: ncrOk ? ncrs.length : null,
      pendingCAPAs: capaOk ? openCapa.length : null,
      resolvedCAPAs: capaOk ? closedCapa.length : null,
      inspectionPassRate: inspOk && completed.length > 0 ? (passed.length / completed.length) * 100 : null,
      completedInspections: inspOk ? completed.length : null,
      pendingInspections: inspOk ? pendingInsp.length : null,
      totalInspections: inspOk ? inspections.length : null,
      supplierScoreAvg: supplierAvg,
      totalSuppliers: supOk ? suppliers.length : null,
      certifications: certificationsCount,
    };
  }, [inspections, ncrs, capas, suppliers, supplierMetrics, certificationsCount, sectionError]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredInspections = inspections.filter((item) => {
    const matchesSearch =
      !normalizedSearch ||
      item.product.toLowerCase().includes(normalizedSearch) ||
      item.inspectionNumber.toLowerCase().includes(normalizedSearch);
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredNCRs = ncrs.filter((item) => {
    const matchesSearch =
      !normalizedSearch ||
      item.title.toLowerCase().includes(normalizedSearch) ||
      item.ncrNumber.toLowerCase().includes(normalizedSearch);
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredCAPAs = capas.filter((item) => {
    const matchesType = capaTypeFilter === 'all' || item.type === capaTypeFilter;
    const matchesPriority = capaPriorityFilter === 'all' || item.priority === capaPriorityFilter;
    return matchesType && matchesPriority;
  });

  const filteredDocuments = documents.filter((item) => {
    const matchesType = docTypeFilter === 'all' || item.rawType === docTypeFilter;
    const matchesStatus = docStatusFilter === 'all' || item.status === docStatusFilter;
    return matchesType && matchesStatus;
  });

  const openNCRList = ncrs.filter((n) => n.status === 'OPEN' || n.status === 'IN_REVIEW');
  const activeCAPAList = capas.filter((c) => c.status !== 'CLOSED' && c.status !== 'CANCELLED');

  // -------------------------------------------------------------------------
  // Action handlers
  // -------------------------------------------------------------------------

  const handleAddNew = () => {
    if (activeTab === 'ncr') {
      router.push('/dashboard/quality/ncr/new');
    } else if (activeTab === 'capa') {
      router.push('/dashboard/quality/capa/new');
    } else if (activeTab === 'documents') {
      router.push('/dashboard/quality/documents/new');
    } else {
      notifyNotAvailable();
    }
  };

  const handleNCRAction = (ncr: NonConformance) => {
    router.push(`/dashboard/quality/ncr/${ncr.id}`);
  };

  const handleOpenFilters = () => {
    toast.info('În dezvoltare', 'Filtre avansate — funcționalitate în dezvoltare.');
  };

  const handleInspectionDetails = (inspection: Inspection) => {
    router.push(`/dashboard/quality/inspections/${inspection.id}`);
  };

  const handleFinalizeInspection = async (_inspection: Inspection) => {
    notifyNotAvailable('Finalizare inspecție');
  };

  const handleNewNCR = () => {
    router.push('/dashboard/quality/ncr/new');
  };

  const handleNCRDetails = (ncr: NonConformance) => {
    router.push(`/dashboard/quality/ncr/${ncr.id}`);
  };

  const handleResolveNCR = async (_ncr: NonConformance) => {
    notifyNotAvailable('Rezolvare NCR');
  };

  const handleNewCAPA = () => {
    router.push('/dashboard/quality/capa/new');
  };

  const handleCAPADetails = (capa: CAPA) => {
    router.push(`/dashboard/quality/capa/${capa.id}`);
  };

  const handleUpdateCAPA = (_capa: CAPA) => {
    notifyNotAvailable('Actualizare CAPA');
  };

  const handleCloseCAPA = async (_capa: CAPA) => {
    notifyNotAvailable('Închidere CAPA');
  };

  const handleNewDocument = () => {
    router.push('/dashboard/quality/documents/new');
  };

  const handleViewDocument = (_doc: QualityDocument) => {
    notifyNotAvailable('Vizualizare document');
  };

  const handleEditDocument = (_doc: QualityDocument) => {
    notifyNotAvailable('Editare document');
  };

  const handleSupplierHistory = (_supplier: SupplierQuality) => {
    notifyNotAvailable('Istoric furnizor');
  };

  const handleSupplierAudit = (_supplier: SupplierQuality) => {
    notifyNotAvailable('Audit furnizor');
  };

  const handleSupplierReport = (_supplier: SupplierQuality) => {
    notifyNotAvailable('Raport calitate furnizor');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'inspections', label: 'Inspecții', icon: ClipboardCheck },
    { id: 'ncr', label: 'NCR', icon: AlertOctagon },
    { id: 'capa', label: 'CAPA', icon: Target },
    { id: 'documents', label: 'Documente', icon: FileText },
    { id: 'suppliers', label: 'Furnizori', icon: Factory },
  ];

  const anyLoading = ALL_SECTIONS.some((k) => sectionLoading[k]);

  // Renders the loading / error / empty state for a tab; returns null when data should render.
  const renderSectionState = (key: SectionKey, isEmpty: boolean, emptyText: string, EmptyIcon?: typeof Inbox) => {
    if (sectionLoading[key]) return <SectionLoading />;
    const err = sectionError[key];
    if (err) return <SectionError message={err} onRetry={() => loadSection(key)} />;
    if (isEmpty) return <SectionEmpty text={emptyText} icon={EmptyIcon} />;
    return null;
  };

  // -------------------------------------------------------------------------
  // Initial skeleton
  // -------------------------------------------------------------------------

  if (initialLoading) {
    return (
      <div className="space-y-6 animate-pulse" role="status" aria-label="Se încarcă modulul de calitate">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500">Se încarcă datele de calitate…</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Managementul Calității</h1>
          <p className="text-gray-600">Inspecții, NCR, CAPA, documente și evaluare furnizori</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchAll(true)}
            disabled={anyLoading}
            aria-label="Reîncarcă datele"
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${anyLoading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Adaugă
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <AlertOctagon className="w-4 h-4" />
            NCR deschise
          </div>
          <div className="text-2xl font-bold text-red-600">{fmtNumber(summary.openNCRs)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.totalNCRs === null ? 'date indisponibile' : `din ${summary.totalNCRs} total`}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Target className="w-4 h-4" />
            CAPA deschise
          </div>
          <div className="text-2xl font-bold text-yellow-600">{fmtNumber(summary.pendingCAPAs)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.resolvedCAPAs === null ? 'date indisponibile' : `${summary.resolvedCAPAs} închise`}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <CheckCircle2 className="w-4 h-4" />
            Rată trecere inspecții
          </div>
          <div className="text-2xl font-bold text-green-600">{fmtNumber(summary.inspectionPassRate, '%')}</div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.totalInspections === null
              ? 'date indisponibile'
              : summary.completedInspections === 0
                ? `${summary.totalInspections} inspecții, niciuna finalizată`
                : `${summary.completedInspections} finalizate · ${summary.pendingInspections} în așteptare`}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Award className="w-4 h-4" />
            Scor mediu furnizori
          </div>
          <div className="text-2xl font-bold text-blue-600">{fmtNumber(summary.supplierScoreAvg)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.totalSuppliers === null
              ? 'date indisponibile'
              : `${summary.totalSuppliers} furnizori · ${summary.certifications === null ? 'certificări indisponibile' : `${summary.certifications} certificări`}`}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto" aria-label="Secțiuni calitate">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Dashboard tab                                                       */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Inspections */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-500" />
                Inspecții recente
              </h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {renderSectionState('inspections', inspections.length === 0, 'Nicio inspecție înregistrată', ClipboardCheck) ??
                inspections.slice(0, 5).map((inspection) => (
                  <div key={inspection.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{inspection.inspectionNumber}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(inspection.status)}`}>
                            {getStatusLabel(inspection.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{inspection.product}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{inspection.type}</span>
                          <span>{inspection.inspector}</span>
                          <span>{fmtDate(inspection.date)}</span>
                        </div>
                      </div>
                      {inspection.score !== null && (
                        <div className="text-right ml-4">
                          <div
                            className={`text-lg font-bold ${
                              inspection.score >= 90 ? 'text-green-600' : inspection.score >= 75 ? 'text-yellow-600' : 'text-red-600'
                            }`}
                          >
                            {inspection.score}%
                          </div>
                          <p className="text-xs text-gray-500">rată acceptare</p>
                          {inspection.findings > 0 && (
                            <p className="text-xs text-red-500 mt-1">{inspection.findings} defecte</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Open Non-Conformances */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-500" />
                Neconformități deschise{!sectionError.ncr && !sectionLoading.ncr ? ` (${openNCRList.length})` : ''}
              </h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {renderSectionState('ncr', openNCRList.length === 0, 'Nicio neconformitate deschisă', CheckCircle) ??
                openNCRList.map((ncr) => (
                  <div key={ncr.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(ncr.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{ncr.ncrNumber}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(ncr.severity)}`}>
                            {getStatusLabel(ncr.severity)}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(ncr.status)}`}>
                            {getStatusLabel(ncr.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{ncr.title}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {ncr.assignedTo || 'Neasignat'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Termen: {fmtDate(ncr.dueDate)}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleNCRAction(ncr)} className="text-blue-600 hover:text-blue-800 text-sm">
                        Acțiune
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* CAPA Tracking */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Urmărire CAPA
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {renderSectionState('capa', activeCAPAList.length === 0, 'Nicio acțiune CAPA activă', Target) ??
                activeCAPAList.slice(0, 4).map((capa) => (
                  <div key={capa.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{capa.capaNumber}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(capa.type)}`}>
                            {getStatusLabel(capa.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{capa.title}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(capa.priority)}`}>
                        {getStatusLabel(capa.priority)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {capa.owner}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(capa.dueDate)}
                      </span>
                      {capa.relatedNCR && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <AlertOctagon className="w-3 h-3" />
                          {capa.relatedNCR}
                        </span>
                      )}
                    </div>
                    {capa.completionPercentage === null ? (
                      <p className="text-xs text-gray-400">Nicio acțiune definită încă</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              capa.completionPercentage === 100
                                ? 'bg-green-500'
                                : capa.completionPercentage >= 75
                                  ? 'bg-blue-500'
                                  : capa.completionPercentage >= 50
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                            }`}
                            style={{ width: `${capa.completionPercentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-12 text-right">{capa.completionPercentage}%</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Quality Trends — no backend series wired yet; say so honestly */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Tendințe calitate
              </h3>
            </div>
            <div className="p-6">
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center px-4">
                  <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 text-sm font-medium">Graficul de tendințe nu este încă disponibil</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Seria istorică de indicatori nu este încă expusă de server; datele nu sunt simulate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Inspections tab                                                     */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'inspections' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută inspecții (număr, produs...)"
                aria-label="Caută inspecții"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filtrează după status"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toate statusurile</option>
                <option value="PASS">Trecut</option>
                <option value="FAIL">Picat</option>
                <option value="CONDITIONAL">Condiționat</option>
                <option value="PENDING">În așteptare</option>
                <option value="ON_HOLD">Suspendat</option>
                <option value="CANCELLED">Anulat</option>
              </select>
              <button onClick={handleOpenFilters} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                Filtre
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {renderSectionState(
              'inspections',
              filteredInspections.length === 0,
              inspections.length === 0 ? 'Nicio inspecție înregistrată' : 'Nicio inspecție nu corespunde filtrelor',
              ClipboardCheck,
            ) ?? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspecție</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produs</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspector</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rată acceptare</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInspections.map((inspection) => (
                      <tr key={inspection.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-medium text-gray-900">{inspection.inspectionNumber}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inspection.type}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{inspection.product}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inspection.inspector}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtDate(inspection.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {inspection.score !== null ? (
                              <>
                                <span
                                  className={`font-medium ${
                                    inspection.score >= 90 ? 'text-green-600' : inspection.score >= 75 ? 'text-yellow-600' : 'text-red-600'
                                  }`}
                                >
                                  {inspection.score}%
                                </span>
                                {inspection.findings > 0 && (
                                  <span className="text-xs text-red-500">({inspection.findings} defecte)</span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(inspection.status)}`}>
                            {getStatusLabel(inspection.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button onClick={() => handleInspectionDetails(inspection)} className="text-blue-600 hover:text-blue-800 mr-3">
                            Detalii
                          </button>
                          {inspection.status === 'PENDING' && (
                            <button onClick={() => handleFinalizeInspection(inspection)} className="text-green-600 hover:text-green-800">
                              Finalizează
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* NCR tab                                                             */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'ncr' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută NCR (număr, titlu...)"
                aria-label="Caută neconformități"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filtrează după status"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toate statusurile</option>
                <option value="OPEN">Deschis</option>
                <option value="IN_REVIEW">În analiză</option>
                <option value="CLOSED">Închis</option>
                <option value="CANCELLED">Anulat</option>
              </select>
              <button onClick={handleNewNCR} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                <Plus className="w-4 h-4" />
                NCR nou
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {renderSectionState(
              'ncr',
              filteredNCRs.length === 0,
              ncrs.length === 0 ? 'Nicio neconformitate înregistrată' : 'Nicio neconformitate nu corespunde filtrelor',
              AlertOctagon,
            ) ?? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NCR</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titlu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severitate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departament</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Termen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredNCRs.map((ncr) => (
                      <tr key={ncr.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(ncr.severity)}
                            <p className="font-medium text-gray-900">{ncr.ncrNumber}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{ncr.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Raportat de {ncr.reportedBy} — {fmtDate(ncr.reportedDate)}
                            {ncr.relatedCAPA && <span className="ml-2 text-blue-600">CAPA {ncr.relatedCAPA}</span>}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ncr.severity)}`}>
                            {getStatusLabel(ncr.severity)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ncr.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ncr.assignedTo || 'Neasignat'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{fmtDate(ncr.dueDate)}</div>
                          {isOverdue(ncr.dueDate) && ncr.status !== 'CLOSED' && ncr.status !== 'CANCELLED' && (
                            <span className="text-xs text-red-500">Întârziat</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ncr.status)}`}>
                            {getStatusLabel(ncr.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button onClick={() => handleNCRDetails(ncr)} className="text-blue-600 hover:text-blue-800 mr-3">
                            Detalii
                          </button>
                          {ncr.status === 'OPEN' && (
                            <button onClick={() => handleResolveNCR(ncr)} className="text-green-600 hover:text-green-800">
                              Rezolvă
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CAPA tab                                                            */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'capa' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button onClick={handleNewCAPA} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Plus className="w-4 h-4" />
                CAPA nou
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={capaTypeFilter}
                onChange={(e) => setCapaTypeFilter(e.target.value)}
                aria-label="Filtrează după tip"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toate tipurile</option>
                <option value="CORRECTIVE">Corectiv</option>
                <option value="PREVENTIVE">Preventiv</option>
                <option value="BOTH">Corectiv + Preventiv</option>
              </select>
              <select
                value={capaPriorityFilter}
                onChange={(e) => setCapaPriorityFilter(e.target.value)}
                aria-label="Filtrează după prioritate"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toate prioritățile</option>
                <option value="CRITICAL">Critic</option>
                <option value="HIGH">Ridicat</option>
                <option value="MEDIUM">Mediu</option>
                <option value="LOW">Scăzut</option>
              </select>
            </div>
          </div>

          {renderSectionState(
            'capa',
            filteredCAPAs.length === 0,
            capas.length === 0 ? 'Nicio acțiune CAPA înregistrată' : 'Nicio acțiune CAPA nu corespunde filtrelor',
            Target,
          ) ?? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredCAPAs.map((capa) => (
                <div key={capa.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{capa.capaNumber}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(capa.type)}`}>{getStatusLabel(capa.type)}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(capa.priority)}`}>
                          {getStatusLabel(capa.priority)}
                        </span>
                      </div>
                      <p className="text-gray-600">{capa.title}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(capa.status)}`}>{getStatusLabel(capa.status)}</span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>Responsabil: {capa.owner}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>Termen: {fmtDate(capa.dueDate)}</span>
                      {isOverdue(capa.dueDate) && capa.status !== 'CLOSED' && capa.status !== 'CANCELLED' && (
                        <span className="text-red-500 text-xs ml-2">Întârziat</span>
                      )}
                    </div>
                    {capa.relatedNCR && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <AlertOctagon className="w-4 h-4" />
                        <span>Legat de: {capa.relatedNCR}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        Progres{capa.totalActions > 0 ? ` (${capa.totalActions} acțiuni)` : ''}
                      </span>
                      <span className="font-medium text-gray-900">
                        {capa.completionPercentage === null ? '—' : `${capa.completionPercentage}%`}
                      </span>
                    </div>
                    {capa.completionPercentage === null ? (
                      <p className="text-xs text-gray-400">Nicio acțiune definită încă</p>
                    ) : (
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            capa.completionPercentage === 100
                              ? 'bg-green-500'
                              : capa.completionPercentage >= 75
                                ? 'bg-blue-500'
                                : capa.completionPercentage >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                          }`}
                          style={{ width: `${capa.completionPercentage}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <button onClick={() => handleCAPADetails(capa)} className="text-sm text-gray-600 hover:text-gray-800">
                      Detalii
                    </button>
                    <button onClick={() => handleUpdateCAPA(capa)} className="text-sm text-blue-600 hover:text-blue-800">
                      Actualizează
                    </button>
                    {capa.status === 'VERIFICATION' && (
                      <button onClick={() => handleCloseCAPA(capa)} className="text-sm text-green-600 hover:text-green-800">
                        Închide
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Documents tab                                                       */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button onClick={handleNewDocument} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Document nou
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
                aria-label="Filtrează după tip document"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toate tipurile</option>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={docStatusFilter}
                onChange={(e) => setDocStatusFilter(e.target.value)}
                aria-label="Filtrează după status document"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toate statusurile</option>
                <option value="APPROVED">Aprobat</option>
                <option value="REVIEW">În revizuire</option>
                <option value="DRAFT">Ciornă</option>
                <option value="OBSOLETE">Învechit</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {renderSectionState(
              'documents',
              filteredDocuments.length === 0,
              documents.length === 0 ? 'Niciun document de calitate înregistrat' : 'Niciun document nu corespunde filtrelor',
              FileText,
            ) ?? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Număr document</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titlu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Versiune</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aprobat de</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Următoarea revizuire</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <p className="font-medium text-gray-900">{doc.documentNumber}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{doc.title}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">v{doc.version}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(doc.status)}`}>{getStatusLabel(doc.status)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.approvedBy || '—'}
                          {doc.approvedDate && <div className="text-xs text-gray-400">{fmtDate(doc.approvedDate)}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtDate(doc.nextReviewDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button onClick={() => handleViewDocument(doc)} className="text-blue-600 hover:text-blue-800 mr-3">
                            Vizualizare
                          </button>
                          {doc.status !== 'APPROVED' && (
                            <button onClick={() => handleEditDocument(doc)} className="text-gray-600 hover:text-gray-800">
                              Editare
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Suppliers tab                                                       */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          {supplierMetrics && !sectionError.suppliers && !sectionLoading.suppliers && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Furnizori evaluați</p>
                <p className="text-xl font-bold text-gray-900">{supplierMetrics.totalSuppliers}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Rată medie calitate</p>
                <p className="text-xl font-bold text-gray-900">{fmtNumber(supplierMetrics.averageQualityRate, '%')}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Livrare la timp (medie)</p>
                <p className="text-xl font-bold text-gray-900">{fmtNumber(supplierMetrics.averageOnTimeDelivery, '%')}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Audituri scadente</p>
                <p className="text-xl font-bold text-gray-900">{supplierMetrics.suppliersRequiringAudit}</p>
              </div>
            </div>
          )}

          {renderSectionState('suppliers', suppliers.length === 0, 'Niciun furnizor evaluat încă', Factory) ?? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Factory className="w-5 h-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">{supplier.supplierName}</h3>
                      </div>
                      <p className="text-sm text-gray-500">{supplier.supplierCode}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(supplier.status)}`}>
                        {getStatusLabel(supplier.status)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(supplier.riskLevel)}`}>
                        Risc: {getStatusLabel(supplier.riskLevel)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Award className="w-4 h-4 text-blue-500" />
                        <p className="text-2xl font-bold text-gray-900">{fmtNumber(supplier.qualityScore)}</p>
                      </div>
                      <p className="text-xs text-gray-500">Scor general</p>
                    </div>

                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <p className="text-2xl font-bold text-gray-900">{fmtNumber(supplier.qualityRate, '%')}</p>
                      </div>
                      <p className="text-xs text-gray-500">Rată calitate</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {supplier.totalOrders === null
                          ? 'comenzi: —'
                          : `${supplier.totalOrders} comenzi · ${supplier.totalDefects ?? 0} defecte`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <AlertOctagon className="w-4 h-4" />
                        NCR active
                      </span>
                      <span className={`font-medium ${supplier.openNCRs > 0 ? 'text-red-600' : 'text-green-600'}`}>{supplier.openNCRs}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Activity className="w-4 h-4" />
                        Livrare la timp
                      </span>
                      <span className="font-medium text-gray-900">{fmtNumber(supplier.onTimeDeliveryRate, '%')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Ultimul audit
                      </span>
                      <span className="font-medium text-gray-900">{fmtDate(supplier.lastAuditDate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Următorul audit
                      </span>
                      <span className={`font-medium ${isOverdue(supplier.nextAuditDate) ? 'text-red-600' : 'text-gray-900'}`}>
                        {fmtDate(supplier.nextAuditDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <button onClick={() => handleSupplierHistory(supplier)} className="text-sm text-gray-600 hover:text-gray-800">
                      Istoric
                    </button>
                    <button onClick={() => handleSupplierAudit(supplier)} className="text-sm text-blue-600 hover:text-blue-800">
                      Audit
                    </button>
                    <button onClick={() => handleSupplierReport(supplier)} className="text-sm text-green-600 hover:text-green-800">
                      Raport
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
