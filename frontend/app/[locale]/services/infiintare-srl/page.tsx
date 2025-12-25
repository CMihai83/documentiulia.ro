'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2, FileText, Clock, CheckCircle, ArrowRight, Shield,
  Zap, Star, Award, Calculator, Phone, Mail, MessageCircle,
  Users, MapPin, Briefcase, FileCheck, AlertCircle, ChevronDown,
  ChevronUp, HelpCircle, Download, CreditCard, Sparkles
} from 'lucide-react';

export default function InfiintareSRLPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>('standard');

  const packages = [
    {
      id: 'basic',
      name: 'Basic',
      price: 199,
      timeline: '15 zile lucrătoare',
      description: 'Pentru cei care vor să economisească și au timp',
      color: 'gray',
      features: [
        { text: 'Act constitutiv standard', included: true },
        { text: 'Rezervare denumire ONRC', included: true },
        { text: 'Ghid pas cu pas', included: true },
        { text: 'Verificare documente', included: true },
        { text: 'Depunere dosar ONRC', included: true },
        { text: 'Consultanță telefonică', included: false },
        { text: 'Sediu social virtual', included: false },
        { text: 'Înregistrare ANAF', included: false },
        { text: 'Procesare prioritară', included: false },
      ],
      badge: null,
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 299,
      timeline: '10 zile lucrătoare',
      description: 'Cel mai popular - raport calitate/preț excelent',
      color: 'primary',
      features: [
        { text: 'Act constitutiv personalizat', included: true },
        { text: 'Rezervare denumire ONRC', included: true },
        { text: 'Ghid pas cu pas', included: true },
        { text: 'Verificare documente', included: true },
        { text: 'Depunere dosar ONRC', included: true },
        { text: 'Consultanță telefonică', included: true },
        { text: 'Înregistrare ANAF inclusă', included: true },
        { text: 'Sediu social virtual', included: false },
        { text: 'Procesare prioritară', included: false },
      ],
      badge: 'Cel mai popular',
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 499,
      timeline: '5 zile lucrătoare',
      description: 'Totul inclus, fără griji, prioritate maximă',
      color: 'yellow',
      features: [
        { text: 'Act constitutiv personalizat', included: true },
        { text: 'Rezervare denumire ONRC', included: true },
        { text: 'Ghid pas cu pas', included: true },
        { text: 'Verificare documente', included: true },
        { text: 'Depunere dosar ONRC', included: true },
        { text: 'Consultanță telefonică nelimitată', included: true },
        { text: 'Înregistrare ANAF inclusă', included: true },
        { text: 'Sediu social virtual 3 luni', included: true },
        { text: 'Procesare prioritară', included: true },
        { text: 'Reprezentare la notar inclusă', included: true },
        { text: 'Stampilă firmă inclusă', included: true },
      ],
      badge: 'Complet',
    },
  ];

  const documents = [
    {
      name: 'Copie CI/Pașaport',
      description: 'Pentru toți asociații și administratorul',
      icon: Users,
      required: true,
    },
    {
      name: 'Dovadă Sediu Social',
      description: 'Contract de închiriere, comodat sau proprietate',
      icon: MapPin,
      required: true,
    },
    {
      name: 'Rezervare Denumire',
      description: 'Obținută de la ONRC (ne ocupăm noi)',
      icon: FileText,
      required: true,
    },
    {
      name: 'Specimen Semnătură',
      description: 'Pentru administrator, la notar',
      icon: FileCheck,
      required: true,
    },
    {
      name: 'Declarații pe Proprie Răspundere',
      description: 'Conform cerințelor legale',
      icon: FileText,
      required: true,
    },
    {
      name: 'Dovada Vărsământ Capital',
      description: 'Extras cont sau declarație (minim 1 RON)',
      icon: CreditCard,
      required: true,
    },
  ];

  const timeline = [
    { day: '1', title: 'Rezervare Denumire', description: 'Depunem cererea la ONRC pentru numele firmei' },
    { day: '2-3', title: 'Pregătire Documente', description: 'Redactăm actul constitutiv și pregătim dosarul' },
    { day: '3-4', title: 'Semnare Notar', description: 'Programare și autentificare documente' },
    { day: '4-5', title: 'Depunere ONRC', description: 'Depunem dosarul complet la registru' },
    { day: '5-10', title: 'Înregistrare', description: 'ONRC procesează și emite certificatul' },
    { day: '10-15', title: 'Finalizare', description: 'Primești CUI și toate documentele firmei' },
  ];

  const faqs = [
    {
      question: 'Care este capitalul social minim pentru SRL?',
      answer: 'Din 1 ianuarie 2021, capitalul social minim pentru SRL este de 1 RON. Nu mai este obligatoriu capitalul de 200 RON. Poți alege orice sumă, dar recomandăm un capital proporțional cu activitatea planificată pentru credibilitate în fața partenerilor.',
    },
    {
      question: 'Pot fi asociat unic la SRL?',
      answer: 'Da, poți fi asociat unic într-un SRL (SRL-D). Însă atenție: o persoană fizică poate fi asociat unic într-un singur SRL la un moment dat. Dacă vrei mai multe firme, ai nevoie de cel puțin 2 asociați în fiecare.',
    },
    {
      question: 'Ce taxe plătesc după înființare?',
      answer: 'Depinde de regimul fiscal ales: 1) Microîntreprindere: 1% din venituri (dacă ai angajați) sau 3% (fără angajați). 2) Impozit pe profit: 16% din profit. TVA: obligatoriu peste 300.000 RON/an sau opțional. Contribuții sociale pentru salariați.',
    },
    {
      question: 'Pot schimba sediul social după înființare?',
      answer: 'Da, sediul social poate fi schimbat oricând prin modificare act constitutiv. Costul este de aproximativ 150-200 EUR pentru procedură. Oferim și servicii de sediu social virtual dacă nu ai un spațiu propriu.',
    },
    {
      question: 'Cât durează înregistrarea la ANAF?',
      answer: 'Înregistrarea fiscală la ANAF durează 3-5 zile după obținerea certificatului ONRC. În pachetele Standard și Premium, ne ocupăm noi de această procedură. Primești CIF-ul și poți începe activitatea.',
    },
    {
      question: 'Ce se întâmplă dacă dosarul este respins?',
      answer: 'În cazul rar în care dosarul este respins din vina noastră, returnăm integral taxele de servicii și re-depunem gratuit. Pentru respingeri din cauze obiective (ex: denumire interzisă), te ajutăm să corectezi și re-depunem la cost redus.',
    },
    {
      question: 'Pot adăuga coduri CAEN după înființare?',
      answer: 'Da, poți adăuga oricâte coduri CAEN secundare fără costuri suplimentare la ONRC. Doar codul CAEN principal necesită modificare act constitutiv (aprox. 100-150 EUR). Te sfătuim să incluzi de la început toate activitățile planificate.',
    },
    {
      question: 'Oferiți servicii pentru cetățeni străini?',
      answer: 'Da, cetățenii UE și non-UE pot înființa SRL în România. Pentru non-UE poate fi necesară viză sau permis de ședere. Oferim consultanță specializată pentru antreprenori străini, inclusiv traduceri autorizate.',
    },
  ];

  const addons = [
    { name: 'Sediu Social Virtual', price: '50 EUR/lună', description: 'Adresă premium în București' },
    { name: 'Servicii Contabilitate', price: 'de la 100 EUR/lună', description: 'Contabilitate completă cu AI' },
    { name: 'Marcă înregistrată OSIM', price: '350 EUR', description: 'Protejează-ți brandul' },
    { name: 'Website Firmă', price: 'de la 500 EUR', description: 'Site profesional one-page' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-primary-700 text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="max-w-6xl mx-auto relative">
          <Link href="/services/business-formation" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 text-sm">
            <ArrowRight className="w-4 h-4 rotate-180" /> Înapoi la Servicii
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Building2 className="w-4 h-4" /> Înființare SRL
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Înființează SRL în România
              </h1>
              <p className="text-xl opacity-90 mb-8">
                Societate cu Răspundere Limitată - cea mai populară formă juridică.
                Proces complet online, de la €199, în doar 5-15 zile.
              </p>

              <div className="flex flex-wrap gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">5-15 zile</div>
                    <div className="text-sm opacity-80">Timp înregistrare</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">1 RON</div>
                    <div className="text-sm opacity-80">Capital minim</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">100%</div>
                    <div className="text-sm opacity-80">Garanție succes</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#pachete"
                  className="bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
                >
                  Vezi Pachetele <ArrowRight className="w-5 h-5" />
                </a>
                <a
                  href="tel:+40700000000"
                  className="border-2 border-white/50 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" /> Sună Acum
                </a>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h3 className="font-semibold mb-4 text-lg">Ce Primești:</h3>
                <ul className="space-y-3">
                  {[
                    'Certificat constatator ONRC',
                    'Act constitutiv autentificat',
                    'CUI - Cod Unic de Identificare',
                    'Înregistrare fiscală ANAF',
                    'Coduri CAEN activate',
                    'Consultanță primii 30 zile gratuit',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="pachete" className="py-20 px-4 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Alege Pachetul Potrivit</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Toate pachetele includ taxele de stat ONRC. Fără costuri ascunse.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative bg-white rounded-2xl shadow-lg p-8 border-2 transition-all duration-300 cursor-pointer ${
                  selectedPackage === pkg.id
                    ? 'border-primary-500 ring-4 ring-primary-100 scale-105'
                    : 'border-gray-100 hover:border-primary-300'
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                {pkg.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3" /> {pkg.badge}
                  </div>
                )}

                <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{pkg.description}</p>

                <div className="mb-4">
                  <span className="text-4xl font-bold text-primary-600">€{pkg.price}</span>
                  <span className="text-gray-400"> + taxe stat</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6 pb-6 border-b">
                  <Clock className="w-4 h-4" />
                  <span>{pkg.timeline}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-3">
                      {feature.included ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-200 rounded-full flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>{feature.text}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/contact"
                  className={`block w-full text-center py-4 rounded-xl font-semibold transition ${
                    selectedPackage === pkg.id
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Comandă Acum
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            <Shield className="w-4 h-4 inline mr-1" />
            Garanție 100% - Returnăm banii dacă dosarul este respins din vina noastră
          </p>
        </div>
      </section>

      {/* Documents Required */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Documente Necesare</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Pregătește aceste documente și noi ne ocupăm de restul
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div key={doc.name} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <doc.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{doc.name}</h3>
                    <p className="text-sm text-gray-600">{doc.description}</p>
                    {doc.required && (
                      <span className="inline-block mt-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                        Obligatoriu
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition"
            >
              <Download className="w-5 h-5" /> Descarcă Lista Completă
            </Link>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Etapele Procesului</h2>
            <p className="text-gray-600">Pachet Standard - 10 zile lucrătoare</p>
          </div>

          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-primary-200"></div>

            <div className="space-y-6">
              {timeline.map((step, index) => (
                <div key={step.day} className="relative flex gap-6">
                  <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold z-10 flex-shrink-0">
                    {step.day}
                  </div>
                  <div className="flex-1 bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Servicii Adiționale</h2>
            <p className="text-gray-600">Completează pachetul cu servicii extra</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {addons.map((addon) => (
              <div key={addon.name} className="bg-gray-50 rounded-xl p-6 border border-gray-100 hover:border-primary-300 transition">
                <h3 className="font-semibold mb-2">{addon.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{addon.description}</p>
                <div className="text-primary-600 font-semibold">{addon.price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Întrebări Frecvente SRL</h2>
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
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-primary-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Începe-ți Afacerea Astăzi
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Procesul este simplu. Completează formularul și te contactăm în maxim 2 ore.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
            >
              Începe Acum <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="tel:+40700000000"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" /> +40 700 000 000
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
