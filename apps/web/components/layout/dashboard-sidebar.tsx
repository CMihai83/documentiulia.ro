'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Package,
  Building2,
  PiggyBank,
  BarChart3,
  Settings,
  HelpCircle,
  FileCheck,
  Upload,
  Calculator,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function DashboardSidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  const navigation: NavSection[] = [
    {
      title: 'Principal',
      items: [
        {
          label: t('dashboard'),
          href: '/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Vânzări',
      items: [
        {
          label: t('invoices'),
          href: '/invoices',
          icon: FileText,
          badge: 3,
        },
        {
          label: t('clients'),
          href: '/clients',
          icon: Users,
        },
        {
          label: t('products'),
          href: '/products',
          icon: Package,
        },
      ],
    },
    {
      title: 'Cheltuieli',
      items: [
        {
          label: t('expenses'),
          href: '/expenses',
          icon: Receipt,
        },
        {
          label: t('receipts'),
          href: '/receipts',
          icon: Upload,
        },
        {
          label: t('suppliers'),
          href: '/suppliers',
          icon: Building2,
        },
      ],
    },
    {
      title: 'Finanțe',
      items: [
        {
          label: t('bankAccounts'),
          href: '/bank-accounts',
          icon: PiggyBank,
        },
        {
          label: t('reports'),
          href: '/reports',
          icon: BarChart3,
        },
        {
          label: t('vat'),
          href: '/vat',
          icon: Calculator,
        },
      ],
    },
    {
      title: 'ANAF',
      items: [
        {
          label: 'e-Factura',
          href: '/efactura',
          icon: FileCheck,
          badge: 'Nou',
        },
        {
          label: 'SAF-T (D406)',
          href: '/saft',
          icon: FileText,
        },
      ],
    },
  ];

  const bottomNav: NavItem[] = [
    {
      label: t('settings'),
      href: '/settings',
      icon: Settings,
    },
    {
      label: t('help'),
      href: '/help',
      icon: HelpCircle,
    },
  ];

  const isActive = (href: string) => {
    // Remove locale prefix from pathname for comparison
    const path = pathname.replace(/^\/(ro|en)/, '');
    return path === href || path.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50 h-screen w-64
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="font-semibold text-lg">DocumentIulia</span>
          </Link>
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navigation.map((section) => (
            <div key={section.title} className="mb-6">
              <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                        ${
                          isActive(item.href)
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          className={`
                            px-2 py-0.5 text-xs font-medium rounded-full
                            ${
                              typeof item.badge === 'number'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                            }
                          `}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom navigation */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-3">
          <ul className="space-y-1">
            {bottomNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                    ${
                      isActive(item.href)
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}
