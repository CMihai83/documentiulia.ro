'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  FileCheck,
  Settings,
  Plus,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Acasa', icon: LayoutDashboard },
  { href: '/dashboard/invoices', label: 'Facturi', icon: FileText },
  { href: '/dashboard/payments', label: 'Plati', icon: CreditCard },
  { href: '/dashboard/compliance', label: 'Rapoarte', icon: FileCheck },
  { href: '/dashboard/settings', label: 'Setari', icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname.endsWith('/dashboard');
    }
    return pathname.includes(href);
  };

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full px-2 ${
                  active
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] mt-1 font-medium truncate">
                  {item.label}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-600 rounded-t" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button */}
      <button
        className="fixed bottom-20 right-4 z-50 md:hidden bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-transform"
        onClick={() => {
          // Open quick actions menu
          const event = new CustomEvent('open-quick-actions');
          window.dispatchEvent(event);
        }}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Spacer for bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}
