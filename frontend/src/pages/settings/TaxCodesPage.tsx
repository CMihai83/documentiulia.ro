import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X, Star, StarOff } from 'lucide-react';
import { taxCodeService, type TaxCode, type TaxCodeFormData } from '../../services/accounting/taxCodeService';

const TaxCodesPage: React.FC = () => {
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTaxCode, setEditingTaxCode] = useState<TaxCode | null>(null);

  const [formData, setFormData] = useState<TaxCodeFormData>({
    code: '',
    name: '',
    description: '',
    tax_type: 'vat',
    rate: 19,
    is_default: false,
    is_active: true
  });

  useEffect(() => {
    loadTaxCodes();
  }, []);

  const loadTaxCodes = async () => {
    try {
      setLoading(true);
      const data = await taxCodeService.list();
      setTaxCodes(data);
    } catch (error) {
      console.error('Error loading tax codes:', error);
      alert('Eroare la încărcarea codurilor TVA');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTaxCode) {
        await taxCodeService.update(editingTaxCode.id, formData);
        alert('Cod TVA actualizat cu succes!');
      } else {
        await taxCodeService.create(formData);
        alert('Cod TVA creat cu succes!');
      }

      setShowModal(false);
      resetForm();
      loadTaxCodes();
    } catch (error) {
      console.error('Error saving tax code:', error);
      alert('Eroare la salvarea codului TVA');
    }
  };

  const handleEdit = (taxCode: TaxCode) => {
    setEditingTaxCode(taxCode);
    setFormData({
      code: taxCode.code,
      name: taxCode.name,
      description: taxCode.description || '',
      tax_type: taxCode.tax_type,
      rate: taxCode.rate,
      is_default: taxCode.is_default,
      is_active: taxCode.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți acest cod TVA?')) {
      return;
    }

    try {
      await taxCodeService.delete(id);
      alert('Cod TVA șters cu succes!');
      loadTaxCodes();
    } catch (error) {
      console.error('Error deleting tax code:', error);
      alert('Eroare la ștergerea codului TVA');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await taxCodeService.setDefault(id);
      alert('Cod TVA setat ca implicit!');
      loadTaxCodes();
    } catch (error) {
      console.error('Error setting default:', error);
      alert('Eroare la setarea codului implicit');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      tax_type: 'vat',
      rate: 19,
      is_default: false,
      is_active: true
    });
    setEditingTaxCode(null);
  };

  const getTaxTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      vat: 'TVA',
      income_tax: 'Impozit Venit',
      sales_tax: 'Taxă Vânzări',
      other: 'Altele'
    };
    return types[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Coduri TVA</h1>
              <p className="mt-1 text-sm text-gray-500">
                Gestionare coduri și cote TVA pentru facturare
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Cod TVA Nou
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cod
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Denumire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cotă (%)
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilizări
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Implicit
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {taxCodes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Nu există coduri TVA configurate. Adăugați primul cod.
                    </td>
                  </tr>
                ) : (
                  taxCodes.map((taxCode) => (
                    <tr key={taxCode.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{taxCode.code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{taxCode.name}</div>
                        {taxCode.description && (
                          <div className="text-sm text-gray-500">{taxCode.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getTaxTypeLabel(taxCode.tax_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-bold text-gray-900">{taxCode.rate}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {taxCode.usage_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {taxCode.is_default ? (
                          <Star className="h-5 w-5 text-yellow-400 inline-block fill-current" />
                        ) : (
                          <button
                            onClick={() => handleSetDefault(taxCode.id)}
                            className="text-gray-400 hover:text-yellow-400"
                            title="Setează ca implicit"
                          >
                            <StarOff className="h-5 w-5" />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {taxCode.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Activ
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <X className="h-3 w-3 mr-1" />
                            Inactiv
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(taxCode)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(taxCode.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingTaxCode ? 'Editare Cod TVA' : 'Cod TVA Nou'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cod *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="ex: TVA19"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cotă TVA (%) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Denumire *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="ex: TVA Standard 19%"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descriere
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Descriere opțională..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tip Taxă
                  </label>
                  <select
                    value={formData.tax_type}
                    onChange={(e) => setFormData({ ...formData, tax_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="vat">TVA</option>
                    <option value="income_tax">Impozit Venit</option>
                    <option value="sales_tax">Taxă Vânzări</option>
                    <option value="other">Altele</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Cod implicit</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Activ</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  {editingTaxCode ? 'Actualizează' : 'Creează'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxCodesPage;
