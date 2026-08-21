'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import { notifyNotAvailable } from '@/lib/toast-bus';
import {
  ClipboardCheck,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Plus,
  Search,
  Filter,
  FileText,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  ChevronRight,
  Target,
  Activity,
  Shield,
  CheckCircle,
  Factory,
  Package,
  Zap,
} from 'lucide-react';

// Types
interface QualitySummary {
  openNCRs: number;
  pendingCAPAs: number;
  inspectionPassRate: number;
  supplierScoreAvg: number;
  totalInspections: number;
  totalNCRs: number;
  resolvedCAPAs: number;
  certifications: number;
}

interface Inspection {
  id: string;
  inspectionNumber: string;
  type: string;
  product: string;
  inspector: string;
  date: string;
  status: 'PASS' | 'FAIL' | 'PENDING' | 'CONDITIONAL';
  score: number;
  findings: number;
}

interface NonConformance {
  id: string;
  ncrNumber: string;
  title: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  status: 'OPEN' | 'IN_REVIEW' | 'CLOSED' | 'REJECTED';
  reportedBy: string;
  reportedDate: string;
  dueDate: string;
  assignedTo?: string;
  department: string;
}

interface CAPA {
  id: string;
  capaNumber: string;
  title: string;
  type: 'CORRECTIVE' | 'PREVENTIVE';
  status: 'OPEN' | 'IN_PROGRESS' | 'VERIFICATION' | 'COMPLETED' | 'CLOSED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  owner: string;
  dueDate: string;
  completionPercentage: number;
  relatedNCR?: string;
}

interface QualityDocument {
  id: string;
  documentNumber: string;
  title: string;
  type: string;
  version: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'OBSOLETE';
  approvedBy?: string;
  approvedDate?: string;
  nextReviewDate: string;
}

interface SupplierQuality {
  id: string;
  supplierName: string;
  supplierCode: string;
  qualityScore: number;
  scoreChange: number;
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  openNCRs: number;
  lastInspectionDate: string;
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

type TabType = 'dashboard' | 'inspections' | 'ncr' | 'capa' | 'documents' | 'suppliers';

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'PASS': 'bg-green-100 text-green-800',
    'FAIL': 'bg-red-100 text-red-800',
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'CONDITIONAL': 'bg-orange-100 text-orange-800',
    'OPEN': 'bg-red-100 text-red-800',
    'IN_REVIEW': 'bg-blue-100 text-blue-800',
    'IN_PROGRESS': 'bg-blue-100 text-blue-800',
    'VERIFICATION': 'bg-purple-100 text-purple-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'CLOSED': 'bg-gray-100 text-gray-800',
    'REJECTED': 'bg-red-100 text-red-800',
    'CRITICAL': 'bg-red-100 text-red-800',
    'MAJOR': 'bg-orange-100 text-orange-800',
    'MINOR': 'bg-yellow-100 text-yellow-800',
    'HIGH': 'bg-red-100 text-red-800',
    'MEDIUM': 'bg-yellow-100 text-yellow-800',
    'LOW': 'bg-green-100 text-green-800',
    'CORRECTIVE': 'bg-blue-100 text-blue-800',
    'PREVENTIVE': 'bg-purple-100 text-purple-800',
    'DRAFT': 'bg-gray-100 text-gray-800',
    'REVIEW': 'bg-blue-100 text-blue-800',
    'APPROVED': 'bg-green-100 text-green-800',
    'OBSOLETE': 'bg-red-100 text-red-800',
    'EXCELLENT': 'bg-green-100 text-green-800',
    'GOOD': 'bg-blue-100 text-blue-800',
    'FAIR': 'bg-yellow-100 text-yellow-800',
    'POOR': 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'PASS': 'Trecut',
    'FAIL': 'Picat',
    'PENDING': 'In Asteptare',
    'CONDITIONAL': 'Conditional',
    'OPEN': 'Deschis',
    'IN_REVIEW': 'In Revizuire',
    'IN_PROGRESS': 'In Desfasurare',
    'VERIFICATION': 'Verificare',
    'COMPLETED': 'Finalizat',
    'CLOSED': 'Inchis',
    'REJECTED': 'Respins',
    'CRITICAL': 'Critic',
    'MAJOR': 'Major',
    'MINOR': 'Minor',
    'HIGH': 'Ridicat',
    'MEDIUM': 'Mediu',
    'LOW': 'Scazut',
    'CORRECTIVE': 'Corectiv',
    'PREVENTIVE': 'Preventiv',
    'DRAFT': 'Ciorna',
    'REVIEW': 'Revizuire',
    'APPROVED': 'Aprobat',
    'OBSOLETE': 'Invechit',
    'EXCELLENT': 'Excelent',
    'GOOD': 'Bun',
    'FAIR': 'Acceptabil',
    'POOR': 'Slab',
  };
  return labels[status] || status;
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

export default function QualityPage() {
  const t = useTranslations('quality');
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ncrs, setNCRs] = useState<NonConformance[]>([]);
  const [capas, setCAPAs] = useState<CAPA[]>([]);
  const [documents, setDocuments] = useState<QualityDocument[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierQuality[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls to /api/v1/quality endpoints
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'dashboard' || activeTab === 'inspections') {
        // TODO: Fetch from /api/v1/quality/summary
        // const summaryRes = await fetch('/api/v1/quality/summary', { headers });
        // if (summaryRes.ok) {
        //   setSummary(await summaryRes.json());
        // }

        // TODO: Fetch from /api/v1/quality/inspections
        // const inspectionsRes = await fetch('/api/v1/quality/inspections', { headers });
        // if (inspectionsRes.ok) {
        //   setInspections(await inspectionsRes.json());
        // }
      }

      if (activeTab === 'ncr') {
        // TODO: Fetch from /api/v1/quality/ncr
        // const ncrsRes = await fetch('/api/v1/quality/ncr?status=OPEN', { headers });
        // if (ncrsRes.ok) {
        //   setNCRs(await ncrsRes.json());
        // }
      }

      if (activeTab === 'capa') {
        // TODO: Fetch from /api/v1/quality/capa
        // const capasRes = await fetch('/api/v1/quality/capa', { headers });
        // if (capasRes.ok) {
        //   setCAPAs(await capasRes.json());
        // }
      }

      if (activeTab === 'documents') {
        // TODO: Fetch from /api/v1/quality/documents
        // const docsRes = await fetch('/api/v1/quality/documents', { headers });
        // if (docsRes.ok) {
        //   setDocuments(await docsRes.json());
        // }
      }

      if (activeTab === 'suppliers') {
        // TODO: Fetch from /api/v1/quality/suppliers
        // const suppliersRes = await fetch('/api/v1/quality/suppliers', { headers });
        // if (suppliersRes.ok) {
        //   setSuppliers(await suppliersRes.json());
        // }
      }

      // Load mock data for now
      loadEmpty();
    } catch (error) {
      console.error('Error fetching quality data:', error);
      loadEmpty();
    } finally {
      setLoading(false);
    }
  };

  const loadEmpty = () => {
    setInspections([]);
    setLoadError(true);
  };

  const filteredInspections = inspections.filter(item => {
    const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.inspectionNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredNCRs = ncrs.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.ncrNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Action Handlers
  const handleAddNew = () => {
    const options = { dashboard: 'inspection', inspections: 'inspection', ncr: 'NCR', capa: 'CAPA', documents: 'document', suppliers: 'supplier' };
    const type = options[activeTab] || 'item';
    notifyNotAvailable();
  };

  const handleNCRAction = (ncr: NonConformance) => {
    router.push(`/dashboard/quality/ncr/${ncr.id}`);
  };

  const handleOpenFilters = () => {
    toast.info('În dezvoltare', 'Filtre avansate - funcționalitate în dezvoltare.');
  };

  const handleInspectionDetails = (inspection: Inspection) => {
    router.push(`/dashboard/quality/inspections/${inspection.id}`);
  };

  const handleFinalizeInspection = async (inspection: Inspection) => {
    notifyNotAvailable();
  };

  const handleFinalizeInspectionConfirmed = async (inspection: Inspection) => {
    toast.success('Inspecție finalizată', `Inspecția ${inspection.inspectionNumber} a fost finalizată.`);
  };

  const handleNewNCR = () => {
    router.push('/dashboard/quality/ncr/new');
  };

  const handleNCRDetails = (ncr: NonConformance) => {
    router.push(`/dashboard/quality/ncr/${ncr.id}`);
  };

  const handleResolveNCR = async (ncr: NonConformance) => {
    notifyNotAvailable();
  };

  const handleResolveNCRConfirmed = async (ncr: NonConformance) => {
    toast.success('NCR rezolvat', `NCR ${ncr.ncrNumber} a fost marcat pentru rezolvare.`);
  };

  const handleNewCAPA = () => {
    router.push('/dashboard/quality/capa/new');
  };

  const handleCAPADetails = (capa: CAPA) => {
    router.push(`/dashboard/quality/capa/${capa.id}`);
  };

  const handleUpdateCAPA = (capa: CAPA) => {
    notifyNotAvailable();
  };

  const handleCloseCAPA = async (capa: CAPA) => {
    notifyNotAvailable();
  };

  const handleCloseCAPAConfirmed = async (capa: CAPA) => {
    toast.success('CAPA închis', `CAPA ${capa.capaNumber} a fost închis.`);
  };

  const handleNewDocument = () => {
    router.push('/dashboard/quality/documents/new');
  };

  const handleViewDocument = (doc: QualityDocument) => {
    notifyNotAvailable();
  };

  const handleEditDocument = (doc: QualityDocument) => {
    notifyNotAvailable();
  };

  const handleSupplierHistory = (supplier: SupplierQuality) => {
    notifyNotAvailable();
  };

  const handleSupplierAudit = (supplier: SupplierQuality) => {
    notifyNotAvailable();
  };

  const handleSupplierReport = (supplier: SupplierQuality) => {
    toast.info('Generare raport', `Generare raport calitate pentru ${supplier.supplierName}...`);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'inspections', label: 'Inspectii', icon: ClipboardCheck },
    { id: 'ncr', label: 'NCR', icon: AlertOctagon },
    { id: 'capa', label: 'CAPA', icon: Target },
    { id: 'documents', label: 'Documente', icon: FileText },
    { id: 'suppliers', label: 'Furnizori', icon: Factory },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
      {loadError && (
        <div role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-200">
          Nu am putut încărca datele. Reîncearcă. / Could not load data. Please retry.
        </div>
      )}
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Managementul Calitatii</h1>
          <p className="text-gray-600">Inspectii, NCR, CAPA, documente si evaluare furnizori</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Adauga
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <AlertOctagon className="w-4 h-4" />
              NCR Deschise
            </div>
            <div className="text-2xl font-bold text-red-600">{summary.openNCRs}</div>
            <div className="text-xs text-gray-500 mt-1">din {summary.totalNCRs} total</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Target className="w-4 h-4" />
              CAPA in Asteptare
            </div>
            <div className="text-2xl font-bold text-yellow-600">{summary.pendingCAPAs}</div>
            <div className="text-xs text-gray-500 mt-1">{summary.resolvedCAPAs} rezolvate</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <CheckCircle2 className="w-4 h-4" />
              Rata Trecere Inspectii
            </div>
            <div className="text-2xl font-bold text-green-600">{summary.inspectionPassRate}%</div>
            <div className="text-xs text-gray-500 mt-1">{summary.totalInspections} inspectii</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Award className="w-4 h-4" />
              Scor Mediu Furnizori
            </div>
            <div className="text-2xl font-bold text-blue-600">{summary.supplierScoreAvg}</div>
            <div className="text-xs text-gray-500 mt-1">{summary.certifications} certificari</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
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

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Inspections */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-500" />
                Inspectii Recente
              </h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {inspections.slice(0, 5).map((inspection) => (
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
                        <span>{new Date(inspection.date).toLocaleDateString('ro-RO')}</span>
                      </div>
                    </div>
                    {inspection.status !== 'PENDING' && (
                      <div className="text-right ml-4">
                        <div className={`text-lg font-bold ${
                          inspection.score >= 90 ? 'text-green-600' :
                          inspection.score >= 75 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {inspection.score}
                        </div>
                        <p className="text-xs text-gray-500">scor</p>
                        {inspection.findings > 0 && (
                          <p className="text-xs text-red-500 mt-1">{inspection.findings} constatari</p>
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
                Neconformitati Deschise ({ncrs.filter(n => n.status === 'OPEN').length})
              </h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {ncrs.filter(n => n.status === 'OPEN').map((ncr) => (
                <div key={ncr.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(ncr.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{ncr.ncrNumber}</p>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(ncr.severity)}`}>
                          {getStatusLabel(ncr.severity)}
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
                          Termen: {new Date(ncr.dueDate).toLocaleDateString('ro-RO')}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleNCRAction(ncr)} className="text-blue-600 hover:text-blue-800 text-sm">
                      Actiune
                    </button>
                  </div>
                </div>
              ))}
              {ncrs.filter(n => n.status === 'OPEN').length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>Nicio neconformitate deschisa</p>
                </div>
              )}
            </div>
          </div>

          {/* CAPA Tracking */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Urmarire CAPA
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {capas.filter(c => c.status !== 'CLOSED').slice(0, 4).map((capa) => (
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
                      {new Date(capa.dueDate).toLocaleDateString('ro-RO')}
                    </span>
                    {capa.relatedNCR && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <AlertOctagon className="w-3 h-3" />
                        {capa.relatedNCR}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          capa.completionPercentage === 100 ? 'bg-green-500' :
                          capa.completionPercentage >= 75 ? 'bg-blue-500' :
                          capa.completionPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${capa.completionPercentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">
                      {capa.completionPercentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Trends Chart Placeholder */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Tendinte Calitate
              </h3>
            </div>
            <div className="p-6">
              {/* TODO: Replace with actual chart using Recharts */}
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">Grafic Tendințe Calitate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inspections' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cauta inspectii (numar, produs...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toate Statusurile</option>
                <option value="PASS">Trecut</option>
                <option value="FAIL">Picat</option>
                <option value="PENDING">In Asteptare</option>
                <option value="CONDITIONAL">Conditional</option>
              </select>
              <button onClick={handleOpenFilters} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                Filtre
              </button>
            </div>
          </div>

          {/* Inspections Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inspectie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inspector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actiuni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInspections.map((inspection) => (
                  <tr key={inspection.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{inspection.inspectionNumber}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {inspection.type}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{inspection.product}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {inspection.inspector}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(inspection.date).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {inspection.status !== 'PENDING' ? (
                          <>
                            <span className={`font-medium ${
                              inspection.score >= 90 ? 'text-green-600' :
                              inspection.score >= 75 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {inspection.score}
                            </span>
                            {inspection.findings > 0 && (
                              <span className="text-xs text-red-500">
                                ({inspection.findings} constatari)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(inspection.status)}`}>
                        {getStatusLabel(inspection.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => handleInspectionDetails(inspection)} className="text-blue-600 hover:text-blue-800 mr-3">Detalii</button>
                      {inspection.status === 'PENDING' && (
                        <button onClick={() => handleFinalizeInspection(inspection)} className="text-green-600 hover:text-green-800">Finalizeaza</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ncr' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cauta NCR (numar, titlu...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toate Statusurile</option>
                <option value="OPEN">Deschis</option>
                <option value="IN_REVIEW">In Revizuire</option>
                <option value="CLOSED">Inchis</option>
              </select>
              <button onClick={handleNewNCR} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                <Plus className="w-4 h-4" />
                NCR Nou
              </button>
            </div>
          </div>

          {/* NCR Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NCR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titlu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severitate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departament
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asignat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Termen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actiuni
                  </th>
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
                        Raportat de {ncr.reportedBy} - {new Date(ncr.reportedDate).toLocaleDateString('ro-RO')}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ncr.severity)}`}>
                        {getStatusLabel(ncr.severity)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ncr.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ncr.assignedTo || 'Neasignat'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(ncr.dueDate).toLocaleDateString('ro-RO')}
                      </div>
                      {new Date(ncr.dueDate) < new Date() && ncr.status !== 'CLOSED' && (
                        <span className="text-xs text-red-500">Intarziat</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ncr.status)}`}>
                        {getStatusLabel(ncr.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => handleNCRDetails(ncr)} className="text-blue-600 hover:text-blue-800 mr-3">Detalii</button>
                      {ncr.status === 'OPEN' && (
                        <button onClick={() => handleResolveNCR(ncr)} className="text-green-600 hover:text-green-800">Rezolva</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'capa' && (
        <div className="space-y-6">
          {/* CAPA Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button onClick={handleNewCAPA} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Plus className="w-4 h-4" />
                CAPA Nou
              </button>
            </div>
            <div className="flex gap-2">
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="all">Toate</option>
                <option value="CORRECTIVE">Corectiv</option>
                <option value="PREVENTIVE">Preventiv</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="all">Toate Prioritatile</option>
                <option value="HIGH">Ridicat</option>
                <option value="MEDIUM">Mediu</option>
                <option value="LOW">Scazut</option>
              </select>
            </div>
          </div>

          {/* CAPA Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {capas.map((capa) => (
              <div key={capa.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{capa.capaNumber}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(capa.type)}`}>
                        {getStatusLabel(capa.type)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(capa.priority)}`}>
                        {getStatusLabel(capa.priority)}
                      </span>
                    </div>
                    <p className="text-gray-600">{capa.title}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(capa.status)}`}>
                    {getStatusLabel(capa.status)}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>Responsabil: {capa.owner}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Termen: {new Date(capa.dueDate).toLocaleDateString('ro-RO')}</span>
                    {new Date(capa.dueDate) < new Date() && capa.status !== 'COMPLETED' && (
                      <span className="text-red-500 text-xs ml-2">Intarziat</span>
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
                    <span className="text-gray-600">Progres</span>
                    <span className="font-medium text-gray-900">{capa.completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        capa.completionPercentage === 100 ? 'bg-green-500' :
                        capa.completionPercentage >= 75 ? 'bg-blue-500' :
                        capa.completionPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${capa.completionPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                  <button onClick={() => handleCAPADetails(capa)} className="text-sm text-gray-600 hover:text-gray-800">Detalii</button>
                  <button onClick={() => handleUpdateCAPA(capa)} className="text-sm text-blue-600 hover:text-blue-800">Actualizeaza</button>
                  {capa.status === 'COMPLETED' && (
                    <button onClick={() => handleCloseCAPA(capa)} className="text-sm text-green-600 hover:text-green-800">Inchide</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Document Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button onClick={handleNewDocument} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Document Nou
              </button>
            </div>
            <div className="flex gap-2">
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="all">Toate Tipurile</option>
                <option value="Manual">Manual</option>
                <option value="Procedure">Procedura</option>
                <option value="Work Instruction">Instructiune</option>
                <option value="Form">Formular</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="all">Toate Statusurile</option>
                <option value="APPROVED">Aprobat</option>
                <option value="REVIEW">In Revizuire</option>
                <option value="DRAFT">Ciorna</option>
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numar Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titlu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Versiune
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aprobat De
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urmatoarea Revizuire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actiuni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      v{doc.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(doc.status)}`}>
                        {getStatusLabel(doc.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.approvedBy || '-'}
                      {doc.approvedDate && (
                        <div className="text-xs text-gray-400">
                          {new Date(doc.approvedDate).toLocaleDateString('ro-RO')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.nextReviewDate).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => handleViewDocument(doc)} className="text-blue-600 hover:text-blue-800 mr-3">Vizualizare</button>
                      {doc.status !== 'APPROVED' && (
                        <button onClick={() => handleEditDocument(doc)} className="text-gray-600 hover:text-gray-800">Editare</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          {/* Supplier Quality Cards */}
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
                  <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(supplier.rating)}`}>
                    {getStatusLabel(supplier.rating)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Award className="w-4 h-4 text-blue-500" />
                      <p className="text-2xl font-bold text-gray-900">{supplier.qualityScore}</p>
                    </div>
                    <p className="text-xs text-gray-500">Scor Calitate</p>
                    <div className={`flex items-center justify-center gap-1 text-xs mt-1 ${
                      supplier.scoreChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {supplier.scoreChange >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{Math.abs(supplier.scoreChange)}%</span>
                    </div>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <p className="text-2xl font-bold text-gray-900">
                        {((supplier.passedInspections / supplier.totalInspections) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">Rata Trecere</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {supplier.passedInspections}/{supplier.totalInspections} inspectii
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <AlertOctagon className="w-4 h-4" />
                      NCR Deschise
                    </span>
                    <span className={`font-medium ${supplier.openNCRs > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {supplier.openNCRs}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Ultima Inspectie
                    </span>
                    <span className="font-medium text-gray-900">
                      {new Date(supplier.lastInspectionDate).toLocaleDateString('ro-RO')}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                  <button onClick={() => handleSupplierHistory(supplier)} className="text-sm text-gray-600 hover:text-gray-800">Istoric</button>
                  <button onClick={() => handleSupplierAudit(supplier)} className="text-sm text-blue-600 hover:text-blue-800">Audit</button>
                  <button onClick={() => handleSupplierReport(supplier)} className="text-sm text-green-600 hover:text-green-800">Raport</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
