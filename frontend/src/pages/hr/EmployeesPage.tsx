import React, { useEffect, useState } from 'react';
import { Plus, Search, Users, Mail, Phone, Edit, Trash2 } from 'lucide-react';
import { employeeService, type Employee, type EmployeeFormData } from '../../services/hr/employeeService';
import DashboardLayout from '../../components/layout/DashboardLayout';

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    display_name: '',
    email: '',
    phone: '',
    employee_number: '',
    employment_type: 'full_time',
    department: '',
    position_title: '',
    hire_date: '',
    salary_amount: undefined,
    status: 'active',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await employeeService.list();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to load employees:', error);
      alert('Eroare la încărcarea angajaților');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        display_name: employee.display_name,
        email: employee.email || '',
        phone: employee.phone || '',
        employee_number: employee.employee_number || '',
        employment_type: employee.employment_type || 'full_time',
        department: employee.department || '',
        position_title: employee.position_title || '',
        hire_date: employee.hire_date || '',
        salary_amount: employee.salary_amount,
        status: employee.status,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        display_name: '',
        email: '',
        phone: '',
        employee_number: '',
        employment_type: 'full_time',
        department: '',
        position_title: '',
        hire_date: '',
        salary_amount: undefined,
        status: 'active',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.display_name) {
      alert('Numele angajatului este obligatoriu');
      return;
    }

    try {
      if (editingEmployee) {
        await employeeService.update(editingEmployee.id, formData);
        alert('Angajat actualizat cu succes!');
      } else {
        await employeeService.create(formData);
        alert('Angajat adăugat cu succes!');
      }
      handleCloseModal();
      loadEmployees();
    } catch (error) {
      console.error('Failed to save employee:', error);
      alert('Eroare la salvarea angajatului');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Ești sigur că vrei să ștergi angajatul ${name}?`)) {
      try {
        await employeeService.delete(id);
        setEmployees(employees.filter((e) => e.id !== id));
        alert('Angajat șters cu succes!');
      } catch (error) {
        console.error('Failed to delete employee:', error);
        alert('Eroare la ștergerea angajatului');
      }
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: employees.length,
    active: employees.filter((e) => e.status === 'active').length,
    inactive: employees.filter((e) => e.status === 'inactive').length,
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
            <h1 className="text-2xl font-bold text-gray-900">Angajați</h1>
            <p className="text-gray-600 mt-1">Gestionează echipa companiei tale</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adaugă Angajat
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Angajați', value: stats.total, color: 'text-gray-900', icon: Users },
            { label: 'Activi', value: stats.active, color: 'text-green-600', icon: Users },
            { label: 'Inactivi', value: stats.inactive, color: 'text-red-600', icon: Users },
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
                  placeholder="Caută angajați..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">Toți angajații</option>
                <option value="active">Activi</option>
                <option value="inactive">Inactivi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employees Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Angajat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departament
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Poziție
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tip Angajare
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
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Nu există angajați
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{employee.display_name}</div>
                          {employee.email && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                              <Mail className="w-3 h-3" />
                              {employee.email}
                            </div>
                          )}
                          {employee.phone && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Phone className="w-3 h-3" />
                              {employee.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {employee.department || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {employee.position_title || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {employee.employment_type === 'full_time' && 'Full Time'}
                        {employee.employment_type === 'part_time' && 'Part Time'}
                        {employee.employment_type === 'contract' && 'Contract'}
                        {employee.employment_type === 'intern' && 'Intern'}
                        {!employee.employment_type && '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            employee.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {employee.status === 'active' ? 'Activ' : 'Inactiv'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm space-x-2">
                        <button
                          onClick={() => handleOpenModal(employee)}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id, employee.display_name)}
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
                {editingEmployee ? 'Editează Angajat' : 'Adaugă Angajat Nou'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nume Complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="input"
                    placeholder="Ion Popescu"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    placeholder="ion.popescu@company.ro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    placeholder="+40 700 000 000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Număr Angajat</label>
                  <input
                    type="text"
                    value={formData.employee_number}
                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    className="input"
                    placeholder="EMP001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip Angajare</label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="input"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departament</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="input"
                    placeholder="IT, HR, Finance, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poziție</label>
                  <input
                    type="text"
                    value={formData.position_title}
                    onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                    className="input"
                    placeholder="Software Engineer, Manager, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Angajării</label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salariu (RON)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salary_amount || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, salary_amount: parseFloat(e.target.value) || undefined })
                    }
                    className="input"
                    placeholder="5000.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="active">Activ</option>
                    <option value="inactive">Inactiv</option>
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
                  {editingEmployee ? 'Actualizează' : 'Adaugă'} Angajat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EmployeesPage;
