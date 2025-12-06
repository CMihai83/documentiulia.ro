"use client";

import Link from "next/link";
import { useState } from "react";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  Users,
  UserPlus,
  Briefcase,
  Target,
  Heart,
  Search,
  Plus,
  TrendingUp,
  Clock,
  Star,
  Filter,
  ChevronRight,
  Award,
  Activity,
  BarChart3,
  Brain,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

// Mock data for demo - in production would use useApi hooks
const mockJobs = [
  {
    id: "1",
    title: "Senior Accountant - SAF-T Specialist",
    department: "Contabilitate",
    location: "Bucuresti / Remote",
    type: "FULL_TIME",
    applicants: 23,
    status: "ACTIVE",
    postedAt: "2025-11-25",
  },
  {
    id: "2",
    title: "Junior Financial Analyst",
    department: "Financiar",
    location: "Cluj-Napoca",
    type: "FULL_TIME",
    applicants: 45,
    status: "ACTIVE",
    postedAt: "2025-11-20",
  },
  {
    id: "3",
    title: "E-Factura Implementation Consultant",
    department: "IT",
    location: "Remote",
    type: "CONTRACT",
    applicants: 12,
    status: "ACTIVE",
    postedAt: "2025-11-28",
  },
];

const mockCandidates = [
  {
    id: "1",
    name: "Maria Popescu",
    position: "Senior Accountant",
    email: "maria.popescu@email.com",
    matchScore: 94,
    status: "INTERVIEW",
    skills: ["SAF-T", "e-Factura", "Excel", "ERP"],
    appliedAt: "2025-11-28",
  },
  {
    id: "2",
    name: "Andrei Ionescu",
    position: "Senior Accountant",
    email: "andrei.ionescu@email.com",
    matchScore: 87,
    status: "SCREENING",
    skills: ["SAF-T", "Contabilitate", "Audit"],
    appliedAt: "2025-11-27",
  },
  {
    id: "3",
    name: "Elena Stancu",
    position: "Junior Financial Analyst",
    email: "elena.stancu@email.com",
    matchScore: 82,
    status: "NEW",
    skills: ["Excel", "Power BI", "Analiza Financiara"],
    appliedAt: "2025-11-29",
  },
];

const mockEmployees = [
  {
    id: "1",
    name: "Ana Georgescu",
    department: "Contabilitate",
    position: "Chief Accountant",
    performanceScore: 92,
    wellnessScore: 85,
  },
  {
    id: "2",
    name: "Mihai Dumitrescu",
    department: "Financiar",
    position: "Financial Manager",
    performanceScore: 88,
    wellnessScore: 78,
  },
  {
    id: "3",
    name: "Cristina Popa",
    department: "IT",
    position: "Tech Lead",
    performanceScore: 95,
    wellnessScore: 82,
  },
];

const stats = {
  totalEmployees: 45,
  openPositions: 8,
  totalCandidates: 156,
  averageMatchScore: 85,
  averageWellnessScore: 81,
  averagePerformanceScore: 87,
};

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  SCREENING: "bg-yellow-100 text-yellow-700",
  INTERVIEW: "bg-purple-100 text-purple-700",
  OFFER: "bg-emerald-100 text-emerald-700",
  HIRED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  NEW: "Nou",
  SCREENING: "Evaluare",
  INTERVIEW: "Interviu",
  OFFER: "Oferta",
  HIRED: "Angajat",
  REJECTED: "Respins",
};

type TabType = "overview" | "jobs" | "candidates" | "employees" | "wellness";

export default function HRPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = [
    { id: "overview" as TabType, label: "Prezentare", icon: BarChart3 },
    { id: "jobs" as TabType, label: "Posturi", icon: Briefcase },
    { id: "candidates" as TabType, label: "Candidati", icon: UserPlus },
    { id: "employees" as TabType, label: "Angajati", icon: Users },
    { id: "wellness" as TabType, label: "Wellness", icon: Heart },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Brain className="w-7 h-7 text-blue-600" />
              HR Intelligence
            </h1>
            <p className="text-slate-600 mt-1">
              Recrutare AI, performanta 360° si wellness - totul intr-un singur loc
            </p>
          </div>
          <button className="mt-4 sm:mt-0 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" />
            Post Nou
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
                  ? "bg-blue-600 text-white"
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{stats.totalEmployees}</p>
                <p className="text-sm text-slate-500">Angajati</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <Briefcase className="w-8 h-8 text-emerald-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{stats.openPositions}</p>
                <p className="text-sm text-slate-500">Posturi deschise</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <UserPlus className="w-8 h-8 text-purple-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{stats.totalCandidates}</p>
                <p className="text-sm text-slate-500">Candidati</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <Brain className="w-8 h-8 text-amber-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{stats.averageMatchScore}%</p>
                <p className="text-sm text-slate-500">Scor mediu AI</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <Target className="w-8 h-8 text-rose-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{stats.averagePerformanceScore}%</p>
                <p className="text-sm text-slate-500">Performanta</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <Heart className="w-8 h-8 text-pink-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{stats.averageWellnessScore}%</p>
                <p className="text-sm text-slate-500">Wellness</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <Brain className="w-10 h-10 mb-4 opacity-80" />
                <h3 className="font-semibold text-lg mb-2">ATS Inteligent</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Matching AI cu 99% acuratete, fara bias, bazat pe competente
                </p>
                <button
                  onClick={() => setActiveTab("candidates")}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition text-sm"
                >
                  Potriveste candidati
                </button>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                <Target className="w-10 h-10 mb-4 opacity-80" />
                <h3 className="font-semibold text-lg mb-2">Evaluare 360°</h3>
                <p className="text-purple-100 text-sm mb-4">
                  Review-uri complete cu feedback de la colegi si manageri
                </p>
                <button
                  onClick={() => setActiveTab("employees")}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition text-sm"
                >
                  Incepe evaluarea
                </button>
              </div>
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-6 text-white">
                <Heart className="w-10 h-10 mb-4 opacity-80" />
                <h3 className="font-semibold text-lg mb-2">Pulse Survey</h3>
                <p className="text-pink-100 text-sm mb-4">
                  Masoara satisfactia si bunastarea echipei in timp real
                </p>
                <button
                  onClick={() => setActiveTab("wellness")}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition text-sm"
                >
                  Vezi analytics
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  Candidati Recenti
                </h3>
                <div className="space-y-3">
                  {mockCandidates.slice(0, 3).map((candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-slate-900">{candidate.name}</p>
                        <p className="text-sm text-slate-500">{candidate.position}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500" />
                          <span className="font-semibold text-slate-900">{candidate.matchScore}%</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${statusColors[candidate.status]}`}>
                          {statusLabels[candidate.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab("candidates")}
                  className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Vezi toti candidatii →
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-600" />
                  Posturi Active
                </h3>
                <div className="space-y-3">
                  {mockJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-slate-900">{job.title}</p>
                        <p className="text-sm text-slate-500">{job.department} · {job.location}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">{job.applicants} aplicanti</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab("jobs")}
                  className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Vezi toate posturile →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cauta posturi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
                <Filter className="w-4 h-4" />
                Filtreaza
              </button>
            </div>

            {/* Jobs List */}
            <div className="space-y-4">
              {mockJobs.map((job) => (
                <div key={job.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900">{job.title}</h3>
                      <p className="text-slate-600 mt-1">{job.department} · {job.location}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {job.type === "FULL_TIME" ? "Full-time" : job.type === "CONTRACT" ? "Contract" : job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {job.applicants} aplicanti
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full">
                        Activ
                      </span>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Vezi candidati →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Candidates Tab */}
        {activeTab === "candidates" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cauta candidati..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                <Brain className="w-4 h-4" />
                AI Match
              </button>
            </div>

            {/* AI Matching Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">ATS cu Inteligenta Artificiala</p>
                <p className="text-sm text-blue-700">
                  Sistemul nostru AI analizeaza CV-uri si calculeaza un scor de potrivire bazat pe competente,
                  experienta si cerinte. Bias-free matching pentru decizii obiective.
                </p>
              </div>
            </div>

            {/* Candidates List */}
            <div className="space-y-4">
              {mockCandidates.map((candidate) => (
                <div key={candidate.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                        <span className="text-lg font-semibold text-slate-600">
                          {candidate.name.split(" ").map(n => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900">{candidate.name}</h3>
                        <p className="text-slate-600">{candidate.position}</p>
                        <p className="text-sm text-slate-500 mt-1">{candidate.email}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {candidate.skills.map((skill) => (
                            <span key={skill} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Scor AI</p>
                          <p className={`text-2xl font-bold ${
                            candidate.matchScore >= 90 ? "text-emerald-600" :
                            candidate.matchScore >= 80 ? "text-blue-600" :
                            "text-amber-600"
                          }`}>
                            {candidate.matchScore}%
                          </p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          candidate.matchScore >= 90 ? "bg-emerald-500" :
                          candidate.matchScore >= 80 ? "bg-blue-500" :
                          "bg-amber-500"
                        }`} />
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full ${statusColors[candidate.status]}`}>
                        {statusLabels[candidate.status]}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-sm">
                      Vezi profil
                    </button>
                    <button className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 transition text-sm">
                      Schimba status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === "employees" && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cauta angajati..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700">
                <Target className="w-4 h-4" />
                Evaluare 360°
              </button>
            </div>

            <div className="space-y-4">
              {mockEmployees.map((employee) => (
                <div key={employee.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-semibold text-blue-600">
                          {employee.name.split(" ").map(n => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900">{employee.name}</h3>
                        <p className="text-slate-600">{employee.position}</p>
                        <p className="text-sm text-slate-500">{employee.department}</p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <Target className="w-4 h-4 text-purple-600" />
                          <span className="font-bold text-purple-600">{employee.performanceScore}%</span>
                        </div>
                        <p className="text-xs text-slate-500">Performanta</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <Heart className="w-4 h-4 text-pink-600" />
                          <span className="font-bold text-pink-600">{employee.wellnessScore}%</span>
                        </div>
                        <p className="text-xs text-slate-500">Wellness</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <button className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition text-sm">
                      Creeaza evaluare
                    </button>
                    <button className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 transition text-sm">
                      Vezi istoric
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wellness Tab */}
        {activeTab === "wellness" && (
          <div className="space-y-6">
            {/* Wellness Overview */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">32</p>
                    <p className="text-sm text-slate-500">Sanatosi</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full">
                  <div className="w-3/4 h-2 bg-emerald-500 rounded-full" />
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">8</p>
                    <p className="text-sm text-slate-500">De monitorizat</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full">
                  <div className="w-1/5 h-2 bg-amber-500 rounded-full" />
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">5</p>
                    <p className="text-sm text-slate-500">La risc</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full">
                  <div className="w-1/12 h-2 bg-rose-500 rounded-full" />
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">+5%</p>
                    <p className="text-sm text-slate-500">Trend lunar</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full">
                  <div className="w-full h-2 bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>

            {/* Wellness Categories */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-6">Indicatori Wellness</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600">Work-Life Balance</span>
                    <span className="font-semibold text-slate-900">78%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full">
                    <div className="w-[78%] h-3 bg-blue-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600">Satisfactie la job</span>
                    <span className="font-semibold text-slate-900">85%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full">
                    <div className="w-[85%] h-3 bg-emerald-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600">Nivel de stres (inversat)</span>
                    <span className="font-semibold text-slate-900">72%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full">
                    <div className="w-[72%] h-3 bg-amber-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600">Colaborare echipa</span>
                    <span className="font-semibold text-slate-900">91%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full">
                    <div className="w-[91%] h-3 bg-purple-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Send Survey Button */}
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Trimite Pulse Survey</h3>
                  <p className="text-pink-100 mt-1">
                    Colecteaza feedback anonim de la echipa pentru a imbunatati satisfactia
                  </p>
                </div>
                <button className="bg-white text-rose-600 px-6 py-3 rounded-lg font-semibold hover:bg-pink-50 transition">
                  Trimite Survey
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
