'use client';

/**
 * Global Search Component
 * Quick search for modules, features, and content
 * Sprint 26 - UX Improvements (Grok Quick Win #3)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Search,
  X,
  FileText,
  Receipt,
  Users,
  Calculator,
  Truck,
  Settings,
  BarChart3,
  Package,
  Target,
  Briefcase,
  Shield,
  HelpCircle,
  Rocket,
  Command,
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  titleRo: string;
  description: string;
  path: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

// Searchable items across the platform
const SEARCH_INDEX: SearchResult[] = [
  // Main
  { id: 'dashboard', title: 'Dashboard', titleRo: 'Panou Principal', description: 'Main dashboard overview', path: '/dashboard', category: 'Main', icon: BarChart3, keywords: ['home', 'overview', 'main', 'acasa', 'principal'] },
  { id: 'analytics', title: 'Analytics', titleRo: 'Analytics', description: 'Business analytics and reports', path: '/dashboard/analytics', category: 'Main', icon: BarChart3, keywords: ['reports', 'charts', 'metrics', 'rapoarte', 'grafice'] },

  // Documents
  { id: 'invoices', title: 'Invoices', titleRo: 'Facturi', description: 'Create and manage invoices', path: '/dashboard/invoices', category: 'Documents', icon: Receipt, keywords: ['factura', 'invoice', 'bill', 'e-factura'] },
  { id: 'ocr', title: 'OCR Scanner', titleRo: 'Scanner OCR', description: 'Scan and extract document data', path: '/dashboard/ocr', category: 'Documents', icon: FileText, keywords: ['scan', 'extract', 'document', 'scanare'] },
  { id: 'documents', title: 'Documents', titleRo: 'Documente', description: 'Document management', path: '/dashboard/documents', category: 'Documents', icon: FileText, keywords: ['files', 'documente', 'fisiere'] },

  // Finance
  { id: 'finance', title: 'Finance', titleRo: 'Finanțe', description: 'Financial overview', path: '/dashboard/finance', category: 'Finance', icon: Calculator, keywords: ['money', 'bani', 'finante', 'contabilitate'] },
  { id: 'vat', title: 'VAT Reports', titleRo: 'Rapoarte TVA', description: 'VAT calculation and D300', path: '/dashboard/vat', category: 'Finance', icon: Calculator, keywords: ['tva', 'd300', 'tax', 'impozit'] },
  { id: 'vat-simulator', title: 'VAT Simulator', titleRo: 'Simulator TVA', description: 'Simulate Aug 2025 VAT changes', path: '/dashboard/finance/vat-simulator', category: 'Finance', icon: Calculator, keywords: ['simulator', 'tva', '2025', 'legea 141'] },
  { id: 'saft', title: 'SAF-T D406', titleRo: 'SAF-T D406', description: 'SAF-T XML generation', path: '/dashboard/saft', category: 'Finance', icon: FileText, keywords: ['saft', 'd406', 'anaf', 'xml'] },
  { id: 'cash-flow', title: 'Cash Flow', titleRo: 'Flux Numerar', description: 'Cash flow forecasting', path: '/dashboard/finance/cash-flow', category: 'Finance', icon: BarChart3, keywords: ['cash', 'numerar', 'forecast', 'previziune'] },

  // HR
  { id: 'hr', title: 'HR & Payroll', titleRo: 'HR & Salarizare', description: 'Employee management', path: '/dashboard/hr', category: 'HR', icon: Users, keywords: ['angajati', 'salarii', 'employees', 'payroll'] },
  { id: 'payroll', title: 'Payroll', titleRo: 'Salarizare', description: 'Salary calculation', path: '/dashboard/payroll', category: 'HR', icon: Calculator, keywords: ['salarii', 'revisal', 'contributii'] },
  { id: 'contracts', title: 'Contracts', titleRo: 'Contracte', description: 'Employment contracts', path: '/dashboard/contracts', category: 'HR', icon: FileText, keywords: ['contracte', 'munca', 'employment'] },

  // Commerce
  { id: 'crm', title: 'CRM', titleRo: 'CRM', description: 'Customer relationship management', path: '/dashboard/crm', category: 'Commerce', icon: Target, keywords: ['clienti', 'customers', 'sales', 'vanzari'] },
  { id: 'partners', title: 'Partners', titleRo: 'Parteneri', description: 'Business partners', path: '/dashboard/partners', category: 'Commerce', icon: Users, keywords: ['parteneri', 'furnizori', 'suppliers'] },
  { id: 'ecommerce', title: 'E-Commerce', titleRo: 'E-Commerce', description: 'Online store management', path: '/dashboard/ecommerce', category: 'Commerce', icon: Package, keywords: ['magazin', 'online', 'comenzi', 'orders'] },

  // Operations
  { id: 'logistics', title: 'Logistics', titleRo: 'Logistică', description: 'Shipping and tracking', path: '/dashboard/logistics', category: 'Operations', icon: Truck, keywords: ['transport', 'livrare', 'shipping'] },
  { id: 'fleet', title: 'Fleet', titleRo: 'Flotă', description: 'Vehicle fleet management', path: '/dashboard/fleet', category: 'Operations', icon: Truck, keywords: ['vehicule', 'masini', 'soferi', 'drivers'] },
  { id: 'warehouse', title: 'Warehouse', titleRo: 'Depozit', description: 'Inventory management', path: '/dashboard/warehouse', category: 'Operations', icon: Package, keywords: ['inventar', 'stoc', 'stock', 'inventory'] },

  // Projects
  { id: 'projects', title: 'Projects', titleRo: 'Proiecte', description: 'Project management', path: '/dashboard/projects', category: 'Projects', icon: Briefcase, keywords: ['proiecte', 'tasks', 'sarcini'] },

  // Admin
  { id: 'settings', title: 'Settings', titleRo: 'Setări', description: 'Platform settings', path: '/dashboard/settings', category: 'Admin', icon: Settings, keywords: ['setari', 'configurare', 'preferences'] },
  { id: 'audit', title: 'Audit Trail', titleRo: 'Jurnal Audit', description: 'System audit logs', path: '/dashboard/audit', category: 'Admin', icon: Shield, keywords: ['audit', 'logs', 'jurnal', 'securitate'] },

  // Help
  { id: 'help', title: 'Help', titleRo: 'Ajutor', description: 'User guide and FAQ', path: '/dashboard/help', category: 'Help', icon: HelpCircle, keywords: ['ajutor', 'help', 'faq', 'ghid'] },
  { id: 'ai-assistant', title: 'AI Assistant', titleRo: 'Asistent AI', description: 'AI-powered assistant', path: '/dashboard/ai-assistant', category: 'Help', icon: Rocket, keywords: ['ai', 'grok', 'asistent', 'inteligenta'] },

  // Simulation
  { id: 'simulation', title: 'Simulation', titleRo: 'Simulare', description: 'Business simulation', path: '/dashboard/simulation', category: 'Tools', icon: BarChart3, keywords: ['simulare', 'what-if', 'scenario'] },
];

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const t = useTranslations('search');
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract locale from pathname
  const locale = pathname.split('/')[1] || 'ro';

  // Search function
  const search = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = SEARCH_INDEX.filter(item => {
      const searchText = [
        item.title,
        item.titleRo,
        item.description,
        item.category,
        ...item.keywords,
      ].join(' ').toLowerCase();

      return searchText.includes(lowerQuery);
    });

    // Sort by relevance (exact match first)
    filtered.sort((a, b) => {
      const aExact = a.title.toLowerCase() === lowerQuery || a.titleRo.toLowerCase() === lowerQuery;
      const bExact = b.title.toLowerCase() === lowerQuery || b.titleRo.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });

    setResults(filtered.slice(0, 8));
    setSelectedIndex(0);
  }, []);

  // Handle input change
  useEffect(() => {
    search(query);
  }, [query, search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          navigateTo(results[selectedIndex].path);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  const navigateTo = (path: string) => {
    router.push(`/${locale}${path}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="relative min-h-screen flex items-start justify-center pt-[10vh] px-4">
        <div className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('placeholder') || 'Caută module, funcții...'}
              className="flex-1 px-4 py-4 text-gray-900 dark:text-white bg-transparent outline-none"
            />
            <div className="flex items-center gap-2">
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                <Command className="h-3 w-3" />K
              </kbd>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.map((result, index) => {
                const Icon = result.icon;
                return (
                  <button
                    key={result.id}
                    onClick={() => navigateTo(result.path)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                      ${index === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${index === selectedIndex ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'}
                    `}>
                      <Icon className={`h-5 w-5 ${index === selectedIndex ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${index === selectedIndex ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                        {locale === 'ro' ? result.titleRo : result.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {result.description}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {result.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {query && results.length === 0 && (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {t('noResults') || 'Nu am găsit rezultate pentru'} "{query}"
              </p>
            </div>
          )}

          {/* Quick Actions */}
          {!query && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 mb-2">{t('quickActions') || 'Acțiuni rapide'}</p>
              <div className="flex flex-wrap gap-2">
                {['Facturi', 'TVA', 'Clienți', 'Rapoarte'].map((action) => (
                  <button
                    key={action}
                    onClick={() => setQuery(action)}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd>
                {t('navigate') || 'Navigare'}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
                {t('select') || 'Selectează'}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">esc</kbd>
                {t('close') || 'Închide'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Search trigger button for navbar
export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Caută...</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 rounded">
        <Command className="h-3 w-3" />K
      </kbd>
    </button>
  );
}
