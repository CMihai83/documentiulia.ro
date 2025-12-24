'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft, Save, FileSignature, Calendar, DollarSign,
  Loader2, AlertCircle, Briefcase, Clock
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface ContractForm {
  type: 'FULL_TIME' | 'PART_TIME' | 'FIXED_TERM' | 'INDEFINITE';
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
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

export default function EditContractPage() {
  const t = useTranslations('hr');
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const contractId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractNumber, setContractNumber] = useState('');

  const [form, setForm] = useState<ContractForm>({
    type: 'INDEFINITE',
    status: 'DRAFT',
    position: '',
    department: '',
    salary: 0,
    currency: 'RON',
    startDate: '',
    endDate: '',
    workHours: 8,
    probationPeriod: 90,
    notes: '',
  });

  useEffect(() => {
    fetchContract();
  }, [contractId]);

  const fetchContract = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr-contracts/${contractId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContractNumber(data.contractNumber);
        setForm({
          type: data.type || 'INDEFINITE',
          status: data.status || 'DRAFT',
          position: data.position || '',
          department: data.department || '',
          salary: data.salary || 0,
          currency: data.currency || 'RON',
          startDate: data.startDate ? data.startDate.split('T')[0] : '',
          endDate: data.endDate ? data.endDate.split('T')[0] : '',
          workHours: data.workHours || 8,
          probationPeriod: data.probationPeriod || 90,
          notes: data.notes || '',
        });
      } else if (response.status === 404) {
        setError('Contractul nu a fost găsit');
      } else if (response.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
      }
    } catch (err) {
      console.error('Failed to fetch contract:', err);
      setError('Eroare de conexiune cu serverul');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hr-contracts/${contractId}`, {
        method: 'PUT',
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
        toast.success('Contract actualizat', 'Modificările au fost salvate cu succes.');
        router.push(`/dashboard/hr/contracts/${contractId}`);
      } else if (response.status === 401) {
        toast.error('Sesiune expirată', 'Vă rugăm să vă autentificați din nou.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare', errorData.message || 'Eroare la actualizarea contractului');
      }
    } catch (err) {
      console.error('Failed to update contract:', err);
      toast.error('Eroare conexiune', 'Verificați conexiunea la server.');
    } finally {
      setSaving(false);
    }
  };

  const contractTypes = [
    { value: 'INDEFINITE', label: 'Perioadă Nedeterminată' },
    { value: 'FIXED_TERM', label: 'Perioadă Determinată' },
    { value: 'FULL_TIME', label: 'Normă Întreagă' },
    { value: 'PART_TIME', label: 'Timp Parțial' },
  ];

  const contractStatuses = [
    { value: 'DRAFT', label: 'Ciornă' },
    { value: 'PENDING_SIGNATURE', label: 'Semnătură' },
    { value: 'ACTIVE', label: 'Activ' },
    { value: 'SUSPENDED', label: 'Suspendat' },
    { value: 'TERMINATED', label: 'Reziliat' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/hr/contracts/${contractId}`} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Editare Contract
          </h1>
          <p className="text-gray-500 mt-1">{contractNumber}</p>
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
        {/* Type & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              <FileSignature className="h-4 w-4 inline mr-2" />
              Tip Contract
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
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {contractStatuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
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
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link href={`/dashboard/hr/contracts/${contractId}`} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Anulează
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Se salvează...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvează Modificările
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
