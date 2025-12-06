"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  ArrowLeft,
  Receipt,
  Calendar,
  Building2,
  FileText,
  Upload,
  Save,
  Camera,
  X,
  Loader2,
} from "lucide-react";

const expenseCategories = [
  { id: "utilities", name: "Utilități", icon: "⚡" },
  { id: "it", name: "Servicii IT", icon: "💻" },
  { id: "office", name: "Consumabile Birou", icon: "📎" },
  { id: "transport", name: "Transport", icon: "🚗" },
  { id: "rent", name: "Chirie", icon: "🏢" },
  { id: "salaries", name: "Salarii", icon: "👥" },
  { id: "marketing", name: "Marketing", icon: "📢" },
  { id: "legal", name: "Juridic", icon: "⚖️" },
  { id: "insurance", name: "Asigurări", icon: "🛡️" },
  { id: "other", name: "Altele", icon: "📦" },
];

const vatRates = [
  { rate: 19, label: "19% (Standard)" },
  { rate: 9, label: "9% (Redus)" },
  { rate: 5, label: "5% (Redus)" },
  { rate: 0, label: "0% (Scutit)" },
];

export default function NewExpensePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "",
    description: "",
    supplier: "",
    invoiceNumber: "",
    amount: "",
    vatRate: 19,
    vatAmount: "",
    isPaid: false,
    paymentDate: "",
    notes: "",
  });

  const calculateVAT = (amount: string, rate: number) => {
    const numAmount = parseFloat(amount) || 0;
    return ((numAmount * rate) / (100 + rate)).toFixed(2);
  };

  const handleAmountChange = (value: string) => {
    setFormData({
      ...formData,
      amount: value,
      vatAmount: calculateVAT(value, formData.vatRate),
    });
  };

  const handleVatRateChange = (rate: number) => {
    setFormData({
      ...formData,
      vatRate: rate,
      vatAmount: calculateVAT(formData.amount, rate),
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Simulate OCR scanning
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
        // Simulate extracted data
        setFormData({
          ...formData,
          supplier: "Furnizor Detectat SRL",
          amount: "250.00",
          vatAmount: calculateVAT("250.00", formData.vatRate),
        });
      }, 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement API call to save expense
      console.log("Saving expense:", formData);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/expenses");
    } catch (error) {
      console.error("Error saving expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/expenses"
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cheltuială Nouă</h1>
            <p className="text-slate-500">Înregistrează o cheltuială</p>
          </div>
        </div>

        {/* Receipt Upload */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Scanare Document
          </h2>

          {!uploadedFile ? (
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 transition">
                <div className="flex justify-center gap-4 mb-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-full">
                    <Camera className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <p className="text-slate-600 mb-2">
                  Încarcă sau fotografiază bonul/factura
                </p>
                <p className="text-sm text-slate-400">
                  Vom extrage automat datele folosind OCR
                </p>
              </div>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900">{uploadedFile.name}</p>
                  <p className="text-sm text-slate-500">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isScanning && (
                  <span className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Se scanează...
                  </span>
                )}
                <button
                  onClick={() => setUploadedFile(null)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Category Selection */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Categorie
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {expenseCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, category: category.id })
                  }
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition ${
                    formData.category === category.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="text-2xl mb-2">{category.icon}</span>
                  <span className="text-xs text-center text-slate-700">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Detalii Cheltuială
            </h2>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descriere *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Factură energie electrică decembrie"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Furnizor
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Numele furnizorului"
                    value={formData.supplier}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Număr Document
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Seria și numărul facturii"
                    value={formData.invoiceNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, invoiceNumber: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Sume</h2>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Total Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Suma Totală (RON) *
                </label>
                <div className="relative">
                  <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* VAT Rate */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cotă TVA
                </label>
                <select
                  value={formData.vatRate}
                  onChange={(e) => handleVatRateChange(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {vatRates.map((vat) => (
                    <option key={vat.rate} value={vat.rate}>
                      {vat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* VAT Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  TVA Deductibil (RON)
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.vatAmount || "0.00"}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Status Plată
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPaid"
                  checked={formData.isPaid}
                  onChange={(e) =>
                    setFormData({ ...formData, isPaid: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="isPaid"
                  className="text-sm font-medium text-slate-700"
                >
                  Cheltuiala a fost plătită
                </label>
              </div>

              {formData.isPaid && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Data Plății
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) =>
                        setFormData({ ...formData, paymentDate: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Observații
            </label>
            <textarea
              rows={3}
              placeholder="Note sau observații..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4 mb-20">
            <Link
              href="/expenses"
              className="px-6 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700"
            >
              Anulează
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSubmitting ? "Se salvează..." : "Salvează Cheltuială"}
            </button>
          </div>
        </form>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
