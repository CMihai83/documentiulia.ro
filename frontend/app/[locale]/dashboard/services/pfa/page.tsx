'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Euro,
  Shield,
  Star,
  Phone,
  Mail,
  HelpCircle,
  CreditCard,
  Briefcase,
  Calculator,
  TrendingUp,
  AlertCircle
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
    price: 99,
    timeline: '7 zile lucrătoare',
    features: [
      'Cerere înregistrare PFA',
      'Declarație pe proprie răspundere',
      'Ghid complet CAEN',
      'Suport email',
      'Șabloane documente'
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 149,
    timeline: '5 zile lucrătoare',
    features: [
      'Tot ce include Basic',
      'Verificare documente',
      'Consultanță cod CAEN',
      'Suport telefonic',
      'Înregistrare ANAF',
      'Alegere sistem impozitare'
    ],
    recommended: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 249,
    timeline: '3 zile lucrătoare',
    features: [
      'Tot ce include Standard',
      'Procesare prioritară',
      'Înregistrare TVA opțional',
      'Consultanță fiscală 30 min',
      'Suport WhatsApp dedicat',
      'Deschidere cont bancar',
      'Planificare fiscală'
    ]
  }
];

const taxOptions = [
  {
    name: 'Impozit pe Venit (10%)',
    description: 'Plătești 10% din venitul net. Recomandat pentru venituri mari cu cheltuieli mici.',
    pros: ['Simplitate în calcul', 'Previzibilitate'],
    cons: ['Poate fi mai scump pentru marja mică']
  },
  {
    name: 'Normă de Venit',
    description: 'Impozit fix anual bazat pe activitate și localitate. Ideal pentru profesii liberale.',
    pros: ['Impozit fix cunoscut', 'Nu depinde de venit real'],
    cons: ['Nu toate activitățile sunt eligibile']
  },
  {
    name: 'Impozit pe Venit Real',
    description: 'Plătești 10% din diferența venituri - cheltuieli. Bun pentru activități cu costuri mari.',
    pros: ['Deduci cheltuielile', 'Optim pentru marja mică'],
    cons: ['Contabilitate mai complexă']
  }
];

const comparisons = [
  { feature: 'Răspundere', pfa: 'Nelimitată (patrimoniu personal)', srl: 'Limitată la capital social' },
  { feature: 'Capital minim', pfa: '0 RON', srl: '1 RON' },
  { feature: 'Angajați', pfa: 'Nu poate angaja', srl: 'Fără limită' },
  { feature: 'Impozit profit', pfa: '10% venit', srl: '1% sau 16%' },
  { feature: 'Dividende', pfa: 'N/A', srl: '8% impozit' },
  { feature: 'CAS/CASS', pfa: 'Obligatoriu', srl: 'Doar pe salariu' },
  { feature: 'Contabilitate', pfa: 'Simplă', srl: 'În partidă dublă' },
  { feature: 'TVA', pfa: 'Opțional', srl: 'Opțional' }
];

const faqs = [
  {
    q: 'Care este diferența între PFA și SRL?',
    a: 'PFA-ul are răspundere nelimitată (răspunzi cu averea personală) dar contabilitate simplificată. SRL-ul protejează patrimoniul personal dar necesită contabilitate în partidă dublă.'
  },
  {
    q: 'Pot transforma PFA în SRL?',
    a: 'Da, poți oricând transforma PFA-ul într-un SRL. Te ajutăm cu tot procesul de conversie.'
  },
  {
    q: 'Ce contribuții plătesc la PFA?',
    a: 'CAS (25%) și CASS (10%) calculate la venitul realizat, cu plafoane minime și maxime stabilite anual.'
  },
  {
    q: 'Pot avea PFA și să fiu angajat?',
    a: 'Da, poți desfășura activitate ca PFA în paralel cu un contract de muncă, cu condiția să nu fie activități concurente.'
  },
  {
    q: 'Când trebuie să mă înregistrez la TVA?',
    a: 'Obligatoriu când depășești plafonul de 300.000 RON/an. Opțional te poți înregistra oricând.'
  }
];

const popularActivities = [
  { code: '6201', name: 'Activități de realizare a software-ului la comandă', icon: '💻' },
  { code: '7022', name: 'Activități de consultanță pentru afaceri și management', icon: '📊' },
  { code: '7410', name: 'Activități de design specializat', icon: '🎨' },
  { code: '7311', name: 'Activități ale agențiilor de publicitate', icon: '📢' },
  { code: '6910', name: 'Activități juridice', icon: '⚖️' },
  { code: '8559', name: 'Alte forme de învățământ', icon: '📚' },
  { code: '9002', name: 'Activități suport pentru interpretare artistică', icon: '🎭' },
  { code: '7420', name: 'Activități fotografice', icon: '📷' }
];

export default function PFARegistrationPage() {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<string>('standard');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    cnp: '',
    mainActivity: '',
    taxSystem: 'income',
    hasOtherJob: 'no'
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
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Înregistrare PFA</h1>
            <p className="text-green-100 text-lg mb-4">
              Persoană Fizică Autorizată - ideal pentru freelanceri, consultanți și profesioniști independenți.
              Contabilitate simplificată și flexibilitate maximă.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Clock className="w-4 h-4" /> 3-7 zile
              </span>
              <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Euro className="w-4 h-4" /> de la €99
              </span>
              <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Calculator className="w-4 h-4" /> Contabilitate simplă
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PFA vs SRL Comparison Toggle */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-900">Nu ești sigur între PFA și SRL?</span>
          </div>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="text-sm font-medium text-amber-700 hover:text-amber-900"
          >
            {showComparison ? 'Ascunde comparație' : 'Vezi comparație'}
          </button>
        </div>

        {showComparison && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="text-left py-2 text-amber-900">Caracteristică</th>
                  <th className="text-center py-2 text-green-700">PFA</th>
                  <th className="text-center py-2 text-blue-700">SRL</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, index) => (
                  <tr key={index} className="border-b border-amber-100">
                    <td className="py-2 font-medium text-gray-900">{row.feature}</td>
                    <td className="py-2 text-center text-gray-600">{row.pfa}</td>
                    <td className="py-2 text-center text-gray-600">{row.srl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Popular Activities */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Activități Populare pentru PFA</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {popularActivities.map((activity) => (
                <div
                  key={activity.code}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                  onClick={() => setFormData({...formData, mainActivity: activity.code})}
                >
                  <span className="text-2xl">{activity.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{activity.name}</p>
                    <p className="text-xs text-gray-500">CAEN {activity.code}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax Systems */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sisteme de Impozitare</h2>
            <div className="space-y-4">
              {taxOptions.map((option, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{option.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-1">Avantaje:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {option.pros.map((pro, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-700 mb-1">Dezavantaje:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {option.cons.map((con, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-red-500" />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
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
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${pkg.recommended ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  {pkg.recommended && (
                    <div className="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> Recomandat
                    </div>
                  )}
                  <h3 className="font-bold text-gray-900 text-lg">{pkg.name}</h3>
                  <p className="text-3xl font-bold text-green-600 my-2">€{pkg.price}</p>
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
            <h3 className="font-bold text-gray-900 mb-4">Începe Înregistrarea</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume complet *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="ex: Ion Popescu"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cod CAEN principal *
                </label>
                <input
                  type="text"
                  value={formData.mainActivity}
                  onChange={(e) => setFormData({...formData, mainActivity: e.target.value})}
                  placeholder="ex: 6201"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">Alege din lista de mai sus sau introdu manual</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sistem impozitare
                </label>
                <select
                  value={formData.taxSystem}
                  onChange={(e) => setFormData({...formData, taxSystem: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="income">Impozit pe venit (10%)</option>
                  <option value="norm">Normă de venit</option>
                  <option value="real">Venit real</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ești angajat în altă parte?
                </label>
                <select
                  value={formData.hasOtherJob}
                  onChange={(e) => setFormData({...formData, hasOtherJob: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="no">Nu</option>
                  <option value="yes">Da, am contract de muncă</option>
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
                <span>~€20</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total estimat</span>
                  <span>€{(packages.find(p => p.id === selectedPackage)?.price || 0) + 20}</span>
                </div>
              </div>
            </div>

            <button className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2">
              <CreditCard className="w-5 h-5" />
              Plasează Comanda
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              Garanție 100% satisfacție. Plată securizată.
            </p>

            <div className="border-t border-gray-200 mt-6 pt-6">
              <p className="text-sm font-medium text-gray-900 mb-3">Ai întrebări?</p>
              <div className="space-y-2">
                <a href="tel:+40700000000" className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600">
                  <Phone className="w-4 h-4" />
                  +40 700 000 000
                </a>
                <a href="mailto:servicii@documentiulia.ro" className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600">
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
