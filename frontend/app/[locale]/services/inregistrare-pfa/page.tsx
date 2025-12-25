'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  User, FileText, Clock, CheckCircle, ArrowRight, Shield,
  Zap, Star, Calculator, Phone, Briefcase, ChevronDown,
  ChevronUp, TrendingUp, Wallet, BookOpen, Award, Target,
  AlertTriangle, Lightbulb, Scale
} from 'lucide-react';

export default function InregistrarePFAPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>('standard');

  const packages = [
    {
      id: 'basic',
      name: 'Basic',
      price: 99,
      timeline: '7 zile lucrătoare',
      description: 'Procedură standard pentru PFA',
      features: [
        { text: 'Cerere înregistrare ONRC', included: true },
        { text: 'Verificare documente', included: true },
        { text: 'Ghid pas cu pas', included: true },
        { text: 'Depunere dosar', included: true },
        { text: 'Consultanță CAEN', included: false },
        { text: 'Înregistrare ANAF', included: false },
        { text: 'Procesare prioritară', included: false },
      ],
      badge: null,
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 149,
      timeline: '5 zile lucrătoare',
      description: 'Include consultanță și ANAF',
      features: [
        { text: 'Cerere înregistrare ONRC', included: true },
        { text: 'Verificare documente', included: true },
        { text: 'Ghid pas cu pas', included: true },
        { text: 'Depunere dosar', included: true },
        { text: 'Consultanță CAEN personalizată', included: true },
        { text: 'Înregistrare ANAF inclusă', included: true },
        { text: 'Procesare prioritară', included: false },
      ],
      badge: 'Recomandat',
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 249,
      timeline: '3 zile lucrătoare',
      description: 'Totul inclus, prioritate maximă',
      features: [
        { text: 'Cerere înregistrare ONRC', included: true },
        { text: 'Verificare documente', included: true },
        { text: 'Ghid pas cu pas', included: true },
        { text: 'Depunere dosar', included: true },
        { text: 'Consultanță CAEN + fiscală', included: true },
        { text: 'Înregistrare ANAF inclusă', included: true },
        { text: 'Procesare prioritară', included: true },
        { text: 'Suport contabilitate 3 luni', included: true },
      ],
      badge: 'Complet',
    },
  ];

  const pfaVsSrl = [
    {
      aspect: 'Capital social',
      pfa: 'Nu este necesar',
      srl: 'Minim 1 RON',
      pfaAdvantage: true,
    },
    {
      aspect: 'Răspundere',
      pfa: 'Nelimitată (patrimoniu personal)',
      srl: 'Limitată la capital',
      pfaAdvantage: false,
    },
    {
      aspect: 'Impozitare venit',
      pfa: '10% impozit + CAS/CASS',
      srl: '1-3% micro sau 16% profit',
      pfaAdvantage: null,
    },
    {
      aspect: 'Contabilitate',
      pfa: 'Simplificată (registru încasări)',
      srl: 'Contabilitate în partidă dublă',
      pfaAdvantage: true,
    },
    {
      aspect: 'Angajați',
      pfa: 'Nu poate angaja',
      srl: 'Poate angaja nelimitat',
      pfaAdvantage: false,
    },
    {
      aspect: 'Credibilitate',
      pfa: 'Mai redusă pentru contracte mari',
      srl: 'Mai mare în afaceri',
      pfaAdvantage: false,
    },
    {
      aspect: 'Procedură înregistrare',
      pfa: 'Simplă, 3-7 zile',
      srl: 'Mai complexă, 5-15 zile',
      pfaAdvantage: true,
    },
    {
      aspect: 'Costuri înființare',
      pfa: 'De la 99 EUR',
      srl: 'De la 199 EUR',
      pfaAdvantage: true,
    },
  ];

  const idealFor = [
    {
      icon: Briefcase,
      title: 'Freelanceri',
      description: 'Programatori, designeri, copywriteri, consultanți IT',
    },
    {
      icon: BookOpen,
      title: 'Profesii Liberale',
      description: 'Traducători, formatori, antrenori personali',
    },
    {
      icon: Target,
      title: 'Activități Secundare',
      description: 'Venit suplimentar pe lângă job full-time',
    },
    {
      icon: TrendingUp,
      title: 'Start-up Validare',
      description: 'Testarea unei idei de afaceri înainte de SRL',
    },
  ];

  const taxInfo = [
    {
      title: 'Impozit pe Venit',
      rate: '10%',
      description: 'Din venitul net (venituri - cheltuieli deductibile)',
      icon: Wallet,
    },
    {
      title: 'CAS (Pensie)',
      rate: '25%',
      description: 'Obligatoriu dacă venitul > 12 salarii minime/an',
      icon: Shield,
    },
    {
      title: 'CASS (Sănătate)',
      rate: '10%',
      description: 'Obligatoriu dacă venitul > 6 salarii minime/an',
      icon: Award,
    },
  ];

  const caenExamples = [
    { code: '6201', name: 'Dezvoltare software', popular: true },
    { code: '6202', name: 'Consultanță IT', popular: true },
    { code: '7311', name: 'Agenții de publicitate', popular: true },
    { code: '7021', name: 'Consultanță în relații publice', popular: false },
    { code: '7410', name: 'Design specializat', popular: true },
    { code: '7430', name: 'Traduceri și interpretariat', popular: false },
    { code: '8559', name: 'Alte forme de învățământ', popular: false },
    { code: '9329', name: 'Alte activități recreative', popular: false },
  ];

  const faqs = [
    {
      question: 'Care este diferența dintre PFA și Întreprindere Individuală (II)?',
      answer: 'PFA și II sunt similare, dar II permite angajarea de personal (max 8 salariați). PFA nu poate angaja. Dacă planifici să lucrezi singur, PFA este alegerea optimă. Dacă vei avea nevoie de angajați, alege II sau SRL.',
    },
    {
      question: 'Pot avea PFA și fi angajat în același timp?',
      answer: 'Da, absolut! Poți avea PFA ca activitate secundară pe lângă un contract de muncă. Este legal și comun. Vei plăti impozit 10% pe veniturile din PFA, iar contribuțiile CAS/CASS sunt calculate separat.',
    },
    {
      question: 'Ce se întâmplă cu datoriile PFA?',
      answer: 'Atenție: PFA are răspundere nelimitată. Datoriile PFA pot fi recuperate din patrimoniul tău personal (bunuri, conturi, proprietăți). Pentru afaceri cu risc financiar mai mare, recomandăm SRL.',
    },
    {
      question: 'Cum aleg codul CAEN potrivit?',
      answer: 'Codul CAEN trebuie să descrie activitatea principală. Poți avea un cod principal și mai multe secundare. Important: unele activități necesită autorizații speciale. Te ajutăm să alegi corect în cadrul consultării.',
    },
    {
      question: 'Ce cheltuieli pot deduce la PFA?',
      answer: 'Poți deduce: echipamente și software pentru activitate, chirie spațiu de lucru (proporțional), utilități, telefon/internet, transport pentru clienți, cursuri și certificări, contribuții profesionale. Păstrează toate facturile!',
    },
    {
      question: 'Trebuie să mă înregistrez la TVA?',
      answer: 'TVA devine obligatorie la încasări > 300.000 RON/an. Sub acest prag, poți opta pentru înregistrare voluntară dacă ai furnizori cu TVA și vrei să deduci. Pentru freelanceri cu clienți din străinătate, adesea nu este necesară.',
    },
    {
      question: 'Pot schimba de la PFA la SRL?',
      answer: 'Da, poți transforma PFA în SRL oricând. Procedura durează 2-3 săptămâni și costă aproximativ 300-400 EUR. Multe afaceri încep ca PFA pentru validare și trec la SRL când cresc.',
    },
    {
      question: 'Care sunt obligațiile contabile ale PFA?',
      answer: 'PFA în sistem real ține registru de încasări și plăți + registru inventar. Declarații anuale: D200 (venit realizat), D212 (estimare an următor). Plăți trimestriale pentru impozit și contribuții.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-green-700 via-green-600 to-teal-700 text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="max-w-6xl mx-auto relative">
          <Link href="/services/business-formation" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 text-sm">
            <ArrowRight className="w-4 h-4 rotate-180" /> Înapoi la Servicii
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                <User className="w-4 h-4" /> Înregistrare PFA
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Înregistrează PFA în România
              </h1>
              <p className="text-xl opacity-90 mb-8">
                Persoană Fizică Autorizată - ideal pentru freelanceri și activități independente.
                Procedură simplă, de la €99, în doar 3-7 zile.
              </p>

              <div className="flex flex-wrap gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">3-7 zile</div>
                    <div className="text-sm opacity-80">Timp înregistrare</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Fără capital</div>
                    <div className="text-sm opacity-80">0 RON necesar</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">10%</div>
                    <div className="text-sm opacity-80">Impozit pe venit</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#pachete"
                  className="bg-white text-green-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
                >
                  Vezi Pachetele <ArrowRight className="w-5 h-5" />
                </a>
                <a
                  href="tel:+40700000000"
                  className="border-2 border-white/50 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" /> Consultare Gratuită
                </a>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h3 className="font-semibold mb-4 text-lg">Ideal Pentru:</h3>
                <div className="grid grid-cols-2 gap-4">
                  {idealFor.map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm opacity-80">{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tax Info */}
      <section className="py-12 px-4 bg-white border-b">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {taxInfo.map((tax) => (
              <div key={tax.title} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <tax.icon className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{tax.rate}</div>
                  <div className="font-medium">{tax.title}</div>
                  <div className="text-sm text-gray-500">{tax.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="pachete" className="py-20 px-4 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pachete Înregistrare PFA</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Toate pachetele includ taxele de stat. Procesare rapidă garantată.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative bg-white rounded-2xl shadow-lg p-8 border-2 transition-all duration-300 cursor-pointer ${
                  selectedPackage === pkg.id
                    ? 'border-green-500 ring-4 ring-green-100 scale-105'
                    : 'border-gray-100 hover:border-green-300'
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                {pkg.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3" /> {pkg.badge}
                  </div>
                )}

                <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{pkg.description}</p>

                <div className="mb-4">
                  <span className="text-4xl font-bold text-green-600">€{pkg.price}</span>
                  <span className="text-gray-400"> tot inclus</span>
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
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Comandă Acum
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PFA vs SRL Comparison */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">PFA vs SRL - Comparație</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Nu ești sigur ce să alegi? Iată diferențele principale.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left font-semibold">Aspect</th>
                  <th className="px-6 py-4 text-center font-semibold text-green-600">
                    <div className="flex items-center justify-center gap-2">
                      <User className="w-5 h-5" /> PFA
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-blue-600">
                    <div className="flex items-center justify-center gap-2">
                      <Scale className="w-5 h-5" /> SRL
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pfaVsSrl.map((row, index) => (
                  <tr key={row.aspect} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 font-medium">{row.aspect}</td>
                    <td className={`px-6 py-4 text-center ${row.pfaAdvantage === true ? 'bg-green-50 text-green-700' : ''}`}>
                      {row.pfa}
                      {row.pfaAdvantage === true && <CheckCircle className="w-4 h-4 inline ml-2" />}
                    </td>
                    <td className={`px-6 py-4 text-center ${row.pfaAdvantage === false ? 'bg-blue-50 text-blue-700' : ''}`}>
                      {row.srl}
                      {row.pfaAdvantage === false && <CheckCircle className="w-4 h-4 inline ml-2" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 p-6 bg-yellow-50 rounded-xl border border-yellow-200">
            <div className="flex items-start gap-4">
              <Lightbulb className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2">Recomandarea Noastră</h4>
                <p className="text-yellow-700">
                  Alege <strong>PFA</strong> dacă ești freelancer, lucrezi singur și vrei proceduri simple.
                  Alege <strong>SRL</strong> dacă planifici să angajezi, ai contracte mari sau vrei răspundere limitată.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAEN Examples */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Coduri CAEN Populare pentru PFA</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Exemple de activități frecvent înregistrate. Te ajutăm să alegi codul potrivit.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {caenExamples.map((caen) => (
              <div
                key={caen.code}
                className={`p-4 rounded-xl border ${
                  caen.popular
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="font-mono text-lg font-bold text-gray-800">{caen.code}</div>
                <div className="text-sm text-gray-600">{caen.name}</div>
                {caen.popular && (
                  <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Popular
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Warning */}
      <section className="py-12 px-4 bg-red-50 border-y border-red-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Important: Răspundere Nelimitată</h3>
              <p className="text-red-700">
                PFA implică răspundere nelimitată cu patrimoniul personal. Datoriile comerciale pot afecta bunurile personale
                (casă, mașină, economii). Pentru activități cu risc financiar, recomandăm SRL cu răspundere limitată.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Întrebări Frecvente PFA</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-100 transition"
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
      <section className="py-20 px-4 bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <User className="w-12 h-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Începe ca Freelancer Autorizat
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Înregistrare PFA rapidă și simplă. Completează formularul și te contactăm în maxim 2 ore.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-white text-green-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
            >
              Înregistrează PFA <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/services/infiintare-srl"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition"
            >
              Sau vezi opțiunea SRL
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
