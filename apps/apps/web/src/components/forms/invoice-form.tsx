"use client";

import { useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Calculator,
  Calendar,
  User,
  Building,
  Save,
  Send,
  Eye,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { CuiInput } from "./cui-input";

// VAT rates in Romania
const VAT_RATES = [
  { value: 19, label: "19% - Standard" },
  { value: 9, label: "9% - Redus" },
  { value: 5, label: "5% - Redus" },
  { value: 0, label: "0% - Scutit" },
];

// Payment terms options
const PAYMENT_TERMS = [
  { value: 0, label: "La vedere" },
  { value: 7, label: "7 zile" },
  { value: 14, label: "14 zile" },
  { value: 30, label: "30 zile" },
  { value: 45, label: "45 zile" },
  { value: 60, label: "60 zile" },
  { value: 90, label: "90 zile" },
];

// Currency options
const CURRENCIES = [
  { value: "RON", label: "RON - Leu românesc" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "USD", label: "USD - Dolar american" },
];

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  discount: number;
}

interface InvoiceFormData {
  series: string;
  number: string;
  issueDate: string;
  dueDate: string;
  clientId: string;
  clientName: string;
  clientCui: string;
  clientAddress: string;
  currency: string;
  paymentTerms: number;
  items: InvoiceItem[];
  notes: string;
  internalNotes: string;
}

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  onSubmit?: (data: InvoiceFormData, action: "draft" | "send") => Promise<void>;
  onPreview?: (data: InvoiceFormData) => void;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function InvoiceForm({
  initialData,
  onSubmit,
  onPreview,
  isLoading = false,
  mode = "create",
}: InvoiceFormProps) {
  const [formData, setFormData] = useState<InvoiceFormData>({
    series: initialData?.series || "FV",
    number: initialData?.number || "",
    issueDate: initialData?.issueDate || new Date().toISOString().split("T")[0],
    dueDate: initialData?.dueDate || "",
    clientId: initialData?.clientId || "",
    clientName: initialData?.clientName || "",
    clientCui: initialData?.clientCui || "",
    clientAddress: initialData?.clientAddress || "",
    currency: initialData?.currency || "RON",
    paymentTerms: initialData?.paymentTerms || 30,
    items: initialData?.items || [
      {
        id: generateId(),
        description: "",
        quantity: 1,
        unit: "buc",
        unitPrice: 0,
        vatRate: 19,
        discount: 0,
      },
    ],
    notes: initialData?.notes || "",
    internalNotes: initialData?.internalNotes || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showClientSearch, setShowClientSearch] = useState(false);

  // Calculate totals
  const calculateItemTotal = (item: InvoiceItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = subtotal * (item.discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = afterDiscount * (item.vatRate / 100);
    return {
      subtotal,
      discountAmount,
      afterDiscount,
      vatAmount,
      total: afterDiscount + vatAmount,
    };
  };

  const totals = formData.items.reduce(
    (acc, item) => {
      const itemTotals = calculateItemTotal(item);
      return {
        subtotal: acc.subtotal + itemTotals.afterDiscount,
        vatAmount: acc.vatAmount + itemTotals.vatAmount,
        total: acc.total + itemTotals.total,
        discount: acc.discount + itemTotals.discountAmount,
      };
    },
    { subtotal: 0, vatAmount: 0, total: 0, discount: 0 }
  );

  // Update form field
  const updateField = (field: keyof InvoiceFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Update item
  const updateItem = (id: string, field: keyof InvoiceItem, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Add item
  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: generateId(),
          description: "",
          quantity: 1,
          unit: "buc",
          unitPrice: 0,
          vatRate: 19,
          discount: 0,
        },
      ],
    }));
  };

  // Remove item
  const removeItem = (id: string) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      }));
    }
  };

  // Calculate due date based on payment terms
  const calculateDueDate = (issueDate: string, days: number): string => {
    const date = new Date(issueDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

  // Handle payment terms change
  const handlePaymentTermsChange = (days: number) => {
    updateField("paymentTerms", days);
    if (formData.issueDate) {
      updateField("dueDate", calculateDueDate(formData.issueDate, days));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.series) newErrors.series = "Seria este obligatorie";
    if (!formData.number) newErrors.number = "Numărul este obligatoriu";
    if (!formData.issueDate) newErrors.issueDate = "Data emiterii este obligatorie";
    if (!formData.clientName) newErrors.clientName = "Numele clientului este obligatoriu";

    const hasValidItem = formData.items.some(
      (item) => item.description && item.quantity > 0 && item.unitPrice > 0
    );
    if (!hasValidItem) {
      newErrors.items = "Adăugați cel puțin un produs/serviciu valid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (action: "draft" | "send") => {
    if (!validateForm()) return;
    if (onSubmit) {
      await onSubmit(formData, action);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {mode === "create" ? "Factură Nouă" : "Editare Factură"}
            </h1>
            <p className="text-sm text-slate-500">Completați datele facturii</p>
          </div>
        </div>

        {/* Invoice Number & Date */}
        <div className="grid sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Serie <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.series}
              onChange={(e) => updateField("series", e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.series ? "border-red-500" : "border-slate-200"
              }`}
              placeholder="FV"
              maxLength={5}
            />
            {errors.series && (
              <p className="text-xs text-red-500 mt-1">{errors.series}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Număr <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => updateField("number", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.number ? "border-red-500" : "border-slate-200"
              }`}
              placeholder="0001"
            />
            {errors.number && (
              <p className="text-xs text-red-500 mt-1">{errors.number}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data emiterii <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => {
                  updateField("issueDate", e.target.value);
                  updateField("dueDate", calculateDueDate(e.target.value, formData.paymentTerms));
                }}
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data scadenței
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => updateField("dueDate", e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Currency & Payment Terms */}
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monedă
            </label>
            <select
              value={formData.currency}
              onChange={(e) => updateField("currency", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Termen de plată
            </label>
            <select
              value={formData.paymentTerms}
              onChange={(e) => handlePaymentTermsChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PAYMENT_TERMS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Client Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-400" />
            Client
          </h2>
          <button
            type="button"
            onClick={() => setShowClientSearch(!showClientSearch)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showClientSearch ? "Ascunde căutare" : "Caută după CUI"}
          </button>
        </div>

        {showClientSearch && (
          <div className="mb-4">
            <CuiInput
              value={formData.clientCui}
              onChange={(v) => updateField("clientCui", v)}
              onCompanyFound={(company) => {
                updateField("clientName", company.name);
                updateField("clientCui", company.cui);
                updateField(
                  "clientAddress",
                  `${company.address}, ${company.city}, ${company.county}`
                );
              }}
              autoLookup={true}
            />
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nume / Denumire <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => updateField("clientName", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.clientName ? "border-red-500" : "border-slate-200"
              }`}
              placeholder="SC Exemplu SRL"
            />
            {errors.clientName && (
              <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              CUI / CNP
            </label>
            <input
              type="text"
              value={formData.clientCui}
              onChange={(e) => updateField("clientCui", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="RO12345678"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Adresă
            </label>
            <input
              type="text"
              value={formData.clientAddress}
              onChange={(e) => updateField("clientAddress", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Str. Exemplu nr. 1, București"
            />
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-slate-400" />
            Produse / Servicii
          </h2>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Adaugă
          </button>
        </div>

        {errors.items && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{errors.items}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-500 border-b">
                <th className="pb-3 pr-4">Descriere</th>
                <th className="pb-3 px-2 w-20">Cant.</th>
                <th className="pb-3 px-2 w-20">U.M.</th>
                <th className="pb-3 px-2 w-28">Preț unit.</th>
                <th className="pb-3 px-2 w-24">TVA</th>
                <th className="pb-3 px-2 w-20">Disc. %</th>
                <th className="pb-3 px-2 w-28 text-right">Total</th>
                <th className="pb-3 pl-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item) => {
                const itemTotals = calculateItemTotal(item);
                return (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Descriere produs/serviciu"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-center"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="buc">buc</option>
                        <option value="kg">kg</option>
                        <option value="m">m</option>
                        <option value="mp">mp</option>
                        <option value="l">l</option>
                        <option value="ora">ora</option>
                        <option value="zi">zi</option>
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-right"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={item.vatRate}
                        onChange={(e) =>
                          updateItem(item.id, "vatRate", parseInt(e.target.value))
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        {VAT_RATES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.value}%
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(item.id, "discount", parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-center"
                        min="0"
                        max="100"
                      />
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-slate-900">
                      {formatCurrency(itemTotals.total, formData.currency)}
                    </td>
                    <td className="py-3 pl-2">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={formData.items.length === 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal:</span>
              <span className="text-slate-900">
                {formatCurrency(totals.subtotal, formData.currency)}
              </span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Discount:</span>
                <span className="text-red-600">
                  -{formatCurrency(totals.discount, formData.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">TVA:</span>
              <span className="text-slate-900">
                {formatCurrency(totals.vatAmount, formData.currency)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span className="text-slate-900">Total:</span>
              <span className="text-blue-600">
                {formatCurrency(totals.total, formData.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Observații</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notă pe factură (vizibilă clientului)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Ex: Mulțumim pentru colaborare!"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notă internă (doar pentru tine)
            </label>
            <textarea
              value={formData.internalNotes}
              onChange={(e) => updateField("internalNotes", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Note interne..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onPreview?.(formData)}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
        >
          <Eye className="w-4 h-4" />
          Previzualizare
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvează Ciornă
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("send")}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Emite Factură
          </button>
        </div>
      </div>
    </div>
  );
}
