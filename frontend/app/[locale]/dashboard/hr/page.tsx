'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import {
  Users, DollarSign, UserPlus, FileText, Download, Calculator,
  Loader2, RefreshCw, Edit, Trash2, Eye, AlertCircle, FileSignature,
  ClipboardList, Calendar, CheckCircle, Clock, XCircle, Plus,
  Briefcase, Building2, Award, GraduationCap, Shield, Heart,
  Send, Filter, Search
} from 'lucide-react';
import { SkeletonHRPage } from '@/components/ui/Skeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  cnp: string | null;
  position: string;
  department: string | null;
  hireDate: string;
  salary: number;
  contractType: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
}

interface Payroll {
  id: string;
  employeeId: string;
  employee?: Employee;
  period: string;
  grossSalary: number;
  netSalary: number;
  taxes: number;
  contributions: number;
  status: 'PENDING' | 'APPROVED' | 'PAID';
  paidAt: string | null;
}

interface HRContract {
  id: string;
  contractNumber: string;
  employeeId: string;
  employeeName?: string;
  type: 'FULL_TIME' | 'PART_TIME' | 'FIXED_TERM' | 'INDEFINITE';
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  startDate: string;
  endDate?: string;
  salary: number;
  position: string;
  createdAt: string;
}

interface HRForm {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface FormSubmission {
  id: string;
  formId: string;
  formName: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  submittedAt?: string;
  createdAt: string;
}

interface HRSummary {
  totalEmployees: number;
  activeEmployees: number;
  totalPayroll: number;
  currentPeriod: string;
}

interface ContractStats {
  total: number;
  active: number;
  pending: number;
  expiringSoon: number;
}

type TabType = 'employees' | 'payroll' | 'contracts' | 'forms';

export default function HRPage() {
  const t = useTranslations('hr');
  const router = useRouter();
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [contracts, setContracts] = useState<HRContract[]>([]);
  const [forms, setForms] = useState<HRForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [summary, setSummary] = useState<HRSummary | null>(null);
  const [contractStats, setContractStats] = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('employees');
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [calculating, setCalculating] = useState(false);
  const [formCategory, setFormCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Action handlers
  const handleViewEmployee = (empId: string) => {
    router.push(`/dashboard/hr/employees/${empId}`);
  };

  const handleEditEmployee = (empId: string) => {
    router.push(`/dashboard/hr/employees/${empId}/edit`);
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    // Navigate to delete confirmation page
    router.push(`/dashboard/hr/employees/${emp.id}/delete`);
  };

  const handleDeleteEmployeeConfirmed = async (emp: Employee) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr/employees/${emp.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setEmployees(employees.filter(e => e.id !== emp.id));
        toast.success('Angajat șters', `${emp.lastName} ${emp.firstName} a fost șters cu succes.`);
      } else {
        toast.error('Eroare', 'Nu s-a putut șterge angajatul.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    }
  };

  const handleViewContract = (contractId: string) => {
    router.push(`/dashboard/hr/contracts/${contractId}`);
  };

  const handleEditContract = (contractId: string) => {
    router.push(`/dashboard/hr/contracts/${contractId}/edit`);
  };

  const handleSubmitToREVISAL = async (contract: HRContract) => {
    // Navigate to REVISAL submission confirmation page
    router.push(`/dashboard/hr/contracts/${contract.id}/revisal`);
  };

  const handleSubmitToREVISALConfirmed = async (contract: HRContract) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr-contracts/${contract.id}/revisal`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.compliance('REVISAL', `Contractul ${contract.contractNumber} a fost trimis către REVISAL!`);
        fetchData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare REVISAL', errorData.message || 'Nu s-a putut trimite contractul către REVISAL.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    }
  };

  const handleDownloadContract = async (contract: HRContract) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr-contracts/${contract.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract_${contract.contractNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Descărcare completă', `Contractul ${contract.contractNumber} a fost descărcat.`);
      } else {
        toast.error('Eroare', 'Nu s-a putut descărca contractul.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    }
  };

  const handleDownloadPayslip = async (pay: Payroll) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr/payroll/${pay.id}/payslip`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fluturas_${pay.period}_${pay.employeeId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Descărcare completă', `Fluturaș descărcat pentru ${pay.period}.`);
      } else {
        toast.error('Eroare', 'Nu s-a putut descărca fluturașul.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    }
  };

  const handleViewFormSubmission = (subId: string) => {
    router.push(`/dashboard/hr/forms/submissions/${subId}`);
  };

  const handleEditFormSubmission = (subId: string) => {
    router.push(`/dashboard/hr/forms/submissions/${subId}/edit`);
  };

  const handleCompleteForm = (formId: string) => {
    router.push(`/dashboard/hr/forms/${formId}/new`);
  };

  const handleExportReport = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr/export/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hr_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Export finalizat', 'Raportul HR a fost descărcat.');
      } else {
        toast.error('Eroare', 'Nu s-a putut exporta raportul.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    }
  };

  // Attendance handlers
  const handleViewAttendance = (empId: string) => {
    router.push(`/dashboard/hr/attendance/${empId}`);
  };

  const handleMarkAttendance = async (emp: Employee, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'REMOTE') => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr/attendance`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: emp.id,
          date: new Date().toISOString().split('T')[0],
          status,
        }),
      });

      if (response.ok) {
        toast.success('Prezență înregistrată', `${emp.lastName} ${emp.firstName}: ${status}`);
      } else {
        toast.error('Eroare', 'Nu s-a putut înregistra prezența.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    }
  };

  const handleBulkAttendance = () => {
    // Navigate to bulk attendance page with date selection form
    router.push('/dashboard/hr/attendance/bulk');
  };

  // Performance review handlers
  const handleStartReview = (emp: Employee) => {
    router.push(`/dashboard/hr/performance/new?employee=${emp.id}`);
  };

  const handleViewPerformance = (empId: string) => {
    router.push(`/dashboard/hr/performance/${empId}`);
  };

  const handlePerformanceReport = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr/performance/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance_report_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Raport generat', 'Raportul de performanță a fost descărcat.');
      } else {
        toast.error('Eroare', 'Nu s-a putut genera raportul de performanță.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    }
  };

  // Bulk operations handlers
  const handleBulkPayrollApproval = async () => {
    const pendingPayrolls = payrolls.filter(p => p.status === 'PENDING');
    if (pendingPayrolls.length === 0) {
      toast.error('Nicio acțiune', 'Nu există state de plată în așteptare pentru aprobare.');
      return;
    }

    // Navigate to bulk approval confirmation page
    router.push(`/dashboard/hr/payroll/bulk-approve?period=${selectedPeriod}&count=${pendingPayrolls.length}`);
  };

  const handleBulkPayrollApprovalConfirmed = async () => {
    const pendingCount = payrolls.filter(p => p.status === 'PENDING').length;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr/payroll/bulk-approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period: selectedPeriod }),
      });

      if (response.ok) {
        toast.success('Aprobare completă', `${pendingCount} state de plată au fost aprobate.`);
        fetchData();
      } else {
        toast.error('Eroare', 'Nu s-au putut aproba statele de plată.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    }
  };

  const handleBulkContractRenewal = () => {
    const expiringContracts = contracts.filter(c => c.status === 'ACTIVE' && c.endDate);
    if (expiringContracts.length === 0) {
      toast.error('Nicio acțiune', 'Nu există contracte care necesită reînnoire.');
      return;
    }

    toast.success('Contracte pentru reînnoire', `${expiringContracts.length} contracte identificate.`);
    router.push('/dashboard/hr/contracts/bulk-renewal');
  };

  const handleImportEmployees = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/hr/employees/import`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          toast.success('Import finalizat', `Angajați importați: ${result.imported}, Erori: ${result.errors}`);
          fetchData();
        } else {
          toast.error('Eroare', 'Nu s-a putut importa angajații.');
        }
      } catch (err) {
        toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
      }
    };
    input.click();
  };

  const handleExportEmployees = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr/employees/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Export finalizat', 'Lista angajaților a fost descărcată.');
      } else {
        toast.error('Eroare', 'Nu s-a putut exporta angajații.');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    }
  };

  // Training and development handlers
  const handleAssignTraining = (emp: Employee) => {
    router.push(`/dashboard/lms/assign?employee=${emp.id}`);
  };

  const handleViewTrainingProgress = (empId: string) => {
    router.push(`/dashboard/lms/progress/${empId}`);
  };

  // Leave management handlers
  const handleRequestLeave = (emp: Employee) => {
    router.push(`/dashboard/hr/forms/LEAVE/new?employee=${emp.id}`);
  };

  const handleViewLeaveBalance = (empId: string) => {
    router.push(`/dashboard/hr/leave/${empId}`);
  };

  const handleApproveLeaves = () => {
    router.push('/dashboard/hr/leave/pending');
  };

  // Quick stats click handlers
  const handleTotalEmployeesClick = () => {
    setActiveTab('employees');
  };

  const handleActiveEmployeesClick = () => {
    setActiveTab('employees');
    setSearchQuery('status:ACTIVE');
  };

  const handleTotalPayrollClick = () => {
    setActiveTab('payroll');
  };

  const handleContractStatsClick = (type: string) => {
    setActiveTab('contracts');
    if (type === 'expiring') {
      toast.success('Filtrare activată', 'Afișare contracte care expiră în 30 de zile.');
    }
  };

  function getCurrentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function getPeriodOptions() {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });
      options.push({ value: period, label });
    }
    return options;
  }

  const formCategories = [
    { value: 'all', label: 'Toate', icon: ClipboardList },
    { value: 'LEAVE', label: 'Concedii', icon: Calendar },
    { value: 'PERFORMANCE', label: 'Performanță', icon: Award },
    { value: 'ONBOARDING', label: 'Onboarding', icon: UserPlus },
    { value: 'OFFBOARDING', label: 'Offboarding', icon: Briefcase },
    { value: 'TRAINING', label: 'Training', icon: GraduationCap },
    { value: 'EXPENSE', label: 'Cheltuieli', icon: DollarSign },
    { value: 'COMPLIANCE', label: 'Conformitate', icon: Shield },
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedPeriod, formCategory]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      if (activeTab === 'employees') {
        const [empRes, sumRes] = await Promise.all([
          fetch(`${API_URL}/hr/employees`, { headers }),
          fetch(`${API_URL}/hr/summary`, { headers }),
        ]);
        if (empRes.ok) {
          setEmployees(await empRes.json());
        } else if (empRes.status === 401) {
          setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
          return;
        }
        if (sumRes.ok) setSummary(await sumRes.json());
      } else if (activeTab === 'payroll') {
        const response = await fetch(`${API_URL}/hr/payroll?period=${selectedPeriod}`, { headers });
        if (response.ok) {
          setPayrolls(await response.json());
        } else if (response.status === 401) {
          setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
          return;
        } else {
          setError('Eroare la încărcarea datelor salariale');
        }
      } else if (activeTab === 'contracts') {
        const [contractsRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/hr-contracts`, { headers }),
          fetch(`${API_URL}/hr-contracts/statistics`, { headers }),
        ]);
        if (contractsRes.ok) {
          const data = await contractsRes.json();
          setContracts(data.contracts || data || []);
        }
        if (statsRes.ok) {
          setContractStats(await statsRes.json());
        }
      } else if (activeTab === 'forms') {
        const categoryParam = formCategory !== 'all' ? `?category=${formCategory}` : '';
        const [formsRes, subsRes] = await Promise.all([
          fetch(`${API_URL}/hr-forms/templates${categoryParam}`, { headers }),
          fetch(`${API_URL}/hr-forms/submissions`, { headers }),
        ]);
        if (formsRes.ok) {
          setForms(await formsRes.json());
        }
        if (subsRes.ok) {
          setSubmissions(await subsRes.json());
        }
      }
    } catch (err) {
      console.error('Failed to fetch HR data:', err);
      setError('Eroare de conexiune cu serverul');
    } finally {
      setLoading(false);
    }
  };

  const calculatePayroll = async () => {
    try {
      setCalculating(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr/payroll/calculate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period: selectedPeriod }),
      });
      if (response.ok) {
        toast.success('Calcul finalizat', `Salariile pentru ${selectedPeriod} au fost calculate.`);
        await fetchData();
      } else if (response.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
      } else {
        toast.error('Eroare', 'Nu s-au putut calcula salariile.');
      }
    } catch (err) {
      console.error('Failed to calculate payroll:', err);
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    } finally {
      setCalculating(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'PAID':
      case 'APPROVED':
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
      case 'PENDING_SIGNATURE':
        return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'ON_LEAVE':
      case 'SUSPENDED':
        return 'bg-purple-100 text-purple-800';
      case 'TERMINATED':
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'ACTIVE': 'Activ',
      'PAID': 'Plătit',
      'APPROVED': 'Aprobat',
      'COMPLETED': 'Completat',
      'PENDING': 'În așteptare',
      'PENDING_SIGNATURE': 'Semnătură',
      'DRAFT': 'Ciornă',
      'ON_LEAVE': 'Concediu',
      'SUSPENDED': 'Suspendat',
      'TERMINATED': 'Reziliat',
      'REJECTED': 'Respins',
      'CANCELLED': 'Anulat',
    };
    return labels[status] || status;
  };

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'FULL_TIME': 'Normă întreagă',
      'PART_TIME': 'Timp parțial',
      'FIXED_TERM': 'Perioadă determinată',
      'INDEFINITE': 'Perioadă nedeterminată',
    };
    return labels[type] || type;
  };

  // Error state
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
          onClick={() => { setError(null); setLoading(true); fetchData(); }}
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
          <h1 className="text-2xl font-bold text-gray-900">{t('title') || 'Resurse Umane'}</h1>
          <p className="text-gray-500 mt-1">
            {t('subtitle') || 'Gestionare angajați, contracte, salarizare și formulare HR'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          {activeTab === 'employees' && (
            <Link
              href="/dashboard/hr/employees/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              {t('addEmployee') || 'Adaugă Angajat'}
            </Link>
          )}
          {activeTab === 'contracts' && (
            <Link
              href="/dashboard/hr/contracts/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
            >
              <FileSignature className="h-5 w-5 mr-2" />
              Contract Nou
            </Link>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {activeTab === 'employees' && summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('totalEmployees') || 'Total Angajați'}</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">{t('activeEmployees') || 'Angajați Activi'}</p>
                <p className="text-2xl font-bold text-green-900">{summary.activeEmployees}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">{t('totalPayroll') || 'Total Salarii'}</p>
                <p className="text-xl font-bold text-blue-900">{formatAmount(summary.totalPayroll)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600">{t('currentPeriod') || 'Perioada Curentă'}</p>
                <p className="text-xl font-bold text-amber-900">{summary.currentPeriod}</p>
              </div>
              <Calendar className="h-8 w-8 text-amber-400" />
            </div>
          </div>
        </div>
      )}

      {/* Contract Stats */}
      {activeTab === 'contracts' && contractStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Contracte</p>
                <p className="text-2xl font-bold text-gray-900">{contractStats.total}</p>
              </div>
              <FileSignature className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Active</p>
                <p className="text-2xl font-bold text-green-900">{contractStats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">În Așteptare</p>
                <p className="text-2xl font-bold text-yellow-900">{contractStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Expiră Curând</p>
                <p className="text-2xl font-bold text-red-900">{contractStats.expiringSoon}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>
      )}

      {/* Tax Info Banner */}
      {activeTab === 'payroll' && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <Calculator className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                {t('taxInfo') || 'Taxe și Contribuții 2025'}
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>CAS</strong> - {t('cas') || '25% contribuție asigurări sociale'}</li>
                  <li><strong>CASS</strong> - {t('cass') || '10% contribuție asigurări sănătate'}</li>
                  <li><strong>Impozit</strong> - {t('tax') || '10% impozit pe venit'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('employees')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="h-5 w-5 inline mr-2" />
            {t('employees') || 'Angajați'}
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'payroll'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DollarSign className="h-5 w-5 inline mr-2" />
            {t('payroll') || 'Salarizare'}
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'contracts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileSignature className="h-5 w-5 inline mr-2" />
            Contracte
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'forms'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClipboardList className="h-5 w-5 inline mr-2" />
            Formulare
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {/* Payroll Controls */}
        {activeTab === 'payroll' && (
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">{t('period') || 'Perioada'}:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getPeriodOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={calculatePayroll}
                disabled={calculating}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {calculating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t('calculating') || 'Se calculează...'}
                  </>
                ) : (
                  <>
                    <Calculator className="h-5 w-5 mr-2" />
                    {t('calculatePayroll') || 'Calculează Salarii'}
                  </>
                )}
              </button>
              <Link
                href="/dashboard/finance/d112"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
              >
                <Send className="h-5 w-5 mr-2" />
                Generează D112
              </Link>
            </div>
          </div>
        )}

        {/* Forms Filter */}
        {activeTab === 'forms' && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2 mb-4">
              {formCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setFormCategory(cat.value)}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                      formCategory === cat.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută formulare..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <SkeletonHRPage />
        ) : activeTab === 'employees' ? (
          /* Employees Tab */
          employees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{t('noEmployees') || 'Nu există angajați'}</p>
              <Link href="/dashboard/hr/employees/new" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                <UserPlus className="h-5 w-5 inline mr-2" />
                Adaugă primul angajat
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('name') || 'Nume'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('position') || 'Poziție'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('department') || 'Departament'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('salary') || 'Salariu'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status') || 'Status'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('actions') || 'Acțiuni'}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{emp.lastName} {emp.firstName}</div>
                        <div className="text-sm text-gray-500">{emp.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.position}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.department || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatAmount(emp.salary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(emp.status)}`}>
                          {getStatusLabel(emp.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button onClick={() => handleViewEmployee(emp.id)} className="text-blue-600 hover:text-blue-900" title="Vizualizare"><Eye className="h-5 w-5" /></button>
                          <button onClick={() => handleEditEmployee(emp.id)} className="text-green-600 hover:text-green-900" title="Editare"><Edit className="h-5 w-5" /></button>
                          <button onClick={() => handleDeleteEmployee(emp)} className="text-red-600 hover:text-red-900" title="Șterge"><Trash2 className="h-5 w-5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'payroll' ? (
          /* Payroll Tab */
          payrolls.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{t('noPayrolls') || 'Nu există calcule salariale pentru această perioadă'}</p>
              <button
                onClick={calculatePayroll}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <Calculator className="h-5 w-5 inline mr-2" />
                Calculează acum
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('employee') || 'Angajat'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('gross') || 'Brut'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('taxes') || 'Taxe'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('contributions') || 'Contribuții'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('net') || 'Net'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status') || 'Status'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('actions') || 'Acțiuni'}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrolls.map((pay) => (
                    <tr key={pay.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {pay.employee ? `${pay.employee.lastName} ${pay.employee.firstName}` : pay.employeeId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatAmount(pay.grossSalary)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{formatAmount(pay.taxes)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">{formatAmount(pay.contributions)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatAmount(pay.netSalary)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(pay.status)}`}>
                          {getStatusLabel(pay.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button onClick={() => handleDownloadPayslip(pay)} className="text-blue-600 hover:text-blue-900" title="Descarcă fluturașul">
                          <Download className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'contracts' ? (
          /* Contracts Tab */
          contracts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileSignature className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nu există contracte înregistrate</p>
              <Link href="/dashboard/hr/contracts/new" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                <Plus className="h-5 w-5 inline mr-2" />
                Creează primul contract
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nr. Contract</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Angajat</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poziție</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Început</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salariu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {contract.contractNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contract.employeeName || contract.employeeId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getContractTypeLabel(contract.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contract.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(contract.startDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatAmount(contract.salary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>
                          {getStatusLabel(contract.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button onClick={() => handleViewContract(contract.id)} className="text-blue-600 hover:text-blue-900" title="Vizualizare">
                            <Eye className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleEditContract(contract.id)} className="text-green-600 hover:text-green-900" title="Editare">
                            <Edit className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleSubmitToREVISAL(contract)} className="text-purple-600 hover:text-purple-900" title="Trimite REVISAL">
                            <Send className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleDownloadContract(contract)} className="text-gray-600 hover:text-gray-900" title="Descarcă">
                            <Download className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Forms Tab */
          <div className="p-6">
            {/* My Submissions */}
            {submissions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Formularele Mele</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {submissions.slice(0, 6).map((sub) => (
                    <div key={sub.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{sub.formName}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(sub.createdAt)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(sub.status)}`}>
                          {getStatusLabel(sub.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleViewFormSubmission(sub.id)} className="text-sm text-blue-600 hover:text-blue-800">
                          Vizualizare
                        </button>
                        {sub.status === 'DRAFT' && (
                          <button onClick={() => handleEditFormSubmission(sub.id)} className="text-sm text-green-600 hover:text-green-800">
                            Editare
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Forms */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Formulare Disponibile</h3>
            {forms.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nu există formulare în această categorie</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {forms
                  .filter(form =>
                    searchQuery === '' ||
                    form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    form.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((form) => {
                    const CategoryIcon = formCategories.find(c => c.value === form.category)?.icon || ClipboardList;
                    return (
                      <div
                        key={form.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <CategoryIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{form.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">{form.nameEn}</p>
                            <p className="text-xs text-gray-400 mt-2 line-clamp-2">{form.description}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            form.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {form.status === 'ACTIVE' ? 'Activ' : 'Inactiv'}
                          </span>
                          <button onClick={() => handleCompleteForm(form.id)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            Completează →
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      {activeTab === 'contracts' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-4">Acțiuni Rapide</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/templates?type=cim" className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <FileSignature className="h-5 w-5 text-blue-600" />
              <span className="text-sm">Șablon CIM</span>
            </Link>
            <Link href="/dashboard/compliance/revisal" className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Send className="h-5 w-5 text-purple-600" />
              <span className="text-sm">Raportare REVISAL</span>
            </Link>
            <Link href="/dashboard/finance/d112" className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <FileText className="h-5 w-5 text-green-600" />
              <span className="text-sm">Generează D112</span>
            </Link>
            <button onClick={handleExportReport} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Download className="h-5 w-5 text-amber-600" />
              <span className="text-sm">Export Raport</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
