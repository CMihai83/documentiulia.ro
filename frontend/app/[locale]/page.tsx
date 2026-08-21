'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { HeroVerifier } from './HeroVerifier';

/** Real Romanian chart-of-accounts codes → the modules that keep them. */
const CONTURI = [
  { code: '411', ro: 'Clienți', en: 'Customers', dro: 'CRM & Facturare', den: 'CRM & Invoicing', href: '/dashboard/crm' },
  { code: '401', ro: 'Furnizori', en: 'Suppliers', dro: 'Achiziții & Furnizori', den: 'Procurement & Suppliers', href: '/dashboard/procurement' },
  { code: '421', ro: 'Personal', en: 'Personnel', dro: 'Salarizare & HR', den: 'Payroll & HR', href: '/dashboard/hr' },
  { code: '4423', ro: 'TVA de plată', en: 'VAT payable', dro: 'TVA & D300', den: 'VAT & D300', href: '/dashboard/vat' },
  { code: '4426', ro: 'TVA deductibilă', en: 'VAT deductible', dro: 'e-Factura & SAF-T', den: 'e-Invoice & SAF-T', href: '/dashboard/e-invoice' },
  { code: '371', ro: 'Mărfuri', en: 'Goods', dro: 'Stocuri & Depozit', den: 'Stock & Warehouse', href: '/dashboard/warehouse' },
  { code: '5121', ro: 'Conturi la bănci', en: 'Bank accounts', dro: 'Trezorerie & Reconciliere', den: 'Treasury & Reconciliation', href: '/dashboard/bank-reconciliation' },
  { code: '129', ro: 'Repartizarea profitului', en: 'Profit allocation', dro: 'Simulator & Business Case', den: 'Simulator & Business Case', href: '/dashboard/business-case' },
];

const TOOLS = [
  { href: '/tools/verificare-cui', ro: ['Verificare CUI / TVA', 'Status TVA, split TVA, e-Factura — de la ANAF.'], en: ['CUI / VAT lookup', 'VAT status, split VAT, e-Factura — from ANAF.'] },
  { href: '/tools/calculator-tva', ro: ['Calculator TVA 21% / 11%', 'Cote corecte la data tranzacției.'], en: ['VAT calculator 21% / 11%', 'Correct rates by transaction date.'] },
  { href: '/tools/calculator-salariu', ro: ['Salariu net ↔ brut', 'CAS, CASS, impozit — la leu.'], en: ['Net ↔ gross salary', 'CAS, CASS, tax — to the leu.'] },
  { href: '/tools/factura-gratuita', ro: ['Factură + e-Factura XML', 'PDF și UBL 2.1 — gratuit.'], en: ['Invoice + e-Factura XML', 'PDF and UBL 2.1 — free.'] },
  { href: '/tools/validator-xml', ro: ['Validator SAF-T / e-Factura', 'Verifică XML înainte de depunere.'], en: ['SAF-T / e-Factura validator', 'Check XML before you file.'] },
];

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();
  const ro = locale !== 'en';

  return (
    <div className="bg-registru-hartie text-registru-cerneala">
      {/* Hero — the ledger opens with a live verification */}
      <section className="border-b border-registru-linie px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="registru-eyebrow mb-5">
              {ro ? 'Registrul viu · conformitate ca cod' : 'The living ledger · compliance as code'}
            </p>
            <h1 className="font-display font-extrabold tracking-tight text-4xl md:text-6xl leading-[1.02]">
              {ro ? 'Contabilitate care se verifică singură.' : 'Accounting that verifies itself.'}
            </h1>
            <p className="mt-5 text-lg text-registru-cerneala-soft max-w-xl">
              {ro
                ? 'SAF-T, e-Factura și TVA nu mai sunt formulare — sunt reguli scrise în platformă, verificate în timp real față de ANAF.'
                : 'SAF-T, e-Factura and VAT stop being forms — they become rules written into the platform, checked in real time against ANAF.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 registru-eyebrow">
              <span>{ro ? 'Legea 141/2025 · TVA 21/11' : 'Law 141/2025 · VAT 21/11'}</span>
              <span className="text-registru-linie">—</span>
              <span>{ro ? 'Ordin 1783/2021 · SAF-T D406' : 'Order 1783/2021 · SAF-T D406'}</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="registru-focus bg-registru-cerneala text-white font-display font-bold px-7 py-3 hover:bg-registru-stampila transition-colors">
                {t('hero.cta')}
              </Link>
              <Link href="/tools" className="registru-focus border border-registru-cerneala px-7 py-3 font-semibold hover:bg-registru-cerneala hover:text-white transition-colors">
                {ro ? 'Instrumente gratuite' : 'Free tools'}
              </Link>
            </div>
          </div>
          <div className="lg:justify-self-end w-full">
            <HeroVerifier locale={locale} />
          </div>
        </div>
      </section>

      {/* Plan de conturi — modules indexed by real account codes */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <p className="registru-eyebrow mb-2">{ro ? 'Plan de conturi' : 'Chart of accounts'}</p>
          <h2 className="font-display font-bold text-2xl md:text-3xl mb-8">
            {ro ? 'Fiecare cont are un modul.' : 'Every account has a module.'}
          </h2>
          <div className="overflow-x-auto border-y border-registru-cerneala">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="registru-eyebrow border-b border-registru-cerneala">
                  <th className="py-2 pr-4 font-semibold w-20">{ro ? 'Cont' : 'Acct'}</th>
                  <th className="py-2 pr-4 font-semibold">{ro ? 'Denumire' : 'Name'}</th>
                  <th className="py-2 pr-4 font-semibold">{ro ? 'Modul' : 'Module'}</th>
                  <th className="py-2 w-8" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {CONTURI.map((c) => (
                  <tr key={c.code} className="group border-b border-registru-linie last:border-0 hover:bg-white transition-colors">
                    <td className="py-3 pr-4 registru-tabular font-display font-bold align-top">{c.code}</td>
                    <td className="py-3 pr-4 text-registru-cerneala-soft align-top">{ro ? c.ro : c.en}</td>
                    <td className="py-3 pr-4 align-top">
                      <Link href={c.href} className="registru-focus font-semibold hover:text-registru-stampila">
                        {ro ? c.dro : c.den}
                      </Link>
                    </td>
                    <td className="py-3 align-top text-registru-cerneala-soft group-hover:text-registru-stampila transition-colors">→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Free tools — form rows */}
      <section className="px-4 py-16 border-t border-registru-linie">
        <div className="max-w-6xl mx-auto">
          <p className="registru-eyebrow mb-2">{ro ? 'Instrumente gratuite' : 'Free tools'}</p>
          <h2 className="font-display font-bold text-2xl md:text-3xl mb-8">
            {ro ? 'Începe fără cont.' : 'Start without an account.'}
          </h2>
          <div className="border-t border-registru-cerneala">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="registru-focus group flex items-baseline gap-4 py-4 border-b border-registru-linie hover:bg-white transition-colors"
              >
                <span className="font-semibold min-w-[13rem] group-hover:text-registru-stampila transition-colors">
                  {ro ? tool.ro[0] : tool.en[0]}
                </span>
                <span className="text-sm text-registru-cerneala-soft flex-1">{ro ? tool.ro[1] : tool.en[1]}</span>
                <span className="text-registru-cerneala-soft group-hover:text-registru-stampila transition-colors">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — ruled columns */}
      <section className="px-4 py-16 border-t border-registru-linie">
        <div className="max-w-6xl mx-auto">
          <p className="registru-eyebrow mb-2">{ro ? 'Abonamente' : 'Plans'}</p>
          <h2 className="font-display font-bold text-2xl md:text-3xl mb-8">{t('pricing.title')}</h2>
          <div className="grid md:grid-cols-3 border-y border-registru-cerneala">
            {['free', 'pro', 'business'].map((tier) => (
              <div
                key={tier}
                className={`p-7 border-registru-linie md:border-l md:first:border-l-0 ${tier === 'pro' ? 'border-t-2 border-t-registru-stampila bg-white' : ''}`}
              >
                {tier === 'pro' && <p className="registru-eyebrow text-registru-stampila mb-2">{ro ? 'Recomandat' : 'Recommended'}</p>}
                <h3 className="font-display font-bold text-xl">{t(`pricing.${tier}.name`)}</h3>
                <div className="mt-3 mb-6 flex items-baseline gap-1">
                  <span className="registru-tabular font-display font-extrabold text-3xl">{t(`pricing.${tier}.price`)}</span>
                  <span className="text-registru-cerneala-soft text-sm">{t(`pricing.${tier}.period`)}</span>
                </div>
                <ul className="space-y-2 mb-8 text-sm">
                  {(t.raw(`pricing.${tier}.features`) as string[]).map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-registru-viza" aria-hidden>✓</span>
                      <span className="text-registru-cerneala-soft">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`registru-focus block text-center py-3 font-display font-bold text-sm transition-colors ${
                    tier === 'pro' ? 'bg-registru-stampila text-white hover:bg-registru-cerneala' : 'border border-registru-cerneala hover:bg-registru-cerneala hover:text-white'
                  }`}
                >
                  {t('hero.cta')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
