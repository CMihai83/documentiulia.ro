'use client';

import { useTranslations } from 'next-intl';
import { Play, Monitor, FileText, Calculator, Users, BarChart3, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function DemoPage() {
  const t = useTranslations();
  const [activeDemo, setActiveDemo] = useState('dashboard');

  const demoSections = [
    { id: 'dashboard', title: 'Dashboard', icon: Monitor, description: 'Vizualizează indicatorii cheie' },
    { id: 'invoices', title: 'Facturare', icon: FileText, description: 'Crează și gestionează facturi' },
    { id: 'vat', title: 'Calcul TVA', icon: Calculator, description: 'TVA automat conform legii' },
    { id: 'hr', title: 'Modul HR', icon: Users, description: 'Gestionare angajați' },
    { id: 'reports', title: 'Rapoarte', icon: BarChart3, description: 'Analytics și raportare' },
  ];

  const demoContent: Record<string, { title: string; features: string[]; image: string }> = {
    dashboard: {
      title: 'Dashboard Inteligent',
      features: [
        'Indicatori financiari în timp real',
        'Grafice interactive pentru venituri/cheltuieli',
        'Alerte și notificări automate',
        'Calendar deadline-uri ANAF',
        'Predicții AI pentru flux de numerar',
      ],
      image: '/demo/dashboard.png',
    },
    invoices: {
      title: 'Sistem de Facturare',
      features: [
        'Creare factură în 30 secunde',
        'Template-uri personalizabile',
        'e-Factura ANAF integrată',
        'Tracking plăți automat',
        'Export PDF/XML/EDI',
      ],
      image: '/demo/invoices.png',
    },
    vat: {
      title: 'Calcul TVA Automat',
      features: [
        'TVA 21%/11% conform Legii 141/2025',
        'Declarații D300 pre-completate',
        'Deduceri calculate instant',
        'Validare ANAF integrată',
        'Istoric și audit trail',
      ],
      image: '/demo/vat.png',
    },
    hr: {
      title: 'Management HR',
      features: [
        'Fișe angajați complete',
        'Calcul salarial automat',
        'Pontaje și concedii',
        'REVISAL export',
        'Portal self-service angajați',
      ],
      image: '/demo/hr.png',
    },
    reports: {
      title: 'Raportare Avansată',
      features: [
        'SAF-T D406 generat automat',
        'Bilanț și cont de profit',
        'Cash flow forecast',
        'Rapoarte personalizate',
        'Export Excel/PDF',
      ],
      image: '/demo/reports.png',
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Demo Interactiv</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Explorează funcționalitățile platformei DocumentIulia înainte de a crea un cont
          </p>
        </div>
      </section>

      {/* Demo Navigation */}
      <section className="py-8 px-4 bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2">
            {demoSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveDemo(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  activeDemo === section.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <section.icon className="w-4 h-4" />
                {section.title}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Content */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Screenshot/Preview */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="text-xs text-gray-500 ml-2">DocumentIulia - {demoContent[activeDemo].title}</span>
              </div>
              <div className="aspect-video bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-16 h-16 text-primary-600 mx-auto mb-4" />
                  <p className="text-gray-600">Preview {demoContent[activeDemo].title}</p>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div>
              <h2 className="text-3xl font-bold mb-6">{demoContent[activeDemo].title}</h2>
              <ul className="space-y-4">
                {demoContent[activeDemo].features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-lg text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition text-center"
                >
                  Începe Gratuit
                </Link>
                <Link
                  href="/contact"
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition text-center"
                >
                  Solicită Demo Personalizat
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Video Prezentare</h2>
          <p className="text-gray-600 mb-8">
            Vezi cum funcționează platforma în doar 5 minute
          </p>
          <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-primary-700 transition">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <p className="text-gray-500">Click pentru a viziona</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Convins?</h2>
          <p className="text-lg opacity-90 mb-8">
            Creează un cont gratuit și testează toate funcționalitățile timp de 14 zile
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Începe Acum - Gratuit
          </Link>
        </div>
      </section>
    </div>
  );
}
