import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instrumente gratuite pentru firme și PFA | DocumentIulia.ro',
  description:
    'Verificare CUI ANAF, calculator TVA 21/11, calculator salariu net-brut, factură gratuită cu e-Factura XML și validator SAF-T/e-Factura — gratuite.',
};

const TOOLS = [
  {
    href: 'verificare-cui',
    ro: ['Verificare CUI / TVA', 'Caută orice firmă românească după CUI: status TVA, split TVA, e-Factura, inactivitate — direct de la ANAF.'],
    en: ['CUI / VAT lookup', 'Look up any Romanian company by CUI: VAT status, split VAT, e-Factura enrolment, inactive flag — straight from ANAF.'],
  },
  {
    href: 'calculator-tva',
    ro: ['Calculator TVA (21% / 11%)', 'Adaugă sau extrage TVA cu cotele corecte la data tranzacției — inclusiv cotele istorice 19%/9%.'],
    en: ['VAT calculator (21% / 11%)', 'Add or extract VAT with the correct date-aware rates — including the historical 19%/9%.'],
  },
  {
    href: 'calculator-salariu',
    ro: ['Calculator salariu net ↔ brut', 'CAS 25%, CASS 10%, impozit 10% și deducerea personală — în ambele direcții, la leu.'],
    en: ['Net ↔ gross salary calculator', 'CAS 25%, CASS 10%, 10% income tax and the personal deduction — both directions, to the leu.'],
  },
  {
    href: 'factura-gratuita',
    ro: ['Factură gratuită + e-Factura XML', 'Generează o factură PDF și XML-ul e-Factura (UBL 2.1) gratuit — 3 pe lună fără cont.'],
    en: ['Free invoice + e-Factura XML', 'Generate an invoice PDF and the e-Factura UBL 2.1 XML for free — 3 per month without an account.'],
  },
  {
    href: 'validator-xml',
    ro: ['Validator SAF-T / e-Factura', 'Verifică un XML D406 sau e-Factura înainte de depunere — erori explicate pe românește.'],
    en: ['SAF-T / e-Factura validator', 'Validate a D406 or e-Factura XML before submission — errors explained in plain language.'],
  },
];

export default async function ToolsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ro = locale !== 'en';
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{ro ? 'Instrumente gratuite' : 'Free tools'}</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        {ro
          ? 'Cinci instrumente gratuite pentru firme, PFA și contabili. Fără cont, fără costuri.'
          : 'Five free tools for companies, freelancers and accountants. No account, no cost.'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={`/${locale}/tools/${t.href}`}
            className="block rounded-xl border bg-white dark:bg-gray-900 p-5 hover:border-primary-500 transition"
          >
            <div className="font-semibold mb-1">{ro ? t.ro[0] : t.en[0]}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{ro ? t.ro[1] : t.en[1]}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
