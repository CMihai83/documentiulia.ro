'use client';

/**
 * Courses Page - Learning Enchantment Academy
 *
 * 24 Full Courses with lessons covering:
 * - Fiscalitate 2026 (dividende 16%, TVA 21%/11%)
 * - e-Factura & SAF-T compliance
 * - HR & Recrutare (ATS, wellness, performance)
 * - EU Funds (PNRR, DIH4Society, InvestEU)
 * - GenAI & Automatizare (OCR, LLM, Prophet)
 * - Contabilitate generală & PFA
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout, MobileNav } from '@/components/layout';
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Play,
  Search,
  GraduationCap,
  Award,
  TrendingUp,
  Filter,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  isFree: boolean;
}

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  instructor: string;
  instructorTitle: string;
  duration: string;
  lessons: CourseLesson[];
  students: number;
  rating: number;
  reviews: number;
  level: 'Începător' | 'Intermediar' | 'Avansat';
  isFree: boolean;
  price?: string;
  category: string;
  tags: string[];
  isNew?: boolean;
  isBestseller?: boolean;
  hasVR?: boolean;
}

// 24 Full Courses with Lessons - Learning Enchantment Spell
const seededCourses: Course[] = [
  // FISCALITATE 2026 (6 courses)
  {
    id: '1',
    slug: 'dividende-16-procent-2026',
    title: 'Impozit Dividende 16% - Ghid Complet 2026',
    description: 'Pregătește-te pentru noua rată de impozitare a dividendelor din ianuarie 2026. Strategii de optimizare, implicații SRL și studii de caz practice.',
    instructor: 'Prof. Dr. Maria Popescu',
    instructorTitle: 'Expert Fiscalitate, CECCAR',
    duration: '4h 30min',
    lessons: [
      { id: '1-1', title: 'Introducere: Ce se schimbă în 2026', duration: '15 min', isFree: true },
      { id: '1-2', title: 'Cadrul legal: OUG și modificări Cod Fiscal', duration: '25 min', isFree: true },
      { id: '1-3', title: 'Calcul impozit dividende: Exemple practice', duration: '30 min', isFree: false },
      { id: '1-4', title: 'Strategii de optimizare fiscală legale', duration: '35 min', isFree: false },
      { id: '1-5', title: 'Impactul asupra SRL-urilor mici', duration: '25 min', isFree: false },
      { id: '1-6', title: 'Dividende vs Salariu: Analiză comparativă', duration: '30 min', isFree: false },
      { id: '1-7', title: 'Studiu de caz: Microîntreprindere', duration: '25 min', isFree: false },
      { id: '1-8', title: 'Declarații și termene legale', duration: '20 min', isFree: false },
    ],
    students: 2847,
    rating: 4.9,
    reviews: 312,
    level: 'Intermediar',
    isFree: false,
    price: '249 RON',
    category: 'Fiscalitate',
    tags: ['dividende', '16%', '2026', 'impozit'],
    isNew: true,
    isBestseller: true,
  },
  {
    id: '2',
    slug: 'tva-21-11-legea-141',
    title: 'TVA 21% și 11%: Implementare Legea 141',
    description: 'Cum să implementezi corect noile cote TVA din august 2025. Configurare sistem, excepții, cazuri speciale și raportare ANAF.',
    instructor: 'Andrei Ionescu, CPA',
    instructorTitle: 'Consultant Fiscal Senior',
    duration: '5h 15min',
    lessons: [
      { id: '2-1', title: 'Prezentare Legea 141/2025', duration: '20 min', isFree: true },
      { id: '2-2', title: 'TVA 21%: Când și cum se aplică', duration: '30 min', isFree: true },
      { id: '2-3', title: 'TVA 11%: Produse și servicii eligibile', duration: '25 min', isFree: false },
      { id: '2-4', title: 'Excepții și cazuri speciale', duration: '35 min', isFree: false },
      { id: '2-5', title: 'Configurare soft contabilitate', duration: '40 min', isFree: false },
      { id: '2-6', title: 'Facturare corectă: Exemple practice', duration: '30 min', isFree: false },
      { id: '2-7', title: 'Declarația 300: Completare corectă', duration: '25 min', isFree: false },
      { id: '2-8', title: 'Verificare și corecție erori TVA', duration: '20 min', isFree: false },
    ],
    students: 3456,
    rating: 4.8,
    reviews: 287,
    level: 'Intermediar',
    isFree: false,
    price: '199 RON',
    category: 'Fiscalitate',
    tags: ['TVA', '21%', '11%', 'Legea 141'],
    isBestseller: true,
  },
  {
    id: '3',
    slug: 'rambursare-tva-2025',
    title: 'Rambursare TVA: Procedură și Strategii',
    description: 'Tot ce trebuie să știi despre rambursarea TVA în 2025. Documente, termene, verificări ANAF și cum să eviți respingerea.',
    instructor: 'Elena Vasilescu',
    instructorTitle: 'Expert Contabil',
    duration: '3h 45min',
    lessons: [
      { id: '3-1', title: 'Când poți solicita rambursare TVA', duration: '15 min', isFree: true },
      { id: '3-2', title: 'Documente necesare pentru cerere', duration: '25 min', isFree: false },
      { id: '3-3', title: 'Completarea formularului 301', duration: '30 min', isFree: false },
      { id: '3-4', title: 'Verificări ANAF: Ce să aștepți', duration: '25 min', isFree: false },
      { id: '3-5', title: 'Erori frecvente și cum să le eviți', duration: '20 min', isFree: false },
      { id: '3-6', title: 'Contestarea respingerii', duration: '25 min', isFree: false },
    ],
    students: 1876,
    rating: 4.7,
    reviews: 156,
    level: 'Intermediar',
    isFree: false,
    price: '149 RON',
    category: 'Fiscalitate',
    tags: ['TVA', 'rambursare', 'ANAF'],
  },
  {
    id: '4',
    slug: 'impozit-profit-2026',
    title: 'Impozit pe Profit 2026: Noutăți și Strategii',
    description: 'Modificările aduse impozitului pe profit în 2026. Cheltuieli deductibile, nedeductibile și optimizare fiscală.',
    instructor: 'Prof. Dr. Maria Popescu',
    instructorTitle: 'Expert Fiscalitate, CECCAR',
    duration: '4h 00min',
    lessons: [
      { id: '4-1', title: 'Cadrul legal impozit profit 2026', duration: '20 min', isFree: true },
      { id: '4-2', title: 'Cheltuieli integral deductibile', duration: '30 min', isFree: false },
      { id: '4-3', title: 'Cheltuieli limitat deductibile', duration: '35 min', isFree: false },
      { id: '4-4', title: 'Cheltuieli nedeductibile fiscal', duration: '25 min', isFree: false },
      { id: '4-5', title: 'Calculul impozitului: Pas cu pas', duration: '30 min', isFree: false },
      { id: '4-6', title: 'Declarația 101: Completare', duration: '25 min', isFree: false },
      { id: '4-7', title: 'Strategii de optimizare legală', duration: '35 min', isFree: false },
    ],
    students: 2134,
    rating: 4.8,
    reviews: 198,
    level: 'Avansat',
    isFree: false,
    price: '199 RON',
    category: 'Fiscalitate',
    tags: ['impozit profit', '2026', 'deductibile'],
  },
  {
    id: '5',
    slug: 'microintreprinderi-2026',
    title: 'Fiscalitate Microîntreprinderi 2026',
    description: 'Ghid complet pentru microîntreprinderi în 2026. Condiții de încadrare, impozit 1%/3%, și tranziția la profit.',
    instructor: 'Dan Mureșan, CPA',
    instructorTitle: 'Consultant PMM',
    duration: '3h 30min',
    lessons: [
      { id: '5-1', title: 'Condiții încadrare microîntreprindere', duration: '20 min', isFree: true },
      { id: '5-2', title: 'Impozit 1% vs 3%: Când se aplică', duration: '25 min', isFree: true },
      { id: '5-3', title: 'Plafon venituri și depășire', duration: '20 min', isFree: false },
      { id: '5-4', title: 'Tranziția la impozit pe profit', duration: '30 min', isFree: false },
      { id: '5-5', title: 'Declarații lunare/trimestriale', duration: '25 min', isFree: false },
      { id: '5-6', title: 'Greșeli frecvente și cum să le eviți', duration: '20 min', isFree: false },
    ],
    students: 4521,
    rating: 4.9,
    reviews: 456,
    level: 'Începător',
    isFree: false,
    price: '129 RON',
    category: 'Fiscalitate',
    tags: ['microîntreprindere', '1%', '3%'],
    isBestseller: true,
  },
  {
    id: '6',
    slug: 'tratate-fiscale-uk-andorra',
    title: 'Tratate Fiscale UK/Andorra: Ghid Expați',
    description: 'Noile tratate fiscale cu UK și Andorra. Implicații pentru expați români și companii multinaționale.',
    instructor: 'Cristian Dumitrescu',
    instructorTitle: 'Avocat Fiscalitate Internațională',
    duration: '2h 45min',
    lessons: [
      { id: '6-1', title: 'Tratatul fiscal România-UK 2025', duration: '25 min', isFree: true },
      { id: '6-2', title: 'Tratatul fiscal România-Andorra', duration: '20 min', isFree: false },
      { id: '6-3', title: 'Evitarea dublei impuneri', duration: '30 min', isFree: false },
      { id: '6-4', title: 'Obligații pentru expați români', duration: '25 min', isFree: false },
      { id: '6-5', title: 'Companii cu activitate transfrontalieră', duration: '25 min', isFree: false },
    ],
    students: 876,
    rating: 4.6,
    reviews: 67,
    level: 'Avansat',
    isFree: false,
    price: '179 RON',
    category: 'Fiscalitate',
    tags: ['tratate', 'UK', 'Andorra', 'expați'],
    isNew: true,
  },

  // E-FACTURA & SAF-T (4 courses)
  {
    id: '7',
    slug: 'e-factura-b2b-2026',
    title: 'e-Factura B2B Obligatorie Mid-2026',
    description: 'Pregătește-te pentru e-Factura B2B obligatorie. Integrare SPV, validări XML, și conformitate completă.',
    instructor: 'Tech Team DocumentIulia',
    instructorTitle: 'Experți Integrări ANAF',
    duration: '5h 00min',
    lessons: [
      { id: '7-1', title: 'Introducere în e-Factura B2B', duration: '15 min', isFree: true },
      { id: '7-2', title: 'Timeline obligativitate și pregătire', duration: '20 min', isFree: true },
      { id: '7-3', title: 'Structura XML UBL 2.1', duration: '35 min', isFree: false },
      { id: '7-4', title: 'Validări ANAF și erori frecvente', duration: '30 min', isFree: false },
      { id: '7-5', title: 'Integrare SPV: Pas cu pas', duration: '40 min', isFree: false },
      { id: '7-6', title: 'Semnătură electronică calificată', duration: '25 min', isFree: false },
      { id: '7-7', title: 'Testing și go-live', duration: '30 min', isFree: false },
      { id: '7-8', title: 'Troubleshooting erori comune', duration: '25 min', isFree: false },
    ],
    students: 3214,
    rating: 4.9,
    reviews: 345,
    level: 'Intermediar',
    isFree: false,
    price: '299 RON',
    category: 'e-Factura',
    tags: ['e-Factura', 'B2B', 'SPV', 'ANAF'],
    isNew: true,
    isBestseller: true,
  },
  {
    id: '8',
    slug: 'saft-d406-pilot',
    title: 'SAF-T D406: Pregătire Pilot 2026',
    description: 'Tot ce trebuie să știi despre pilotul SAF-T D406. Structura XML, mapare date și raportare ANAF.',
    instructor: 'Andrei Ionescu, CPA',
    instructorTitle: 'Expert SAF-T',
    duration: '6h 30min',
    lessons: [
      { id: '8-1', title: 'Introducere SAF-T România', duration: '20 min', isFree: true },
      { id: '8-2', title: 'Structura fișierului XML SAF-T', duration: '40 min', isFree: true },
      { id: '8-3', title: 'Secțiunea General Ledger', duration: '35 min', isFree: false },
      { id: '8-4', title: 'Secțiunea Customers/Suppliers', duration: '30 min', isFree: false },
      { id: '8-5', title: 'Secțiunea Invoices', duration: '35 min', isFree: false },
      { id: '8-6', title: 'Secțiunea Payments', duration: '25 min', isFree: false },
      { id: '8-7', title: 'Mapare date din ERP', duration: '40 min', isFree: false },
      { id: '8-8', title: 'Validare și transmitere', duration: '30 min', isFree: false },
      { id: '8-9', title: 'Erori frecvente și soluții', duration: '25 min', isFree: false },
    ],
    students: 1567,
    rating: 4.8,
    reviews: 123,
    level: 'Avansat',
    isFree: false,
    price: '349 RON',
    category: 'SAF-T',
    tags: ['SAF-T', 'D406', 'XML', 'pilot'],
    isNew: true,
  },
  {
    id: '9',
    slug: 'e-factura-introducere',
    title: 'Introducere în e-Factura (GRATUIT)',
    description: 'Curs introductiv gratuit despre sistemul e-Factura ANAF. Ideal pentru începători.',
    instructor: 'Elena Vasilescu',
    instructorTitle: 'Expert Contabil',
    duration: '2h 00min',
    lessons: [
      { id: '9-1', title: 'Ce este e-Factura?', duration: '15 min', isFree: true },
      { id: '9-2', title: 'Cine trebuie să folosească', duration: '15 min', isFree: true },
      { id: '9-3', title: 'Înregistrare în SPV', duration: '20 min', isFree: true },
      { id: '9-4', title: 'Prima ta e-Factură', duration: '25 min', isFree: true },
      { id: '9-5', title: 'Verificare status și descărcare', duration: '20 min', isFree: true },
      { id: '9-6', title: 'Întrebări frecvente', duration: '15 min', isFree: true },
    ],
    students: 8765,
    rating: 4.7,
    reviews: 876,
    level: 'Începător',
    isFree: true,
    category: 'e-Factura',
    tags: ['e-Factura', 'gratuit', 'începător'],
    isBestseller: true,
  },
  {
    id: '10',
    slug: 'e-factura-vr',
    title: 'e-Factura VR: Curs Imersiv 3D',
    description: 'Învață e-Factura într-un mediu VR interactiv. Experiență unică de învățare cu A-Frame WebXR.',
    instructor: 'Tech Team DocumentIulia',
    instructorTitle: 'Innovation Lab',
    duration: '1h 30min',
    lessons: [
      { id: '10-1', title: 'Bun venit în VR Academy', duration: '10 min', isFree: true },
      { id: '10-2', title: 'Navigare mediu 3D', duration: '15 min', isFree: true },
      { id: '10-3', title: 'Structura e-Facturii în 3D', duration: '25 min', isFree: false },
      { id: '10-4', title: 'Simulare SPV interactivă', duration: '20 min', isFree: false },
      { id: '10-5', title: 'Quiz VR și certificare', duration: '15 min', isFree: false },
    ],
    students: 543,
    rating: 4.9,
    reviews: 45,
    level: 'Începător',
    isFree: false,
    price: '99 RON',
    category: 'e-Factura',
    tags: ['VR', 'e-Factura', '3D', 'imersiv'],
    isNew: true,
    hasVR: true,
  },

  // HR & RECRUTARE (4 courses)
  {
    id: '11',
    slug: 'ats-ai-recrutare',
    title: 'ATS cu AI: Recrutare Inteligentă',
    description: 'Implementează un sistem ATS bazat pe AI. Matching CV-uri cu 95% acuratețe folosind spaCy și NLP.',
    instructor: 'Alexandra Munteanu',
    instructorTitle: 'HR Tech Director',
    duration: '5h 45min',
    lessons: [
      { id: '11-1', title: 'Introducere în ATS și AI', duration: '20 min', isFree: true },
      { id: '11-2', title: 'Workflow recrutare automatizat', duration: '30 min', isFree: true },
      { id: '11-3', title: 'Parsare CV-uri cu NLP', duration: '40 min', isFree: false },
      { id: '11-4', title: 'Matching candidați cu joburi', duration: '35 min', isFree: false },
      { id: '11-5', title: 'Scoring și ranking automat', duration: '30 min', isFree: false },
      { id: '11-6', title: 'Integrare LinkedIn/BambooHR', duration: '35 min', isFree: false },
      { id: '11-7', title: 'Dashboard recrutare', duration: '25 min', isFree: false },
      { id: '11-8', title: 'KPIs și rapoarte', duration: '20 min', isFree: false },
    ],
    students: 1234,
    rating: 4.8,
    reviews: 98,
    level: 'Avansat',
    isFree: false,
    price: '399 RON',
    category: 'HR',
    tags: ['ATS', 'AI', 'recrutare', 'NLP'],
    isNew: true,
  },
  {
    id: '12',
    slug: 'wellness-corporate',
    title: 'Program Wellness Corporate Complet',
    description: 'Creează și implementează un program de wellness pentru compania ta. Crește productivitatea cu 40%.',
    instructor: 'Dr. Ioana Petrescu',
    instructorTitle: 'Psiholog Organizațional',
    duration: '4h 15min',
    lessons: [
      { id: '12-1', title: 'De ce wellness în 2026?', duration: '15 min', isFree: true },
      { id: '12-2', title: 'Evaluare stare wellness actuală', duration: '25 min', isFree: true },
      { id: '12-3', title: 'Design program wellness', duration: '35 min', isFree: false },
      { id: '12-4', title: 'Burnout prevention', duration: '30 min', isFree: false },
      { id: '12-5', title: 'Mental health la birou', duration: '25 min', isFree: false },
      { id: '12-6', title: 'Work-life balance', duration: '20 min', isFree: false },
      { id: '12-7', title: 'Metrici și ROI wellness', duration: '25 min', isFree: false },
    ],
    students: 876,
    rating: 4.9,
    reviews: 67,
    level: 'Intermediar',
    isFree: false,
    price: '249 RON',
    category: 'HR',
    tags: ['wellness', 'burnout', 'productivitate'],
  },
  {
    id: '13',
    slug: 'performance-reviews-2026',
    title: 'Performance Reviews: Modele și Bune Practici',
    description: 'Sisteme moderne de evaluare a performanței. OKRs, feedback 360° și development conversations.',
    instructor: 'Mihai Stanciu',
    instructorTitle: 'People Analytics Lead',
    duration: '3h 30min',
    lessons: [
      { id: '13-1', title: 'Evoluția performance management', duration: '20 min', isFree: true },
      { id: '13-2', title: 'OKRs vs KPIs: Când și cum', duration: '25 min', isFree: false },
      { id: '13-3', title: 'Feedback 360°: Implementare', duration: '30 min', isFree: false },
      { id: '13-4', title: 'Calibration sessions', duration: '25 min', isFree: false },
      { id: '13-5', title: 'Development conversations', duration: '25 min', isFree: false },
      { id: '13-6', title: 'Software și automatizare', duration: '20 min', isFree: false },
    ],
    students: 654,
    rating: 4.7,
    reviews: 54,
    level: 'Intermediar',
    isFree: false,
    price: '179 RON',
    category: 'HR',
    tags: ['performance', 'OKR', 'feedback'],
  },
  {
    id: '14',
    slug: 'absl-bss-skills-2026',
    title: 'ABSL BSS: Skills pentru 347k Jobs',
    description: 'Pregătește-te pentru piața Business Services din România. Top skills cerute și proiecții 2026.',
    instructor: 'Alexandra Munteanu',
    instructorTitle: 'HR Tech Director',
    duration: '2h 45min',
    lessons: [
      { id: '14-1', title: 'Piața BSS România 2026', duration: '20 min', isFree: true },
      { id: '14-2', title: 'Top 10 skills cerute', duration: '25 min', isFree: true },
      { id: '14-3', title: 'AI și ML în BSS', duration: '25 min', isFree: false },
      { id: '14-4', title: 'Career path în BSS', duration: '20 min', isFree: false },
      { id: '14-5', title: 'Salarii și beneficii', duration: '15 min', isFree: false },
    ],
    students: 1432,
    rating: 4.6,
    reviews: 87,
    level: 'Începător',
    isFree: false,
    price: '99 RON',
    category: 'HR',
    tags: ['ABSL', 'BSS', 'skills', 'carieră'],
  },

  // EU FUNDS (4 courses)
  {
    id: '15',
    slug: 'pnrr-eligibilitate-imm',
    title: 'PNRR €21.6B: Ghid Eligibilitate IMM',
    description: 'Cum să accesezi fondurile PNRR în 2026. Criterii de eligibilitate, documentație și aplicare.',
    instructor: 'Ana Constantinescu',
    instructorTitle: 'Consultant Fonduri EU',
    duration: '6h 00min',
    lessons: [
      { id: '15-1', title: 'Prezentare generală PNRR', duration: '25 min', isFree: true },
      { id: '15-2', title: 'Componente și bugete alocate', duration: '30 min', isFree: true },
      { id: '15-3', title: 'Criterii eligibilitate IMM', duration: '35 min', isFree: false },
      { id: '15-4', title: 'Documentație necesară', duration: '40 min', isFree: false },
      { id: '15-5', title: 'Completare cerere finanțare', duration: '45 min', isFree: false },
      { id: '15-6', title: 'Plan de afaceri pentru PNRR', duration: '35 min', isFree: false },
      { id: '15-7', title: 'Evaluare și contractare', duration: '25 min', isFree: false },
      { id: '15-8', title: 'Implementare și raportare', duration: '30 min', isFree: false },
    ],
    students: 2876,
    rating: 4.9,
    reviews: 234,
    level: 'Intermediar',
    isFree: false,
    price: '449 RON',
    category: 'Fonduri EU',
    tags: ['PNRR', 'fonduri', 'IMM', 'finanțare'],
    isBestseller: true,
  },
  {
    id: '16',
    slug: 'dih4society-vouchers',
    title: 'DIH4Society: €50k Vouchers Digitalizare',
    description: 'Aplică pentru vouchere de digitalizare DIH4Society 2026-2029. Ghid complet cu exemple.',
    instructor: 'Bogdan Enescu',
    instructorTitle: 'Expert Digitalizare',
    duration: '3h 15min',
    lessons: [
      { id: '16-1', title: 'Ce este DIH4Society?', duration: '15 min', isFree: true },
      { id: '16-2', title: 'Tipuri de vouchere disponibile', duration: '20 min', isFree: true },
      { id: '16-3', title: 'Eligibilitate și criterii', duration: '25 min', isFree: false },
      { id: '16-4', title: 'Proiecte eligibile', duration: '30 min', isFree: false },
      { id: '16-5', title: 'Aplicare pas cu pas', duration: '25 min', isFree: false },
      { id: '16-6', title: 'Raportare și decontare', duration: '20 min', isFree: false },
    ],
    students: 987,
    rating: 4.7,
    reviews: 67,
    level: 'Începător',
    isFree: false,
    price: '199 RON',
    category: 'Fonduri EU',
    tags: ['DIH4Society', 'voucher', 'digitalizare'],
    isNew: true,
  },
  {
    id: '17',
    slug: 'investeu-garantii',
    title: 'InvestEU: Garanții pentru Creditare',
    description: 'Accesează garanții InvestEU pentru creditare mai ușoară. Ideal pentru IMM-uri în expansiune.',
    instructor: 'Ana Constantinescu',
    instructorTitle: 'Consultant Fonduri EU',
    duration: '2h 30min',
    lessons: [
      { id: '17-1', title: 'Prezentare InvestEU', duration: '20 min', isFree: true },
      { id: '17-2', title: 'Tipuri de garanții', duration: '20 min', isFree: false },
      { id: '17-3', title: 'Bănci partenere în România', duration: '15 min', isFree: false },
      { id: '17-4', title: 'Proces de aplicare', duration: '25 min', isFree: false },
      { id: '17-5', title: 'Studii de caz succes', duration: '20 min', isFree: false },
    ],
    students: 543,
    rating: 4.5,
    reviews: 34,
    level: 'Intermediar',
    isFree: false,
    price: '149 RON',
    category: 'Fonduri EU',
    tags: ['InvestEU', 'garanții', 'creditare'],
  },
  {
    id: '18',
    slug: 'startup-nation-2026',
    title: 'Start-Up Nation 2026: Pregătire',
    description: 'Pregătește-te pentru următoarea ediție Start-Up Nation. Plan de afaceri, bugetare și implementare.',
    instructor: 'Bogdan Enescu',
    instructorTitle: 'Antreprenor Serial',
    duration: '4h 00min',
    lessons: [
      { id: '18-1', title: 'Istoricul Start-Up Nation', duration: '15 min', isFree: true },
      { id: '18-2', title: 'Condiții eligibilitate 2026', duration: '25 min', isFree: true },
      { id: '18-3', title: 'Scriere plan de afaceri', duration: '45 min', isFree: false },
      { id: '18-4', title: 'Bugetare corectă', duration: '30 min', isFree: false },
      { id: '18-5', title: 'Punctaj și optimizare', duration: '25 min', isFree: false },
      { id: '18-6', title: 'Post-aprobare: Implementare', duration: '20 min', isFree: false },
    ],
    students: 4321,
    rating: 4.8,
    reviews: 387,
    level: 'Începător',
    isFree: false,
    price: '199 RON',
    category: 'Fonduri EU',
    tags: ['Start-Up Nation', 'antreprenoriat', '200k'],
    isBestseller: true,
  },

  // GENAI & AUTOMATIZARE (4 courses)
  {
    id: '19',
    slug: 'ocr-layoutlmv3-documente',
    title: 'OCR cu LayoutLMv3: 99% Acuratețe',
    description: 'Automatizează procesarea documentelor cu LayoutLMv3 RO-tuned. Bonuri, facturi, extrase.',
    instructor: 'Dr. Alexandru Popa',
    instructorTitle: 'ML Engineer Lead',
    duration: '5h 30min',
    lessons: [
      { id: '19-1', title: 'Introducere în OCR modern', duration: '20 min', isFree: true },
      { id: '19-2', title: 'De ce LayoutLMv3?', duration: '25 min', isFree: true },
      { id: '19-3', title: 'Setup mediu dezvoltare', duration: '30 min', isFree: false },
      { id: '19-4', title: 'Fine-tuning pentru RO', duration: '45 min', isFree: false },
      { id: '19-5', title: 'Procesare facturi', duration: '35 min', isFree: false },
      { id: '19-6', title: 'Procesare bonuri fiscale', duration: '30 min', isFree: false },
      { id: '19-7', title: 'Integrare cu sistemul contabil', duration: '25 min', isFree: false },
      { id: '19-8', title: 'Deployment și scalare', duration: '30 min', isFree: false },
    ],
    students: 765,
    rating: 4.9,
    reviews: 56,
    level: 'Avansat',
    isFree: false,
    price: '499 RON',
    category: 'GenAI',
    tags: ['OCR', 'LayoutLMv3', 'AI', 'automatizare'],
    isNew: true,
  },
  {
    id: '20',
    slug: 'prophet-predictii-cashflow',
    title: 'Prophet: Predicții Cash-Flow',
    description: 'Folosește Prophet pentru predicții financiare. Forecast venituri, cheltuieli și cash-flow.',
    instructor: 'Dr. Alexandru Popa',
    instructorTitle: 'Data Scientist',
    duration: '4h 00min',
    lessons: [
      { id: '20-1', title: 'Introducere în Prophet', duration: '20 min', isFree: true },
      { id: '20-2', title: 'Pregătire date financiare', duration: '30 min', isFree: true },
      { id: '20-3', title: 'Model pentru venituri', duration: '35 min', isFree: false },
      { id: '20-4', title: 'Model pentru cheltuieli', duration: '30 min', isFree: false },
      { id: '20-5', title: 'Forecast cash-flow', duration: '35 min', isFree: false },
      { id: '20-6', title: 'Scenarii și what-if', duration: '25 min', isFree: false },
      { id: '20-7', title: 'Dashboard Streamlit', duration: '25 min', isFree: false },
    ],
    students: 543,
    rating: 4.8,
    reviews: 43,
    level: 'Avansat',
    isFree: false,
    price: '349 RON',
    category: 'GenAI',
    tags: ['Prophet', 'predicții', 'cash-flow', 'ML'],
  },
  {
    id: '21',
    slug: 'llama3-rag-contabilitate',
    title: 'Llama3 RAG pentru Contabilitate',
    description: 'Creează un asistent AI pentru contabilitate cu Llama3 și RAG. Întrebări fiscale, articole contabile.',
    instructor: 'Andrei Dumitrescu',
    instructorTitle: 'AI Architect',
    duration: '6h 15min',
    lessons: [
      { id: '21-1', title: 'Introducere în RAG', duration: '25 min', isFree: true },
      { id: '21-2', title: 'Setup Llama3 local', duration: '35 min', isFree: true },
      { id: '21-3', title: 'Vector database (ChromaDB)', duration: '30 min', isFree: false },
      { id: '21-4', title: 'Indexare documente contabile', duration: '40 min', isFree: false },
      { id: '21-5', title: 'Query și retrieval', duration: '35 min', isFree: false },
      { id: '21-6', title: 'Fine-tuning pentru RO', duration: '45 min', isFree: false },
      { id: '21-7', title: 'API și integrare', duration: '30 min', isFree: false },
      { id: '21-8', title: 'Deployment production', duration: '25 min', isFree: false },
    ],
    students: 432,
    rating: 4.9,
    reviews: 34,
    level: 'Avansat',
    isFree: false,
    price: '549 RON',
    category: 'GenAI',
    tags: ['Llama3', 'RAG', 'AI', 'asistent'],
    isNew: true,
  },
  {
    id: '22',
    slug: 'ro-ai-factory-intro',
    title: 'RO AI Factory: Ghid Începători',
    description: 'Descoperă RO AI Factory - infrastructura națională de AI. Acces HPC, resurse și primii pași.',
    instructor: 'Tech Team DocumentIulia',
    instructorTitle: 'AI Research',
    duration: '2h 00min',
    lessons: [
      { id: '22-1', title: 'Ce este RO AI Factory?', duration: '15 min', isFree: true },
      { id: '22-2', title: 'Resurse disponibile', duration: '20 min', isFree: true },
      { id: '22-3', title: 'Cum obții acces', duration: '20 min', isFree: true },
      { id: '22-4', title: 'Primul proiect HPC', duration: '30 min', isFree: false },
      { id: '22-5', title: 'Costuri și optimizare', duration: '20 min', isFree: false },
    ],
    students: 234,
    rating: 4.6,
    reviews: 23,
    level: 'Intermediar',
    isFree: false,
    price: '149 RON',
    category: 'GenAI',
    tags: ['RO AI Factory', 'HPC', 'AI', 'infrastructure'],
    isNew: true,
  },

  // CONTABILITATE (2 courses)
  {
    id: '23',
    slug: 'contabilitate-pfa-complet',
    title: 'Contabilitate PFA: Ghid Complet (GRATUIT)',
    description: 'Totul despre contabilitatea în partida simplă pentru PFA. Curs gratuit pentru începători.',
    instructor: 'Dan Mureșan, CPA',
    instructorTitle: 'Expert Contabil',
    duration: '3h 30min',
    lessons: [
      { id: '23-1', title: 'Ce este un PFA?', duration: '15 min', isFree: true },
      { id: '23-2', title: 'Înființare PFA pas cu pas', duration: '25 min', isFree: true },
      { id: '23-3', title: 'Partida simplă explicată', duration: '30 min', isFree: true },
      { id: '23-4', title: 'Registrul de încasări și plăți', duration: '25 min', isFree: true },
      { id: '23-5', title: 'Declarații fiscale PFA', duration: '30 min', isFree: true },
      { id: '23-6', title: 'TVA pentru PFA', duration: '25 min', isFree: true },
      { id: '23-7', title: 'CAS și CASS', duration: '20 min', isFree: true },
    ],
    students: 12543,
    rating: 4.8,
    reviews: 1234,
    level: 'Începător',
    isFree: true,
    category: 'Contabilitate',
    tags: ['PFA', 'contabilitate', 'gratuit', 'începător'],
    isBestseller: true,
  },
  {
    id: '24',
    slug: 'saga-integrare-completa',
    title: 'SAGA: Integrare Completă',
    description: 'Integrează complet SAGA cu sistemul tău. OAuth, sincronizare facturi, payroll și rapoarte.',
    instructor: 'Tech Team DocumentIulia',
    instructorTitle: 'Integration Specialists',
    duration: '4h 45min',
    lessons: [
      { id: '24-1', title: 'Introducere în SAGA REST API', duration: '20 min', isFree: true },
      { id: '24-2', title: 'Autentificare OAuth 2.0', duration: '30 min', isFree: true },
      { id: '24-3', title: 'Sincronizare clienți/furnizori', duration: '25 min', isFree: false },
      { id: '24-4', title: 'Import/export facturi', duration: '35 min', isFree: false },
      { id: '24-5', title: 'Integrare payroll', duration: '30 min', isFree: false },
      { id: '24-6', title: 'Rapoarte și dashboard', duration: '25 min', isFree: false },
      { id: '24-7', title: 'Error handling', duration: '20 min', isFree: false },
      { id: '24-8', title: 'Best practices', duration: '20 min', isFree: false },
    ],
    students: 876,
    rating: 4.7,
    reviews: 67,
    level: 'Avansat',
    isFree: false,
    price: '299 RON',
    category: 'Contabilitate',
    tags: ['SAGA', 'integrare', 'API', 'automatizare'],
  },
];

const categories = [
  { name: 'Toate', count: seededCourses.length },
  { name: 'Fiscalitate', count: seededCourses.filter(c => c.category === 'Fiscalitate').length },
  { name: 'e-Factura', count: seededCourses.filter(c => c.category === 'e-Factura').length },
  { name: 'SAF-T', count: seededCourses.filter(c => c.category === 'SAF-T').length },
  { name: 'HR', count: seededCourses.filter(c => c.category === 'HR').length },
  { name: 'Fonduri EU', count: seededCourses.filter(c => c.category === 'Fonduri EU').length },
  { name: 'GenAI', count: seededCourses.filter(c => c.category === 'GenAI').length },
  { name: 'Contabilitate', count: seededCourses.filter(c => c.category === 'Contabilitate').length },
];

const stats = [
  { label: 'Cursuri disponibile', value: '24', icon: BookOpen },
  { label: 'Studenți înscriși', value: '52k+', icon: Users },
  { label: 'Certificate emise', value: '18k+', icon: Award },
  { label: 'Rating mediu', value: '4.8', icon: Star },
];

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toate');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const filteredCourses = useMemo(() => {
    return seededCourses.filter((course) => {
      const matchesSearch = searchQuery === '' ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'Toate' || course.category === selectedCategory;
      const matchesFree = !showFreeOnly || course.isFree;
      return matchesSearch && matchesCategory && matchesFree;
    });
  }, [searchQuery, selectedCategory, showFreeOnly]);

  const visibleCourses = filteredCourses.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCourses.length;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 mb-8 text-white">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <h1 className="text-3xl font-bold">Cursuri 2026</h1>
              <span className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-sm">
                <Sparkles className="w-4 h-4" />
                24 Cursuri
              </span>
            </div>
            <p className="text-emerald-100 mb-6">
              Învață fiscalitate, e-Factura, HR, fonduri EU și GenAI cu cursuri create de experți.
              Obține certificări recunoscute și avansează în carieră.
            </p>
            <div className="flex flex-wrap gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                  <stat.icon className="w-5 h-5" />
                  <span className="font-semibold">{stat.value}</span>
                  <span className="text-emerald-100 text-sm hidden sm:inline">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Caută cursuri (ex: TVA 21%, PNRR, GenAI)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={() => setShowFreeOnly(!showFreeOnly)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
                showFreeOnly ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Doar gratuite
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition ${
                  category.name === selectedCategory
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-slate-500">
          {filteredCourses.length} cursuri găsite
          {searchQuery && ` pentru "${searchQuery}"`}
        </div>

        {/* Courses Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleCourses.map((course) => (
            <Link
              key={course.id}
              href={course.hasVR ? '/courses/efactura-vr' : `/courses/${course.slug}`}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center group-hover:bg-emerald-500 transition">
                    <Play className="w-6 h-6 text-slate-400 group-hover:text-white transition ml-1" />
                  </div>
                </div>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {course.isFree && (
                    <span className="bg-emerald-500 text-white text-xs font-medium px-2 py-1 rounded">
                      Gratuit
                    </span>
                  )}
                  {course.isNew && (
                    <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded">
                      Nou
                    </span>
                  )}
                  {course.hasVR && (
                    <span className="bg-purple-500 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> VR
                    </span>
                  )}
                </div>

                {course.isBestseller && (
                  <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-medium px-2 py-1 rounded">
                    Bestseller
                  </span>
                )}

                <span className="absolute bottom-2 right-2 bg-white/90 text-slate-700 text-xs font-medium px-2 py-1 rounded">
                  {course.level}
                </span>
              </div>

              <div className="p-4">
                <span className="text-xs font-medium text-emerald-600">{course.category}</span>
                <h3 className="font-semibold text-slate-900 mt-1 line-clamp-2 group-hover:text-emerald-600 transition">
                  {course.title}
                </h3>
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">{course.description}</p>

                <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                  <GraduationCap className="w-4 h-4" />
                  <span className="truncate">{course.instructor}</span>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {course.lessons.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-slate-900">{course.rating}</span>
                    <span className="text-xs text-slate-400">({course.reviews})</span>
                  </div>
                  {course.isFree ? (
                    <span className="text-emerald-600 font-semibold">Gratuit</span>
                  ) : (
                    <span className="text-slate-900 font-semibold">{course.price}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nu am găsit cursuri care să corespundă căutării.</p>
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setVisibleCount(prev => prev + 8)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              <TrendingUp className="w-4 h-4" />
              Încarcă mai multe ({filteredCourses.length - visibleCount} rămase)
            </button>
          </div>
        )}

        {/* CTA Banner */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold">Devino instructor</h2>
              <p className="text-blue-100 mt-2">
                Ai expertiză în contabilitate, fiscalitate sau tehnologie? Creează cursuri și ajută mii de profesioniști să învețe.
              </p>
            </div>
            <Link
              href="/become-instructor"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition whitespace-nowrap"
            >
              Aplică acum
            </Link>
          </div>
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
