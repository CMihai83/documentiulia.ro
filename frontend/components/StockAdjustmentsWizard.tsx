'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  Edit,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku?: string;
  currentStock: number;
  unit: string;
  category?: string;
}

interface StockAdjustmentsWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StockAdjustmentsWizard({ isOpen, onClose, onSuccess }: StockAdjustmentsWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    productId: '',
    productName: '',
    currentStock: 0,
    adjustmentType: 'INCREASE' as 'INCREASE' | 'DECREASE' | 'SET',
    quantity: 0,
    newStock: 0,
    reason: '',
    notes: '',
    reference: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    calculateNewStock();
  }, [formData.adjustmentType, formData.quantity, formData.currentStock]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/inventory/products', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setStep(1);
    setFormData({
      productId: '',
      productName: '',
      currentStock: 0,
      adjustmentType: 'INCREASE',
      quantity: 0,
      newStock: 0,
      reason: '',
      notes: '',
      reference: '',
    });
    setErrors({});
  }

  function calculateNewStock() {
    let newStock = formData.currentStock;

    switch (formData.adjustmentType) {
      case 'INCREASE':
        newStock = formData.currentStock + formData.quantity;
        break;
      case 'DECREASE':
        newStock = formData.currentStock - formData.quantity;
        break;
      case 'SET':
        newStock = formData.quantity;
        break;
    }

    setFormData(prev => ({ ...prev, newStock }));
  }

  function selectProduct(product: Product) {
    setFormData(prev => ({
      ...prev,
      productId: product.id,
      productName: product.name,
      currentStock: product.currentStock,
    }));
    setStep(2);
  }

  function validateStep2(): boolean {
    const newErrors: Record<string, string> = {};

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Cantitatea trebuie să fie mai mare decât 0';
    }

    if (formData.adjustmentType === 'DECREASE' && formData.quantity > formData.currentStock) {
      newErrors.quantity = 'Nu poți scădea mai mult decât stocul actual';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Motivul este obligatoriu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateStep2()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');

      // Determine the final quantity based on adjustment type
      let adjustedQuantity = formData.quantity;
      if (formData.adjustmentType === 'DECREASE') {
        adjustedQuantity = -formData.quantity;
      } else if (formData.adjustmentType === 'SET') {
        adjustedQuantity = formData.quantity - formData.currentStock;
      }

      const response = await fetch('/api/inventory/stock/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: formData.productId,
          quantity: adjustedQuantity,
          type: 'ADJUSTMENT',
          reference: formData.reference || undefined,
          referenceType: 'MANUAL',
          notes: `${formData.reason}${formData.notes ? ` - ${formData.notes}` : ''}`,
        }),
      });

      if (response.ok) {
        setStep(4); // Success step
        onSuccess?.();
      } else {
        const error = await response.json();
        setErrors({ submit: error.message || 'Failed to adjust stock' });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'An error occurred' });
    } finally {
      setSubmitting(false);
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const reasonOptions = [
    'Inventariere - surplus',
    'Inventariere - lipsă',
    'Deteriorare',
    'Expirare',
    'Returnare de la client',
    'Eșantion folosit',
    'Transfer între locații',
    'Corectare eroare înregistrare',
    'Altele',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Edit className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Ajustare Stoc</h2>
              <p className="text-sm text-gray-600">
                Pasul {step} din 3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {['Selectează Produs', 'Ajustare', 'Confirmare'].map((label, index) => (
              <div
                key={index}
                className={`flex-1 text-center ${
                  index + 1 <= step ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}
              >
                <div className="text-xs">{label}</div>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {/* Step 1: Select Product */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caută Produs
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nume sau SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Niciun produs găsit</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => selectProduct(product)}
                      className="w-full text-left p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          {product.sku && (
                            <div className="text-xs text-gray-500 font-mono mt-1">{product.sku}</div>
                          )}
                          {product.category && (
                            <div className="text-xs text-gray-500 mt-1">{product.category}</div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm text-gray-600">Stoc curent</div>
                          <div className="text-lg font-bold text-gray-900">
                            {product.currentStock} {product.unit}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Adjustment Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{formData.productName}</div>
                    <div className="text-sm text-gray-600 mt-1">Stoc curent: <span className="font-semibold">{formData.currentStock}</span></div>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Schimbă produs
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tip Ajustare
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, adjustmentType: 'INCREASE', quantity: 0 }))}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      formData.adjustmentType === 'INCREASE'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <TrendingUp className={`h-6 w-6 mx-auto mb-1 ${
                      formData.adjustmentType === 'INCREASE' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-medium">Creștere</div>
                  </button>

                  <button
                    onClick={() => setFormData(prev => ({ ...prev, adjustmentType: 'DECREASE', quantity: 0 }))}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      formData.adjustmentType === 'DECREASE'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <TrendingDown className={`h-6 w-6 mx-auto mb-1 ${
                      formData.adjustmentType === 'DECREASE' ? 'text-red-600' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-medium">Scădere</div>
                  </button>

                  <button
                    onClick={() => setFormData(prev => ({ ...prev, adjustmentType: 'SET', quantity: 0 }))}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      formData.adjustmentType === 'SET'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Edit className={`h-6 w-6 mx-auto mb-1 ${
                      formData.adjustmentType === 'SET' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-medium">Setare</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.adjustmentType === 'SET' ? 'Stoc Nou' : 'Cantitate'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.quantity && (
                  <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-800 font-medium">Previzualizare:</span>
                </div>
                <div className="flex items-center justify-between text-lg">
                  <div>
                    <span className="text-gray-600">Stoc curent:</span>
                    <span className="font-bold ml-2">{formData.currentStock}</span>
                  </div>
                  <div className="text-2xl text-blue-600">→</div>
                  <div>
                    <span className="text-gray-600">Stoc nou:</span>
                    <span className={`font-bold ml-2 ${
                      formData.newStock < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formData.newStock}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motiv <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.reason ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selectează motivul...</option>
                  {reasonOptions.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
                {errors.reason && (
                  <p className="text-sm text-red-600 mt-1">{errors.reason}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referință (opțional)
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Nr. document, bon, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note Suplimentare (opțional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Detalii suplimentare despre ajustare..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Verifică datele înainte de confirmare</p>
                  <p>Această acțiune va modifica stocul și va crea o înregistrare în istoric.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Detalii Ajustare</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Produs:</dt>
                      <dd className="text-sm font-medium text-gray-900">{formData.productName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Tip ajustare:</dt>
                      <dd className="text-sm font-medium">
                        {formData.adjustmentType === 'INCREASE' && 'Creștere'}
                        {formData.adjustmentType === 'DECREASE' && 'Scădere'}
                        {formData.adjustmentType === 'SET' && 'Setare'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Cantitate:</dt>
                      <dd className="text-sm font-medium">{formData.quantity}</dd>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <dt className="text-sm text-gray-600">Stoc curent:</dt>
                      <dd className="text-sm font-medium">{formData.currentStock}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Stoc după ajustare:</dt>
                      <dd className={`text-sm font-bold ${
                        formData.newStock < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formData.newStock}
                      </dd>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <dt className="text-sm text-gray-600">Motiv:</dt>
                      <dd className="text-sm font-medium text-right">{formData.reason}</dd>
                    </div>
                    {formData.reference && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Referință:</dt>
                        <dd className="text-sm font-medium">{formData.reference}</dd>
                      </div>
                    )}
                    {formData.notes && (
                      <div className="pt-2 border-t">
                        <dt className="text-sm text-gray-600 mb-1">Note:</dt>
                        <dd className="text-sm text-gray-900">{formData.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                  {errors.submit}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Ajustare Completată!</h3>
              <p className="text-gray-600 mb-6">
                Stocul pentru {formData.productName} a fost actualizat cu succes.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 inline-block">
                <div className="text-sm text-gray-600">Stoc nou:</div>
                <div className="text-3xl font-bold text-green-600">{formData.newStock}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-between">
          {step < 4 ? (
            <>
              <button
                onClick={() => setStep(prev => Math.max(1, prev - 1))}
                disabled={step === 1}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Înapoi
              </button>

              <button
                onClick={() => {
                  if (step === 2 && validateStep2()) {
                    setStep(3);
                  } else if (step === 3) {
                    handleSubmit();
                  }
                }}
                disabled={submitting || (step === 1 && !formData.productId)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Se procesează...
                  </>
                ) : step === 3 ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Confirmă Ajustarea
                  </>
                ) : (
                  <>
                    Continuă
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Închide
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
