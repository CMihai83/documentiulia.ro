"use client";

import Link from "next/link";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  FileText,
  Users,
  Receipt,
  TrendingUp,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Calculator,
  Clock,
  Loader2,
  Zap,
  Flame,
  Award,
  Trophy,
} from "lucide-react";
import { useCompanies, useCompanyClients, useInvoices, useActivity } from "@/hooks/useApi";

// Fallback mock data for dashboard
const fallbackStats = [
  {
    name: "Venituri Luna Aceasta",
    value: "45.230 RON",
    change: "+12.5%",
    changeType: "positive",
    icon: TrendingUp,
  },
  {
    name: "Cheltuieli Luna Aceasta",
    value: "18.450 RON",
    change: "+4.2%",
    changeType: "negative",
    icon: Receipt,
  },
  {
    name: "Facturi Neachitate",
    value: "12",
    change: "32.500 RON",
    changeType: "neutral",
    icon: FileText,
  },
  {
    name: "Clienți Activi",
    value: "48",
    change: "+3 luna aceasta",
    changeType: "positive",
    icon: Users,
  },
];

const recentInvoices = [
  { id: "INV-001", client: "SC Alpha SRL", amount: "5.200 RON", status: "paid", date: "2025-12-01" },
  { id: "INV-002", client: "Beta Construct SA", amount: "12.800 RON", status: "pending", date: "2025-11-28" },
  { id: "INV-003", client: "Gamma Services SRL", amount: "3.450 RON", status: "overdue", date: "2025-11-15" },
  { id: "INV-004", client: "Delta Import Export", amount: "8.900 RON", status: "paid", date: "2025-11-25" },
];

const quickActions = [
  { name: "Factură Nouă", href: "/invoices/new", icon: FileText, color: "bg-blue-500" },
  { name: "Client Nou", href: "/clients/new", icon: Users, color: "bg-emerald-500" },
  { name: "Cheltuială Nouă", href: "/expenses/new", icon: Receipt, color: "bg-orange-500" },
  { name: "Raport TVA", href: "/reports/vat", icon: Calculator, color: "bg-purple-500" },
];

interface Company {
  id: string;
  name: string;
  _count?: { clients: number; invoices: number };
}

export default function DashboardPage() {
  const { data: companiesData, isLoading: companiesLoading } = useCompanies();
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices();
  const { data: activityData, isLoading: activityLoading } = useActivity(5);

  // Get first company for demo
  const companies = (companiesData || []) as Company[];
  const currentCompany = companies[0];
  const companyName = currentCompany?.name || "SC Demo Company SRL";

  // Calculate stats from real data
  const clientCount = currentCompany?._count?.clients || 0;
  const invoiceCount = currentCompany?._count?.invoices || 0;

  const stats = [
    {
      name: "Venituri Luna Aceasta",
      value: "45.230 RON",
      change: "+12.5%",
      changeType: "positive" as const,
      icon: TrendingUp,
    },
    {
      name: "Cheltuieli Luna Aceasta",
      value: "18.450 RON",
      change: "+4.2%",
      changeType: "negative" as const,
      icon: Receipt,
    },
    {
      name: "Facturi Active",
      value: String(invoiceCount),
      change: "Total",
      changeType: "neutral" as const,
      icon: FileText,
    },
    {
      name: "Clienți Activi",
      value: String(clientCount),
      change: "În sistem",
      changeType: "positive" as const,
      icon: Users,
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Bun venit! Iată o privire de ansamblu asupra afacerii tale.</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-2 text-sm text-slate-500">
            {companiesLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Building2 className="w-4 h-4" />
                <span>{companyName}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition"
            >
              <div className={`${action.color} p-2 rounded-lg`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium text-slate-700">{action.name}</span>
            </Link>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <stat.icon className="w-5 h-5 text-slate-600" />
                </div>
                <span
                  className={`flex items-center text-sm font-medium ${
                    stat.changeType === "positive"
                      ? "text-emerald-600"
                      : stat.changeType === "negative"
                      ? "text-red-600"
                      : "text-slate-600"
                  }`}
                >
                  {stat.changeType === "positive" && <ArrowUpRight className="w-4 h-4 mr-1" />}
                  {stat.changeType === "negative" && <ArrowDownRight className="w-4 h-4 mr-1" />}
                  {stat.change}
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.name}</p>
            </div>
          ))}
        </div>

        {/* Recent Invoices & Activity */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Invoices */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Facturi Recente</h2>
                <Link href="/invoices" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Vezi toate →
                </Link>
              </div>
            </div>
            <div className="divide-y">
              {recentInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900">{invoice.client}</p>
                    <p className="text-sm text-slate-500">{invoice.id} · {invoice.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">{invoice.amount}</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        invoice.status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : invoice.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {invoice.status === "paid" ? "Plătită" : invoice.status === "pending" ? "În așteptare" : "Restantă"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t">
              <Link
                href="/invoices/new"
                className="flex items-center justify-center gap-2 w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Adaugă Factură Nouă
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Activitate Recentă</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {[
                  { action: "Factură trimisă", target: "SC Alpha SRL", time: "Acum 2 ore", icon: FileText },
                  { action: "Plată înregistrată", target: "INV-001 - 5.200 RON", time: "Acum 4 ore", icon: Receipt },
                  { action: "Client nou adăugat", target: "Omega Tech SRL", time: "Ieri", icon: Users },
                  { action: "Raport SAF-T generat", target: "Noiembrie 2025", time: "Acum 2 zile", icon: Calculator },
                  { action: "e-Factură trimisă ANAF", target: "INV-098", time: "Acum 3 zile", icon: TrendingUp },
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <activity.icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                      <p className="text-sm text-slate-500 truncate">{activity.target}</p>
                    </div>
                    <div className="flex items-center text-xs text-slate-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gamification Widget */}
        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          {/* XP Progress Card */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold">6</span>
                </div>
                <div>
                  <p className="font-semibold">Nivel Expert</p>
                  <p className="text-purple-200 text-sm">3.250 XP total</p>
                </div>
              </div>
              <Link href="/profile" className="text-purple-200 hover:text-white text-sm">
                Vezi profil →
              </Link>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-purple-200">Progres nivel</span>
                <span className="font-medium">750 / 1.500 XP</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: "50%" }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-3 bg-white/10 rounded-lg">
                <Flame className="w-5 h-5 mx-auto mb-1 text-orange-300" />
                <p className="text-lg font-bold">12</p>
                <p className="text-xs text-purple-200">Zile serie</p>
              </div>
              <div className="text-center p-3 bg-white/10 rounded-lg">
                <Award className="w-5 h-5 mx-auto mb-1 text-yellow-300" />
                <p className="text-lg font-bold">9</p>
                <p className="text-xs text-purple-200">Insigne</p>
              </div>
              <div className="text-center p-3 bg-white/10 rounded-lg">
                <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-300" />
                <p className="text-lg font-bold">#42</p>
                <p className="text-xs text-purple-200">Clasament</p>
              </div>
            </div>
          </div>

          {/* e-Factura Status Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex flex-col h-full justify-between">
              <div>
                <h3 className="text-lg font-semibold">Integrare e-Factura ANAF</h3>
                <p className="text-blue-100 mt-1">
                  Configurează conexiunea cu SPV pentru a trimite facturi electronic direct către ANAF.
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <Link
                  href="/settings/efactura"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
                >
                  Configurează
                </Link>
                <Link
                  href="/efactura"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition"
                >
                  Vezi Status
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
