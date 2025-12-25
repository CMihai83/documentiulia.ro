'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Home,
  Settings,
  Users,
  TrendingUp,
  Receipt,
  Upload,
  Calculator,
  BarChart3,
  Shield,
  Truck,
  BookOpen,
  MessageSquare,
  HelpCircle,
  X,
  ChevronRight,
  Command,
  Target,
  UserPlus,
  FileSignature,
  Phone,
  Calendar,
  Package,
  ShoppingCart,
  Building2,
  Warehouse,
  Globe,
  CreditCard,
  Clock,
  Star,
  ClipboardCheck,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: 'home',
        title: 'Dashboard',
        description: 'Pagina principală',
        icon: <Home className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard'),
        keywords: ['acasă', 'home', 'panou'],
      },
      {
        id: 'invoices',
        title: 'Facturi',
        description: 'Gestionare facturi',
        icon: <FileText className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/invoices'),
        keywords: ['factură', 'invoice', 'emisă'],
      },
      {
        id: 'finance',
        title: 'Finanțe',
        description: 'Module financiare',
        icon: <TrendingUp className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/finance'),
        keywords: ['bani', 'financiar', 'contabilitate'],
      },
      {
        id: 'analytics',
        title: 'Analytics',
        description: 'Rapoarte și statistici',
        icon: <BarChart3 className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/analytics'),
        keywords: ['rapoarte', 'statistici', 'grafice'],
      },
      {
        id: 'hr',
        title: 'Resurse Umane',
        description: 'Angajați și salarii',
        icon: <Users className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/hr'),
        keywords: ['angajați', 'salarii', 'personal'],
      },
      {
        id: 'crm',
        title: 'CRM',
        description: 'Contacte, dealuri și activități',
        icon: <Target className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/crm'),
        keywords: ['crm', 'contacte', 'vânzări', 'clienți', 'pipeline'],
      },
      {
        id: 'fleet',
        title: 'Flotă Auto',
        description: 'Gestionare vehicule',
        icon: <Truck className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/fleet'),
        keywords: ['mașini', 'vehicule', 'transport'],
      },
      {
        id: 'hse',
        title: 'SSM',
        description: 'Sănătate și securitate',
        icon: <Shield className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/hse'),
        keywords: ['securitate', 'siguranță', 'protecție'],
      },
      {
        id: 'settings',
        title: 'Setări',
        description: 'Configurări aplicație',
        icon: <Settings className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/settings'),
        keywords: ['configurare', 'preferințe', 'opțiuni'],
      },
      {
        id: 'partners',
        title: 'Parteneri',
        description: 'Clienți și furnizori',
        icon: <Building2 className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/partners'),
        keywords: ['parteneri', 'clienți', 'furnizori', 'companii'],
      },
      {
        id: 'ecommerce',
        title: 'E-Commerce',
        description: 'Magazine online și comenzi',
        icon: <ShoppingCart className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/ecommerce'),
        keywords: ['magazin', 'online', 'comenzi', 'emag', 'shopify'],
      },
      {
        id: 'inventory',
        title: 'Inventar',
        description: 'Gestiune stocuri',
        icon: <Package className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/inventory'),
        keywords: ['stoc', 'produse', 'marfă', 'depozit'],
      },
      {
        id: 'warehouse',
        title: 'Depozit',
        description: 'Management depozit',
        icon: <Warehouse className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/warehouse'),
        keywords: ['depozit', 'locații', 'rafturi', 'logistică'],
      },
      {
        id: 'payments',
        title: 'Plăți',
        description: 'Încasări și plăți',
        icon: <CreditCard className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/payments'),
        keywords: ['plăți', 'încasări', 'bani', 'transfer'],
      },
      {
        id: 'quality',
        title: 'Calitate',
        description: 'Control calitate și inspecții',
        icon: <ClipboardCheck className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/quality'),
        keywords: ['calitate', 'inspecție', 'ncr', 'capa'],
      },
      {
        id: 'procurement',
        title: 'Achiziții',
        description: 'Comenzi și furnizori',
        icon: <Package className="w-4 h-4" />,
        category: 'Navigare',
        action: () => router.push('/dashboard/procurement'),
        keywords: ['achiziții', 'comenzi', 'furnizori', 'po'],
      },

      // Actions
      {
        id: 'new-invoice',
        title: 'Factură Nouă',
        description: 'Creează o factură nouă',
        icon: <FileText className="w-4 h-4" />,
        category: 'Acțiuni',
        action: () => router.push('/dashboard/invoices/new'),
        keywords: ['creare', 'nouă', 'emite'],
      },
      {
        id: 'upload',
        title: 'Încarcă Document',
        description: 'OCR și procesare automată',
        icon: <Upload className="w-4 h-4" />,
        category: 'Acțiuni',
        action: () => router.push('/dashboard/ocr'),
        keywords: ['upload', 'scanare', 'pdf'],
      },
      {
        id: 'vat-calc',
        title: 'Calculator TVA',
        description: 'Calculează TVA 21%/11%',
        icon: <Calculator className="w-4 h-4" />,
        category: 'Acțiuni',
        action: () => router.push('/dashboard/vat'),
        keywords: ['tva', 'calcul', 'taxe'],
      },
      {
        id: 'efactura',
        title: 'e-Factura',
        description: 'Trimite la ANAF SPV',
        icon: <Receipt className="w-4 h-4" />,
        category: 'Acțiuni',
        action: () => router.push('/dashboard/efactura'),
        keywords: ['anaf', 'spv', 'electronic'],
      },
      {
        id: 'saft',
        title: 'SAF-T D406',
        description: 'Generează raport XML',
        icon: <FileText className="w-4 h-4" />,
        category: 'Acțiuni',
        action: () => router.push('/dashboard/saft'),
        keywords: ['d406', 'xml', 'declarație'],
      },
      {
        id: 'exchange-rates',
        title: 'Curs Valutar BNR',
        description: 'Vezi cursul valutar și convertește',
        icon: <Globe className="w-4 h-4" />,
        category: 'Acțiuni',
        action: () => router.push('/dashboard/finance?tab=exchange-rates'),
        keywords: ['curs', 'valutar', 'bnr', 'euro', 'dolar', 'conversie'],
      },
      {
        id: 'new-partner',
        title: 'Partener Nou',
        description: 'Adaugă client sau furnizor',
        icon: <Building2 className="w-4 h-4" />,
        category: 'Acțiuni',
        action: () => router.push('/dashboard/partners/new'),
        keywords: ['partener', 'client', 'furnizor', 'companie', 'adaugă'],
      },

      // CRM Actions
      {
        id: 'new-contact',
        title: 'Contact Nou',
        description: 'Adaugă un contact CRM',
        icon: <UserPlus className="w-4 h-4" />,
        category: 'CRM',
        action: () => router.push('/dashboard/crm/contacts/new'),
        keywords: ['contact', 'client', 'crm', 'adaugă'],
      },
      {
        id: 'new-deal',
        title: 'Deal Nou',
        description: 'Creează o oportunitate de vânzare',
        icon: <Target className="w-4 h-4" />,
        category: 'CRM',
        action: () => router.push('/dashboard/crm/deals/new'),
        keywords: ['deal', 'vânzare', 'oportunitate', 'pipeline'],
      },
      {
        id: 'new-activity',
        title: 'Activitate Nouă',
        description: 'Programează apel/întâlnire/sarcină',
        icon: <Phone className="w-4 h-4" />,
        category: 'CRM',
        action: () => router.push('/dashboard/crm/activities/new'),
        keywords: ['activitate', 'apel', 'întâlnire', 'task', 'sarcină'],
      },

      // HR Actions
      {
        id: 'new-contract',
        title: 'Contract Nou',
        description: 'Creează un contract de muncă',
        icon: <FileSignature className="w-4 h-4" />,
        category: 'HR',
        action: () => router.push('/dashboard/hr/contracts/new'),
        keywords: ['contract', 'angajare', 'cim', 'muncă'],
      },

      // Resources
      {
        id: 'courses',
        title: 'Cursuri',
        description: 'Învățare și certificări',
        icon: <BookOpen className="w-4 h-4" />,
        category: 'Resurse',
        action: () => router.push('/dashboard/lms'),
        keywords: ['educație', 'training', 'învățare'],
      },
      {
        id: 'forum',
        title: 'Forum',
        description: 'Comunitate și discuții',
        icon: <MessageSquare className="w-4 h-4" />,
        category: 'Resurse',
        action: () => router.push('/dashboard/forum'),
        keywords: ['comunitate', 'discuții', 'întrebări'],
      },
      {
        id: 'help',
        title: 'Ajutor',
        description: 'Documentație și suport',
        icon: <HelpCircle className="w-4 h-4" />,
        category: 'Resurse',
        action: () => router.push('/dashboard/help'),
        keywords: ['suport', 'documentație', 'ghid'],
      },
    ],
    [router]
  );

  const filteredCommands = useMemo(() => {
    if (!search) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter((cmd) => {
      const titleMatch = cmd.title.toLowerCase().includes(searchLower);
      const descMatch = cmd.description?.toLowerCase().includes(searchLower);
      const keywordMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(searchLower));
      return titleMatch || descMatch || keywordMatch;
    });
  }, [commands, search]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    },
    [isOpen, filteredCommands, selectedIndex, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Command className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Caută comandă sau pagină..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-sm"
            autoFocus
          />
          <kbd className="hidden sm:block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nicio comandă găsită</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, items]) => (
              <div key={category} className="mb-2">
                <div className="px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {category}
                </div>
                {items.map((cmd) => {
                  flatIndex++;
                  const isSelected = flatIndex === selectedIndex;
                  const currentIndex = flatIndex;

                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-md ${
                          isSelected
                            ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {cmd.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{cmd.title}</div>
                        {cmd.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 ${
                          isSelected ? 'text-primary-500' : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑↓</kbd>
                navigare
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd>
                selectează
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Ctrl+K</kbd>
              deschide
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
