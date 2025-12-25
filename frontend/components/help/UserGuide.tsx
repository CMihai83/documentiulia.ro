'use client';

import { useState } from 'react';
import {
  Book,
  ChevronRight,
  ChevronDown,
  Search,
  FileText,
  Calculator,
  Receipt,
  Users,
  Shield,
  Truck,
  Building,
  HelpCircle,
  ExternalLink,
  Play,
  CheckCircle,
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  articles: GuideArticle[];
}

interface GuideArticle {
  id: string;
  title: string;
  content: string;
  steps?: string[];
  tips?: string[];
  videoUrl?: string;
}

// User guide content for key modules
const guideSections: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Primii Pași',
    icon: Book,
    description: 'Cum să începeți cu DocumentIulia',
    articles: [
      {
        id: 'welcome',
        title: 'Bine ați venit în DocumentIulia',
        content: 'DocumentIulia este platforma completă de ERP/contabilitate cu inteligență artificială pentru afacerea dumneavoastră. Această platformă vă ajută să gestionați facturi, TVA, declarații ANAF, HR și logistică într-un singur loc.',
        steps: [
          'Conectați-vă cu contul dvs. sau creați unul nou',
          'Completați profilul companiei (CUI, adresa, date bancare)',
          'Configurați preferințele de notificare pentru termene',
          'Explorați dashboard-ul principal pentru o vedere de ansamblu',
        ],
        tips: [
          'Folosiți OCR-ul pentru a scana automat facturile primite',
          'Configurați alertele pentru termenele ANAF',
          'Integrați cu SAGA pentru sincronizare automată',
        ],
      },
      {
        id: 'dashboard',
        title: 'Utilizarea Dashboard-ului',
        content: 'Dashboard-ul principal oferă o vedere de ansamblu asupra afacerii: cash flow, TVA colectat/deductibil, termene conformitate și activitate recentă.',
        steps: [
          'Verificați graficul Cash Flow pentru tendințe',
          'Monitorizați widget-ul TVA pentru situația curentă',
          'Urmăriți termenele de conformitate ANAF',
          'Încărcați documente direct din zona de drag-and-drop',
        ],
      },
    ],
  },
  {
    id: 'invoices',
    title: 'Facturare',
    icon: Receipt,
    description: 'Gestionarea facturilor și e-Factura',
    articles: [
      {
        id: 'create-invoice',
        title: 'Crearea unei facturi',
        content: 'Creați facturi profesionale cu toate câmpurile necesare pentru conformitatea ANAF.',
        steps: [
          'Accesați Facturi > Factură nouă',
          'Selectați clientul sau adăugați unul nou',
          'Adăugați produsele/serviciile cu cantități și prețuri',
          'Verificați cota TVA (21% standard, 11% redus)',
          'Previzualizați și generați factura PDF/XML',
        ],
        tips: [
          'Folosiți template-uri pentru facturi recurente',
          'Activați trimiterea automată prin e-Factura SPV',
          'Configurați termene de plată default',
        ],
      },
      {
        id: 'efactura',
        title: 'e-Factura ANAF',
        content: 'Transmiterea electronică a facturilor în sistemul SPV ANAF conform reglementărilor B2B.',
        steps: [
          'Accesați e-Factura din meniul principal',
          'Verificați că certificatul digital SPV este valid',
          'Selectați facturile de trimis',
          'Apăsați Transmite și confirmați',
          'Verificați statusul în coloana Stare',
        ],
        tips: [
          'Configurați trimiterea automată pentru facturi noi',
          'Monitorizați răspunsurile ANAF pentru erori',
          'Păstrați dovezile de transmitere pentru audit',
        ],
      },
    ],
  },
  {
    id: 'vat',
    title: 'TVA & Declarații',
    icon: Calculator,
    description: 'Calculator TVA și declarații fiscale',
    articles: [
      {
        id: 'vat-calculator',
        title: 'Calculatorul TVA',
        content: 'Calculați rapid TVA pentru orice sumă cu cotele actualizate conform Legea 141/2025.',
        steps: [
          'Introduceți suma în câmpul dedicat',
          'Selectați cota TVA: 21% (standard), 11% (redus), 5%, 0%',
          'Alegeți dacă suma include deja TVA sau nu',
          'Apăsați Calculează pentru rezultat',
        ],
        tips: [
          'Cota standard de 21% se aplică majorității bunurilor',
          'Cota de 11% pentru alimente, medicamente, cărți',
          'Exporturile sunt scutite (0%)',
        ],
      },
      {
        id: 'saft-d406',
        title: 'SAF-T D406 Lunar',
        content: 'Generarea și transmiterea declarației lunare SAF-T D406 conform Ordinului 1783/2021.',
        steps: [
          'Accesați SAF-T D406 din meniu',
          'Selectați perioada (luna pentru care raportați)',
          'Verificați datele companiei',
          'Generați XML-ul și validați',
          'Transmiteți prin SPV ANAF',
        ],
        tips: [
          'Termenul este 25 ale lunii următoare',
          'Fișierul XML nu poate depăși 500MB',
          'Validați local înainte de transmitere',
        ],
      },
    ],
  },
  {
    id: 'hr',
    title: 'HR & Salarizare',
    icon: Users,
    description: 'Gestionarea angajaților și salariilor',
    articles: [
      {
        id: 'employees',
        title: 'Gestionarea Angajaților',
        content: 'Administrați datele angajaților, contracte și documente HR.',
        steps: [
          'Accesați HR & Salarizare din meniu',
          'Adăugați angajat nou cu datele personale',
          'Încărcați contractul de muncă',
          'Configurați salariul și beneficiile',
          'Setați departamentul și managerul direct',
        ],
      },
      {
        id: 'payroll',
        title: 'Procesarea Salariilor',
        content: 'Calculați automat salariile cu toate contribuțiile (CAS, CASS, impozit).',
        steps: [
          'Accesați Salarizare > Luna curentă',
          'Verificați pontajele pentru fiecare angajat',
          'Adăugați sporuri/bonusuri unde e cazul',
          'Procesați calculul automat',
          'Generați fluturașii și viramentele',
        ],
        tips: [
          'CAS: 25%, CASS: 10%, Impozit: 10%',
          'Verificați deducerile personale',
          'Exportați pentru integrare cu banca',
        ],
      },
    ],
  },
  {
    id: 'logistics',
    title: 'Logistică & Flotă',
    icon: Truck,
    description: 'Gestionarea flotei și transporturilor',
    articles: [
      {
        id: 'fleet',
        title: 'Gestionarea Flotei',
        content: 'Monitorizați vehiculele companiei, consumul de combustibil și reviziile.',
        steps: [
          'Accesați Flotă & Logistică',
          'Adăugați vehiculele cu datele tehnice',
          'Configurați alertele pentru revizii/ITP',
          'Monitorizați consumul și kilometrajul',
        ],
      },
      {
        id: 'e-transport',
        title: 'e-Transport',
        content: 'Generați documentele de transport conform reglementărilor pentru transportul de bunuri.',
        steps: [
          'Creați un nou transport',
          'Adăugați bunurile transportate',
          'Specificați ruta și vehiculul',
          'Generați și transmiteți CMR electronic',
        ],
      },
    ],
  },
  {
    id: 'compliance',
    title: 'Conformitate ANAF',
    icon: Shield,
    description: 'Ghid pentru toate cerințele ANAF',
    articles: [
      {
        id: 'deadlines',
        title: 'Calendar Termene',
        content: 'Toate termenele importante pentru declarațiile fiscale.',
        steps: [
          'SAF-T D406: 25 ale lunii următoare',
          'Declarație TVA D300: 25 ale lunii următoare',
          'e-Factura: 5 zile lucrătoare de la emitere',
          'Declarație 112 (salarii): 25 ale lunii următoare',
        ],
        tips: [
          'Activați notificările cu 7 zile înainte',
          'Pregătiți documentele cu 2-3 zile în avans',
          'Păstrați confirmările de transmitere',
        ],
      },
    ],
  },
];

export function UserGuide() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);
  const [selectedArticle, setSelectedArticle] = useState<GuideArticle | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const filteredSections = searchTerm
    ? guideSections
        .map((section) => ({
          ...section,
          articles: section.articles.filter(
            (article) =>
              article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              article.content.toLowerCase().includes(searchTerm.toLowerCase())
          ),
        }))
        .filter((section) => section.articles.length > 0)
    : guideSections;

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar Navigation */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Book className="w-5 h-5 text-blue-600" />
            Ghid Utilizare
          </h2>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Caută în ghid..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Sections */}
        <nav className="flex-1 overflow-y-auto p-2">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections.includes(section.id);

            return (
              <div key={section.id} className="mb-1">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="flex-1 text-left">{section.title}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {section.articles.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition ${
                          selectedArticle?.id === article.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {article.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Help Link */}
        <div className="p-4 border-t border-gray-200">
          <a
            href="mailto:support@documentiulia.ro"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
          >
            <HelpCircle className="w-4 h-4" />
            Ai nevoie de ajutor?
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedArticle ? (
          <article className="max-w-3xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedArticle.title}</h1>

            <p className="text-gray-600 mb-6 text-lg leading-relaxed">{selectedArticle.content}</p>

            {selectedArticle.videoUrl && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg flex items-center gap-3">
                <Play className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Tutorial Video</p>
                  <a href={selectedArticle.videoUrl} className="text-sm text-blue-600 hover:underline">
                    Vizionează demonstrația video
                  </a>
                </div>
              </div>
            )}

            {selectedArticle.steps && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Pași de urmat
                </h2>
                <ol className="space-y-3">
                  {selectedArticle.steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {selectedArticle.tips && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Sfaturi utile
                </h3>
                <ul className="space-y-2">
                  {selectedArticle.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-green-700">
                      <span className="text-green-500 mt-1">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ) : (
          <div className="text-center py-12">
            <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-600 mb-2">Ghid Utilizare DocumentIulia</h2>
            <p className="text-gray-500">Selectați un articol din meniul din stânga pentru a începe.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserGuide;
