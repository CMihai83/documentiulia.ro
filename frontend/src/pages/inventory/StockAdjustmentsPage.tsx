import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Package, Warehouse, Settings, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  unit_of_measure: string;
}

interface Warehouse {
  id: string;
  name: string;
  location_name: string;
}

interface AdjustmentItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  current_quantity: number;
  adjustment_quantity: number;
  adjustment_type: 'add' | 'subtract';
  new_quantity: number;
}

export default function StockAdjustmentsPage() {
  const [step, setStep] = useState(1);
  const [warehouse, setWarehouse] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<AdjustmentItem[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(`/api/v1/inventory/warehouses.php?company_id=${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(`/api/v1/inventory/products.php?company_id=${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addProduct = (product: Product) => {
    if (selectedProducts.find(p => p.product_id === product.id)) {
      return; // Already added
    }

    const newItem: AdjustmentItem = {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      current_quantity: 0, // Would fetch actual from stock_levels
      adjustment_quantity: 0,
      adjustment_type: 'add',
      new_quantity: 0
    };

    setSelectedProducts([...selectedProducts, newItem]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
  };

  const updateAdjustment = (productId: string, field: string, value: any) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.product_id === productId) {
        const updated = { ...p, [field]: value };

        // Recalculate new quantity
        if (field === 'adjustment_quantity' || field === 'adjustment_type') {
          const qty = typeof value === 'number' ? value : updated.adjustment_quantity;
          const type = typeof value === 'string' ? value : updated.adjustment_type;
          updated.new_quantity = type === 'add'
            ? updated.current_quantity + qty
            : updated.current_quantity - qty;
        }

        return updated;
      }
      return p;
    }));
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      setError('Adăugați cel puțin un produs');
      return;
    }

    if (!reason) {
      setError('Selectați un motiv pentru ajustare');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      // Process each adjustment
      for (const item of selectedProducts) {
        const response = await fetch('/api/v1/inventory/stock-adjustment.php', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            company_id: companyId,
            warehouse_id: warehouse,
            product_id: item.product_id,
            quantity: item.adjustment_type === 'add' ? item.adjustment_quantity : -item.adjustment_quantity,
            reason: reason,
            notes: notes
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to adjust ${item.product_name}`);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        resetWizard();
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Eroare la procesarea ajustărilor');
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setWarehouse('');
    setSelectedProducts([]);
    setReason('');
    setNotes('');
    setSuccess(false);
    setError('');
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return warehouse !== '';
      case 2:
        return selectedProducts.length > 0;
      case 3:
        return selectedProducts.every(p => p.adjustment_quantity > 0);
      case 4:
        return reason !== '';
      default:
        return false;
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ajustare Completată!</h2>
          <p className="text-gray-600">Stocurile au fost actualizate cu succes.</p>
          <button
            onClick={resetWizard}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Creează Altă Ajustare
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Ajustare Stoc</h1>
        <p className="text-sm text-gray-600 mt-1">Adaugă sau scade cantități din stoc cu motiv</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((s, index) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step >= s ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-400'
              }`}>
                {s}
              </div>
              {index < 4 && (
                <div className={`w-12 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>Depozit</span>
          <span>Produse</span>
          <span>Cantități</span>
          <span>Motiv</span>
          <span>Verificare</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Eroare</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-5 h-5 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 min-h-[400px]">
        {/* Step 1: Select Warehouse */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <Warehouse className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Selectează Depozitul</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warehouses.map((wh) => (
                <button
                  key={wh.id}
                  onClick={() => setWarehouse(wh.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    warehouse === wh.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{wh.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{wh.location_name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Products */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Selectează Produsele</h2>
            </div>

            <div className="space-y-4">
              {/* Product Search/Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adaugă Produse:</label>
                <select
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    if (product) addProduct(product);
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selectează un produs...</option>
                  {products.filter(p => !selectedProducts.find(sp => sp.product_id === p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              {/* Selected Products List */}
              {selectedProducts.length > 0 && (
                <div className="border border-gray-200 rounded-lg divide-y">
                  {selectedProducts.map((item) => (
                    <div key={item.product_id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{item.product_name}</div>
                        <div className="text-sm text-gray-600">SKU: {item.product_sku}</div>
                      </div>
                      <button
                        onClick={() => removeProduct(item.product_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Set Quantities */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Setează Cantitățile</h2>
            </div>

            <div className="space-y-4">
              {selectedProducts.map((item) => (
                <div key={item.product_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-3">{item.product_name}</div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Tip Ajustare</label>
                      <select
                        value={item.adjustment_type}
                        onChange={(e) => updateAdjustment(item.product_id, 'adjustment_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="add">Adaugă (+)</option>
                        <option value="subtract">Scade (-)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Cantitate</label>
                      <input
                        type="number"
                        min="0"
                        value={item.adjustment_quantity}
                        onChange={(e) => updateAdjustment(item.product_id, 'adjustment_quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Rezultat</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                        <span className={item.adjustment_type === 'add' ? 'text-green-600' : 'text-red-600'}>
                          {item.adjustment_type === 'add' ? '+' : '-'}{item.adjustment_quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Reason & Notes */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Motiv și Notițe</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motiv Ajustare <span className="text-red-600">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selectează motivul...</option>
                  <option value="damage">Deteriorare</option>
                  <option value="loss">Pierdere</option>
                  <option value="found">Găsit</option>
                  <option value="correction">Corectare Inventar</option>
                  <option value="revaluation">Reevaluare</option>
                  <option value="other">Altele</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notițe (opțional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Adaugă detalii suplimentare..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Verifică și Confirmă</h2>
            </div>

            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Depozit:</span>
                  <span className="font-medium text-gray-900">
                    {warehouses.find(w => w.id === warehouse)?.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Produse:</span>
                  <span className="font-medium text-gray-900">{selectedProducts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Motiv:</span>
                  <span className="font-medium text-gray-900">{reason}</span>
                </div>
              </div>

              {/* Product Details */}
              <div className="border border-gray-200 rounded-lg divide-y">
                {selectedProducts.map((item) => (
                  <div key={item.product_id} className="p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{item.product_name}</div>
                      <div className="text-sm text-gray-600">SKU: {item.product_sku}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${item.adjustment_type === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.adjustment_type === 'add' ? '+' : '-'}{item.adjustment_quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-yellow-800 mb-1">Notițe:</div>
                  <div className="text-sm text-yellow-700">{notes}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Înapoi
        </button>

        {step < 5 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Următorul
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Se procesează...' : 'Confirmă Ajustare'}
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
