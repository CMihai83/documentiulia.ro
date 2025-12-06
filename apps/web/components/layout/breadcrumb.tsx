'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

// Map of route segments to Romanian labels
const routeLabels: Record<string, string> = {
  dashboard: 'Panou Principal',
  invoices: 'Facturi',
  expenses: 'Cheltuieli',
  bills: 'Furnizori',
  contacts: 'Contacte',
  products: 'Produse',
  receipts: 'Bonuri Fiscale',
  banking: 'Banking',
  efactura: 'e-Factura',
  reports: 'Rapoarte',
  saft: 'SAF-T',
  settings: 'Setări',
  help: 'Ajutor',
  'ai-consultant': 'Consultant AI',
  'fiscal-alerts': 'Calendar Fiscal',
  forum: 'Forum',
  courses: 'Cursuri',
  grants: 'Finanțări',
  sustainability: 'Sustenabilitate',
  new: 'Adaugă',
  edit: 'Editează',
  view: 'Vizualizare',
  profile: 'Profil',
  company: 'Companie',
  notifications: 'Notificări',
  appearance: 'Aspect',
  integrations: 'Integrări',
  billing: 'Facturare',
  security: 'Securitate',
};

export function Breadcrumb() {
  const pathname = usePathname();

  // Remove locale prefix and split path
  const pathWithoutLocale = pathname.replace(/^\/(ro|en)/, '');
  const segments = pathWithoutLocale.split('/').filter(Boolean);

  // Don't show breadcrumb on dashboard
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return null;
  }

  // Build breadcrumb items
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Acasă', href: '/dashboard' },
  ];

  let currentPath = '';
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    // Skip UUIDs or numeric IDs in breadcrumb labels but keep in path
    const isId = /^[0-9a-f-]{36}$/.test(segment) || /^\d+$/.test(segment);
    const label = isId ? 'Detalii' : (routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1));
    breadcrumbs.push({ label, href: currentPath });
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <li key={item.href} className="flex items-center gap-1">
              {!isFirst && (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              {isLast ? (
                <span className="text-gray-900 dark:text-white font-medium">
                  {isFirst && <Home className="w-4 h-4 inline mr-1" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors flex items-center"
                >
                  {isFirst && <Home className="w-4 h-4 mr-1" />}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
