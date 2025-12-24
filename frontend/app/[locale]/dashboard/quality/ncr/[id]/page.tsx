'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  AlertOctagon,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Calendar,
  User,
  Clock,
  FileText,
  Download,
  Edit,
  MessageSquare,
  Plus,
  Link,
  Target,
  ClipboardCheck,
  Send,
  History,
  Settings,
  Users,
  Building,
  Tag,
  Paperclip,
  Camera,
  Eye,
} from 'lucide-react';

interface NCRDetail {
  id: string;
  ncrNumber: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  status: 'OPEN' | 'IN_REVIEW' | 'CONTAINMENT' | 'ROOT_CAUSE' | 'CORRECTIVE_ACTION' | 'VERIFICATION' | 'CLOSED' | 'REJECTED';
  category: string;
  department: string;
  product?: {
    id: string;
    name: string;
    code: string;
    lotNumber?: string;
  };
  supplier?: {
    id: string;
    name: string;
    code: string;
  };
  reportedBy: {
    id: string;
    name: string;
    department: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    department: string;
  };
  reportedDate: string;
  dueDate: string;
  closedDate?: string;
  quantityAffected?: number;
  quantityUnit?: string;
  costImpact?: number;
  currency: string;
  rootCause?: string;
  containmentActions?: string;
  correctiveActions?: string;
  verificationNotes?: string;
  linkedInspection?: string;
  linkedCAPAs?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface NCRActivity {
  id: string;
  type: 'STATUS_CHANGE' | 'COMMENT' | 'ASSIGNMENT' | 'ATTACHMENT' | 'EDIT';
  description: string;
  performedBy: string;
  performedAt: string;
  oldValue?: string;
  newValue?: string;
}

interface NCRAttachment {
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
    'OPEN': 'bg-red-100 text-red-800',
    'IN_REVIEW': 'bg-blue-100 text-blue-800',
    'CONTAINMENT': 'bg-orange-100 text-orange-800',
    'ROOT_CAUSE': 'bg-purple-100 text-purple-800',
    'CORRECTIVE_ACTION': 'bg-indigo-100 text-indigo-800',
    'VERIFICATION': 'bg-yellow-100 text-yellow-800',
    'CLOSED': 'bg-green-100 text-green-800',
    'REJECTED': 'bg-gray-100 text-gray-800',
    'CRITICAL': 'bg-red-100 text-red-800',
    'MAJOR': 'bg-orange-100 text-orange-800',
    'MINOR': 'bg-yellow-100 text-yellow-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'OPEN': 'Deschis',
    'IN_REVIEW': 'In Revizuire',
    'CONTAINMENT': 'Izolare',
    'ROOT_CAUSE': 'Analiza Cauza',
    'CORRECTIVE_ACTION': 'Actiune Corectiva',
    'VERIFICATION': 'Verificare',
    'CLOSED': 'Inchis',
    'REJECTED': 'Respins',
    'CRITICAL': 'Critic',
    'MAJOR': 'Major',
    'MINOR': 'Minor',
    'STATUS_CHANGE': 'Schimbare Status',
    'COMMENT': 'Comentariu',
    'ASSIGNMENT': 'Atribuire',
    'ATTACHMENT': 'Atasament',
    'EDIT': 'Editare',
  };
  return labels[status] || status;
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return <XCircle className="w-5 h-5 text-red-600" />;
    case 'MAJOR':
      return <AlertOctagon className="w-5 h-5 text-orange-600" />;
    case 'MINOR':
      return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    default:
      return <AlertCircle className="w-5 h-5 text-gray-600" />;
  }
};

const NCR_WORKFLOW = [
  { id: 'OPEN', label: 'Deschis' },
  { id: 'IN_REVIEW', label: 'Revizuire' },
  { id: 'CONTAINMENT', label: 'Izolare' },
  { id: 'ROOT_CAUSE', label: 'Analiza' },
  { id: 'CORRECTIVE_ACTION', label: 'Corectie' },
  { id: 'VERIFICATION', label: 'Verificare' },
  { id: 'CLOSED', label: 'Inchis' },
];

export default function NCRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const ncrId = params.id as string;

  const [ncr, setNCR] = useState<NCRDetail | null>(null);
  const [activities, setActivities] = useState<NCRActivity[]>([]);
  const [attachments, setAttachments] = useState<NCRAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'actions' | 'history' | 'attachments'>('overview');
  const [newComment, setNewComment] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    if (ncrId) {
      fetchNCRDetails();
    }
  }, [ncrId]);

  const fetchNCRDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const ncrRes = await fetch(`${API_URL}/quality/ncr/${ncrId}`, { headers });
      if (ncrRes.ok) {
        setNCR(await ncrRes.json());
      }

      const activitiesRes = await fetch(`${API_URL}/quality/ncr/${ncrId}/activities`, { headers });
      if (activitiesRes.ok) {
        setActivities(await activitiesRes.json());
      }

      const attachmentsRes = await fetch(`${API_URL}/quality/ncr/${ncrId}/attachments`, { headers });
      if (attachmentsRes.ok) {
        setAttachments(await attachmentsRes.json());
      }
    } catch (error) {
      console.error('Error fetching NCR details:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setNCR({
      id: ncrId,
      ncrNumber: 'NCR-2024-0089',
      title: 'Componente electronice cu defecte vizuale',
      description: 'La inspectia de receptie a lotului LOT-2024-12-001, s-au identificat 2 unitati din 50 cu zgarieturi pe suprafata PCB. Defectele sunt vizibile si afecteaza aspectul estetic al produsului final.',
      severity: 'MINOR',
      status: 'ROOT_CAUSE',
      category: 'Defect Vizual',
      department: 'Productie',
      product: {
        id: 'prod-001',
        name: 'Componenta Electronica PCB v2.1',
        code: 'PCB-2024-001',
        lotNumber: 'LOT-2024-12-001',
      },
      supplier: {
        id: 'sup-001',
        name: 'Tech Components SRL',
        code: 'SUP-TC-001',
      },
      reportedBy: {
        id: 'user-001',
        name: 'Maria Ionescu',
        department: 'Quality Control',
      },
      assignedTo: {
        id: 'user-002',
        name: 'Ion Popescu',
        department: 'Productie',
      },
      reportedDate: '2024-12-16',
      dueDate: '2024-12-23',
      quantityAffected: 2,
      quantityUnit: 'buc',
      costImpact: 450,
      currency: 'RON',
      rootCause: 'Cauza principala identificata: manipulare necorespunzatoare in timpul procesului de ambalare la furnizor. Zgârieturile au fost cauzate de contactul direct intre PCB-uri fara separatoare adecvate.',
      containmentActions: '1. Unitatile afectate au fost izolate si marcate\n2. Stocul existent a fost verificat suplimentar\n3. Furnizorul a fost notificat',
      linkedInspection: 'INS-2024-0156',
      linkedCAPAs: ['CAPA-2024-0045'],
      tags: ['furnizor', 'ambalaj', 'vizual'],
      createdAt: '2024-12-16T11:30:00Z',
      updatedAt: '2024-12-17T09:15:00Z',
    });

    setActivities([
      {
        id: 'act-001',
        type: 'STATUS_CHANGE',
        description: 'Status schimbat de la Izolare la Analiza Cauza',
        performedBy: 'Ion Popescu',
        performedAt: '2024-12-17T09:15:00Z',
        oldValue: 'CONTAINMENT',
        newValue: 'ROOT_CAUSE',
      },
      {
        id: 'act-002',
        type: 'COMMENT',
        description: 'Am finalizat izolarea unitatilor afectate. Se poate trece la analiza cauzei radacina.',
        performedBy: 'Ion Popescu',
        performedAt: '2024-12-17T09:00:00Z',
      },
      {
        id: 'act-003',
        type: 'ASSIGNMENT',
        description: 'NCR atribuit pentru investigatie',
        performedBy: 'Maria Ionescu',
        performedAt: '2024-12-16T14:00:00Z',
        newValue: 'Ion Popescu',
      },
      {
        id: 'act-004',
        type: 'STATUS_CHANGE',
        description: 'Status schimbat de la In Revizuire la Izolare',
        performedBy: 'Maria Ionescu',
        performedAt: '2024-12-16T12:30:00Z',
        oldValue: 'IN_REVIEW',
        newValue: 'CONTAINMENT',
      },
      {
        id: 'act-005',
        type: 'ATTACHMENT',
        description: 'Fotografii atasate cu defectele identificate',
        performedBy: 'Maria Ionescu',
        performedAt: '2024-12-16T11:45:00Z',
      },
      {
        id: 'act-006',
        type: 'STATUS_CHANGE',
        description: 'NCR creat si trimis pentru revizuire',
        performedBy: 'Maria Ionescu',
        performedAt: '2024-12-16T11:30:00Z',
        oldValue: 'OPEN',
        newValue: 'IN_REVIEW',
      },
    ]);

    setAttachments([
      {
        id: 'att-001',
        filename: 'defect_pcb_1.jpg',
        type: 'IMAGE',
        size: 1856000,
        uploadedBy: 'Maria Ionescu',
        uploadedAt: '2024-12-16T11:45:00Z',
        url: '/attachments/defect_pcb_1.jpg',
      },
      {
        id: 'att-002',
        filename: 'defect_pcb_2.jpg',
        type: 'IMAGE',
        size: 2124000,
        uploadedBy: 'Maria Ionescu',
        uploadedAt: '2024-12-16T11:45:00Z',
        url: '/attachments/defect_pcb_2.jpg',
      },
      {
        id: 'att-003',
        filename: 'raport_inspectie_INS-2024-0156.pdf',
        type: 'REPORT',
        size: 524000,
        uploadedBy: 'Maria Ionescu',
        uploadedAt: '2024-12-16T12:00:00Z',
        url: '/attachments/raport_inspectie.pdf',
      },
    ]);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/quality/ncr/${ncrId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Status actualizat cu succes');
        fetchNCRDetails();
        setShowStatusModal(false);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      // Update locally for demo
      if (ncr) {
        const oldStatus = ncr.status;
        setNCR({ ...ncr, status: newStatus as NCRDetail['status'] });
        setActivities([
          {
            id: `act-${Date.now()}`,
            type: 'STATUS_CHANGE',
            description: `Status schimbat de la ${getStatusLabel(oldStatus)} la ${getStatusLabel(newStatus)}`,
            performedBy: 'Utilizator',
            performedAt: new Date().toISOString(),
            oldValue: oldStatus,
            newValue: newStatus,
          },
          ...activities,
        ]);
        toast.success('Status actualizat (demo)');
        setShowStatusModal(false);
      }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/quality/ncr/${ncrId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        toast.success('Comentariu adaugat');
        fetchNCRDetails();
        setNewComment('');
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setActivities([
        {
          id: `act-${Date.now()}`,
          type: 'COMMENT',
          description: newComment,
          performedBy: 'Utilizator',
          performedAt: new Date().toISOString(),
        },
        ...activities,
      ]);
      toast.success('Comentariu adaugat (demo)');
      setNewComment('');
    }
  };

  const handleCreateCAPA = () => {
    router.push(`/dashboard/quality/capa/new?ncrId=${ncrId}`);
  };

  const handleGenerateReport = () => {
    toast.success('Se genereaza raportul NCR...');
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

  const getDaysRemaining = (): number => {
    if (!ncr?.dueDate) return 0;
    const today = new Date();
    const due = new Date(ncr.dueDate);
    const diff = due.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getCurrentStepIndex = (): number => {
    if (!ncr) return 0;
    const index = NCR_WORKFLOW.findIndex(step => step.id === ncr.status);
    return index >= 0 ? index : 0;
  };

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

  if (!ncr) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">NCR negasit</h2>
        <p className="text-gray-500 mb-4">Raportul de neconformitate solicitat nu a fost gasit.</p>
        <button
          onClick={() => router.push('/dashboard/quality')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Inapoi la Calitate
        </button>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();
  const currentStep = getCurrentStepIndex();

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
              <h1 className="text-2xl font-bold text-gray-900">{ncr.ncrNumber}</h1>
              {getSeverityIcon(ncr.severity)}
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(ncr.severity)}`}>
                {getStatusLabel(ncr.severity)}
              </span>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(ncr.status)}`}>
                {getStatusLabel(ncr.status)}
              </span>
            </div>
            <p className="text-gray-600">{ncr.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNCRDetails}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Actualizeaza"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleGenerateReport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Settings className="w-4 h-4" />
            Actualizeaza Status
          </button>
        </div>
      </div>

      {/* Workflow Progress */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Progres Rezolvare</h3>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            daysRemaining < 0 ? 'bg-red-100 text-red-700' :
            daysRemaining <= 3 ? 'bg-orange-100 text-orange-700' :
            'bg-green-100 text-green-700'
          }`}>
            <Clock className="w-4 h-4" />
            {daysRemaining < 0
              ? `Intarziat cu ${Math.abs(daysRemaining)} zile`
              : daysRemaining === 0
                ? 'Scadent astazi'
                : `${daysRemaining} zile ramase`
            }
          </div>
        </div>
        <div className="relative">
          <div className="flex justify-between">
            {NCR_WORKFLOW.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const isRejected = ncr.status === 'REJECTED';

              return (
                <div key={step.id} className="flex-1 relative">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isRejected && isCurrent
                          ? 'bg-gray-400 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className={`mt-2 text-xs text-center ${
                      isCurrent ? 'font-medium text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < NCR_WORKFLOW.length - 1 && (
                    <div
                      className={`absolute top-4 left-1/2 w-full h-0.5 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                      style={{ transform: 'translateX(50%)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Prezentare', icon: AlertOctagon },
            { id: 'analysis', label: 'Analiza', icon: Target },
            { id: 'actions', label: 'Actiuni', icon: ClipboardCheck },
            { id: 'history', label: 'Istoric', icon: History },
            { id: 'attachments', label: 'Atasamente', icon: Paperclip },
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
                {tab.id === 'history' && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-full">{activities.length}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Description */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              Descriere Neconformitate
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">{ncr.description}</p>

            {ncr.tags && ncr.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Etichete
                </p>
                <div className="flex flex-wrap gap-2">
                  {ncr.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Detalii
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Categorie</span>
                <span className="font-medium">{ncr.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Departament</span>
                <span className="font-medium">{ncr.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Data Raportare</span>
                <span className="font-medium">{formatDate(ncr.reportedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Termen</span>
                <span className={`font-medium ${daysRemaining < 0 ? 'text-red-600' : ''}`}>
                  {formatDate(ncr.dueDate)}
                </span>
              </div>
              {ncr.quantityAffected && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cantitate Afectata</span>
                  <span className="font-medium">{ncr.quantityAffected} {ncr.quantityUnit}</span>
                </div>
              )}
              {ncr.costImpact && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Impact Cost</span>
                  <span className="font-medium text-red-600">{ncr.costImpact.toLocaleString()} {ncr.currency}</span>
                </div>
              )}
            </div>
          </div>

          {/* Product & Supplier */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-purple-500" />
              Produs / Furnizor
            </h3>
            {ncr.product && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Produs</p>
                <p className="font-medium">{ncr.product.name}</p>
                <p className="text-sm text-gray-500">
                  Cod: {ncr.product.code} {ncr.product.lotNumber && `• Lot: ${ncr.product.lotNumber}`}
                </p>
              </div>
            )}
            {ncr.supplier && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Furnizor</p>
                <p className="font-medium">{ncr.supplier.name}</p>
                <p className="text-sm text-gray-500">Cod: {ncr.supplier.code}</p>
              </div>
            )}

            {ncr.linkedInspection && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push(`/dashboard/quality/inspections/${ncr.linkedInspection}`)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Link className="w-4 h-4" />
                  Inspectie: {ncr.linkedInspection}
                </button>
              </div>
            )}
          </div>

          {/* People */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Persoane Implicate
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Raportat de</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium">{ncr.reportedBy.name}</p>
                    <p className="text-sm text-gray-500">{ncr.reportedBy.department}</p>
                  </div>
                </div>
              </div>
              {ncr.assignedTo && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Atribuit catre</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">{ncr.assignedTo.name}</p>
                      <p className="text-sm text-gray-500">{ncr.assignedTo.department}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {/* Root Cause */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Analiza Cauza Radacina
            </h3>
            {ncr.rootCause ? (
              <p className="text-gray-700 whitespace-pre-wrap">{ncr.rootCause}</p>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Analiza cauzei radacina nu a fost completata</p>
                <button className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-800">
                  + Adauga analiza
                </button>
              </div>
            )}
          </div>

          {/* Related CAPAs */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-500" />
                CAPA-uri Asociate
              </h3>
              <button
                onClick={handleCreateCAPA}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Creeaza CAPA
              </button>
            </div>
            {ncr.linkedCAPAs && ncr.linkedCAPAs.length > 0 ? (
              <div className="space-y-2">
                {ncr.linkedCAPAs.map((capa, index) => (
                  <button
                    key={index}
                    onClick={() => router.push(`/dashboard/quality/capa/${capa}`)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <span className="font-medium text-blue-600">{capa}</span>
                    <Link className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Niciun CAPA asociat</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="space-y-6">
          {/* Containment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Actiuni de Izolare (Containment)
            </h3>
            {ncr.containmentActions ? (
              <p className="text-gray-700 whitespace-pre-wrap">{ncr.containmentActions}</p>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nu au fost definite actiuni de izolare</p>
                <button className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-800">
                  + Adauga actiuni
                </button>
              </div>
            )}
          </div>

          {/* Corrective Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Actiuni Corective
            </h3>
            {ncr.correctiveActions ? (
              <p className="text-gray-700 whitespace-pre-wrap">{ncr.correctiveActions}</p>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nu au fost definite actiuni corective</p>
                <button className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-800">
                  + Adauga actiuni
                </button>
              </div>
            )}
          </div>

          {/* Verification */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-500" />
              Note Verificare
            </h3>
            {ncr.verificationNotes ? (
              <p className="text-gray-700 whitespace-pre-wrap">{ncr.verificationNotes}</p>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Verificarea nu a fost efectuata inca</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Add Comment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Adauga Comentariu</h3>
            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Scrie un comentariu sau actualizare..."
                rows={3}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Trimite
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Istoric Activitati ({activities.length})</h3>
            </div>
            <div className="p-4">
              <div className="relative">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="flex gap-4 pb-6 last:pb-0">
                    <div className="relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.type === 'STATUS_CHANGE' ? 'bg-blue-100' :
                        activity.type === 'COMMENT' ? 'bg-green-100' :
                        activity.type === 'ASSIGNMENT' ? 'bg-purple-100' :
                        'bg-gray-100'
                      }`}>
                        {activity.type === 'STATUS_CHANGE' && <Settings className="w-4 h-4 text-blue-600" />}
                        {activity.type === 'COMMENT' && <MessageSquare className="w-4 h-4 text-green-600" />}
                        {activity.type === 'ASSIGNMENT' && <User className="w-4 h-4 text-purple-600" />}
                        {activity.type === 'ATTACHMENT' && <Paperclip className="w-4 h-4 text-gray-600" />}
                        {activity.type === 'EDIT' && <Edit className="w-4 h-4 text-gray-600" />}
                      </div>
                      {index < activities.length - 1 && (
                        <div className="absolute top-8 left-4 w-0.5 h-full -ml-px bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{activity.performedBy}</span>
                        <span className="text-xs text-gray-400">{formatDateTime(activity.performedAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{activity.description}</p>
                      {activity.type === 'STATUS_CHANGE' && activity.oldValue && activity.newValue && (
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${getStatusColor(activity.oldValue)}`}>
                            {getStatusLabel(activity.oldValue)}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className={`px-2 py-0.5 rounded-full ${getStatusColor(activity.newValue)}`}>
                            {getStatusLabel(activity.newValue)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                      <Camera className="w-6 h-6 text-purple-600" />
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
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Actualizeaza Status NCR</h3>
            </div>
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {NCR_WORKFLOW.map((step) => (
                <button
                  key={step.id}
                  onClick={() => handleUpdateStatus(step.id)}
                  disabled={step.id === ncr.status}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border ${
                    step.id === ncr.status
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    getStatusColor(step.id)
                  }`}>
                    {NCR_WORKFLOW.indexOf(step) + 1}
                  </span>
                  <span className="font-medium">{step.label}</span>
                  {step.id === ncr.status && (
                    <span className="ml-auto text-xs text-blue-600">Status curent</span>
                  )}
                </button>
              ))}
              <button
                onClick={() => handleUpdateStatus('REJECTED')}
                disabled={ncr.status === 'REJECTED'}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-50"
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100 text-red-700">
                  <XCircle className="w-4 h-4" />
                </span>
                <span className="font-medium text-red-700">Respinge NCR</span>
              </button>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Anuleaza
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
