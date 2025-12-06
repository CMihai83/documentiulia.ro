"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Upload,
  ChevronDown,
} from "lucide-react";

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  supplier: string;
  amount: number;
  vatAmount: number;
  isPaid: boolean;
  receiptUrl?: string;
}

const mockExpenses: Expense[] = [
  {
    id: "1",
    date: "2025-12-01",
    category: "Utilități",
    description: "Factură energie electrică",
    supplier: "Enel Energie",
    amount: 450.00,
    vatAmount: 85.50,
    isPaid: true,
  },
  {
    id: "2",
    date: "2025-11-28",
    category: "Servicii IT",
    description: "Hosting și domeniu",
    supplier: "Gazduire Web SRL",
    amount: 150.00,
    vatAmount: 28.50,
    isPaid: true,
  },
  {
    id: "3",
    date: "2025-11-25",
    category: "Consumabile",
    description: "Rechizite birou",
    supplier: "Office Depot",
    amount: 320.50,
    vatAmount: 60.90,
    isPaid: false,
  },
  {
    id: "4",
    date: "2025-11-20",
    category: "Transport",
    description: "Combustibil",
    supplier: "OMV Petrom",
    amount: 280.00,
    vatAmount: 53.20,
    isPaid: true,
  },
  {
    id: "5",
    date: "2025-11-15",
    category: "Chirie",
    description: "Chirie birou luna noiembrie",
    supplier: "Real Estate SRL",
    amount: 2500.00,
    vatAmount: 475.00,
    isPaid: true,
  },
];

const categories = [
  "Toate",
  "Utilități",
  "Servicii IT",
  "Consumabile",
  "Transport",
  "Chirie",
  "Salarii",
  "Marketing",
  "Altele",
];

export default function ExpensesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toate");
  const [showFilters, setShowFilters] = useState(false);
  const [expenses] = useState<Expense[]>(mockExpenses);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "Toate" || expense.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalVAT = filteredExpenses.reduce((sum, e) => sum + e.vatAmount, 0);
  const unpaidTotal = filteredExpenses
    .filter((e) => !e.isPaid)
    .reduce((sum, e) => sum + e.amount, 0);

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Receipt className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Cheltuieli</h1>
              <p className="text-slate-500">Gestionează cheltuielile companiei</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700">
            <Upload className="w-4 h-4" />
            Scanează Bon
          </button>
          <Link
            href="/expenses/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Cheltuială Nouă
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Cheltuieli</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalExpenses)} RON
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">TVA Deductibil</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(totalVAT)} RON
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">De Plătit</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(unpaidTotal)} RON
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <Calendar className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Caută după descriere sau furnizor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition w-full md:w-auto"
            >
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-slate-700">{selectedCategory}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowFilters(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-slate-50 transition text-sm ${
                      selectedCategory === category
                        ? "text-blue-600 bg-blue-50"
                        : "text-slate-700"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-20">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Descriere
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Categorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Furnizor
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Sumă
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(expense.date)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">
                      {expense.description}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {expense.supplier}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {formatCurrency(expense.amount)} RON
                    </p>
                    <p className="text-xs text-slate-500">
                      TVA: {formatCurrency(expense.vatAmount)}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        expense.isPaid
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {expense.isPaid ? "Plătit" : "Neplătit"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1 hover:bg-slate-100 rounded transition">
                        <Eye className="w-4 h-4 text-slate-500" />
                      </button>
                      <button className="p-1 hover:bg-slate-100 rounded transition">
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </button>
                      <button className="p-1 hover:bg-red-100 rounded transition">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-200">
          {filteredExpenses.map((expense) => (
            <div key={expense.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-slate-900">{expense.description}</p>
                  <p className="text-sm text-slate-500">{expense.supplier}</p>
                </div>
                <button className="p-1">
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {formatDate(expense.date)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                    {expense.category}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900">
                    {formatCurrency(expense.amount)} RON
                  </p>
                  <span
                    className={`text-xs ${
                      expense.isPaid ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {expense.isPaid ? "Plătit" : "Neplătit"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredExpenses.length === 0 && (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nu s-au găsit cheltuieli</p>
            <Link
              href="/expenses/new"
              className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Adaugă prima cheltuială
            </Link>
          </div>
        )}
      </div>
      <MobileNav />
    </AppLayout>
  );
}
