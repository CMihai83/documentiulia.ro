"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Calendar,
  Calculator,
  Save,
  Send,
  FileText,
} from "lucide-react";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  total: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    clientId: "",
    clientName: "",
    invoiceNumber: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    currency: "RON",
    notes: "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      description: "",
      quantity: 1,
      unit: "buc",
      unitPrice: 0,
      vatRate: 19,
      total: 0,
    },
  ]);

  const calculateItemTotal = (item: InvoiceItem) => {
    return item.quantity * item.unitPrice;
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateVAT = () => {
    return items.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item);
      return sum + (itemTotal * item.vatRate) / 100;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        description: "",
        quantity: 1,
        unit: "buc",
        unitPrice: 0,
        vatRate: 19,
        total: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to save invoice
      console.log("Saving invoice:", { ...invoiceData, items, asDraft });
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      router.push("/invoices");
    } catch (error) {
      console.error("Error saving invoice:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/invoices"
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Factură Nouă</h1>
              <p className="text-slate-500">Creează o factură nouă pentru client</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700"
            >
              <Save className="w-4 h-4" />
              Salvează Ciornă
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? "Se salvează..." : "Emite Factură"}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Caută sau adaugă client..."
                  value={invoiceData.clientName}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, clientName: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Link
                href="/clients/new"
                className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3 h-3" />
                Adaugă client nou
              </Link>
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Număr Factură
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: FAC-2025-001"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Emiterii
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={invoiceData.issueDate}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, issueDate: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Scadenței
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, dueDate: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Produse / Servicii
            </h2>
            <button
              onClick={addItem}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Adaugă Rând
            </button>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-slate-500 pb-3 border-b">
            <div className="col-span-4">Descriere</div>
            <div className="col-span-1">Cant.</div>
            <div className="col-span-1">U.M.</div>
            <div className="col-span-2">Preț unitar</div>
            <div className="col-span-1">TVA %</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-1"></div>
          </div>

          {/* Items */}
          <div className="space-y-4 mt-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pb-4 border-b border-slate-100 last:border-0"
              >
                {/* Description */}
                <div className="md:col-span-4">
                  <label className="md:hidden text-xs text-slate-500 mb-1 block">
                    Descriere
                  </label>
                  <input
                    type="text"
                    placeholder="Descriere produs/serviciu"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Quantity */}
                <div className="md:col-span-1">
                  <label className="md:hidden text-xs text-slate-500 mb-1 block">
                    Cantitate
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Unit */}
                <div className="md:col-span-1">
                  <label className="md:hidden text-xs text-slate-500 mb-1 block">
                    U.M.
                  </label>
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="buc">buc</option>
                    <option value="kg">kg</option>
                    <option value="m">m</option>
                    <option value="mp">mp</option>
                    <option value="ora">oră</option>
                    <option value="zi">zi</option>
                  </select>
                </div>

                {/* Unit Price */}
                <div className="md:col-span-2">
                  <label className="md:hidden text-xs text-slate-500 mb-1 block">
                    Preț unitar (RON)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* VAT Rate */}
                <div className="md:col-span-1">
                  <label className="md:hidden text-xs text-slate-500 mb-1 block">
                    TVA %
                  </label>
                  <select
                    value={item.vatRate}
                    onChange={(e) =>
                      updateItem(item.id, "vatRate", parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="19">19%</option>
                    <option value="9">9%</option>
                    <option value="5">5%</option>
                    <option value="0">0%</option>
                  </select>
                </div>

                {/* Total */}
                <div className="md:col-span-2">
                  <label className="md:hidden text-xs text-slate-500 mb-1 block">
                    Total (RON)
                  </label>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm font-medium text-slate-900">
                    {formatCurrency(calculateItemTotal(item))} RON
                  </div>
                </div>

                {/* Delete */}
                <div className="md:col-span-1 flex justify-end">
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col items-end space-y-3">
            <div className="flex items-center justify-between w-full max-w-xs">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(calculateSubtotal())} RON
              </span>
            </div>
            <div className="flex items-center justify-between w-full max-w-xs">
              <span className="text-slate-600">TVA:</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(calculateVAT())} RON
              </span>
            </div>
            <div className="flex items-center justify-between w-full max-w-xs pt-3 border-t">
              <span className="text-lg font-semibold text-slate-900">Total:</span>
              <span className="text-lg font-bold text-blue-600">
                {formatCurrency(calculateTotal())} RON
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-20">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Note / Observații
          </label>
          <textarea
            rows={3}
            placeholder="Adaugă note sau observații pentru această factură..."
            value={invoiceData.notes}
            onChange={(e) =>
              setInvoiceData({ ...invoiceData, notes: e.target.value })
            }
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
