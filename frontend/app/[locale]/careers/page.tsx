'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Briefcase,
  MapPin,
  Clock,
  Users,
  Zap,
  Heart,
  Coffee,
  Laptop,
  GraduationCap,
  PartyPopper,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle,
  Building2,
  Globe,
  Rocket,
  Star,
} from 'lucide-react';

interface JobPosition {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  description: string;
  requirements: string[];
  benefits: string[];
}

const jobPositions: JobPosition[] = [
  {
    id: 'senior-fullstack',
    title: 'Senior Full-Stack Developer',
    department: 'Engineering',
    location: 'București / Remote',
    type: 'Full-time',
    experience: '5+ ani',
    description: 'Căutăm un developer senior care să contribuie la dezvoltarea platformei noastre de contabilitate cu AI.',
    requirements: [
      'Experiență solidă cu Next.js, React și TypeScript',
      'Cunoștințe de NestJS sau alt framework Node.js',
      'Experiență cu baze de date PostgreSQL',
      'Familiaritate cu Docker și CI/CD',
      'Bonus: experiență cu AI/ML sau fintech',
    ],
    benefits: [
      'Salariu competitiv + equity',
      'Work from anywhere',
      'Budget de dezvoltare profesională',
      'Echipament de lucru la alegere',
    ],
  },
  {
    id: 'ml-engineer',
    title: 'Machine Learning Engineer',
    department: 'AI Team',
    location: 'București / Remote',
    type: 'Full-time',
    experience: '3+ ani',
    description: 'Dezvoltă și optimizează modele de AI pentru OCR, predicții financiare și automatizări.',
    requirements: [
      'Experiență cu Python și framework-uri ML (PyTorch, TensorFlow)',
      'Cunoștințe de Computer Vision și NLP',
      'Experiență cu deployment modele ML în producție',
      'Familiaritate cu MLOps și experiment tracking',
      'Bonus: experiență cu LayoutLM sau modele document understanding',
    ],
    benefits: [
      'Acces la GPU cluster pentru research',
      'Timp alocat pentru proiecte personale',
      'Participare la conferințe',
      'Salariu competitiv',
    ],
  },
  {
    id: 'product-manager',
    title: 'Product Manager',
    department: 'Product',
    location: 'București',
    type: 'Full-time',
    experience: '4+ ani',
    description: 'Coordonează dezvoltarea produsului, colaborând cu echipele de engineering, design și business.',
    requirements: [
      'Experiență în product management B2B SaaS',
      'Abilități excelente de comunicare',
      'Experiență cu metodologii Agile/Scrum',
      'Capacitate de analiză date și metrici',
      'Bonus: background în fintech sau contabilitate',
    ],
    benefits: [
      'Rol cheie în definirea produsului',
      'Colaborare directă cu fondatorii',
      'Stock options',
      'Program flexibil',
    ],
  },
  {
    id: 'customer-success',
    title: 'Customer Success Manager',
    department: 'Customer Success',
    location: 'București / Remote',
    type: 'Full-time',
    experience: '2+ ani',
    description: 'Asigură succesul clienților noștri, oferind suport și training pentru platforma DocumentIulia.',
    requirements: [
      'Experiență în customer success sau suport B2B',
      'Cunoștințe de contabilitate de bază',
      'Abilități excelente de comunicare în română și engleză',
      'Empatie și răbdare în lucrul cu clienții',
      'Bonus: experiență cu software de contabilitate',
    ],
    benefits: [
      'Training și certificări plătite',
      'Comisioane din upsell',
      'Program flexibil',
      'Oportunități de creștere',
    ],
  },
  {
    id: 'ux-designer',
    title: 'UX/UI Designer',
    department: 'Design',
    location: 'București / Remote',
    type: 'Full-time',
    experience: '3+ ani',
    description: 'Creează experiențe intuitive pentru platforma noastră, simplificând contabilitatea pentru utilizatori.',
    requirements: [
      'Portfolio cu proiecte B2B SaaS',
      'Experiență cu Figma și design systems',
      'Abilități de user research și testing',
      'Cunoștințe de accesibilitate web',
      'Bonus: experiență cu aplicații fintech',
    ],
    benefits: [
      'Libertate creativă',
      'Colaborare strânsă cu product și engineering',
      'Tools și licențe plătite',
      'Work from anywhere',
    ],
  },
];

const benefits = [
  { icon: Laptop, title: 'Remote-First', description: 'Lucrezi de oriunde, cu flexibilitate totală' },
  { icon: Coffee, title: 'Office Modern', description: 'Birou în centrul Bucureștiului cu toate facilitățile' },
  { icon: GraduationCap, title: 'Learning Budget', description: '2000€/an pentru cursuri și conferințe' },
  { icon: Heart, title: 'Asigurare Medicală', description: 'Pachet medical privat pentru tine și familie' },
  { icon: PartyPopper, title: 'Team Events', description: 'Team buildings, hackathons și petreceri' },
  { icon: Zap, title: 'Echipament Top', description: 'MacBook Pro și orice ai nevoie pentru job' },
];

const values = [
  { icon: Rocket, title: 'Ownership', description: 'Îți asumi responsabilitatea și livrezi rezultate' },
  { icon: Users, title: 'Colaborare', description: 'Lucrăm împreună pentru succesul echipei' },
  { icon: Star, title: 'Excelență', description: 'Urmărim calitatea în tot ce facem' },
  { icon: Globe, title: 'Impact', description: 'Construim ceva care contează pentru afacerile românești' },
];

export default function CareersPage() {
  const t = useTranslations();
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const departments = ['all', ...new Set(jobPositions.map(job => job.department))];
  const filteredJobs = selectedDepartment === 'all'
    ? jobPositions
    : jobPositions.filter(job => job.department === selectedDepartment);

  const toggleJob = (jobId: string) => {
    setExpandedJob(expandedJob === jobId ? null : jobId);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <span className="inline-block bg-white/20 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Rocket className="w-4 h-4 inline mr-2" />
            Suntem în creștere!
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Construiește viitorul contabilității
          </h1>
          <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto mb-8">
            Alătură-te unei echipe pasionate care transformă modul în care afacerile românești
            gestionează finanțele.
          </p>
          <a
            href="#positions"
            className="inline-flex items-center bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition"
          >
            Vezi pozițiile deschise <ArrowRight className="ml-2 w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 bg-gray-50 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">25+</div>
              <div className="text-gray-500 text-sm">Membri în echipă</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">5</div>
              <div className="text-gray-500 text-sm">Poziții deschise</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">100%</div>
              <div className="text-gray-500 text-sm">Remote-friendly</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">4.9★</div>
              <div className="text-gray-500 text-sm">Rating angajați</div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Cultura Noastră
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Valorile care ne ghidează
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Beneficii
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ce oferim
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Investim în echipa noastră pentru că știm că oamenii fericiți construiesc produse excepționale.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition flex gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="positions" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Briefcase className="w-4 h-4 inline mr-2" />
              Poziții Deschise
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Alătură-te echipei
            </h2>
          </div>

          {/* Department Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedDepartment === dept
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {dept === 'all' ? 'Toate' : dept}
              </button>
            ))}
          </div>

          {/* Job Listings */}
          <div className="space-y-4">
            {filteredJobs.map(job => (
              <div
                key={job.id}
                className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition"
              >
                <button
                  onClick={() => toggleJob(job.id)}
                  className="w-full p-6 text-left flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{job.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" /> {job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {job.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" /> {job.experience}
                      </span>
                    </div>
                  </div>
                  {expandedJob === job.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedJob === job.id && (
                  <div className="px-6 pb-6 border-t">
                    <div className="pt-4">
                      <p className="text-gray-600 mb-6">{job.description}</p>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Cerințe</h4>
                          <ul className="space-y-2">
                            {job.requirements.map((req, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Beneficii</h4>
                          <ul className="space-y-2">
                            {job.benefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row gap-4">
                        <Link
                          href={`/contact?subject=Aplicare: ${job.title}`}
                          className="inline-flex items-center justify-center bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
                        >
                          Aplică acum <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                        <span className="text-sm text-gray-500 flex items-center">
                          sau trimite CV la <a href="mailto:careers@documentiulia.ro" className="text-primary-600 ml-1">careers@documentiulia.ro</a>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Nu există poziții deschise în acest departament momentan.
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Nu vezi poziția potrivită?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Suntem mereu în căutare de oameni talentați. Trimite-ne CV-ul și te vom contacta
            când apare o oportunitate potrivită.
          </p>
          <a
            href="mailto:careers@documentiulia.ro"
            className="inline-flex items-center bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition"
          >
            Trimite CV-ul tău <ArrowRight className="ml-2 w-5 h-5" />
          </a>
        </div>
      </section>
    </div>
  );
}
