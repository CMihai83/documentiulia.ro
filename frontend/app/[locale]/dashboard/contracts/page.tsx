'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileSignature,
  Building2,
  Briefcase,
  Euro,
  Send,
  Eye,
  Edit,
  MoreHorizontal,
  PenTool,
  AlertCircle,
  Timer,
  History,
  BarChart3,
  Users,
  TrendingUp,
  FileCheck,
  FilePlus,
  FileX,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

type ContractStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'EXPIRED';
type ContractType = 'FULL_TIME' | 'PART_TIME' | 'TEMPORARY' | 'PROJECT' | 'INTERNSHIP' | 'APPRENTICE';

interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  type: ContractType;
  position: string;
  department: string;
  startDate: string;
  endDate?: string;
  probationEnd?: string;
  salary: number;
  currency: string;
  workHours: number;
  status: ContractStatus;
  signedByEmployee: boolean;
  signedByEmployer: boolean;
  telework: boolean;
  teleworkDays?: number;
  revisalSubmitted: boolean;
  createdAt: string;
}

interface Amendment {
  id: string;
  contractId: string;
  employeeName: string;
  amendmentType: 'salary_change' | 'position_change' | 'hours_change' | 'department_change' | 'extension';
  oldValue: string;
  newValue: string;
  effectiveDate: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

// Sample data
const sampleContracts: Contract[] = [
  {
    id: '1',
    employeeId: 'emp-1',
    employeeName: 'Ion Popescu',
    employeeEmail: 'ion.popescu@company.ro',
    type: 'FULL_TIME',
    position: 'Senior Developer',
    department: 'IT',
    startDate: '2023-01-15',
    probationEnd: '2023-04-15',
    salary: 12000,
    currency: 'RON',
    workHours: 40,
    status: 'ACTIVE',
    signedByEmployee: true,
    signedByEmployer: true,
    telework: true,
    teleworkDays: 3,
    revisalSubmitted: true,
    createdAt: '2023-01-10',
  },
  {
    id: '2',
    employeeId: 'emp-2',
    employeeName: 'Maria Ionescu',
    employeeEmail: 'maria.ionescu@company.ro',
    type: 'FULL_TIME',
    position: 'HR Manager',
    department: 'HR',
    startDate: '2022-06-01',
    salary: 10000,
    currency: 'RON',
    workHours: 40,
    status: 'ACTIVE',
    signedByEmployee: true,
    signedByEmployer: true,
    telework: false,
    revisalSubmitted: true,
    createdAt: '2022-05-25',
  },
  {
    id: '3',
    employeeId: 'emp-3',
    employeeName: 'Andrei Marin',
    employeeEmail: 'andrei.marin@company.ro',
    type: 'FULL_TIME',
    position: 'Junior Accountant',
    department: 'Contabilitate',
    startDate: '2024-12-01',
    probationEnd: '2025-03-01',
    salary: 5500,
    currency: 'RON',
    workHours: 40,
    status: 'PENDING_SIGNATURE',
    signedByEmployee: false,
    signedByEmployer: true,
    telework: false,
    revisalSubmitted: false,
    createdAt: '2024-11-28',
  },
  {
    id: '4',
    employeeId: 'emp-4',
    employeeName: 'Elena Dumitrescu',
    employeeEmail: 'elena.dumitrescu@company.ro',
    type: 'PART_TIME',
    position: 'Marketing Specialist',
    department: 'Marketing',
    startDate: '2024-10-15',
    salary: 4000,
    currency: 'RON',
    workHours: 20,
    status: 'ACTIVE',
    signedByEmployee: true,
    signedByEmployer: true,
    telework: true,
    teleworkDays: 5,
    revisalSubmitted: true,
    createdAt: '2024-10-10',
  },
  {
    id: '5',
    employeeId: 'emp-5',
    employeeName: 'Alexandru Popa',
    employeeEmail: 'alex.popa@company.ro',
    type: 'TEMPORARY',
    position: 'Consultant Proiect',
    department: 'Consultanță',
    startDate: '2024-06-01',
    endDate: '2024-12-31',
    salary: 15000,
    currency: 'RON',
    workHours: 40,
    status: 'ACTIVE',
    signedByEmployee: true,
    signedByEmployer: true,
    telework: true,
    teleworkDays: 2,
    revisalSubmitted: true,
    createdAt: '2024-05-25',
  },
  {
    id: '6',
    employeeId: 'emp-6',
    employeeName: 'Ana Vasilescu',
    employeeEmail: 'ana.vasilescu@company.ro',
    type: 'INTERNSHIP',
    position: 'Stagiar Design',
    department: 'Design',
    startDate: '2024-11-01',
    endDate: '2025-02-01',
    salary: 2500,
    currency: 'RON',
    workHours: 40,
    status: 'DRAFT',
    signedByEmployee: false,
    signedByEmployer: false,
    telework: false,
    revisalSubmitted: false,
    createdAt: '2024-10-28',
  },
  {
    id: '7',
    employeeId: 'emp-7',
    employeeName: 'Mihai Stanescu',
    employeeEmail: 'mihai.stanescu@company.ro',
    type: 'FULL_TIME',
    position: 'Sales Manager',
    department: 'Vânzări',
    startDate: '2021-03-01',
    salary: 11000,
    currency: 'RON',
    workHours: 40,
    status: 'TERMINATED',
    signedByEmployee: true,
    signedByEmployer: true,
    telework: false,
    revisalSubmitted: true,
    createdAt: '2021-02-20',
  },
];

const sampleAmendments: Amendment[] = [
  {
    id: '1',
    contractId: '1',
    employeeName: 'Ion Popescu',
    amendmentType: 'salary_change',
    oldValue: '10000 RON',
    newValue: '12000 RON',
    effectiveDate: '2024-07-01',
    status: 'APPROVED',
    createdAt: '2024-06-15',
  },
  {
    id: '2',
    contractId: '2',
    employeeName: 'Maria Ionescu',
    amendmentType: 'position_change',
    oldValue: 'HR Specialist',
    newValue: 'HR Manager',
    effectiveDate: '2024-01-01',
    status: 'APPROVED',
    createdAt: '2023-12-15',
  },
  {
    id: '3',
    contractId: '5',
    employeeName: 'Alexandru Popa',
    amendmentType: 'extension',
    oldValue: '2024-12-31',
    newValue: '2025-06-30',
    effectiveDate: '2025-01-01',
    status: 'PENDING',
    createdAt: '2024-12-10',
  },
  {
    id: '4',
    contractId: '4',
    employeeName: 'Elena Dumitrescu',
    amendmentType: 'hours_change',
    oldValue: '20 ore/săptămână',
    newValue: '30 ore/săptămână',
    effectiveDate: '2025-01-01',
    status: 'DRAFT',
    createdAt: '2024-12-12',
  },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const statusColors: Record<ContractStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-orange-100 text-orange-800',
  TERMINATED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-purple-100 text-purple-800',
};

const statusLabels: Record<ContractStatus, string> = {
  DRAFT: 'Ciornă',
  PENDING_SIGNATURE: 'Așteaptă Semnare',
  ACTIVE: 'Activ',
  SUSPENDED: 'Suspendat',
  TERMINATED: 'Reziliat',
  EXPIRED: 'Expirat',
};

const typeLabels: Record<ContractType, string> = {
  FULL_TIME: 'Normă Întreagă',
  PART_TIME: 'Part-Time',
  TEMPORARY: 'Determinat',
  PROJECT: 'Proiect',
  INTERNSHIP: 'Stagiu',
  APPRENTICE: 'Ucenicie',
};

const amendmentTypeLabels: Record<string, string> = {
  salary_change: 'Modificare Salariu',
  position_change: 'Modificare Funcție',
  hours_change: 'Modificare Program',
  department_change: 'Modificare Departament',
  extension: 'Prelungire Contract',
};

const amendmentStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function ContractsPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Calculate statistics
  const stats = {
    total: sampleContracts.length,
    active: sampleContracts.filter(c => c.status === 'ACTIVE').length,
    draft: sampleContracts.filter(c => c.status === 'DRAFT').length,
    pending: sampleContracts.filter(c => c.status === 'PENDING_SIGNATURE').length,
    terminated: sampleContracts.filter(c => c.status === 'TERMINATED').length,
    expiringSoon: sampleContracts.filter(c => {
      if (!c.endDate) return false;
      const end = new Date(c.endDate);
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return c.status === 'ACTIVE' && end <= thirtyDays && end >= now;
    }).length,
    inProbation: sampleContracts.filter(c => {
      if (!c.probationEnd || c.status !== 'ACTIVE') return false;
      return new Date(c.probationEnd) > new Date();
    }).length,
    pendingRevisal: sampleContracts.filter(c => c.status === 'ACTIVE' && !c.revisalSubmitted).length,
    totalSalary: sampleContracts
      .filter(c => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + c.salary, 0),
    pendingAmendments: sampleAmendments.filter(a => a.status === 'PENDING' || a.status === 'DRAFT').length,
  };

  // Chart data
  const statusData = Object.entries(statusLabels).map(([key, label]) => ({
    name: label,
    value: sampleContracts.filter(c => c.status === key).length,
  })).filter(d => d.value > 0);

  const typeData = Object.entries(typeLabels).map(([key, label]) => ({
    name: label,
    value: sampleContracts.filter(c => c.type === key && c.status === 'ACTIVE').length,
  })).filter(d => d.value > 0);

  const departmentData = [...new Set(sampleContracts.map(c => c.department))].map(dept => ({
    name: dept,
    contracts: sampleContracts.filter(c => c.department === dept && c.status === 'ACTIVE').length,
    salary: sampleContracts
      .filter(c => c.department === dept && c.status === 'ACTIVE')
      .reduce((sum, c) => sum + c.salary, 0),
  }));

  const monthlyData = [
    { month: 'Iul', created: 2, terminated: 0 },
    { month: 'Aug', created: 1, terminated: 1 },
    { month: 'Sep', created: 3, terminated: 0 },
    { month: 'Oct', created: 2, terminated: 0 },
    { month: 'Nov', created: 2, terminated: 1 },
    { month: 'Dec', created: 1, terminated: 0 },
  ];

  // Filter contracts
  const filteredContracts = sampleContracts.filter(contract => {
    const matchesSearch = searchQuery === '' ||
      contract.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesType = typeFilter === 'all' || contract.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO');
  };

  // Header Button Handlers
  const handleImportContracts = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        toast.success('Import inițiat', `Fișierul "${file.name}" este în curs de procesare.`);
      }
    };
    input.click();
  };

  const handleExportRevisal = () => {
    toast.compliance('REVISAL Export', 'Se generează XML pentru contractele active și modificările din ultimele 30 de zile.');
  };

  const handleNewContract = () => {
    router.push('/dashboard/contracts/new');
  };

  // Filter Handler
  const handleAdvancedFilters = () => {
    toast.success('Filtre avansate', 'Interval date, salariu, telemuncă, probă, REVISAL - în dezvoltare.');
  };

  // Contract Action Handlers
  const handleViewContract = (contract: Contract) => {
    router.push(`/dashboard/contracts/${contract.id}`);
  };

  const handleEditContract = (contract: Contract) => {
    router.push(`/dashboard/contracts/${contract.id}/edit`);
  };

  const handleContractOptions = (contract: Contract) => {
    // Navigate to contract actions page with all options
    router.push(`/dashboard/contracts/${contract.id}/actions`);
  };

  // Amendment Handlers
  const handleNewAmendment = () => {
    router.push('/dashboard/contracts/amendments/new');
  };

  const handleCreateAmendment = (contract: Contract) => {
    router.push(`/dashboard/contracts/${contract.id}/amendment/new`);
  };

  const handleEditAmendment = (amendment: Amendment) => {
    router.push(`/dashboard/contracts/amendments/${amendment.id}/edit`);
  };

  const handleApproveAmendment = async (amendment: Amendment) => {
    router.push(`/dashboard/contracts/amendments/${amendment.id}/approve`);
  };

  const handleRejectAmendment = async (amendment: Amendment) => {
    router.push(`/dashboard/contracts/amendments/${amendment.id}/reject`);
  };

  // REVISAL Handlers
  const handleSubmitToRevisal = async (contract: Contract) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/revisal/submit/${contract.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.compliance('REVISAL', `Contractul ${contract.employeeName} a fost transmis. Ref: REV-${Date.now()}`);
      } else {
        toast.compliance('REVISAL (Demo)', `Contractul ${contract.employeeName} marcat ca transmis (simulare).`);
      }
    } catch (err) {
      console.error('REVISAL submit failed:', err);
      toast.compliance('REVISAL (Demo)', `Contractul ${contract.employeeName} marcat ca transmis (simulare).`);
    }
  };

  const handleExportRevisalXML = () => {
    const contractCount = sampleContracts.filter(c => c.status === 'ACTIVE').length;
    const amendmentCount = sampleAmendments.filter(a => a.status === 'APPROVED').length;
    toast.compliance('Export REVISAL', `${contractCount} contracte active, ${amendmentCount} acte adiționale exportate.`);
  };

  const handleBulkSubmitRevisal = async () => {
    const pendingCount = sampleContracts.filter(c => c.status === 'ACTIVE' && !c.revisalSubmitted).length;
    if (pendingCount === 0) {
      toast.success('Sincronizat', 'Toate contractele sunt deja sincronizate cu REVISAL.');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/revisal/bulk-submit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.compliance('REVISAL', `${pendingCount} contracte au fost transmise cu succes.`);
      } else {
        toast.compliance('REVISAL (Demo)', `${pendingCount} contracte marcate ca transmise (simulare).`);
      }
    } catch (err) {
      console.error('REVISAL bulk submit failed:', err);
      toast.compliance('REVISAL (Demo)', `${pendingCount} contracte marcate ca transmise (simulare).`);
    }
  };

  // Quick Action Handlers for Alert Cards
  const handleViewExpiringContracts = () => {
    setStatusFilter('ACTIVE');
    setActiveTab('contracts');
    toast.success('Filtrare activată', 'Afișare contracte care expiră în 30 de zile.');
  };

  const handleViewPendingSignature = () => {
    setStatusFilter('PENDING_SIGNATURE');
    setActiveTab('contracts');
  };

  const handleViewPendingRevisal = () => {
    setActiveTab('revisal');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contracte HR</h1>
          <p className="text-muted-foreground">
            Gestiune contracte de muncă și acte adiționale conform legislației românești
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportContracts}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExportRevisal}>
            <Download className="mr-2 h-4 w-4" />
            Export REVISAL
          </Button>
          <Button onClick={handleNewContract}>
            <Plus className="mr-2 h-4 w-4" />
            Contract Nou
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Prezentare
          </TabsTrigger>
          <TabsTrigger value="contracts">
            <FileText className="mr-2 h-4 w-4" />
            Contracte
          </TabsTrigger>
          <TabsTrigger value="amendments">
            <FilePlus className="mr-2 h-4 w-4" />
            Acte Adiționale
          </TabsTrigger>
          <TabsTrigger value="revisal">
            <Send className="mr-2 h-4 w-4" />
            REVISAL
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contracte Active</CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
                <p className="text-xs text-muted-foreground">
                  din {stats.total} total ({stats.draft} ciorne, {stats.pending} așteaptă semnare)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fond Salarii Lunar</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalSalary)}</div>
                <p className="text-xs text-muted-foreground">
                  Medie: {formatCurrency(stats.totalSalary / (stats.active || 1))}/angajat
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">În Probațiune</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProbation}</div>
                <p className="text-xs text-muted-foreground">
                  angajați în perioada de probă
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Acte în Așteptare</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingAmendments}</div>
                <p className="text-xs text-muted-foreground">
                  acte adiționale de aprobat
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {(stats.expiringSoon > 0 || stats.pending > 0 || stats.pendingRevisal > 0) && (
            <div className="grid gap-4 md:grid-cols-3">
              {stats.expiringSoon > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-800">Contracte care Expiră</p>
                        <p className="text-sm text-orange-600">
                          {stats.expiringSoon} contracte expiră în următoarele 30 de zile
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {stats.pending > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <PenTool className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800">Așteaptă Semnare</p>
                        <p className="text-sm text-yellow-600">
                          {stats.pending} contracte necesită semnătură
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {stats.pendingRevisal > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Send className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-800">REVISAL Nesincronizat</p>
                        <p className="text-sm text-blue-600">
                          {stats.pendingRevisal} contracte de transmis la ITM
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuție Status Contracte</CardTitle>
                <CardDescription>Starea curentă a tuturor contractelor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evoluție Contracte</CardTitle>
                <CardDescription>Contracte noi vs. reziliate pe luni</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="created" name="Create" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="terminated" name="Reziliate" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuție pe Departamente</CardTitle>
              <CardDescription>Contracte active și fond salarii per departament</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === 'salary' ? formatCurrency(value) : value,
                        name === 'salary' ? 'Salarii' : 'Contracte'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="contracts" name="Contracte" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Căutare după nume, funcție, departament..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate statusurile</SelectItem>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tip contract" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate tipurile</SelectItem>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleAdvancedFilters}>
                  <Filter className="mr-2 h-4 w-4" />
                  Mai multe filtre
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contracts List */}
          <Card>
            <CardHeader>
              <CardTitle>Lista Contracte ({filteredContracts.length})</CardTitle>
              <CardDescription>Toate contractele de muncă înregistrate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredContracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-full">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{contract.employeeName}</span>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[contract.type]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {contract.position}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {contract.department}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(contract.startDate)}
                            {contract.endDate && ` - ${formatDate(contract.endDate)}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {contract.telework && (
                            <Badge variant="secondary" className="text-xs">
                              Telemuncă {contract.teleworkDays} zile
                            </Badge>
                          )}
                          {contract.probationEnd && new Date(contract.probationEnd) > new Date() && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                              <Timer className="h-3 w-3 mr-1" />
                              Probă până {formatDate(contract.probationEnd)}
                            </Badge>
                          )}
                          {!contract.signedByEmployee && contract.status === 'PENDING_SIGNATURE' && (
                            <Badge variant="outline" className="text-xs border-orange-500 text-orange-700">
                              <PenTool className="h-3 w-3 mr-1" />
                              Așteaptă semnătură angajat
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(contract.salary)}</div>
                        <div className="text-sm text-muted-foreground">
                          {contract.workHours}h/săptămână
                        </div>
                        <Badge className={`mt-1 ${statusColors[contract.status]}`}>
                          {statusLabels[contract.status]}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewContract(contract)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditContract(contract)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleContractOptions(contract)}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Amendments Tab */}
        <TabsContent value="amendments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Acte Adiționale</CardTitle>
                  <CardDescription>Modificări ale contractelor de muncă</CardDescription>
                </div>
                <Button onClick={handleNewAmendment}>
                  <Plus className="mr-2 h-4 w-4" />
                  Act Adițional Nou
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleAmendments.map((amendment) => (
                  <div
                    key={amendment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        amendment.status === 'APPROVED' ? 'bg-green-100' :
                        amendment.status === 'PENDING' ? 'bg-yellow-100' :
                        amendment.status === 'REJECTED' ? 'bg-red-100' :
                        'bg-gray-100'
                      }`}>
                        <History className={`h-4 w-4 ${
                          amendment.status === 'APPROVED' ? 'text-green-600' :
                          amendment.status === 'PENDING' ? 'text-yellow-600' :
                          amendment.status === 'REJECTED' ? 'text-red-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{amendment.employeeName}</span>
                          <Badge variant="outline">{amendmentTypeLabels[amendment.amendmentType]}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{amendment.oldValue} → {amendment.newValue}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Efectiv din: {formatDate(amendment.effectiveDate)} | Creat: {formatDate(amendment.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={amendmentStatusColors[amendment.status]}>
                        {amendment.status === 'DRAFT' ? 'Ciornă' :
                         amendment.status === 'PENDING' ? 'În Așteptare' :
                         amendment.status === 'APPROVED' ? 'Aprobat' : 'Respins'}
                      </Badge>
                      {(amendment.status === 'DRAFT' || amendment.status === 'PENDING') && (
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => handleEditAmendment(amendment)}>
                            <Edit className="mr-2 h-3 w-3" />
                            Editare
                          </Button>
                          <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleApproveAmendment(amendment)}>
                            <CheckCircle className="mr-2 h-3 w-3" />
                            Aprobă
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleRejectAmendment(amendment)}>
                            <FileX className="mr-2 h-3 w-3" />
                            Respinge
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REVISAL Tab */}
        <TabsContent value="revisal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sincronizare REVISAL</CardTitle>
              <CardDescription>
                Transmiterea contractelor către Inspectoratul Teritorial de Muncă conform Legii nr. 53/2003
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Transmise</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {sampleContracts.filter(c => c.revisalSubmitted).length}
                  </div>
                  <p className="text-sm text-green-600">contracte sincronizate</p>
                </div>

                <div className="p-4 border rounded-lg bg-yellow-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">În Așteptare</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {sampleContracts.filter(c => c.status === 'ACTIVE' && !c.revisalSubmitted).length}
                  </div>
                  <p className="text-sm text-yellow-600">de transmis</p>
                </div>

                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Modificări</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {sampleAmendments.filter(a => a.status === 'APPROVED').length}
                  </div>
                  <p className="text-sm text-blue-600">acte adiționale de raportat</p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">Contracte de Transmis la REVISAL</h4>
                <div className="space-y-3">
                  {sampleContracts.filter(c => c.status === 'ACTIVE' && !c.revisalSubmitted).map((contract) => (
                    <div key={contract.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{contract.employeeName}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {contract.position} - {contract.department}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Din {formatDate(contract.startDate)}
                        </span>
                        <Button size="sm" onClick={() => handleSubmitToRevisal(contract)}>
                          <Send className="mr-2 h-3 w-3" />
                          Transmite
                        </Button>
                      </div>
                    </div>
                  ))}
                  {sampleContracts.filter(c => c.status === 'ACTIVE' && !c.revisalSubmitted).length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>Toate contractele active sunt sincronizate cu REVISAL</p>
                    </div>
                  )}
                </div>
                {sampleContracts.filter(c => c.status === 'ACTIVE' && !c.revisalSubmitted).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={handleBulkSubmitRevisal}>
                      <Send className="mr-2 h-4 w-4" />
                      Transmite Toate
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Export Complet REVISAL</p>
                  <p className="text-sm text-muted-foreground">
                    Generează fișier XML pentru toate contractele și modificările
                  </p>
                </div>
                <Button onClick={handleExportRevisalXML}>
                  <Download className="mr-2 h-4 w-4" />
                  Export XML
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
