import Link from 'next/link';

/**
 * Public shell for the W-0 free tools — server-rendered, no auth, SEO-first.
 * Every tool page inherits the header with the signup CTA.
 */
export default async function ToolsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ro = locale !== 'en';
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href={`/${locale}`} className="font-semibold text-primary-700 dark:text-teal-400">
            DocumentIulia<span className="opacity-60">.ro</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href={`/${locale}/tools`} className="text-gray-600 dark:text-gray-300 hover:underline">
              {ro ? 'Instrumente gratuite' : 'Free tools'}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="bg-primary-600 text-white px-3 py-1.5 rounded-md hover:bg-primary-700"
            >
              {ro ? 'Cont gratuit' : 'Free account'}
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      <footer className="max-w-4xl mx-auto px-4 py-8 text-xs text-gray-500">
        {ro
          ? 'Instrumente informative gratuite — nu constituie consultanță fiscală sau juridică.'
          : 'Free informational tools — not tax or legal advice.'}
      </footer>
    </div>
  );
}
