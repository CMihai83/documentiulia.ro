'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

// Test credentials for demo/development
const TEST_CREDENTIALS = [
  {
    email: 'demo@documentiulia.ro',
    password: 'Test123456',
    role: 'Demo User',
    tier: 'PRO',
    description: 'Full access demo account',
  },
  {
    email: 'admin@documentiulia.ro',
    password: 'Admin123456',
    role: 'Administrator',
    tier: 'BUSINESS',
    description: 'Admin dashboard access',
  },
  {
    email: 'contabil@documentiulia.ro',
    password: 'Conta123456',
    role: 'Accountant',
    tier: 'PRO',
    description: 'Accountant features',
  },
  {
    email: 'test@documentiulia.ro',
    password: 'Test123456',
    role: 'Test User',
    tier: 'FREE',
    description: 'Limited free tier',
  },
];

export default function LoginPage() {
  const t = useTranslations('auth');
  const { login, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showTestCredentials, setShowTestCredentials] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password, returnUrl || undefined);
    } catch (err: any) {
      setError(err.message || t('loginError'));
    }
  };

  const fillCredentials = (cred: typeof TEST_CREDENTIALS[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo & Header */}
        <div>
          <div className="flex justify-center mb-4">
            <div className="flex items-center space-x-1">
              <span className="text-3xl font-bold text-blue-900">Document</span>
              <span className="text-3xl font-bold text-yellow-500">Iulia</span>
              <span className="text-3xl font-bold text-blue-900">.ro</span>
            </div>
          </div>
          <h2 className="text-center text-2xl font-bold text-gray-900">
            {t('login')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('noAccount')}{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              {t('signupHere')}
            </Link>
          </p>
        </div>

        {/* Test Credentials Box */}
        {showTestCredentials && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span className="font-semibold">Test Credentials</span>
              </div>
              <button
                onClick={() => setShowTestCredentials(false)}
                className="text-blue-200 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-blue-100 text-xs mb-3">
              Click to auto-fill login form with test account:
            </p>
            <div className="space-y-2">
              {TEST_CREDENTIALS.map((cred) => (
                <button
                  key={cred.email}
                  onClick={() => fillCredentials(cred)}
                  className="w-full text-left bg-white/10 hover:bg-white/20 rounded-md p-2 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm">{cred.email}</div>
                      <div className="text-xs text-blue-200">{cred.description}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      cred.tier === 'BUSINESS' ? 'bg-purple-500' :
                      cred.tier === 'PRO' ? 'bg-green-500' : 'bg-gray-500'
                    }`}>
                      {cred.tier}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-blue-500/30">
              <div className="text-xs text-blue-200">
                <strong>Quick Start:</strong> demo@documentiulia.ro / Test123456
              </div>
            </div>
          </div>
        )}

        {/* Collapsed credentials hint */}
        {!showTestCredentials && (
          <button
            onClick={() => setShowTestCredentials(true)}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2"
          >
            Show test credentials
          </button>
        )}

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="email@exemplu.ro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                {t('rememberMe')}
              </label>
            </div>

            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                {t('forgotPassword')}
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('loggingIn')}
                </span>
              ) : (
                t('login')
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-br from-blue-50 via-white to-yellow-50 text-gray-500">
                ANAF e-Factura & SAF-T Compliant
              </span>
            </div>
          </div>

          {/* Romanian Tricolor Accent */}
          <div className="mt-4 flex justify-center">
            <div className="flex h-1 w-24 rounded overflow-hidden">
              <div className="flex-1 bg-blue-700"></div>
              <div className="flex-1 bg-yellow-400"></div>
              <div className="flex-1 bg-red-600"></div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            DocumentIulia.ro - Contabilitate cu Inteligență Artificială
          </p>
        </div>
      </div>
    </div>
  );
}
