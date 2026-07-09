import type { Metadata } from 'next';
import { XmlValidatorWidget } from './widget';

export const metadata: Metadata = {
  title: 'Validator SAF-T D406 / e-Factura XML gratuit — erori pe românește | DocumentIulia.ro',
  description:
    'Verifică un fișier XML SAF-T (D406) sau e-Factura înainte de depunere: erori de structură explicate clar, pe românește. Fișierul nu este stocat.',
};

export default async function ValidatorXmlPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ro = locale !== 'en';
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{ro ? 'Validator SAF-T / e-Factura' : 'SAF-T / e-Factura validator'}</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
        {ro
          ? 'Încarcă un XML D406 sau e-Factura și primești erorile explicate pe românește, înainte să le găsească ANAF. Fișierul este procesat în memorie și nu este stocat nicăieri.'
          : 'Upload a D406 or e-Factura XML and get the errors explained in plain language, before ANAF finds them. The file is processed in memory and never stored.'}
      </p>
      <XmlValidatorWidget locale={locale} />
    </div>
  );
}
