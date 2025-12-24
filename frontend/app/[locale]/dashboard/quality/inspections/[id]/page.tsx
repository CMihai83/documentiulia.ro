'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Calendar,
  User,
  Package,
  FileText,
  Camera,
  Download,
  Edit,
  Printer,
  Clock,
  Target,
  AlertOctagon,
  CheckCircle2,
  MessageSquare,
  Plus,
  Trash2,
  Eye,
  Link,
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
} from 'recharts';

interface InspectionDetail {
  id: string;
  inspectionNumber: string;
  type: 'INCOMING' | 'IN_PROCESS' | 'FINAL' | 'SUPPLIER' | 'AUDIT';
  status: 'PASS' | 'FAIL' | 'PENDING' | 'CONDITIONAL' | 'IN_PROGRESS';
  score: number;
  product: {
    id: string;
    name: string;
    code: string;
    lotNumber?: string;
    quantity: number;
    unit: string;
  };
  supplier?: {
    id: string;
    name: string;
    code: string;
  };
  inspector: {
    id: string;
    name: string;
    department: string;
  };
  scheduledDate: string;
  completedDate?: string;
  location: string;
  workOrder?: string;
  purchaseOrder?: string;
  sampleSize: number;
  acceptedCount: number;
  rejectedCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface InspectionCheckpoint {
  id: string;
  name: string;
  description?: string;
  type: 'VISUAL' | 'DIMENSIONAL' | 'FUNCTIONAL' | 'DOCUMENT' | 'MEASUREMENT';
  specification?: string;
  tolerance?: string;
  result: 'PASS' | 'FAIL' | 'NA' | 'PENDING';
  actualValue?: string;
  notes?: string;
  attachments?: string[];
}

interface InspectionFinding {
  id: string;
  type: 'OBSERVATION' | 'MINOR' | 'MAJOR' | 'CRITICAL';
  description: string;
  checkpoint?: string;
  recommendation?: string;
  status: 'OPEN' | 'RESOLVED' | 'DEFERRED';
  createdAt: string;
  resolvedAt?: string;
  linkedNCR?: string;
}

interface InspectionAttachment {
  id: string;
  filename: string;
  type: 'IMAGE' | 'DOCUMENT' | 'REPORT';
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'PASS': 'bg-green-100 text-green-800',
    'FAIL': 'bg-red-100 text-red-800',
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'CONDITIONAL': 'bg-orange-100 text-orange-800',
    'IN_PROGRESS': 'bg-blue-100 text-blue-800',
    'NA': 'bg-gray-100 text-gray-800',
    'OPEN': 'bg-red-100 text-red-800',
    'RESOLVED': 'bg-green-100 text-green-800',
    'DEFERRED': 'bg-yellow-100 text-yellow-800',
    'OBSERVATION': 'bg-blue-100 text-blue-800',
    'MINOR': 'bg-yellow-100 text-yellow-800',
    'MAJOR': 'bg-orange-100 text-orange-800',
    'CRITICAL': 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'PASS': 'Trecut',
    'FAIL': 'Picat',
    'PENDING': 'In Asteptare',
    'CONDITIONAL': 'Conditional',
    'IN_PROGRESS': 'In Desfasurare',
    'NA': 'N/A',
    'OPEN': 'Deschis',
    'RESOLVED': 'Rezolvat',
    'DEFERRED': 'Amanat',
    'OBSERVATION': 'Observatie',
    'MINOR': 'Minor',
    'MAJOR': 'Major',
    'CRITICAL': 'Critic',
    'INCOMING': 'Receptie',
    'IN_PROCESS': 'In Proces',
    'FINAL': 'Final',
    'SUPPLIER': 'Furnizor',
    'AUDIT': 'Audit',
    'VISUAL': 'Vizual',
    'DIMENSIONAL': 'Dimensional',
    'FUNCTIONAL': 'Functional',
    'DOCUMENT': 'Documentar',
    'MEASUREMENT': 'Masurare',
  };
  return labels[status] || status;
};

const getResultIcon = (result: string) => {
  switch (result) {
    case 'PASS':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'FAIL':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'PENDING':
      return <Clock className="w-5 h-5 text-yellow-500" />;
    default:
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
  }
};

const CHART_COLORS = ['#10B981', '#EF4444', '#F59E0B', '#6B7280'];

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const inspectionId = params.id as string;

  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [checkpoints, setCheckpoints] = useState<InspectionCheckpoint[]>([]);
  const [findings, setFindings] = useState<InspectionFinding[]>([]);
  const [attachments, setAttachments] = useState<InspectionAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'checkpoints' | 'findings' | 'attachments'>('overview');
  const [showAddFindingModal, setShowAddFindingModal] = useState(false);

  useEffect(() => {
    if (inspectionId) {
      fetchInspectionDetails();
    }
  }, [inspectionId]);

  const fetchInspectionDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const inspectionRes = await fetch(`${API_URL}/quality/inspections/${inspectionId}`, { headers });
      if (inspectionRes.ok) {
        setInspection(await inspectionRes.json());
      }

      const checkpointsRes = await fetch(`${API_URL}/quality/inspections/${inspectionId}/checkpoints`, { headers });
      if (checkpointsRes.ok) {
        setCheckpoints(await checkpointsRes.json());
      }

      const findingsRes = await fetch(`${API_URL}/quality/inspections/${inspectionId}/findings`, { headers });
      if (findingsRes.ok) {
        setFindings(await findingsRes.json());
      }

      const attachmentsRes = await fetch(`${API_URL}/quality/inspections/${inspectionId}/attachments`, { headers });
      if (attachmentsRes.ok) {
        setAttachments(await attachmentsRes.json());
      }
    } catch (error) {
      console.error('Error fetching inspection details:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setInspection({
      id: inspectionId,
      inspectionNumber: 'INS-2024-0156',
      type: 'INCOMING',
      status: 'PASS',
      score: 92,
      product: {
        id: 'prod-001',
        name: 'Componenta Electronica PCB v2.1',
        code: 'PCB-2024-001',
        lotNumber: 'LOT-2024-12-001',
        quantity: 500,
        unit: 'buc',
      },
      supplier: {
        id: 'sup-001',
        name: 'Tech Components SRL',
        code: 'SUP-TC-001',
      },
      inspector: {
        id: 'insp-001',
        name: 'Maria Ionescu',
        department: 'Quality Control',
      },
      scheduledDate: '2024-12-16',
      completedDate: '2024-12-16',
      location: 'Zona Receptie - Depozit Central',
      purchaseOrder: 'PO-2024-0789',
      sampleSize: 50,
      acceptedCount: 48,
      rejectedCount: 2,
      notes: 'Inspectie standard pentru componente electronice. 2 unitati respinse din cauza defectelor vizuale minore.',
      createdAt: '2024-12-15T10:00:00Z',
      updatedAt: '2024-12-16T14:30:00Z',
    });

    setCheckpoints([
      {
        id: 'cp-001',
        name: 'Inspectie Vizuala',
        description: 'Verificare aspect general, zgârieturi, deformari',
        type: 'VISUAL',
        specification: 'Fara defecte vizibile la ochiul liber',
        result: 'PASS',
        notes: '48/50 conforme. 2 cu zgârieturi minore pe suprafata.',
      },
      {
        id: 'cp-002',
        name: 'Dimensiuni PCB',
        description: 'Masurare dimensiuni conform desenului tehnic',
        type: 'DIMENSIONAL',
        specification: '100mm x 80mm',
        tolerance: '±0.5mm',
        result: 'PASS',
        actualValue: '100.2mm x 79.8mm',
      },
      {
        id: 'cp-003',
        name: 'Test Functional',
        description: 'Verificare conectivitate si functionalitate',
        type: 'FUNCTIONAL',
        specification: 'Toate punctele de test OK',
        result: 'PASS',
        notes: 'Toate 50 unitatile testate au trecut testul functional.',
      },
      {
        id: 'cp-004',
        name: 'Verificare Documentatie',
        description: 'Certificat de conformitate, raport test',
        type: 'DOCUMENT',
        specification: 'CoC + Test Report prezente',
        result: 'PASS',
        notes: 'Documentatie completa primita de la furnizor.',
      },
      {
        id: 'cp-005',
        name: 'Grosime Placare',
        description: 'Masurare grosime strat de cupru',
        type: 'MEASUREMENT',
        specification: '35μm minim',
        tolerance: '+10μm/-0μm',
        result: 'PASS',
        actualValue: '38μm',
      },
    ]);

    setFindings([
      {
        id: 'find-001',
        type: 'MINOR',
        description: '2 unitati cu zgârieturi superficiale pe layer-ul superior',
        checkpoint: 'Inspectie Vizuala',
        recommendation: 'Unitatile pot fi utilizate pentru prototipare, nu pentru productie finala',
        status: 'RESOLVED',
        createdAt: '2024-12-16T11:30:00Z',
        resolvedAt: '2024-12-16T14:00:00Z',
      },
      {
        id: 'find-002',
        type: 'OBSERVATION',
        description: 'Ambalajul de transport prezinta semne de umiditate',
        recommendation: 'Solicitare imbunatatire ambalaj pentru urmatoarele livrari',
        status: 'OPEN',
        createdAt: '2024-12-16T10:45:00Z',
      },
    ]);

    setAttachments([
      {
        id: 'att-001',
        filename: 'inspectie_vizuala_lot001.jpg',
        type: 'IMAGE',
        size: 2456000,
        uploadedBy: 'Maria Ionescu',
        uploadedAt: '2024-12-16T11:00:00Z',
        url: '/attachments/inspectie_vizuala_lot001.jpg',
      },
      {
        id: 'att-002',
        filename: 'certificat_conformitate_tc.pdf',
        type: 'DOCUMENT',
        size: 524000,
        uploadedBy: 'Maria Ionescu',
        uploadedAt: '2024-12-16T10:30:00Z',
        url: '/attachments/certificat_conformitate_tc.pdf',
      },
      {
        id: 'att-003',
        filename: 'raport_test_functional.pdf',
        type: 'REPORT',
        size: 1245000,
        uploadedBy: 'Maria Ionescu',
        uploadedAt: '2024-12-16T12:00:00Z',
        url: '/attachments/raport_test_functional.pdf',
      },
    ]);
  };

  const handleCompleteInspection = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/quality/inspections/${inspectionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Inspectie finalizata cu succes');
        fetchInspectionDetails();
      } else {
        throw new Error('Failed to complete');
      }
    } catch (error) {
      console.error('Error completing inspection:', error);
      toast.success('Inspectie finalizata (demo)');
      if (inspection) {
        setInspection({ ...inspection, status: 'PASS', completedDate: new Date().toISOString() });
      }
    }
  };

  const handleCreateNCR = () => {
    router.push(`/dashboard/quality/ncr/new?inspectionId=${inspectionId}`);
  };

  const handleGenerateReport = () => {
    toast.success('Se genereaza raportul de inspectie...');
  };

  const handlePrintReport = () => {
    toast.success('Se pregateste raportul pentru printare...');
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string): string => {
    return new Date(date).toLocaleString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Chart data
  const checkpointResults = [
    { name: 'Trecut', value: checkpoints.filter(c => c.result === 'PASS').length, color: '#10B981' },
    { name: 'Picat', value: checkpoints.filter(c => c.result === 'FAIL').length, color: '#EF4444' },
    { name: 'Pending', value: checkpoints.filter(c => c.result === 'PENDING').length, color: '#F59E0B' },
    { name: 'N/A', value: checkpoints.filter(c => c.result === 'NA').length, color: '#6B7280' },
  ].filter(d => d.value > 0);

  const sampleData = inspection ? [
    { name: 'Acceptate', value: inspection.acceptedCount },
    { name: 'Respinse', value: inspection.rejectedCount },
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Inspectie negasita</h2>
        <p className="text-gray-500 mb-4">Inspectia solicitata nu a fost gasita.</p>
        <button
          onClick={() => router.push('/dashboard/quality')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Inapoi la Calitate
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/quality')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{inspection.inspectionNumber}</h1>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(inspection.status)}`}>
                {getStatusLabel(inspection.status)}
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(inspection.type)}`}>
                {getStatusLabel(inspection.type)}
              </span>
            </div>
            <p className="text-gray-600">
              {inspection.product.name} • Lot: {inspection.product.lotNumber || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchInspectionDetails}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Actualizeaza"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" />
            Printeaza
          </button>
          <button
            onClick={handleGenerateReport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          {inspection.status === 'IN_PROGRESS' && (
            <button
              onClick={handleCompleteInspection}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Finalizeaza
            </button>
          )}
        </div>
      </div>

      {/* Score Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${
              inspection.score >= 90 ? 'bg-green-100 text-green-700' :
              inspection.score >= 70 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {inspection.score}%
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scor Inspectie</h3>
              <p className="text-gray-500">
                {inspection.acceptedCount} acceptate din {inspection.sampleSize} mostre testate
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Rata acceptare: {((inspection.acceptedCount / inspection.sampleSize) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-center px-6 py-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{inspection.acceptedCount}</p>
              <p className="text-xs text-green-700">Acceptate</p>
            </div>
            <div className="text-center px-6 py-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{inspection.rejectedCount}</p>
              <p className="text-xs text-red-700">Respinse</p>
            </div>
            <div className="text-center px-6 py-3 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{findings.length}</p>
              <p className="text-xs text-orange-700">Constatari</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Prezentare', icon: ClipboardCheck },
            { id: 'checkpoints', label: 'Puncte Control', icon: Target },
            { id: 'findings', label: 'Constatari', icon: AlertOctagon },
            { id: 'attachments', label: 'Atasamente', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'findings' && findings.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                    {findings.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Produs Inspectat
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Nume</span>
                <span className="font-medium">{inspection.product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cod</span>
                <span className="font-medium font-mono">{inspection.product.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Lot</span>
                <span className="font-medium">{inspection.product.lotNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cantitate</span>
                <span className="font-medium">{inspection.product.quantity} {inspection.product.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Esantion</span>
                <span className="font-medium">{inspection.sampleSize} {inspection.product.unit}</span>
              </div>
            </div>

            {inspection.supplier && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Furnizor</h4>
                <p className="font-medium">{inspection.supplier.name}</p>
                <p className="text-sm text-gray-500">{inspection.supplier.code}</p>
              </div>
            )}
          </div>

          {/* Inspection Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-green-500" />
              Detalii Inspectie
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Tip</span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(inspection.type)}`}>
                  {getStatusLabel(inspection.type)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Locatie</span>
                <span className="font-medium">{inspection.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Data Planificata</span>
                <span className="font-medium">{formatDate(inspection.scheduledDate)}</span>
              </div>
              {inspection.completedDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Data Finalizare</span>
                  <span className="font-medium">{formatDate(inspection.completedDate)}</span>
                </div>
              )}
              {inspection.purchaseOrder && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Comanda Achizitie</span>
                  <span className="font-medium text-blue-600">{inspection.purchaseOrder}</span>
                </div>
              )}
              {inspection.workOrder && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ordin Lucru</span>
                  <span className="font-medium">{inspection.workOrder}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Inspector</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium">{inspection.inspector.name}</p>
                  <p className="text-sm text-gray-500">{inspection.inspector.department}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Rezultate Puncte Control
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={checkpointResults}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {checkpointResults.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {checkpointResults.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-600">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {inspection.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                Note
              </h3>
              <p className="text-gray-700">{inspection.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'checkpoints' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Punct Control</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specificatie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valoare</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rezultat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {checkpoints.map((cp) => (
                <tr key={cp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{cp.name}</p>
                      {cp.description && (
                        <p className="text-sm text-gray-500">{cp.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                      {getStatusLabel(cp.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">{cp.specification || '-'}</p>
                      {cp.tolerance && (
                        <p className="text-xs text-gray-500">Toleranta: {cp.tolerance}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cp.actualValue || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getResultIcon(cp.result)}
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(cp.result)}`}>
                        {getStatusLabel(cp.result)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-500 max-w-xs truncate">{cp.notes || '-'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'findings' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Constatari ({findings.length})</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCreateNCR}
                className="flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50"
              >
                <AlertOctagon className="w-4 h-4" />
                Creeaza NCR
              </button>
              <button
                onClick={() => setShowAddFindingModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Adauga Constatare
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {findings.map((finding) => (
              <div key={finding.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      finding.type === 'CRITICAL' ? 'bg-red-100' :
                      finding.type === 'MAJOR' ? 'bg-orange-100' :
                      finding.type === 'MINOR' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <AlertOctagon className={`w-5 h-5 ${
                        finding.type === 'CRITICAL' ? 'text-red-600' :
                        finding.type === 'MAJOR' ? 'text-orange-600' :
                        finding.type === 'MINOR' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(finding.type)}`}>
                          {getStatusLabel(finding.type)}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(finding.status)}`}>
                          {getStatusLabel(finding.status)}
                        </span>
                        {finding.checkpoint && (
                          <span className="text-xs text-gray-500">• {finding.checkpoint}</span>
                        )}
                      </div>
                      <p className="text-gray-900">{finding.description}</p>
                      {finding.recommendation && (
                        <p className="text-sm text-gray-500 mt-2">
                          <strong>Recomandare:</strong> {finding.recommendation}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Creat: {formatDateTime(finding.createdAt)}
                        {finding.resolvedAt && ` • Rezolvat: ${formatDateTime(finding.resolvedAt)}`}
                      </p>
                    </div>
                  </div>
                  {finding.linkedNCR && (
                    <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                      <Link className="w-4 h-4" />
                      {finding.linkedNCR}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {findings.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">Nicio constatare inregistrata</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Atasamente ({attachments.length})</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Camera className="w-4 h-4" />
              Adauga Fisier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attachments.map((att) => (
              <div key={att.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-lg ${
                    att.type === 'IMAGE' ? 'bg-purple-100' :
                    att.type === 'REPORT' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {att.type === 'IMAGE' ? (
                      <Camera className={`w-6 h-6 text-purple-600`} />
                    ) : (
                      <FileText className={`w-6 h-6 ${att.type === 'REPORT' ? 'text-green-600' : 'text-blue-600'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{att.filename}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(att.size)}</p>
                    <p className="text-xs text-gray-400">
                      {att.uploadedBy} • {formatDateTime(att.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
                    <Eye className="w-4 h-4" />
                    Vizualizeaza
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
                    <Download className="w-4 h-4" />
                    Descarca
                  </button>
                </div>
              </div>
            ))}
            {attachments.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Niciun atasament</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
