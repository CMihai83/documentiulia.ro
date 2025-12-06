"use client";

import { useState } from "react";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  FileText,
  Download,
  Calendar,
  Building2,
  ChevronDown,
} from "lucide-react";
import { ProfitLossChart } from "@/components/reports/profit-loss-chart";
import { BalanceSheetView } from "@/components/reports/balance-sheet-view";
import { CashFlowChart } from "@/components/reports/cash-flow-chart";
import { AppLayout, MobileNav } from "@/components/layout";

type ReportType = "profit-loss" | "balance-sheet" | "cash-flow";

const reportTabs = [
  {
    id: "profit-loss" as ReportType,
    label: "Profit & Pierdere",
    icon: TrendingUp,
    description: "Venituri, cheltuieli și profitabilitate",
  },
  {
    id: "balance-sheet" as ReportType,
    label: "Bilanț Contabil",
    icon: BarChart3,
    description: "Active, pasive și capitaluri proprii",
  },
  {
    id: "cash-flow" as ReportType,
    label: "Flux de Numerar",
    icon: PieChart,
    description: "Intrări și ieșiri de numerar",
  },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("profit-loss");
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedCompany, setSelectedCompany] = useState("SC DocumentIulia SRL");

  const years = [2024, 2023, 2022, 2021];
  const companies = [
    "SC DocumentIulia SRL",
    "SC Client Demo SRL",
    "SC Test Company SRL",
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 -mx-4 lg:-mx-6 -mt-4 lg:-mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Rapoarte Financiare</h1>
              <p className="text-slate-500 mt-1">
                Analizează performanța financiară și generează rapoarte
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Company Selector */}
              <div className="relative">
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="appearance-none pl-10 pr-8 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {companies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              {/* Year Selector */}
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="appearance-none pl-10 pr-8 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              {/* Export Button */}
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportă</span>
              </button>
            </div>
          </div>

          {/* Report Tabs */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {reportTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeReport === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveReport(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition whitespace-nowrap ${
                    isActive
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      isActive ? "bg-blue-100" : "bg-slate-100"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${isActive ? "text-blue-900" : "text-slate-900"}`}>
                      {tab.label}
                    </p>
                    <p className={`text-xs ${isActive ? "text-blue-600" : "text-slate-500"}`}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeReport === "profit-loss" && (
          <ProfitLossChart />
        )}

        {activeReport === "balance-sheet" && (
          <BalanceSheetView companyName={selectedCompany} cui="12345678" />
        )}

        {activeReport === "cash-flow" && (
          <CashFlowChart year={selectedYear} />
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:hidden">
        <div className="flex items-center justify-around">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                  isActive ? "text-blue-600" : "text-slate-500"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{tab.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
