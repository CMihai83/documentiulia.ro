import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, DollarSign, Edit, Trash2, RefreshCw, Pause, Play } from 'lucide-react';
import { recurringInvoiceService } from '../services/recurringInvoiceService';
import type { RecurringInvoice, RecurringInvoiceFormData } from '../services/recurringInvoiceService';

const RecurringInvoicesPage: React.FC = () => {
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<RecurringInvoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');

  // Statistics
  const [stats, setStats] = useState({
    total_active: 0,
    total_paused: 0,
    monthly_revenue: 0
  });

  // Form data
  const [formData, setFormData] = useState<RecurringInvoiceFormData>({
    customer_id: '',
    frequency: 'monthly',
    next_invoice_date: '',
    amount: 0,
    currency: 'RON',
    description: '',
    line_items: []
  });

  useEffect(() => {
    loadRecurringInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [searchTerm, statusFilter, frequencyFilter, recurringInvoices]);

  const loadRecurringInvoices = async () => {
    try {
      setLoading(true);
      const response = await recurringInvoiceService.list();
      setRecurringInvoices(response.recurring_invoices || []);
      setStats(response.statistics || { total_active: 0, total_paused: 0, monthly_revenue: 0 });
    } catch (error) {
      console.error('Error loading recurring invoices:', error);
      alert('Eroare la încărcarea facturilor recurente');
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = [...recurringInvoices];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(inv =>
        inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.amount.toString().includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv =>
        statusFilter === 'active' ? inv.is_active : !inv.is_active
      );
    }

    // Frequency filter
    if (frequencyFilter !== 'all') {
      filtered = filtered.filter(inv => inv.frequency === frequencyFilter);
    }

    setFilteredInvoices(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingInvoice) {
        await recurringInvoiceService.update(editingInvoice.id, formData);
        alert('Factură recurentă actualizată cu succes!');
      } else {
        await recurringInvoiceService.create(formData);
        alert('Factură recurentă creată cu succes!');
      }

      setShowModal(false);
      resetForm();
      loadRecurringInvoices();
    } catch (error) {
      console.error('Error saving recurring invoice:', error);
      alert('Eroare la salvarea facturii recurente');
    }
  };

  const handleEdit = (invoice: RecurringInvoice) => {
    setEditingInvoice(invoice);
    setFormData({
      customer_id: invoice.user_id,
      frequency: invoice.frequency,
      next_invoice_date: invoice.next_invoice_date.split('T')[0],
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description || '',
      line_items: []
    });
    setShowModal(true);
  };

  const handleCancel = async (id: number) => {
    if (window.confirm('Sigur doriți să anulați această factură recurentă?')) {
      try {
        await recurringInvoiceService.cancel(id);
        alert('Factură recurentă anulată cu succes!');
        loadRecurringInvoices();
      } catch (error) {
        console.error('Error canceling recurring invoice:', error);
        alert('Eroare la anularea facturii recurente');
      }
    }
  };

  const resetForm = () => {
    setEditingInvoice(null);
    setFormData({
      customer_id: '',
      frequency: 'monthly',
      next_invoice_date: '',
      amount: 0,
      currency: 'RON',
      description: '',
      line_items: []
    });
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: { [key: string]: string } = {
      'daily': 'Zilnic',
      'weekly': 'Săptămânal',
      'monthly': 'Lunar',
      'quarterly': 'Trimestrial',
      'yearly': 'Anual'
    };
    return labels[frequency] || frequency;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency || 'RON'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Se încarcă...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Facturi Recurente</h1>
        <p className="text-gray-600">Gestionați facturile automate și abonamentele</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.total_active}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <RefreshCw className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pause</p>
              <p className="text-2xl font-bold text-gray-600">{stats.total_paused}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <Pause className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Venit Lunar Estimat</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.monthly_revenue, 'RON')}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Caută..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Toate statusurile</option>
            <option value="active">Active</option>
            <option value="paused">În pauză</option>
          </select>

          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Toate frecvențele</option>
            <option value="daily">Zilnic</option>
            <option value="weekly">Săptămânal</option>
            <option value="monthly">Lunar</option>
            <option value="quarterly">Trimestrial</option>
            <option value="yearly">Anual</option>
          </select>

          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adaugă Factură Recurentă
          </button>
        </div>
      </div>

      {/* Recurring Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descriere
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frecvență
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Următoarea Factură
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sumă
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acțiuni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Nu există facturi recurente
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invoice.customer_name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {invoice.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getFrequencyLabel(invoice.frequency)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {formatDate(invoice.next_invoice_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {invoice.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Play className="w-3 h-3 mr-1" />
                        Activă
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <Pause className="w-3 h-3 mr-1" />
                        În pauză
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(invoice)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="Editează"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleCancel(invoice.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Anulează"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingInvoice ? 'Editează Factură Recurentă' : 'Adaugă Factură Recurentă'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID Client *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frecvență *
                    </label>
                    <select
                      required
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Zilnic</option>
                      <option value="weekly">Săptămânal</option>
                      <option value="monthly">Lunar</option>
                      <option value="quarterly">Trimestrial</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Următoarea Factură *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.next_invoice_date}
                      onChange={(e) => setFormData({ ...formData, next_invoice_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sumă *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monedă
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="RON">RON</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descriere
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Detalii despre factura recurentă..."
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {editingInvoice ? 'Actualizează' : 'Adaugă'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringInvoicesPage;
