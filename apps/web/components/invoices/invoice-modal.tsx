'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Trash2,
  Calculator,
  Calendar,
  User,
  Building2,
  FileText,
  Package,
} from 'lucide-react';
import { Modal, ModalFooter, Button } from '@/components/ui/modal';
import { useClients, useProducts, useCreateInvoice } from '@/lib/api/hooks';
import { useCompanyStore } from '@/lib/store/company-store';
import { toast } from 'sonner';
import { CUIInput } from '@/components/ui/cui-input';

interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  total: number;
}

interface InvoiceFormData {
  clientId: string;
  clientName: string;
  clientCui?: string;
  clientAddress?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  notes?: string;
  items: InvoiceItem[];
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  invoice?: InvoiceFormData; // For editing existing invoice
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Default empty item
const createEmptyItem = (): InvoiceItem => ({
  id: generateId(),
  description: '',
  quantity: 1,
  unit: 'buc',
  unitPrice: 0,
  vatRate: 19, // Default Romanian VAT
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

export function InvoiceModal({ isOpen, onClose, onSuccess, invoice }: InvoiceModalProps) {
  const t = useTranslations('invoices');
  const { selectedCompanyId } = useCompanyStore();

  // API hooks
  const { data: clientsData } = useClients(selectedCompanyId || '');
  const { data: productsData } = useProducts(selectedCompanyId || '');
  const createInvoice = useCreateInvoice(selectedCompanyId || '');

  // Form state
  const [formData, setFormData] = useState<InvoiceFormData>({
    clientId: '',
    clientName: '',
    clientCui: '',
    clientAddress: '',
    issueDate: formatDateForInput(new Date()),
    dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
    currency: 'RON',
    notes: '',
    items: [createEmptyItem()],
  });

  const [showNewClient, setShowNewClient] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clients = (clientsData?.data as any[]) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = (productsData?.data as any[]) || [];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (invoice) {
        setFormData(invoice);
      } else {
        setFormData({
          clientId: '',
          clientName: '',
          clientCui: '',
          clientAddress: '',
          issueDate: formatDateForInput(new Date()),
          dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          currency: 'RON',
          notes: '',
          items: [createEmptyItem()],
        });
      }
      setShowNewClient(false);
    }
  }, [isOpen, invoice]);

  // Calculate item total
  const calculateItemTotal = (item: InvoiceItem): number => {
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

  // Handle client selection
  const handleClientChange = (clientId: string) => {
    if (clientId === 'new') {
      setShowNewClient(true);
      setFormData((prev) => ({
        ...prev,
        clientId: '',
        clientName: '',
        clientCui: '',
        clientAddress: '',
      }));
    } else {
      setShowNewClient(false);
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        setFormData((prev) => ({
          ...prev,
          clientId: client.id,
          clientName: client.name,
          clientCui: client.cui || '',
          clientAddress: client.address || '',
        }));
      }
    }
  };

  // Handle item changes
  const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
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

  // Add product to items
  const addProductToItems = (productId: string, index: number) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      updateItem(index, {
        productId: product.id,
        description: product.name,
        unitPrice: product.price || 0,
        unit: product.unit || 'buc',
        vatRate: product.vatRate || 19,
      });
    }
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.clientName) {
      toast.error('Selectează sau adaugă un client');
      return;
    }

    if (formData.items.length === 0 || formData.items.every((item) => !item.description)) {
      toast.error('Adaugă cel puțin un articol pe factură');
      return;
    }

    try {
      await createInvoice.mutateAsync({
        ...formData,
        items: formData.items.filter((item) => item.description),
      });
      toast.success('Factura a fost creată cu succes');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Eroare la crearea facturii');
      console.error(error);
    }
  };

  // Format currency
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
      title={invoice ? 'Editează Factura' : 'Factură Nouă'}
      description="Completează detaliile pentru a genera factura"
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-6">
          {/* Client Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <User className="w-5 h-5 text-blue-600" />
              <span>Detalii Client</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!showNewClient ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selectează Client
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Alege client --</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.cui && `(${client.cui})`}
                      </option>
                    ))}
                    <option value="new">+ Client Nou</option>
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nume Client *
                    </label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
                      placeholder="SC Exemplu SRL"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <CUIInput
                      value={formData.clientCui || ''}
                      onChange={(value, isValid) => {
                        setFormData((prev) => ({ ...prev, clientCui: value }));
                      }}
                      autoFetch={true}
                      onCompanyData={(data) => {
                        if (data) {
                          setFormData((prev) => ({
                            ...prev,
                            clientName: data.denumire || prev.clientName,
                            clientAddress: data.adresa || prev.clientAddress,
                          }));
                        }
                      }}
                      showValidation={true}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Adresă
                    </label>
                    <input
                      type="text"
                      value={formData.clientAddress || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, clientAddress: e.target.value }))}
                      placeholder="Strada Exemplu, Nr. 1, București"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewClient(false)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ← Înapoi la lista de clienți
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Detalii Factură</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Emiterii
                </label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, issueDate: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  <option value="RON">RON - Leu românesc</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - Dolar american</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-medium">
                <Package className="w-5 h-5 text-blue-600" />
                <span>Articole Factură</span>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
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
                          className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {products.length > 0 && (
                          <select
                            onChange={(e) => addProductToItems(e.target.value, index)}
                            className="w-full mt-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-500 focus:outline-none"
                          >
                            <option value="">Sau alege produs...</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - {formatCurrency(product.price || 0)}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(index, { unit: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                          className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-1">
                        <select
                          value={item.vatRate}
                          onChange={(e) => updateItem(index, { vatRate: parseInt(e.target.value) })}
                          className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                          placeholder="Cant."
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                          placeholder="Preț"
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <span className="text-gray-500">TVA:</span>
                  <span className="font-medium">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <span>Total:</span>
                  <span className="text-blue-600">{formatCurrency(total)}</span>
                </div>
              </div>
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
              placeholder="Note sau observații pentru factură..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Anulează
          </Button>
          <Button
            type="submit"
            isLoading={createInvoice.isPending}
            disabled={!formData.clientName || formData.items.every((i) => !i.description)}
          >
            {invoice ? 'Salvează Modificări' : 'Creează Factură'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
