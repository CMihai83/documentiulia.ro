'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Building2,
  Package,
  Receipt,
  Upload,
  FileText,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { useCompanyStore } from '@/lib/store/company-store';

interface BillItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  total: number;
}

interface BillFormData {
  vendorId: string;
  vendorName: string;
  vendorCui?: string;
  vendorAddress?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  receiptDate: string;
  currency: string;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentMethod?: string;
  category: string;
  notes?: string;
  attachmentUrl?: string;
  items: BillItem[];
}

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bill?: BillFormData;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Default empty item
const createEmptyItem = (): BillItem => ({
  id: generateId(),
  description: '',
  quantity: 1,
  unit: 'buc',
  unitPrice: 0,
  vatRate: 19,
  total: 0,
});

// Format date for input
const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Romanian VAT rates
const vatRates = [
  { value: 19, label: '19% (Standard)' },
  { value: 9, label: '9% (Redus)' },
  { value: 5, label: '5% (Redus)' },
  { value: 0, label: '0% (Scutit)' },
];

// Common units
const units = [
  { value: 'buc', label: 'Bucăți (buc)' },
  { value: 'kg', label: 'Kilograme (kg)' },
  { value: 'l', label: 'Litri (l)' },
  { value: 'm', label: 'Metri (m)' },
  { value: 'm²', label: 'Metri pătrați (m²)' },
  { value: 'h', label: 'Ore (h)' },
  { value: 'zi', label: 'Zile' },
  { value: 'luna', label: 'Luni' },
];

// Expense categories
const expenseCategories = [
  { value: 'materiale', label: 'Materiale și Consumabile' },
  { value: 'servicii', label: 'Servicii' },
  { value: 'utilitati', label: 'Utilități' },
  { value: 'chirie', label: 'Chirie' },
  { value: 'transport', label: 'Transport și Deplasări' },
  { value: 'echipamente', label: 'Echipamente și Dotări' },
  { value: 'it', label: 'IT și Software' },
  { value: 'marketing', label: 'Marketing și Publicitate' },
  { value: 'consultanta', label: 'Consultanță și Servicii Profesionale' },
  { value: 'salarii', label: 'Salarii și Contribuții' },
  { value: 'asigurari', label: 'Asigurări' },
  { value: 'impozite', label: 'Impozite și Taxe' },
  { value: 'altele', label: 'Altele' },
];

// Payment methods
const paymentMethods = [
  { value: 'transfer', label: 'Transfer Bancar' },
  { value: 'card', label: 'Card' },
  { value: 'numerar', label: 'Numerar' },
  { value: 'cec', label: 'Cec' },
  { value: 'bilet_ordin', label: 'Bilet la Ordin' },
];

export function BillModal({ isOpen, onClose, onSuccess, bill }: BillModalProps) {
  const { selectedCompanyId } = useCompanyStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  // Mock vendors data - in production would come from API
  const vendors = [
    { id: '1', name: 'Enel Energie', cui: 'RO14399273', address: 'București' },
    { id: '2', name: 'Vodafone Romania', cui: 'RO11574966', address: 'București' },
    { id: '3', name: 'Orange Romania', cui: 'RO9010105', address: 'București' },
    { id: '4', name: 'Dedeman', cui: 'RO4194681', address: 'Bacău' },
    { id: '5', name: 'EMAG', cui: 'RO14399840', address: 'București' },
  ];

  // Form state
  const [formData, setFormData] = useState<BillFormData>({
    vendorId: '',
    vendorName: '',
    vendorCui: '',
    vendorAddress: '',
    invoiceNumber: '',
    issueDate: formatDateForInput(new Date()),
    dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    receiptDate: formatDateForInput(new Date()),
    currency: 'RON',
    paymentStatus: 'pending',
    paymentMethod: '',
    category: '',
    notes: '',
    attachmentUrl: '',
    items: [createEmptyItem()],
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (bill) {
        setFormData(bill);
        if (bill.attachmentUrl) {
          setAttachmentPreview(bill.attachmentUrl);
        }
      } else {
        setFormData({
          vendorId: '',
          vendorName: '',
          vendorCui: '',
          vendorAddress: '',
          invoiceNumber: '',
          issueDate: formatDateForInput(new Date()),
          dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          receiptDate: formatDateForInput(new Date()),
          currency: 'RON',
          paymentStatus: 'pending',
          paymentMethod: '',
          category: '',
          notes: '',
          attachmentUrl: '',
          items: [createEmptyItem()],
        });
        setAttachmentPreview(null);
      }
      setShowNewVendor(false);
    }
  }, [isOpen, bill]);

  // Calculate item total
  const calculateItemTotal = (item: BillItem): number => {
    return item.quantity * item.unitPrice;
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const vatAmount = formData.items.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item);
      return sum + (itemTotal * item.vatRate) / 100;
    }, 0);
    const total = subtotal + vatAmount;

    return { subtotal, vatAmount, total };
  };

  const { subtotal, vatAmount, total } = calculateTotals();

  // Handle vendor selection
  const handleVendorChange = (vendorId: string) => {
    if (vendorId === 'new') {
      setShowNewVendor(true);
      setFormData((prev) => ({
        ...prev,
        vendorId: '',
        vendorName: '',
        vendorCui: '',
        vendorAddress: '',
      }));
    } else {
      setShowNewVendor(false);
      const vendor = vendors.find((v) => v.id === vendorId);
      if (vendor) {
        setFormData((prev) => ({
          ...prev,
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorCui: vendor.cui || '',
          vendorAddress: vendor.address || '',
        }));
      }
    }
  };

  // Handle item changes
  const updateItem = (index: number, updates: Partial<BillItem>) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              ...updates,
              total: calculateItemTotal({ ...item, ...updates }),
            }
          : item
      ),
    }));
  };

  // Add new item row
  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  // Remove item row
  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentPreview(reader.result as string);
        setFormData((prev) => ({
          ...prev,
          attachmentUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendorName) {
      alert('Selectează sau adaugă un furnizor');
      return;
    }

    if (!formData.invoiceNumber) {
      alert('Introdu numărul facturii');
      return;
    }

    if (formData.items.length === 0 || formData.items.every((item) => !item.description)) {
      alert('Adaugă cel puțin un articol pe factură');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Bill data:', {
        ...formData,
        companyId: selectedCompanyId,
        totals: { subtotal, vatAmount, total },
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating bill:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: formData.currency,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {bill ? 'Editează Factura Primită' : 'Factură Primită Nouă'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Înregistrează o factură de la un furnizor
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Vendor Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-medium">
                    <Building2 className="w-5 h-5 text-orange-600" />
                    <span>Detalii Furnizor</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!showNewVendor ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Selectează Furnizor
                        </label>
                        <select
                          value={formData.vendorId}
                          onChange={(e) => handleVendorChange(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">-- Alege furnizor --</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name} {vendor.cui && `(${vendor.cui})`}
                            </option>
                          ))}
                          <option value="new">+ Furnizor Nou</option>
                        </select>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nume Furnizor *
                          </label>
                          <input
                            type="text"
                            value={formData.vendorName}
                            onChange={(e) => setFormData((prev) => ({ ...prev, vendorName: e.target.value }))}
                            placeholder="SC Furnizor SRL"
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            CUI / CIF
                          </label>
                          <input
                            type="text"
                            value={formData.vendorCui || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, vendorCui: e.target.value }))}
                            placeholder="RO12345678"
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Adresă Furnizor
                          </label>
                          <input
                            type="text"
                            value={formData.vendorAddress || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, vendorAddress: e.target.value }))}
                            placeholder="Strada, Nr., Oraș"
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowNewVendor(false)}
                          className="text-sm text-orange-600 hover:underline"
                        >
                          ← Înapoi la lista de furnizori
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-medium">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span>Detalii Factură</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Număr Factură *
                      </label>
                      <input
                        type="text"
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                        placeholder="FV-001234"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data Emiterii
                      </label>
                      <input
                        type="date"
                        value={formData.issueDate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, issueDate: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data Scadenței
                      </label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data Primirii
                      </label>
                      <input
                        type="date"
                        value={formData.receiptDate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, receiptDate: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Categorie
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">-- Selectează --</option>
                        {expenseCategories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Monedă
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="RON">RON - Leu românesc</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="USD">USD - Dolar american</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Payment Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-medium">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                    <span>Stare Plată</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status Plată
                      </label>
                      <select
                        value={formData.paymentStatus}
                        onChange={(e) => setFormData((prev) => ({ ...prev, paymentStatus: e.target.value as 'pending' | 'partial' | 'paid' }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="pending">Neplătită</option>
                        <option value="partial">Plătită Parțial</option>
                        <option value="paid">Plătită Integral</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Metodă Plată
                      </label>
                      <select
                        value={formData.paymentMethod || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">-- Selectează --</option>
                        {paymentMethods.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-lg font-medium">
                      <Package className="w-5 h-5 text-orange-600" />
                      <span>Articole Factură</span>
                    </div>
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Adaugă Articol
                    </button>
                  </div>

                  {/* Items Table */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    {/* Table Header */}
                    <div className="hidden md:grid md:grid-cols-12 gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-500">
                      <div className="col-span-4">Descriere</div>
                      <div className="col-span-1">Cant.</div>
                      <div className="col-span-2">U.M.</div>
                      <div className="col-span-2">Preț Unitar</div>
                      <div className="col-span-1">TVA</div>
                      <div className="col-span-1 text-right">Total</div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {formData.items.map((item, index) => (
                        <div key={item.id} className="p-4">
                          {/* Desktop View */}
                          <div className="hidden md:grid md:grid-cols-12 gap-2 items-center">
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(index, { description: e.target.value })}
                                placeholder="Descriere produs/serviciu"
                                className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                            <div className="col-span-1">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                            <div className="col-span-2">
                              <select
                                value={item.unit}
                                onChange={(e) => updateItem(index, { unit: e.target.value })}
                                className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                              >
                                {units.map((unit) => (
                                  <option key={unit.value} value={unit.value}>
                                    {unit.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                            <div className="col-span-1">
                              <select
                                value={item.vatRate}
                                onChange={(e) => updateItem(index, { vatRate: parseInt(e.target.value) })}
                                className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                              >
                                {vatRates.map((rate) => (
                                  <option key={rate.value} value={rate.value}>
                                    {rate.value}%
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-1 text-right font-medium">
                              {formatCurrency(calculateItemTotal(item))}
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                disabled={formData.items.length === 1}
                                className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Mobile View */}
                          <div className="md:hidden space-y-3">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(index, { description: e.target.value })}
                              placeholder="Descriere produs/serviciu"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                                placeholder="Cant."
                                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                                placeholder="Preț"
                                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{formatCurrency(calculateItemTotal(item))}</span>
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  disabled={formData.items.length === 1}
                                  className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-full md:w-72 space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">TVA Deductibil:</span>
                        <span className="font-medium text-green-600">{formatCurrency(vatAmount)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span>Total:</span>
                        <span className="text-orange-600">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attachment Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-medium">
                    <Upload className="w-5 h-5 text-orange-600" />
                    <span>Atașament Factură</span>
                  </div>

                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      dragActive
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-orange-400'
                    }`}
                  >
                    {attachmentPreview ? (
                      <div className="space-y-3">
                        {attachmentPreview.startsWith('data:image') ? (
                          <img
                            src={attachmentPreview}
                            alt="Preview"
                            className="max-h-40 mx-auto rounded-lg"
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-gray-600">
                            <FileText className="w-8 h-8" />
                            <span>Document atașat</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentPreview(null);
                            setFormData((prev) => ({ ...prev, attachmentUrl: '' }));
                          }}
                          className="text-sm text-red-500 hover:underline"
                        >
                          Șterge atașamentul
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-10 h-10 mx-auto text-gray-400" />
                        <p className="text-gray-600 dark:text-gray-400">
                          Trage și plasează factura aici sau
                        </p>
                        <label className="cursor-pointer">
                          <span className="text-orange-600 hover:underline">selectează un fișier</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(e.target.files)}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-gray-400">PDF, JPG, PNG (max. 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Note (opțional)
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Note sau observații pentru această factură..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>

                {/* Warning for overdue */}
                {formData.paymentStatus === 'pending' && new Date(formData.dueDate) < new Date() && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Această factură a depășit termenul de scadență!
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.vendorName || !formData.invoiceNumber}
                  className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Se salvează...
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4" />
                      {bill ? 'Salvează Modificări' : 'Înregistrează Factura'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
