import type { Metadata } from 'next';
import { CuiLookupWidget } from './widget';

export const metadata: Metadata = {
  title: 'Verificare CUI / cod fiscal ANAF gratuit — status TVA, e-Factura | DocumentIulia.ro',
  description:
    'Verifică gratuit orice firmă românească după CUI: plătitor de TVA, TVA la încasare, split TVA, înrolare e-Factura, stare inactivă — date oficiale ANAF, actualizate.',
};

export default async function VerificareCuiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ro = locale !== 'en';
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        {ro ? 'Verificare CUI / cod fiscal' : 'Romanian CUI / VAT lookup'}
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
        {ro
          ? 'Introdu codul fiscal (CUI) al oricărei firme românești și vezi instant: statutul de plătitor de TVA, split TVA, înrolarea în e-Factura și dacă firma este inactivă fiscal. Datele vin direct din serviciul public ANAF.'
          : 'Enter any Romanian company fiscal code (CUI) to instantly see: VAT-payer status, split VAT, e-Factura enrolment and whether the company is fiscally inactive. Data comes straight from the public ANAF service.'}
      </p>
      <CuiLookupWidget locale={locale} />
      <section className="mt-10 text-sm text-gray-600 dark:text-gray-400 max-w-2xl space-y-2">
        <h2 className="font-semibold text-base text-gray-900 dark:text-gray-100">
          {ro ? 'De ce să verifici CUI-ul partenerilor?' : 'Why verify a partner CUI?'}
        </h2>
        <p>
          {ro
            ? 'Facturarea către o firmă inactivă fiscal îți poate anula dreptul de deducere. Verificarea durează două secunde și te scutește de discuții cu ANAF.'
            : 'Invoicing a fiscally inactive company can void your deduction right. The check takes two seconds and saves you an ANAF discussion.'}
        </p>
      </section>
    </div>
  );
}
