'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button } from '@/components/ui/modal';
import { useCompanyStore } from '@/lib/store/company-store';
import {
  Package,
  Tag,
  Hash,
  DollarSign,
  Percent,
  Boxes,
  BarChart3,
  Check,
  AlertTriangle,
} from 'lucide-react';

// Product types
type ProductType = 'product' | 'service';
type ProductStatus = 'active' | 'inactive';

interface ProductFormData {
  name: string;
  code: string;
  type: ProductType;
  category: string;
  description: string;
  unit: string;
  price: number;
  vatRate: number;
  currency: string;
  stock: number;
  minStock: number;
  costPrice: number;
  barcode: string;
  status: ProductStatus;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingProduct?: ProductFormData & { id: string };
}

// Romanian VAT rates
const vatRates = [
  { value: 19, label: 'TVA Standard (19%)' },
  { value: 9, label: 'TVA Redus (9%)' },
  { value: 5, label: 'TVA Redus (5%)' },
  { value: 0, label: 'TVA 0% / Scutit' },
];

// Unit types
const unitTypes = [
  { value: 'buc', label: 'Bucată (buc)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'l', label: 'Litru (l)' },
  { value: 'm', label: 'Metru (m)' },
  { value: 'm2', label: 'Metru pătrat (m²)' },
  { value: 'm3', label: 'Metru cub (m³)' },
  { value: 'oră', label: 'Oră' },
  { value: 'zi', label: 'Zi' },
  { value: 'lună', label: 'Lună' },
  { value: 'an', label: 'An' },
  { value: 'proiect', label: 'Proiect' },
  { value: 'pachet', label: 'Pachet' },
  { value: 'set', label: 'Set' },
];

// Product categories
const productCategories = [
  'Echipamente IT',
  'Consumabile',
  'Mobilier',
  'Materiale construcții',
  'Piese auto',
  'Alimente',
  'Băuturi',
  'Cosmetice',
  'Haine',
  'Accesorii',
  'Altele',
];

// Service categories
const serviceCategories = [
  'Servicii profesionale',
  'Consultanță',
  'Dezvoltare software',
  'Design',
  'Marketing',
  'Contabilitate',
  'Juridic',
  'Transport',
  'Reparații',
  'Mentenanță',
  'Training',
  'Altele',
];

const initialFormData: ProductFormData = {
  name: '',
  code: '',
  type: 'product',
  category: '',
  description: '',
  unit: 'buc',
  price: 0,
  vatRate: 19,
  currency: 'RON',
  stock: 0,
  minStock: 0,
  costPrice: 0,
  barcode: '',
  status: 'active',
};

export function ProductModal({ isOpen, onClose, onSuccess, editingProduct }: ProductModalProps) {
  const { selectedCompanyId } = useCompanyStore();
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  // Reset form when modal opens/closes or editing product changes
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setFormData({
          name: editingProduct.name,
          code: editingProduct.code,
          type: editingProduct.type,
          category: editingProduct.category,
          description: editingProduct.description,
          unit: editingProduct.unit,
          price: editingProduct.price,
          vatRate: editingProduct.vatRate,
          currency: editingProduct.currency,
          stock: editingProduct.stock,
          minStock: editingProduct.minStock,
          costPrice: editingProduct.costPrice,
          barcode: editingProduct.barcode,
          status: editingProduct.status,
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
    }
  }, [isOpen, editingProduct]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Numele este obligatoriu';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Codul este obligatoriu';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Prețul trebuie să fie mai mare decât 0';
    }

    if (formData.type === 'product' && formData.stock < 0) {
      newErrors.stock = 'Stocul nu poate fi negativ';
    }

    if (formData.costPrice > formData.price) {
      newErrors.costPrice = 'Prețul de achiziție nu poate fi mai mare decât prețul de vânzare';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!selectedCompanyId) {
      alert('Selectează o firmă mai întâi');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingProduct
        ? `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v2/products/${editingProduct.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v2/products`;

      const response = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Company-ID': selectedCompanyId,
        },
        body: JSON.stringify({
          ...formData,
          companyId: selectedCompanyId,
        }),
      });

      if (!response.ok) {
        throw new Error('Eroare la salvare');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('A apărut o eroare la salvarea produsului');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Generate product code automatically
  const generateCode = () => {
    const prefix = formData.type === 'product' ? 'PRD' : 'SRV';
    const random = Math.floor(Math.random() * 9000) + 1000;
    handleInputChange('code', `${prefix}-${random}`);
  };

  // Calculate profit margin
  const profitMargin = formData.costPrice > 0
    ? ((formData.price - formData.costPrice) / formData.costPrice * 100).toFixed(1)
    : null;

  const categories = formData.type === 'product' ? productCategories : serviceCategories;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? 'Editează Produs' : 'Produs/Serviciu Nou'}
      description={editingProduct ? 'Modifică detaliile produsului' : 'Adaugă un produs sau serviciu nou în catalog'}
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-6">
          {/* Product Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Tip Articol
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  handleInputChange('type', 'product');
                  handleInputChange('unit', 'buc');
                }}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'product'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  formData.type === 'product'
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Package className={`w-6 h-6 ${
                    formData.type === 'product'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500'
                  }`} />
                </div>
                <div className="text-left">
                  <p className={`font-medium ${
                    formData.type === 'product'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Produs
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Bun fizic cu stoc
                  </p>
                </div>
                {formData.type === 'product' && (
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-auto" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleInputChange('type', 'service');
                  handleInputChange('unit', 'oră');
                  handleInputChange('stock', 0);
                  handleInputChange('minStock', 0);
                }}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'service'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  formData.type === 'service'
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Tag className={`w-6 h-6 ${
                    formData.type === 'service'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-500'
                  }`} />
                </div>
                <div className="text-left">
                  <p className={`font-medium ${
                    formData.type === 'service'
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Serviciu
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Prestație fără stoc
                  </p>
                </div>
                {formData.type === 'service' && (
                  <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 ml-auto" />
                )}
              </button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Denumire *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                }`}
                placeholder={formData.type === 'product' ? 'Laptop HP ProBook 450' : 'Consultanță fiscală'}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cod Intern *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                      errors.code ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    }`}
                    placeholder="PRD-001"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateCode}
                  className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-600 dark:text-gray-400"
                >
                  Auto
                </button>
              </div>
              {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categorie
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selectează categorie</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descriere
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Descriere opțională a produsului/serviciului..."
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Preț și TVA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preț Vânzare *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price || ''}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    className={`w-full pl-10 pr-16 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.price ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    }`}
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    {formData.currency}
                  </span>
                </div>
                {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
              </div>

              {/* VAT Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cotă TVA
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.vatRate}
                    onChange={(e) => handleInputChange('vatRate', parseInt(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {vatRates.map(rate => (
                      <option key={rate.value} value={rate.value}>{rate.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unitate Măsură
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {unitTypes.map(unit => (
                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                  ))}
                </select>
              </div>

              {/* Cost Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preț Achiziție (Cost)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice || ''}
                    onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                    className={`w-full pl-10 pr-16 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.costPrice ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    }`}
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    {formData.currency}
                  </span>
                </div>
                {errors.costPrice && <p className="mt-1 text-sm text-red-500">{errors.costPrice}</p>}
              </div>

              {/* Profit Margin Display */}
              {profitMargin && parseFloat(profitMargin) > 0 && (
                <div className="md:col-span-2 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Marjă de profit: <strong>{profitMargin}%</strong> ({((formData.price - formData.costPrice)).toFixed(2)} {formData.currency})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stock (only for products) */}
          {formData.type === 'product' && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Gestiune Stoc
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Current Stock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stoc Curent
                  </label>
                  <div className="relative">
                    <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      value={formData.stock || ''}
                      onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                      className={`w-full pl-10 pr-16 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.stock ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                      }`}
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      {formData.unit}
                    </span>
                  </div>
                  {errors.stock && <p className="mt-1 text-sm text-red-500">{errors.stock}</p>}
                </div>

                {/* Minimum Stock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stoc Minim (Alertă)
                  </label>
                  <div className="relative">
                    <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      value={formData.minStock || ''}
                      onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                      className="w-full pl-10 pr-16 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      {formData.unit}
                    </span>
                  </div>
                </div>

                {/* Barcode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cod de Bare
                  </label>
                  <div className="relative">
                    <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => handleInputChange('barcode', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="5901234123457"
                    />
                  </div>
                </div>

                {/* Stock Warning */}
                {formData.stock > 0 && formData.minStock > 0 && formData.stock <= formData.minStock && (
                  <div className="md:col-span-3 flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm text-yellow-700 dark:text-yellow-300">
                      Stocul curent este sub nivelul minim setat. Se va genera alertă.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.status === 'active'}
                  onChange={(e) => handleInputChange('status', e.target.checked ? 'active' : 'inactive')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formData.status === 'active' ? 'Activ' : 'Inactiv'} - Articolul {formData.status === 'active' ? 'poate fi' : 'nu poate fi'} adăugat pe facturi
                </span>
              </label>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Anulează
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {editingProduct ? 'Salvează Modificările' : 'Adaugă Articol'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
