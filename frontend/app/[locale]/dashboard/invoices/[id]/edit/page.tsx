'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
}

interface InvoiceForm {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  type: 'ISSUED' | 'RECEIVED';
  partnerName: string;
  partnerCui: string;
  partnerAddress: string;
  currency: string;
  notes: string;
  items: InvoiceItem[];
}

const emptyItem: InvoiceItem = {
  description: '',
  quantity: 1,
  unit: 'buc',
  unitPrice: 0,
  vatRate: 21, // Legea 141/2025 - standard rate effective Aug 2025
};

export default function InvoiceEditPage() {
  const t = useTranslations('invoices');
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<InvoiceForm>({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    type: 'ISSUED',
    partnerName: '',
    partnerCui: '',
    partnerAddress: '',
    currency: 'RON',
    notes: '',
    items: [{ ...emptyItem }],
  });

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch invoice');

      const data = await response.json();
      setForm({
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate.split('T')[0],
        dueDate: data.dueDate ? data.dueDate.split('T')[0] : '',
        type: data.type,
        partnerName: data.partnerName,
        partnerCui: data.partnerCui || '',
        partnerAddress: data.partnerAddress || '',
        currency: data.currency,
        notes: data.notes || '',
        items: data.items?.length > 0 ? data.items : [{ ...emptyItem }],
      });
    } catch (err) {
      setError('Eroare la incarcarea facturii');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          dueDate: form.dueDate || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update invoice');
      }

      router.push(`/dashboard/invoices/${invoiceId}`);
    } catch (err: any) {
      setError(err.message || 'Eroare la salvarea facturii');
    } finally {
      setSaving(false);
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  };

  const removeItem = (index: number) => {
    if (form.items.length === 1) return;
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const net = item.quantity * item.unitPrice;
    const vat = net * (item.vatRate / 100);
    return { net, vat, gross: net + vat };
  };

  const calculateTotals = () => {
    return form.items.reduce(
      (acc, item) => {
        const itemTotals = calculateItemTotal(item);
        return {
          net: acc.net + itemTotals.net,
          vat: acc.vat + itemTotals.vat,
          gross: acc.gross + itemTotals.gross,
        };
      },
      { net: 0, vat: 0, gross: 0 }
    );
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/invoices/${invoiceId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editeaza factura</h1>
          <p className="text-gray-600">{form.invoiceNumber}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Informatii de baza</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numar factura *
              </label>
              <input
                type="text"
                value={form.invoiceNumber}
                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tip factura
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'ISSUED' | 'RECEIVED' })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="ISSUED">Emisa</option>
                <option value="RECEIVED">Primita</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data facturii *
              </label>
              <input
                type="date"
                value={form.invoiceDate}
                onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data scadenta
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moneda
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Partner Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {form.type === 'ISSUED' ? 'Client' : 'Furnizor'}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Denumire *
              </label>
              <input
                type="text"
                value={form.partnerName}
                onChange={(e) => setForm({ ...form, partnerName: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CUI / CIF
              </label>
              <input
                type="text"
                value={form.partnerCui}
                onChange={(e) => setForm({ ...form, partnerCui: e.target.value })}
                placeholder="RO12345678"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresa
              </label>
              <input
                type="text"
                value={form.partnerAddress}
                onChange={(e) => setForm({ ...form, partnerAddress: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Produse / Servicii</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-4 h-4" />
              Adauga articol
            </button>
          </div>

          <div className="space-y-4">
            {form.items.map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="grid md:grid-cols-12 gap-4">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Descriere</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cantitate</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        min="0"
                        step="0.01"
                      />
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        className="w-16 px-2 py-2 border rounded-lg text-sm"
                        placeholder="buc"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Pret unitar</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">TVA %</label>
                    <select
                      value={item.vatRate}
                      onChange={(e) => handleItemChange(index, 'vatRate', parseInt(e.target.value))}
                      className="w-full px-2 py-2 border rounded-lg text-sm"
                      title="Legea 141/2025 - cote TVA"
                    >
                      <option value={21}>21%</option>
                      <option value={11}>11%</option>
                      <option value={5}>5%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Total</label>
                    <div className="px-3 py-2 bg-white border rounded-lg text-sm font-medium">
                      {formatAmount(calculateItemTotal(item).gross)} {form.currency}
                    </div>
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={form.items.length === 1}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  <span>{formatAmount(totals.net)} {form.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">TVA:</span>
                  <span>{formatAmount(totals.vat)} {form.currency}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatAmount(totals.gross)} {form.currency}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Note</h3>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Observatii suplimentare..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href={`/dashboard/invoices/${invoiceId}`}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Anuleaza
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salveaza
          </button>
        </div>
      </form>
    </div>
  );
}
