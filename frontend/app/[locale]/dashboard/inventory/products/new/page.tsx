'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Package,
  Barcode,
  Upload,
  X,
  Plus,
  Minus,
  AlertCircle,
  Info,
  Tag,
  Layers,
  Truck,
  Euro,
  Percent,
  Box,
  Image as ImageIcon,
  Calculator
} from 'lucide-react';

interface ProductFormData {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  vatRate: number;
  currency: string;
  minStock: number;
  maxStock: number;
  currentStock: number;
  reorderPoint: number;
  location: string;
  supplier: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  isActive: boolean;
  isService: boolean;
  trackInventory: boolean;
  allowBackorder: boolean;
}

const CATEGORIES = [
  { value: 'electronics', label: 'Electronice', subcategories: ['Calculatoare', 'Telefoane', 'Accesorii', 'Componente'] },
  { value: 'office', label: 'Birotic\u0103', subcategories: ['Papetărie', 'Mobilier', 'Consumabile', 'Echipamente'] },
  { value: 'food', label: 'Alimente', subcategories: ['Băuturi', 'Produse uscate', 'Produse refrigerate', 'Conserve'] },
  { value: 'clothing', label: 'Îmbrăcăminte', subcategories: ['Bărbați', 'Femei', 'Copii', 'Accesorii'] },
  { value: 'construction', label: 'Construcții', subcategories: ['Materiale', 'Unelte', 'Echipamente', 'Instalații'] },
  { value: 'automotive', label: 'Auto', subcategories: ['Piese', 'Uleiuri', 'Accesorii', 'Consumabile'] },
  { value: 'medical', label: 'Medical', subcategories: ['Medicamente', 'Echipamente', 'Consumabile', 'Dispozitive'] },
  { value: 'other', label: 'Altele', subcategories: ['Diverse'] },
];

const UNITS = [
  { value: 'buc', label: 'Bucăți (buc)' },
  { value: 'kg', label: 'Kilograme (kg)' },
  { value: 'l', label: 'Litri (l)' },
  { value: 'm', label: 'Metri (m)' },
  { value: 'm2', label: 'Metri pătrați (m²)' },
  { value: 'm3', label: 'Metri cubi (m³)' },
  { value: 'set', label: 'Set' },
  { value: 'palet', label: 'Palet' },
  { value: 'cutie', label: 'Cutie' },
  { value: 'ora', label: 'Oră' },
];

const VAT_RATES = [
  { value: 19, label: '19% - Standard' },
  { value: 9, label: '9% - Redus (alimente, medicamente)' },
  { value: 5, label: '5% - Special' },
  { value: 0, label: '0% - Scutit TVA' },
];

const CURRENCIES = [
  { value: 'RON', label: 'RON - Leu românesc', symbol: 'lei' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'USD', label: 'USD - Dolar american', symbol: '$' },
];

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    category: '',
    subcategory: '',
    brand: '',
    unit: 'buc',
    purchasePrice: 0,
    salePrice: 0,
    vatRate: 19,
    currency: 'RON',
    minStock: 0,
    maxStock: 0,
    currentStock: 0,
    reorderPoint: 0,
    location: '',
    supplier: '',
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    isActive: true,
    isService: false,
    trackInventory: true,
    allowBackorder: false,
  });

  const selectedCategory = CATEGORIES.find(c => c.value === formData.category);
  const selectedCurrency = CURRENCIES.find(c => c.value === formData.currency);

  const updateField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const generateSKU = () => {
    const prefix = formData.category ? formData.category.substring(0, 3).toUpperCase() : 'PRD';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString(36).substring(-4).toUpperCase();
    updateField('sku', `${prefix}-${random}-${timestamp}`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const calculateMargin = (): string => {
    if (formData.purchasePrice === 0) return '0';
    return ((formData.salePrice - formData.purchasePrice) / formData.purchasePrice * 100).toFixed(1);
  };

  const calculatePriceWithVAT = () => {
    return formData.salePrice * (1 + formData.vatRate / 100);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Numele produsului este obligatoriu';
    }
    if (!formData.sku.trim()) {
      newErrors.sku = 'Codul SKU este obligatoriu';
    }
    if (!formData.category) {
      newErrors.category = 'Selectați o categorie';
    }
    if (formData.salePrice <= 0) {
      newErrors.salePrice = 'Prețul de vânzare trebuie să fie pozitiv';
    }
    if (formData.trackInventory && formData.minStock < 0) {
      newErrors.minStock = 'Stocul minim nu poate fi negativ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      const formDataToSend = new FormData();
      formDataToSend.append('product', JSON.stringify(formData));
      images.forEach((img, i) => {
        formDataToSend.append(`image_${i}`, img.file);
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Success - redirect to products list
      router.push('/dashboard/inventory/products');
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
            <h1 className="text-2xl font-bold text-gray-900">Produs nou</h1>
            <p className="text-gray-500">Adăugați un nou produs în inventar</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Informații de bază
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nume produs <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="ex: Laptop Dell Latitude 5520"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cod SKU <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => updateField('sku', e.target.value.toUpperCase())}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                    errors.sku ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="ex: ELE-ABC123-XYZ"
                />
                <button
                  type="button"
                  onClick={generateSKU}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Generează
                </button>
              </div>
              {errors.sku && <p className="text-red-500 text-sm mt-1">{errors.sku}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cod bare (EAN/UPC)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => updateField('barcode', e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="ex: 5901234123457"
                />
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categorie <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => {
                  updateField('category', e.target.value);
                  updateField('subcategory', '');
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.category ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Selectați categoria</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subcategorie
              </label>
              <select
                value={formData.subcategory}
                onChange={(e) => updateField('subcategory', e.target.value)}
                disabled={!formData.category}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Selectați subcategoria</option>
                {selectedCategory?.subcategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand / Producător
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => updateField('brand', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ex: Dell, Samsung, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unitate de măsură
              </label>
              <select
                value={formData.unit}
                onChange={(e) => updateField('unit', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {UNITS.map(unit => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descriere
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descriere detaliată a produsului..."
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Euro className="w-5 h-5 text-green-600" />
            Prețuri
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monedă
              </label>
              <select
                value={formData.currency}
                onChange={(e) => updateField('currency', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CURRENCIES.map(cur => (
                  <option key={cur.value} value={cur.value}>{cur.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preț achiziție (fără TVA)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchasePrice || ''}
                  onChange={(e) => updateField('purchasePrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {selectedCurrency?.symbol}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preț vânzare (fără TVA) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salePrice || ''}
                  onChange={(e) => updateField('salePrice', parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.salePrice ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {selectedCurrency?.symbol}
                </span>
              </div>
              {errors.salePrice && <p className="text-red-500 text-sm mt-1">{errors.salePrice}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cotă TVA
              </label>
              <select
                value={formData.vatRate}
                onChange={(e) => updateField('vatRate', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {VAT_RATES.map(rate => (
                  <option key={rate.value} value={rate.value}>{rate.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preț cu TVA
              </label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg font-medium text-gray-900">
                {calculatePriceWithVAT().toFixed(2)} {selectedCurrency?.symbol}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marjă profit
              </label>
              <div className={`px-4 py-2 rounded-lg font-medium ${
                parseFloat(calculateMargin()) > 0
                  ? 'bg-green-100 text-green-800'
                  : parseFloat(calculateMargin()) < 0
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {calculateMargin()}%
              </div>
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            Stocuri
          </h2>

          <div className="mb-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.trackInventory}
                onChange={(e) => updateField('trackInventory', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Urmărește stocul</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isService}
                onChange={(e) => updateField('isService', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Este serviciu (fără stoc fizic)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowBackorder}
                onChange={(e) => updateField('allowBackorder', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Permite comenzi în backorder</span>
            </label>
          </div>

          {formData.trackInventory && !formData.isService && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stoc curent
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.currentStock || ''}
                  onChange={(e) => updateField('currentStock', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stoc minim
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStock || ''}
                  onChange={(e) => updateField('minStock', parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.minStock ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {errors.minStock && <p className="text-red-500 text-sm mt-1">{errors.minStock}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stoc maxim
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxStock || ''}
                  onChange={(e) => updateField('maxStock', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Punct recomandă
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.reorderPoint || ''}
                  onChange={(e) => updateField('reorderPoint', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Locație depozit
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ex: Raft A1-B2"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Furnizor principal
                </label>
                <select
                  value={formData.supplier}
                  onChange={(e) => updateField('supplier', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selectați furnizorul</option>
                  <option value="supplier1">Tech Distribution SRL</option>
                  <option value="supplier2">Office Solutions SA</option>
                  <option value="supplier3">Import Direct SRL</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Dimensions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Box className="w-5 h-5 text-amber-600" />
            Dimensiuni și greutate
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Greutate (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.weight || ''}
                onChange={(e) => updateField('weight', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lungime (cm)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.dimensions.length || ''}
                onChange={(e) => updateField('dimensions', { ...formData.dimensions, length: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lățime (cm)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.dimensions.width || ''}
                onChange={(e) => updateField('dimensions', { ...formData.dimensions, width: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Înălțime (cm)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.dimensions.height || ''}
                onChange={(e) => updateField('dimensions', { ...formData.dimensions, height: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-pink-600" />
            Imagini produs
          </h2>

          <div className="flex flex-wrap gap-4">
            {images.map((img, index) => (
              <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={img.preview}
                  alt={`Product ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {images.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition"
              >
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-xs">Adaugă</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <p className="text-sm text-gray-500 mt-2">
            Maximum 5 imagini. Formate acceptate: JPG, PNG, WebP.
          </p>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Status produs</h3>
              <p className="text-sm text-gray-500">Produsele inactive nu vor fi afișate în catalog</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                {formData.isActive ? 'Activ' : 'Inactiv'}
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Se salvează...' : 'Salvează produsul'}
          </button>
        </div>
      </form>
    </div>
  );
}
