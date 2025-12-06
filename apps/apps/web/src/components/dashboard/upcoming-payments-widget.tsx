"use client";

import { useState } from "react";
import {
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronRight,
  Bell,
  Banknote,
  Building,
  FileText,
  Users,
  Truck,
  Zap,
  Wifi,
  Shield,
} from "lucide-react";

// Payment types with Romanian labels
const PAYMENT_TYPES = {
  INVOICE: { label: "Factură furnizor", icon: FileText, color: "text-blue-600" },
  SALARY: { label: "Salarii", icon: Users, color: "text-emerald-600" },
  TAX: { label: "Taxe și impozite", icon: Building, color: "text-purple-600" },
  UTILITY: { label: "Utilități", icon: Zap, color: "text-orange-600" },
  RENT: { label: "Chirie", icon: Building, color: "text-pink-600" },
  LOAN: { label: "Rată credit", icon: Banknote, color: "text-red-600" },
  SUBSCRIPTION: { label: "Abonament", icon: Wifi, color: "text-cyan-600" },
  INSURANCE: { label: "Asigurare", icon: Shield, color: "text-indigo-600" },
  SUPPLIER: { label: "Furnizor", icon: Truck, color: "text-amber-600" },
};

// Payment statuses
const PAYMENT_STATUSES = {
  PENDING: { label: "În așteptare", color: "bg-yellow-100 text-yellow-700" },
  DUE_SOON: { label: "Scadent curând", color: "bg-orange-100 text-orange-700" },
  OVERDUE: { label: "Restant", color: "bg-red-100 text-red-700" },
  SCHEDULED: { label: "Programat", color: "bg-blue-100 text-blue-700" },
  PAID: { label: "Plătit", color: "bg-emerald-100 text-emerald-700" },
};

// Priority levels
const PRIORITIES = {
  CRITICAL: { label: "Critic", color: "border-l-red-500" },
  HIGH: { label: "Înalt", color: "border-l-orange-500" },
  MEDIUM: { label: "Mediu", color: "border-l-yellow-500" },
  LOW: { label: "Scăzut", color: "border-l-slate-300" },
};

interface Payment {
  id: string;
  title: string;
  amount: number;
  currency: string;
  dueDate: string;
  type: keyof typeof PAYMENT_TYPES;
  status: keyof typeof PAYMENT_STATUSES;
  priority: keyof typeof PRIORITIES;
  isRecurring: boolean;
  recurringPeriod?: "weekly" | "monthly" | "quarterly" | "yearly";
  autoPayEnabled: boolean;
  supplier?: string;
  reference?: string;
}

// Demo payments data
const demoPayments: Payment[] = [
  {
    id: "1",
    title: "Chirie sediu",
    amount: 2500,
    currency: "RON",
    dueDate: "2025-12-05",
    type: "RENT",
    status: "DUE_SOON",
    priority: "HIGH",
    isRecurring: true,
    recurringPeriod: "monthly",
    autoPayEnabled: true,
    supplier: "Landlord SRL",
  },
  {
    id: "2",
    title: "Salarii angajați",
    amount: 45000,
    currency: "RON",
    dueDate: "2025-12-10",
    type: "SALARY",
    status: "PENDING",
    priority: "CRITICAL",
    isRecurring: true,
    recurringPeriod: "monthly",
    autoPayEnabled: false,
  },
  {
    id: "3",
    title: "Factură energie electrică",
    amount: 1850,
    currency: "RON",
    dueDate: "2025-12-01",
    type: "UTILITY",
    status: "OVERDUE",
    priority: "HIGH",
    isRecurring: true,
    recurringPeriod: "monthly",
    autoPayEnabled: false,
    supplier: "Enel",
    reference: "FA-2024-11-4521",
  },
  {
    id: "4",
    title: "Abonament software contabilitate",
    amount: 299,
    currency: "RON",
    dueDate: "2025-12-15",
    type: "SUBSCRIPTION",
    status: "SCHEDULED",
    priority: "MEDIUM",
    isRecurring: true,
    recurringPeriod: "monthly",
    autoPayEnabled: true,
    supplier: "DocumentIulia",
  },
  {
    id: "5",
    title: "Rată leasing auto",
    amount: 3200,
    currency: "RON",
    dueDate: "2025-12-20",
    type: "LOAN",
    status: "PENDING",
    priority: "HIGH",
    isRecurring: true,
    recurringPeriod: "monthly",
    autoPayEnabled: true,
    supplier: "BCR Leasing",
  },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
  });
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getDaysUntilDue(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString);
  dueDate.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface UpcomingPaymentsWidgetProps {
  payments?: Payment[];
  showCalendarView?: boolean;
}

export function UpcomingPaymentsWidget({
  payments = demoPayments,
  showCalendarView = false,
}: UpcomingPaymentsWidgetProps) {
  const [viewMode, setViewMode] = useState<"list" | "calendar">(showCalendarView ? "calendar" : "list");
  const [filter, setFilter] = useState<"all" | "overdue" | "upcoming">("all");

  // Sort by priority and due date
  const sortedPayments = [...payments].sort((a, b) => {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Filter payments
  const filteredPayments = sortedPayments.filter((payment) => {
    if (filter === "overdue") return payment.status === "OVERDUE";
    if (filter === "upcoming") return payment.status !== "PAID" && payment.status !== "OVERDUE";
    return true;
  });

  // Calculate totals
  const totalDue = filteredPayments
    .filter((p) => p.status !== "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const overdueCount = payments.filter((p) => p.status === "OVERDUE").length;

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Plăți Programate</h2>
              <p className="text-sm text-slate-500">
                Total de plătit: <span className="font-medium text-slate-900">{formatAmount(totalDue, "RON")}</span>
              </p>
            </div>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{overdueCount} restante</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              filter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Toate
          </button>
          <button
            onClick={() => setFilter("overdue")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              filter === "overdue"
                ? "bg-red-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Restante
          </button>
          <button
            onClick={() => setFilter("upcoming")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              filter === "upcoming"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Viitoare
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
            title={viewMode === "list" ? "Vezi calendar" : "Vezi listă"}
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Payment List */}
      <div className="divide-y max-h-96 overflow-y-auto">
        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <p>Nicio plată {filter === "overdue" ? "restantă" : "programată"}</p>
          </div>
        ) : (
          filteredPayments.map((payment) => {
            const typeConfig = PAYMENT_TYPES[payment.type];
            const statusConfig = PAYMENT_STATUSES[payment.status];
            const priorityConfig = PRIORITIES[payment.priority];
            const daysUntil = getDaysUntilDue(payment.dueDate);
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={payment.id}
                className={`p-4 hover:bg-slate-50 transition border-l-4 ${priorityConfig.color}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 bg-slate-100 rounded-lg ${typeConfig.color}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-slate-900">{payment.title}</h3>
                        {payment.supplier && (
                          <p className="text-sm text-slate-500">{payment.supplier}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          {formatAmount(payment.amount, payment.currency)}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(payment.dueDate)}
                        {daysUntil < 0 && (
                          <span className="text-red-600 font-medium">
                            ({Math.abs(daysUntil)} zile întârziere)
                          </span>
                        )}
                        {daysUntil >= 0 && daysUntil <= 3 && (
                          <span className="text-orange-600 font-medium">
                            ({daysUntil === 0 ? "Astăzi" : `în ${daysUntil} zile`})
                          </span>
                        )}
                      </span>
                      {payment.isRecurring && (
                        <span className="flex items-center gap-1 text-sm text-slate-400">
                          <RefreshCw className="w-3.5 h-3.5" />
                          {payment.recurringPeriod === "monthly" && "Lunar"}
                          {payment.recurringPeriod === "weekly" && "Săptămânal"}
                          {payment.recurringPeriod === "quarterly" && "Trimestrial"}
                          {payment.recurringPeriod === "yearly" && "Anual"}
                        </span>
                      )}
                      {payment.autoPayEnabled && (
                        <span className="flex items-center gap-1 text-sm text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Auto-plată
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-slate-50 rounded-b-xl">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition">
            <Bell className="w-4 h-4" />
            Configurează notificări
          </button>
          <button className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition">
            Vezi toate plățile
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
