'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { roRO } from '@clerk/localizations';
import { QueryProvider } from './query-provider';
import { type ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

// Check if Clerk is configured for production
const isClerkConfigured = typeof window !== 'undefined'
  ? !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  : true;

export function Providers({ children }: ProvidersProps) {
  // If Clerk is not configured, just use QueryProvider
  if (!isClerkConfigured) {
    return <QueryProvider>{children}</QueryProvider>;
  }

  return (
    <ClerkProvider
      localization={roRO}
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#2563eb',
          colorTextOnPrimaryBackground: '#ffffff',
          borderRadius: '0.5rem',
        },
        elements: {
          card: 'shadow-lg',
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
          footerActionLink: 'text-blue-600 hover:text-blue-700',
        },
      }}
    >
      <QueryProvider>{children}</QueryProvider>
    </ClerkProvider>
  );
}
