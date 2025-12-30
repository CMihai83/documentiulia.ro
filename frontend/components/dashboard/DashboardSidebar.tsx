'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Calculator,
  FileSpreadsheet,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Scan,
  FileType,
  Map,
  Building,
  Building2,
  CreditCard,
  PieChart,
  Shield,
  Truck,
  BarChart3,
  Wallet,
  Menu,
  X,
  HelpCircle,
  PlayCircle,
  ShoppingCart,
  Target,
  Package,
  ClipboardCheck,
  Briefcase,
  HeartPulse,
  GraduationCap,
  MessageSquare,
  Code,
  Cog,
  Rocket,
  Scale,
  FileCheck,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { OrganizationSelector } from '@/components/organization/OrganizationSelector';
import { ModuleConfigModal } from './ModuleConfigModal';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  defaultLabel: string;
}

interface NavSection {
  title: string;
  titleKey: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Principal',
    titleKey: 'sectionMain',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, labelKey: 'overview', defaultLabel: 'Panou Principal' },
      { href: '/dashboard/analytics', icon: BarChart3, labelKey: 'analytics', defaultLabel: 'Analytics' },
    ],
  },
  {
    title: 'Servicii Business',
    titleKey: 'sectionServices',
    items: [
      { href: '/dashboard/services', icon: Rocket, labelKey: 'services', defaultLabel: 'Înființare Firme' },
      { href: '/dashboard/services/srl', icon: Building2, labelKey: 'srl', defaultLabel: 'Înființare SRL' },
      { href: '/dashboard/services/pfa', icon: Briefcase, labelKey: 'pfa', defaultLabel: 'Înregistrare PFA' },
      { href: '/dashboard/services/legal-forms', icon: Scale, labelKey: 'legalForms', defaultLabel: 'Alte Forme Juridice' },
      { href: '/dashboard/services/templates', icon: FileText, labelKey: 'templates', defaultLabel: 'Șabloane Documente' },
    ],
  },
  {
    title: 'Documente',
    titleKey: 'sectionDocuments',
    items: [
      { href: '/dashboard/documents', icon: FolderOpen, labelKey: 'documents', defaultLabel: 'Documente' },
      { href: '/dashboard/ocr', icon: Scan, labelKey: 'ocr', defaultLabel: 'OCR Documente' },
      { href: '/dashboard/invoices', icon: Receipt, labelKey: 'invoices', defaultLabel: 'Facturi' },
      { href: '/dashboard/efactura', icon: FileText, labelKey: 'efactura', defaultLabel: 'e-Factura' },
    ],
  },
  {
    title: 'Finanțe',
    titleKey: 'sectionFinance',
    items: [
      { href: '/dashboard/finance', icon: Wallet, labelKey: 'finance', defaultLabel: 'Finanțe' },
      { href: '/dashboard/accounting', icon: Calculator, labelKey: 'accounting', defaultLabel: 'Contabilitate' },
      { href: '/dashboard/payments', icon: CreditCard, labelKey: 'payments', defaultLabel: 'Plăți' },
      { href: '/dashboard/vat', icon: Calculator, labelKey: 'vat', defaultLabel: 'Rapoarte TVA' },
      { href: '/dashboard/saft', icon: FileSpreadsheet, labelKey: 'saft', defaultLabel: 'SAF-T D406' },
      { href: '/dashboard/reports', icon: PieChart, labelKey: 'reports', defaultLabel: 'Rapoarte' },
    ],
  },
  {
    title: 'Proiecte',
    titleKey: 'sectionProjects',
    items: [
      { href: '/dashboard/projects', icon: Briefcase, labelKey: 'projects', defaultLabel: 'Management Proiecte' },
    ],
  },
  {
    title: 'E-Commerce & CRM',
    titleKey: 'sectionCommerce',
    items: [
      { href: '/dashboard/ecommerce', icon: ShoppingCart, labelKey: 'ecommerce', defaultLabel: 'E-Commerce' },
      { href: '/dashboard/crm', icon: Target, labelKey: 'crm', defaultLabel: 'CRM' },
      { href: '/dashboard/partners', icon: Building, labelKey: 'partners', defaultLabel: 'Parteneri' },
    ],
  },
  {
    title: 'Supply Chain',
    titleKey: 'sectionSupplyChain',
    items: [
      { href: '/dashboard/warehouse', icon: Package, labelKey: 'warehouse', defaultLabel: 'Depozit & Inventar' },
      { href: '/dashboard/procurement', icon: Briefcase, labelKey: 'procurement', defaultLabel: 'Achiziții' },
      { href: '/dashboard/logistics', icon: Truck, labelKey: 'logistics', defaultLabel: 'Logistică' },
      { href: '/dashboard/fleet', icon: Truck, labelKey: 'fleet', defaultLabel: 'Flotă' },
    ],
  },
  {
    title: 'Calitate & Conformitate',
    titleKey: 'sectionQuality',
    items: [
      { href: '/dashboard/quality', icon: ClipboardCheck, labelKey: 'quality', defaultLabel: 'Management Calitate' },
      { href: '/dashboard/hse', icon: HeartPulse, labelKey: 'hse', defaultLabel: 'HSE' },
      { href: '/dashboard/audit', icon: Shield, labelKey: 'audit', defaultLabel: 'Jurnal Audit' },
      { href: '/dashboard/anaf', icon: FileCheck, labelKey: 'anafStatus', defaultLabel: 'Status ANAF' },
    ],
  },
  {
    title: 'HR & Echipă',
    titleKey: 'sectionHR',
    items: [
      { href: '/dashboard/hr', icon: Users, labelKey: 'hr', defaultLabel: 'HR & Salarizare' },
      { href: '/dashboard/freelancer', icon: Briefcase, labelKey: 'freelancer', defaultLabel: 'Hub Freelanceri' },
      { href: '/dashboard/lms', icon: GraduationCap, labelKey: 'lms', defaultLabel: 'Training (LMS)' },
      { href: '/simulation', icon: Target, labelKey: 'simulation', defaultLabel: 'Simulator Business' },
    ],
  },
  {
    title: 'Comunitate',
    titleKey: 'sectionCommunity',
    items: [
      { href: '/dashboard/forum', icon: MessageSquare, labelKey: 'forum', defaultLabel: 'Forum' },
      { href: '/dashboard/blog', icon: FileText, labelKey: 'blog', defaultLabel: 'Blog' },
    ],
  },
  {
    title: 'Dezvoltare',
    titleKey: 'sectionDeveloper',
    items: [
      { href: '/dashboard/developer', icon: Code, labelKey: 'developer', defaultLabel: 'API & Integrări' },
      { href: '/dashboard/roadmap', icon: Map, labelKey: 'roadmap', defaultLabel: 'Roadmap Produs' },
    ],
  },
  {
    title: 'Ajutor',
    titleKey: 'sectionHelp',
    items: [
      { href: '/dashboard/tutorials', icon: PlayCircle, labelKey: 'tutorials', defaultLabel: 'Tutoriale Video' },
      { href: '/dashboard/help', icon: HelpCircle, labelKey: 'help', defaultLabel: 'Ghid Utilizare' },
    ],
  },
];

// Flat list for backward compatibility
const navItems: NavItem[] = navSections.flatMap(section => section.items);

// Map href to module ID for filtering
const hrefToModuleId: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/dashboard/analytics': 'analytics',
  '/dashboard/services': 'services',
  '/dashboard/services/srl': 'srl',
  '/dashboard/services/pfa': 'pfa',
  '/dashboard/services/legal-forms': 'legal-forms',
  '/dashboard/services/templates': 'templates',
  '/dashboard/documents': 'documents',
  '/dashboard/ocr': 'ocr',
  '/dashboard/invoices': 'invoices',
  '/dashboard/efactura': 'efactura',
  '/dashboard/finance': 'finance',
  '/dashboard/accounting': 'accounting',
  '/dashboard/payments': 'payments',
  '/dashboard/vat': 'vat',
  '/dashboard/saft': 'saft',
  '/dashboard/reports': 'reports',
  '/dashboard/projects': 'projects',
  '/dashboard/ecommerce': 'ecommerce',
  '/dashboard/crm': 'crm',
  '/dashboard/partners': 'partners',
  '/dashboard/warehouse': 'warehouse',
  '/dashboard/procurement': 'procurement',
  '/dashboard/logistics': 'logistics',
  '/dashboard/fleet': 'fleet',
  '/dashboard/quality': 'quality',
  '/dashboard/hse': 'hse',
  '/dashboard/audit': 'audit',
  '/dashboard/hr': 'hr',
  '/dashboard/payroll': 'payroll',
  '/dashboard/contracts': 'contracts',
  '/dashboard/freelancer': 'freelancer',
  '/dashboard/lms': 'lms',
  '/dashboard/employee-portal': 'employee-portal',
  '/dashboard/scheduling': 'scheduling',
  '/dashboard/forum': 'forum',
  '/dashboard/blog': 'blog',
  '/dashboard/developer': 'developer',
  '/dashboard/integrations': 'integrations',
  '/dashboard/webhooks': 'webhooks',
  '/dashboard/roadmap': 'roadmap',
  '/dashboard/tutorials': 'tutorials',
  '/dashboard/help': 'help',
  '/dashboard/ai-assistant': 'ai-assistant',
  '/dashboard/settings': 'settings',
  '/dashboard/admin': 'admin',
  '/dashboard/monitoring': 'monitoring',
  '/simulation': 'simulation',
  '/dashboard/client-portal': 'client-portal',
  '/dashboard/workflow': 'workflow',
};

export function DashboardSidebar() {
  const t = useTranslations('sidebar');
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Dashboard preferences hook
  const { preferences, isModuleEnabled } = useDashboardPreferences();

  // Filter nav items based on user preferences
  const filteredNavItems = useMemo(() => {
    if (!preferences) return navItems;

    return navItems.filter(item => {
      const moduleId = hrefToModuleId[item.href];
      // Always show dashboard and settings
      if (moduleId === 'dashboard' || moduleId === 'settings') return true;
      // Check if module is enabled
      return moduleId ? isModuleEnabled(moduleId) : true;
    });
  }, [preferences, isModuleEnabled]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Extract locale from pathname (e.g., /ro/dashboard -> ro)
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : 'ro';

  const isActive = (href: string) => {
    const fullPath = `/${locale}${href}`;
    if (href === '/dashboard') {
      return pathname === fullPath;
    }
    return pathname.startsWith(fullPath);
  };

  // Sidebar content (shared between mobile and desktop)
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
        {(!collapsed || isMobile) && (
          <h2 className="font-semibold text-gray-800 truncate text-sm sm:text-base">
            {t('title') || 'Navigare'}
          </h2>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 hidden md:block"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Organization Selector */}
      <div className="p-2 border-b border-gray-200">
        <OrganizationSelector collapsed={!isMobile && collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 sm:space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const fullHref = `/${locale}${item.href}`;

          return (
            <a
              key={item.href}
              href={fullHref}
              onClick={() => isMobile && setMobileOpen(false)}
              className={`
                flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors
                ${active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100'
                }
                ${!isMobile && collapsed ? 'justify-center' : ''}
              `}
              title={!isMobile && collapsed ? (t(item.labelKey) || item.defaultLabel) : undefined}
            >
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              {(isMobile || !collapsed) && (
                <span className="truncate text-sm sm:text-base">{t(item.labelKey) || item.defaultLabel}</span>
              )}
            </a>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="p-2 border-t border-gray-200 space-y-1">
        {/* Module Configuration Button */}
        <button
          onClick={() => setShowConfigModal(true)}
          className={`
            w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors
            text-gray-600 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100
            ${!isMobile && collapsed ? 'justify-center' : ''}
          `}
          title={!isMobile && collapsed ? (t('configureModules') || 'Configurează Module') : undefined}
        >
          <Cog className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          {(isMobile || !collapsed) && (
            <span className="truncate text-sm sm:text-base">{t('configureModules') || 'Configurează Module'}</span>
          )}
        </button>

        {/* Settings Link */}
        <a
          href={`/${locale}/dashboard/settings`}
          onClick={() => isMobile && setMobileOpen(false)}
          className={`
            flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors
            text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100
            ${!isMobile && collapsed ? 'justify-center' : ''}
          `}
          title={!isMobile && collapsed ? (t('settings') || 'Setari') : undefined}
        >
          <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          {(isMobile || !collapsed) && (
            <span className="truncate text-sm sm:text-base">{t('settings') || 'Setari'}</span>
          )}
        </a>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button - Fixed at top-left corner on mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-[72px] left-3 z-40 p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 active:bg-gray-100"
        aria-label="Deschide meniul de navigare"
        aria-expanded={mobileOpen}
        aria-controls="mobile-sidebar"
      >
        <Menu className="h-5 w-5 text-gray-600" aria-hidden="true" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          role="presentation"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        id="mobile-sidebar"
        className={`
          md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-gray-200
          flex flex-col transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Meniu principal mobil"
        aria-hidden={!mobileOpen}
      >
        <SidebarContent isMobile={true} />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex bg-white border-r border-gray-200 h-full flex-col transition-all duration-300
          ${collapsed ? 'w-16' : 'w-64'}
        `}
        role="navigation"
        aria-label="Meniu principal desktop"
      >
        <SidebarContent isMobile={false} />
      </aside>

      {/* Module Configuration Modal */}
      <ModuleConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </>
  );
}
