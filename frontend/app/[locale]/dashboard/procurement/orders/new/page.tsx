'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  ShoppingCart,
  Building2,
  Calendar,
  Plus,
  Trash2,
  AlertCircle,
  FileText,
  Truck,
  CreditCard,
  Package,
  Calculator,
  ChevronDown,
  Search
} from 'lucide-react';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  discount: number;
  total: number;
}

interface PurchaseOrderData {
  supplierId: string;
  supplierName: string;
  orderNumber: string;
  orderDate: string;
  expectedDelivery: string;
  paymentTerms: string;
  currency: string;
  shippingMethod: string;
  shippingAddress: string;
  notes: string;
  internalNotes: string;
  status: 'draft' | 'pending' | 'approved' | 'sent';
}

const SUPPLIERS = [
  { id: 'sup1', name: 'Tech Distribution SRL', cui: 'RO12345678', address: 'Str. Industriei 45, București' },
  { id: 'sup2', name: 'Office Solutions SA', cui: 'RO87654321', address: 'Bd. Unirii 120, Cluj-Napoca' },
  { id: 'sup3', name: 'Import Direct SRL', cui: 'RO11223344', address: 'Str. Portului 8, Constanța' },
  { id: 'sup4', name: 'Food Distributor SRL', cui: 'RO44332211', address: 'Calea Victoriei 200, Timișoara' },
];

const PRODUCTS = [
  { id: 'prod1', name: 'Laptop Dell Latitude 5520', sku: 'ELE-LAP-001', unit: 'buc', price: 4500, vatRate: 19 },
  { id: 'prod2', name: 'Monitor LG 27"', sku: 'ELE-MON-002', unit: 'buc', price: 1200, vatRate: 19 },
  { id: 'prod3', name: 'Tastatură mecanică', sku: 'ELE-KEY-003', unit: 'buc', price: 350, vatRate: 19 },
  { id: 'prod4', name: 'Mouse wireless', sku: 'ELE-MOU-004', unit: 'buc', price: 150, vatRate: 19 },
  { id: 'prod5', name: 'Hârtie A4 (500 coli)', sku: 'OFF-PAP-001', unit: 'top', price: 25, vatRate: 19 },
  { id: 'prod6', name: 'Toner HP LaserJet', sku: 'OFF-TON-002', unit: 'buc', price: 280, vatRate: 19 },
];

const PAYMENT_TERMS = [
  { value: 'immediate', label: 'Plată imediată' },
  { value: 'net15', label: 'Net 15 zile' },
  { value: 'net30', label: 'Net 30 zile' },
  { value: 'net60', label: 'Net 60 zile' },
  { value: 'net90', label: 'Net 90 zile' },
  { value: 'advance', label: 'Avans 50%' },
];

const SHIPPING_METHODS = [
  { value: 'standard', label: 'Transport standard' },
  { value: 'express', label: 'Transport express' },
  { value: 'pickup', label: 'Ridicare de la furnizor' },
  { value: 'courier', label: 'Curier rapid' },
];

const CURRENCIES = [
  { value: 'RON', label: 'RON', symbol: 'lei' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'USD', label: 'USD', symbol: '$' },
];

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [orderData, setOrderData] = useState<PurchaseOrderData>({
    supplierId: '',
    supplierName: '',
    orderNumber: `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
    paymentTerms: 'net30',
    currency: 'RON',
    shippingMethod: 'standard',
    shippingAddress: '',
    notes: '',
    internalNotes: '',
    status: 'draft',
  });

  const [items, setItems] = useState<OrderItem[]>([]);

  const selectedSupplier = SUPPLIERS.find(s => s.id === orderData.supplierId);
  const selectedCurrency = CURRENCIES.find(c => c.value === orderData.currency);

  const updateOrderData = <K extends keyof PurchaseOrderData>(field: K, value: PurchaseOrderData[K]) => {
    setOrderData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const addProduct = (product: typeof PRODUCTS[0]) => {
    const existingItem = items.find(i => i.productId === product.id);
    if (existingItem) {
      updateItemQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      const newItem: OrderItem = {
        id: `item-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unit: product.unit,
        unitPrice: product.price,
        vatRate: product.vatRate,
        discount: 0,
        total: product.price,
      };
      setItems(prev => [...prev, newItem]);
    }
    setShowProductSearch(false);
    setProductSearch('');
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const discountedPrice = item.unitPrice * (1 - item.discount / 100);
          return { ...item, quantity, total: quantity * discountedPrice };
        }
        return item;
      })
    );
  };

  const updateItemDiscount = (itemId: string, discount: number) => {
    if (discount < 0 || discount > 100) return;
    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const discountedPrice = item.unitPrice * (1 - discount / 100);
          return { ...item, discount, total: item.quantity * discountedPrice };
        }
        return item;
      })
    );
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateVAT = () => {
    return items.reduce((sum, item) => {
      const vatAmount = item.total * (item.vatRate / 100);
      return sum + vatAmount;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const filteredProducts = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!orderData.supplierId) {
      newErrors.supplierId = 'Selectați un furnizor';
    }
    if (!orderData.expectedDelivery) {
      newErrors.expectedDelivery = 'Selectați data livrării';
    }
    if (items.length === 0) {
      newErrors.items = 'Adăugați cel puțin un produs';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (status: PurchaseOrderData['status']) => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const orderPayload = {
        ...orderData,
        status,
        items,
        subtotal: calculateSubtotal(),
        vat: calculateVAT(),
        total: calculateTotal(),
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('Order created:', orderPayload);
      router.push('/dashboard/procurement/orders');
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comandă de achiziție nouă</h1>
            <p className="text-gray-500">Creați o comandă către furnizor</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Nr. comandă:</span>
          <span className="font-mono font-medium text-gray-900">{orderData.orderNumber}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Selection */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Furnizor
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selectați furnizorul <span className="text-red-500">*</span>
                </label>
                <select
                  value={orderData.supplierId}
                  onChange={(e) => {
                    const supplier = SUPPLIERS.find(s => s.id === e.target.value);
                    updateOrderData('supplierId', e.target.value);
                    updateOrderData('supplierName', supplier?.name || '');
                    updateOrderData('shippingAddress', supplier?.address || '');
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.supplierId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Alegeți un furnizor</option>
                  {SUPPLIERS.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} (CUI: {supplier.cui})
                    </option>
                  ))}
                </select>
                {errors.supplierId && <p className="text-red-500 text-sm mt-1">{errors.supplierId}</p>}
              </div>

              {selectedSupplier && (
                <div className="md:col-span-2 p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium text-gray-900">{selectedSupplier.name}</p>
                  <p className="text-gray-600">CUI: {selectedSupplier.cui}</p>
                  <p className="text-gray-600">{selectedSupplier.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Produse comandate
              </h2>
              <button
                type="button"
                onClick={() => setShowProductSearch(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                <Plus className="w-4 h-4" />
                Adaugă produs
              </button>
            </div>

            {/* Product Search Modal */}
            {showProductSearch && (
              <div className="mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Caută produs după nume sau SKU..."
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="w-full flex items-center justify-between p-2 hover:bg-white rounded-lg transition text-left"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.sku}</p>
                      </div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(product.price)} {selectedCurrency?.symbol}
                      </p>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Nu s-au găsit produse</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowProductSearch(false);
                    setProductSearch('');
                  }}
                  className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Anulează
                </button>
              </div>
            )}

            {errors.items && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{errors.items}</span>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nu ați adăugat niciun produs.</p>
                <p className="text-sm">Folosiți butonul "Adaugă produs" pentru a începe.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Produs</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Cantitate</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Preț unitar</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Disc. %</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">TVA</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Total</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-3 px-2">
                          <p className="font-medium text-gray-900 text-sm">{item.productName}</p>
                          <p className="text-xs text-gray-500">{item.sku}</p>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <span className="text-gray-500">-</span>
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-16 text-center text-sm border border-gray-200 rounded px-2 py-1"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <span className="text-gray-500">+</span>
                            </button>
                            <span className="text-xs text-gray-500 ml-1">{item.unit}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right text-sm text-gray-900">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount || ''}
                            onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                            className="w-16 text-center text-sm border border-gray-200 rounded px-2 py-1"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-3 px-2 text-right text-sm text-gray-600">
                          {item.vatRate}%
                        </td>
                        <td className="py-3 px-2 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="py-3 px-2">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Delivery & Notes */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-green-600" />
              Livrare și note
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metodă livrare
                </label>
                <select
                  value={orderData.shippingMethod}
                  onChange={(e) => updateOrderData('shippingMethod', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SHIPPING_METHODS.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresă livrare
                </label>
                <input
                  type="text"
                  value={orderData.shippingAddress}
                  onChange={(e) => updateOrderData('shippingAddress', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Adresa de livrare"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note pentru furnizor
                </label>
                <textarea
                  value={orderData.notes}
                  onChange={(e) => updateOrderData('notes', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Instrucțiuni speciale, cerințe de ambalare, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note interne
                </label>
                <textarea
                  value={orderData.internalNotes}
                  onChange={(e) => updateOrderData('internalNotes', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Note pentru uz intern (nu vor fi trimise furnizorului)"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Detalii comandă
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data comandă
                </label>
                <input
                  type="date"
                  value={orderData.orderDate}
                  onChange={(e) => updateOrderData('orderDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data livrare estimată <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={orderData.expectedDelivery}
                  onChange={(e) => updateOrderData('expectedDelivery', e.target.value)}
                  min={orderData.orderDate}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.expectedDelivery ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.expectedDelivery && <p className="text-red-500 text-sm mt-1">{errors.expectedDelivery}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monedă
                </label>
                <select
                  value={orderData.currency}
                  onChange={(e) => updateOrderData('currency', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CURRENCIES.map(cur => (
                    <option key={cur.value} value={cur.value}>{cur.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Termen de plată
                </label>
                <select
                  value={orderData.paymentTerms}
                  onChange={(e) => updateOrderData('paymentTerms', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {PAYMENT_TERMS.map(term => (
                    <option key={term.value} value={term.value}>{term.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Sumar comandă
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal ({items.length} produse)</span>
                <span className="text-gray-900">{formatCurrency(calculateSubtotal())} {selectedCurrency?.symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">TVA</span>
                <span className="text-gray-900">{formatCurrency(calculateVAT())} {selectedCurrency?.symbol}</span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-lg text-gray-900">
                  {formatCurrency(calculateTotal())} {selectedCurrency?.symbol}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={isSubmitting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                <FileText className="w-4 h-4 inline-block mr-2" />
                Salvează ciornă
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('pending')}
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4 inline-block mr-2" />
                Trimite pentru aprobare
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('sent')}
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4 inline-block mr-2" />
                {isSubmitting ? 'Se procesează...' : 'Aprobă și trimite la furnizor'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
