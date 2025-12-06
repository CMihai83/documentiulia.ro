'use client';

import { SignUp, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/ro/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state
  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-pulse">
          <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Development mode fallback
  const isDev = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live');

  if (isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              DocumentIulia.ro
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Creează cont nou
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Mod Dezvoltare:</strong> Înregistrarea este dezactivată.
              Configurați cheile Clerk de producție pentru a activa înregistrarea.
            </p>
          </div>

          <button
            onClick={() => router.push('/ro/dashboard')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Continuă către Dashboard
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
            Pentru producție, configurați NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY și CLERK_SECRET_KEY
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            DocumentIulia.ro
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Creează-ți contul gratuit
          </p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-white dark:bg-gray-800 shadow-xl rounded-2xl',
              headerTitle: 'text-gray-900 dark:text-white',
              headerSubtitle: 'text-gray-600 dark:text-gray-400',
              socialButtonsBlockButton: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
              formFieldInput: 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white',
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              footerActionLink: 'text-blue-600 hover:text-blue-700',
            },
          }}
          routing="path"
          path="/sign-up"
          fallbackRedirectUrl="/ro/dashboard"
        />

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
          Prin înregistrare, ești de acord cu{' '}
          <a href="/terms" className="text-blue-600 hover:underline">Termenii și Condițiile</a>
          {' '}și{' '}
          <a href="/privacy" className="text-blue-600 hover:underline">Politica de Confidențialitate</a>
        </p>
      </div>
    </div>
  );
}
