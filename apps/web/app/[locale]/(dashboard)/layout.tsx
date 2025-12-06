'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { User } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  Bell,
  Search,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Calendar,
  MessageSquare,
  GraduationCap,
  Coins,
  Leaf,
  Building2,
  PiggyBank,
  Upload,
  FileCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { CompanySelector } from '@/components/layout/company-selector';
import { NotificationsDropdown } from '@/components/layout/notifications-dropdown';
import { SearchModal } from '@/components/layout/search-modal';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { UserMenu } from '@/components/layout/user-menu';
import { QuickActionsFab } from '@/components/layout/quick-actions-fab';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const primaryNav: NavItem[] = [
    { label: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { label: t('invoices'), href: '/invoices', icon: FileText, badge: 3 },
    { label: t('bills'), href: '/bills', icon: Building2, badge: 2 },
    { label: t('expenses'), href: '/expenses', icon: Receipt },
    { label: t('receipts'), href: '/receipts', icon: Upload },
    { label: t('banking'), href: '/banking', icon: PiggyBank },
    { label: t('contacts'), href: '/contacts', icon: Users },
    { label: t('products'), href: '/products', icon: Package },
    { label: t('reports'), href: '/reports', icon: BarChart3 },
  ];

  const fiscalNav: NavItem[] = [
    { label: t('efactura'), href: '/efactura', icon: FileText },
    { label: t('saft'), href: '/saft', icon: FileText },
    { label: t('aiConsultant'), href: '/ai-consultant', icon: Sparkles },
    { label: t('fiscalAlerts'), href: '/fiscal-alerts', icon: Calendar, badge: 2 },
  ];

  const communityNav: NavItem[] = [
    { label: t('forum'), href: '/forum', icon: MessageSquare },
    { label: t('courses'), href: '/courses', icon: GraduationCap },
    { label: t('grants'), href: '/grants', icon: Coins },
    { label: t('sustainability'), href: '/sustainability', icon: Leaf },
  ];

  const isActive = (href: string) => {
    const localePath = pathname.replace(/^\/(ro|en)/, '');
    return localePath === href || localePath.startsWith(href + '/');
  };

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      href={item.href}
      onClick={() => setSidebarOpen(false)}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${
        isActive(item.href)
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <item.icon className="w-5 h-5 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );

  const NavSection = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div className="mb-6">
      <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {title}
      </h3>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">DocumentIulia</span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setSidebarOpen(false)}
              aria-label="Închide meniul"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
            <NavSection title="Principal" items={primaryNav} />
            <NavSection title="Fiscal" items={fiscalNav} />
            <NavSection title="Comunitate" items={communityNav} />
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-800">
            <nav className="space-y-1">
              <NavLink item={{ label: t('settings'), href: '/settings', icon: Settings }} />
              <NavLink item={{ label: t('help'), href: '/help', icon: HelpCircle }} />
            </nav>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setSidebarOpen(true)}
                aria-label="Deschide meniul"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Company Selector */}
              <div className="hidden md:block">
                <CompanySelector />
              </div>

              {/* Search Modal */}
              <SearchModal />
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Mobile search button */}
              <button
                onClick={() => {
                  // Trigger CMD+K programmatically
                  const event = new KeyboardEvent('keydown', {
                    key: 'k',
                    metaKey: true,
                    bubbles: true,
                  });
                  document.dispatchEvent(event);
                }}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Caută"
              >
                <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hidden sm:block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Schimbă tema"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>

              {/* Notifications */}
              <NotificationsDropdown />

              {/* User menu */}
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 sm:p-6 lg:p-8">
          <Breadcrumb />
          {children}
        </main>
      </div>

      {/* Quick Actions FAB for mobile */}
      <QuickActionsFab />
    </div>
  );
}
