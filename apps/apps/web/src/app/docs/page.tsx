"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  Book,
  Search,
  ChevronRight,
  FileText,
  Receipt,
  Users,
  BarChart3,
  Settings,
  Shield,
  Zap,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Video,
  Clock,
} from "lucide-react";

const categories = [
  {
    id: "getting-started",
    title: "Primii pași",
    icon: Zap,
    description: "Ghid de configurare inițială",
    articles: [
      { title: "Crearea contului", slug: "create-account", readTime: "3 min" },
      { title: "Configurare companie", slug: "setup-company", readTime: "5 min" },
      { title: "Adăugare utilizatori", slug: "add-users", readTime: "4 min" },
      { title: "Conectare bancară", slug: "bank-connection", readTime: "6 min" },
    ],
  },
  {
    id: "invoicing",
    title: "Facturare",
    icon: FileText,
    description: "Gestionarea facturilor și chitanțelor",
    articles: [
      { title: "Creare factură nouă", slug: "create-invoice", readTime: "4 min" },
      { title: "Facturi recurente", slug: "recurring-invoices", readTime: "5 min" },
      { title: "Șabloane facturi", slug: "invoice-templates", readTime: "4 min" },
      { title: "Export și imprimare", slug: "export-print", readTime: "3 min" },
    ],
  },
  {
    id: "efactura",
    title: "E-Factura ANAF",
    icon: Receipt,
    description: "Integrare cu SPV și facturare electronică",
    articles: [
      { title: "Configurare SPV", slug: "spv-setup", readTime: "8 min" },
      { title: "Încărcare certificat", slug: "certificate-upload", readTime: "5 min" },
      { title: "Trimitere e-facturi", slug: "send-efactura", readTime: "4 min" },
      { title: "Erori frecvente", slug: "common-errors", readTime: "6 min" },
      { title: "Descărcare facturi primite", slug: "download-received", readTime: "4 min" },
    ],
  },
  {
    id: "clients",
    title: "Clienți",
    icon: Users,
    description: "Gestionarea bazei de clienți",
    articles: [
      { title: "Adăugare client", slug: "add-client", readTime: "3 min" },
      { title: "Verificare CUI ANAF", slug: "cui-lookup", readTime: "2 min" },
      { title: "Import clienți", slug: "import-clients", readTime: "4 min" },
      { title: "Categorizare clienți", slug: "client-categories", readTime: "3 min" },
    ],
  },
  {
    id: "reports",
    title: "Rapoarte",
    icon: BarChart3,
    description: "Rapoarte financiare și fiscale",
    articles: [
      { title: "Raport TVA (D300)", slug: "vat-report", readTime: "5 min" },
      { title: "Raport SAF-T", slug: "saft-report", readTime: "7 min" },
      { title: "Profit și pierdere", slug: "profit-loss", readTime: "4 min" },
      { title: "Flux de numerar", slug: "cash-flow", readTime: "4 min" },
    ],
  },
  {
    id: "settings",
    title: "Setări",
    icon: Settings,
    description: "Configurarea platformei",
    articles: [
      { title: "Setări cont", slug: "account-settings", readTime: "3 min" },
      { title: "Notificări", slug: "notifications", readTime: "2 min" },
      { title: "Integrări", slug: "integrations", readTime: "5 min" },
      { title: "API și webhooks", slug: "api-webhooks", readTime: "8 min" },
    ],
  },
  {
    id: "security",
    title: "Securitate",
    icon: Shield,
    description: "Protejarea contului și datelor",
    articles: [
      { title: "Autentificare 2FA", slug: "two-factor", readTime: "4 min" },
      { title: "Gestionare sesiuni", slug: "sessions", readTime: "3 min" },
      { title: "Backup date", slug: "backup", readTime: "3 min" },
      { title: "GDPR și confidențialitate", slug: "gdpr", readTime: "5 min" },
    ],
  },
];

const popularArticles = [
  { title: "Cum configurez E-Factura?", category: "E-Factura ANAF", views: 2453 },
  { title: "Erori frecvente SPV și soluții", category: "E-Factura ANAF", views: 1876 },
  { title: "Generare raport SAF-T", category: "Rapoarte", views: 1654 },
  { title: "Import extras bancar", category: "Primii pași", views: 1432 },
];

export default function DocsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = searchTerm
    ? categories.filter(
        (cat) =>
          cat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.articles.some((a) =>
            a.title.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
    : categories;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
          <div className="max-w-2xl mx-auto text-center">
            <Book className="w-12 h-12 mx-auto mb-4 opacity-80" />
            <h1 className="text-3xl font-bold mb-4">Documentație</h1>
            <p className="text-blue-100 mb-6">
              Ghiduri complete pentru a folosi DocumentIulia la maxim
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Caută în documentație..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-white/30"
              />
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/help" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition group">
            <HelpCircle className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-semibold text-slate-900">Ajutor</h3>
            <p className="text-sm text-slate-500">FAQ și suport</p>
          </Link>
          <Link href="/courses" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition group">
            <Video className="w-8 h-8 text-emerald-500 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-semibold text-slate-900">Tutoriale</h3>
            <p className="text-sm text-slate-500">Video și cursuri</p>
          </Link>
          <Link href="/blog" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition group">
            <BookOpen className="w-8 h-8 text-purple-500 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-semibold text-slate-900">Blog</h3>
            <p className="text-sm text-slate-500">Articole și noutăți</p>
          </Link>
          <Link href="/forum" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition group">
            <Users className="w-8 h-8 text-amber-500 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-semibold text-slate-900">Comunitate</h3>
            <p className="text-sm text-slate-500">Forum și discuții</p>
          </Link>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Categorii</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {filteredCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <div
                    key={category.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{category.title}</h3>
                        <p className="text-sm text-slate-500">{category.description}</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {category.articles.slice(0, 4).map((article) => (
                        <li key={article.slug}>
                          <Link
                            href={`/docs/${category.id}/${article.slug}`}
                            className="flex items-center justify-between py-2 px-3 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition group"
                          >
                            <span>{article.title}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {article.readTime}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition" />
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {category.articles.length > 4 && (
                      <Link
                        href={`/docs/${category.id}`}
                        className="block mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Vezi toate ({category.articles.length}) →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredCategories.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nu am găsit rezultate pentru &ldquo;{searchTerm}&rdquo;</p>
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Șterge căutarea
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Popular Articles */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Articole populare</h3>
              <ul className="space-y-3">
                {popularArticles.map((article, i) => (
                  <li key={i}>
                    <a href="#" className="block hover:text-blue-600 transition">
                      <p className="font-medium text-slate-700 text-sm">{article.title}</p>
                      <p className="text-xs text-slate-400">{article.category} • {article.views.toLocaleString()} vizualizări</p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Need Help */}
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
              <HelpCircle className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Ai nevoie de ajutor?</h3>
              <p className="text-sm text-slate-600 mb-4">
                Echipa noastră de suport este disponibilă să te ajute.
              </p>
              <Link
                href="/help"
                className="inline-flex items-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700"
              >
                Contactează suportul
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>

            {/* API Docs */}
            <div className="bg-slate-900 rounded-xl p-5 text-white">
              <Zap className="w-8 h-8 text-amber-400 mb-3" />
              <h3 className="font-semibold mb-2">API Developer</h3>
              <p className="text-sm text-slate-300 mb-4">
                Integrează DocumentIulia în aplicația ta.
              </p>
              <Link
                href="/docs/api"
                className="inline-flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-100 transition"
              >
                Vezi documentația API
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
