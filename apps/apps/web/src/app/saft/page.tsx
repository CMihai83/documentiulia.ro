"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  FileSpreadsheet,
  Download,
  Upload,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  FileText,
  Building2,
  Database,
  Filter,
  Search,
  Settings,
  Play,
  History,
} from "lucide-react";

type SaftStatus = "PENDING" | "GENERATING" | "VALIDATED" | "SUBMITTED" | "ERROR";

interface SaftReport {
  id: string;
  period: string;
  periodType: "MONTHLY" | "QUARTERLY";
  year: number;
  month?: number;
  quarter?: number;
  status: SaftStatus;
  generatedAt?: string;
  submittedAt?: string;
  fileSize?: string;
  recordCount?: number;
  errors?: string[];
}

const mockReports: SaftReport[] = [
  {
    id: "1",
    period: "Noiembrie 2024",
    periodType: "MONTHLY",
    year: 2024,
    month: 11,
    status: "VALIDATED",
    generatedAt: "2024-12-01T10:30:00",
    fileSize: "2.4 MB",
    recordCount: 1245,
  },
  {
    id: "2",
    period: "Octombrie 2024",
    periodType: "MONTHLY",
    year: 2024,
    month: 10,
    status: "SUBMITTED",
    generatedAt: "2024-11-02T09:15:00",
    submittedAt: "2024-11-03T14:20:00",
    fileSize: "2.1 MB",
    recordCount: 1102,
  },
  {
    id: "3",
    period: "Septembrie 2024",
    periodType: "MONTHLY",
    year: 2024,
    month: 9,
    status: "SUBMITTED",
    generatedAt: "2024-10-01T11:00:00",
    submittedAt: "2024-10-02T16:45:00",
    fileSize: "1.9 MB",
    recordCount: 987,
  },
  {
    id: "4",
    period: "Q3 2024",
    periodType: "QUARTERLY",
    year: 2024,
    quarter: 3,
    status: "SUBMITTED",
    generatedAt: "2024-10-05T08:30:00",
    submittedAt: "2024-10-06T10:00:00",
    fileSize: "5.8 MB",
    recordCount: 3089,
  },
  {
    id: "5",
    period: "Decembrie 2024",
    periodType: "MONTHLY",
    year: 2024,
    month: 12,
    status: "PENDING",
  },
];

const saftSections = [
  { code: "GL", name: "Registrul jurnal", icon: FileText },
  { code: "AR", name: "Jurnalul de vânzări", icon: FileSpreadsheet },
  { code: "AP", name: "Jurnalul de cumpărări", icon: FileSpreadsheet },
  { code: "SI", name: "Stocuri", icon: Database },
  { code: "PA", name: "Plăți", icon: Building2 },
];

export default function SaftPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaftStatus | "ALL">("ALL");
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const getStatusBadge = (status: SaftStatus) => {
    const styles = {
      PENDING: { bg: "bg-slate-100", text: "text-slate-700", icon: Clock, label: "În așteptare" },
      GENERATING: { bg: "bg-blue-100", text: "text-blue-700", icon: RefreshCw, label: "Se generează" },
      VALIDATED: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle2, label: "Validat" },
      SUBMITTED: { bg: "bg-purple-100", text: "text-purple-700", icon: Upload, label: "Transmis" },
      ERROR: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, label: "Eroare" },
    };
    const style = styles[status];
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className={`w-3.5 h-3.5 ${status === "GENERATING" ? "animate-spin" : ""}`} />
        {style.label}
      </span>
    );
  };

  const filteredReports = mockReports.filter((r) => {
    const matchesSearch = r.period.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: mockReports.length,
    submitted: mockReports.filter((r) => r.status === "SUBMITTED").length,
    validated: mockReports.filter((r) => r.status === "VALIDATED").length,
    pending: mockReports.filter((r) => r.status === "PENDING").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
              SAF-T D406
            </h1>
            <p className="text-slate-600 mt-1">
              Generare și transmitere fișiere SAF-T către ANAF
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2.5 rounded-xl font-medium border border-slate-200 hover:bg-slate-50 transition">
              <Settings className="w-5 h-5" />
              Configurare
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition"
            >
              <Play className="w-5 h-5" />
              Generează SAF-T
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Total rapoarte</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.submitted}</p>
                <p className="text-sm text-slate-500">Transmise</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.validated}</p>
                <p className="text-sm text-slate-500">Validate</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-sm text-slate-500">În așteptare</p>
              </div>
            </div>
          </div>
        </div>

        {/* SAF-T Sections */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            Secțiuni SAF-T
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {saftSections.map((section) => (
              <div
                key={section.code}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition cursor-pointer"
              >
                <section.icon className="w-6 h-6 text-emerald-600 mb-2" />
                <p className="font-mono text-sm font-bold text-slate-900">{section.code}</p>
                <p className="text-xs text-slate-600 mt-1">{section.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Caută după perioadă..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SaftStatus | "ALL")}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Toate statusurile</option>
              <option value="PENDING">În așteptare</option>
              <option value="GENERATING">Se generează</option>
              <option value="VALIDATED">Validat</option>
              <option value="SUBMITTED">Transmis</option>
              <option value="ERROR">Eroare</option>
            </select>
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
              <Filter className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              Istoric Rapoarte SAF-T
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Perioadă</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Tip</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Înregistrări</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Dimensiune</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">{report.period}</p>
                          <p className="text-xs text-slate-500">
                            {report.generatedAt
                              ? `Generat: ${new Date(report.generatedAt).toLocaleDateString("ro-RO")}`
                              : "Negerat"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        report.periodType === "MONTHLY"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {report.periodType === "MONTHLY" ? "Lunar" : "Trimestrial"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-900">
                        {report.recordCount?.toLocaleString() || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-900">
                        {report.fileSize || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {report.status === "VALIDATED" && (
                          <button
                            className="p-2 hover:bg-emerald-100 rounded-lg transition text-emerald-600"
                            title="Transmite la ANAF"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        )}
                        {(report.status === "VALIDATED" || report.status === "SUBMITTED") && (
                          <button
                            className="p-2 hover:bg-slate-100 rounded-lg transition"
                            title="Descarcă XML"
                          >
                            <Download className="w-4 h-4 text-slate-600" />
                          </button>
                        )}
                        {report.status === "PENDING" && (
                          <button
                            className="p-2 hover:bg-emerald-100 rounded-lg transition text-emerald-600"
                            title="Generează"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition" title="Detalii">
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredReports.length === 0 && (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nu au fost găsite rapoarte SAF-T</p>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-emerald-900">Despre SAF-T D406</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Standard Audit File for Tax (SAF-T) este un standard internațional pentru schimbul
                electronic de date fiscale. În România, formularul D406 este obligatoriu pentru
                marii contribuabili din 2022 și pentru toți contribuabilii din 2025.
              </p>
              <div className="flex gap-4 mt-3 text-xs">
                <div>
                  <span className="font-bold text-emerald-800">Lunar:</span>
                  <span className="text-emerald-600 ml-1">Mari contribuabili</span>
                </div>
                <div>
                  <span className="font-bold text-emerald-800">Trimestrial:</span>
                  <span className="text-emerald-600 ml-1">Ceilalți contribuabili</span>
                </div>
                <div>
                  <span className="font-bold text-emerald-800">Termen:</span>
                  <span className="text-emerald-600 ml-1">Ultima zi a lunii următoare</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
