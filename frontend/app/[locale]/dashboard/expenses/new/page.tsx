'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  Receipt,
  Upload,
  Save,
  ArrowLeft,
  Calculator,
  Building2,
  Calendar,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface ExpenseFormData {
  description: string;
  category: string;
  amount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  date: string;
  supplierId: string;
  supplierName: string;
  documentType: string;
  documentNumber: string;
  notes: string;
}

interface Supplier {
  id: string;
  name: string;
  cui: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'operational', label: 'Operațional', vatRate: 19 },
  { value: 'administrative', label: 'Administrativ', vatRate: 19 },
  { value: 'marketing', label: 'Marketing', vatRate: 19 },
  { value: 'hr', label: 'Resurse Umane', vatRate: 19 },
  { value: 'utilities', label: 'Utilități', vatRate: 19 },
  { value: 'rent', label: 'Chirie', vatRate: 19 },
  { value: 'supplies', label: 'Consumabile', vatRate: 19 },
  { value: 'travel', label: 'Transport & Deplasări', vatRate: 19 },
  { value: 'food', label: 'Alimentație', vatRate: 9 },
  { value: 'medical', label: 'Medical', vatRate: 9 },
  { value: 'other', label: 'Altele', vatRate: 19 },
];

const DOCUMENT_TYPES = [
  { value: 'invoice', label: 'Factură' },
  { value: 'receipt', label: 'Bon fiscal' },
  { value: 'voucher', label: 'Chitanță' },
  { value: 'statement', label: 'Extras de cont' },
  { value: 'other', label: 'Alt document' },
];

const VAT_RATES = [
  { value: 19, label: '19% - Standard' },
  { value: 9, label: '9% - Redus (alimentație, medicamente)' },
  { value: 5, label: '5% - Special (locuințe sociale)' },
  { value: 0, label: '0% - Scutit TVA' },
];

export default function NewExpensePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      vatRate: 19,
      category: 'operational',
      documentType: 'invoice',
    },
  });

  const amount = watch('amount') || 0;
  const vatRate = watch('vatRate') || 19;
  const category = watch('category');

  // Calculate VAT and total
  useEffect(() => {
    const vatAmount = (amount * vatRate) / 100;
    const totalAmount = amount + vatAmount;
    setValue('vatAmount', Math.round(vatAmount * 100) / 100);
    setValue('totalAmount', Math.round(totalAmount * 100) / 100);
  }, [amount, vatRate, setValue]);

  // Update VAT rate when category changes
  useEffect(() => {
    const categoryConfig = EXPENSE_CATEGORIES.find(c => c.value === category);
    if (categoryConfig) {
      setValue('vatRate', categoryConfig.vatRate);
    }
  }, [category, setValue]);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/v1/partners?type=supplier', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setSuppliers(Array.isArray(data) ? data : data.data || []);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };
    fetchSuppliers();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setOcrProcessing(true);

    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/ocr/process', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // Auto-fill form with OCR results
        if (result.amount) setValue('amount', result.amount);
        if (result.date) setValue('date', result.date);
        if (result.supplierName) setValue('supplierName', result.supplierName);
        if (result.documentNumber) setValue('documentNumber', result.documentNumber);
      }
    } catch (error) {
      console.error('OCR processing error:', error);
    } finally {
      setOcrProcessing(false);
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/expenses');
        }, 1500);
      } else {
        const error = await response.json();
        setSubmitError(error.message || 'Eroare la salvarea cheltuielii');
      }
    } catch (error) {
      setSubmitError('Eroare de conexiune. Încercați din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adaugă Cheltuială</h1>
          <p className="text-gray-500 text-sm">Înregistrează o nouă cheltuială în sistem</p>
        </div>
      </div>

      {/* Success Message */}
      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800">Cheltuială salvată cu succes! Redirecționare...</span>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* OCR Upload Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Upload className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Încarcă document pentru OCR</h3>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            Încarcă factura sau bonul și sistemul va completa automat câmpurile.
          </p>
          <label className="block">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex items-center gap-3 px-4 py-2 bg-white border border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition">
              {ocrProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-blue-600">Procesare OCR...</span>
                </>
              ) : uploadedFile ? (
                <>
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="text-green-600">{uploadedFile.name}</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span className="text-blue-600">Selectează fișier</span>
                </>
              )}
            </div>
          </label>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descriere cheltuială *
            </label>
            <input
              type="text"
              {...register('description', { required: 'Descrierea este obligatorie' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Achiziție consumabile birou"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Category and Document Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categorie *
              </label>
              <select
                {...register('category', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tip document *
              </label>
              <select
                {...register('documentType', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier and Document Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="w-4 h-4 inline mr-1" />
                Furnizor
              </label>
              <select
                {...register('supplierId')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selectează furnizor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.cui})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Număr document
              </label>
              <input
                type="text"
                {...register('documentNumber')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: FV-2025-001234"
              />
            </div>
          </div>

          {/* Amount Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium">Calcul valoare</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sumă fără TVA *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    {...register('amount', {
                      required: 'Suma este obligatorie',
                      min: { value: 0.01, message: 'Suma trebuie să fie pozitivă' },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400">RON</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cota TVA
                </label>
                <select
                  {...register('vatRate', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {VAT_RATES.map((rate) => (
                    <option key={rate.value} value={rate.value}>
                      {rate.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TVA
                </label>
                <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600">
                  {watch('vatAmount')?.toFixed(2) || '0.00'} RON
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total
                </label>
                <div className="px-4 py-2 bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-semibold">
                  {watch('totalAmount')?.toFixed(2) || '0.00'} RON
                </div>
              </div>
            </div>
            {errors.amount && (
              <p className="text-red-500 text-sm mt-2">{errors.amount.message}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data documentului *
            </label>
            <input
              type="date"
              {...register('date', { required: 'Data este obligatorie' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note interne
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Observații sau detalii suplimentare..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Se salvează...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvează cheltuială
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
