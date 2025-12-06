'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Users,
  Package,
  Receipt,
  Calculator,
  BarChart3,
  Settings,
  HelpCircle,
  ArrowRight,
  Clock,
  Star,
  X,
  Command,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'page' | 'invoice' | 'contact' | 'product' | 'action';
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  category: string;
}

const quickActions: SearchResult[] = [
  { id: 'new-invoice', type: 'action', title: 'Creează factură nouă', icon: FileText, href: '/invoices?action=new', category: 'Acțiuni rapide' },
  { id: 'new-expense', type: 'action', title: 'Adaugă cheltuială', icon: Receipt, href: '/expenses?action=new', category: 'Acțiuni rapide' },
  { id: 'new-contact', type: 'action', title: 'Adaugă client nou', icon: Users, href: '/contacts?action=new', category: 'Acțiuni rapide' },
  { id: 'scan-receipt', type: 'action', title: 'Scanează bon fiscal', icon: Receipt, href: '/receipts?action=scan', category: 'Acțiuni rapide' },
];

const pages: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Panou Principal', description: 'Dashboard cu statistici', icon: BarChart3, href: '/dashboard', category: 'Pagini' },
  { id: 'invoices', type: 'page', title: 'Facturi', description: 'Gestionare facturi', icon: FileText, href: '/invoices', category: 'Pagini' },
  { id: 'expenses', type: 'page', title: 'Cheltuieli', description: 'Urmărește cheltuielile', icon: Receipt, href: '/expenses', category: 'Pagini' },
  { id: 'contacts', type: 'page', title: 'Contacte', description: 'Clienți și furnizori', icon: Users, href: '/contacts', category: 'Pagini' },
  { id: 'products', type: 'page', title: 'Produse', description: 'Catalog produse', icon: Package, href: '/products', category: 'Pagini' },
  { id: 'reports', type: 'page', title: 'Rapoarte', description: 'Analize și rapoarte', icon: BarChart3, href: '/reports', category: 'Pagini' },
  { id: 'efactura', type: 'page', title: 'e-Factura', description: 'Facturare electronică', icon: FileText, href: '/efactura', category: 'Fiscal' },
  { id: 'saft', type: 'page', title: 'SAF-T', description: 'Raportare SAF-T', icon: FileText, href: '/saft', category: 'Fiscal' },
  { id: 'ai-consultant', type: 'page', title: 'Consultant AI', description: 'Asistent fiscal AI', icon: Calculator, href: '/ai-consultant', category: 'Fiscal' },
  { id: 'settings', type: 'page', title: 'Setări', description: 'Configurează aplicația', icon: Settings, href: '/settings', category: 'Sistem' },
  { id: 'help', type: 'page', title: 'Ajutor', description: 'Ghiduri și suport', icon: HelpCircle, href: '/help', category: 'Sistem' },
];

const recentSearches = ['SC Exemplu SRL', 'Factură #2024-001', 'Raport TVA'];

export function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems] = useState(recentSearches);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Filter results based on query
  const filteredResults = query.trim()
    ? [...quickActions, ...pages].filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : [...quickActions, ...pages.slice(0, 6)];

  // Group results by category
  const groupedResults = filteredResults.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Flatten for keyboard navigation
  const flatResults = Object.values(groupedResults).flat();

  // Open modal with keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      // / to open (only if not in input)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % flatResults.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            router.push(flatResults[selectedIndex].href);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [flatResults, selectedIndex, router]
  );

  // Navigate to result
  const navigateTo = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-64"
      >
        <Search className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400 flex-1 text-left">
          Caută facturi, clienți...
        </span>
        <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-gray-200 dark:bg-gray-700 rounded">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Caută pagini, facturi, clienți..."
                  className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto">
                {/* Recent searches */}
                {!query && recentItems.length > 0 && (
                  <div className="p-2">
                    <h3 className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Căutări recente
                    </h3>
                    {recentItems.map((item, i) => (
                      <button
                        key={i}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Grouped results */}
                {Object.entries(groupedResults).map(([category, items]) => (
                  <div key={category} className="p-2">
                    <h3 className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {category}
                    </h3>
                    {items.map((item) => {
                      const globalIndex = flatResults.findIndex((r) => r.id === item.id);
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          onClick={() => navigateTo(item.href)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-primary/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <item.icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                              {item.title}
                            </p>
                            {item.description && (
                              <p className="text-xs text-gray-500 truncate">{item.description}</p>
                            )}
                          </div>
                          {isSelected && (
                            <ArrowRight className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {/* No results */}
                {query && flatResults.length === 0 && (
                  <div className="p-8 text-center">
                    <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Nu am găsit rezultate pentru &quot;{query}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                      <CornerDownLeft className="w-3 h-3 inline" />
                    </kbd>
                    pentru a selecta
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                      <ArrowUp className="w-3 h-3 inline" />
                    </kbd>
                    <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                      <ArrowDown className="w-3 h-3 inline" />
                    </kbd>
                    pentru a naviga
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">esc</kbd>
                  pentru a închide
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
