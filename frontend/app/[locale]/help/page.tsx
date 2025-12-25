'use client';

import { useTranslations } from 'next-intl';
import {
  HelpCircle, Book, MessageCircle, Mail, Phone,
  Search, ChevronDown, ChevronRight, FileText,
  Video, Users, Clock
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function HelpPage() {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const categories = [
    { icon: FileText, title: 'Ghiduri de Start', count: 12, href: '/help/getting-started' },
    { icon: Book, title: 'Documentație', count: 45, href: '/help/docs' },
    { icon: Video, title: 'Video Tutoriale', count: 24, href: '/help/videos' },
    { icon: Users, title: 'Comunitate', count: 889, href: '/forum' },
  ];

  const faqs = [
    {
      question: 'Cum îmi creez un cont?',
      answer: 'Click pe butonul "Înregistrare" din colțul dreapta sus, completează formularul cu datele tale și confirmă adresa de email. Contul gratuit include acces la funcționalitățile de bază.',
    },
    {
      question: 'Care sunt cotele TVA disponibile?',
      answer: 'Conform Legii 141/2025, platforma suportă cota standard de 21% și cota redusă de 11%. Sistemul selectează automat cota corectă în funcție de tipul serviciului sau produsului.',
    },
    {
      question: 'Cum generez fișierul SAF-T D406?',
      answer: 'Din Dashboard, navighează la Rapoarte → SAF-T D406. Selectează perioada dorită și apasă "Generează XML". Fișierul va fi validat automat cu DUKIntegrator înainte de descărcare.',
    },
    {
      question: 'Cum integrez e-Factura ANAF?',
      answer: 'Din Setări → Integrări → ANAF, autorizează accesul prin certificat digital. După conectare, facturile pot fi transmise automat la SPV direct din platformă.',
    },
    {
      question: 'Ce include planul gratuit?',
      answer: 'Planul gratuit include: calcul TVA automat, procesare OCR pentru 10 documente/lună, generare SAF-T de bază, și acces la comunitatea de suport.',
    },
    {
      question: 'Cum contactez suportul tehnic?',
      answer: 'Poți contacta echipa de suport prin email la suport@documentiulia.ro, prin chat live (Pro/Business), sau prin telefon în timpul programului de lucru (L-V, 9:00-18:00).',
    },
  ];

  const popularArticles = [
    { title: 'Primii pași în DocumentIulia', views: 2340 },
    { title: 'Configurare e-Factura ANAF', views: 1890 },
    { title: 'Import facturi din Excel', views: 1567 },
    { title: 'Setare TVA la încasare', views: 1234 },
    { title: 'Generare rapoarte lunare', views: 1100 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Cum te putem ajuta?</h1>
          <p className="text-xl opacity-90 mb-8">
            Caută în documentație sau explorează ghidurile noastre
          </p>
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Caută în documentație..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 text-lg"
            />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto py-12 px-4">
        {/* Categories */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Categorii de Ajutor</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.title}
                href={category.href}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition group"
              >
                <category.icon className="w-10 h-10 text-primary-600 mb-4" />
                <h3 className="font-semibold mb-1 group-hover:text-primary-600 transition">
                  {category.title}
                </h3>
                <p className="text-sm text-gray-500">{category.count} articole</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* FAQ */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Întrebări Frecvente</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b last:border-b-0">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <span className="font-medium pr-4">{faq.question}</span>
                    {expandedFaq === index ? (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 pb-4 text-gray-600">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Popular Articles */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4">Articole Populare</h3>
              <ul className="space-y-3">
                {popularArticles.map((article) => (
                  <li key={article.title}>
                    <Link href="#" className="text-sm text-gray-600 hover:text-primary-600 flex items-center justify-between">
                      <span>{article.title}</span>
                      <span className="text-xs text-gray-400">{article.views} vizualizări</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Support */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4">Contact Suport</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <a href="mailto:suport@documentiulia.ro" className="text-sm text-primary-600">
                      suport@documentiulia.ro
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Telefon</p>
                    <a href="tel:+40212345678" className="text-sm text-primary-600">
                      +40 21 234 5678
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Program</p>
                    <p className="text-sm text-gray-600">L-V: 9:00 - 18:00</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Chat CTA */}
            <div className="bg-primary-600 rounded-xl p-6 text-white">
              <MessageCircle className="w-8 h-8 mb-3" />
              <h3 className="font-semibold mb-2">Chat Live</h3>
              <p className="text-sm opacity-90 mb-4">
                Vorbește cu echipa noastră în timp real
              </p>
              <button className="w-full bg-white text-primary-600 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
                Începe Conversația
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
