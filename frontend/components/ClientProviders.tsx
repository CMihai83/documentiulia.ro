'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { OnboardingProvider } from '@/components/onboarding';
import { ToastProvider } from '@/components/ui/Toast';

export function ClientProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <OnboardingProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </OnboardingProvider>
        </OrganizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
