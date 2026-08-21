'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
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
  ChevronDown,
  Scan,
  Map,
  Building,
  Building2,
  CreditCard,
  PieChart,
  Shield,
  Truck,
  BarChart3,
  Database,
  Gauge,
  Wallet,
  Landmark,
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
  Server,
  MessageSquare,
  Code,
  Cog,
  Rocket,
  Inbox,
  LifeBuoy,
  Scale,
  FileCheck,
  Lock,
  Search,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { OrganizationSelector } from '@/components/organization/OrganizationSelector';
import { ModuleConfigModal } from './ModuleConfigModal';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  defaultLabel: string;
}

interface NavBundle {
  id: string;
  titleKey: string;
  defaultTitle: string;
  items: NavItem[];
}

/**
 * 7 job-based bundles. Order and membership are the product's information
 * architecture — an accountant's daily work (Facturare & Fiscal) sits right
 * under Acasă; growth/advisory tools live together; platform/compliance last.
 */
const navBundles: NavBundle[] = [
  {
    id: 'acasa',
    titleKey: 'bundleAcasa',
    defaultTitle: 'Acasă',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, labelKey: 'overview', defaultLabel: 'Panou Principal' },
      { href: '/dashboard/analytics', icon: BarChart3, labelKey: 'analytics', defaultLabel: 'Analytics' },
    ],
  },
  {
    id: 'fiscal',
    titleKey: 'bundleFiscal',
    defaultTitle: 'Facturare & Fiscal',
    items: [
      { href: '/dashboard/invoices', icon: Receipt, labelKey: 'invoices', defaultLabel: 'Facturi' },
      { href: '/dashboard/e-invoice', icon: FileText, labelKey: 'efactura', defaultLabel: 'e-Factura' },
      { href: '/dashboard/vat', icon: Calculator, labelKey: 'vat', defaultLabel: 'TVA & D300' },
      { href: '/dashboard/saft', icon: FileSpreadsheet, labelKey: 'saft', defaultLabel: 'SAF-T D406' },
      { href: '/dashboard/anaf-status', icon: FileCheck, labelKey: 'anafStatus', defaultLabel: 'Status ANAF' },
      { href: '/dashboard/documents', icon: FolderOpen, labelKey: 'documents', defaultLabel: 'Documente' },
      { href: '/dashboard/ocr', icon: Scan, labelKey: 'ocr', defaultLabel: 'OCR Documente' },
      { href: '/dashboard/accounting', icon: Calculator, labelKey: 'accounting', defaultLabel: 'Contabilitate' },
      { href: '/dashboard/reports', icon: PieChart, labelKey: 'reports', defaultLabel: 'Rapoarte' },
      { href: '/dashboard/audit', icon: Shield, labelKey: 'audit', defaultLabel: 'Jurnal Audit' },
    ],
  },
  {
    id: 'bani',
    titleKey: 'bundleBani',
    defaultTitle: 'Bani',
    items: [
      { href: '/dashboard/finance', icon: Wallet, labelKey: 'finance', defaultLabel: 'Trezorerie' },
      { href: '/dashboard/bank-reconciliation', icon: Landmark, labelKey: 'bankReconciliation', defaultLabel: 'Reconciliere bancară' },
      { href: '/dashboard/payments', icon: CreditCard, labelKey: 'payments', defaultLabel: 'Plăți' },
      { href: '/dashboard/expenses', icon: Receipt, labelKey: 'expenses', defaultLabel: 'Cheltuieli' },
      { href: '/dashboard/assets', icon: Building, labelKey: 'assets', defaultLabel: 'Active' },
      { href: '/dashboard/controlling', icon: Gauge, labelKey: 'controlling', defaultLabel: 'Controlling' },
    ],
  },
  {
    id: 'operatiuni',
    titleKey: 'bundleOperatiuni',
    defaultTitle: 'Operațiuni',
    items: [
      { href: '/dashboard/inventory', icon: Package, labelKey: 'inventory', defaultLabel: 'Stocuri' },
      { href: '/dashboard/warehouse', icon: Package, labelKey: 'warehouse', defaultLabel: 'Depozit' },
      { href: '/dashboard/procurement', icon: Briefcase, labelKey: 'procurement', defaultLabel: 'Achiziții' },
      { href: '/dashboard/logistics', icon: Truck, labelKey: 'logistics', defaultLabel: 'Logistică' },
      { href: '/dashboard/fleet', icon: Truck, labelKey: 'fleet', defaultLabel: 'Flotă' },
      { href: '/dashboard/quality', icon: ClipboardCheck, labelKey: 'quality', defaultLabel: 'Calitate' },
      { href: '/dashboard/hse', icon: HeartPulse, labelKey: 'hse', defaultLabel: 'HSE' },
      { href: '/dashboard/ecommerce', icon: ShoppingCart, labelKey: 'ecommerce', defaultLabel: 'E-Commerce' },
      { href: '/dashboard/crm', icon: Target, labelKey: 'crm', defaultLabel: 'CRM' },
      { href: '/dashboard/partners', icon: Building2, labelKey: 'partners', defaultLabel: 'Parteneri' },
      { href: '/dashboard/projects', icon: Briefcase, labelKey: 'projects', defaultLabel: 'Proiecte' },
      { href: '/dashboard/contracts', icon: FileCheck, labelKey: 'contracts', defaultLabel: 'Contracte' },
    ],
  },
  {
    id: 'oameni',
    titleKey: 'bundleOameni',
    defaultTitle: 'Oameni',
    items: [
      { href: '/dashboard/hr', icon: Users, labelKey: 'hr', defaultLabel: 'HR & Salarizare' },
      { href: '/dashboard/ats', icon: UserCheck, labelKey: 'ats', defaultLabel: 'Recrutare (ATS)' },
      { href: '/dashboard/employee-portal', icon: Users, labelKey: 'employeePortal', defaultLabel: 'Portal Angajat' },
      { href: '/dashboard/freelancer', icon: Briefcase, labelKey: 'freelancer', defaultLabel: 'Hub Freelanceri' },
      { href: '/dashboard/expertise', icon: GraduationCap, labelKey: 'expertise', defaultLabel: 'Expertiză & Competențe' },
      { href: '/dashboard/lms', icon: GraduationCap, labelKey: 'lms', defaultLabel: 'Training (LMS)' },
      { href: '/dashboard/workspaces', icon: Server, labelKey: 'workspaces', defaultLabel: 'Spații de Lucru' },
    ],
  },
  {
    id: 'crestere',
    titleKey: 'bundleCrestere',
    defaultTitle: 'Creștere',
    items: [
      { href: '/simulation', icon: Target, labelKey: 'simulation', defaultLabel: 'Simulator Business' },
      { href: '/dashboard/business-case', icon: FileText, labelKey: 'businessCase', defaultLabel: 'Business Case' },
      { href: '/dashboard/funds', icon: Landmark, labelKey: 'funds', defaultLabel: 'Fonduri Europene' },
      { href: '/dashboard/consulting', icon: Briefcase, labelKey: 'consulting', defaultLabel: 'Consultanță' },
      { href: '/dashboard/services', icon: Rocket, labelKey: 'services', defaultLabel: 'Înființare Firme' },
      { href: '/dashboard/services/srl', icon: Building2, labelKey: 'srl', defaultLabel: 'Înființare SRL' },
      { href: '/dashboard/services/pfa', icon: Briefcase, labelKey: 'pfa', defaultLabel: 'Înregistrare PFA' },
      { href: '/dashboard/services/legal-forms', icon: Scale, labelKey: 'legalForms', defaultLabel: 'Alte Forme Juridice' },
      { href: '/dashboard/services/templates', icon: FileText, labelKey: 'templates', defaultLabel: 'Șabloane Documente' },
      { href: '/dashboard/forum', icon: MessageSquare, labelKey: 'forum', defaultLabel: 'Forum' },
      { href: '/dashboard/blog', icon: FileText, labelKey: 'blog', defaultLabel: 'Blog' },
    ],
  },
  {
    id: 'platforma',
    titleKey: 'bundlePlatforma',
    defaultTitle: 'Platformă & Conformitate',
    items: [
      { href: '/dashboard/gdpr-toolkit', icon: Shield, labelKey: 'gdprToolkit', defaultLabel: 'GDPR Toolkit' },
      { href: '/dashboard/gdpr', icon: Shield, labelKey: 'gdprInternal', defaultLabel: 'GDPR (date personale)' },
      { href: '/dashboard/security', icon: Shield, labelKey: 'security', defaultLabel: 'Securitate' },
      { href: '/dashboard/data-migration', icon: Database, labelKey: 'dataMigration', defaultLabel: 'Migrare Date' },
      { href: '/dashboard/developer', icon: Code, labelKey: 'developer', defaultLabel: 'API & Integrări' },
      { href: '/dashboard/settings', icon: Settings, labelKey: 'settings', defaultLabel: 'Setări' },
    ],
  },
  {
    // REQ-049: staff back-office — visible only to ADMIN / ACCOUNTANT (see keep()).
    id: 'administrare',
    titleKey: 'bundleAdministrare',
    defaultTitle: 'Administrare (echipă)',
    items: [
      { href: '/dashboard/admin', icon: LayoutDashboard, labelKey: 'adminOverview', defaultLabel: 'Panou echipă' },
      { href: '/dashboard/admin/clients', icon: Users, labelKey: 'adminClients', defaultLabel: 'Clienți' },
      { href: '/dashboard/admin/requests', icon: Inbox, labelKey: 'adminRequests', defaultLabel: 'Cereri clienți' },
      { href: '/dashboard/admin/error-logs', icon: AlertTriangle, labelKey: 'errorLogs', defaultLabel: 'Jurnal Erori' },
    ],
  },
];

/** Slim footer group — help & product info, outside the bundles. */
const footerItems: NavItem[] = [
  { href: '/dashboard/tutorials', icon: PlayCircle, labelKey: 'tutorials', defaultLabel: 'Tutoriale Video' },
  { href: '/dashboard/help', icon: HelpCircle, labelKey: 'help', defaultLabel: 'Ghid Utilizare' },
  { href: '/dashboard/support', icon: LifeBuoy, labelKey: 'support', defaultLabel: 'Ajutor · Cererile mele' },
  { href: '/dashboard/roadmap', icon: Map, labelKey: 'roadmap', defaultLabel: 'Roadmap Produs' },
];

const DEFAULT_OPEN = ['acasa', 'fiscal'];
/** Sentinel so "user expanded everything" is distinguishable from "fresh user". */
const NONE_COLLAPSED = '__none__';

// Minimum subscription tier per route (mirrors backend TierGuard).
// Locked items stay VISIBLE with a tier chip and route to the subscription page.
const TIER_ORDER = ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'] as const;
const minTierByHref: Record<string, (typeof TIER_ORDER)[number]> = {
  '/simulation': 'PRO',
  '/dashboard/lms': 'PRO',
  '/dashboard/expertise': 'PRO',
  '/dashboard/workspaces': 'PRO',
  '/dashboard/hr': 'PRO',
  '/dashboard/payroll': 'PRO',
  '/dashboard/freelancer': 'PRO',
  '/dashboard/consulting': 'PRO',
  '/dashboard/services/templates': 'PRO',
  '/dashboard/business-case': 'PRO',
  '/dashboard/funds': 'PRO',
  '/dashboard/controlling': 'BUSINESS',
  '/dashboard/data-migration': 'BUSINESS',
  '/dashboard/developer': 'BUSINESS',
};
const tierRank = (t?: string) => Math.max(0, TIER_ORDER.indexOf((t as any) ?? 'FREE'));

// Map href to module ID for org-level module preferences (unchanged behavior:
// org-disabled modules stay hidden — that is the org's explicit choice).
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
  '/dashboard/e-invoice': 'efactura',
  '/dashboard/finance': 'finance',
  '/dashboard/accounting': 'accounting',
  '/dashboard/controlling': 'controlling',
  '/dashboard/data-migration': 'dataMigration',
  '/dashboard/payments': 'payments',
  '/dashboard/vat': 'vat',
  '/dashboard/saft': 'saft',
  '/dashboard/reports': 'reports',
  '/dashboard/projects': 'projects',
  '/dashboard/ecommerce': 'ecommerce',
  '/dashboard/crm': 'crm',
  '/dashboard/partners': 'partners',
  '/dashboard/consulting': 'consulting',
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
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [filter, setFilter] = useState('');
  // null = not initialized from preferences yet
  const [openBundles, setOpenBundles] = useState<Set<string> | null>(null);

  const { preferences, isModuleEnabled, updatePreferences } = useDashboardPreferences();
  const { user } = useAuth();
  const userTierRank = tierRank(user?.tier);
  const lockedTier = (href: string): (typeof TIER_ORDER)[number] | null => {
    const min = minTierByHref[href];
    return min && userTierRank < TIER_ORDER.indexOf(min) ? min : null;
  };

  const label = useCallback(
    (item: NavItem) => {
      try {
        return t(item.labelKey) || item.defaultLabel;
      } catch {
        return item.defaultLabel;
      }
    },
    [t],
  );

  // Org-level module preferences: disabled modules stay HIDDEN (unchanged).
  const isAdmin = user?.role === 'ADMIN';
  const isStaff = isAdmin || user?.role === 'ACCOUNTANT';
  const visibleBundles = useMemo(() => {
    const keep = (item: NavItem) => {
      // REQ-049: the staff bundle is for ADMIN/ACCOUNTANT; error logs ADMIN only.
      if (item.href === '/dashboard/admin/error-logs' && !isAdmin) return false;
      if (item.href.startsWith('/dashboard/admin') && !isStaff) return false;
      const moduleId = hrefToModuleId[item.href];
      if (moduleId === 'dashboard' || moduleId === 'settings') return true;
      if (!preferences) return true;
      return moduleId ? isModuleEnabled(moduleId) : true;
    };
    return navBundles
      .map((b) => ({ ...b, items: b.items.filter(keep) }))
      .filter((b) => b.items.length > 0);
  }, [preferences, isModuleEnabled, isAdmin, isStaff]);

  // Filter (consumption model C): matches item labels in the active locale AND
  // the Romanian defaults, so both languages find things.
  const query = filter.trim().toLowerCase();
  const filteredBundles = useMemo(() => {
    if (!query) return visibleBundles;
    return visibleBundles
      .map((b) => ({
        ...b,
        items: b.items.filter(
          (i) =>
            label(i).toLowerCase().includes(query) ||
            i.defaultLabel.toLowerCase().includes(query),
        ),
      }))
      .filter((b) => b.items.length > 0);
  }, [visibleBundles, query, label]);

  // Extract locale from pathname (e.g., /ro/dashboard -> ro)
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : 'ro';

  const isActive = (href: string) => {
    const fullPath = `/${locale}${href}`;
    if (href === '/dashboard') return pathname === fullPath;
    return pathname.startsWith(fullPath);
  };

  const activeBundleId = useMemo(() => {
    // Longest-href match wins so /dashboard/services/templates doesn't light up /dashboard.
    let best: { id: string; len: number } | null = null;
    for (const b of navBundles) {
      for (const i of b.items) {
        if (isActive(i.href) && (!best || i.href.length > best.len)) {
          best = { id: b.id, len: i.href.length };
        }
      }
    }
    return best?.id ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, locale]);

  // Initialize open/collapsed state from persisted preferences (consumption model A).
  useEffect(() => {
    if (openBundles !== null || preferences === null) return;
    const stored = (preferences.collapsedSections ?? []).filter(Boolean);
    const known = new Set(navBundles.map((b) => b.id));
    const storedKnown = stored.filter((s) => known.has(s) || s === NONE_COLLAPSED);
    let open: Set<string>;
    if (storedKnown.length === 0) {
      // Fresh user (or legacy data from the old flat sidebar): defaults.
      open = new Set(DEFAULT_OPEN);
    } else if (storedKnown.includes(NONE_COLLAPSED)) {
      open = new Set(navBundles.map((b) => b.id).filter((id) => !storedKnown.includes(id)));
    } else {
      open = new Set(navBundles.map((b) => b.id).filter((id) => !storedKnown.includes(id)));
    }
    setOpenBundles(open);
  }, [preferences, openBundles]);

  const effectiveOpen = openBundles ?? new Set(DEFAULT_OPEN);

  const toggleBundle = (id: string) => {
    const next = new Set(effectiveOpen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenBundles(next);
    // Persist best-effort; sentinel keeps "everything open" distinguishable from "fresh".
    const collapsedIds = navBundles.map((b) => b.id).filter((bid) => !next.has(bid));
    void updatePreferences({
      collapsedSections: collapsedIds.length ? collapsedIds : [NONE_COLLAPSED],
    }).catch(() => {});
  };

  const isBundleOpen = (id: string) => {
    if (query) return true; // filtering auto-expands matches
    return effectiveOpen.has(id);
  };

  // Auto-expand the bundle containing the active route on navigation,
  // without persisting — the user's saved collapse choices stay intact,
  // and the header toggle keeps working (they can re-collapse it).
  useEffect(() => {
    if (!activeBundleId) return;
    setOpenBundles((prev) => {
      const base = prev ?? new Set(DEFAULT_OPEN);
      if (base.has(activeBundleId)) return prev;
      const next = new Set(base);
      next.add(activeBundleId);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBundleId]);

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
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const renderItem = (item: NavItem, isMobile: boolean) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const fullHref = `/${locale}${item.href}`;
    const locked = lockedTier(item.href);
    const text = label(item);
    const iconOnly = !isMobile && collapsed;

    if (locked) {
      // Consumption model B: visible + upsell, never hidden.
      let requiresText = `Necesită planul ${locked}`;
      try {
        requiresText = t('requiresPlan', { plan: locked });
      } catch {
        /* fallback above */
      }
      return (
        <button
          key={item.href}
          onClick={() => {
            if (isMobile) setMobileOpen(false);
            router.push(`/${locale}/dashboard/settings/subscription`);
          }}
          aria-label={`${text} — ${requiresText}`}
          title={iconOnly ? `${text} — ${locked}` : requiresText}
          className={`
            w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors
            text-gray-400 hover:bg-gray-50 hover:text-gray-500
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            ${iconOnly ? 'justify-center' : ''}
          `}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-gray-300" />
          {!iconOnly && (
            <>
              <span className="truncate text-sm sm:text-base">{text}</span>
              <span className="ml-auto flex items-center gap-1 flex-shrink-0">
                <Lock className="h-3 w-3 text-gray-400" aria-hidden="true" />
                <span className="text-[10px] font-semibold tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-px tabular-nums">
                  {locked}
                </span>
              </span>
            </>
          )}
        </button>
      );
    }

    return (
      <a
        key={item.href}
        href={fullHref}
        onClick={() => isMobile && setMobileOpen(false)}
        className={`
          flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          ${active
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100'
          }
          ${iconOnly ? 'justify-center' : ''}
        `}
        title={iconOnly ? text : undefined}
      >
        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
        {!iconOnly && <span className="truncate text-sm sm:text-base">{text}</span>}
      </a>
    );
  };

  // NOTE: a render function, not a nested component — a nested component would
  // remount on every keystroke and the filter input would lose focus.
  const renderSidebarContent = (isMobile: boolean) => {
    const iconOnly = !isMobile && collapsed;
    let filterPlaceholder = 'Caută în meniu…';
    let bundleTitle = (b: NavBundle) => b.defaultTitle;
    try {
      filterPlaceholder = t('filterPlaceholder');
    } catch {
      /* fallback */
    }
    bundleTitle = (b: NavBundle) => {
      try {
        return t(b.titleKey) || b.defaultTitle;
      } catch {
        return b.defaultTitle;
      }
    };

    return (
      <>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
          {!iconOnly && (
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
              {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
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
          <OrganizationSelector collapsed={iconOnly} />
        </div>

        {/* Filter (consumption model C) */}
        {!iconOnly && (
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setFilter('');
                  }
                }}
                placeholder={filterPlaceholder}
                aria-label={filterPlaceholder}
                className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-gray-400"
              />
            </div>
          </div>
        )}

        {/* Navigation bundles (consumption model A) */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {filteredBundles.map((bundle) => {
            const open = isBundleOpen(bundle.id);
            if (iconOnly) {
              // Collapsed rail: flat icons, no headers.
              return bundle.items.map((item) => renderItem(item, isMobile));
            }
            return (
              <div key={bundle.id}>
                <button
                  onClick={() => toggleBundle(bundle.id)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 mt-1 rounded-md text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className="truncate">{bundleTitle(bundle)}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
                    aria-hidden="true"
                  />
                </button>
                {open && (
                  <div className="space-y-0.5 mt-0.5">
                    {bundle.items.map((item) => renderItem(item, isMobile))}
                  </div>
                )}
              </div>
            );
          })}
          {query && filteredBundles.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-500">
              {(() => {
                try {
                  return t('filterNoResults');
                } catch {
                  return 'Niciun rezultat.';
                }
              })()}
            </p>
          )}
        </nav>

        {/* Footer: help group + module config */}
        <div className="p-2 border-t border-gray-200 space-y-0.5">
          {footerItems.map((item) => renderItem(item, isMobile))}
          <button
            onClick={() => setShowConfigModal(true)}
            className={`
              w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors
              text-gray-600 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              ${iconOnly ? 'justify-center' : ''}
            `}
            title={iconOnly ? (t('configureModules') || 'Configurează Module') : undefined}
          >
            <Cog className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            {!iconOnly && (
              <span className="truncate text-sm sm:text-base">{t('configureModules') || 'Configurează Module'}</span>
            )}
          </button>
        </div>
      </>
    );
  };

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
        {renderSidebarContent(true)}
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
        {renderSidebarContent(false)}
      </aside>

      {/* Module Configuration Modal */}
      <ModuleConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </>
  );
}
