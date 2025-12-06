'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Receipt,
  Calendar,
  Building2,
  Tag,
  Upload,
  Camera,
  X,
  FileText,
} from 'lucide-react';
import { Modal, ModalFooter, Button } from '@/components/ui/modal';
import { useCreateExpense } from '@/lib/api/hooks';
import { useCompanyStore } from '@/lib/store/company-store';
import { toast } from 'sonner';

// Expense categories
const categories = [
  { value: 'office', label: 'Birou', color: 'bg-blue-100 text-blue-700' },
  { value: 'travel', label: 'Deplasări', color: 'bg-purple-100 text-purple-700' },
  { value: 'utilities', label: 'Utilități', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'marketing', label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
  { value: 'salaries', label: 'Salarii', color: 'bg-green-100 text-green-700' },
  { value: 'supplies', label: 'Consumabile', color: 'bg-orange-100 text-orange-700' },
  { value: 'services', label: 'Servicii', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'other', label: 'Altele', color: 'bg-gray-100 text-gray-700' },
];

// Payment methods
const paymentMethods = [
  { value: 'bank_transfer', label: 'Transfer bancar' },
  { value: 'cash', label: 'Numerar' },
  { value: 'card', label: 'Card' },
  { value: 'online', label: 'Plată online' },
];

// Romanian VAT rates
const vatRates = [
  { value: 19, label: '19% (Standard)' },
  { value: 9, label: '9% (Redus)' },
  { value: 5, label: '5% (Redus)' },
  { value: 0, label: '0% (Scutit/Fără TVA)' },
];

interface ExpenseFormData {
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  vendor: string;
  invoiceNumber: string;
  vatRate: number;
  vatAmount: number;
  deductible: boolean;
  paymentMethod: string;
  notes: string;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  expense?: ExpenseFormData;
}

// Format date for input
const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export function ExpenseModal({ isOpen, onClose, onSuccess, expense }: ExpenseModalProps) {
  const t = useTranslations('expenses');
  const { selectedCompanyId } = useCompanyStore();

  const createExpense = useCreateExpense(selectedCompanyId || '');

  const [formData, setFormData] = useState<ExpenseFormData>({
    description: '',
    amount: 0,
    currency: 'RON',
    category: 'office',
    date: formatDateForInput(new Date()),
    vendor: '',
    invoiceNumber: '',
    vatRate: 19,
    vatAmount: 0,
    deductible: true,
    paymentMethod: 'bank_transfer',
    notes: '',
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setFormData(expense);
      } else {
        setFormData({
          description: '',
          amount: 0,
          currency: 'RON',
          category: 'office',
          date: formatDateForInput(new Date()),
          vendor: '',
          invoiceNumber: '',
          vatRate: 19,
          vatAmount: 0,
          deductible: true,
          paymentMethod: 'bank_transfer',
          notes: '',
        });
      }
      setReceiptFile(null);
      setReceiptPreview(null);
    }
  }, [isOpen, expense]);

  // Calculate VAT amount when amount or rate changes
  const calculateVat = (amount: number, vatRate: number) => {
    const netAmount = amount / (1 + vatRate / 100);
    return amount - netAmount;
  };

  // Handle amount change
  const handleAmountChange = (value: number) => {
    const vatAmount = calculateVat(value, formData.vatRate);
    setFormData((prev) => ({
      ...prev,
      amount: value,
      vatAmount: Math.round(vatAmount * 100) / 100,
    }));
  };

  // Handle VAT rate change
  const handleVatRateChange = (rate: number) => {
    const vatAmount = calculateVat(formData.amount, rate);
    setFormData((prev) => ({
      ...prev,
      vatRate: rate,
      vatAmount: Math.round(vatAmount * 100) / 100,
    }));
  };

  // Handle receipt file upload
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove receipt
  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description) {
      toast.error('Adaugă o descriere pentru cheltuială');
      return;
    }

    if (formData.amount <= 0) {
      toast.error('Suma trebuie să fie mai mare decât 0');
      return;
    }

    try {
      await createExpense.mutateAsync({
        ...formData,
        hasReceipt: !!receiptFile,
      });
      toast.success('Cheltuiala a fost adăugată cu succes');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Eroare la adăugarea cheltuielii');
      console.error(error);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: formData.currency,
    }).format(amount);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expense ? 'Editează Cheltuiala' : 'Adaugă Cheltuială'}
      description="Completează detaliile cheltuielii"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descriere *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ex: Rechizite birou, Combustibil, Abonament software..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sumă totală (cu TVA) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Monedă
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* VAT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cotă TVA
              </label>
              <select
                value={formData.vatRate}
                onChange={(e) => handleVatRateChange(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {vatRates.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                TVA calculat
              </label>
              <div className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                {formatCurrency(formData.vatAmount)}
              </div>
            </div>
          </div>

          {/* Category and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categorie
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Vendor and Invoice Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Furnizor
              </label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => setFormData((prev) => ({ ...prev, vendor: e.target.value }))}
                placeholder="Numele furnizorului"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Număr factură
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                placeholder="FT-2024-0001"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Payment Method and Deductible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Metodă de plată
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.deductible}
                  onChange={(e) => setFormData((prev) => ({ ...prev, deductible: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cheltuială deductibilă fiscal
                </span>
              </label>
            </div>
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document justificativ (bon, factură)
            </label>
            {receiptPreview ? (
              <div className="relative inline-block">
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="max-w-full h-auto max-h-40 rounded-lg border border-gray-200 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Upload className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Încarcă document
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Camera className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Fotografiază
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Note (opțional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Observații sau detalii suplimentare..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sumar</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Sumă fără TVA:</span>
                <span className="font-medium">
                  {formatCurrency(formData.amount - formData.vatAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TVA ({formData.vatRate}%):</span>
                <span className="font-medium">{formatCurrency(formData.vatAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-medium text-gray-700 dark:text-gray-300">Total:</span>
                <span className="font-bold text-blue-600">{formatCurrency(formData.amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Anulează
          </Button>
          <Button
            type="submit"
            isLoading={createExpense.isPending}
            disabled={!formData.description || formData.amount <= 0}
          >
            {expense ? 'Salvează Modificări' : 'Adaugă Cheltuială'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
