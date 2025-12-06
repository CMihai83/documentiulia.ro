import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/lib/providers/query-provider';
import '../globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });

  return {
    title: {
      default: `${t('appName')} - ${t('tagline')}`,
      template: `%s | ${t('appName')}`,
    },
    description: t('tagline'),
    keywords: [
      'contabilitate',
      'facturare',
      'e-factura',
      'ANAF',
      'SAF-T',
      'România',
      'accounting',
      'invoicing',
      'Romanian',
    ],
    authors: [{ name: 'DocumentIulia' }],
    creator: 'DocumentIulia',
    metadataBase: new URL('https://documentiulia.ro'),
    openGraph: {
      type: 'website',
      locale: locale === 'ro' ? 'ro_RO' : 'en_US',
      url: 'https://documentiulia.ro',
      siteName: t('appName'),
      title: `${t('appName')} - ${t('tagline')}`,
      description: t('tagline'),
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: t('appName'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t('appName')} - ${t('tagline')}`,
      description: t('tagline'),
      images: ['/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    manifest: '/manifest.json',
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon-16x16.png',
      apple: '/apple-touch-icon.png',
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {/* Skip to main content link for accessibility */}
            <a href="#main-content" className="skip-link">
              {locale === 'ro' ? 'Sari la conținut' : 'Skip to content'}
            </a>

            <QueryProvider>
              {children}
            </QueryProvider>

            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                duration: 5000,
              }}
            />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
