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
  Clock,
  FileText,
  Download,
  Edit,
  MessageSquare,
  Plus,
  Link,
  Target,
  AlertOctagon,
  Send,
  History,
  Settings,
  Users,
  Zap,
  TrendingUp,
  BarChart3,
  Play,
  Pause,
  CheckCircle2,
  ListChecks,
  Paperclip,
  Eye,
  Camera,
} from 'lucide-react';

interface CAPADetail {
  id: string;
  capaNumber: string;
  title: string;
  description: string;
  type: 'CORRECTIVE' | 'PREVENTIVE';
  status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'CLOSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  department: string;
  owner: {
    id: string;
    name: string;
    department: string;
  };
  verifier?: {
    id: string;
    name: string;
    department: string;
  };
  createdBy: {
    id: string;
    name: string;
    department: string;
  };
  createdDate: string;
  targetDate: string;
  completedDate?: string;
  verifiedDate?: string;
  closedDate?: string;
  completionPercentage: number;
  rootCauseAnalysis?: string;
  proposedActions?: string;
  implementedActions?: string;
  verificationMethod?: string;
  verificationResults?: string;
  effectivenessNotes?: string;
  linkedNCRs?: string[];
  linkedInspections?: string[];
  costEstimate?: number;
  actualCost?: number;
  currency: string;
  preventionScope?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  tags?: string[];
  updatedAt: string;
}

interface CAPATask {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  completedDate?: string;
  notes?: string;
}

interface CAPAActivity {
  id: string;
  type: 'STATUS_CHANGE' | 'COMMENT' | 'TASK_UPDATE' | 'ATTACHMENT' | 'EDIT' | 'VERIFICATION';
  description: string;
  performedBy: string;
  performedAt: string;
  oldValue?: string;
  newValue?: string;
}

interface CAPAAttachment {
  id: string;
  filename: string;
  type: 'IMAGE' | 'DOCUMENT' | 'REPORT' | 'EVIDENCE';
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'DRAFT': 'bg-gray-100 text-gray-800',
    'OPEN': 'bg-blue-100 text-blue-800',
    'IN_PROGRESS': 'bg-indigo-100 text-indigo-800',
    'PENDING_VERIFICATION': 'bg-yellow-100 text-yellow-800',
    'VERIFIED': 'bg-green-100 text-green-800',
    'CLOSED': 'bg-gray-100 text-gray-800',
    'CANCELLED': 'bg-red-100 text-red-800',
    'CORRECTIVE': 'bg-orange-100 text-orange-800',
    'PREVENTIVE': 'bg-purple-100 text-purple-800',
    'LOW': 'bg-green-100 text-green-800',
    'MEDIUM': 'bg-yellow-100 text-yellow-800',
    'HIGH': 'bg-orange-100 text-orange-800',
    'CRITICAL': 'bg-red-100 text-red-800',
    'PENDING': 'bg-gray-100 text-gray-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'BLOCKED': 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'DRAFT': 'Ciorna',
    'OPEN': 'Deschis',
    'IN_PROGRESS': 'In Desfasurare',
    'PENDING_VERIFICATION': 'Verificare Pendinta',
    'VERIFIED': 'Verificat',
    'CLOSED': 'Inchis',
    'CANCELLED': 'Anulat',
    'CORRECTIVE': 'Corectiv',
    'PREVENTIVE': 'Preventiv',
    'LOW': 'Scazut',
    'MEDIUM': 'Mediu',
    'HIGH': 'Ridicat',
    'CRITICAL': 'Critic',
    'PENDING': 'In Asteptare',
    'COMPLETED': 'Finalizat',
    'BLOCKED': 'Blocat',
    'STATUS_CHANGE': 'Schimbare Status',
    'COMMENT': 'Comentariu',
    'TASK_UPDATE': 'Actualizare Task',
    'ATTACHMENT': 'Atasament',
    'EDIT': 'Editare',
    'VERIFICATION': 'Verificare',
  };
  return labels[status] || status;
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'CRITICAL':
      return <Zap className="w-4 h-4 text-red-600" />;
    case 'HIGH':
      return <AlertOctagon className="w-4 h-4 text-orange-600" />;
    case 'MEDIUM':
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    default:
      return <CheckCircle className="w-4 h-4 text-green-600" />;
  }
};

const CAPA_WORKFLOW = [
  { id: 'DRAFT', label: 'Ciorna' },
  { id: 'OPEN', label: 'Deschis' },
  { id: 'IN_PROGRESS', label: 'In Desfasurare' },
  { id: 'PENDING_VERIFICATION', label: 'Verificare' },
  { id: 'VERIFIED', label: 'Verificat' },
  { id: 'CLOSED', label: 'Inchis' },
];

export default function CAPADetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const capaId = params.id as string;

  const [capa, setCAPA] = useState<CAPADetail | null>(null);
  const [tasks, setTasks] = useState<CAPATask[]>([]);
  const [activities, setActivities] = useState<CAPAActivity[]>([]);
  const [attachments, setAttachments] = useState<CAPAAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'tasks' | 'verification' | 'history' | 'attachments'>('overview');
  const [newComment, setNewComment] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  useEffect(() => {
    if (capaId) {
      fetchCAPADetails();
    }
  }, [capaId]);

  const fetchCAPADetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const capaRes = await fetch(`${API_URL}/quality/capa/${capaId}`, { headers });
      if (capaRes.ok) {
        setCAPA(await capaRes.json());
      }

      const tasksRes = await fetch(`${API_URL}/quality/capa/${capaId}/tasks`, { headers });
      if (tasksRes.ok) {
        setTasks(await tasksRes.json());
      }

      const activitiesRes = await fetch(`${API_URL}/quality/capa/${capaId}/activities`, { headers });
      if (activitiesRes.ok) {
        setActivities(await activitiesRes.json());
      }

      const attachmentsRes = await fetch(`${API_URL}/quality/capa/${capaId}/attachments`, { headers });
      if (attachmentsRes.ok) {
        setAttachments(await attachmentsRes.json());
      }
    } catch (error) {
      console.error('Error fetching CAPA details:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setCAPA({
      id: capaId,
      capaNumber: 'CAPA-2024-0045',
      title: 'Imbunatatire proces ambalare furnizor',
      description: 'Actiune corectiva pentru prevenirea defectelor vizuale cauzate de manipularea necorespunzatoare in timpul ambalarii. Se vor implementa separatoare intre componentele PCB si se va actualiza procedura de ambalare.',
      type: 'CORRECTIVE',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      category: 'Proces Furnizor',
      department: 'Achizitii',
      owner: {
        id: 'user-002',
        name: 'Ion Popescu',
        department: 'Achizitii',
      },
      verifier: {
        id: 'user-003',
        name: 'Ana Marinescu',
        department: 'Quality Assurance',
      },
      createdBy: {
        id: 'user-001',
        name: 'Maria Ionescu',
        department: 'Quality Control',
      },
      createdDate: '2024-12-16',
      targetDate: '2024-12-30',
      completionPercentage: 65,
      rootCauseAnalysis: '## Analiza 5 Why\n\n1. **De ce au aparut zgarieturile?**\n   PCB-urile au intrat in contact direct unele cu altele\n\n2. **De ce au intrat in contact?**\n   Nu existau separatoare in cutie\n\n3. **De ce nu existau separatoare?**\n   Procedura de ambalare nu specifica acest lucru\n\n4. **De ce nu specifica?**\n   Procedura nu a fost actualizata pentru noul produs\n\n5. **Cauza radacina:**\n   Lipsa revizuirii procedurii de ambalare la introducerea produselor noi',
      proposedActions: '1. Actualizare procedura de ambalare la furnizor\n2. Implementare separatoare din spuma EPE intre straturi\n3. Training pentru personalul de ambalare\n4. Audit la furnizor pentru verificare implementare',
      implementedActions: '1. ✅ Procedura actualizata si trimisa furnizorului\n2. ✅ Furnizor confirma primirea separatoarelor EPE\n3. 🔄 Training in curs (programat 20.12)',
      verificationMethod: 'Inspectie primele 3 loturi dupa implementare + Audit furnizor',
      linkedNCRs: ['NCR-2024-0089'],
      linkedInspections: ['INS-2024-0156'],
      costEstimate: 1500,
      actualCost: 1200,
      currency: 'RON',
      preventionScope: 'Toate componentele electronice de la acest furnizor',
      riskLevel: 'MEDIUM',
      tags: ['furnizor', 'ambalaj', 'proces'],
      updatedAt: '2024-12-17T10:30:00Z',
    });

    setTasks([
      {
        id: 'task-001',
        title: 'Actualizare procedura ambalare',
        description: 'Revizuire si actualizare procedura PR-AMB-001',
        assignedTo: 'Ion Popescu',
        dueDate: '2024-12-18',
        status: 'COMPLETED',
        completedDate: '2024-12-17',
        notes: 'Procedura v2.0 finalizata si trimisa la furnizor',
      },
      {
        id: 'task-002',
        title: 'Achizitie separatoare EPE',
        description: 'Comandare si livrare separatoare spuma EPE',
        assignedTo: 'Ion Popescu',
        dueDate: '2024-12-19',
        status: 'COMPLETED',
        completedDate: '2024-12-18',
      },
      {
        id: 'task-003',
        title: 'Training personal ambalare',
        description: 'Sesiune training pentru echipa de ambalare la furnizor',
        assignedTo: 'Ana Marinescu',
        dueDate: '2024-12-20',
        status: 'IN_PROGRESS',
        notes: 'Training programat pentru 20.12, ora 10:00',
      },
      {
        id: 'task-004',
        title: 'Audit furnizor',
        description: 'Verificare implementare la sediul furnizorului',
        assignedTo: 'Maria Ionescu',
        dueDate: '2024-12-28',
        status: 'PENDING',
      },
      {
        id: 'task-005',
        title: 'Inspectie lot verificare',
        description: 'Inspectie primele 3 loturi dupa implementare',
        assignedTo: 'Maria Ionescu',
        dueDate: '2024-12-30',
        status: 'PENDING',
      },
    ]);

    setActivities([
      {
        id: 'act-001',
        type: 'TASK_UPDATE',
        description: 'Task "Achizitie separatoare EPE" marcat ca finalizat',
        performedBy: 'Ion Popescu',
        performedAt: '2024-12-18T16:00:00Z',
      },
      {
        id: 'act-002',
        type: 'COMMENT',
        description: 'Furnizorul a confirmat primirea noii proceduri si a comandat separatoarele.',
        performedBy: 'Ion Popescu',
        performedAt: '2024-12-18T14:30:00Z',
      },
      {
        id: 'act-003',
        type: 'TASK_UPDATE',
        description: 'Task "Actualizare procedura ambalare" marcat ca finalizat',
        performedBy: 'Ion Popescu',
        performedAt: '2024-12-17T15:00:00Z',
      },
      {
        id: 'act-004',
        type: 'STATUS_CHANGE',
        description: 'Status schimbat de la Deschis la In Desfasurare',
        performedBy: 'Ion Popescu',
        performedAt: '2024-12-17T09:00:00Z',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
      },
      {
        id: 'act-005',
        type: 'EDIT',
        description: 'Adaugare analiza cauza radacina (5 Why)',
        performedBy: 'Ion Popescu',
        performedAt: '2024-12-16T16:00:00Z',
      },
      {
        id: 'act-006',
        type: 'STATUS_CHANGE',
        description: 'CAPA creat si deschis pentru actiune',
        performedBy: 'Maria Ionescu',
        performedAt: '2024-12-16T12:00:00Z',
        oldValue: 'DRAFT',
        newValue: 'OPEN',
      },
    ]);

    setAttachments([
      {
        id: 'att-001',
        filename: 'procedura_ambalare_v2.pdf',
        type: 'DOCUMENT',
        size: 856000,
        uploadedBy: 'Ion Popescu',
        uploadedAt: '2024-12-17T15:30:00Z',
        url: '/attachments/procedura_ambalare_v2.pdf',
      },
      {
        id: 'att-002',
        filename: 'specificatie_separatoare_EPE.pdf',
        type: 'DOCUMENT',
        size: 324000,
        uploadedBy: 'Ion Popescu',
        uploadedAt: '2024-12-17T10:00:00Z',
        url: '/attachments/specificatie_separatoare.pdf',
      },
      {
        id: 'att-003',
        filename: 'diagrama_ishikawa.png',
        type: 'IMAGE',
        size: 1245000,
        uploadedBy: 'Ion Popescu',
        uploadedAt: '2024-12-16T16:30:00Z',
        url: '/attachments/diagrama_ishikawa.png',
      },
    ]);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/quality/capa/${capaId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Status actualizat cu succes');
        fetchCAPADetails();
        setShowStatusModal(false);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      if (capa) {
        const oldStatus = capa.status;
        setCAPA({ ...capa, status: newStatus as CAPADetail['status'] });
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

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/quality/capa/${capaId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Task actualizat');
        fetchCAPADetails();
      } else {
        throw new Error('Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setTasks(tasks.map(t =>
        t.id === taskId
          ? { ...t, status: newStatus as CAPATask['status'], completedDate: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined }
          : t
      ));
      toast.success('Task actualizat (demo)');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/quality/capa/${capaId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        toast.success('Comentariu adaugat');
        fetchCAPADetails();
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

  const handleGenerateReport = () => {
    toast.success('Se genereaza raportul CAPA...');
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
    if (!capa?.targetDate) return 0;
    const today = new Date();
    const target = new Date(capa.targetDate);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getCurrentStepIndex = (): number => {
    if (!capa) return 0;
    const index = CAPA_WORKFLOW.findIndex(step => step.id === capa.status);
    return index >= 0 ? index : 0;
  };

  const getCompletedTasksCount = (): number => {
    return tasks.filter(t => t.status === 'COMPLETED').length;
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

  if (!capa) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">CAPA negasit</h2>
        <p className="text-gray-500 mb-4">Actiunea corectiva/preventiva solicitata nu a fost gasita.</p>
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
              <h1 className="text-2xl font-bold text-gray-900">{capa.capaNumber}</h1>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(capa.type)}`}>
                {getStatusLabel(capa.type)}
              </span>
              {getPriorityIcon(capa.priority)}
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(capa.priority)}`}>
                {getStatusLabel(capa.priority)}
              </span>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(capa.status)}`}>
                {getStatusLabel(capa.status)}
              </span>
            </div>
            <p className="text-gray-600">{capa.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCAPADetails}
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

      {/* Progress Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke={capa.completionPercentage >= 100 ? '#10B981' : '#3B82F6'}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${capa.completionPercentage * 2.26} 226`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{capa.completionPercentage}%</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Progres CAPA</h3>
              <p className="text-gray-500">
                {getCompletedTasksCount()} din {tasks.length} task-uri finalizate
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className={`px-4 py-2 rounded-lg ${
              daysRemaining < 0 ? 'bg-red-100' :
              daysRemaining <= 3 ? 'bg-orange-100' : 'bg-green-100'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${
                  daysRemaining < 0 ? 'text-red-600' :
                  daysRemaining <= 3 ? 'text-orange-600' : 'text-green-600'
                }`} />
                <div>
                  <p className={`font-medium ${
                    daysRemaining < 0 ? 'text-red-700' :
                    daysRemaining <= 3 ? 'text-orange-700' : 'text-green-700'
                  }`}>
                    {daysRemaining < 0
                      ? `Intarziat cu ${Math.abs(daysRemaining)} zile`
                      : daysRemaining === 0
                        ? 'Scadent astazi'
                        : `${daysRemaining} zile ramase`
                    }
                  </p>
                  <p className="text-xs text-gray-500">Termen: {formatDate(capa.targetDate)}</p>
                </div>
              </div>
            </div>
            {capa.costEstimate && (
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-500">Cost</p>
                <p className="font-medium">
                  {capa.actualCost?.toLocaleString() || '-'} / {capa.costEstimate.toLocaleString()} {capa.currency}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Workflow Progress */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between">
            {CAPA_WORKFLOW.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={step.id} className="flex-1 relative">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCompleted
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
                  {index < CAPA_WORKFLOW.length - 1 && (
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
            { id: 'overview', label: 'Prezentare', icon: ClipboardCheck },
            { id: 'analysis', label: 'Analiza', icon: Target },
            { id: 'tasks', label: 'Task-uri', icon: ListChecks },
            { id: 'verification', label: 'Verificare', icon: CheckCircle2 },
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
                {tab.id === 'tasks' && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                    {getCompletedTasksCount()}/{tasks.length}
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
          {/* Description */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-500" />
              Descriere
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">{capa.description}</p>

            {capa.tags && capa.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {capa.tags.map((tag, index) => (
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
              <FileText className="w-5 h-5 text-green-500" />
              Detalii
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Categorie</span>
                <span className="font-medium">{capa.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Departament</span>
                <span className="font-medium">{capa.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Data Creare</span>
                <span className="font-medium">{formatDate(capa.createdDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Termen</span>
                <span className={`font-medium ${daysRemaining < 0 ? 'text-red-600' : ''}`}>
                  {formatDate(capa.targetDate)}
                </span>
              </div>
              {capa.riskLevel && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Nivel Risc</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(capa.riskLevel)}`}>
                    {getStatusLabel(capa.riskLevel)}
                  </span>
                </div>
              )}
              {capa.preventionScope && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Aplicabilitate</span>
                  <span className="font-medium text-right max-w-xs">{capa.preventionScope}</span>
                </div>
              )}
            </div>
          </div>

          {/* People */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Persoane Implicate
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Owner</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">{capa.owner.name}</p>
                    <p className="text-sm text-gray-500">{capa.owner.department}</p>
                  </div>
                </div>
              </div>
              {capa.verifier && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Verificator</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">{capa.verifier.name}</p>
                      <p className="text-sm text-gray-500">{capa.verifier.department}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Creat de</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium">{capa.createdBy.name}</p>
                    <p className="text-sm text-gray-500">{capa.createdBy.department}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Linked Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Link className="w-5 h-5 text-orange-500" />
              Elemente Asociate
            </h3>
            <div className="space-y-4">
              {capa.linkedNCRs && capa.linkedNCRs.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">NCR-uri</p>
                  <div className="space-y-2">
                    {capa.linkedNCRs.map((ncr, index) => (
                      <button
                        key={index}
                        onClick={() => router.push(`/dashboard/quality/ncr/${ncr}`)}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <AlertOctagon className="w-4 h-4" />
                        {ncr}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {capa.linkedInspections && capa.linkedInspections.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Inspectii</p>
                  <div className="space-y-2">
                    {capa.linkedInspections.map((insp, index) => (
                      <button
                        key={index}
                        onClick={() => router.push(`/dashboard/quality/inspections/${insp}`)}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        {insp}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(!capa.linkedNCRs || capa.linkedNCRs.length === 0) && (!capa.linkedInspections || capa.linkedInspections.length === 0) && (
                <p className="text-gray-500 text-center py-4">Niciun element asociat</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {/* Root Cause Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Analiza Cauza Radacina
            </h3>
            {capa.rootCauseAnalysis ? (
              <div className="prose prose-sm max-w-none text-gray-700">
                <pre className="whitespace-pre-wrap font-sans">{capa.rootCauseAnalysis}</pre>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Analiza cauza radacina nu a fost adaugata</p>
              </div>
            )}
          </div>

          {/* Proposed Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-500" />
              Actiuni Propuse
            </h3>
            {capa.proposedActions ? (
              <pre className="whitespace-pre-wrap font-sans text-gray-700">{capa.proposedActions}</pre>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nu au fost definite actiuni</p>
              </div>
            )}
          </div>

          {/* Implemented Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Actiuni Implementate
            </h3>
            {capa.implementedActions ? (
              <pre className="whitespace-pre-wrap font-sans text-gray-700">{capa.implementedActions}</pre>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nu au fost implementate actiuni inca</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Task-uri ({tasks.length})</h3>
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Adauga Task
            </button>
          </div>

          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleUpdateTaskStatus(
                        task.id,
                        task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
                      )}
                      className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        task.status === 'COMPLETED'
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {task.status === 'COMPLETED' && <CheckCircle className="w-4 h-4" />}
                    </button>
                    <div>
                      <h4 className={`font-medium ${task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {task.assignedTo}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                      {task.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">"{task.notes}"</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Metoda de Verificare
            </h3>
            {capa.verificationMethod ? (
              <p className="text-gray-700">{capa.verificationMethod}</p>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Metoda de verificare nu a fost definita</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Rezultate Verificare
            </h3>
            {capa.verificationResults ? (
              <p className="text-gray-700">{capa.verificationResults}</p>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Verificarea nu a fost efectuata inca</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Eficacitate
            </h3>
            {capa.effectivenessNotes ? (
              <p className="text-gray-700">{capa.effectivenessNotes}</p>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Evaluarea eficacitatii nu a fost efectuata</p>
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
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Scrie un comentariu sau actualizare..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
                        activity.type === 'TASK_UPDATE' ? 'bg-purple-100' :
                        activity.type === 'VERIFICATION' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        {activity.type === 'STATUS_CHANGE' && <Settings className="w-4 h-4 text-blue-600" />}
                        {activity.type === 'COMMENT' && <MessageSquare className="w-4 h-4 text-green-600" />}
                        {activity.type === 'TASK_UPDATE' && <ListChecks className="w-4 h-4 text-purple-600" />}
                        {activity.type === 'VERIFICATION' && <CheckCircle2 className="w-4 h-4 text-yellow-600" />}
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
                    att.type === 'EVIDENCE' ? 'bg-green-100' :
                    att.type === 'REPORT' ? 'bg-orange-100' : 'bg-blue-100'
                  }`}>
                    {att.type === 'IMAGE' ? (
                      <Camera className="w-6 h-6 text-purple-600" />
                    ) : (
                      <FileText className={`w-6 h-6 ${
                        att.type === 'EVIDENCE' ? 'text-green-600' :
                        att.type === 'REPORT' ? 'text-orange-600' : 'text-blue-600'
                      }`} />
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
              <h3 className="text-lg font-semibold text-gray-900">Actualizeaza Status CAPA</h3>
            </div>
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {CAPA_WORKFLOW.map((step) => (
                <button
                  key={step.id}
                  onClick={() => handleUpdateStatus(step.id)}
                  disabled={step.id === capa.status}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border ${
                    step.id === capa.status
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    getStatusColor(step.id)
                  }`}>
                    {CAPA_WORKFLOW.indexOf(step) + 1}
                  </span>
                  <span className="font-medium">{step.label}</span>
                  {step.id === capa.status && (
                    <span className="ml-auto text-xs text-blue-600">Status curent</span>
                  )}
                </button>
              ))}
              <button
                onClick={() => handleUpdateStatus('CANCELLED')}
                disabled={capa.status === 'CANCELLED'}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-50"
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100 text-red-700">
                  <XCircle className="w-4 h-4" />
                </span>
                <span className="font-medium text-red-700">Anuleaza CAPA</span>
              </button>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Inchide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
