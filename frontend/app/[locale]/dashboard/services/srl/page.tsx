'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Euro,
  Shield,
  Star,
  Phone,
  Mail,
  HelpCircle,
  Download,
  CreditCard,
  Briefcase,
  MapPin,
  Calendar
} from 'lucide-react';

interface Package {
  id: string;
  name: string;
  price: number;
  timeline: string;
  features: string[];
  recommended?: boolean;
}

const packages: Package[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 199,
    timeline: '15 zile lucrătoare',
    features: [
      'Rezervare denumire ONRC',
      'Act constitutiv standard',
      'Contract de asociere (dacă e cazul)',
      'Ghid pas cu pas complet',
      'Suport email',
      'Șabloane documente'
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 299,
    timeline: '10 zile lucrătoare',
    features: [
      'Tot ce include Basic',
      'Verificare completă documente',
      'Consultanță alegere CAEN',
      'Suport telefonic',
      'Înregistrare ANAF inclusă',
      'Declarație tip unic',
      'Redactare personalizată'
    ],
    recommended: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 499,
    timeline: '5 zile lucrătoare',
    features: [
      'Tot ce include Standard',
      'Procesare prioritară',
      'Notariat inclus în preț',
      'Înregistrare TVA opțional',
      'Deschidere cont bancar asistat',
      'Stampilă personalizată',
      'Consultanță fiscală 30 min',
      'Suport dedicat WhatsApp'
    ]
  }
];

const requirements = [
  {
    title: 'Asociați',
    description: 'Minim 1 persoană fizică sau juridică, maximum 50 asociați',
    icon: <Users className="w-5 h-5" />
  },
  {
    title: 'Capital Social',
    description: 'Minim 1 RON (recomandat 200 RON pentru credibilitate)',
    icon: <Euro className="w-5 h-5" />
  },
  {
    title: 'Sediu Social',
    description: 'Contract de comodat sau proprietate, extras CF recent',
    icon: <MapPin className="w-5 h-5" />
  },
  {
    title: 'Documente',
    description: 'CI valabil, cazier fiscal, declarație avere',
    icon: <FileText className="w-5 h-5" />
  }
];

const steps = [
  {
    step: 1,
    title: 'Rezervare Denumire',
    description: 'Alegem și rezervăm denumirea unică la ONRC',
    duration: '1-2 zile'
  },
  {
    step: 2,
    title: 'Redactare Acte',
    description: 'Pregătim actul constitutiv și documentele necesare',
    duration: '1-2 zile'
  },
  {
    step: 3,
    title: 'Semnare Notar',
    description: 'Legalizare semnături la notariat',
    duration: '1 zi'
  },
  {
    step: 4,
    title: 'Depunere ONRC',
    description: 'Înregistrare oficială la Registrul Comerțului',
    duration: '3-5 zile'
  },
  {
    step: 5,
    title: 'Înregistrare ANAF',
    description: 'Obținere CUI și înregistrare fiscală',
    duration: '1-3 zile'
  },
  {
    step: 6,
    title: 'Finalizare',
    description: 'Primești certificatul și poți începe activitatea',
    duration: '1 zi'
  }
];

const faqs = [
  {
    q: 'Cât durează înființarea unui SRL?',
    a: 'În funcție de pachetul ales, între 5 și 15 zile lucrătoare. Procesul poate fi accelerat cu pachetul Premium.'
  },
  {
    q: 'Care este capitalul social minim?',
    a: 'Capitalul social minim legal este de 1 RON, însă recomandăm minim 200 RON pentru credibilitate în relațiile comerciale.'
  },
  {
    q: 'Pot înființa SRL singur?',
    a: 'Da, poți înființa un SRL cu un singur asociat (SRL-D sau SRL cu asociat unic). Nu există restricții privind numărul minim de asociați.'
  },
  {
    q: 'Am nevoie de sediu social?',
    a: 'Da, este obligatoriu. Poate fi proprietatea ta sau un spațiu închiriat cu contract de comodat sau închiriere.'
  },
  {
    q: 'Ce coduri CAEN pot alege?',
    a: 'Poți alege orice cod CAEN din nomenclatorul oficial. Te ajutăm să alegi codurile potrivite pentru activitatea ta.'
  },
  {
    q: 'Când trebuie să mă înregistrez la TVA?',
    a: 'Obligatoriu dacă depășești 300.000 RON cifră de afaceri anuală. Opțional te poți înregistra de la început dacă lucrezi cu companii mari.'
  }
];

export default function SRLFormationPage() {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<string>('standard');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    companyName2: '',
    companyName3: '',
    associateCount: '1',
    capitalSocial: '200',
    mainActivity: '',
    hasLocation: 'yes'
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard/services')}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Înapoi la Servicii
      </button>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Înființare SRL</h1>
            <p className="text-blue-100 text-lg mb-4">
              Societate cu Răspundere Limitată - cea mai populară formă juridică pentru afaceri în România.
              Răspundere limitată la capitalul social, flexibilitate maximă.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Clock className="w-4 h-4" /> 5-15 zile
              </span>
              <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Euro className="w-4 h-4" /> de la €199
              </span>
              <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Shield className="w-4 h-4" /> Garanție 100%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Requirements */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cerințe Înființare</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {requirements.map((req, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    {req.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{req.title}</h3>
                    <p className="text-sm text-gray-600">{req.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Process Steps */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Procesul de Înființare</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.step} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {step.step}
                  </div>
                  <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{step.title}</h3>
                      <span className="text-sm text-gray-500">{step.duration}</span>
                    </div>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Packages */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Alege Pachetul</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition ${
                    selectedPackage === pkg.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${pkg.recommended ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  {pkg.recommended && (
                    <div className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> Recomandat
                    </div>
                  )}
                  <h3 className="font-bold text-gray-900 text-lg">{pkg.name}</h3>
                  <p className="text-3xl font-bold text-blue-600 my-2">€{pkg.price}</p>
                  <p className="text-sm text-gray-500 mb-4">{pkg.timeline}</p>
                  <ul className="space-y-2">
                    {pkg.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Întrebări Frecvente</h2>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-lg">
                  <button
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  >
                    <span className="font-medium text-gray-900">{faq.q}</span>
                    <HelpCircle className={`w-5 h-5 text-gray-400 transition ${expandedFaq === index ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 pb-3 text-gray-600 text-sm">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Order Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
            <h3 className="font-bold text-gray-900 mb-4">Începe Acum</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Denumire dorită (opțiunea 1) *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  placeholder="ex: TECH SOLUTIONS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Denumire alternativă (opțiunea 2)
                </label>
                <input
                  type="text"
                  value={formData.companyName2}
                  onChange={(e) => setFormData({...formData, companyName2: e.target.value})}
                  placeholder="ex: TECH INNOVATIONS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Număr asociați
                </label>
                <select
                  value={formData.associateCount}
                  onChange={(e) => setFormData({...formData, associateCount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1">1 asociat</option>
                  <option value="2">2 asociați</option>
                  <option value="3">3-5 asociați</option>
                  <option value="more">Peste 5 asociați</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capital social (RON)
                </label>
                <input
                  type="number"
                  value={formData.capitalSocial}
                  onChange={(e) => setFormData({...formData, capitalSocial: e.target.value})}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ai sediu social?
                </label>
                <select
                  value={formData.hasLocation}
                  onChange={(e) => setFormData({...formData, hasLocation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="yes">Da, am sediu</option>
                  <option value="no">Nu, am nevoie de ajutor</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Pachet {packages.find(p => p.id === selectedPackage)?.name}</span>
                <span>€{packages.find(p => p.id === selectedPackage)?.price}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Taxe ONRC</span>
                <span>~€45</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total estimat</span>
                  <span>€{(packages.find(p => p.id === selectedPackage)?.price || 0) + 45}</span>
                </div>
              </div>
            </div>

            <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2">
              <CreditCard className="w-5 h-5" />
              Plasează Comanda
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              Garanție 100% satisfacție. Plată securizată.
            </p>

            <div className="border-t border-gray-200 mt-6 pt-6">
              <p className="text-sm font-medium text-gray-900 mb-3">Ai întrebări?</p>
              <div className="space-y-2">
                <a href="tel:+40700000000" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                  <Phone className="w-4 h-4" />
                  +40 700 000 000
                </a>
                <a href="mailto:servicii@documentiulia.ro" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                  <Mail className="w-4 h-4" />
                  servicii@documentiulia.ro
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
