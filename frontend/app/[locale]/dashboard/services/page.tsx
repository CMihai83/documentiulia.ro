'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  User,
  Users,
  Briefcase,
  FileText,
  ArrowRight,
  CheckCircle,
  Clock,
  Shield,
  Star,
  Zap,
  HeadphonesIcon,
  Scale,
  Globe,
  Award,
  TrendingUp
} from 'lucide-react';

interface ServiceCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  startingPrice: number;
  timeline: string;
  popular?: boolean;
  href: string;
}

const services: ServiceCard[] = [
  {
    id: 'srl',
    title: 'Înființare SRL',
    description: 'Societate cu Răspundere Limitată - cea mai populară formă juridică pentru afaceri în România',
    icon: <Building2 className="w-8 h-8" />,
    features: [
      'Act constitutiv și contract de asociere',
      'Rezervare denumire ONRC',
      'Înregistrare fiscală ANAF',
      'Obținere CUI și certificat',
      'Deschidere cont bancar business'
    ],
    startingPrice: 199,
    timeline: '5-15 zile',
    popular: true,
    href: '/dashboard/services/srl'
  },
  {
    id: 'pfa',
    title: 'Înregistrare PFA',
    description: 'Persoană Fizică Autorizată - ideal pentru freelanceri și consultanți independenți',
    icon: <User className="w-8 h-8" />,
    features: [
      'Documentație completă PFA',
      'Alegere cod CAEN optim',
      'Înregistrare ONRC',
      'Înregistrare fiscală ANAF',
      'Consultanță impozitare'
    ],
    startingPrice: 99,
    timeline: '3-7 zile',
    href: '/dashboard/services/pfa'
  },
  {
    id: 'ii',
    title: 'Întreprindere Individuală',
    description: 'Alternativă la PFA cu posibilitatea de a angaja până la 8 persoane',
    icon: <Briefcase className="w-8 h-8" />,
    features: [
      'Documentație completă II',
      'Posibilitate angajare personal',
      'Înregistrare ONRC',
      'Înregistrare fiscală',
      'Consultanță juridică'
    ],
    startingPrice: 129,
    timeline: '5-10 zile',
    href: '/dashboard/services/legal-forms'
  },
  {
    id: 'sa',
    title: 'Înființare SA',
    description: 'Societate pe Acțiuni - pentru companii mari cu capital social minim 90.000 RON',
    icon: <Users className="w-8 h-8" />,
    features: [
      'Act constitutiv complex',
      'Statut societate',
      'Registru acțiuni',
      'Consiliu de administrație',
      'Audit obligatoriu'
    ],
    startingPrice: 799,
    timeline: '15-20 zile',
    href: '/dashboard/services/legal-forms'
  },
  {
    id: 'ong',
    title: 'Înființare ONG/Asociație',
    description: 'Organizații non-profit pentru activități sociale, culturale sau sportive',
    icon: <Scale className="w-8 h-8" />,
    features: [
      'Act constitutiv și statut',
      'Minimum 3 membri fondatori',
      'Înregistrare Judecătorie',
      'Obținere CIF',
      'Consultanță beneficii fiscale'
    ],
    startingPrice: 349,
    timeline: '15-20 zile',
    href: '/dashboard/services/legal-forms'
  },
  {
    id: 'templates',
    title: 'Șabloane și Documente',
    description: 'Biblioteca completă de șabloane pentru contracte, facturi și declarații',
    icon: <FileText className="w-8 h-8" />,
    features: [
      'Contracte de muncă',
      'Contracte comerciale',
      'Facturi și avize',
      'Declarații fiscale',
      'Procuri și împuterniciri'
    ],
    startingPrice: 0,
    timeline: 'Instant',
    href: '/dashboard/services/templates'
  }
];

const benefits = [
  {
    icon: <Zap className="w-6 h-6 text-yellow-500" />,
    title: 'Rapiditate',
    description: 'Proces simplificat și automatizat pentru înființare în timp record'
  },
  {
    icon: <Shield className="w-6 h-6 text-green-500" />,
    title: 'Securitate',
    description: 'Toate documentele sunt verificate de experți și conforme legal'
  },
  {
    icon: <HeadphonesIcon className="w-6 h-6 text-blue-500" />,
    title: 'Suport 24/7',
    description: 'Echipă dedicată disponibilă pentru orice întrebări'
  },
  {
    icon: <Award className="w-6 h-6 text-purple-500" />,
    title: 'Garanție',
    description: 'Garanție 100% satisfacție sau banii înapoi'
  }
];

const stats = [
  { value: '5,000+', label: 'Companii înființate' },
  { value: '99%', label: 'Rata de succes' },
  { value: '4.9/5', label: 'Rating clienți' },
  { value: '24h', label: 'Timp răspuns suport' }
];

export default function BusinessServicesPage() {
  const router = useRouter();

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `€${price}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Servicii de Înființare Firme
          </h1>
          <p className="text-lg text-blue-100 mb-6">
            Înființează-ți afacerea în România rapid și simplu. Oferim servicii complete
            pentru toate formele juridice, de la PFA la SA, cu suport dedicat și prețuri transparente.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push('/dashboard/services/srl')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Înființează SRL
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/dashboard/services/pfa')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition"
            >
              Înregistrează PFA
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Services Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Serviciile Noastre</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition cursor-pointer ${
                service.popular ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => router.push(service.href)}
            >
              {service.popular && (
                <div className="bg-blue-500 text-white text-center py-1 text-sm font-medium">
                  Cel mai popular
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    {service.icon}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(service.startingPrice)}</p>
                    <p className="text-xs text-gray-500">de la</p>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{service.description}</p>

                <ul className="space-y-2 mb-4">
                  {service.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {service.timeline}
                  </div>
                  <button className="inline-flex items-center gap-1 text-blue-600 font-medium text-sm hover:text-blue-700">
                    Află mai mult
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-gray-50 rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">De Ce Să Alegi DocumentIulia?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-white rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {benefit.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
              <p className="text-sm text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Process Steps */}
      <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Cum Funcționează?</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: 1, title: 'Alege Serviciul', desc: 'Selectează tipul de firmă potrivit nevoilor tale' },
            { step: 2, title: 'Completează Datele', desc: 'Formulare simple, ghidate pas cu pas' },
            { step: 3, title: 'Verificare & Plată', desc: 'Experții noștri verifică documentele' },
            { step: 4, title: 'Primești Firma', desc: 'Certificat de înregistrare și CUI' }
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                {item.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Gata să-ți Începi Afacerea?
        </h2>
        <p className="text-green-100 mb-6 max-w-2xl mx-auto">
          Consultanță gratuită cu experții noștri pentru a alege cea mai potrivită formă juridică pentru afacerea ta.
        </p>
        <button
          onClick={() => router.push('/dashboard/services/srl')}
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition text-lg"
        >
          Începe Acum - Consultanță Gratuită
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
