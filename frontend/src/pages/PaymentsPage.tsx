import React, { useEffect, useState } from 'react';
import { Plus, Search, CreditCard, Edit, Trash2, DollarSign, Calendar, FileText } from 'lucide-react';
import { paymentService, type Payment, type PaymentFormData } from '../services/paymentService';
import { contactAPI } from '../services/api';
import type { Contact } from '../types';
import DashboardLayout from '../components/layout/DashboardLayout';

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState<PaymentFormData>({
    payment_type: 'invoice_payment',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    currency: 'RON',
    reference_number: '',
    contact_id: undefined,
    status: 'completed',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [paymentsData, contactsData] = await Promise.all([
        paymentService.list(),
        contactAPI.list(),
      ]);
      setPayments(paymentsData);
      setContacts(contactsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Eroare la încărcarea datelor');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        payment_type: payment.payment_type,
        payment_date: payment.payment_date,
        amount: payment.amount,
        currency: payment.currency,
        reference_number: payment.reference_number || '',
        contact_id: payment.contact_id || undefined,
        status: payment.status,
      });
    } else {
      setEditingPayment(null);
      setFormData({
        payment_type: 'invoice_payment',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0,
        currency: 'RON',
        reference_number: '',
        contact_id: undefined,
        status: 'completed',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPayment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.amount <= 0) {
      alert('Suma trebuie să fie mai mare decât 0');
      return;
    }

    try {
      if (editingPayment) {
        await paymentService.update(editingPayment.id, formData);
        alert('Plată actualizată cu succes!');
      } else {
        await paymentService.create(formData);
        alert('Plată înregistrată cu succes!');
      }
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Failed to save payment:', error);
      alert('Eroare la salvarea plății');
    }
  };

  const handleDelete = async (id: string, amount: number) => {
    if (window.confirm(`Ești sigur că vrei să ștergi plata de ${amount} RON?`)) {
      try {
        await paymentService.delete(id);
        setPayments(payments.filter((p) => p.id !== id));
        alert('Plată ștearsă cu succes!');
      } catch (error) {
        console.error('Failed to delete payment:', error);
        alert('Eroare la ștergerea plății');
      }
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.amount.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesType = typeFilter === 'all' || payment.payment_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: payments.reduce((sum, p) => sum + p.amount, 0),
    completed: payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    pending: payments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    count: payments.length,
  };

  const getPaymentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      invoice_payment: 'Plată Factură',
      bill_payment: 'Plată Factură Furnizor',
      expense_reimbursement: 'Rambursare Cheltuială',
      other: 'Altele',
    };
    return types[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const statuses: Record<string, string> = {
      completed: 'Finalizat',
      pending: 'În Așteptare',
      failed: 'Eșuat',
      cancelled: 'Anulat',
    };
    return statuses[status] || status;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plăți</h1>
            <p className="text-gray-600 mt-1">Gestionează plățile și tranzacțiile</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Înregistrează Plată
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Plăți', value: `${stats.total.toFixed(2)} RON`, color: 'text-gray-900', icon: DollarSign },
            { label: 'Finalizate', value: `${stats.completed.toFixed(2)} RON`, color: 'text-green-600', icon: CreditCard },
            { label: 'În Așteptare', value: `${stats.pending.toFixed(2)} RON`, color: 'text-yellow-600', icon: Calendar },
            { label: 'Număr Plăți', value: stats.count, color: 'text-blue-600', icon: FileText },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută plăți..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input"
              >
                <option value="all">Toate tipurile</option>
                <option value="invoice_payment">Plată Factură</option>
                <option value="bill_payment">Plată Factură Furnizor</option>
                <option value="expense_reimbursement">Rambursare Cheltuială</option>
                <option value="other">Altele</option>
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">Toate statusurile</option>
                <option value="completed">Finalizat</option>
                <option value="pending">În Așteptare</option>
                <option value="failed">Eșuat</option>
                <option value="cancelled">Anulat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referință
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tip Plată
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dată
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
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Nu există plăți înregistrate
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {payment.reference_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getPaymentTypeLabel(payment.payment_type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {payment.contact_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(payment.payment_date).toLocaleDateString('ro-RO')}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {payment.amount.toFixed(2)} {payment.currency}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            payment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : payment.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {getStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm space-x-2">
                        <button
                          onClick={() => handleOpenModal(payment)}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id, payment.amount)}
                          className="text-red-600 hover:text-red-900 inline-flex items-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPayment ? 'Editează Plată' : 'Înregistrează Plată Nouă'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tip Plată <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.payment_type}
                    onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                    className="input"
                  >
                    <option value="invoice_payment">Plată Factură</option>
                    <option value="bill_payment">Plată Factură Furnizor</option>
                    <option value="expense_reimbursement">Rambursare Cheltuială</option>
                    <option value="other">Altele</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dată Plată <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sumă <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="input"
                    placeholder="1000.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monedă</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="input"
                  >
                    <option value="RON">RON</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Număr Referință</label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="input"
                    placeholder="PAY-2025-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                  <select
                    value={formData.contact_id || ''}
                    onChange={(e) => setFormData({ ...formData, contact_id: e.target.value || undefined })}
                    className="input"
                  >
                    <option value="">Fără contact</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="completed">Finalizat</option>
                    <option value="pending">În Așteptare</option>
                    <option value="failed">Eșuat</option>
                    <option value="cancelled">Anulat</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                >
                  Anulează
                </button>
                <button type="submit" className="btn-primary">
                  {editingPayment ? 'Actualizează' : 'Înregistrează'} Plată
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PaymentsPage;
