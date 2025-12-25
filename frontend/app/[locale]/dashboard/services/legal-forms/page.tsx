'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Users,
  Briefcase,
  Scale,
  Heart,
  Globe,
  CheckCircle,
  Clock,
  Euro,
  ArrowRight,
  Phone,
  Mail,
  Star,
  Shield,
  FileText
} from 'lucide-react';

interface LegalForm {
  id: string;
  name: string;
  fullName: string;
  icon: React.ReactNode;
  description: string;
  minCapital: string;
  minMembers: string;
  liability: string;
  timeline: string;
  price: number;
  features: string[];
  bestFor: string[];
  color: string;
}

const legalForms: LegalForm[] = [
  {
    id: 'sa',
    name: 'SA',
    fullName: 'Societate pe Acțiuni',
    icon: <Building2 className="w-8 h-8" />,
    description: 'Pentru companii mari cu nevoi de finanțare și transparență. Acțiuni transferabile.',
    minCapital: '90.000 RON',
    minMembers: '2 acționari',
    liability: 'Limitată la acțiuni',
    timeline: '15-20 zile',
    price: 799,
    features: [
      'Acțiuni nominative sau la purtător',
      'Posibilitate listare bursă',
      'Consiliu de administrație',
      'Audit obligatoriu',
      'Adunare generală acționari',
      'Registru acționari',
      'Transparență financiară'
    ],
    bestFor: ['Companii mari', 'Atragere investiții', 'Listare bursă', 'Proiecte de anvergură'],
    color: 'purple'
  },
  {
    id: 'snc',
    name: 'SNC',
    fullName: 'Societate în Nume Colectiv',
    icon: <Users className="w-8 h-8" />,
    description: 'Parteneriat cu răspundere solidară și nelimitată. Pentru afaceri de familie sau parteneri de încredere.',
    minCapital: '0 RON',
    minMembers: '2 asociați',
    liability: 'Solidară și nelimitată',
    timeline: '10-12 zile',
    price: 249,
    features: [
      'Fără capital minim',
      'Răspundere solidară',
      'Decizii prin consens',
      'Contabilitate simplificată',
      'Partajare profit/pierderi',
      'Administrare flexibilă'
    ],
    bestFor: ['Afaceri de familie', 'Cabinete profesionale', 'Parteneriate stabile', 'Asocieri pe termen lung'],
    color: 'blue'
  },
  {
    id: 'scs',
    name: 'SCS',
    fullName: 'Societate în Comandită Simplă',
    icon: <Briefcase className="w-8 h-8" />,
    description: 'Combinație între comanditați (răspundere nelimitată) și comanditari (răspundere limitată).',
    minCapital: '0 RON',
    minMembers: '2 (minim 1 comanditat + 1 comanditar)',
    liability: 'Mixtă',
    timeline: '10-15 zile',
    price: 299,
    features: [
      'Două tipuri de asociați',
      'Comanditați administrează',
      'Comanditari investesc',
      'Flexibilitate structurală',
      'Protecție pentru investitori',
      'Structură hibridă'
    ],
    bestFor: ['Investitori pasivi', 'Afaceri cu management separat', 'Structuri de investiții'],
    color: 'indigo'
  },
  {
    id: 'sca',
    name: 'SCA',
    fullName: 'Societate în Comandită pe Acțiuni',
    icon: <Building2 className="w-8 h-8" />,
    description: 'Similar cu SCS, dar capitalul comanditarilor este împărțit în acțiuni.',
    minCapital: '90.000 RON',
    minMembers: '2 (minim 1 comanditat + 1 comanditar)',
    liability: 'Mixtă',
    timeline: '15-20 zile',
    price: 699,
    features: [
      'Capital în acțiuni',
      'Acțiuni transferabile',
      'Structură complexă',
      'Potrivit pentru investiții mari',
      'Flexibilitate finanțare'
    ],
    bestFor: ['Proiecte mari', 'Investiții complexe', 'Management profesionist'],
    color: 'violet'
  },
  {
    id: 'ong',
    name: 'ONG / Asociație',
    fullName: 'Organizație Non-Guvernamentală',
    icon: <Heart className="w-8 h-8" />,
    description: 'Pentru activități non-profit: sociale, culturale, sportive, educaționale.',
    minCapital: '0 RON',
    minMembers: '3 membri fondatori',
    liability: 'Limitată la patrimoniu',
    timeline: '15-20 zile',
    price: 349,
    features: [
      'Scop non-profit',
      'Beneficii fiscale',
      'Posibilitate sponsorizări',
      'Donații deductibile',
      'Activități publice',
      'Transparență obligatorie'
    ],
    bestFor: ['Cauze sociale', 'Cluburi sportive', 'Asociații culturale', 'Organizații caritabile'],
    color: 'pink'
  },
  {
    id: 'fundatie',
    name: 'Fundație',
    fullName: 'Fundație',
    icon: <Scale className="w-8 h-8" />,
    description: 'Persoană juridică fără scop lucrativ, înființată pentru realizarea unui scop de interes general.',
    minCapital: '100 salarii minime brute',
    minMembers: '1 fondator',
    liability: 'Limitată la patrimoniu',
    timeline: '20-25 zile',
    price: 449,
    features: [
      'Patrimoniu afectat scopului',
      'Scop de interes general',
      'Beneficii fiscale extinse',
      'Credibilitate sporită',
      'Permanență în timp',
      'Audit public'
    ],
    bestFor: ['Cauze majore', 'Proiecte de amploare', 'Bursieri/granturi', 'Instituții educaționale'],
    color: 'teal'
  },
  {
    id: 'ii',
    name: 'Întreprindere Individuală',
    fullName: 'Întreprindere Individuală (II)',
    icon: <Briefcase className="w-8 h-8" />,
    description: 'Alternativă la PFA cu posibilitatea de a angaja personal. Activitate economică în nume propriu.',
    minCapital: '0 RON',
    minMembers: '1 titular',
    liability: 'Nelimitată',
    timeline: '5-10 zile',
    price: 129,
    features: [
      'Poate angaja până la 8 persoane',
      'Contabilitate simplificată',
      'Flexibilitate activități',
      'Rapid de înființat',
      'Fără capital minim'
    ],
    bestFor: ['Mici antreprenori', 'Meșteșugari', 'Servicii cu angajați', 'Activități locale'],
    color: 'orange'
  },
  {
    id: 'if',
    name: 'Întreprindere Familială',
    fullName: 'Întreprindere Familială (IF)',
    icon: <Users className="w-8 h-8" />,
    description: 'Afacere constituită din membri ai aceleiași familii. Până la 10 persoane din familie.',
    minCapital: '0 RON',
    minMembers: '2 membri familie',
    liability: 'Solidară familială',
    timeline: '7-10 zile',
    price: 179,
    features: [
      'Membri ai familiei',
      'Maximum 10 persoane',
      'Acorduri simple',
      'Contabilitate simplificată',
      'Fără capital minim'
    ],
    bestFor: ['Afaceri de familie', 'Ferme', 'Meserii tradiționale', 'Mici producători'],
    color: 'amber'
  }
];

export default function LegalFormsPage() {
  const router = useRouter();
  const [selectedForm, setSelectedForm] = useState<string | null>(null);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; light: string; border: string }> = {
      purple: { bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-100', border: 'border-purple-500' },
      blue: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-100', border: 'border-blue-500' },
      indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-100', border: 'border-indigo-500' },
      violet: { bg: 'bg-violet-600', text: 'text-violet-600', light: 'bg-violet-100', border: 'border-violet-500' },
      pink: { bg: 'bg-pink-600', text: 'text-pink-600', light: 'bg-pink-100', border: 'border-pink-500' },
      teal: { bg: 'bg-teal-600', text: 'text-teal-600', light: 'bg-teal-100', border: 'border-teal-500' },
      orange: { bg: 'bg-orange-600', text: 'text-orange-600', light: 'bg-orange-100', border: 'border-orange-500' },
      amber: { bg: 'bg-amber-600', text: 'text-amber-600', light: 'bg-amber-100', border: 'border-amber-500' }
    };
    return colors[color] || colors.blue;
  };

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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-8 mb-8 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold mb-2">Toate Formele Juridice</h1>
          <p className="text-indigo-100 text-lg mb-4">
            Alegerea formei juridice potrivite este crucială pentru succesul afacerii tale.
            Oferim servicii complete pentru toate tipurile de entități din România.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
              <Shield className="w-4 h-4" /> Consultanță gratuită
            </span>
            <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
              <FileText className="w-4 h-4" /> Documente complete
            </span>
            <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
              <Star className="w-4 h-4" /> Suport dedicat
            </span>
          </div>
        </div>
      </div>

      {/* Quick Comparison Table */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 overflow-x-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Comparație Rapidă</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2">Forma</th>
              <th className="text-left py-3 px-2">Capital Minim</th>
              <th className="text-left py-3 px-2">Membri</th>
              <th className="text-left py-3 px-2">Răspundere</th>
              <th className="text-right py-3 px-2">Preț</th>
              <th className="text-center py-3 px-2">Timp</th>
            </tr>
          </thead>
          <tbody>
            {legalForms.map((form) => {
              const colors = getColorClasses(form.color);
              return (
                <tr key={form.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <span className={`font-semibold ${colors.text}`}>{form.name}</span>
                  </td>
                  <td className="py-3 px-2 text-gray-600">{form.minCapital}</td>
                  <td className="py-3 px-2 text-gray-600">{form.minMembers}</td>
                  <td className="py-3 px-2 text-gray-600">{form.liability}</td>
                  <td className="py-3 px-2 text-right font-semibold">€{form.price}</td>
                  <td className="py-3 px-2 text-center text-gray-500">{form.timeline}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legal Forms Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {legalForms.map((form) => {
          const colors = getColorClasses(form.color);
          const isSelected = selectedForm === form.id;

          return (
            <div
              key={form.id}
              className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 transition cursor-pointer ${
                isSelected ? colors.border : 'border-transparent hover:border-gray-200'
              }`}
              onClick={() => setSelectedForm(isSelected ? null : form.id)}
            >
              <div className={`${colors.bg} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      {form.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{form.name}</h3>
                      <p className="text-sm opacity-80">{form.fullName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">€{form.price}</p>
                    <p className="text-xs opacity-80">{form.timeline}</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <p className="text-gray-600 text-sm mb-4">{form.description}</p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className={`${colors.light} rounded-lg p-2 text-center`}>
                    <p className="text-xs text-gray-500">Capital</p>
                    <p className={`text-xs font-semibold ${colors.text}`}>{form.minCapital}</p>
                  </div>
                  <div className={`${colors.light} rounded-lg p-2 text-center`}>
                    <p className="text-xs text-gray-500">Membri</p>
                    <p className={`text-xs font-semibold ${colors.text}`}>{form.minMembers}</p>
                  </div>
                  <div className={`${colors.light} rounded-lg p-2 text-center`}>
                    <p className="text-xs text-gray-500">Răspundere</p>
                    <p className={`text-xs font-semibold ${colors.text}`}>{form.liability}</p>
                  </div>
                </div>

                {isSelected && (
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Ce include:</h4>
                      <ul className="space-y-1">
                        {form.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Potrivit pentru:</h4>
                      <div className="flex flex-wrap gap-2">
                        {form.bestFor.map((item, i) => (
                          <span key={i} className={`${colors.light} ${colors.text} text-xs px-2 py-1 rounded-full`}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      className={`w-full py-2 ${colors.bg} text-white rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center gap-2`}
                    >
                      Solicită Ofertă
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Nu știi ce formă juridică să alegi?</h2>
        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
          Experții noștri te ajută să alegi forma juridică optimă pentru afacerea ta.
          Consultanță gratuită și fără obligații.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="tel:+40700000000" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition">
            <Phone className="w-5 h-5" />
            Sună-ne acum
          </a>
          <a href="mailto:consultanta@documentiulia.ro" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition">
            <Mail className="w-5 h-5" />
            Trimite email
          </a>
        </div>
      </div>
    </div>
  );
}
