'use client';

import { useTranslations } from 'next-intl';
import {
  FileText, Brain, Shield, Zap, BarChart3, Users,
  Receipt, Calculator, Clock, Globe, Lock, Smartphone,
  CheckCircle, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function FeaturesPage() {
  const t = useTranslations();

  const mainFeatures = [
    {
      id: 'vat',
      icon: Calculator,
      title: 'Calcul TVA Automat',
      description: 'Calculează automat TVA 21%/11% conform Legii 141/2025. Suport pentru regimul normal, TVA la încasare, și tranzacții intracomunitare.',
      benefits: ['Conformitate 100% ANAF', 'Raportare automată', 'Deduceri calculate instant'],
    },
    {
      id: 'ocr',
      icon: FileText,
      title: 'OCR Inteligent',
      description: 'Extrage automat datele din facturi și documente cu precizie de 99%. Suportă PDF, imagini și documente scanate.',
      benefits: ['Procesare în 3 secunde', 'Recunoaștere CUI/CNP', 'Multi-limbă suportat'],
    },
    {
      id: 'saft',
      icon: Receipt,
      title: 'SAF-T D406',
      description: 'Generează fișiere XML SAF-T conform Order 1783/2021. Validare DUKIntegrator integrată și transmitere SPV.',
      benefits: ['XML valid 100%', 'Export lunar automat', 'Validare pre-submission'],
    },
    {
      id: 'efactura',
      icon: Zap,
      title: 'e-Factura B2B',
      description: 'Integrare completă cu sistemul e-Factura ANAF pentru facturare electronică B2B obligatorie din 2026.',
      benefits: ['Transmitere automată', 'Status în timp real', 'Arhivare conformă'],
    },
    {
      id: 'ai',
      icon: Brain,
      title: 'Asistent AI',
      description: 'Consultant fiscal virtual disponibil 24/7. Răspunde la întrebări, oferă recomandări și identifică optimizări.',
      benefits: ['Răspunsuri instant', 'Învățare continuă', 'Context personalizat'],
    },
    {
      id: 'hr',
      icon: Users,
      title: 'Modul HR Complet',
      description: 'Gestionare angajați, pontaje, salarii și declarații HR. Calcul automat contribuții și generare fluturași.',
      benefits: ['Payroll automatizat', 'REVISAL integrat', 'Portal angajați'],
    },
  ];

  const additionalFeatures = [
    { icon: BarChart3, title: 'Dashboard Analytics', description: 'Vizualizări în timp real pentru performanța financiară' },
    { icon: Clock, title: 'Automatizări', description: 'Fluxuri automate pentru operațiuni repetitive' },
    { icon: Globe, title: 'Multi-company', description: 'Gestionează mai multe firme dintr-un singur cont' },
    { icon: Lock, title: 'Securitate Avansată', description: 'Criptare end-to-end și 2FA obligatoriu' },
    { icon: Smartphone, title: 'Aplicație Mobilă', description: 'Acces complet de pe telefon sau tabletă' },
    { icon: Shield, title: 'GDPR Compliant', description: 'Protecția datelor conform regulamentului UE' },
  ];

  const integrations = [
    'ANAF SPV', 'DUKIntegrator', 'e-Factura', 'SAGA',
    'BT', 'BCR', 'ING', 'Raiffeisen', 'Stripe', 'PayPal'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Funcționalități Complete pentru Afacerea Ta
          </h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">
            Tot ce ai nevoie pentru contabilitate, fiscalitate și HR într-o singură platformă
            cu inteligență artificială
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Începe Gratuit
            </Link>
            <Link
              href="/demo"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
            >
              Vezi Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Funcționalități Principale</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature) => (
              <div id={feature.id} key={feature.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition scroll-mt-24">
                <div className="w-14 h-14 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Și Multe Altele</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary-300 transition">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Integrări</h2>
          <p className="text-gray-600 mb-8">
            Conectează-te cu sistemele pe care le folosești deja
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {integrations.map((integration) => (
              <span
                key={integration}
                className="px-4 py-2 bg-white rounded-full border text-sm font-medium"
              >
                {integration}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Gata să Începi?</h2>
          <p className="text-lg opacity-90 mb-8">
            Încearcă gratuit toate funcționalitățile timp de 14 zile. Fără card de credit.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Creează Cont Gratuit <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
}
