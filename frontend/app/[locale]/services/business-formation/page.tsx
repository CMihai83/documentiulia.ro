'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2, Users, Briefcase, Scale, FileCheck, Clock,
  CheckCircle, ArrowRight, Shield, Zap, HeadphonesIcon,
  Star, Award, TrendingUp, Globe, Calculator, FileText,
  ChevronRight, Phone, Mail, MessageCircle
} from 'lucide-react';

export default function BusinessFormationPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const businessTypes = [
    {
      id: 'srl',
      name: 'SRL',
      fullName: 'Societate cu Răspundere Limitată',
      icon: Building2,
      description: 'Cea mai populară formă juridică pentru afaceri în România. Răspundere limitată la capitalul social.',
      startPrice: 199,
      timeline: '5-15 zile',
      capital: '1 RON minim',
      href: '/services/infiintare-srl',
      popular: true,
      features: [
        'Răspundere limitată la aport',
        'Capital social minim 1 RON',
        '1-50 asociați',
        'Flexibilitate în administrare',
        'Poate desfășura orice activitate legală',
      ],
    },
    {
      id: 'pfa',
      name: 'PFA',
      fullName: 'Persoană Fizică Autorizată',
      icon: Users,
      description: 'Ideal pentru freelanceri și activități independente. Procedură simplificată și costuri reduse.',
      startPrice: 99,
      timeline: '3-7 zile',
      capital: 'Fără capital',
      href: '/services/inregistrare-pfa',
      popular: false,
      features: [
        'Procedură simplă de înregistrare',
        'Fără capital social',
        'Impozit pe venit 10%',
        'Contabilitate simplificată',
        'Ideal pentru freelanceri',
      ],
    },
    {
      id: 'ii',
      name: 'II',
      fullName: 'Întreprindere Individuală',
      icon: Briefcase,
      description: 'Similar cu PFA dar permite angajarea de personal. Răspundere nelimitată.',
      startPrice: 129,
      timeline: '5 zile',
      capital: 'Fără capital',
      href: '/services/forme-juridice',
      popular: false,
      features: [
        'Poate angaja terțe persoane',
        'Fără capital social',
        'Răspundere nelimitată',
        'Contabilitate simplificată',
        'Max 8 salariați',
      ],
    },
    {
      id: 'sa',
      name: 'SA',
      fullName: 'Societate pe Acțiuni',
      icon: TrendingUp,
      description: 'Pentru afaceri mari cu acționari multipli. Capital social minim 90.000 RON.',
      startPrice: 799,
      timeline: '20 zile',
      capital: '90.000 RON minim',
      href: '/services/forme-juridice',
      popular: false,
      features: [
        'Acțiuni transferabile',
        'Minim 2 acționari',
        'Listare la bursă posibilă',
        'Structură de guvernanță complexă',
        'Pentru afaceri de mari dimensiuni',
      ],
    },
    {
      id: 'ong',
      name: 'ONG',
      fullName: 'Asociație / Fundație',
      icon: Scale,
      description: 'Pentru activități non-profit, sociale, culturale sau de caritate.',
      startPrice: 349,
      timeline: '15-20 zile',
      capital: 'Patrimoniu inițial',
      href: '/services/forme-juridice',
      popular: false,
      features: [
        'Scop non-profit',
        'Scutiri fiscale disponibile',
        'Poate primi donații',
        'Statut de utilitate publică',
        'Activități sociale/culturale',
      ],
    },
  ];

  const processSteps = [
    {
      step: 1,
      title: 'Consultare Gratuită',
      description: 'Discutăm despre planurile tale și recomandăm cea mai potrivită formă juridică.',
      icon: HeadphonesIcon,
    },
    {
      step: 2,
      title: 'Pregătire Documente',
      description: 'Pregătim toate documentele necesare: act constitutiv, dovadă sediu, rezervare nume.',
      icon: FileText,
    },
    {
      step: 3,
      title: 'Depunere ONRC',
      description: 'Depunem dosarul la Oficiul Registrului Comerțului și gestionăm procesul.',
      icon: FileCheck,
    },
    {
      step: 4,
      title: 'Înregistrare ANAF',
      description: 'Te înregistrăm ca plătitor de impozite și obținem CIF-ul fiscal.',
      icon: Calculator,
    },
    {
      step: 5,
      title: 'Predare & Suport',
      description: 'Primești toate documentele și acces la platforma noastră pentru gestionare.',
      icon: Award,
    },
  ];

  const advantages = [
    {
      icon: Zap,
      title: 'Procesare Rapidă',
      description: 'Înființare în doar 5 zile lucrătoare pentru SRL standard.',
    },
    {
      icon: Shield,
      title: 'Garanție 100%',
      description: 'Returnăm integral taxele dacă dosarul este respins din vina noastră.',
    },
    {
      icon: HeadphonesIcon,
      title: 'Suport Dedicat',
      description: 'Consultant personal pe tot parcursul procesului de înregistrare.',
    },
    {
      icon: Globe,
      title: 'Totul Online',
      description: 'Proces complet digital, fără deplasări la ghișee sau notariat.',
    },
    {
      icon: Calculator,
      title: 'Prețuri Transparente',
      description: 'Fără costuri ascunse. Taxe de stat incluse în pachetele complete.',
    },
    {
      icon: Star,
      title: '2000+ Firme Înregistrate',
      description: 'Experiență dovedită cu mii de afaceri lansate cu succes.',
    },
  ];

  const faqs = [
    {
      question: 'Cât durează înregistrarea unei firme?',
      answer: 'Durata variază în funcție de tipul firmei: PFA 3-7 zile, SRL 5-15 zile, SA 15-20 zile. Cu pachetele noastre Premium, procesul poate fi accelerat semnificativ.',
    },
    {
      question: 'Ce documente sunt necesare?',
      answer: 'Pentru SRL: copie CI asociați, dovadă sediu social (contract închiriere/comodat), specimen semnătură, rezervare denumire ONRC. Pregătim toate documentele pentru tine.',
    },
    {
      question: 'Pot înființa firmă fără sediu social?',
      answer: 'Da, oferim servicii de sediu social virtual la adrese premium din București și alte orașe mari. Prețuri de la 50 EUR/lună.',
    },
    {
      question: 'Care este capitalul social minim?',
      answer: 'Pentru SRL capitalul minim este 1 RON (de la 1 ianuarie 2021). Pentru SA este 90.000 RON. PFA și II nu necesită capital social.',
    },
    {
      question: 'Oferiți și servicii de contabilitate după înființare?',
      answer: 'Da! DocumentIulia.ro oferă servicii complete de contabilitate cu AI, declarații fiscale, salarizare și raportare ANAF. Primii 3 ani cu discount 20%.',
    },
  ];

  const stats = [
    { value: '2000+', label: 'Firme înregistrate' },
    { value: '98%', label: 'Rată de succes' },
    { value: '5 zile', label: 'Timp mediu SRL' },
    { value: '4.9/5', label: 'Rating clienți' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl opacity-20"></div>

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="w-4 h-4 text-yellow-400" />
              Servicii Profesionale de Înființare Firme
            </span>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Înființează-ți Afacerea în România
            </h1>
            <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">
              SRL, PFA, SA, ONG - Toate formele juridice. Proces rapid, complet online,
              cu suport expert și garanție de succes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#tipuri"
                className="bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
              >
                Vezi Opțiunile <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="border-2 border-white/50 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" /> Consultare Gratuită
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl md:text-4xl font-bold">{stat.value}</div>
                <div className="text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Types */}
      <section id="tipuri" className="py-20 px-4 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Alege Forma Juridică Potrivită</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Fiecare tip de firmă are avantaje specifice. Consultanții noștri te ajută să alegi varianta optimă pentru afacerea ta.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {businessTypes.slice(0, 3).map((type) => (
              <div
                key={type.id}
                className={`relative bg-white rounded-2xl shadow-sm p-6 border-2 transition-all duration-300 hover:shadow-xl cursor-pointer ${
                  selectedType === type.id ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-100 hover:border-primary-300'
                } ${type.popular ? 'ring-2 ring-primary-500' : ''}`}
                onClick={() => setSelectedType(type.id)}
              >
                {type.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3" /> Cel mai popular
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
                    <type.icon className="w-7 h-7 text-primary-600" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600">€{type.startPrice}</div>
                    <div className="text-xs text-gray-500">de la</div>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-1">{type.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{type.fullName}</p>
                <p className="text-gray-600 text-sm mb-4">{type.description}</p>

                <div className="flex gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {type.timeline}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calculator className="w-4 h-4" /> {type.capital}
                  </span>
                </div>

                <ul className="space-y-2 mb-6">
                  {type.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={type.href}
                  className="block w-full text-center py-3 rounded-xl font-semibold transition bg-primary-600 text-white hover:bg-primary-700"
                >
                  Vezi Detalii <ChevronRight className="w-4 h-4 inline" />
                </Link>
              </div>
            ))}
          </div>

          {/* Other Types */}
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {businessTypes.slice(3).map((type) => (
              <div
                key={type.id}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:border-primary-300 transition flex items-center gap-6"
              >
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <type.icon className="w-7 h-7 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{type.name} - {type.fullName}</h3>
                  <p className="text-sm text-gray-600 mb-2">{type.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-primary-600 font-semibold">De la €{type.startPrice}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">{type.timeline}</span>
                  </div>
                </div>
                <Link
                  href={type.href}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                >
                  Detalii
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Cum Funcționează</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Proces simplu în 5 pași. Noi ne ocupăm de toată birocrația.
            </p>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-primary-200 -translate-y-1/2"></div>

            <div className="grid lg:grid-cols-5 gap-8">
              {processSteps.map((step, index) => (
                <div key={step.step} className="relative text-center">
                  <div className="relative z-10 w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                    <step.icon className="w-7 h-7" />
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm -mt-2">
                    {step.step}
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">De Ce Să Ne Alegi</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Experiență, profesionalism și tehnologie pentru o înființare fără griji
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advantages.map((adv) => (
              <div key={adv.title} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <adv.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-semibold mb-2">{adv.title}</h3>
                <p className="text-gray-600 text-sm">{adv.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Întrebări Frecvente</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pregătit să Îți Lansezi Afacerea?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Consultare gratuită cu experții noștri. Te ajutăm să alegi forma juridică potrivită și te ghidăm în fiecare pas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/services/infiintare-srl"
              className="bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
            >
              <Building2 className="w-5 h-5" /> Înființează SRL
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" /> Contactează-ne
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm opacity-80">
            <a href="tel:+40700000000" className="flex items-center gap-2 hover:opacity-100">
              <Phone className="w-4 h-4" /> +40 700 000 000
            </a>
            <a href="mailto:contact@documentiulia.ro" className="flex items-center gap-2 hover:opacity-100">
              <Mail className="w-4 h-4" /> contact@documentiulia.ro
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
