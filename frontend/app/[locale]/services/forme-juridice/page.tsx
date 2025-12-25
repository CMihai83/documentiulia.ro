'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building, TrendingUp, Users, Heart, Scale, Briefcase,
  Clock, CheckCircle, ArrowRight, Shield, Star, Calculator,
  Phone, ChevronDown, ChevronUp, FileText, Globe, Award,
  Landmark, HandHeart, Factory, Coins
} from 'lucide-react';

export default function FormeJuridicePage() {
  const [expandedForm, setExpandedForm] = useState<string | null>('sa');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const legalForms = [
    {
      id: 'sa',
      name: 'SA',
      fullName: 'Societate pe Acțiuni',
      icon: TrendingUp,
      color: 'blue',
      price: 799,
      timeline: '20 zile',
      capital: '90.000 RON minim',
      description: 'Pentru afaceri mari cu investitori multipli. Permite listare la bursă și atragere de capital prin emisiune de acțiuni.',
      ideal: ['Companii mari', 'Start-up-uri cu investitori', 'Firme cu planuri de IPO', 'Holdinguri'],
      features: [
        'Minim 2 acționari',
        'Capital 90.000 RON (25.000 EUR echivalent)',
        'Acțiuni nominative sau la purtător',
        'Consiliu de administrație obligatoriu',
        'Posibilitate listare BVB',
        'Audit financiar obligatoriu',
        'Răspundere limitată la aport',
        'Transfer ușor de acțiuni',
      ],
      documents: [
        'Act constitutiv autentificat',
        'Dovadă capital (minim 30% vărsat)',
        'Certificat de depozitar',
        'CV administratori',
        'Rezervare denumire',
      ],
      requirements: [
        'Minim 2 fondatori (persoane fizice sau juridice)',
        'Capital social minim 90.000 RON',
        'Valoare nominală acțiune: minim 0.1 RON',
        'Consiliu de administrație: 3-5 membri',
      ],
    },
    {
      id: 'snc',
      name: 'SNC',
      fullName: 'Societate în Nume Colectiv',
      icon: Users,
      color: 'green',
      price: 249,
      timeline: '10 zile',
      capital: 'Fără minim',
      description: 'Formă juridică pentru parteneriate bazate pe încredere. Toți asociații răspund solidar și nelimitat.',
      ideal: ['Cabinete profesionale', 'Parteneriate mici', 'Afaceri de familie', 'Firme tradiționale'],
      features: [
        'Minim 2 asociați',
        'Fără capital minim',
        'Răspundere solidară și nelimitată',
        'Toți asociații sunt administratori',
        'Cesiune părți sociale dificilă',
        'Dizolvare la retragere asociat',
        'Relații bazate pe încredere',
        'Fără audit obligatoriu',
      ],
      documents: [
        'Act constitutiv',
        'Copii CI asociați',
        'Dovadă sediu',
        'Specimen semnături',
        'Declarații asociați',
      ],
      requirements: [
        'Minim 2 asociați persoane fizice',
        'Nu se pot transforma în SRL/SA',
        'Denumirea trebuie să conțină "SNC"',
        'Toți asociații trebuie să fie de acord pentru decizii majore',
      ],
    },
    {
      id: 'scs',
      name: 'SCS',
      fullName: 'Societate în Comandită Simplă',
      icon: Scale,
      color: 'purple',
      price: 299,
      timeline: '12 zile',
      capital: 'Fără minim',
      description: 'Combină doi tipuri de asociați: comanditați (răspundere nelimitată, administrează) și comanditari (răspundere limitată).',
      ideal: ['Investitori pasivi + manageri activi', 'Family office', 'Parteneriate mixte', 'Structuri holding'],
      features: [
        'Două categorii de asociați',
        'Comanditați: răspund nelimitat, administrează',
        'Comanditari: răspund doar cu aportul',
        'Fără capital minim',
        'Flexibilitate în structură',
        'Comanditarii nu pot fi administratori',
        'Profitul se împarte conform act constitutiv',
        'Rar utilizată în practică',
      ],
      documents: [
        'Act constitutiv specificând tipul asociaților',
        'Copii CI toți asociații',
        'Dovadă sediu',
        'Specimen semnături comanditați',
        'Declarații pe proprie răspundere',
      ],
      requirements: [
        'Minim 1 comanditat + 1 comanditar',
        'Comanditații trebuie să aibă capacitate comercială',
        'Comanditarii nu pot fi administratori',
        'Denumirea conține "SCS"',
      ],
    },
    {
      id: 'sca',
      name: 'SCA',
      fullName: 'Societate în Comandită pe Acțiuni',
      icon: Coins,
      color: 'yellow',
      price: 899,
      timeline: '25 zile',
      capital: '90.000 RON minim',
      description: 'Formă hibridă între SCS și SA. Comanditații administrează, comanditarii dețin acțiuni.',
      ideal: ['Structuri complexe de investiții', 'Private equity', 'Fonduri de investiții', 'Joint ventures'],
      features: [
        'Comanditați: răspund nelimitat',
        'Comanditari: acționari, răspund limitat',
        'Capital minim 90.000 RON',
        'Acțiuni transferabile',
        'Structură complexă de guvernanță',
        'Rar utilizată',
        'Reglementată ca SA pentru comanditari',
        'Flexibilitate în atragerea capitalului',
      ],
      documents: [
        'Act constitutiv complex',
        'Dovadă capital 90.000 RON',
        'CV comanditați',
        'Registru acționari',
        'Rezervare denumire',
      ],
      requirements: [
        'Capital minim 90.000 RON',
        'Minim 1 comanditat + 1 comanditar',
        'Acțiuni cu valoare nominală min 0.1 RON',
        'Structură de guvernanță SA',
      ],
    },
    {
      id: 'ii',
      name: 'II',
      fullName: 'Întreprindere Individuală',
      icon: Briefcase,
      color: 'orange',
      price: 129,
      timeline: '5 zile',
      capital: 'Fără capital',
      description: 'Similar cu PFA dar permite angajarea de personal. Răspundere nelimitată cu patrimoniul personal.',
      ideal: ['Freelanceri cu nevoie de angajați', 'Meșteșugari', 'Activități artizanale', 'Servicii locale'],
      features: [
        'Poate angaja maxim 8 salariați',
        'Fără capital social',
        'Răspundere nelimitată',
        'Contabilitate simplificată',
        'Impozit pe venit 10%',
        'Procedură simplă înregistrare',
        'Nu poate avea asociați',
        'Poate deveni SRL ulterior',
      ],
      documents: [
        'Cerere înregistrare',
        'Copie CI',
        'Dovadă sediu profesional',
        'Declarație activitate',
        'Cazier judiciar (unele domenii)',
      ],
      requirements: [
        'Persoană fizică rezident RO/UE',
        'Vârstă minimă 18 ani',
        'Capacitate deplină de exercițiu',
        'Să nu fie incompatibil legal',
      ],
    },
    {
      id: 'ong',
      name: 'ONG',
      fullName: 'Asociație sau Fundație',
      icon: Heart,
      color: 'red',
      price: 349,
      timeline: '15-20 zile',
      capital: 'Patrimoniu inițial',
      description: 'Pentru activități non-profit, sociale, culturale, sportive sau de caritate. Poate obține scutiri fiscale.',
      ideal: ['Organizații sociale', 'Cluburi sportive', 'Fundații culturale', 'ONG-uri ecologiste'],
      features: [
        'Scop non-profit obligatoriu',
        'Poate desfășura activități economice auxiliare',
        'Scutiri fiscale disponibile',
        'Poate primi donații și sponsorizări',
        'Poate solicita utilitate publică',
        'Structură: AGA + Consiliu Director',
        'Minimum 3 membri fondatori (asociație)',
        'Patrimoniu inițial necesar',
      ],
      documents: [
        'Statut și act constitutiv',
        'Lista membrilor fondatori',
        'Dovadă sediu',
        'Dovadă patrimoniu inițial',
        'Procesul verbal al adunării constitutive',
      ],
      requirements: [
        'Asociație: min 3 persoane',
        'Fundație: patrimoniu min 100 salarii minime',
        'Scop social/cultural/educativ',
        'Nu distribuie profit membrilor',
      ],
    },
    {
      id: 'fundatie',
      name: 'Fundație',
      fullName: 'Fundație',
      icon: Landmark,
      color: 'indigo',
      price: 449,
      timeline: '20 zile',
      capital: '100 salarii minime',
      description: 'Persoană juridică non-profit bazată pe un patrimoniu destinat scopului statutar. Mai stabilă decât asociația.',
      ideal: ['Inițiative filantropice', 'Burse studiu', 'Cercetare științifică', 'Protecția patrimoniului'],
      features: [
        'Bazată pe patrimoniu, nu pe membri',
        'Patrimoniu minim: 100 salarii minime brute',
        'Nu are membri, doar fondatori',
        'Scop permanent și stabil',
        'Consiliu director obligatoriu',
        'Cenzor/auditor obligatoriu',
        'Poate avea statut de utilitate publică',
        'Patrimoniul nu poate fi distribuit',
      ],
      documents: [
        'Act de înființare autentificat',
        'Statutul fundației',
        'Dovadă patrimoniu inițial',
        'Lista membrilor consiliului director',
        'Rezervare denumire',
      ],
      requirements: [
        'Poate fi înființată de 1 sau mai multe persoane',
        'Patrimoniu minim 100 salarii minime (~335.000 RON)',
        'Consiliu director minim 3 membri',
        'Activitate non-profit exclusivă',
      ],
    },
  ];

  const faqs = [
    {
      question: 'Care formă juridică oferă cea mai bună protecție a patrimoniului personal?',
      answer: 'SRL și SA oferă răspundere limitată la capitalul social. În schimb, PFA, II, SNC și comanditații din SCS/SCA răspund cu tot patrimoniul personal. Pentru protecție maximă, alege SRL (pentru afaceri mici/medii) sau SA (pentru afaceri mari).',
    },
    {
      question: 'Ce formă juridică recomandați pentru un start-up tech?',
      answer: 'Pentru start-up-uri tech recomandăm SRL la început (procedură simplă, costuri mici). Când atrageți investitori sau planificați exit/IPO, puteți transforma în SA. Multe start-up-uri folosesc SRL-D (asociat unic) în faza inițială.',
    },
    {
      question: 'Pot transforma o formă juridică în alta?',
      answer: 'Da, majoritatea transformărilor sunt posibile: PFA/II → SRL, SRL → SA. Procesul durează 2-4 săptămâni și costă 200-500 EUR. Unele transformări (ex: SNC → SRL) sunt mai complexe. SRL nu poate deveni PFA.',
    },
    {
      question: 'Ce formă juridică pentru activități caritabile?',
      answer: 'Pentru activități non-profit, alege Asociație (minim 3 fondatori, patrimoniu modest) sau Fundație (1+ fondatori, patrimoniu mare). Ambele pot obține statut de utilitate publică și scutiri fiscale. ONG-urile pot primi donații și sponsorizări.',
    },
    {
      question: 'Care sunt costurile anuale de mentenanță pentru fiecare formă?',
      answer: 'PFA/II: ~500-1000 EUR/an (contabilitate simplificată). SRL: ~1000-3000 EUR/an (contabilitate, declarații). SA: ~5000-15000 EUR/an (contabilitate, audit, raportări). ONG: ~500-2000 EUR/an (depinde de dimensiune).',
    },
    {
      question: 'Ce formă juridică pentru e-commerce internațional?',
      answer: 'SRL este ideal pentru e-commerce: răspundere limitată, poate opera internațional, înregistrare TVA pentru export UE, poate avea multiple magazine online. Pentru scale mare sau investitori, consideră SA.',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; text: string; light: string; border: string } } = {
      blue: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
      green: { bg: 'bg-green-600', text: 'text-green-600', light: 'bg-green-50', border: 'border-green-200' },
      purple: { bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50', border: 'border-purple-200' },
      yellow: { bg: 'bg-yellow-600', text: 'text-yellow-600', light: 'bg-yellow-50', border: 'border-yellow-200' },
      orange: { bg: 'bg-orange-600', text: 'text-orange-600', light: 'bg-orange-50', border: 'border-orange-200' },
      red: { bg: 'bg-red-600', text: 'text-red-600', light: 'bg-red-50', border: 'border-red-200' },
      indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="max-w-6xl mx-auto relative">
          <Link href="/services/business-formation" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 text-sm">
            <ArrowRight className="w-4 h-4 rotate-180" /> Înapoi la Servicii
          </Link>

          <div className="text-center">
            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Scale className="w-4 h-4" /> Toate Formele Juridice
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Forme Juridice în România
            </h1>
            <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">
              SA, SNC, SCS, ONG, Fundație, Întreprindere Individuală și altele.
              Consultanță gratuită pentru a alege forma potrivită afacerii tale.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#forme"
                className="bg-white text-purple-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
              >
                Explorează Opțiunile <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="tel:+40700000000"
                className="border-2 border-white/50 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" /> Consultare Gratuită
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Comparison */}
      <section className="py-12 px-4 bg-white border-b">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-lg font-semibold mb-6 text-gray-700">Comparație Rapidă</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {legalForms.map((form) => {
              const colors = getColorClasses(form.color);
              return (
                <a
                  key={form.id}
                  href={`#${form.id}`}
                  className={`text-center p-4 rounded-xl border-2 hover:shadow-md transition ${colors.light} ${colors.border}`}
                >
                  <form.icon className={`w-8 h-8 mx-auto mb-2 ${colors.text}`} />
                  <div className="font-bold">{form.name}</div>
                  <div className="text-xs text-gray-500">€{form.price}</div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Legal Forms Details */}
      <section id="forme" className="py-20 px-4 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Toate Formele Juridice Detaliate</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Click pe fiecare formă pentru detalii complete
            </p>
          </div>

          <div className="space-y-6">
            {legalForms.map((form) => {
              const colors = getColorClasses(form.color);
              const isExpanded = expandedForm === form.id;

              return (
                <div
                  key={form.id}
                  id={form.id}
                  className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden scroll-mt-24 ${
                    isExpanded ? colors.border : 'border-gray-100'
                  }`}
                >
                  <button
                    onClick={() => setExpandedForm(isExpanded ? null : form.id)}
                    className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${colors.light}`}>
                        <form.icon className={`w-7 h-7 ${colors.text}`} />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold">{form.name} - {form.fullName}</h3>
                        <p className="text-gray-500 text-sm">{form.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden md:block text-right">
                        <div className={`text-2xl font-bold ${colors.text}`}>€{form.price}</div>
                        <div className="text-sm text-gray-400">{form.timeline}</div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 border-t">
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 pt-6">
                        {/* Features */}
                        <div>
                          <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <CheckCircle className={`w-5 h-5 ${colors.text}`} /> Caracteristici
                          </h4>
                          <ul className="space-y-2">
                            {form.features.map((feature) => (
                              <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Ideal For */}
                        <div>
                          <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Star className={`w-5 h-5 ${colors.text}`} /> Ideal Pentru
                          </h4>
                          <div className="space-y-2">
                            {form.ideal.map((item) => (
                              <div key={item} className={`px-3 py-2 rounded-lg text-sm ${colors.light}`}>
                                {item}
                              </div>
                            ))}
                          </div>

                          <h4 className="font-semibold mt-6 mb-4 flex items-center gap-2">
                            <FileText className={`w-5 h-5 ${colors.text}`} /> Documente Necesare
                          </h4>
                          <ul className="space-y-1">
                            {form.documents.map((doc) => (
                              <li key={doc} className="text-sm text-gray-600">• {doc}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Requirements & CTA */}
                        <div>
                          <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Shield className={`w-5 h-5 ${colors.text}`} /> Cerințe
                          </h4>
                          <ul className="space-y-2 mb-6">
                            {form.requirements.map((req) => (
                              <li key={req} className="flex items-start gap-2 text-sm text-gray-600">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors.bg}`}></div>
                                {req}
                              </li>
                            ))}
                          </ul>

                          <div className={`p-4 rounded-xl ${colors.light} mb-4`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-600">Preț de la:</span>
                              <span className={`text-2xl font-bold ${colors.text}`}>€{form.price}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-600">Timp:</span>
                              <span className="font-medium">{form.timeline}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Capital:</span>
                              <span className="font-medium">{form.capital}</span>
                            </div>
                          </div>

                          <Link
                            href="/contact"
                            className={`block w-full text-center py-3 rounded-xl font-semibold text-white ${colors.bg} hover:opacity-90 transition`}
                          >
                            Solicită Ofertă
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tabel Comparativ</h2>
            <p className="text-gray-600">Toate formele juridice într-o privire</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left font-semibold">Formă</th>
                  <th className="px-4 py-3 text-center font-semibold">Capital Min</th>
                  <th className="px-4 py-3 text-center font-semibold">Răspundere</th>
                  <th className="px-4 py-3 text-center font-semibold">Nr. Asociați</th>
                  <th className="px-4 py-3 text-center font-semibold">Preț</th>
                  <th className="px-4 py-3 text-center font-semibold">Timp</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-blue-50">
                  <td className="px-4 py-3 font-medium">SRL</td>
                  <td className="px-4 py-3 text-center">1 RON</td>
                  <td className="px-4 py-3 text-center text-green-600">Limitată</td>
                  <td className="px-4 py-3 text-center">1-50</td>
                  <td className="px-4 py-3 text-center font-semibold">€199</td>
                  <td className="px-4 py-3 text-center">5-15 zile</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">SA</td>
                  <td className="px-4 py-3 text-center">90.000 RON</td>
                  <td className="px-4 py-3 text-center text-green-600">Limitată</td>
                  <td className="px-4 py-3 text-center">2+</td>
                  <td className="px-4 py-3 text-center font-semibold">€799</td>
                  <td className="px-4 py-3 text-center">20 zile</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="px-4 py-3 font-medium">PFA</td>
                  <td className="px-4 py-3 text-center">-</td>
                  <td className="px-4 py-3 text-center text-red-600">Nelimitată</td>
                  <td className="px-4 py-3 text-center">1</td>
                  <td className="px-4 py-3 text-center font-semibold">€99</td>
                  <td className="px-4 py-3 text-center">3-7 zile</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">II</td>
                  <td className="px-4 py-3 text-center">-</td>
                  <td className="px-4 py-3 text-center text-red-600">Nelimitată</td>
                  <td className="px-4 py-3 text-center">1</td>
                  <td className="px-4 py-3 text-center font-semibold">€129</td>
                  <td className="px-4 py-3 text-center">5 zile</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="px-4 py-3 font-medium">SNC</td>
                  <td className="px-4 py-3 text-center">-</td>
                  <td className="px-4 py-3 text-center text-red-600">Nelimitată</td>
                  <td className="px-4 py-3 text-center">2+</td>
                  <td className="px-4 py-3 text-center font-semibold">€249</td>
                  <td className="px-4 py-3 text-center">10 zile</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">SCS</td>
                  <td className="px-4 py-3 text-center">-</td>
                  <td className="px-4 py-3 text-center text-yellow-600">Mixtă</td>
                  <td className="px-4 py-3 text-center">2+</td>
                  <td className="px-4 py-3 text-center font-semibold">€299</td>
                  <td className="px-4 py-3 text-center">12 zile</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="px-4 py-3 font-medium">ONG</td>
                  <td className="px-4 py-3 text-center">Patrimoniu</td>
                  <td className="px-4 py-3 text-center text-green-600">Limitată</td>
                  <td className="px-4 py-3 text-center">3+</td>
                  <td className="px-4 py-3 text-center font-semibold">€349</td>
                  <td className="px-4 py-3 text-center">15-20 zile</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">Fundație</td>
                  <td className="px-4 py-3 text-center">100 sal. min</td>
                  <td className="px-4 py-3 text-center text-green-600">Limitată</td>
                  <td className="px-4 py-3 text-center">1+</td>
                  <td className="px-4 py-3 text-center font-semibold">€449</td>
                  <td className="px-4 py-3 text-center">20 zile</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Întrebări Frecvente</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition"
                >
                  <span className="font-semibold pr-4">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-6 text-gray-600">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Scale className="w-12 h-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Nu Ești Sigur Ce Să Alegi?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Consultanții noștri te ajută gratuit să alegi forma juridică potrivită afacerii tale.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-white text-purple-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
            >
              Consultare Gratuită <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/services/infiintare-srl"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition"
            >
              Sau vezi SRL (cel mai popular)
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
