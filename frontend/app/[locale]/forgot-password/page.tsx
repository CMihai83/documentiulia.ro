'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In production, this would call the actual API
      // await fetch('/api/auth/forgot-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare. Vă rugăm încercați din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Verifică-ți emailul
            </h2>
            <p className="mt-4 text-gray-600">
              Am trimis un link de resetare a parolei la adresa <strong>{email}</strong>.
              Verifică inbox-ul și folder-ul de spam.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-sm text-gray-500 mb-4">
              Nu ai primit emailul?
            </p>
            <button
              onClick={() => {
                setIsSuccess(false);
                setEmail('');
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Încearcă din nou
            </button>
          </div>
          <div className="pt-6">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Înapoi la autentificare
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            Resetare parolă
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Introdu adresa de email asociată contului tău și îți vom trimite un link pentru resetarea parolei.
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Adresă email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="email@exemplu.ro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Se trimite...
                </span>
              ) : (
                'Trimite link de resetare'
              )}
            </button>
          </div>
        </form>

        {/* Back to login */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Înapoi la autentificare
          </Link>
        </div>

        {/* Help text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Dacă nu ai acces la emailul asociat contului,{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-500">
              contactează suportul
            </Link>
            .
          </p>
        </div>

        {/* Romanian Tricolor Accent */}
        <div className="flex justify-center">
          <div className="flex h-1 w-24 rounded overflow-hidden">
            <div className="flex-1 bg-blue-700"></div>
            <div className="flex-1 bg-yellow-400"></div>
            <div className="flex-1 bg-red-600"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
