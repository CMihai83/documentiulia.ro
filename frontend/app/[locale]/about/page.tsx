'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Users,
  Target,
  Lightbulb,
  Award,
  Shield,
  Globe,
  TrendingUp,
  Heart,
  CheckCircle,
  ArrowRight,
  Building2,
  Zap,
  BookOpen,
  Rocket,
} from 'lucide-react';

export default function AboutPage() {
  const t = useTranslations();

  const stats = [
    { value: '500+', label: 'Companii Active', icon: Building2 },
    { value: '99.2%', label: 'Acuratețe OCR', icon: Zap },
    { value: '24/7', label: 'Suport Disponibil', icon: Heart },
    { value: '100%', label: 'Conformitate ANAF', icon: Shield },
  ];

  const values = [
    {
      icon: Target,
      title: 'Misiunea Noastră',
      description: 'Să transformăm contabilitatea în România prin tehnologie AI, făcând-o accesibilă, eficientă și conformă pentru toate afacerile.',
    },
    {
      icon: Lightbulb,
      title: 'Viziunea Noastră',
      description: 'Să devenim platforma #1 de contabilitate cu AI din România, extinzându-ne apoi la nivel european și global.',
    },
    {
      icon: Heart,
      title: 'Valorile Noastre',
      description: 'Inovație, Transparență, Conformitate, Suport Excepțional și Orientare către Client în tot ce facem.',
    },
  ];

  const team = [
    {
      name: 'Maria Popescu',
      role: 'CEO & Co-Fondator',
      bio: 'Expert în fintech cu 15+ ani experiență în transformare digitală.',
      image: null,
    },
    {
      name: 'Alexandru Ionescu',
      role: 'CTO & Co-Fondator',
      bio: 'Arhitect software cu experiență în AI/ML și sisteme enterprise.',
      image: null,
    },
    {
      name: 'Elena Dumitrescu',
      role: 'CFO',
      bio: 'Expert contabil autorizat cu 20+ ani experiență în audit și fiscalitate.',
      image: null,
    },
    {
      name: 'Andrei Radu',
      role: 'Head of Product',
      bio: 'Product manager cu background în UX și startup-uri fintech.',
      image: null,
    },
  ];

  const timeline = [
    { year: '2023', title: 'Fondare', description: 'Ideea DocumentIulia s-a născut din nevoia de a simplifica contabilitatea' },
    { year: '2024', title: 'Lansare Beta', description: 'Primii 100 de utilizatori testează platforma' },
    { year: '2024', title: 'Integrare ANAF', description: 'Lansăm integrarea completă cu e-Factura și SAF-T' },
    { year: '2025', title: 'Lansare Publică', description: 'Platforma devine disponibilă pentru toate companiile' },
    { year: '2025', title: 'Expansion', description: 'Pregătim extinderea în Europa de Est' },
  ];

  const certifications = [
    { name: 'ANAF e-Factura', description: 'Operator autorizat pentru facturare electronică' },
    { name: 'GDPR Compliant', description: 'Conformitate completă cu regulamentul UE' },
    { name: 'ISO 27001', description: 'Certificare securitate informații (în curs)' },
    { name: 'SOC 2 Type II', description: 'Audit securitate și disponibilitate (în curs)' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Despre DocumentIulia
          </h1>
          <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto">
            Construim viitorul contabilității în România cu inteligență artificială
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 bg-gray-50 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-gray-500 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                Povestea Noastră
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                De la o idee la o platformă națională
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                DocumentIulia s-a născut din frustrarea unui antreprenor român care petrecea ore întregi
                gestionând documente contabile și încercând să înțeleagă cerințele ANAF în continuă schimbare.
              </p>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Am observat că majoritatea software-urilor de contabilitate din România erau învechite,
                complicate și nu foloseau tehnologiile moderne. Am decis să schimbăm asta.
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Astăzi, DocumentIulia este o platformă completă care combină OCR cu inteligență artificială,
                integrări native cu ANAF, și o interfață modernă care face contabilitatea accesibilă pentru toți.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                Începe Gratuit <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-8 lg:p-12">
              <div className="space-y-8">
                {values.map((value, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <value.icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{value.title}</h3>
                      <p className="text-gray-600 text-sm">{value.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Parcursul Nostru
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Cronologia DocumentIulia
            </h2>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-primary-200"></div>

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div key={index} className={`flex items-center gap-8 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                    <div className="bg-white p-6 rounded-xl shadow-sm inline-block">
                      <span className="text-primary-600 font-bold text-lg">{item.year}</span>
                      <h3 className="font-semibold text-gray-900 mt-1">{item.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                    </div>
                  </div>
                  <div className="w-4 h-4 bg-primary-600 rounded-full border-4 border-white shadow z-10"></div>
                  <div className="flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Echipa Noastră
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Oamenii din spatele platformei
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              O echipă pasionată de tehnologie și contabilitate, dedicată să transforme modul în care
              afacerile românești gestionează finanțele.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center group">
                <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="text-4xl font-bold text-primary-600">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">{member.name}</h3>
                <p className="text-primary-600 text-sm mb-2">{member.role}</p>
                <p className="text-gray-500 text-sm">{member.bio}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/careers"
              className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Alătură-te echipei noastre
            </Link>
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Certificări & Conformitate
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Standarde de Încredere
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm text-center hover:shadow-md transition">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{cert.name}</h3>
                <p className="text-gray-500 text-sm">{cert.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pregătit să transformi contabilitatea afacerii tale?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Alătură-te celor peste 500 de companii care folosesc deja DocumentIulia pentru a economisi
            timp și a rămâne conforme cu ANAF.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition inline-flex items-center justify-center"
            >
              Începe Gratuit <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition"
            >
              Contactează-ne
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
