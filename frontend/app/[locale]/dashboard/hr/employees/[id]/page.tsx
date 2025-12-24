'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  DollarSign,
  FileText,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  FileSignature,
  Award,
} from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  cnp: string | null;
  position: string;
  department: string | null;
  hireDate: string;
  salary: number;
  contractType: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  address: string | null;
  bankAccount: string | null;
  emergencyContact: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Contract {
  id: string;
  contractNumber: string;
  type: string;
  startDate: string;
  endDate: string | null;
  status: string;
}

interface PayrollEntry {
  id: string;
  period: string;
  grossSalary: number;
  netSalary: number;
  status: string;
}

export default function EmployeeDetailPage() {
  const t = useTranslations('hr');
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployee();
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [empRes, contractsRes, payrollRes] = await Promise.all([
        fetch(`/api/v1/hr/employees/${employeeId}`, { headers }),
        fetch(`/api/v1/hr/employees/${employeeId}/contracts`, { headers }),
        fetch(`/api/v1/hr/employees/${employeeId}/payroll`, { headers }),
      ]);

      if (!empRes.ok) throw new Error('Failed to fetch employee');

      setEmployee(await empRes.json());
      if (contractsRes.ok) setContracts(await contractsRes.json());
      if (payrollRes.ok) setPayrollHistory(await payrollRes.json());
    } catch (err) {
      setError('Eroare la incarcarea datelor angajatului');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Activ' };
      case 'ON_LEAVE':
        return { color: 'bg-purple-100 text-purple-800', icon: Clock, label: 'Concediu' };
      case 'TERMINATED':
        return { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Inactiv' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: User, label: status };
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500">{error || 'Angajatul nu a fost gasit'}</p>
        <Link href="/dashboard/hr" className="text-primary-600 hover:underline mt-4 inline-block">
          Inapoi la HR
        </Link>
      </div>
    );
  }

  const statusConfig = getStatusConfig(employee.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/hr"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {employee.lastName} {employee.firstName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-500">{employee.position}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${statusConfig.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/dashboard/hr/employees/${employee.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            <Edit className="w-4 h-4" />
            Editeaza
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
            <FileText className="w-4 h-4" />
            Genereaza Adeverinta
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Informatii Personale</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{employee.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Telefon</p>
                  <p className="font-medium">{employee.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">CNP</p>
                  <p className="font-medium">{employee.cnp || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Adresa</p>
                  <p className="font-medium">{employee.address || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Employment Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Informatii Angajare</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Pozitie</p>
                  <p className="font-medium">{employee.position}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Departament</p>
                  <p className="font-medium">{employee.department || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Data angajarii</p>
                  <p className="font-medium">{formatDate(employee.hireDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileSignature className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Tip contract</p>
                  <p className="font-medium">{employee.contractType}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contracts */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Contracte</h3>
              <button className="text-sm text-primary-600 hover:text-primary-700">
                Adauga contract
              </button>
            </div>
            {contracts.length > 0 ? (
              <div className="space-y-3">
                {contracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{contract.contractNumber}</p>
                      <p className="text-sm text-gray-500">
                        {contract.type} - {formatDate(contract.startDate)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {contract.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">Fara contracte</p>
            )}
          </div>

          {/* Payroll History */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Istoric Salarizare</h3>
              <button className="text-sm text-primary-600 hover:text-primary-700">
                Vezi tot
              </button>
            </div>
            {payrollHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-sm font-medium text-gray-500">Perioada</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-500">Brut</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-500">Net</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollHistory.map((entry) => (
                      <tr key={entry.id} className="border-b">
                        <td className="py-3">{entry.period}</td>
                        <td className="py-3 text-right">{formatAmount(entry.grossSalary)}</td>
                        <td className="py-3 text-right text-green-600 font-medium">{formatAmount(entry.netSalary)}</td>
                        <td className="py-3 text-right">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            entry.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">Fara inregistrari salariale</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Salary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Salariu
            </h3>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600">{formatAmount(employee.salary)}</p>
              <p className="text-sm text-gray-500">Brut lunar</p>
            </div>
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">CAS (25%)</span>
                <span className="text-red-600">{formatAmount(employee.salary * 0.25)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">CASS (10%)</span>
                <span className="text-red-600">{formatAmount(employee.salary * 0.10)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Impozit (~10%)</span>
                <span className="text-red-600">{formatAmount(employee.salary * 0.10 * 0.65)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Net estimat</span>
                <span className="text-green-600">{formatAmount(employee.salary * 0.55)}</span>
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Date Bancare</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">IBAN</p>
              <p className="font-medium text-sm break-all">{employee.bankAccount || 'Necompletat'}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 mb-3">Actiuni rapide</h4>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Adeverinta de venit
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white text-sm flex items-center gap-2">
                <Award className="w-4 h-4" />
                Evaluare performanta
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Cerere concediu
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white text-sm flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export date
              </button>
            </div>
          </div>

          {/* Timestamps */}
          <div className="text-xs text-gray-400">
            <p>Creat: {formatDate(employee.createdAt)}</p>
            <p>Actualizat: {formatDate(employee.updatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
