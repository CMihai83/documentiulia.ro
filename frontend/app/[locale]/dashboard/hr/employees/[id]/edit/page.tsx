'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertTriangle,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  DollarSign,
  FileSignature,
  CreditCard,
  Trash2,
} from 'lucide-react';

interface EmployeeForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cnp: string;
  position: string;
  department: string;
  hireDate: string;
  salary: number;
  contractType: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  address: string;
  bankAccount: string;
  emergencyContact: string;
}

export default function EditEmployeePage() {
  const t = useTranslations('hr');
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const employeeId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<EmployeeForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cnp: '',
    position: '',
    department: '',
    hireDate: '',
    salary: 0,
    contractType: 'FULL_TIME',
    status: 'ACTIVE',
    address: '',
    bankAccount: '',
    emergencyContact: '',
  });

  useEffect(() => {
    fetchEmployee();
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/hr/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch employee');

      const data = await response.json();
      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        cnp: data.cnp || '',
        position: data.position || '',
        department: data.department || '',
        hireDate: data.hireDate ? data.hireDate.split('T')[0] : '',
        salary: data.salary || 0,
        contractType: data.contractType || 'FULL_TIME',
        status: data.status || 'ACTIVE',
        address: data.address || '',
        bankAccount: data.bankAccount || '',
        emergencyContact: data.emergencyContact || '',
      });
    } catch (err) {
      setError('Eroare la incarcarea datelor angajatului');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/hr/employees/${employeeId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update employee');
      }

      router.push(`/dashboard/hr/employees/${employeeId}`);
    } catch (err: any) {
      setError(err.message || 'Eroare la actualizarea angajatului');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    // Navigate to delete confirmation page
    router.push(`/dashboard/hr/employees/${employeeId}/delete`);
  };

  const handleDeleteConfirmed = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/hr/employees/${employeeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Angajat șters', 'Angajatul a fost șters cu succes.');
        router.push('/dashboard/hr');
      } else {
        toast.error('Eroare', 'Eroare la ștergerea angajatului');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    } finally {
      setDeleting(false);
    }
  };

  const validateCNP = (cnp: string) => {
    if (!cnp) return true;
    return /^[1-9]\d{12}$/.test(cnp);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/hr/employees/${employeeId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editeaza Angajat</h1>
            <p className="text-gray-600">{form.lastName} {form.firstName}</p>
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Sterge
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Status Angajat</h3>
          <div className="flex gap-4">
            {['ACTIVE', 'ON_LEAVE', 'TERMINATED'].map((status) => (
              <label key={status} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value={status}
                  checked={form.status === status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className={`px-2 py-1 text-sm rounded ${
                  status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  status === 'ON_LEAVE' ? 'bg-purple-100 text-purple-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {status === 'ACTIVE' ? 'Activ' :
                   status === 'ON_LEAVE' ? 'Concediu' : 'Inactiv'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Informatii Personale
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prenume *
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nume *
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Telefon
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CNP
              </label>
              <input
                type="text"
                value={form.cnp}
                onChange={(e) => setForm({ ...form, cnp: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                maxLength={13}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  form.cnp && !validateCNP(form.cnp) ? 'border-red-500' : ''
                }`}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Adresa
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Employment Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Informatii Angajare
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pozitie *
              </label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="w-4 h-4 inline mr-1" />
                Departament
              </label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Data angajarii
              </label>
              <input
                type="date"
                value={form.hireDate}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileSignature className="w-4 h-4 inline mr-1" />
                Tip Contract
              </label>
              <select
                value={form.contractType}
                onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="FULL_TIME">Norma intreaga</option>
                <option value="PART_TIME">Timp partial</option>
                <option value="FIXED_TERM">Perioada determinata</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salary & Banking */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Salariu si Date Bancare
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salariu Brut Lunar (RON)
              </label>
              <input
                type="number"
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: parseFloat(e.target.value) || 0 })}
                min={0}
                step={100}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CreditCard className="w-4 h-4 inline mr-1" />
                IBAN
              </label>
              <input
                type="text"
                value={form.bankAccount}
                onChange={(e) => setForm({ ...form, bankAccount: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Contact de Urgenta</h3>
          <input
            type="text"
            value={form.emergencyContact}
            onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
            placeholder="Nume si telefon"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href={`/dashboard/hr/employees/${employeeId}`}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Anuleaza
          </Link>
          <button
            type="submit"
            disabled={saving || (form.cnp !== '' && !validateCNP(form.cnp))}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salveaza modificarile
          </button>
        </div>
      </form>
    </div>
  );
}
