"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  ArrowLeft,
  Calculator,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  Printer,
  Send,
  ChevronDown,
  Info,
} from "lucide-react";

interface VATEntry {
  id: string;
  type: "collected" | "paid";
  documentNumber: string;
  partnerName: string;
  partnerCUI: string;
  date: string;
  taxableBase: number;
  vatAmount: number;
  vatRate: number;
}

const mockVATCollected: VATEntry[] = [
  {
    id: "1",
    type: "collected",
    documentNumber: "FAC-2025-0156",
    partnerName: "SC Alpha SRL",
    partnerCUI: "RO12345678",
    date: "2025-12-01",
    taxableBase: 5200.00,
    vatAmount: 988.00,
    vatRate: 19,
  },
  {
    id: "2",
    type: "collected",
    documentNumber: "FAC-2025-0155",
    partnerName: "Beta Construct SA",
    partnerCUI: "RO87654321",
    date: "2025-11-28",
    taxableBase: 12800.00,
    vatAmount: 2432.00,
    vatRate: 19,
  },
  {
    id: "3",
    type: "collected",
    documentNumber: "FAC-2025-0154",
    partnerName: "Gamma Services SRL",
    partnerCUI: "RO11223344",
    date: "2025-11-25",
    taxableBase: 3450.00,
    vatAmount: 655.50,
    vatRate: 19,
  },
];

const mockVATPaid: VATEntry[] = [
  {
    id: "1",
    type: "paid",
    documentNumber: "FF-2025-1234",
    partnerName: "Enel Energie",
    partnerCUI: "RO14811695",
    date: "2025-12-01",
    taxableBase: 378.15,
    vatAmount: 71.85,
    vatRate: 19,
  },
  {
    id: "2",
    type: "paid",
    documentNumber: "FF-2025-5678",
    partnerName: "OMV Petrom",
    partnerCUI: "RO1590082",
    date: "2025-11-28",
    taxableBase: 235.29,
    vatAmount: 44.71,
    vatRate: 19,
  },
  {
    id: "3",
    type: "paid",
    documentNumber: "FF-2025-9012",
    partnerName: "Office Depot",
    partnerCUI: "RO9876543",
    date: "2025-11-20",
    taxableBase: 269.33,
    vatAmount: 51.17,
    vatRate: 19,
  },
];

const months = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

export default function VATReportPage() {
  const [selectedMonth, setSelectedMonth] = useState(11); // December (0-indexed)
  const [selectedYear, setSelectedYear] = useState(2025);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const totalCollected = mockVATCollected.reduce((sum, e) => sum + e.vatAmount, 0);
  const totalPaid = mockVATPaid.reduce((sum, e) => sum + e.vatAmount, 0);
  const vatDue = totalCollected - totalPaid;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/reports"
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calculator className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Raport TVA</h1>
                  <p className="text-slate-500">Decontul de TVA pentru perioada selectată</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Month Selector */}
            <div className="relative">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-slate-700">
                  {months[selectedMonth]} {selectedYear}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showMonthPicker && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setSelectedYear(selectedYear - 1)}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      ←
                    </button>
                    <span className="font-medium text-slate-900">{selectedYear}</span>
                    <button
                      onClick={() => setSelectedYear(selectedYear + 1)}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      →
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((month, index) => (
                      <button
                        key={month}
                        onClick={() => {
                          setSelectedMonth(index);
                          setShowMonthPicker(false);
                        }}
                        className={`p-2 text-sm rounded-lg transition ${
                          selectedMonth === index
                            ? "bg-purple-600 text-white"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {month.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700">
              <Printer className="w-4 h-4" />
              Printează
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              <Download className="w-4 h-4" />
              Export D300
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-500">TVA Colectat</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(totalCollected)} RON
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Din {mockVATCollected.length} facturi emise
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-sm text-slate-500">TVA Deductibil</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(totalPaid)} RON
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Din {mockVATPaid.length} facturi primite
            </p>
          </div>

          <div className={`rounded-xl shadow-sm p-6 ${vatDue >= 0 ? "bg-amber-50" : "bg-emerald-50"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${vatDue >= 0 ? "bg-amber-100" : "bg-emerald-100"}`}>
                <Calculator className={`w-6 h-6 ${vatDue >= 0 ? "text-amber-600" : "text-emerald-600"}`} />
              </div>
              <span className="text-sm text-slate-500">
                {vatDue >= 0 ? "TVA de Plată" : "TVA de Recuperat"}
              </span>
            </div>
            <p className={`text-3xl font-bold ${vatDue >= 0 ? "text-amber-700" : "text-emerald-700"}`}>
              {formatCurrency(Math.abs(vatDue))} RON
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Termen: 25 {months[(selectedMonth + 1) % 12]}
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">
              Declarația D300 trebuie depusă până la data de 25 a lunii următoare perioadei de raportare.
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Asigură-te că toate facturile sunt înregistrate corect înainte de generarea declarației.
            </p>
          </div>
        </div>

        {/* VAT Collected Table */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              TVA Colectat (Vânzări)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    Bază Impozabilă
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    Cotă
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    TVA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mockVATCollected.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{entry.documentNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{entry.partnerName}</p>
                      <p className="text-xs text-slate-500">{entry.partnerCUI}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(entry.taxableBase)} RON
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-700">
                        {entry.vatRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                      {formatCurrency(entry.vatAmount)} RON
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 font-semibold text-slate-900">
                    Total TVA Colectat
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                    {formatCurrency(mockVATCollected.reduce((sum, e) => sum + e.taxableBase, 0))} RON
                  </td>
                  <td></td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-700">
                    {formatCurrency(totalCollected)} RON
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* VAT Paid Table */}
        <div className="bg-white rounded-xl shadow-sm mb-20">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              TVA Deductibil (Achiziții)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Furnizor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    Bază Impozabilă
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    Cotă
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    TVA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mockVATPaid.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{entry.documentNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{entry.partnerName}</p>
                      <p className="text-xs text-slate-500">{entry.partnerCUI}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(entry.taxableBase)} RON
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-700">
                        {entry.vatRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-red-600">
                      {formatCurrency(entry.vatAmount)} RON
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-red-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 font-semibold text-slate-900">
                    Total TVA Deductibil
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                    {formatCurrency(mockVATPaid.reduce((sum, e) => sum + e.taxableBase, 0))} RON
                  </td>
                  <td></td>
                  <td className="px-6 py-4 text-right font-bold text-red-700">
                    {formatCurrency(totalPaid)} RON
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
