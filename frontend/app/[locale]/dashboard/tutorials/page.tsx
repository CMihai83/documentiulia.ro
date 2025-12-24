'use client';

import { useState } from 'react';
import {
  Play,
  Clock,
  CheckCircle,
  BookOpen,
  FileText,
  Calculator,
  Users,
  Truck,
  Shield,
  ChevronRight,
  Search,
  Filter,
  Star,
} from 'lucide-react';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  completed?: boolean;
  videoUrl?: string;
  thumbnail?: string;
}

interface TutorialCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  tutorialCount: number;
}

const categories: TutorialCategory[] = [
  {
    id: 'getting-started',
    name: 'Primii Pasi',
    icon: BookOpen,
    description: 'Introducere in platforma DocumentIulia',
    tutorialCount: 5,
  },
  {
    id: 'invoicing',
    name: 'Facturare',
    icon: FileText,
    description: 'Creare si gestionare facturi, e-Factura',
    tutorialCount: 8,
  },
  {
    id: 'vat-taxes',
    name: 'TVA & Taxe',
    icon: Calculator,
    description: 'Calcul TVA, declaratii fiscale, SAF-T D406',
    tutorialCount: 6,
  },
  {
    id: 'hr-payroll',
    name: 'HR & Salarizare',
    icon: Users,
    description: 'Gestionare angajati, pontaje, salarii',
    tutorialCount: 7,
  },
  {
    id: 'logistics',
    name: 'Logistica',
    icon: Truck,
    description: 'Flota, transport, e-Transport',
    tutorialCount: 4,
  },
  {
    id: 'compliance',
    name: 'Conformitate ANAF',
    icon: Shield,
    description: 'Ghiduri complete pentru conformitate',
    tutorialCount: 5,
  },
];

const tutorials: Tutorial[] = [
  // Getting Started
  {
    id: 'gs-1',
    title: 'Introducere in DocumentIulia',
    description: 'Afla cum sa folosesti platforma pentru prima data. Configurare initiala si navigare.',
    duration: '5:30',
    category: 'getting-started',
    difficulty: 'beginner',
    completed: true,
  },
  {
    id: 'gs-2',
    title: 'Configurarea Companiei',
    description: 'Adauga datele firmei: CUI, adresa, date bancare, certificat digital SPV.',
    duration: '7:15',
    category: 'getting-started',
    difficulty: 'beginner',
  },
  {
    id: 'gs-3',
    title: 'Dashboard-ul Principal',
    description: 'Cum sa interpretezi indicatorii financiari si sa navighezi eficient.',
    duration: '4:45',
    category: 'getting-started',
    difficulty: 'beginner',
  },
  {
    id: 'gs-4',
    title: 'Setarile Contului',
    description: 'Personalizarea notificarilor, preferintelor si securitatii contului.',
    duration: '3:20',
    category: 'getting-started',
    difficulty: 'beginner',
  },
  {
    id: 'gs-5',
    title: 'Import Date din Alte Sisteme',
    description: 'Migrarea datelor din Excel, SAGA sau alte platforme.',
    duration: '8:00',
    category: 'getting-started',
    difficulty: 'intermediate',
  },
  // Invoicing
  {
    id: 'inv-1',
    title: 'Crearea Primei Facturi',
    description: 'Pasii pentru emiterea unei facturi conforme cu legislatia romana.',
    duration: '6:00',
    category: 'invoicing',
    difficulty: 'beginner',
  },
  {
    id: 'inv-2',
    title: 'Template-uri de Facturi',
    description: 'Creeaza si personalizeaza template-uri pentru facturare rapida.',
    duration: '4:30',
    category: 'invoicing',
    difficulty: 'beginner',
  },
  {
    id: 'inv-3',
    title: 'Trimitere e-Factura ANAF',
    description: 'Ghid complet pentru transmiterea facturilor in sistemul SPV.',
    duration: '8:45',
    category: 'invoicing',
    difficulty: 'intermediate',
  },
  {
    id: 'inv-4',
    title: 'e-Factura B2B - Obligatii 2026',
    description: 'Pregatirea pentru noile cerinte e-Factura B2B din mid-2026.',
    duration: '10:00',
    category: 'invoicing',
    difficulty: 'advanced',
  },
  {
    id: 'inv-5',
    title: 'Gestionarea Clientilor',
    description: 'Adaugare parteneri, validare CUI, istoricul facturilor.',
    duration: '5:15',
    category: 'invoicing',
    difficulty: 'beginner',
  },
  {
    id: 'inv-6',
    title: 'Facturi Proforma si Avize',
    description: 'Cand si cum sa folosesti facturi proforma si avize de insotire.',
    duration: '4:00',
    category: 'invoicing',
    difficulty: 'beginner',
  },
  {
    id: 'inv-7',
    title: 'Credit Note si Stornari',
    description: 'Procedura corecta pentru anularea sau corectarea facturilor.',
    duration: '6:30',
    category: 'invoicing',
    difficulty: 'intermediate',
  },
  {
    id: 'inv-8',
    title: 'Automatizare Facturare Recurenta',
    description: 'Seteaza facturi automate pentru clienti cu abonamente.',
    duration: '5:45',
    category: 'invoicing',
    difficulty: 'intermediate',
  },
  // VAT & Taxes
  {
    id: 'vat-1',
    title: 'Calculator TVA - Noile Cote 2025',
    description: 'Utilizarea calculatorului TVA cu cotele 21%/11% conform Legii 141/2025.',
    duration: '4:00',
    category: 'vat-taxes',
    difficulty: 'beginner',
  },
  {
    id: 'vat-2',
    title: 'Declaratia D300',
    description: 'Cum sa generezi si trimiti declaratia de TVA lunar.',
    duration: '7:30',
    category: 'vat-taxes',
    difficulty: 'intermediate',
  },
  {
    id: 'vat-3',
    title: 'SAF-T D406 - Ghid Complet',
    description: 'Generarea si transmiterea declaratiei lunare SAF-T conform Ordinului 1783/2021.',
    duration: '12:00',
    category: 'vat-taxes',
    difficulty: 'advanced',
  },
  {
    id: 'vat-4',
    title: 'TVA Intracomunitar',
    description: 'Calcul TVA pentru tranzactii cu parteneri din UE.',
    duration: '8:00',
    category: 'vat-taxes',
    difficulty: 'advanced',
  },
  {
    id: 'vat-5',
    title: 'Deduceri TVA',
    description: 'Cum sa maximizezi deducerile legale de TVA.',
    duration: '6:00',
    category: 'vat-taxes',
    difficulty: 'intermediate',
  },
  {
    id: 'vat-6',
    title: 'Audit Trail si Conformitate',
    description: 'Cum sa folosesti jurnalul de audit pentru verificari ANAF.',
    duration: '5:00',
    category: 'vat-taxes',
    difficulty: 'intermediate',
  },
  // HR & Payroll
  {
    id: 'hr-1',
    title: 'Adaugarea Angajatilor',
    description: 'Cum sa creezi fisele de angajat cu toate datele necesare.',
    duration: '5:00',
    category: 'hr-payroll',
    difficulty: 'beginner',
  },
  {
    id: 'hr-2',
    title: 'Generare Contracte de Munca',
    description: 'Utilizarea generatorului automat de contracte conforme.',
    duration: '6:30',
    category: 'hr-payroll',
    difficulty: 'beginner',
  },
  {
    id: 'hr-3',
    title: 'Pontaje si Prezenta',
    description: 'Inregistrarea orelor lucrate si gestionarea prezentei.',
    duration: '4:45',
    category: 'hr-payroll',
    difficulty: 'beginner',
  },
  {
    id: 'hr-4',
    title: 'Calcul Salarial Automat',
    description: 'Cum se calculeaza CAS, CASS, impozit si net.',
    duration: '8:00',
    category: 'hr-payroll',
    difficulty: 'intermediate',
  },
  {
    id: 'hr-5',
    title: 'REVISAL - Export Date',
    description: 'Generarea fisierelor pentru declaratii ITM.',
    duration: '7:00',
    category: 'hr-payroll',
    difficulty: 'intermediate',
  },
  {
    id: 'hr-6',
    title: 'Concedii si Absente',
    description: 'Gestionarea cererilor de concediu si a absentelor.',
    duration: '5:30',
    category: 'hr-payroll',
    difficulty: 'beginner',
  },
  {
    id: 'hr-7',
    title: 'Fluturasi de Salariu',
    description: 'Generarea si distribuirea fluturilor catre angajati.',
    duration: '3:30',
    category: 'hr-payroll',
    difficulty: 'beginner',
  },
  // Logistics
  {
    id: 'log-1',
    title: 'Gestionarea Flotei',
    description: 'Adaugarea vehiculelor, monitorizare consum si revizii.',
    duration: '6:00',
    category: 'logistics',
    difficulty: 'beginner',
  },
  {
    id: 'log-2',
    title: 'e-Transport ANAF',
    description: 'Ghid pentru generarea si transmiterea documentelor e-Transport.',
    duration: '9:00',
    category: 'logistics',
    difficulty: 'advanced',
  },
  {
    id: 'log-3',
    title: 'Optimizare Rute',
    description: 'Utilizarea functiei de optimizare rute pentru reducerea costurilor.',
    duration: '5:30',
    category: 'logistics',
    difficulty: 'intermediate',
  },
  {
    id: 'log-4',
    title: 'Plati Curierat',
    description: 'Reconcilierea platilor de la serviciile de curierat.',
    duration: '4:00',
    category: 'logistics',
    difficulty: 'beginner',
  },
  // Compliance
  {
    id: 'comp-1',
    title: 'Calendar Termene ANAF',
    description: 'Cum sa nu ratezi niciodata un termen legal.',
    duration: '4:00',
    category: 'compliance',
    difficulty: 'beginner',
  },
  {
    id: 'comp-2',
    title: 'Pregatire Audit Fiscal',
    description: 'Lista de verificare pentru controale ANAF.',
    duration: '10:00',
    category: 'compliance',
    difficulty: 'advanced',
  },
  {
    id: 'comp-3',
    title: 'Certificat Digital SPV',
    description: 'Obtinerea si configurarea certificatului pentru ANAF.',
    duration: '7:00',
    category: 'compliance',
    difficulty: 'intermediate',
  },
  {
    id: 'comp-4',
    title: 'GDPR pentru Contabilitate',
    description: 'Conformitate cu protectia datelor in operatiunile contabile.',
    duration: '6:00',
    category: 'compliance',
    difficulty: 'intermediate',
  },
  {
    id: 'comp-5',
    title: 'Arhivare Documente Fiscale',
    description: 'Cerinte legale pentru pastrarea documentelor.',
    duration: '5:00',
    category: 'compliance',
    difficulty: 'beginner',
  },
];

export default function TutorialsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);

  const filteredTutorials = tutorials.filter((tutorial) => {
    const matchesCategory = !selectedCategory || tutorial.category === selectedCategory;
    const matchesSearch =
      !searchTerm ||
      tutorial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutorial.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || tutorial.difficulty === difficultyFilter;
    return matchesCategory && matchesSearch && matchesDifficulty;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'advanced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Incepator';
      case 'intermediate':
        return 'Intermediar';
      case 'advanced':
        return 'Avansat';
      default:
        return difficulty;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutoriale Video</h1>
          <p className="text-gray-600 mt-1">Invata sa folosesti platforma cu ghiduri video pas cu pas</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>1 din {tutorials.length} completat</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cauta tutoriale..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toate nivelurile</option>
              <option value="beginner">Incepator</option>
              <option value="intermediate">Intermediar</option>
              <option value="advanced">Avansat</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(isSelected ? null : category.id)}
              className={`p-4 rounded-xl border-2 text-left transition ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                  <p className="text-xs text-blue-600 mt-2">{category.tutorialCount} tutoriale</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tutorial List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">
            {selectedCategory
              ? categories.find((c) => c.id === selectedCategory)?.name
              : 'Toate Tutorialele'}
            <span className="text-gray-500 font-normal ml-2">({filteredTutorials.length})</span>
          </h2>
        </div>
        <div className="divide-y">
          {filteredTutorials.map((tutorial) => (
            <button
              key={tutorial.id}
              onClick={() => setSelectedTutorial(tutorial)}
              className="w-full p-4 text-left hover:bg-gray-50 transition flex items-center gap-4"
            >
              {/* Thumbnail placeholder */}
              <div className="w-32 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Play className="w-8 h-8 text-blue-600" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {tutorial.completed && (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                  <h3 className="font-medium text-gray-900 truncate">{tutorial.title}</h3>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{tutorial.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {tutorial.duration}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(tutorial.difficulty)}`}>
                    {getDifficultyLabel(tutorial.difficulty)}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Video Player Modal */}
      {selectedTutorial && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Video Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{selectedTutorial.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedTutorial.duration}
                  </span>
                  <span className={`px-2 py-0.5 rounded ${getDifficultyColor(selectedTutorial.difficulty)}`}>
                    {getDifficultyLabel(selectedTutorial.difficulty)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTutorial(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <span className="sr-only">Inchide</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video Placeholder */}
            <div className="aspect-video bg-gray-900 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-blue-700 transition">
                  <Play className="w-8 h-8 ml-1" />
                </div>
                <p className="text-gray-400">Tutorialul video va fi disponibil in curand</p>
                <p className="text-sm text-gray-500 mt-2">Lucram la inregistrarea continutului video</p>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 border-t">
              <p className="text-gray-600">{selectedTutorial.description}</p>
              <div className="mt-4 flex items-center gap-4">
                <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                  <Star className="w-4 h-4" />
                  Adauga la favorite
                </button>
                <button className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  Marcheaza ca completat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
