'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { Menu, X, Globe } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath || `/${newLocale}`);
  };

  const navLinks = [
    { href: '/', label: t('home') },
    { href: '/forum', label: t('forum') },
    { href: '/courses', label: t('courses') },
    { href: '/blog', label: t('blog') },
    { href: '/pricing', label: t('pricing') },
    { href: '/hr', label: t('hr') },
    { href: '/funds', label: t('funds') },
    { href: '/contact', label: t('contact') },
    { href: '/help', label: t('help') },
  ];

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary-600">DocumentIulia</span>
            <span className="text-sm text-gray-500">.ro</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-primary-600 transition text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <button
              onClick={() => switchLocale(locale === 'ro' ? 'en' : 'ro')}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"
              aria-label="Switch language"
            >
              <Globe className="w-4 h-4" />
              <span className="uppercase">{locale === 'ro' ? 'EN' : 'RO'}</span>
            </button>

            {/* Auth */}
            {isSignedIn ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {t('dashboard')}
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <SignInButton mode="modal">
                  <button className="text-sm font-medium text-gray-600 hover:text-primary-600">
                    {t('login')}
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                    {t('signup')}
                  </button>
                </SignUpButton>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-600 hover:text-primary-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {!isSignedIn && (
                <div className="flex gap-3 pt-4 border-t">
                  <SignInButton mode="modal">
                    <button className="flex-1 py-2 text-center border rounded-lg">{t('login')}</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="flex-1 py-2 text-center bg-primary-600 text-white rounded-lg">
                      {t('signup')}
                    </button>
                  </SignUpButton>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
