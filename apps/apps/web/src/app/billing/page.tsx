"use client";

import { useState } from "react";
import {
  CreditCard,
  Check,
  Star,
  Zap,
  Building2,
  Users,
  FileText,
  BarChart3,
  Shield,
  Clock,
  Download,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  Receipt,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { AppLayout, MobileNav } from "@/components/layout";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  highlighted?: boolean;
  current?: boolean;
}

interface PaymentMethod {
  id: string;
  type: "card" | "bank";
  last4: string;
  brand?: string;
  expiry?: string;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Pentru freelanceri și PFA-uri",
    price: 49,
    interval: "month",
    features: [
      "1 companie",
      "100 facturi/lună",
      "5 GB stocare documente",
      "E-Factura integrat",
      "Rapoarte de bază",
      "Suport email",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Pentru afaceri în creștere",
    price: 149,
    interval: "month",
    features: [
      "3 companii",
      "Facturi nelimitate",
      "25 GB stocare documente",
      "E-Factura integrat",
      "Rapoarte avansate",
      "Extragere AI documente",
      "Integrări bancare",
      "Suport prioritar",
    ],
    highlighted: true,
    current: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Pentru corporații și contabili",
    price: 399,
    interval: "month",
    features: [
      "Companii nelimitate",
      "Facturi nelimitate",
      "100 GB stocare documente",
      "E-Factura integrat",
      "Rapoarte personalizate",
      "Extragere AI avansată",
      "Toate integrările",
      "API access",
      "Manager dedicat",
      "SLA garantat",
    ],
  },
];

const paymentMethods: PaymentMethod[] = [
  {
    id: "1",
    type: "card",
    last4: "4242",
    brand: "Visa",
    expiry: "12/25",
    isDefault: true,
  },
  {
    id: "2",
    type: "card",
    last4: "5555",
    brand: "Mastercard",
    expiry: "08/26",
    isDefault: false,
  },
];

const billingHistory: Invoice[] = [
  { id: "1", number: "INV-2024-012", date: "2024-12-01", amount: 149, status: "paid" },
  { id: "2", number: "INV-2024-011", date: "2024-11-01", amount: 149, status: "paid" },
  { id: "3", number: "INV-2024-010", date: "2024-10-01", amount: 149, status: "paid" },
  { id: "4", number: "INV-2024-009", date: "2024-09-01", amount: 149, status: "paid" },
];

export default function BillingPage() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [showAddCard, setShowAddCard] = useState(false);

  const currentPlan = plans.find((p) => p.current);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <AppLayout>
      <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Facturare și Abonament</h1>
        <p className="text-slate-500">Gestionează planul și metodele de plată</p>
      </div>

      {/* Current Plan */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-300" />
              <span className="text-blue-100">Plan curent</span>
            </div>
            <h2 className="text-2xl font-bold">{currentPlan?.name}</h2>
            <p className="text-blue-100 mt-1">{currentPlan?.description}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {currentPlan?.price} lei
              <span className="text-lg font-normal text-blue-200">/lună</span>
            </div>
            <p className="text-blue-200 text-sm mt-1">
              Următoarea facturare: 1 Ianuarie 2025
            </p>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
          <div>
            <p className="text-blue-200 text-sm">Companii</p>
            <p className="text-xl font-semibold">2 / 3</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">Facturi luna aceasta</p>
            <p className="text-xl font-semibold">127 / ∞</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">Stocare folosită</p>
            <p className="text-xl font-semibold">8.2 / 25 GB</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">Documente AI</p>
            <p className="text-xl font-semibold">45 procesate</p>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Planuri disponibile</h2>
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setBillingInterval("month")}
              className={`px-4 py-2 text-sm rounded-md transition ${
                billingInterval === "month" ? "bg-white text-slate-900 shadow" : "text-slate-600"
              }`}
            >
              Lunar
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`px-4 py-2 text-sm rounded-md transition flex items-center gap-2 ${
                billingInterval === "year" ? "bg-white text-slate-900 shadow" : "text-slate-600"
              }`}
            >
              Anual
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border-2 p-6 transition ${
                plan.highlighted
                  ? "border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/10"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {plan.highlighted && (
                <div className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-4">
                  <Zap className="w-4 h-4" />
                  Cel mai popular
                </div>
              )}

              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{plan.description}</p>

              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900">
                  {billingInterval === "year" ? Math.round(plan.price * 0.8) : plan.price}
                </span>
                <span className="text-slate-500"> lei/lună</span>
                {billingInterval === "year" && (
                  <p className="text-sm text-emerald-600 mt-1">
                    Facturare anuală: {Math.round(plan.price * 0.8 * 12)} lei/an
                  </p>
                )}
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 flex-shrink-0 ${plan.highlighted ? "text-blue-600" : "text-emerald-500"}`} />
                    <span className="text-slate-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full mt-6 py-3 rounded-xl font-medium transition ${
                  plan.current
                    ? "bg-slate-100 text-slate-400 cursor-default"
                    : plan.highlighted
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
                disabled={plan.current}
              >
                {plan.current ? "Plan curent" : "Alege acest plan"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Metode de plată</h2>
          <button
            onClick={() => setShowAddCard(true)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Adaugă card
          </button>
        </div>

        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                method.isDefault ? "border-blue-200 bg-blue-50" : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-slate-100 rounded flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {method.brand} •••• {method.last4}
                  </p>
                  <p className="text-sm text-slate-500">Expiră {method.expiry}</p>
                </div>
                {method.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    Implicit
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Istoric facturare</h2>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Descarcă toate facturile
          </button>
        </div>

        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-700">Factură</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-700">Data</th>
              <th className="text-right py-3 px-6 text-sm font-medium text-slate-700">Sumă</th>
              <th className="text-center py-3 px-6 text-sm font-medium text-slate-700">Status</th>
              <th className="text-right py-3 px-6 text-sm font-medium text-slate-700">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {billingHistory.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-slate-50">
                <td className="py-4 px-6">
                  <p className="font-medium text-slate-900">{invoice.number}</p>
                </td>
                <td className="py-4 px-6 text-slate-600">
                  {formatDate(invoice.date)}
                </td>
                <td className="py-4 px-6 text-right font-medium text-slate-900">
                  {invoice.amount} lei
                </td>
                <td className="py-4 px-6 text-center">
                  {invoice.status === "paid" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Achitată
                    </span>
                  ) : invoice.status === "pending" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      <Clock className="w-3 h-3" />
                      În așteptare
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      Eșuată
                    </span>
                  )}
                </td>
                <td className="py-4 px-6 text-right">
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cancel Subscription */}
      <div className="bg-slate-50 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900">Anulează abonamentul</h3>
          <p className="text-sm text-slate-500 mt-1">
            Vei avea acces până la sfârșitul perioadei de facturare curente
          </p>
        </div>
        <button className="text-red-600 hover:text-red-700 text-sm font-medium">
          Anulează abonamentul
        </button>
      </div>

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Adaugă card nou</h2>
              <button
                onClick={() => setShowAddCard(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Număr card
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Data expirare
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nume pe card
                </label>
                <input
                  type="text"
                  placeholder="Ion Popescu"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">Setează ca metodă de plată implicită</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowAddCard(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Anulează
              </button>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Adaugă card
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      <MobileNav />
    </AppLayout>
  );
}
