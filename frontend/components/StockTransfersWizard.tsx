'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Search,
  Package,
  MapPin,
  ArrowRightLeft,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Warehouse,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku?: string;
  currentStock: number;
  unit: string;
  category?: string;
}

interface Location {
  id: string;
  name: string;
  type: string;
  warehouseName?: string;
  currentStock?: number;
}

interface StockTransfersWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StockTransfersWizard({ isOpen, onClose, onSuccess }: StockTransfersWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    productId: '',
    productName: '',
    fromLocationId: '',
    fromLocationName: '',
    toLocationId: '',
    toLocationName: '',
    quantity: 0,
    maxQuantity: 0,
    notes: '',
    reference: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchLocations();
      resetForm();
    }
  }, [isOpen]);

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

  async function fetchLocations() {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/logistics/inventory/warehouses', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Flatten warehouses and their locations
        const allLocations: Location[] = [];
        data.warehouses?.forEach((warehouse: any) => {
          warehouse.zones?.forEach((zone: any) => {
            zone.locations?.forEach((location: any) => {
              allLocations.push({
                id: location.id,
                name: `${warehouse.name} - ${zone.name} - ${location.name}`,
                type: location.type,
                warehouseName: warehouse.name,
              });
            });
          });
        });
        setLocations(allLocations);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  }

  function resetForm() {
    setStep(1);
    setFormData({
      productId: '',
      productName: '',
      fromLocationId: '',
      fromLocationName: '',
      toLocationId: '',
      toLocationName: '',
      quantity: 0,
      maxQuantity: 0,
      notes: '',
      reference: '',
    });
    setErrors({});
  }

  function selectProduct(product: Product) {
    setFormData(prev => ({
      ...prev,
      productId: product.id,
      productName: product.name,
      maxQuantity: product.currentStock,
    }));
    setStep(2);
  }

  function validateStep2(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.fromLocationId) {
      newErrors.fromLocation = 'Selectează locația de origine';
    }

    if (!formData.toLocationId) {
      newErrors.toLocation = 'Selectează locația de destinație';
    }

    if (formData.fromLocationId === formData.toLocationId) {
      newErrors.toLocation = 'Locațiile trebuie să fie diferite';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateStep3(): boolean {
    const newErrors: Record<string, string> = {};

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Cantitatea trebuie să fie mai mare decât 0';
    }

    if (formData.quantity > formData.maxQuantity) {
      newErrors.quantity = `Cantitatea maximă disponibilă: ${formData.maxQuantity}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateStep3()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch('/api/logistics/inventory/stock/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId: formData.productId,
          quantity: formData.quantity,
          fromLocationId: formData.fromLocationId,
          toLocationId: formData.toLocationId,
          notes: formData.notes || undefined,
          reference: formData.reference || undefined,
        }),
      });

      if (response.ok) {
        setStep(5); // Success step
        onSuccess?.();
      } else {
        const error = await response.json();
        setErrors({ submit: error.message || 'Failed to transfer stock' });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Transfer Stoc</h2>
              <p className="text-sm text-gray-600">
                Pasul {step} din 4
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
            {['Produs', 'Locații', 'Cantitate', 'Confirmare'].map((label, index) => (
              <div
                key={index}
                className={`flex-1 text-center ${
                  index + 1 <= step ? 'text-purple-600 font-medium' : 'text-gray-400'
                }`}
              >
                <div className="text-xs">{label}</div>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
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
                      className="w-full text-left p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          {product.sku && (
                            <div className="text-xs text-gray-500 font-mono mt-1">{product.sku}</div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm text-gray-600">Disponibil</div>
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

          {/* Step 2: Select Locations */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{formData.productName}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Disponibil: <span className="font-semibold">{formData.maxQuantity}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Schimbă produs
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Locație Origine <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.fromLocationId}
                  onChange={(e) => {
                    const location = locations.find(l => l.id === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      fromLocationId: e.target.value,
                      fromLocationName: location?.name || '',
                    }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                    errors.fromLocation ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selectează locația...</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                {errors.fromLocation && (
                  <p className="text-sm text-red-600 mt-1">{errors.fromLocation}</p>
                )}
              </div>

              <div className="flex items-center justify-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <ArrowRightLeft className="h-5 w-5 text-purple-600" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Locație Destinație <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.toLocationId}
                  onChange={(e) => {
                    const location = locations.find(l => l.id === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      toLocationId: e.target.value,
                      toLocationName: location?.name || '',
                    }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                    errors.toLocation ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={!formData.fromLocationId}
                >
                  <option value="">Selectează locația...</option>
                  {locations
                    .filter(l => l.id !== formData.fromLocationId)
                    .map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                </select>
                {errors.toLocation && (
                  <p className="text-sm text-red-600 mt-1">{errors.toLocation}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Quantity */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Produs:</span>
                  <span className="font-medium text-gray-900">{formData.productName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">De la:</span>
                  <span className="text-sm text-gray-900">{formData.fromLocationName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Către:</span>
                  <span className="text-sm text-gray-900">{formData.toLocationName}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantitate de Transferat <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  max={formData.maxQuantity}
                  step="0.01"
                  placeholder={`Maxim: ${formData.maxQuantity}`}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  autoFocus
                />
                {errors.quantity && (
                  <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Disponibil în locația de origine: {formData.maxQuantity}
                </p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (opțional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Detalii despre transfer..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Verifică datele înainte de confirmare</p>
                  <p>Această acțiune va muta stocul între locații și va crea înregistrări în istoric.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Detalii Transfer</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-gray-600 mb-1">Produs:</dt>
                      <dd className="text-base font-medium text-gray-900">{formData.productName}</dd>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                      <div>
                        <dt className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          De la:
                        </dt>
                        <dd className="text-sm font-medium text-gray-900">{formData.fromLocationName}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Către:
                        </dt>
                        <dd className="text-sm font-medium text-gray-900">{formData.toLocationName}</dd>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <dt className="text-sm text-gray-600 mb-1">Cantitate:</dt>
                      <dd className="text-2xl font-bold text-purple-600">{formData.quantity}</dd>
                    </div>

                    {formData.reference && (
                      <div className="pt-3 border-t">
                        <dt className="text-sm text-gray-600 mb-1">Referință:</dt>
                        <dd className="text-sm font-medium text-gray-900">{formData.reference}</dd>
                      </div>
                    )}

                    {formData.notes && (
                      <div className="pt-3 border-t">
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

          {/* Step 5: Success */}
          {step === 5 && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Transfer Completat!</h3>
              <p className="text-gray-600 mb-6">
                Stocul a fost transferat cu succes.
              </p>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">Produs</div>
                    <div className="text-lg font-bold text-gray-900">{formData.productName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">De la</div>
                      <div className="text-sm font-medium">{formData.fromLocationName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Către</div>
                      <div className="text-sm font-medium">{formData.toLocationName}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Cantitate transferată</div>
                    <div className="text-2xl font-bold text-purple-600">{formData.quantity}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-between">
          {step < 5 ? (
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
                  if (step === 1 && formData.productId) {
                    setStep(2);
                  } else if (step === 2 && validateStep2()) {
                    setStep(3);
                  } else if (step === 3 && validateStep3()) {
                    setStep(4);
                  } else if (step === 4) {
                    handleSubmit();
                  }
                }}
                disabled={
                  submitting ||
                  (step === 1 && !formData.productId) ||
                  (step === 2 && (!formData.fromLocationId || !formData.toLocationId)) ||
                  (step === 3 && formData.quantity <= 0)
                }
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Se procesează...
                  </>
                ) : step === 4 ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Confirmă Transferul
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
              className="w-full bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
            >
              Închide
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
