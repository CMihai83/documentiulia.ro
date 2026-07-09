import type { Metadata } from 'next';
import { FreeInvoiceWidget } from './widget';

export const metadata: Metadata = {
  title: 'Factură gratuită online + e-Factura XML (UBL 2.1) | DocumentIulia.ro',
  description:
    'Generează gratuit o factură PDF și XML-ul e-Factura (RO_CIUS UBL 2.1) — 3 facturi pe lună fără cont. TVA calculat automat la cota corectă.',
};

export default async function FacturaGratuitaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ro = locale !== 'en';
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{ro ? 'Factură gratuită + e-Factura XML' : 'Free invoice + e-Factura XML'}</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
        {ro
          ? 'Completează datele și primești factura PDF plus XML-ul e-Factura în format RO_CIUS UBL 2.1, cu TVA la cota corectă pentru data facturii. Fără cont: 3 facturi pe lună.'
          : 'Fill in the details and get the invoice PDF plus the e-Factura XML in RO_CIUS UBL 2.1 format, with VAT at the correct rate for the invoice date. Without an account: 3 invoices per month.'}
      </p>
      <FreeInvoiceWidget locale={locale} />
    </div>
  );
}
