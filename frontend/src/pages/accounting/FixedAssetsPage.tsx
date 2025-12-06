import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, TrendingDown, X, DollarSign } from 'lucide-react';
import { fixedAssetService, type FixedAsset, type FixedAssetFormData, type DepreciationSchedule } from '../../services/accounting/fixedAssetService';

const FixedAssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [depreciationSchedule, setDepreciationSchedule] = useState<DepreciationSchedule[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

  const [formData, setFormData] = useState<FixedAssetFormData>({
    asset_code: '',
    asset_name: '',
    description: '',
    category: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: 0,
    salvage_value: 0,
    useful_life_years: 5,
    depreciation_method: 'straight_line',
    location: '',
    serial_number: ''
  });

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await fixedAssetService.list();
      setAssets(data);
    } catch (error) {
      console.error('Error loading fixed assets:', error);
      alert('Eroare la încărcarea imobilizărilor');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAsset) {
        await fixedAssetService.update(editingAsset.id, formData);
        alert('Imobilizare actualizată cu succes!');
      } else {
        await fixedAssetService.create(formData);
        alert('Imobilizare creată cu succes!');
      }

      setShowModal(false);
      resetForm();
      loadAssets();
    } catch (error) {
      console.error('Error saving fixed asset:', error);
      alert('Eroare la salvarea imobilizării');
    }
  };

  const handleEdit = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setFormData({
      asset_code: asset.asset_code,
      asset_name: asset.asset_name,
      description: asset.description || '',
      category: asset.category,
      purchase_date: asset.purchase_date,
      purchase_price: asset.purchase_price,
      salvage_value: asset.salvage_value,
      useful_life_years: asset.useful_life_years,
      depreciation_method: asset.depreciation_method,
      location: asset.location || '',
      serial_number: asset.serial_number || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți această imobilizare?')) {
      return;
    }

    try {
      await fixedAssetService.delete(id);
      alert('Imobilizare ștearsă cu succes!');
      loadAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Eroare la ștergerea imobilizării');
    }
  };

  const handleViewSchedule = async (asset: FixedAsset) => {
    try {
      const schedule = await fixedAssetService.getDepreciationSchedule(asset.id);
      setDepreciationSchedule(schedule);
      setSelectedAsset(asset);
      setShowScheduleModal(true);
    } catch (error) {
      console.error('Error loading schedule:', error);
      alert('Eroare la încărcarea planului de amortizare');
    }
  };

  const resetForm = () => {
    setFormData({
      asset_code: '',
      asset_name: '',
      description: '',
      category: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: 0,
      salvage_value: 0,
      useful_life_years: 5,
      depreciation_method: 'straight_line',
      location: '',
      serial_number: ''
    });
    setEditingAsset(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      active: { color: 'bg-green-100 text-green-800', text: 'Activ' },
      disposed: { color: 'bg-red-100 text-red-800', text: 'Cedat' },
      fully_depreciated: { color: 'bg-gray-100 text-gray-800', text: 'Amortizat Complet' }
    };
    const badge = badges[status] || badges.active;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getDepreciationAlert = (asset: FixedAsset): { type: 'warning' | 'danger' | 'info' | null; message: string } | null => {
    // Calculate depreciation percentage
    const depreciationPercentage = (asset.accumulated_depreciation / (asset.purchase_price - asset.salvage_value)) * 100;

    // Calculate years since purchase
    const purchaseDate = new Date(asset.purchase_date);
    const today = new Date();
    const yearsSincePurchase = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const yearsRemaining = asset.useful_life_years - yearsSincePurchase;

    // Fully depreciated
    if (depreciationPercentage >= 100) {
      return {
        type: 'danger',
        message: '⚠️ Imobilizare complet amortizată'
      };
    }

    // Near end of useful life (< 1 year remaining)
    if (yearsRemaining < 1 && yearsRemaining > 0) {
      return {
        type: 'warning',
        message: `⏰ Mai puțin de 1 an până la amortizare completă`
      };
    }

    // High depreciation (> 80%)
    if (depreciationPercentage > 80 && depreciationPercentage < 100) {
      return {
        type: 'info',
        message: `📊 ${Math.round(depreciationPercentage)}% amortizat`
      };
    }

    return null;
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Imobilizări Corporale</h1>
              <p className="mt-1 text-sm text-gray-500">
                Registru imobilizări și plan de amortizare
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
              Imobilizare Nouă
            </button>
          </div>
        </div>
      </div>

      {/* Depreciation Alerts Banner */}
      {(() => {
        const alertAssets = assets.filter(asset => getDepreciationAlert(asset) !== null);
        const dangerAssets = alertAssets.filter(asset => getDepreciationAlert(asset)?.type === 'danger');
        const warningAssets = alertAssets.filter(asset => getDepreciationAlert(asset)?.type === 'warning');

        if (alertAssets.length === 0) return null;

        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Atenție la amortizări
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      {dangerAssets.length > 0 && (
                        <span className="font-semibold">{dangerAssets.length} imobilizare{dangerAssets.length > 1 ? 'i' : ''} complet amortizat{dangerAssets.length > 1 ? 'e' : 'ă'}</span>
                      )}
                      {dangerAssets.length > 0 && warningAssets.length > 0 && ', '}
                      {warningAssets.length > 0 && (
                        <span>{warningAssets.length} imobilizare{warningAssets.length > 1 ? 'i' : ''} aproape de amortizare completă</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Valoare Totală</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(assets.reduce((sum, a) => sum + a.purchase_price, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Amortizare Acumulată</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(assets.reduce((sum, a) => sum + a.accumulated_depreciation, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Valoare Contabilă</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(assets.reduce((sum, a) => sum + a.book_value, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Număr Imobilizări</p>
                <p className="text-lg font-bold text-gray-900">{assets.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cod / Denumire
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Achiziție
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valoare Achiziție
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amortizare
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valoare Contabilă
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
                  {assets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        Nu există imobilizări înregistrate. Adăugați prima imobilizare.
                      </td>
                    </tr>
                  ) : (
                    assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{asset.asset_code}</div>
                          <div className="text-sm text-gray-500">{asset.asset_name}</div>
                          {(() => {
                            const alert = getDepreciationAlert(asset);
                            if (!alert || !alert.type) return null;
                            const alertColors: Record<'danger' | 'warning' | 'info', string> = {
                              danger: 'bg-red-50 text-red-700 border-red-200',
                              warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                              info: 'bg-blue-50 text-blue-700 border-blue-200'
                            };
                            return (
                              <div className={`mt-1 text-xs px-2 py-1 rounded border ${alertColors[alert.type]}`}>
                                {alert.message}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{asset.category}</div>
                          {asset.location && (
                            <div className="text-xs text-gray-500">📍 {asset.location}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(asset.purchase_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(asset.purchase_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                          {formatCurrency(asset.accumulated_depreciation)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                          {formatCurrency(asset.book_value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(asset.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleViewSchedule(asset)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Plan amortizare"
                          >
                            <FileText className="h-5 w-5 inline-block" />
                          </button>
                          <button
                            onClick={() => handleEdit(asset)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Editează"
                          >
                            <Edit className="h-5 w-5 inline-block" />
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Șterge"
                          >
                            <Trash2 className="h-5 w-5 inline-block" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingAsset ? 'Editare Imobilizare' : 'Imobilizare Nouă'}
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

            <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cod Imobilizare *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.asset_code}
                    onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="ex: IMO-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categorie *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="ex: Echipamente IT"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Denumire Imobilizare *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.asset_name}
                    onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="ex: Server Dell PowerEdge R740"
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Achiziție *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valoare Achiziție (RON) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valoare Reziduală (RON)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salvage_value}
                    onChange={(e) => setFormData({ ...formData, salvage_value: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durată Viață Utilă (ani) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.useful_life_years}
                    onChange={(e) => setFormData({ ...formData, useful_life_years: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metodă Amortizare *
                  </label>
                  <select
                    required
                    value={formData.depreciation_method}
                    onChange={(e) => setFormData({ ...formData, depreciation_method: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="straight_line">Linie Dreaptă</option>
                    <option value="declining_balance">Sold Degresiv</option>
                    <option value="units_of_production">Unități Producție</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Locație
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="ex: Sediu Central, Etaj 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Număr Serie
                  </label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
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
                  {editingAsset ? 'Actualizează' : 'Creează'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Depreciation Schedule Modal */}
      {showScheduleModal && selectedAsset && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Plan Amortizare - {selectedAsset.asset_name}
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">An</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valoare Inițială</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amortizare</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amortizare Acumulată</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valoare Finală</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {depreciationSchedule.map((item) => (
                    <tr key={item.year} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.year}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatCurrency(item.opening_value)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">
                        {formatCurrency(item.depreciation)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatCurrency(item.accumulated_depreciation)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                        {formatCurrency(item.closing_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedAssetsPage;
