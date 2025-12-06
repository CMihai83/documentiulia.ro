import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '../../i18n';
import '../globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { QueryProvider } from '@/components/QueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DocumentIulia.ro - Contabilitate cu Inteligență Artificială',
  description: 'Platformă ERP/contabilitate pentru afaceri românești cu AI, conformitate ANAF, TVA 21%/11%, SAF-T D406, e-Factura SPV',
  keywords: 'TVA 21% ANAF 2025, contabilitate România, SAF-T D406, e-Factura, ERP românesc',
  authors: [{ name: 'DocumentIulia.ro Team' }],
  openGraph: {
    title: 'DocumentIulia.ro - Contabilitate cu Inteligență Artificială',
    description: 'Platformă completă ERP/contabilitate pentru afaceri românești',
    url: 'https://documentiulia.ro',
    siteName: 'DocumentIulia.ro',
    locale: 'ro_RO',
    type: 'website',
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function RootLayout({ children, params: { locale } }: RootLayoutProps) {
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <ClerkProvider>
      <html lang={locale}>
        <body className={inter.className}>
          <NextIntlClientProvider messages={messages}>
            <QueryProvider>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </QueryProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
