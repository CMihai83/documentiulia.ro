"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Receipt,
  Building2,
  Truck,
  FileSpreadsheet,
  Filter,
  Plus,
  Info,
} from "lucide-react";

type ObligationType = "TVA" | "SAFT" | "EFACTURA" | "CONTRIBUTII" | "IMPOZIT" | "ETRANSPORT" | "DECLARATIE";

interface FiscalObligation {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  type: ObligationType;
  status: "upcoming" | "due_soon" | "overdue" | "completed";
  form?: string;
  amount?: number;
  reminder?: boolean;
}

const fiscalObligations: FiscalObligation[] = [
  {
    id: "1",
    title: "Decont TVA - D300",
    description: "Depunere decont TVA pentru luna noiembrie",
    dueDate: "2024-12-25",
    type: "TVA",
    status: "due_soon",
    form: "D300",
    reminder: true,
  },
  {
    id: "2",
    title: "SAF-T D406 - Noiembrie",
    description: "Transmitere fișier SAF-T pentru luna noiembrie",
    dueDate: "2024-12-31",
    type: "SAFT",
    status: "upcoming",
    form: "D406",
  },
  {
    id: "3",
    title: "Declarație 112",
    description: "Contribuții sociale și impozit pe salarii",
    dueDate: "2024-12-25",
    type: "CONTRIBUTII",
    status: "due_soon",
    form: "D112",
    amount: 15420,
  },
  {
    id: "4",
    title: "Impozit pe profit trimestrial",
    description: "Plată impozit profit T4 2024",
    dueDate: "2025-01-25",
    type: "IMPOZIT",
    status: "upcoming",
    form: "D101",
    amount: 8500,
  },
  {
    id: "5",
    title: "e-Facturi nevalidate",
    description: "3 facturi în așteptare validare ANAF",
    dueDate: "2024-12-15",
    type: "EFACTURA",
    status: "overdue",
  },
  {
    id: "6",
    title: "Declarație 394",
    description: "Declarație recapitulativă livrări/achiziții intracomunitare",
    dueDate: "2024-12-25",
    type: "DECLARATIE",
    status: "due_soon",
    form: "D394",
  },
  {
    id: "7",
    title: "Decont TVA - D300 (Oct)",
    description: "Depunere decont TVA pentru luna octombrie",
    dueDate: "2024-11-25",
    type: "TVA",
    status: "completed",
    form: "D300",
  },
  {
    id: "8",
    title: "SAF-T D406 - Octombrie",
    description: "Transmitere fișier SAF-T pentru luna octombrie",
    dueDate: "2024-11-30",
    type: "SAFT",
    status: "completed",
    form: "D406",
  },
];

const typeConfig: Record<ObligationType, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  TVA: { icon: Receipt, color: "blue", label: "TVA" },
  SAFT: { icon: FileSpreadsheet, color: "emerald", label: "SAF-T" },
  EFACTURA: { icon: FileText, color: "purple", label: "e-Factura" },
  CONTRIBUTII: { icon: Building2, color: "orange", label: "Contribuții" },
  IMPOZIT: { icon: Building2, color: "red", label: "Impozit" },
  ETRANSPORT: { icon: Truck, color: "amber", label: "e-Transport" },
  DECLARATIE: { icon: FileText, color: "slate", label: "Declarație" },
};

const statusConfig = {
  upcoming: { bg: "bg-slate-100", text: "text-slate-700", label: "Viitoare" },
  due_soon: { bg: "bg-amber-100", text: "text-amber-700", label: "În curând" },
  overdue: { bg: "bg-red-100", text: "text-red-700", label: "Restantă" },
  completed: { bg: "bg-green-100", text: "text-green-700", label: "Completată" },
};

export default function FiscalCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ObligationType | "ALL">("ALL");

  const monthNames = [
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
  ];

  const daysOfWeek = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysInMonth = lastDay.getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    while (days.length % 7 !== 0) days.push(null);

    return days;
  };

  const getObligationsForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return fiscalObligations.filter((o) => o.dueDate === dateStr);
  };

  const filteredObligations = fiscalObligations.filter((o) => {
    if (typeFilter !== "ALL" && o.type !== typeFilter) return false;
    if (selectedDate && o.dueDate !== selectedDate) return false;
    return true;
  });

  const upcomingObligations = fiscalObligations
    .filter((o) => o.status !== "completed")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const stats = {
    total: fiscalObligations.filter((o) => o.status !== "completed").length,
    dueSoon: fiscalObligations.filter((o) => o.status === "due_soon").length,
    overdue: fiscalObligations.filter((o) => o.status === "overdue").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-7 h-7 text-blue-600" />
              Calendar Fiscal
            </h1>
            <p className="text-slate-600 mt-1">
              Termene și obligații fiscale
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2.5 rounded-xl font-medium border border-slate-200 hover:bg-slate-50 transition">
              <Bell className="w-5 h-5" />
              Notificări
            </button>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition">
              <Plus className="w-5 h-5" />
              Adaugă Termen
            </button>
          </div>
        </div>

        {/* Alert Banner */}
        {stats.overdue > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">
                  Ai {stats.overdue} obligații restante!
                </p>
                <p className="text-sm text-red-700">
                  Verifică și regularizează situația pentru a evita penalități.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Obligații active</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.dueSoon}</p>
                <p className="text-sm text-slate-500">În curând</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.overdue}</p>
                <p className="text-sm text-slate-500">Restante</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h2 className="text-lg font-semibold text-slate-900">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((day, index) => {
                if (day === null) {
                  return <div key={index} className="h-20" />;
                }

                const obligations = getObligationsForDate(day);
                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = selectedDate === dateStr;
                const isToday = new Date().toDateString() === new Date(dateStr).toDateString();

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`h-20 p-1 rounded-lg border transition text-left ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : isToday
                        ? "border-blue-300 bg-blue-50/50"
                        : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      isToday ? "text-blue-600" : "text-slate-700"
                    }`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {obligations.slice(0, 2).map((o) => {
                        const config = typeConfig[o.type];
                        return (
                          <div
                            key={o.id}
                            className={`text-[10px] px-1 py-0.5 rounded truncate ${
                              o.status === "overdue"
                                ? "bg-red-100 text-red-700"
                                : o.status === "due_soon"
                                ? "bg-amber-100 text-amber-700"
                                : o.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : `bg-${config.color}-100 text-${config.color}-700`
                            }`}
                          >
                            {o.form || o.title.slice(0, 10)}
                          </div>
                        );
                      })}
                      {obligations.length > 2 && (
                        <div className="text-[10px] text-slate-500">
                          +{obligations.length - 2} mai mult
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Termene Apropiate
              </h3>
              <div className="space-y-3">
                {upcomingObligations.map((obligation) => {
                  const config = typeConfig[obligation.type];
                  const status = statusConfig[obligation.status];
                  const Icon = config.icon;
                  const daysLeft = Math.ceil(
                    (new Date(obligation.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div
                      key={obligation.id}
                      className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 bg-${config.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 text-${config.color}-600`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">
                            {obligation.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(obligation.dueDate).toLocaleDateString("ro-RO")}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
                          {daysLeft > 0 ? `${daysLeft}z` : daysLeft === 0 ? "Azi" : "Restant"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Type Filter */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-400" />
                Filtrează după tip
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setTypeFilter("ALL")}
                  className={`w-full p-2 rounded-lg text-left text-sm transition ${
                    typeFilter === "ALL" ? "bg-blue-100 text-blue-700" : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  Toate tipurile
                </button>
                {Object.entries(typeConfig).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type as ObligationType)}
                      className={`w-full p-2 rounded-lg text-left text-sm transition flex items-center gap-2 ${
                        typeFilter === type ? `bg-${config.color}-100 text-${config.color}-700` : "hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 text-sm">Termene Importante</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Ziua 25: D300, D112, D394
                    <br />
                    Ultima zi: SAF-T D406
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
