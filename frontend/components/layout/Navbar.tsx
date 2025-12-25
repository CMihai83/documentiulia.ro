'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Menu, X, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function Navbar() {
  const t = useTranslations('nav');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  const navLinks = [
    { href: '/', label: t('home') },
    { href: '/features', label: t('features') || 'Funcționalități' },
    { href: '/services/business-formation', label: t('services') || 'Servicii' },
    { href: '/templates', label: t('templates') || 'Șabloane' },
    { href: '/simulation', label: t('simulation') || 'Simulator' },
    { href: '/pricing', label: t('pricing') },
    { href: '/courses', label: t('courses') || 'Cursuri' },
    { href: '/blog', label: t('blog') || 'Blog' },
    { href: '/contact', label: t('contact') },
  ];

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-800/50 sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">DocumentIulia</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">.ro</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle size="md" showDropdown={true} />

            {/* Language Switcher */}
            <LanguageSelector />

            {/* Auth Buttons */}
            <div className="hidden sm:flex items-center gap-3">
              {isLoading ? (
                <span className="text-sm text-gray-400">...</span>
              ) : isAuthenticated && user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                  >
                    <User className="w-4 h-4" />
                    {t('dashboard')}
                  </Link>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    {t('login')}
                  </Link>
                  <Link
                    href="/register"
                    className="bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 dark:hover:bg-primary-600 transition"
                  >
                    {t('signup')}
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-nav-menu" className="lg:hidden py-4 border-t border-gray-200 dark:border-gray-800" role="navigation" aria-label="Mobile navigation">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                {isAuthenticated && user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="flex-1 py-2 text-center bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('dashboard')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex-1 py-2 text-center border border-red-500 dark:border-red-400 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    >
                      <LogOut className="w-4 h-4 inline mr-1" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex-1 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('login')}
                    </Link>
                    <Link
                      href="/register"
                      className="flex-1 py-2 text-center bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('signup')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
