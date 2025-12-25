'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText, Briefcase, Receipt, FileCheck, Users, Scale,
  Calculator, Search, Filter, Download, Eye, Star, Clock,
  ChevronDown, Copy, Check, X, Lock, Sparkles, ArrowRight,
  FileSignature, Building2, Wallet, Shield
} from 'lucide-react';

// Template data - in production this would come from API
const templates = [
  // CONTRACTS
  {
    id: 'contract-individual-munca',
    name: 'Contract Individual de Muncă',
    nameEn: 'Individual Employment Contract',
    category: 'contract',
    subcategory: 'employment',
    description: 'Contract standard de angajare conform Codului Muncii, actualizat 2025. Include toate clauzele obligatorii și opționale.',
    tags: ['angajare', 'munca', 'salariat', 'cod muncii', 'HR'],
    isFree: false,
    downloadCount: 1250,
    rating: 4.8,
    lastUpdated: '2025-01-15',
    popular: true,
  },
  {
    id: 'contract-prestari-servicii',
    name: 'Contract Prestări Servicii',
    nameEn: 'Service Agreement',
    category: 'contract',
    subcategory: 'commercial',
    description: 'Contract pentru servicii profesionale între companii sau cu PFA. Include clauze de confidențialitate și proprietate intelectuală.',
    tags: ['servicii', 'B2B', 'PFA', 'colaborare'],
    isFree: true,
    downloadCount: 2340,
    rating: 4.9,
    lastUpdated: '2025-01-10',
    popular: true,
  },
  {
    id: 'contract-nda',
    name: 'Acord de Confidențialitate (NDA)',
    nameEn: 'Non-Disclosure Agreement',
    category: 'contract',
    subcategory: 'legal',
    description: 'Acord bilateral sau unilateral de confidențialitate pentru protejarea informațiilor sensibile de afaceri.',
    tags: ['NDA', 'confidentialitate', 'secret comercial'],
    isFree: true,
    downloadCount: 1890,
    rating: 4.7,
    lastUpdated: '2025-01-08',
    popular: false,
  },
  {
    id: 'contract-comodat',
    name: 'Contract de Comodat Sediu Social',
    nameEn: 'Registered Office Loan Agreement',
    category: 'contract',
    subcategory: 'real-estate',
    description: 'Contract gratuit de împrumut de folosință pentru sediu social. Necesar la înființarea firmei.',
    tags: ['sediu social', 'comodat', 'infiintare firma', 'ONRC'],
    isFree: true,
    downloadCount: 3120,
    rating: 4.9,
    lastUpdated: '2025-01-12',
    popular: true,
  },
  {
    id: 'contract-inchiriere',
    name: 'Contract de Închiriere Spațiu Comercial',
    nameEn: 'Commercial Lease Agreement',
    category: 'contract',
    subcategory: 'real-estate',
    description: 'Contract complet pentru închirierea spațiilor comerciale sau de birouri, cu clauze de indexare și garanții.',
    tags: ['inchiriere', 'spatiu comercial', 'birou', 'chirias'],
    isFree: false,
    downloadCount: 980,
    rating: 4.6,
    lastUpdated: '2025-01-05',
    popular: false,
  },
  // INVOICES & FINANCIAL
  {
    id: 'factura-fiscala-standard',
    name: 'Factură Fiscală Standard',
    nameEn: 'Standard Tax Invoice',
    category: 'invoice',
    subcategory: 'fiscal',
    description: 'Model de factură fiscală conformă cu legislația română și cerințele e-Factura. Include TVA 19%, 9%, 5%.',
    tags: ['factura', 'TVA', 'e-Factura', 'ANAF'],
    isFree: true,
    downloadCount: 5670,
    rating: 4.9,
    lastUpdated: '2025-01-20',
    popular: true,
  },
  {
    id: 'factura-proforma',
    name: 'Factură Proforma',
    nameEn: 'Proforma Invoice',
    category: 'invoice',
    subcategory: 'commercial',
    description: 'Factură proforma pentru oferte și avansuri. Nu constituie document fiscal.',
    tags: ['proforma', 'oferta', 'avans'],
    isFree: true,
    downloadCount: 2340,
    rating: 4.7,
    lastUpdated: '2025-01-15',
    popular: false,
  },
  {
    id: 'nota-contabila',
    name: 'Notă Contabilă',
    nameEn: 'Accounting Note',
    category: 'financial',
    subcategory: 'accounting',
    description: 'Document pentru înregistrări contabile interne, corecții și operațiuni diverse.',
    tags: ['contabilitate', 'nota', 'inregistrare'],
    isFree: true,
    downloadCount: 1450,
    rating: 4.5,
    lastUpdated: '2025-01-10',
    popular: false,
  },
  {
    id: 'raport-cheltuieli',
    name: 'Raport de Cheltuieli',
    nameEn: 'Expense Report',
    category: 'financial',
    subcategory: 'expenses',
    description: 'Formular pentru decontarea cheltuielilor de deplasare, protocol și alte cheltuieli profesionale.',
    tags: ['cheltuieli', 'decont', 'deplasare', 'diurna'],
    isFree: true,
    downloadCount: 1230,
    rating: 4.6,
    lastUpdated: '2025-01-08',
    popular: false,
  },
  // HR DOCUMENTS
  {
    id: 'act-aditional-salariu',
    name: 'Act Adițional - Modificare Salariu',
    nameEn: 'Salary Amendment Agreement',
    category: 'hr',
    subcategory: 'employment',
    description: 'Act adițional la contractul de muncă pentru modificarea salariului sau a altor condiții.',
    tags: ['act aditional', 'salariu', 'modificare contract', 'HR'],
    isFree: false,
    downloadCount: 890,
    rating: 4.8,
    lastUpdated: '2025-01-18',
    popular: false,
  },
  {
    id: 'cerere-concediu',
    name: 'Cerere Concediu de Odihnă',
    nameEn: 'Annual Leave Request',
    category: 'hr',
    subcategory: 'leave',
    description: 'Formular standard pentru solicitarea concediului de odihnă anual.',
    tags: ['concediu', 'cerere', 'odihna', 'HR'],
    isFree: true,
    downloadCount: 3450,
    rating: 4.9,
    lastUpdated: '2025-01-20',
    popular: true,
  },
  {
    id: 'fisa-post',
    name: 'Fișa Postului',
    nameEn: 'Job Description',
    category: 'hr',
    subcategory: 'employment',
    description: 'Model de fișă a postului cu responsabilități, competențe și cerințe. Anexă obligatorie la CIM.',
    tags: ['fisa post', 'responsabilitati', 'HR', 'angajare'],
    isFree: false,
    downloadCount: 1670,
    rating: 4.7,
    lastUpdated: '2025-01-15',
    popular: false,
  },
  // DECLARATIONS
  {
    id: 'declaratie-propria-raspundere',
    name: 'Declarație pe Proprie Răspundere',
    nameEn: 'Self-Declaration',
    category: 'declaration',
    subcategory: 'general',
    description: 'Model general de declarație pe proprie răspundere pentru diverse situații administrative.',
    tags: ['declaratie', 'proprie raspundere', 'administrativ'],
    isFree: true,
    downloadCount: 4560,
    rating: 4.8,
    lastUpdated: '2025-01-22',
    popular: true,
  },
  {
    id: 'declaratie-beneficiar-real',
    name: 'Declarație Beneficiar Real',
    nameEn: 'Ultimate Beneficial Owner Declaration',
    category: 'declaration',
    subcategory: 'legal',
    description: 'Declarație obligatorie pentru identificarea beneficiarului real al societății, conform Legii 129/2019.',
    tags: ['beneficiar real', 'AML', 'ONRC', 'spalare bani'],
    isFree: true,
    downloadCount: 2340,
    rating: 4.6,
    lastUpdated: '2025-01-10',
    popular: false,
  },
  // LEGAL
  {
    id: 'proces-verbal-aga',
    name: 'Proces Verbal AGA',
    nameEn: 'General Meeting Minutes',
    category: 'legal',
    subcategory: 'corporate',
    description: 'Model de proces verbal pentru Adunarea Generală a Asociaților/Acționarilor.',
    tags: ['AGA', 'proces verbal', 'hotarare', 'asociati'],
    isFree: false,
    downloadCount: 1120,
    rating: 4.7,
    lastUpdated: '2025-01-12',
    popular: false,
  },
  {
    id: 'imputernicire-generala',
    name: 'Împuternicire Generală',
    nameEn: 'General Power of Attorney',
    category: 'legal',
    subcategory: 'authorization',
    description: 'Împuternicire pentru reprezentare la instituții publice și private.',
    tags: ['imputernicire', 'reprezentare', 'delegare'],
    isFree: true,
    downloadCount: 2890,
    rating: 4.8,
    lastUpdated: '2025-01-18',
    popular: true,
  },
  {
    id: 'act-constitutiv-srl',
    name: 'Act Constitutiv SRL',
    nameEn: 'LLC Articles of Association',
    category: 'legal',
    subcategory: 'corporate',
    description: 'Model de act constitutiv pentru Societate cu Răspundere Limitată, conform Legii 31/1990.',
    tags: ['act constitutiv', 'SRL', 'infiintare', 'ONRC'],
    isFree: false,
    downloadCount: 3450,
    rating: 4.9,
    lastUpdated: '2025-01-20',
    popular: true,
  },
];

const categories = [
  { id: 'all', name: 'Toate', icon: FileText, count: templates.length },
  { id: 'contract', name: 'Contracte', icon: FileSignature, count: templates.filter(t => t.category === 'contract').length },
  { id: 'invoice', name: 'Facturi', icon: Receipt, count: templates.filter(t => t.category === 'invoice').length },
  { id: 'financial', name: 'Financiar', icon: Calculator, count: templates.filter(t => t.category === 'financial').length },
  { id: 'hr', name: 'Resurse Umane', icon: Users, count: templates.filter(t => t.category === 'hr').length },
  { id: 'declaration', name: 'Declarații', icon: FileCheck, count: templates.filter(t => t.category === 'declaration').length },
  { id: 'legal', name: 'Juridice', icon: Scale, count: templates.filter(t => t.category === 'legal').length },
];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<typeof templates[0] | null>(null);

  const filteredTemplates = useMemo(() => {
    let result = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(t => t.category === selectedCategory);
    }

    // Filter by free only
    if (showFreeOnly) {
      result = result.filter(t => t.isFree);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        result = [...result].sort((a, b) => b.downloadCount - a.downloadCount);
        break;
      case 'recent':
        result = [...result].sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break;
      case 'rating':
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
    }

    return result;
  }, [searchQuery, selectedCategory, showFreeOnly, sortBy]);

  const handleCopy = (id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat?.icon || FileText;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      contract: 'bg-blue-100 text-blue-600',
      invoice: 'bg-green-100 text-green-600',
      financial: 'bg-yellow-100 text-yellow-600',
      hr: 'bg-purple-100 text-purple-600',
      declaration: 'bg-orange-100 text-orange-600',
      legal: 'bg-red-100 text-red-600',
    };
    return colors[category] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
            <FileText className="w-4 h-4" /> Biblioteca de Documente
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Șabloane de Documente pentru Afaceri
          </h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">
            Contracte, facturi, declarații și documente HR - toate actualizate pentru 2025.
            Conforme cu legislația română și cerințele ANAF.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold">{templates.length}+</div>
              <div className="text-sm opacity-80">Șabloane</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{templates.filter(t => t.isFree).length}</div>
              <div className="text-sm opacity-80">Gratuite</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">2025</div>
              <div className="text-sm opacity-80">Actualizate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm opacity-80">Conforme Legal</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="py-8 px-4 bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto">
          {/* Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Caută șabloane (ex: contract muncă, factură, NDA...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                <input
                  type="checkbox"
                  checked={showFreeOnly}
                  onChange={(e) => setShowFreeOnly(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="text-sm font-medium">Doar gratuite</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="popular">Cele mai populare</option>
                <option value="recent">Cele mai recente</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.name}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedCategory === cat.id ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Nu am găsit șabloane</h3>
              <p className="text-gray-500">Încearcă să modifici filtrele sau termenul de căutare.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => {
                const CategoryIcon = getCategoryIcon(template.category);
                return (
                  <div
                    key={template.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden group"
                  >
                    {/* Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryColor(template.category)}`}>
                          <CategoryIcon className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-2">
                          {template.popular && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Popular
                            </span>
                          )}
                          {template.isFree ? (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                              Gratuit
                            </span>
                          ) : (
                            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Pro
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-semibold text-lg mb-2 group-hover:text-indigo-600 transition">
                        {template.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {template.description}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Download className="w-4 h-4" /> {template.downloadCount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" /> {template.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {new Date(template.lastUpdated).toLocaleDateString('ro-RO')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 bg-gray-50 border-t flex gap-2">
                      <button
                        onClick={() => setPreviewTemplate(template)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-white transition"
                      >
                        <Eye className="w-4 h-4" /> Previzualizare
                      </button>
                      {template.isFree ? (
                        <button
                          onClick={() => handleCopy(template.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                        >
                          {copiedId === template.id ? (
                            <>
                              <Check className="w-4 h-4" /> Copiat!
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" /> Descarcă
                            </>
                          )}
                        </button>
                      ) : (
                        <Link
                          href="/pricing"
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                        >
                          <Lock className="w-4 h-4" /> Pro
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-semibold">{previewTemplate.name}</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <p className="text-gray-600 mb-4">{previewTemplate.description}</p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">Informații</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Categorie:</span>
                    <span className="ml-2 capitalize">{previewTemplate.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Ultima actualizare:</span>
                    <span className="ml-2">{new Date(previewTemplate.lastUpdated).toLocaleDateString('ro-RO')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Descărcări:</span>
                    <span className="ml-2">{previewTemplate.downloadCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Rating:</span>
                    <span className="ml-2">{previewTemplate.rating}/5</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">Previzualizare completă</h4>
                <p className="text-yellow-700 text-sm">
                  {previewTemplate.isFree
                    ? 'Acest șablon este gratuit. Descarcă-l pentru a vedea conținutul complet.'
                    : 'Acest șablon este disponibil pentru utilizatorii Pro. Upgrade pentru acces complet.'
                  }
                </p>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50"
              >
                Închide
              </button>
              {previewTemplate.isFree ? (
                <button className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" /> Descarcă Șablon
                </button>
              ) : (
                <Link
                  href="/pricing"
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" /> Upgrade la Pro
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ai Nevoie de Șabloane Personalizate?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Specialiștii noștri pot crea documente personalizate pentru afacerea ta,
            conforme 100% cu legislația română.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-white text-indigo-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
            >
              Solicită Ofertă <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition"
            >
              Vezi Planurile Pro
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
