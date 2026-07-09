import type { Metadata } from 'next';
import { SalaryCalcWidget } from './widget';

export const metadata: Metadata = {
  title: 'Calculator salariu net – brut 2026 (CAS, CASS, impozit, deducere) | DocumentIulia.ro',
  description:
    'Calculează salariul net din brut sau brutul necesar pentru un net dorit: CAS 25%, CASS 10%, impozit 10% și deducerea personală, exact la leu. Gratuit.',
};

export default async function CalculatorSalariuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ro = locale !== 'en';
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{ro ? 'Calculator salariu net ↔ brut' : 'Net ↔ gross salary calculator'}</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
        {ro
          ? 'Contribuții standard: CAS 25%, CASS 10%, impozit pe venit 10% după deducerea personală (degresivă, în funcție de venit și persoanele în întreținere). Salariul minim este parametrizabil pentru actualizări legislative.'
          : 'Standard contributions: 25% pension (CAS), 10% health (CASS), 10% income tax after the personal deduction (degressive by income and dependents). The minimum wage is a parameter so legislative updates are instant.'}
      </p>
      <SalaryCalcWidget locale={locale} />
    </div>
  );
}
