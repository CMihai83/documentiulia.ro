'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft, Save, FileSignature, User, Calendar, DollarSign,
  Loader2, AlertCircle, Briefcase, Clock
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
}

interface ContractForm {
  employeeId: string;
  type: 'FULL_TIME' | 'PART_TIME' | 'FIXED_TERM' | 'INDEFINITE';
  position: string;
  department: string;
  salary: number;
  currency: string;
  startDate: string;
  endDate: string;
  workHours: number;
  probationPeriod: number;
  notes: string;
}

export default function NewContractPage() {
  const t = useTranslations('hr');
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEmployeeId = searchParams.get('employeeId') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [form, setForm] = useState<ContractForm>({
    employeeId: preselectedEmployeeId,
    type: 'INDEFINITE',
    position: '',
    department: '',
    salary: 0,
    currency: 'RON',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    workHours: 8,
    probationPeriod: 90,
    notes: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setForm(prev => ({
      ...prev,
      employeeId,
      position: employee?.position || prev.position,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr-contracts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          endDate: form.endDate || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/hr/contracts/${data.id}`);
      } else if (response.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Eroare la crearea contractului');
      }
    } catch (err) {
      console.error('Failed to create contract:', err);
      setError('Eroare de conexiune cu serverul');
    } finally {
      setLoading(false);
    }
  };

  const contractTypes = [
    { value: 'INDEFINITE', label: 'Perioadă Nedeterminată' },
    { value: 'FIXED_TERM', label: 'Perioadă Determinată' },
    { value: 'FULL_TIME', label: 'Normă Întreagă' },
    { value: 'PART_TIME', label: 'Timp Parțial' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/hr?tab=contracts" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Contract Nou
          </h1>
          <p className="text-gray-500 mt-1">
            Creați un nou contract individual de muncă (CIM)
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Employee */}
        <div>
          <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
            <User className="h-4 w-4 inline mr-2" />
            Angajat *
          </label>
          {loadingEmployees ? (
            <div className="flex items-center gap-2 text-gray-500 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Se încarcă angajații...
            </div>
          ) : (
            <select
              id="employeeId"
              name="employeeId"
              required
              value={form.employeeId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selectați angajatul</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.lastName} {emp.firstName} - {emp.position}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Contract Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            <FileSignature className="h-4 w-4 inline mr-2" />
            Tip Contract *
          </label>
          <select
            id="type"
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {contractTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Position & Department */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="h-4 w-4 inline mr-2" />
              Poziție *
            </label>
            <input
              type="text"
              id="position"
              name="position"
              required
              value={form.position}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Programator"
            />
          </div>
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              Departament
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={form.department}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: IT"
            />
          </div>
        </div>

        {/* Salary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="h-4 w-4 inline mr-2" />
              Salariu Brut *
            </label>
            <input
              type="number"
              id="salary"
              name="salary"
              required
              min="0"
              step="1"
              value={form.salary}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Monedă
            </label>
            <select
              id="currency"
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-2" />
              Data Început *
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              required
              value={form.startDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              Data Sfârșit
              <span className="text-gray-400 text-xs ml-1">(doar perioadă determinată)</span>
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              disabled={form.type === 'INDEFINITE'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* Work Hours & Probation */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="workHours" className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="h-4 w-4 inline mr-2" />
              Ore Lucru / Zi
            </label>
            <input
              type="number"
              id="workHours"
              name="workHours"
              min="1"
              max="12"
              value={form.workHours}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="probationPeriod" className="block text-sm font-medium text-gray-700 mb-1">
              Perioadă Probă (zile)
            </label>
            <input
              type="number"
              id="probationPeriod"
              name="probationPeriod"
              min="0"
              max="180"
              value={form.probationPeriod}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Note / Clauze Speciale
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Clauze sau note adiționale..."
          />
        </div>

        {/* REVISAL Info */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <p className="text-sm text-blue-700">
            <strong>Notă REVISAL:</strong> După creare, contractul poate fi trimis către REVISAL pentru înregistrare oficială.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link href="/dashboard/hr?tab=contracts" className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Anulează
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Se creează...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Creează Contract
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
