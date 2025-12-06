"use client";

import { useState } from "react";
import {
  HelpCircle,
  Search,
  Book,
  Video,
  MessageSquare,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Receipt,
  Users,
  BarChart3,
  Settings,
  Shield,
  Sparkles,
  Clock,
  CheckCircle,
  PlayCircle,
} from "lucide-react";
import { AppLayout, MobileNav } from "@/components/layout";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface Article {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  icon: React.ReactNode;
}

const faqItems: FAQItem[] = [
  {
    id: "1",
    question: "Cum încarc o factură în sistem?",
    answer: "Poți încărca facturi în mai multe moduri: 1) Din pagina Documente, apasă butonul 'Încarcă' și selectează fișierele PDF sau imagine. 2) Tragi fișierele direct în zona de upload. 3) Sistemul AI va extrage automat datele relevante din factură.",
    category: "facturi",
  },
  {
    id: "2",
    question: "Ce este E-Factura și cum funcționează?",
    answer: "E-Factura este sistemul național de facturare electronică obligatoriu în România. DocumentIulia se conectează automat la SPV (Spațiul Privat Virtual) ANAF pentru a trimite și primi facturi electronice. Fiecare factură este validată și semnată electronic conform standardelor UBL 2.1.",
    category: "efactura",
  },
  {
    id: "3",
    question: "Cum adaug un client nou?",
    answer: "Mergi la pagina Clienți și apasă 'Client Nou'. Introdu CUI-ul și sistemul va completa automat datele companiei din baza de date ANAF. Poți adăuga informații suplimentare precum email, telefon și IBAN.",
    category: "clienti",
  },
  {
    id: "4",
    question: "Cum generez rapoarte financiare?",
    answer: "Din pagina Rapoarte poți genera: Profit & Pierdere, Bilanț Contabil și Flux de Numerar. Selectează perioada dorită și tipul raportului. Poți exporta în format PDF sau Excel.",
    category: "rapoarte",
  },
  {
    id: "5",
    question: "Ce fac dacă o factură E-Factura este respinsă?",
    answer: "Verifică motivul respingerii afișat în statusul facturii. Cele mai comune cauze sunt: CUI invalid, date lipsă sau format incorect. Corectează erorile și retrimite factura. Contactează suportul dacă problema persistă.",
    category: "efactura",
  },
  {
    id: "6",
    question: "Cum configurez integrarea cu SPV ANAF?",
    answer: "Mergi la Setări > Integrări > ANAF SPV. Vei avea nevoie de un certificat digital valid. Urmează pașii de autentificare și autorizare. Odată conectat, facturile se sincronizează automat.",
    category: "setari",
  },
];

const articles: Article[] = [
  {
    id: "1",
    title: "Ghid complet E-Factura",
    description: "Tot ce trebuie să știi despre facturarea electronică în România",
    category: "E-Factura",
    readTime: "10 min",
    icon: <Receipt className="w-6 h-6 text-blue-500" />,
  },
  {
    id: "2",
    title: "Gestionarea clienților",
    description: "Cum să organizezi eficient baza de clienți",
    category: "Clienți",
    readTime: "5 min",
    icon: <Users className="w-6 h-6 text-emerald-500" />,
  },
  {
    id: "3",
    title: "Rapoarte financiare",
    description: "Înțelege și generează rapoarte contabile",
    category: "Rapoarte",
    readTime: "8 min",
    icon: <BarChart3 className="w-6 h-6 text-purple-500" />,
  },
  {
    id: "4",
    title: "Securitatea contului",
    description: "Protejează-ți datele cu 2FA și alte măsuri",
    category: "Securitate",
    readTime: "4 min",
    icon: <Shield className="w-6 h-6 text-red-500" />,
  },
  {
    id: "5",
    title: "Funcții AI",
    description: "Extragerea automată a datelor din documente",
    category: "AI",
    readTime: "6 min",
    icon: <Sparkles className="w-6 h-6 text-amber-500" />,
  },
  {
    id: "6",
    title: "Configurare inițială",
    description: "Primii pași în configurarea contului",
    category: "Început",
    readTime: "7 min",
    icon: <Settings className="w-6 h-6 text-slate-500" />,
  },
];

const videoTutorials = [
  {
    id: "1",
    title: "Introducere în DocumentIulia",
    duration: "5:30",
    thumbnail: "/thumbnails/intro.jpg",
  },
  {
    id: "2",
    title: "Cum să emiți prima factură",
    duration: "8:15",
    thumbnail: "/thumbnails/invoice.jpg",
  },
  {
    id: "3",
    title: "Configurare E-Factura",
    duration: "12:00",
    thumbnail: "/thumbnails/efactura.jpg",
  },
];

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", label: "Toate" },
    { id: "facturi", label: "Facturi" },
    { id: "efactura", label: "E-Factura" },
    { id: "clienti", label: "Clienți" },
    { id: "rapoarte", label: "Rapoarte" },
    { id: "setari", label: "Setări" },
  ];

  const filteredFaq = faqItems.filter((item) => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <AppLayout>
      <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl font-bold mb-4">Cum te putem ajuta?</h1>
          <p className="text-blue-100 mb-6">
            Găsește răspunsuri, tutoriale și resurse pentru a folosi DocumentIulia eficient
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
        <a href="#faq" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition group">
          <Book className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition" />
          <h3 className="font-semibold text-slate-900">Întrebări frecvente</h3>
          <p className="text-sm text-slate-500">Răspunsuri rapide</p>
        </a>
        <a href="#articles" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition group">
          <FileText className="w-8 h-8 text-emerald-500 mb-3 group-hover:scale-110 transition" />
          <h3 className="font-semibold text-slate-900">Documentație</h3>
          <p className="text-sm text-slate-500">Ghiduri detaliate</p>
        </a>
        <a href="#videos" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition group">
          <Video className="w-8 h-8 text-purple-500 mb-3 group-hover:scale-110 transition" />
          <h3 className="font-semibold text-slate-900">Video tutoriale</h3>
          <p className="text-sm text-slate-500">Învață vizual</p>
        </a>
        <a href="#contact" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition group">
          <MessageSquare className="w-8 h-8 text-amber-500 mb-3 group-hover:scale-110 transition" />
          <h3 className="font-semibold text-slate-900">Suport live</h3>
          <p className="text-sm text-slate-500">Vorbește cu noi</p>
        </a>
      </div>

      {/* Articles Section */}
      <section id="articles">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Articole populare</h2>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Vezi toate →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition">
                  {article.icon}
                </div>
                <div className="flex-1">
                  <span className="text-xs text-blue-600 font-medium">{article.category}</span>
                  <h3 className="font-semibold text-slate-900 mt-1 group-hover:text-blue-600 transition">
                    {article.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{article.description}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{article.readTime} citire</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Video Tutorials */}
      <section id="videos">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Video Tutoriale</h2>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Canal YouTube →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {videoTutorials.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition cursor-pointer group"
            >
              <div className="aspect-video bg-slate-100 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                    <PlayCircle className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                  {video.duration}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition">
                  {video.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Întrebări Frecvente</h2>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {filteredFaq.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition"
              >
                <span className="font-medium text-slate-900 pr-4">{item.question}</span>
                {expandedFaq === item.id ? (
                  <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                )}
              </button>
              {expandedFaq === item.id && (
                <div className="px-5 pb-5">
                  <p className="text-slate-600 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredFaq.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nu am găsit rezultate pentru căutarea ta</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Resetează filtrele
            </button>
          </div>
        )}
      </section>

      {/* Contact Support */}
      <section id="contact" className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Nu ai găsit ce căutai?</h2>
          <p className="text-slate-500 mb-6">
            Echipa noastră de suport este disponibilă să te ajute
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <Mail className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900">Email</h3>
              <p className="text-sm text-slate-500 mt-1">suport@documentiulia.ro</p>
              <p className="text-xs text-slate-400 mt-2">Răspundem în max 24h</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <Phone className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900">Telefon</h3>
              <p className="text-sm text-slate-500 mt-1">+40 21 123 4567</p>
              <p className="text-xs text-slate-400 mt-2">Luni-Vineri, 9:00-18:00</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <MessageSquare className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900">Chat Live</h3>
              <p className="text-sm text-slate-500 mt-1">Disponibil acum</p>
              <button className="mt-2 px-4 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition">
                Începe chat
              </button>
            </div>
          </div>
        </div>
      </section>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
