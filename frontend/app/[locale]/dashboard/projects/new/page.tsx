'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  FolderKanban,
  Calendar,
  DollarSign,
  Users,
  Target,
  AlertCircle
} from 'lucide-react';

interface ProjectForm {
  name: string;
  client: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  priority: 'low' | 'medium' | 'high';
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  team: string[];
  objectives: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ProjectForm>({
    name: '',
    client: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    budget: 0,
    priority: 'medium',
    status: 'planning',
    team: [],
    objectives: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/project', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }

      const newProject = await response.json();
      router.push(`/dashboard/projects/${newProject.id}`);
    } catch (err: any) {
      setError(err.message || 'Eroare la crearea proiectului');
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (field: keyof ProjectForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/projects"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Înapoi la Proiecte
          </Link>
          <div className="flex items-center space-x-2">
            <FolderKanban className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Proiect Nou</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nume Proiect *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: Implementare ERP"
              />
            </div>

            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client *
              </label>
              <input
                type="text"
                required
                value={form.client}
                onChange={(e) => updateForm('client', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: SC Tech SRL"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioritate
              </label>
              <select
                value={form.priority}
                onChange={(e) => updateForm('priority', e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Scăzută</option>
                <option value="medium">Medie</option>
                <option value="high">Înaltă</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => updateForm('status', e.target.value as 'planning' | 'active' | 'on_hold' | 'completed')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="planning">Planificare</option>
                <option value="active">Activ</option>
                <option value="on_hold">În așteptare</option>
                <option value="completed">Finalizat</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Început
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => updateForm('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Finalizare
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => updateForm('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buget (RON)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => updateForm('budget', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            {/* Team */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Echipă (separați cu virgulă)
              </label>
              <input
                type="text"
                value={form.team.join(', ')}
                onChange={(e) => updateForm('team', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Maria P., Ion D."
              />
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descriere
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descriere proiect..."
            />
          </div>

          {/* Objectives */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Obiective
            </label>
            <textarea
              rows={3}
              value={form.objectives}
              onChange={(e) => updateForm('objectives', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Obiectivele proiectului..."
            />
          </div>
        </div>

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
            href="/dashboard/projects"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Anulează
          </Link>
          <button
            type="submit"
            disabled={saving}
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
                Salvează Proiect
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}