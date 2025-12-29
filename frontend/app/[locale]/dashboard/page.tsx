import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';
import { LoadingState, PageSkeleton, LOADING_MESSAGES } from '@/components/ui/LoadingState';

// Static imports for above-the-fold server-compatible components
import { ComplianceDeadlines } from '@/components/dashboard/ComplianceDeadlines';
import { VATCalculator } from '@/components/dashboard/VATCalculator';
import { EUVATWidget } from '@/components/dashboard/EUVATWidget';
import { ExchangeRateWidget } from '@/components/dashboard/ExchangeRateWidget';

// Client component for interactive dashboard content
import { DashboardClient } from './DashboardClient';

// Dynamic imports for heavy/interactive components - reduces initial bundle
// Note: ssr: false not allowed in Server Components, using Suspense for loading states
const AIAssistant = dynamic(
  () => import('@/components/dashboard/AIAssistant').then(mod => ({ default: mod.AIAssistant })),
  {
    loading: () => <LoadingState message="Se încarcă asistentul AI..." size="lg" />,
  }
);

const SimulationWidget = dynamic(
  () => import('@/components/dashboard/SimulationWidget').then(mod => ({ default: mod.SimulationWidget })),
  {
    loading: () => <LoadingState message="Se încarcă simulatorul..." />,
  }
);

const BusinessWidgets = dynamic(
  () => import('@/components/dashboard/BusinessWidgets').then(mod => ({ default: mod.BusinessWidgets })),
  {
    loading: () => <LoadingState message="Se încarcă widget-urile..." />,
  }
);

const AIInsightsWidget = dynamic(
  () => import('@/components/dashboard/AIInsightsWidget').then(mod => ({ default: mod.AIInsightsWidget })),
  {
    loading: () => <LoadingState message="Se încarcă insights AI..." size="sm" />,
  }
);

const CashFlowForecastWidget = dynamic(
  () => import('@/components/dashboard/CashFlowForecastWidget').then(mod => ({ default: mod.CashFlowForecastWidget })),
  {
    loading: () => <LoadingState message="Se calculează prognoza cash flow..." />,
  }
);

const OverdueInvoiceWidget = dynamic(
  () => import('@/components/dashboard/OverdueInvoiceWidget').then(mod => ({ default: mod.OverdueInvoiceWidget })),
  {
    loading: () => <LoadingState message={LOADING_MESSAGES.invoices} />,
  }
);

const EFacturaStatusWidget = dynamic(
  () => import('@/components/dashboard/EFacturaStatusWidget').then(mod => ({ default: mod.EFacturaStatusWidget })),
  {
    loading: () => <LoadingState message={LOADING_MESSAGES.efactura} variant="dots" />,
  }
);

const QuickActionsPanel = dynamic(
  () => import('@/components/dashboard/QuickActionsPanel').then(mod => ({ default: mod.QuickActionsPanel })),
  {
    loading: () => <LoadingState message="Se încarcă acțiunile rapide..." size="sm" />,
  }
);

const NotificationsWidget = dynamic(
  () => import('@/components/dashboard/NotificationsWidget').then(mod => ({ default: mod.NotificationsWidget })),
  {
    loading: () => <LoadingState message="Se încarcă notificările..." size="sm" />,
  }
);

const RecentActivity = dynamic(
  () => import('@/components/dashboard/RecentActivity'),
  {
    loading: () => <LoadingState message="Se încarcă activitatea recentă..." />,
  }
);

// Enable ISR for dashboard - revalidate every 5 minutes for semi-static data
export const revalidate = 300;

// Generate metadata for dashboard page
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  return {
    title: t('pageTitle') || 'Dashboard',
    description: t('pageDescription') || 'Panou de control pentru afacerea ta',
  };
}

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header - Server Component (static content) */}
      <header className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{t('welcome')}!</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('overview')}</p>
      </header>

      {/* Main Dashboard Content - Client Component with data fetching */}
      <Suspense fallback={<PageSkeleton />}>
        <DashboardClient />
      </Suspense>

      {/* Quick Actions and Notifications - Interactive widgets */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <Suspense fallback={<LoadingState message="Se încarcă acțiunile rapide..." />}>
          <QuickActionsPanel />
        </Suspense>
        <Suspense fallback={<LoadingState message="Se încarcă notificările..." />}>
          <NotificationsWidget />
        </Suspense>
      </section>

      {/* Business-specific widgets - Lazy loaded */}
      <section className="mb-4 sm:mb-6 md:mb-8">
        <Suspense fallback={<LoadingState message="Se încarcă widget-urile de business..." size="lg" />}>
          <BusinessWidgets />
        </Suspense>
      </section>

      {/* Simulation Widget - Learning Integration */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <div className="lg:col-span-1">
          <Suspense fallback={<LoadingState message="Se încarcă simulatorul..." />}>
            <SimulationWidget />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<LoadingState message="Se încarcă AI Insights..." size="sm" />}>
            <AIInsightsWidget />
          </Suspense>
        </div>
      </section>

      {/* Cash Flow Forecast and Overdue Invoices */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <Suspense fallback={<LoadingState message="Se calculează prognoza..." />}>
          <CashFlowForecastWidget />
        </Suspense>
        <Suspense fallback={<LoadingState message={LOADING_MESSAGES.invoices} />}>
          <OverdueInvoiceWidget />
        </Suspense>
      </section>

      {/* e-Factura Status - Romanian Compliance Critical */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <Suspense fallback={<LoadingState message={LOADING_MESSAGES.efactura} variant="dots" />}>
          <EFacturaStatusWidget />
        </Suspense>
      </section>

      {/* Recent Activity */}
      <section className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <Suspense fallback={<LoadingState message="Se încarcă activitatea recentă..." />}>
          <RecentActivity activities={[]} locale="ro" />
        </Suspense>
      </section>

      {/* Bottom Widgets Grid - Mix of server and client components */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        {/* Static widgets - can render on server */}
        <Suspense fallback={<LoadingState message="Se încarcă cursul valutar..." size="sm" />}>
          <ExchangeRateWidget />
        </Suspense>
        <Suspense fallback={<LoadingState message={LOADING_MESSAGES.vat} size="sm" />}>
          <VATCalculator />
        </Suspense>
        <Suspense fallback={<LoadingState message="Se încarcă TVA UE..." size="sm" />}>
          <EUVATWidget />
        </Suspense>
        <Suspense fallback={<LoadingState message="Se încarcă insights AI..." size="sm" />}>
          <AIInsightsWidget />
        </Suspense>
      </section>

      {/* AI Assistant - Full width, heavy component loaded last */}
      <section className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6">
        <Suspense fallback={<LoadingState message="Se încarcă asistentul AI..." size="lg" />}>
          <AIAssistant />
        </Suspense>
      </section>

      {/* Compliance Deadlines - Important for Romanian businesses */}
      <section className="mt-4 sm:mt-6 md:mt-8">
        <Suspense fallback={<LoadingState message="Se încarcă termenele de conformitate..." />}>
          <ComplianceDeadlines />
        </Suspense>
      </section>
    </div>
  );
}
