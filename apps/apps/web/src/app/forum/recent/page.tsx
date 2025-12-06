"use client";

import Link from "next/link";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  MessageSquare,
  Clock,
  ChevronRight,
  ArrowLeft,
  User,
  ThumbsUp,
  Eye,
  Filter,
} from "lucide-react";
import { useState } from "react";

const recentTopics = [
  {
    id: "1",
    title: "Cum înregistrez o factură de avans în contabilitate?",
    category: "Contabilitate Generală",
    categorySlug: "contabilitate",
    author: "Maria P.",
    timeAgo: "5 minute",
    replies: 3,
    views: 45,
    likes: 2,
    lastReply: "Andrei I.",
    excerpt: "Am primit o factură de avans de la un furnizor și nu sunt sigur cum să o înregistrez corect...",
  },
  {
    id: "2",
    title: "E-Factura respinsă - cod eroare 4001",
    category: "E-Factura",
    categorySlug: "efactura",
    author: "Ion V.",
    timeAgo: "12 minute",
    replies: 5,
    views: 89,
    likes: 4,
    lastReply: "Elena M.",
    excerpt: "Primesc constant eroarea 4001 când încerc să trimit factura. Am verificat CUI-ul...",
  },
  {
    id: "3",
    title: "Termen limită depunere SAF-T - clarificări",
    category: "SAF-T",
    categorySlug: "saft",
    author: "Cristina D.",
    timeAgo: "28 minute",
    replies: 8,
    views: 156,
    likes: 12,
    lastReply: "Admin",
    excerpt: "Am citit pe site-ul ANAF că termenul a fost prelungit, dar nu sunt sigur pentru ce...",
  },
  {
    id: "4",
    title: "Calcul TVA pentru servicii către UE",
    category: "Fiscalitate și Taxe",
    categorySlug: "fiscalitate",
    author: "Alexandru M.",
    timeAgo: "45 minute",
    replies: 6,
    views: 78,
    likes: 5,
    lastReply: "Consultant",
    excerpt: "Am un client din Germania și nu știu dacă trebuie să aplic TVA sau nu pe factura...",
  },
  {
    id: "5",
    title: "Import extras bancar - format nerecunoscut",
    category: "Ajutor și Suport",
    categorySlug: "ajutor",
    author: "Laura S.",
    timeAgo: "1 oră",
    replies: 2,
    views: 34,
    likes: 1,
    lastReply: "Suport",
    excerpt: "Am descărcat extrasul de la Banca Transilvania dar aplicația nu îl recunoaște...",
  },
  {
    id: "6",
    title: "Amortizare mijloace fixe - metodă optimă",
    category: "Contabilitate Generală",
    categorySlug: "contabilitate",
    author: "Mihai R.",
    timeAgo: "2 ore",
    replies: 11,
    views: 203,
    likes: 15,
    lastReply: "Expert",
    excerpt: "Care este metoda de amortizare recomandată pentru echipamente IT cu valoare...",
  },
  {
    id: "7",
    title: "Declarație 300 - diferențe între calculat și raportat",
    category: "Fiscalitate și Taxe",
    categorySlug: "fiscalitate",
    author: "Ana T.",
    timeAgo: "3 ore",
    replies: 4,
    views: 92,
    likes: 3,
    lastReply: "Consultant",
    excerpt: "Am observat o diferență de câțiva lei între TVA-ul calculat de mine și cel din...",
  },
  {
    id: "8",
    title: "Certificat digital expirat - procedură reînnoire",
    category: "E-Factura",
    categorySlug: "efactura",
    author: "George N.",
    timeAgo: "4 ore",
    replies: 7,
    views: 145,
    likes: 8,
    lastReply: "Admin",
    excerpt: "Certificatul meu digital a expirat și nu mai pot trimite e-facturi. Care este...",
  },
];

const categoryColors: Record<string, string> = {
  contabilitate: "bg-blue-100 text-blue-700",
  fiscalitate: "bg-emerald-100 text-emerald-700",
  efactura: "bg-purple-100 text-purple-700",
  saft: "bg-orange-100 text-orange-700",
  ajutor: "bg-pink-100 text-pink-700",
};

export default function RecentTopicsPage() {
  const [filter, setFilter] = useState("all");

  const filteredTopics = filter === "all"
    ? recentTopics
    : recentTopics.filter(t => t.categorySlug === filter);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/forum"
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Discuții Recente</h1>
              <p className="text-slate-500">Ultimele subiecte din comunitate</p>
            </div>
          </div>
          <Link
            href="/forum/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <MessageSquare className="w-4 h-4" />
            Subiect Nou
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {[
            { id: "all", label: "Toate" },
            { id: "contabilitate", label: "Contabilitate" },
            { id: "fiscalitate", label: "Fiscalitate" },
            { id: "efactura", label: "E-Factura" },
            { id: "saft", label: "SAF-T" },
            { id: "ajutor", label: "Ajutor" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                filter === cat.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Topics List */}
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {filteredTopics.map((topic) => (
            <Link
              key={topic.id}
              href={`/forum/${topic.categorySlug}/${topic.id}`}
              className="block p-4 hover:bg-slate-50 transition"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[topic.categorySlug]}`}>
                      {topic.category}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {topic.timeAgo}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 hover:text-blue-600 transition">
                    {topic.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-1 mb-2">
                    {topic.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {topic.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {topic.replies} răspunsuri
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {topic.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {topic.likes}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {filteredTopics.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nu există subiecte în această categorie</p>
          </div>
        )}

        {/* Load More */}
        <div className="text-center">
          <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition">
            Încarcă mai multe
          </button>
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
