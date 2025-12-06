import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Users, Mail, Phone, Building2, Edit, Trash2, User } from 'lucide-react';
import { contactAPI } from '../services/api';
import type { Contact } from '../types';
import DashboardLayout from '../components/layout/DashboardLayout';
import CUIValidation from '../components/CUIValidation';

const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await contactAPI.list();
      setContacts(data);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Ești sigur că vrei să ștergi acest contact?')) {
      try {
        await contactAPI.delete(id);
        setContacts(contacts.filter((c) => c.id !== id));
      } catch (error) {
        console.error('Failed to delete contact:', error);
        alert('Ștergerea contactului a eșuat');
      }
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || contact.contact_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'customer':
        return 'bg-blue-100 text-blue-800';
      case 'vendor':
        return 'bg-purple-100 text-purple-800';
      case 'employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <User className="w-5 h-5 text-blue-600" />;
      case 'vendor':
        return <Building2 className="w-5 h-5 text-purple-600" />;
      case 'employee':
        return <Users className="w-5 h-5 text-green-600" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const statsByType = {
    customers: contacts.filter((c) => c.contact_type === 'customer').length,
    vendors: contacts.filter((c) => c.contact_type === 'vendor').length,
    employees: contacts.filter((c) => c.contact_type === 'employee').length,
    total: contacts.length,
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
            <h1 className="text-2xl font-bold text-gray-900">Contacte</h1>
            <p className="text-gray-600 mt-1">Gestionează clienții, furnizorii și membrii echipei tale</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adaugă Contact
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Contacte', value: statsByType.total, color: 'text-gray-900', icon: Users },
            { label: 'Clienți', value: statsByType.customers, color: 'text-blue-600', icon: User },
            { label: 'Furnizori', value: statsByType.vendors, color: 'text-purple-600', icon: Building2 },
            { label: 'Angajați', value: statsByType.employees, color: 'text-green-600', icon: Users },
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
                  placeholder="Caută contacte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input"
              >
                <option value="all">Toate Tipurile</option>
                <option value="customer">Clienți</option>
                <option value="vendor">Furnizori</option>
                <option value="employee">Angajați</option>
                <option value="contractor">Colaboratori</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.length === 0 ? (
            <div className="col-span-full card text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nu au fost găsite contacte</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
              >
                Adaugă primul tău contact
              </button>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div key={contact.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      {getTypeIcon(contact.contact_type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{contact.display_name}</h3>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getTypeColor(contact.contact_type)}`}>
                        {contact.contact_type}
                      </span>
                    </div>
                  </div>
                </div>

                {contact.company_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Building2 className="w-4 h-4" />
                    <span>{contact.company_name}</span>
                  </div>
                )}

                {contact.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Phone className="w-4 h-4" />
                    <span>{contact.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setEditingContact(contact);
                      setShowCreateModal(true);
                    }}
                    className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editează
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Șterge
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Contact Modal */}
        {showCreateModal && (
          <ContactCreateModal
            contact={editingContact}
            onClose={() => {
              setShowCreateModal(false);
              setEditingContact(null);
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              setEditingContact(null);
              loadContacts();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// Contact Create/Edit Modal Component
const ContactCreateModal: React.FC<{ contact?: Contact | null; onClose: () => void; onSuccess: () => void }> = ({ contact, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const isEditing = !!contact;

  const [formData, setFormData] = useState<{
    type: 'customer' | 'vendor' | 'employee' | 'contractor' | 'lead' | 'partner';
    name: string;
    email: string;
    phone: string;
    company_name: string;
    cui: string;
    registration_number: string;
    address: string;
    city: string;
    country: string;
    notes: string;
  }>({
    type: contact?.contact_type || 'customer',
    name: contact?.display_name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    company_name: contact?.company_name || '',
    cui: (contact as any)?.cui || '',
    registration_number: (contact as any)?.registration_number || '',
    address: contact?.address || '',
    city: contact?.city || '',
    country: contact?.country || '',
    notes: contact?.notes || '',
  });

  const handleCompanyFound = (company: any) => {
    setFormData(prev => ({
      ...prev,
      company_name: company.name || prev.company_name,
      cui: company.cui || prev.cui,
      registration_number: company.registration_number || prev.registration_number,
      address: company.address || prev.address,
      phone: company.phone || prev.phone,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        await contactAPI.update(contact.id, formData);
        alert('Contact actualizat cu succes!');
      } else {
        await contactAPI.create(formData);
        alert('Contact creat cu succes!');
      }
      onSuccess();
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} contact:`, error);
      alert(`${isEditing ? 'Actualizarea' : 'Crearea'} contactului a eșuat`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isEditing ? 'Editează Contact' : 'Adaugă Contact Nou'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tip Contact *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'customer' | 'vendor' | 'employee' | 'contractor' })}
                className="input"
                required
              >
                <option value="customer">Client</option>
                <option value="vendor">Furnizor</option>
                <option value="lead">Lead</option>
                <option value="partner">Partener</option>
                <option value="employee">Angajat</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nume Complet *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+40 (722) 123-456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nume Companie</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            {/* CUI/CIF Validation - Only show for business contacts */}
            {(formData.type === 'customer' || formData.type === 'vendor' || formData.type === 'partner') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CUI / CIF</label>
                  <CUIValidation
                    value={formData.cui}
                    onChange={(value) => setFormData({ ...formData, cui: value })}
                    onCompanyFound={handleCompanyFound}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nr. Registru Comert</label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    className="input"
                    placeholder="J40/1234/2024"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Adresă</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input"
                placeholder="Adresa străzii"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Oraș</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Țară</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notițe</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input"
                rows={3}
                placeholder="Notițe adiționale..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Anulează
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (isEditing ? 'Se actualizează...' : 'Se creează...') : (isEditing ? 'Actualizează Contact' : 'Creează Contact')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactsPage;
