"use client";

import Link from "next/link";
import { useState } from "react";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  Euro,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Building2,
  FileCheck,
  Sparkles,
  ArrowRight,
  Award,
  Rocket,
  BarChart3,
  Globe,
  Zap,
} from "lucide-react";

// Mock data for funding programs
const mockPrograms = [
  {
    id: "1",
    name: "PNRR - Digitalizare IMM",
    source: "PNRR",
    totalBudget: 500000000,
    availableBudget: 320000000,
    deadline: "2025-06-30",
    minFunding: 25000,
    maxFunding: 100000,
    cofinancing: 10,
    status: "OPEN",
    successRate: 68,
    sectors: ["Retail", "Servicii", "IT"],
    description: "Finantare pentru digitalizarea proceselor de business pentru IMM-uri",
  },
  {
    id: "2",
    name: "Coeziune - Eficienta Energetica",
    source: "COHESION",
    totalBudget: 800000000,
    availableBudget: 450000000,
    deadline: "2025-09-15",
    minFunding: 50000,
    maxFunding: 500000,
    cofinancing: 15,
    status: "OPEN",
    successRate: 54,
    sectors: ["Constructii", "Industrie", "Agricultura"],
    description: "Investitii in echipamente si tehnologii pentru eficienta energetica",
  },
  {
    id: "3",
    name: "InvestEU - Inovare Start-up",
    source: "INVESTEU",
    totalBudget: 200000000,
    availableBudget: 180000000,
    deadline: "2025-12-31",
    minFunding: 5000,
    maxFunding: 50000,
    cofinancing: 0,
    status: "OPEN",
    successRate: 72,
    sectors: ["IT", "Tehnologie", "Servicii"],
    description: "Voucher simplificat pentru start-up-uri inovatoare",
  },
  {
    id: "4",
    name: "Horizon Europe - Cercetare",
    source: "HORIZON",
    totalBudget: 1000000000,
    availableBudget: 600000000,
    deadline: "2025-03-31",
    minFunding: 100000,
    maxFunding: 2000000,
    cofinancing: 25,
    status: "UPCOMING",
    successRate: 45,
    sectors: ["Cercetare", "IT", "Sanatate"],
    description: "Finantare pentru proiecte de cercetare si dezvoltare",
  },
];

const mockApplications = [
  {
    id: "1",
    programName: "PNRR - Digitalizare IMM",
    requestedAmount: 75000,
    status: "UNDER_REVIEW",
    submittedAt: "2025-11-15",
    eligibilityScore: 89,
    currentMilestone: "Evaluare tehnica",
  },
  {
    id: "2",
    programName: "InvestEU - Inovare Start-up",
    requestedAmount: 25000,
    status: "APPROVED",
    submittedAt: "2025-10-20",
    eligibilityScore: 94,
    currentMilestone: "Contract semnat",
  },
];

const stats = {
  totalAvailableFunding: 1550000000,
  openPrograms: 3,
  applicationsSubmitted: 2,
  totalFundingApproved: 25000,
  averageSuccessRate: 62,
};

const sourceColors: Record<string, string> = {
  PNRR: "bg-blue-100 text-blue-700 border-blue-200",
  COHESION: "bg-emerald-100 text-emerald-700 border-emerald-200",
  INVESTEU: "bg-purple-100 text-purple-700 border-purple-200",
  HORIZON: "bg-amber-100 text-amber-700 border-amber-200",
  DIGITAL: "bg-rose-100 text-rose-700 border-rose-200",
};

const sourceLabels: Record<string, string> = {
  PNRR: "PNRR",
  COHESION: "Coeziune",
  INVESTEU: "InvestEU",
  HORIZON: "Horizon",
  DIGITAL: "Digital",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CONTRACTED: "bg-purple-100 text-purple-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Depus",
  UNDER_REVIEW: "In evaluare",
  APPROVED: "Aprobat",
  REJECTED: "Respins",
  CONTRACTED: "Contractat",
};

type TabType = "overview" | "programs" | "eligibility" | "applications";

function formatCurrency(amount: number): string {
  if (amount >= 1000000000) {
    return `€${(amount / 1000000000).toFixed(1)}B`;
  }
  if (amount >= 1000000) {
    return `€${(amount / 1000000).toFixed(0)}M`;
  }
  if (amount >= 1000) {
    return `€${(amount / 1000).toFixed(0)}K`;
  }
  return `€${amount}`;
}

function daysUntil(dateString: string): number {
  const deadline = new Date(dateString);
  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function FundsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const tabs = [
    { id: "overview" as TabType, label: "Prezentare", icon: BarChart3 },
    { id: "programs" as TabType, label: "Programe", icon: Euro },
    { id: "eligibility" as TabType, label: "Eligibilitate", icon: Target },
    { id: "applications" as TabType, label: "Aplicatii", icon: FileCheck },
  ];

  const filteredPrograms = mockPrograms.filter((program) => {
    const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = !selectedSource || program.source === selectedSource;
    return matchesSearch && matchesSource;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Euro className="w-7 h-7 text-emerald-600" />
              Fonduri Europene
            </h1>
            <p className="text-slate-600 mt-1">
              PNRR, Coeziune, InvestEU - Scanner eligibilitate si tracking aplicatii
            </p>
          </div>
          <button className="mt-4 sm:mt-0 inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
            <Sparkles className="w-4 h-4" />
            Verifica eligibilitate
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <Euro className="w-8 h-8 text-emerald-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalAvailableFunding)}</p>
                <p className="text-sm text-slate-500">Fonduri disponibile</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <Rocket className="w-8 h-8 text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{stats.openPrograms}</p>
                <p className="text-sm text-slate-500">Programe deschise</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <FileCheck className="w-8 h-8 text-purple-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{stats.applicationsSubmitted}</p>
                <p className="text-sm text-slate-500">Aplicatii depuse</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <Award className="w-8 h-8 text-amber-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalFundingApproved)}</p>
                <p className="text-sm text-slate-500">Fonduri aprobate</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <TrendingUp className="w-8 h-8 text-rose-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{stats.averageSuccessRate}%</p>
                <p className="text-sm text-slate-500">Rata succes medie</p>
              </div>
            </div>

            {/* Funding Sources */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-6 h-6" />
                  <span className="font-bold">PNRR</span>
                </div>
                <p className="text-3xl font-bold mb-1">€13.57B</p>
                <p className="text-blue-100 text-sm">Plan National de Redresare</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-6 h-6" />
                  <span className="font-bold">Coeziune</span>
                </div>
                <p className="text-3xl font-bold mb-1">€31B</p>
                <p className="text-emerald-100 text-sm">Fonduri Structurale 2021-2027</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-6 h-6" />
                  <span className="font-bold">InvestEU</span>
                </div>
                <p className="text-3xl font-bold mb-1">€372B</p>
                <p className="text-purple-100 text-sm">Garantii pentru investitii</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-6 h-6" />
                  <span className="font-bold">Horizon</span>
                </div>
                <p className="text-3xl font-bold mb-1">€95.5B</p>
                <p className="text-amber-100 text-sm">Cercetare si Inovare</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  Verificare Eligibilitate AI
                </h3>
                <p className="text-slate-600 mb-4">
                  Sistemul nostru AI analizeaza profilul companiei si identifica programele
                  de finantare potrivite cu rata de succes estimata.
                </p>
                <button
                  onClick={() => setActiveTab("eligibility")}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition font-medium"
                >
                  Verifica acum
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  Deadline-uri Apropiate
                </h3>
                <div className="space-y-3">
                  {mockPrograms
                    .filter((p) => p.status === "OPEN")
                    .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))
                    .slice(0, 3)
                    .map((program) => (
                      <div key={program.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-slate-700">{program.name}</span>
                        <span className={`text-sm font-medium ${
                          daysUntil(program.deadline) < 30 ? "text-red-600" :
                          daysUntil(program.deadline) < 90 ? "text-amber-600" :
                          "text-slate-600"
                        }`}>
                          {daysUntil(program.deadline)} zile
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Recent Applications */}
            {mockApplications.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  Aplicatiile Tale
                </h3>
                <div className="space-y-4">
                  {mockApplications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{app.programName}</p>
                        <p className="text-sm text-slate-500">{app.currentMilestone}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(app.requestedAmount)}</p>
                          <p className="text-xs text-slate-500">Solicitat</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[app.status]}`}>
                          {statusLabels[app.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Programs Tab */}
        {activeTab === "programs" && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cauta programe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-2">
                {Object.entries(sourceLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedSource(selectedSource === key ? null : key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedSource === key
                        ? sourceColors[key]
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Programs List */}
            <div className="space-y-4">
              {filteredPrograms.map((program) => (
                <div key={program.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${sourceColors[program.source]}`}>
                          {sourceLabels[program.source]}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          program.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {program.status === "OPEN" ? "Deschis" : "In curand"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg text-slate-900">{program.name}</h3>
                      <p className="text-slate-600 mt-1">{program.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {program.sectors.map((sector) => (
                          <span key={sector} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">
                            {sector}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-4 lg:items-end">
                      <div className="text-center lg:text-right">
                        <p className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(program.minFunding)} - {formatCurrency(program.maxFunding)}
                        </p>
                        <p className="text-sm text-slate-500">Finantare disponibila</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {daysUntil(program.deadline)} zile
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {program.successRate}% succes
                        </span>
                        <span className="flex items-center gap-1">
                          <Euro className="w-4 h-4" />
                          {program.cofinancing}% cofinantare
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <button className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
                      Verifica eligibilitate
                    </button>
                    <button className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 transition text-sm">
                      Detalii program
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eligibility Tab */}
        {activeTab === "eligibility" && (
          <div className="space-y-6">
            {/* Eligibility Checker */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-lg text-slate-900 mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Scanner Eligibilitate AI
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nume companie</label>
                    <input
                      type="text"
                      placeholder="SC Exemplu SRL"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CUI</label>
                    <input
                      type="text"
                      placeholder="RO12345678"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sector activitate</label>
                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option>Selecteaza...</option>
                      <option>Retail</option>
                      <option>Servicii</option>
                      <option>IT</option>
                      <option>Constructii</option>
                      <option>Industrie</option>
                      <option>Agricultura</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Numar angajati</label>
                    <input
                      type="number"
                      placeholder="15"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cifra de afaceri (EUR)</label>
                    <input
                      type="number"
                      placeholder="500000"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Anul infiintarii</label>
                    <input
                      type="number"
                      placeholder="2018"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Locatie</label>
                    <input
                      type="text"
                      placeholder="Bucuresti"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded text-emerald-600" />
                      <span className="text-sm text-slate-600">Profit ultimii 2 ani</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded text-emerald-600" />
                      <span className="text-sm text-slate-600">Fara datorii ANAF</span>
                    </label>
                  </div>
                </div>
              </div>
              <button className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition font-medium flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                Analizeaza eligibilitate
              </button>
            </div>

            {/* Sample Results */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
              <h4 className="font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Programe recomandate pentru profilul tau
              </h4>
              <div className="space-y-4">
                {mockPrograms.slice(0, 2).map((program) => (
                  <div key={program.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{program.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatCurrency(program.minFunding)} - {formatCurrency(program.maxFunding)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">89%</p>
                        <p className="text-xs text-slate-500">Scor eligibilitate</p>
                      </div>
                      <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
                        Aplica
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === "applications" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">Aplicatiile tale</h3>
              <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
                <FileCheck className="w-4 h-4" />
                Aplicatie noua
              </button>
            </div>

            {mockApplications.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">Nu ai aplicatii inca</h3>
                <p className="text-slate-600 mb-4">
                  Verifica eligibilitatea si aplica la programele potrivite pentru afacerea ta.
                </p>
                <button
                  onClick={() => setActiveTab("eligibility")}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition"
                >
                  Verifica eligibilitate
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {mockApplications.map((app) => (
                  <div key={app.id} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-lg text-slate-900">{app.programName}</h4>
                        <p className="text-slate-600 mt-1">Suma solicitata: {formatCurrency(app.requestedAmount)}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Depus: {new Date(app.submittedAt).toLocaleDateString("ro-RO")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            Scor: {app.eligibilityScore}%
                          </span>
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-lg text-sm font-medium ${statusColors[app.status]}`}>
                        {statusLabels[app.status]}
                      </span>
                    </div>
                    {/* Progress Tracker */}
                    <div className="mt-6">
                      <p className="text-sm text-slate-600 mb-3">Etapa curenta: <span className="font-medium">{app.currentMilestone}</span></p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full">
                          <div className={`h-2 rounded-full ${
                            app.status === "APPROVED" || app.status === "CONTRACTED" ? "w-full bg-emerald-500" :
                            app.status === "UNDER_REVIEW" ? "w-2/3 bg-amber-500" :
                            app.status === "SUBMITTED" ? "w-1/3 bg-blue-500" :
                            "w-0"
                          }`} />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <button className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 transition text-sm">
                        Vezi detalii
                      </button>
                      <button className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 transition text-sm">
                        Documente
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <MobileNav />
    </AppLayout>
  );
}
