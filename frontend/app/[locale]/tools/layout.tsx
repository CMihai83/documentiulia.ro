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
    <div className="min-h-screen bg-registru-hartie text-registru-cerneala">
      <header className="border-b border-registru-cerneala bg-registru-hartie">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href={`/${locale}`} className="registru-focus font-display font-bold text-registru-cerneala">
            DocumentIulia<span className="opacity-60">.ro</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href={`/${locale}/tools`} className="registru-focus text-registru-cerneala-soft hover:text-registru-stampila">
              {ro ? 'Instrumente gratuite' : 'Free tools'}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="registru-focus bg-registru-cerneala text-white font-semibold px-3 py-1.5 hover:bg-registru-stampila transition-colors"
            >
              {ro ? 'Cont gratuit' : 'Free account'}
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      <footer className="max-w-4xl mx-auto px-4 py-8 text-xs text-registru-cerneala-soft border-t border-registru-linie mt-8">
        {ro
          ? 'Instrumente informative gratuite — nu constituie consultanță fiscală sau juridică.'
          : 'Free informational tools — not tax or legal advice.'}
      </footer>
    </div>
  );
}
