'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  Star,
  Clock,
  Users,
  Briefcase,
  Calculator,
  Truck,
  ShieldCheck,
  FileCheck,
  Scale,
  Building2,
  CreditCard,
  Handshake,
  ClipboardList,
  Receipt,
  FileSpreadsheet,
  Lock,
  Crown
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  format: string;
  downloads: number;
  rating: number;
  isPremium: boolean;
  isNew?: boolean;
  lastUpdated: string;
}

const categories = [
  { id: 'all', name: 'Toate', icon: <FileText className="w-4 h-4" /> },
  { id: 'contracts', name: 'Contracte', icon: <Handshake className="w-4 h-4" /> },
  { id: 'hr', name: 'Resurse Umane', icon: <Users className="w-4 h-4" /> },
  { id: 'finance', name: 'Financiar', icon: <Calculator className="w-4 h-4" /> },
  { id: 'legal', name: 'Juridic', icon: <Scale className="w-4 h-4" /> },
  { id: 'tax', name: 'Fiscal', icon: <Receipt className="w-4 h-4" /> },
  { id: 'admin', name: 'Administrativ', icon: <ClipboardList className="w-4 h-4" /> }
];

const templates: Template[] = [
  // Contracts
  {
    id: '1',
    name: 'Contract Individual de Muncă (CIM)',
    description: 'Model complet de contract de muncă conform Codului Muncii actualizat 2025',
    category: 'contracts',
    icon: <Users className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 12500,
    rating: 4.9,
    isPremium: false,
    lastUpdated: '2025-01-15'
  },
  {
    id: '2',
    name: 'Contract de Prestări Servicii',
    description: 'Contract standard pentru prestări servicii B2B, cu clauze de confidențialitate',
    category: 'contracts',
    icon: <Handshake className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 8900,
    rating: 4.8,
    isPremium: false,
    lastUpdated: '2025-01-10'
  },
  {
    id: '3',
    name: 'Contract de Colaborare PFA/SRL',
    description: 'Contract pentru colaborare cu PFA sau SRL, include facturare și livrabile',
    category: 'contracts',
    icon: <Briefcase className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 6700,
    rating: 4.7,
    isPremium: false,
    lastUpdated: '2025-01-08'
  },
  {
    id: '4',
    name: 'Contract de Închiriere Spațiu Comercial',
    description: 'Contract de închiriere pentru sediu social sau punct de lucru',
    category: 'contracts',
    icon: <Building2 className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 5400,
    rating: 4.6,
    isPremium: false,
    lastUpdated: '2025-01-05'
  },
  {
    id: '5',
    name: 'Contract de Comodat Sediu Social',
    description: 'Contract de comodat pentru folosirea gratuită a unui spațiu ca sediu social',
    category: 'contracts',
    icon: <Building2 className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 9800,
    rating: 4.9,
    isPremium: false,
    isNew: true,
    lastUpdated: '2025-01-20'
  },
  {
    id: '6',
    name: 'Pachet Complet Contracte Muncă',
    description: 'CIM, act adițional, decizie suspendare, decizie încetare, toate formularele HR',
    category: 'contracts',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    format: 'ZIP',
    downloads: 3200,
    rating: 4.9,
    isPremium: true,
    lastUpdated: '2025-01-18'
  },

  // HR
  {
    id: '7',
    name: 'Fișa Postului - Model Generic',
    description: 'Șablon adaptabil pentru orice poziție, include responsabilități și competențe',
    category: 'hr',
    icon: <ClipboardList className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 7600,
    rating: 4.7,
    isPremium: false,
    lastUpdated: '2025-01-12'
  },
  {
    id: '8',
    name: 'Cerere Concediu de Odihnă',
    description: 'Formular standard pentru solicitarea concediului de odihnă',
    category: 'hr',
    icon: <FileCheck className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 11200,
    rating: 4.8,
    isPremium: false,
    lastUpdated: '2025-01-14'
  },
  {
    id: '9',
    name: 'Regulament Intern - Model Complet',
    description: 'Regulament intern conform legislației, include GDPR și SSM',
    category: 'hr',
    icon: <ShieldCheck className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 4500,
    rating: 4.9,
    isPremium: true,
    lastUpdated: '2025-01-16'
  },
  {
    id: '10',
    name: 'Decizie Încetare Contract de Muncă',
    description: 'Model de decizie pentru încetarea contractului de muncă',
    category: 'hr',
    icon: <FileText className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 3800,
    rating: 4.6,
    isPremium: false,
    lastUpdated: '2025-01-11'
  },

  // Finance
  {
    id: '11',
    name: 'Factură Fiscală - Model Standard',
    description: 'Model de factură conformă cu cerințele ANAF și e-Factura',
    category: 'finance',
    icon: <Receipt className="w-5 h-5" />,
    format: 'XLSX',
    downloads: 15600,
    rating: 4.9,
    isPremium: false,
    lastUpdated: '2025-01-19'
  },
  {
    id: '12',
    name: 'Chitanță',
    description: 'Model de chitanță pentru încasări numerar',
    category: 'finance',
    icon: <CreditCard className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 8900,
    rating: 4.7,
    isPremium: false,
    lastUpdated: '2025-01-08'
  },
  {
    id: '13',
    name: 'Dispoziție de Plată/Încasare',
    description: 'Documente pentru operațiuni de casă',
    category: 'finance',
    icon: <Calculator className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 5400,
    rating: 4.6,
    isPremium: false,
    lastUpdated: '2025-01-07'
  },
  {
    id: '14',
    name: 'Registru de Casă',
    description: 'Model de registru de casă pentru evidența numerarului',
    category: 'finance',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    format: 'XLSX',
    downloads: 4200,
    rating: 4.8,
    isPremium: false,
    lastUpdated: '2025-01-06'
  },
  {
    id: '15',
    name: 'Kit Complet Contabilitate Start-up',
    description: 'Toate documentele contabile pentru un SRL nou: registre, jurnale, state',
    category: 'finance',
    icon: <Briefcase className="w-5 h-5" />,
    format: 'ZIP',
    downloads: 2100,
    rating: 5.0,
    isPremium: true,
    isNew: true,
    lastUpdated: '2025-01-21'
  },

  // Legal
  {
    id: '16',
    name: 'Procură Generală',
    description: 'Model de procură pentru reprezentare legală',
    category: 'legal',
    icon: <Scale className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 6700,
    rating: 4.7,
    isPremium: false,
    lastUpdated: '2025-01-09'
  },
  {
    id: '17',
    name: 'Declarație pe Proprie Răspundere',
    description: 'Model generic de declarație pe proprie răspundere',
    category: 'legal',
    icon: <FileCheck className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 12300,
    rating: 4.8,
    isPremium: false,
    lastUpdated: '2025-01-13'
  },
  {
    id: '18',
    name: 'Acord de Confidențialitate (NDA)',
    description: 'Contract de confidențialitate pentru protecția informațiilor sensibile',
    category: 'legal',
    icon: <Lock className="w-5 h-5" />,
    format: 'DOCX',
    downloads: 7800,
    rating: 4.9,
    isPremium: false,
    lastUpdated: '2025-01-15'
  },

  // Tax
  {
    id: '19',
    name: 'Declarația Unică - Ghid Completare',
    description: 'Ghid pas cu pas pentru completarea Declarației Unice PFA/II',
    category: 'tax',
    icon: <Receipt className="w-5 h-5" />,
    format: 'PDF',
    downloads: 9500,
    rating: 4.9,
    isPremium: false,
    lastUpdated: '2025-01-17'
  },
  {
    id: '20',
    name: 'Calculator TVA Excel',
    description: 'Calculator automat pentru TVA cu toate cotele (19%, 9%, 5%)',
    category: 'tax',
    icon: <Calculator className="w-5 h-5" />,
    format: 'XLSX',
    downloads: 8700,
    rating: 4.8,
    isPremium: false,
    lastUpdated: '2025-01-10'
  }
];

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesPremium = !showPremiumOnly || template.isPremium;
    return matchesSearch && matchesCategory && matchesPremium;
  });

  const stats = {
    total: templates.length,
    free: templates.filter(t => !t.isPremium).length,
    premium: templates.filter(t => t.isPremium).length,
    downloads: templates.reduce((sum, t) => sum + t.downloads, 0)
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
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-start justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold mb-2">Bibliotecă Șabloane</h1>
            <p className="text-emerald-100 text-lg mb-4">
              Colecția completă de șabloane și documente pentru afacerea ta.
              Contracte, formulare HR, documente fiscale - toate actualizate conform legislației 2025.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <FileText className="w-4 h-4" /> {stats.total} șabloane
              </span>
              <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Download className="w-4 h-4" /> {(stats.downloads / 1000).toFixed(0)}k+ descărcări
              </span>
              <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Star className="w-4 h-4" /> Actualizate 2025
              </span>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center">
              <FileSpreadsheet className="w-12 h-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Șabloane</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.free}</p>
          <p className="text-sm text-gray-500">Gratuite</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.premium}</p>
          <p className="text-sm text-gray-500">Premium</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{(stats.downloads / 1000).toFixed(0)}k+</p>
          <p className="text-sm text-gray-500">Descărcări</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Caută șabloane..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.icon}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition ${
              template.isPremium ? 'ring-1 ring-purple-200' : ''
            }`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  template.isPremium ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {template.icon}
                </div>
                <div className="flex items-center gap-2">
                  {template.isNew && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      Nou
                    </span>
                  )}
                  {template.isPremium && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Premium
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                    {template.format}
                  </span>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>{template.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  <span>{template.downloads.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{template.lastUpdated}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition flex items-center justify-center gap-1">
                  <Eye className="w-4 h-4" />
                  Previzualizare
                </button>
                <button
                  className={`flex-1 py-2 rounded-lg font-medium transition flex items-center justify-center gap-1 ${
                    template.isPremium
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  {template.isPremium ? 'Cumpără' : 'Descarcă'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nu s-au găsit șabloane</p>
          <p className="text-sm text-gray-400">Încercați alte criterii de căutare</p>
        </div>
      )}

      {/* Premium CTA */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-8 mt-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-6 h-6" />
              <span className="font-semibold">DocumentIulia Premium</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Acces la toate șabloanele</h2>
            <p className="text-purple-100">
              Obține acces nelimitat la toate șabloanele premium, actualizări automate și suport prioritar.
            </p>
          </div>
          <button className="px-8 py-4 bg-white text-purple-600 rounded-xl font-bold hover:bg-purple-50 transition whitespace-nowrap">
            Upgrade la Premium - €9.99/lună
          </button>
        </div>
      </div>
    </div>
  );
}
