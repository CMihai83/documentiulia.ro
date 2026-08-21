'use client';

/**
 * REQ-049 A3 — staff back-office shell.
 * Role gate is UX only (hide + explain); the API enforces with 403s.
 */
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Users, Inbox, AlertTriangle, Wrench } from 'lucide-react';

const STAFF_ROLES = ['ADMIN', 'ACCOUNTANT'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const params = useParams<{ locale: string }>();
  const pathname = usePathname();
  const locale = params?.locale ?? 'ro';
  const ro = locale !== 'en';

  if (isLoading) return <div className="p-6 text-muted-foreground">{ro ? 'Se încarcă…' : 'Loading…'}</div>;

  if (!user || !STAFF_ROLES.includes(user.role)) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-2">
        <h1 className="text-xl font-semibold">{ro ? 'Zonă rezervată echipei' : 'Staff area'}</h1>
        <p className="text-muted-foreground">
          {ro
            ? 'Această secțiune este disponibilă doar membrilor echipei DocumentIulia (administratori și contabili).'
            : 'This section is available only to DocumentIulia staff (administrators and accountants).'}
        </p>
        <Link href={`/${locale}/dashboard`} className="text-primary underline">{ro ? 'Înapoi la panou' : 'Back to dashboard'}</Link>
      </div>
    );
  }

  const base = `/${locale}/dashboard/admin`;
  const tabs = [
    { href: base, icon: LayoutDashboard, label: ro ? 'Panou' : 'Overview', exact: true },
    { href: `${base}/clients`, icon: Users, label: ro ? 'Clienți' : 'Clients' },
    { href: `${base}/requests`, icon: Inbox, label: ro ? 'Cereri' : 'Requests' },
    ...(user.role === 'ADMIN' ? [{ href: `${base}/error-logs`, icon: AlertTriangle, label: ro ? 'Erori' : 'Errors' }] : []),
    { href: `/${locale}/dashboard/crm`, icon: Wrench, label: 'CRM' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{ro ? 'Back-office · echipă' : 'Back-office · staff'}</p>
          <h1 className="text-2xl font-serif font-semibold">{ro ? 'Administrare clienți' : 'Client operations'}</h1>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label={ro ? 'Secțiuni administrare' : 'Admin sections'}>
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                aria-current={active ? 'page' : undefined}>
                <Icon className="h-4 w-4" /> {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
