"use client";

import { useState } from "react";
import {
  Building,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  FileText,
  ChevronRight,
  ChevronDown,
  Info,
  Calculator,
  Send,
  Download,
  Upload,
} from "lucide-react";

// Romanian tax declaration types
const TAX_DECLARATIONS = {
  D100: {
    name: "Declarația 100",
    fullName: "Declarație privind obligațiile de plată la bugetul de stat",
    frequency: "monthly",
    dueDay: 25,
    portalUrl: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online/formulare_fiscale",
  },
  D112: {
    name: "Declarația 112",
    fullName: "Declarație privind obligațiile de plată a contribuțiilor sociale",
    frequency: "monthly",
    dueDay: 25,
    portalUrl: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online/formulare_fiscale",
  },
  D300: {
    name: "Declarația 300",
    fullName: "Decont de TVA",
    frequency: "monthly",
    dueDay: 25,
    portalUrl: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online/formulare_fiscale",
  },
  D390: {
    name: "Declarația 390",
    fullName: "Declarație recapitulativă privind livrările/achizițiile/prestările intracomunitare",
    frequency: "monthly",
    dueDay: 25,
    portalUrl: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online/formulare_fiscale",
  },
  D394: {
    name: "Declarația 394",
    fullName: "Declarație informativă privind livrările/prestările și achizițiile",
    frequency: "monthly",
    dueDay: 30,
    portalUrl: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online/formulare_fiscale",
  },
  D406: {
    name: "SAF-T (D406)",
    fullName: "Fișier standard de control fiscal",
    frequency: "monthly",
    dueDay: lastDayOfFollowingMonth,
    portalUrl: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online/formulare_fiscale",
  },
  TVA: {
    name: "Plată TVA",
    fullName: "Plata TVA datorat",
    frequency: "monthly",
    dueDay: 25,
    portalUrl: "https://www.ghiseul.ro",
  },
};

function lastDayOfFollowingMonth(): number {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  return nextMonth.getDate();
}

// Obligation statuses
const OBLIGATION_STATUSES = {
  NOT_STARTED: { label: "Neînceput", color: "bg-slate-100 text-slate-600", icon: Clock },
  IN_PROGRESS: { label: "În lucru", color: "bg-blue-100 text-blue-700", icon: FileText },
  READY_TO_SUBMIT: { label: "Gata de trimitere", color: "bg-yellow-100 text-yellow-700", icon: Send },
  SUBMITTED: { label: "Transmis", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  ACCEPTED: { label: "Acceptat ANAF", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  REJECTED: { label: "Respins", color: "bg-red-100 text-red-700", icon: AlertCircle },
  OVERDUE: { label: "Depășit", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

interface TaxObligation {
  id: string;
  type: keyof typeof TAX_DECLARATIONS;
  period: string; // e.g., "Noiembrie 2025"
  dueDate: string;
  declarationStatus: keyof typeof OBLIGATION_STATUSES;
  paymentStatus?: keyof typeof OBLIGATION_STATUSES;
  amount?: number;
  submittedAt?: string;
  indexNumber?: string; // ANAF index number after submission
  notes?: string;
}

// Demo obligations data
const demoObligations: TaxObligation[] = [
  {
    id: "1",
    type: "D300",
    period: "Noiembrie 2025",
    dueDate: "2025-12-25",
    declarationStatus: "IN_PROGRESS",
    paymentStatus: "NOT_STARTED",
    amount: 15420,
  },
  {
    id: "2",
    type: "D112",
    period: "Noiembrie 2025",
    dueDate: "2025-12-25",
    declarationStatus: "READY_TO_SUBMIT",
    amount: 8750,
  },
  {
    id: "3",
    type: "D100",
    period: "Noiembrie 2025",
    dueDate: "2025-12-25",
    declarationStatus: "NOT_STARTED",
    amount: 3200,
  },
  {
    id: "4",
    type: "D406",
    period: "Noiembrie 2025",
    dueDate: "2025-12-31",
    declarationStatus: "NOT_STARTED",
  },
  {
    id: "5",
    type: "D390",
    period: "Noiembrie 2025",
    dueDate: "2025-12-25",
    declarationStatus: "SUBMITTED",
    submittedAt: "2025-12-01T10:30:00",
    indexNumber: "1234567890",
  },
  {
    id: "6",
    type: "D300",
    period: "Octombrie 2025",
    dueDate: "2025-11-25",
    declarationStatus: "ACCEPTED",
    paymentStatus: "SUBMITTED",
    amount: 12350,
    submittedAt: "2025-11-20T14:15:00",
    indexNumber: "9876543210",
  },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
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

interface TaxObligationsWidgetProps {
  obligations?: TaxObligation[];
  companyName?: string;
}

export function TaxObligationsWidget({
  obligations = demoObligations,
  companyName = "Test Company SRL",
}: TaxObligationsWidgetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"current" | "past" | "all">("current");

  // Filter obligations
  const filteredObligations = obligations.filter((obligation) => {
    const daysUntil = getDaysUntilDue(obligation.dueDate);
    if (filter === "current") return daysUntil >= -30;
    if (filter === "past") return daysUntil < -30;
    return true;
  });

  // Sort by due date and status
  const sortedObligations = [...filteredObligations].sort((a, b) => {
    // Overdue first
    const aDays = getDaysUntilDue(a.dueDate);
    const bDays = getDaysUntilDue(b.dueDate);
    if (aDays < 0 && bDays >= 0) return -1;
    if (bDays < 0 && aDays >= 0) return 1;
    return aDays - bDays;
  });

  // Calculate stats
  const pendingCount = obligations.filter(
    (o) => !["SUBMITTED", "ACCEPTED"].includes(o.declarationStatus)
  ).length;
  const overdueCount = obligations.filter(
    (o) => getDaysUntilDue(o.dueDate) < 0 && !["SUBMITTED", "ACCEPTED"].includes(o.declarationStatus)
  ).length;
  const totalToPay = obligations
    .filter((o) => o.amount && o.paymentStatus !== "SUBMITTED")
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Obligații Fiscale</h2>
              <p className="text-sm text-slate-500">{companyName}</p>
            </div>
          </div>
          <a
            href="https://www.anaf.ro/anaf/internet/ANAF/servicii_online"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
          >
            Portal ANAF
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
            <p className="text-xs text-slate-500">De completat</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            {overdueCount > 0 ? (
              <>
                <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                <p className="text-xs text-red-600">Depășite</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-emerald-600">0</p>
                <p className="text-xs text-slate-500">Depășite</p>
              </>
            )}
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{formatAmount(totalToPay)}</p>
            <p className="text-xs text-slate-500">De plătit</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("current")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              filter === "current"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Luna curentă
          </button>
          <button
            onClick={() => setFilter("past")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              filter === "past"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Anterioare
          </button>
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
        </div>
      </div>

      {/* Obligations List */}
      <div className="divide-y max-h-96 overflow-y-auto">
        {sortedObligations.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <p>Toate obligațiile sunt la zi!</p>
          </div>
        ) : (
          sortedObligations.map((obligation) => {
            const taxConfig = TAX_DECLARATIONS[obligation.type];
            const statusConfig = OBLIGATION_STATUSES[obligation.declarationStatus];
            const daysUntil = getDaysUntilDue(obligation.dueDate);
            const isExpanded = expandedId === obligation.id;
            const StatusIcon = statusConfig.icon;

            return (
              <div key={obligation.id} className="hover:bg-slate-50 transition">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : obligation.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calculator className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-slate-900">{taxConfig.name}</h3>
                          <p className="text-sm text-slate-500">{obligation.period}</p>
                        </div>
                        <div className="text-right">
                          {obligation.amount && (
                            <p className="font-semibold text-slate-900">
                              {formatAmount(obligation.amount)}
                            </p>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          Termen: {formatDate(obligation.dueDate)}
                        </span>
                        {daysUntil < 0 && !["SUBMITTED", "ACCEPTED"].includes(obligation.declarationStatus) && (
                          <span className="text-sm text-red-600 font-medium">
                            {Math.abs(daysUntil)} zile întârziere!
                          </span>
                        )}
                        {daysUntil >= 0 && daysUntil <= 5 && !["SUBMITTED", "ACCEPTED"].includes(obligation.declarationStatus) && (
                          <span className="text-sm text-orange-600 font-medium">
                            {daysUntil === 0 ? "Astăzi!" : `Mai ai ${daysUntil} zile`}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 ml-14">
                    <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Denumire completă:</span> {taxConfig.fullName}
                      </p>
                      {obligation.indexNumber && (
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">Nr. înregistrare ANAF:</span> {obligation.indexNumber}
                        </p>
                      )}
                      {obligation.submittedAt && (
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">Data transmiterii:</span>{" "}
                          {new Date(obligation.submittedAt).toLocaleString("ro-RO")}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        <a
                          href={taxConfig.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Deschide în ANAF
                        </a>
                        {obligation.declarationStatus === "READY_TO_SUBMIT" && (
                          <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                            <Upload className="w-3.5 h-3.5" />
                            Transmite
                          </button>
                        )}
                        {["SUBMITTED", "ACCEPTED"].includes(obligation.declarationStatus) && (
                          <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition">
                            <Download className="w-3.5 h-3.5" />
                            Descarcă PDF
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-slate-50 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Info className="w-4 h-4" />
            <span>Termenele sunt conform legislației în vigoare</span>
          </div>
          <button className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition">
            Vezi calendarul fiscal
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
