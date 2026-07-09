import type { Metadata } from 'next';
import { VatCalcWidget } from './widget';

export const metadata: Metadata = {
  title: 'Calculator TVA 21% / 11% (2026) — adaugă sau extrage TVA | DocumentIulia.ro',
  description:
    'Calculator TVA gratuit cu cotele corecte la data tranzacției: 21% standard și 11% redusă din august 2025, 19%/9% pentru date anterioare. Adaugă sau extrage TVA instant.',
};

export default async function CalculatorTvaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ro = locale !== 'en';
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{ro ? 'Calculator TVA' : 'VAT calculator'}</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
        {ro
          ? 'Cotele se aleg automat după data tranzacției (Legea 141/2025): 21% standard și 11% redusă de la 1 august 2025; 19%/9% pentru documente anterioare. Linkul se poate distribui cu valorile completate.'
          : 'Rates are selected automatically by transaction date (Law 141/2025): 21% standard and 11% reduced from 1 August 2025; 19%/9% for earlier documents. The URL is shareable with values filled in.'}
      </p>
      <VatCalcWidget locale={locale} />
    </div>
  );
}
