'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  Command,
  ChevronRight,
  Clock,
  Star,
  Hash,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  keywords?: string[];
  url?: string;
  score?: number;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  // Load recent commands from localStorage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('recentCommands');
      if (stored) {
        try {
          setRecentCommands(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to load recent commands:', e);
        }
      }
    }
  }, [isOpen]);

  // Save command to recent
  const saveRecentCommand = useCallback((commandId: string) => {
    setRecentCommands((prev) => {
      const updated = [commandId, ...prev.filter((id) => id !== commandId)].slice(0, 5);
      localStorage.setItem('recentCommands', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: 'nav-home',
        title: t('sidebar.overview', { defaultValue: 'Dashboard' }),
        description: t('nav.dashboard', { defaultValue: 'Go to main dashboard' }),
        icon: <Home className="w-4 h-4" />,
        category: t('shortcuts.navigation', { defaultValue: 'Navigation' }),
        action: () => router.push('/dashboard'),
        url: '/dashboard',
        keywords: ['home', 'dashboard', 'acasă', 'panou'],
      },
      {
        id: 'nav-invoices',
        title: t('sidebar.invoices', { defaultValue: 'Invoices' }),
        description: t('invoices.title', { defaultValue: 'Manage invoices' }),
        icon: <FileText className="w-4 h-4" />,
        category: t('shortcuts.navigation', { defaultValue: 'Navigation' }),
        action: () => router.push('/dashboard/invoices'),
        url: '/dashboard/invoices',
        keywords: ['invoice', 'facturi', 'billing'],
      },
      {
        id: 'nav-partners',
        title: t('sidebar.partners', { defaultValue: 'Partners' }),
        description: t('partners.title', { defaultValue: 'Manage partners' }),
        icon: <Users className="w-4 h-4" />,
        category: t('shortcuts.navigation', { defaultValue: 'Navigation' }),
        action: () => router.push('/dashboard/partners'),
        url: '/dashboard/partners',
        keywords: ['partners', 'parteneri', 'customers', 'suppliers'],
      },
      {
        id: 'nav-finance',
        title: t('sidebar.reports', { defaultValue: 'Finance' }),
        description: 'Financial reports and analysis',
        icon: <TrendingUp className="w-4 h-4" />,
        category: t('shortcuts.navigation', { defaultValue: 'Navigation' }),
        action: () => router.push('/dashboard/reports'),
        url: '/dashboard/reports',
        keywords: ['finance', 'finanțe', 'reports', 'rapoarte'],
      },
      {
        id: 'nav-analytics',
        title: 'Analytics',
        description: 'Charts and statistics',
        icon: <BarChart3 className="w-4 h-4" />,
        category: t('shortcuts.navigation', { defaultValue: 'Navigation' }),
        action: () => router.push('/dashboard/analytics'),
        url: '/dashboard/analytics',
        keywords: ['analytics', 'statistics', 'charts', 'grafice'],
      },
      {
        id: 'nav-hr',
        title: t('sidebar.hr', { defaultValue: 'HR & Payroll' }),
        description: 'Employees and payroll',
        icon: <Users className="w-4 h-4" />,
        category: t('shortcuts.navigation', { defaultValue: 'Navigation' }),
        action: () => router.push('/dashboard/hr'),
        url: '/dashboard/hr',
        keywords: ['hr', 'human resources', 'payroll', 'salarii'],
      },
      {
        id: 'nav-ocr',
        title: t('sidebar.ocr', { defaultValue: 'OCR Documents' }),
        description: 'Document scanning and processing',
        icon: <Upload className="w-4 h-4" />,
        category: t('shortcuts.navigation', { defaultValue: 'Navigation' }),
        action: () => router.push('/dashboard/ocr'),
        url: '/dashboard/ocr',
        keywords: ['ocr', 'upload', 'scan', 'document'],
      },
      {
        id: 'nav-vat',
        title: t('sidebar.vat', { defaultValue: 'VAT Reports' }),
        description: 'VAT calculation and reporting',
        icon: <Calculator className="w-4 h-4" />,
        category: t('shortcuts.navigation', { defaultValue: 'Navigation' }),
        action: () => router.push('/dashboard/vat'),
        url: '/dashboard/vat',
        keywords: ['vat', 'tva', 'tax', 'taxes'],
      },
      {
        id: 'nav-efactura',
        title: t('sidebar.efactura', { defaultValue: 'e-Invoice' }),
        description: 'ANAF e-Invoice SPV',
        icon: <Receipt className="w-4 h-4" />,
        category: t('shortcuts.navigation', { defaultValue: 'Navigation' }),
        action: () => router.push('/dashboard/efactura'),
        url: '/dashboard/efactura',
        keywords: ['efactura', 'e-invoice', 'anaf', 'spv'],
      },
      {
        id: 'nav-saft',
        title: t('sidebar.saft', { defaultValue: 'SAF-T D406' }),
        description: 'SAF-T XML reports',
        icon: <FileText className="w-4 h-4" />,
        category: t('shortcuts.navigation', { defaultValue: 'Navigation' }),
        action: () => router.push('/dashboard/saft'),
        url: '/dashboard/saft',
        keywords: ['saft', 'd406', 'xml', 'reporting'],
      },
      {
        id: 'nav-settings',
        title: t('sidebar.settings', { defaultValue: 'Settings' }),
        description: 'Application settings',
        icon: <Settings className="w-4 h-4" />,
        category: t('shortcuts.navigation', { defaultValue: 'Navigation' }),
        action: () => router.push('/settings'),
        url: '/settings',
        keywords: ['settings', 'setări', 'preferences', 'config'],
      },

      // Quick Actions
      {
        id: 'action-new-invoice',
        title: t('invoices.new', { defaultValue: 'New Invoice' }),
        description: 'Create a new invoice',
        icon: <FileText className="w-4 h-4" />,
        category: t('shortcuts.actions', { defaultValue: 'Quick Actions' }),
        action: () => router.push('/dashboard/invoices/new'),
        url: '/dashboard/invoices/new',
        keywords: ['new', 'create', 'invoice', 'factură nouă'],
      },
      {
        id: 'action-add-partner',
        title: t('partners.addPartner', { defaultValue: 'Add Partner' }),
        description: 'Create a new partner',
        icon: <Users className="w-4 h-4" />,
        category: t('shortcuts.actions', { defaultValue: 'Quick Actions' }),
        action: () => router.push('/dashboard/partners/new'),
        url: '/dashboard/partners/new',
        keywords: ['new', 'create', 'partner', 'partener nou', 'customer', 'supplier'],
      },
      {
        id: 'action-upload',
        title: t('ocr.uploadForOcr', { defaultValue: 'Upload Document' }),
        description: 'Upload and process with OCR',
        icon: <Upload className="w-4 h-4" />,
        category: t('shortcuts.actions', { defaultValue: 'Quick Actions' }),
        action: () => {
          router.push('/dashboard/ocr');
          // Trigger upload after navigation
          setTimeout(() => {
            const uploadTrigger = document.querySelector<HTMLButtonElement>('[data-upload-trigger]');
            uploadTrigger?.click();
          }, 100);
        },
        keywords: ['upload', 'ocr', 'scan', 'document', 'încarcă'],
      },
      {
        id: 'action-vat-calc',
        title: t('vat.calculateTitle', { defaultValue: 'Calculate VAT' }),
        description: 'VAT 21%/11% calculator',
        icon: <Calculator className="w-4 h-4" />,
        category: t('shortcuts.actions', { defaultValue: 'Quick Actions' }),
        action: () => router.push('/dashboard/vat'),
        url: '/dashboard/vat',
        keywords: ['vat', 'tva', 'calculate', 'calculator'],
      },
      {
        id: 'action-record-payment',
        title: t('payments.recordPayment', { defaultValue: 'Record Payment' }),
        description: 'Record a new payment',
        icon: <Receipt className="w-4 h-4" />,
        category: t('shortcuts.actions', { defaultValue: 'Quick Actions' }),
        action: () => router.push('/dashboard/payments'),
        url: '/dashboard/payments',
        keywords: ['payment', 'plată', 'record', 'cash', 'transfer'],
      },

      // Resources
      {
        id: 'resource-help',
        title: t('nav.help', { defaultValue: 'Help' }),
        description: 'Documentation and support',
        icon: <HelpCircle className="w-4 h-4" />,
        category: t('shortcuts.help', { defaultValue: 'Help & Resources' }),
        action: () => router.push('/dashboard/help'),
        url: '/dashboard/help',
        keywords: ['help', 'support', 'documentation', 'ajutor'],
      },
    ],
    [router, t]
  );

  // Fuzzy search implementation
  const filteredCommands = useMemo(() => {
    if (!search) {
      // Show recent commands when no search
      return commands.map((cmd) => ({
        ...cmd,
        score: recentCommands.includes(cmd.id) ? 100 - recentCommands.indexOf(cmd.id) : 0,
      })).sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    const searchLower = search.toLowerCase();
    const scored = commands
      .map((cmd) => {
        let score = 0;

        // Exact title match
        if (cmd.title.toLowerCase() === searchLower) score += 100;
        // Title starts with search
        else if (cmd.title.toLowerCase().startsWith(searchLower)) score += 50;
        // Title contains search
        else if (cmd.title.toLowerCase().includes(searchLower)) score += 25;

        // Description match
        if (cmd.description?.toLowerCase().includes(searchLower)) score += 15;

        // Keyword match
        const keywordMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(searchLower));
        if (keywordMatch) score += 10;

        // URL match
        if (cmd.url?.toLowerCase().includes(searchLower)) score += 5;

        // Recent commands boost
        if (recentCommands.includes(cmd.id)) score += 20;

        return { ...cmd, score };
      })
      .filter((cmd) => cmd.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored;
  }, [commands, search, recentCommands]);

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
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          saveRecentCommand(selected.id);
          selected.action();
          onClose();
        }
      }
    },
    [isOpen, filteredCommands, selectedIndex, onClose, saveRecentCommand]
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
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Command className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('ocr.searchTemplates', { defaultValue: 'Search commands or navigate...' })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-base"
            autoFocus
          />
          <kbd className="hidden sm:block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No commands found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedCommands).map(([category, items]) => (
                <div key={category} className="mb-1">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {category}
                  </div>
                  {items.map((cmd) => {
                    flatIndex++;
                    const isSelected = flatIndex === selectedIndex;
                    const currentIndex = flatIndex;
                    const isRecent = recentCommands.includes(cmd.id);

                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          saveRecentCommand(cmd.id);
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-md ${
                            isSelected
                              ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {cmd.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{cmd.title}</span>
                            {isRecent && (
                              <Clock className="w-3 h-3 text-blue-500" aria-label="Recently used" />
                            )}
                          </div>
                          {cmd.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {cmd.description}
                            </div>
                          )}
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 flex-shrink-0 ${
                            isSelected ? 'text-primary-500' : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">Enter</kbd>
                select
              </span>
            </div>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">⌘K</kbd>
              to open
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
