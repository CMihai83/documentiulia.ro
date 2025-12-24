'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  Plus,
  Calendar,
  Clock,
  Repeat,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  Building2,
  ArrowLeft,
} from 'lucide-react';

interface RecurringInvoice {
  id: string;
  name: string;
  description?: string;
  partnerId: string;
  partner?: { name: string; cui?: string };
  frequency: string;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  lastRunDate?: string;
  isActive: boolean;
  autoSend: boolean;
  autoSubmitSpv: boolean;
  currency: string;
  vatRate: number;
  items: any[];
  generatedCount: number;
  paymentTermsDays: number;
}

interface FrequencyOption {
  value: string;
  label: string;
  description: string;
}

const frequencyLabels: Record<string, string> = {
  DAILY: 'Zilnic',
  WEEKLY: 'Săptămânal',
  BIWEEKLY: 'Bi-săptămânal',
  MONTHLY: 'Lunar',
  QUARTERLY: 'Trimestrial',
  BIANNUALLY: 'Semestrial',
  ANNUALLY: 'Anual',
};

export default function RecurringInvoicesPage() {
  const router = useRouter();
  const toast = useToast();
  const [templates, setTemplates] = useState<RecurringInvoice[]>([]);
  const [upcoming, setUpcoming] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [frequencies, setFrequencies] = useState<FrequencyOption[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    partnerId: '',
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    dayOfMonth: 1,
    autoSend: false,
    autoSubmitSpv: false,
    currency: 'RON',
    vatRate: 19,
    paymentTermsDays: 30,
    items: [{ description: '', quantity: 1, unitPrice: 0, unit: 'buc', vatRate: 19 }],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [templatesRes, upcomingRes, freqRes, partnersRes] = await Promise.all([
        fetch('/api/v1/recurring-invoices?includeInactive=true', { headers }),
        fetch('/api/v1/recurring-invoices/upcoming', { headers }),
        fetch('/api/v1/recurring-invoices/frequencies', { headers }),
        fetch('/api/v1/partners?limit=100', { headers }),
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.data || []);
      }

      if (upcomingRes.ok) {
        const data = await upcomingRes.json();
        setUpcoming(data.data || []);
      }

      if (freqRes.ok) {
        const data = await freqRes.json();
        setFrequencies(data.frequencies || []);
      }

      if (partnersRes.ok) {
        const data = await partnersRes.json();
        setPartners(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    setActionLoading(id);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/recurring-invoices/${id}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateNow = async (id: string) => {
    // Navigate to generate confirmation page
    router.push(`/dashboard/invoices/recurring/${id}/generate`);
  };

  const handleGenerateNowConfirmed = async (id: string) => {
    setActionLoading(id);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/recurring-invoices/${id}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Factură generată', `Factura ${data.invoice?.invoiceNumber} a fost generată!`);
        fetchData();
      } else {
        toast.error('Eroare', 'Eroare la generarea facturii');
      }
    } catch (err) {
      console.error('Generate failed:', err);
      toast.error('Eroare', 'Eroare la generarea facturii');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    // Navigate to delete confirmation page
    router.push(`/dashboard/invoices/recurring/${id}/delete`);
  };

  const handleDeleteConfirmed = async (id: string) => {
    setActionLoading(id);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/recurring-invoices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Șablon șters', 'Șablonul a fost șters cu succes.');
        fetchData();
      } else {
        toast.error('Eroare', 'Eroare la ștergerea șablonului');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Eroare', 'Eroare la ștergerea șablonului');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/v1/recurring-invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setForm({
          name: '',
          description: '',
          partnerId: '',
          frequency: 'MONTHLY',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          dayOfMonth: 1,
          autoSend: false,
          autoSubmitSpv: false,
          currency: 'RON',
          vatRate: 19,
          paymentTermsDays: 30,
          items: [{ description: '', quantity: 1, unitPrice: 0, unit: 'buc', vatRate: 19 }],
          notes: '',
        });
        toast.success('Șablon creat', 'Șablonul de factură recurentă a fost creat cu succes.');
        fetchData();
      } else {
        const error = await res.json();
        toast.error('Eroare', error.message || 'Eroare la crearea șablonului');
      }
    } catch (err) {
      console.error('Create failed:', err);
      toast.error('Eroare', 'Eroare la crearea șablonului');
    } finally {
      setActionLoading(null);
    }
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { description: '', quantity: 1, unitPrice: 0, unit: 'buc', vatRate: 19 }],
    });
  };

  const removeItem = (index: number) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateTotal = () => {
    return form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Înapoi la Facturi
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Facturi Recurente</h1>
          <p className="text-gray-500">Automatizați facturarea pentru servicii repetitive</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Șablon Nou
        </button>
      </div>

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-6 mb-6 border border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-blue-900">Următoarele 30 de zile</h2>
          </div>
          <div className="space-y-3">
            {upcoming.slice(0, 5).map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-500">{template.partner?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-blue-600">{formatDate(template.nextRunDate)}</p>
                  <p className="text-xs text-gray-500">{frequencyLabels[template.frequency]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Repeat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nu aveți șabloane</h3>
          <p className="text-gray-500 mb-4">
            Creați un șablon pentru a automatiza facturarea serviciilor recurente
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Creați primul șablon
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`bg-white rounded-xl shadow-sm border p-5 ${
                !template.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {template.partner?.name || 'Partener necunoscut'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    template.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {template.isActive ? 'Activ' : 'Inactiv'}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Repeat className="h-4 w-4" />
                    Frecvență
                  </span>
                  <span className="font-medium">{frequencyLabels[template.frequency]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Următoarea
                  </span>
                  <span className="font-medium">{formatDate(template.nextRunDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Generate
                  </span>
                  <span className="font-medium">{template.generatedCount} facturi</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => handleToggleActive(template.id)}
                  disabled={actionLoading === template.id}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1 ${
                    template.isActive
                      ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {actionLoading === template.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : template.isActive ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pauză
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Activează
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleGenerateNow(template.id)}
                  disabled={actionLoading === template.id}
                  className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 flex items-center gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Acum
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  disabled={actionLoading === template.id}
                  className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Șablon Factură Recurentă</h2>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nume șablon *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Ex: Abonament lunar hosting"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client *
                  </label>
                  <select
                    value={form.partnerId}
                    onChange={(e) => setForm({ ...form, partnerId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selectați clientul</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.cui ? `(${p.cui})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Schedule */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frecvență *
                  </label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {frequencies.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dată început *
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ziua lunii
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.dayOfMonth}
                    onChange={(e) => setForm({ ...form, dayOfMonth: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produse/Servicii
                </label>
                <div className="space-y-3">
                  {form.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <input
                        type="text"
                        placeholder="Descriere"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Cant."
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                        className="w-20 px-3 py-2 border rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Preț"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                        className="w-24 px-3 py-2 border rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  + Adaugă produs
                </button>
                <div className="text-right mt-2">
                  <span className="text-sm text-gray-500">Total: </span>
                  <span className="font-semibold">
                    {calculateTotal().toLocaleString('ro-RO')} {form.currency}
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.autoSend}
                    onChange={(e) => setForm({ ...form, autoSend: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Trimite automat pe email</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.autoSubmitSpv}
                    onChange={(e) => setForm({ ...form, autoSubmitSpv: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Trimite automat la SPV</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading === 'create' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Creează șablon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
