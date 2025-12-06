import React, { useEffect, useState } from 'react';
import { Plus, Search, CreditCard, Eye, Edit, Trash2, Download } from 'lucide-react';
import { billAPI } from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';

const BillsPage: React.FC = () => {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      const data = await billAPI.list();
      setBills(data);
    } catch (error) {
      console.error('Failed to load bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Ești sigur că vrei să ștergi această chitanță?')) {
      try {
        await billAPI.delete(id);
        setBills(bills.filter((bill) => bill.id !== id));
      } catch (error) {
        console.error('Failed to delete bill:', error);
        alert('Ștergerea chitanței a eșuat');
      }
    }
  };

  const filteredBills = bills.filter((bill) => {
    const matchesSearch = bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = [
    { value: 'all', label: 'Toate', color: 'bg-gray-100 text-gray-800' },
    { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'open', label: 'Deschise', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'paid', label: 'Plătite', color: 'bg-green-100 text-green-800' },
    { value: 'overdue', label: 'Restante', color: 'bg-red-100 text-red-800' },
  ];

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
            <h1 className="text-2xl font-bold text-gray-900">Chitanțe</h1>
            <p className="text-gray-600 mt-1">Gestionați chitanțele de la furnizori</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Chitanță Nouă
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută după număr sau furnizor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {statuses.map((status) => (
                <button
                  key={status.value}
                  onClick={() => setStatusFilter(status.value)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    statusFilter === status.value
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bills Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Număr Chitanță
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Furnizor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scadență
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plătit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nu au fost găsite chitanțe</p>
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{bill.bill_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{bill.vendor_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{bill.bill_date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{bill.due_date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{bill.total_amount} RON</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{bill.amount_paid} RON</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                          bill.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                          bill.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {bill.status === 'paid' ? 'Plătit' :
                           bill.status === 'open' ? 'Deschis' :
                           bill.status === 'overdue' ? 'Restanță' :
                           bill.status === 'draft' ? 'Draft' : bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <button className="text-primary-600 hover:text-primary-900" title="Vizualizare">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-blue-600 hover:text-blue-900" title="Editare">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900" title="Download PDF">
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(bill.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Ștergere"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        {bills.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500">Total Chitanțe</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{bills.length}</p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500">Total de Plătit</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {bills.reduce((sum, bill) => sum + parseFloat(bill.total_amount || 0), 0).toFixed(2)} RON
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500">Total Plătit</h3>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {bills.reduce((sum, bill) => sum + parseFloat(bill.amount_paid || 0), 0).toFixed(2)} RON
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BillsPage;
