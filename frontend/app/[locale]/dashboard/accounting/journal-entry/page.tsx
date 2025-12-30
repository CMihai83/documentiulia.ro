'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  BookOpen,
  Plus,
  Trash2,
  Calculator,
  AlertCircle
} from 'lucide-react';

interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

interface JournalEntryForm {
  entryNumber: string;
  date: string;
  description: string;
  lines: JournalLine[];
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<JournalEntryForm>({
    entryNumber: `JE-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    description: '',
    lines: [
      { id: '1', accountCode: '', accountName: '', debit: 0, credit: 0, description: '' },
      { id: '2', accountCode: '', accountName: '', debit: 0, credit: 0, description: '' }
    ]
  });

  const addLine = () => {
    const newLine: JournalLine = {
      id: Date.now().toString(),
      accountCode: '',
      accountName: '',
      debit: 0,
      credit: 0,
      description: ''
    };
    setForm(prev => ({ ...prev, lines: [...prev.lines, newLine] }));
  };

  const removeLine = (id: string) => {
    if (form.lines.length > 2) {
      setForm(prev => ({ ...prev, lines: prev.lines.filter(line => line.id !== id) }));
    }
  };

  const updateLine = (id: string, field: keyof JournalLine, value: any) => {
    setForm(prev => ({
      ...prev,
      lines: prev.lines.map(line =>
        line.id === id ? { ...line, [field]: value } : line
      )
    }));
  };

  const calculateTotals = () => {
    const totalDebit = form.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = form.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    return { totalDebit, totalCredit };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { totalDebit, totalCredit } = calculateTotals();

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setError('Total debite trebuie să fie egal cu total credite');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/accounting/journal-entries', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create journal entry');
      }

      const newEntry = await response.json();
      router.push(`/dashboard/accounting/journal-entries`);
    } catch (err: any) {
      setError(err.message || 'Eroare la crearea înregistrării');
    } finally {
      setSaving(false);
    }
  };

  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/accounting"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Înapoi la Contabilitate
          </Link>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Notă Contabilă Nouă</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Număr Înregistrare *
              </label>
              <input
                type="text"
                required
                value={form.entryNumber}
                onChange={(e) => setForm(prev => ({ ...prev, entryNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="JE-20251230-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descriere *
              </label>
              <input
                type="text"
                required
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descriere înregistrare..."
              />
            </div>
          </div>
        </div>

        {/* Journal Lines */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Liniile Înregistrării</h3>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Adaugă Linie
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cont
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Denumire Cont
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit (RON)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit (RON)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descriere
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {form.lines.map((line, index) => (
                  <tr key={line.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={line.accountCode}
                        onChange={(e) => updateLine(line.id, 'accountCode', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="411"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={line.accountName}
                        onChange={(e) => updateLine(line.id, 'accountName', e.target.value)}
                        className="w-48 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Clienți"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit || ''}
                        onChange={(e) => updateLine(line.id, 'debit', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit || ''}
                        onChange={(e) => updateLine(line.id, 'credit', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={line.description || ''}
                        onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        className="w-48 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Descriere linie..."
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {form.lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    TOTALURI
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-gray-900">
                    {totalDebit.toFixed(2)} RON
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-gray-900">
                    {totalCredit.toFixed(2)} RON
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Balance Status */}
        {!isBalanced && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Înregistrarea nu este echilibrată. Diferența: {(totalDebit - totalCredit).toFixed(2)} RON
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/dashboard/accounting"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Anulează
          </Link>
          <button
            type="submit"
            disabled={saving || !isBalanced}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Se salvează...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvează Înregistrare
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}