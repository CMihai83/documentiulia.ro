import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  FileText,
  Receipt,
  Users,
  BarChart3,
  Menu,
  X,
  Plus,
  Settings,
  LogOut,
  ChevronRight,
  Wallet,
  Package,
  Clock,
  FolderKanban,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import useFocusTrap from '../../hooks/useFocusTrap';

interface NavItem {
  label: string;
  labelRo: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', labelRo: 'Panou', icon: <Home className="w-5 h-5" />, href: '/dashboard' },
  { label: 'Invoices', labelRo: 'Facturi', icon: <FileText className="w-5 h-5" />, href: '/invoices' },
  { label: 'Expenses', labelRo: 'Cheltuieli', icon: <Receipt className="w-5 h-5" />, href: '/expenses' },
  { label: 'Contacts', labelRo: 'Contacte', icon: <Users className="w-5 h-5" />, href: '/contacts' },
  { label: 'Reports', labelRo: 'Rapoarte', icon: <BarChart3 className="w-5 h-5" />, href: '/reports' },
];

const secondaryNavItems: NavItem[] = [
  { label: 'Inventory', labelRo: 'Inventar', icon: <Package className="w-5 h-5" />, href: '/inventory' },
  { label: 'Time Tracking', labelRo: 'Pontaj', icon: <Clock className="w-5 h-5" />, href: '/time-tracking' },
  { label: 'Projects', labelRo: 'Proiecte', icon: <FolderKanban className="w-5 h-5" />, href: '/projects' },
  { label: 'Bank', labelRo: 'Bancă', icon: <Wallet className="w-5 h-5" />, href: '/bank/connections' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const [showQuickActions, setShowQuickActions] = useState(false);

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <>
      {/* Quick Actions Overlay */}
      {showQuickActions && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowQuickActions(false)}
        />
      )}

      {/* Quick Actions Menu */}
      {showQuickActions && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl p-4 min-w-[200px] animate-slide-up">
          <div className="space-y-2">
            <Link
              to="/invoices/new"
              className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-xl transition-colors"
              onClick={() => setShowQuickActions(false)}
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-medium">Factură nouă</span>
            </Link>
            <Link
              to="/expenses"
              className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-xl transition-colors"
              onClick={() => setShowQuickActions(false)}
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <span className="font-medium">Cheltuială nouă</span>
            </Link>
            <Link
              to="/contacts"
              className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-xl transition-colors"
              onClick={() => setShowQuickActions(false)}
            >
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <span className="font-medium">Contact nou</span>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {primaryNavItems.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive(item.href)
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.labelRo}</span>
            </Link>
          ))}

          {/* Center FAB */}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={`flex items-center justify-center w-14 h-14 -mt-6 rounded-full shadow-lg transition-all ${
              showQuickActions
                ? 'bg-gray-800 rotate-45'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {showQuickActions ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Plus className="w-6 h-6 text-white" />
            )}
          </button>

          {primaryNavItems.slice(2, 4).map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive(item.href)
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.labelRo}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export function MobileDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const drawerRef = useFocusTrap<HTMLDivElement>(isOpen);

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  // Handle escape key to close drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Deschide meniul"
        aria-expanded={isOpen}
        aria-controls="mobile-drawer"
      >
        <Menu className="w-6 h-6 text-gray-600" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Meniu navigare"
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {user?.name?.[0] || user?.email?.[0] || 'U'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {user?.name || 'Utilizator'}
              </p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Închide meniul"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Principal
          </p>
          {primaryNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.labelRo}</span>
              <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
            </Link>
          ))}

          <div className="h-px bg-gray-200 my-4" />

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Module
          </p>
          {secondaryNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.labelRo}</span>
              <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white safe-area-bottom">
          <Link
            to="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Setări</span>
          </Link>
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="flex items-center gap-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Deconectare</span>
          </button>
        </div>
      </div>
    </>
  );
}

export function MobileHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        <MobileDrawer />
        {title && (
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>
        )}
        <div className="w-10" /> {/* Spacer for centering */}
      </div>
    </header>
  );
}

export default MobileBottomNav;
