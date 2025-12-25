'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: Data is considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // GC time: Unused data stays in cache for 30 minutes
            gcTime: 30 * 60 * 1000,
            // Don't refetch on every window focus (reduces API calls)
            refetchOnWindowFocus: false,
            // Retry failed requests 2 times with exponential backoff
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Show stale data while revalidating
            refetchOnReconnect: 'always',
            // Network mode for offline support
            networkMode: 'offlineFirst',
          },
          mutations: {
            // Retry mutations once on network errors
            retry: 1,
            retryDelay: 1000,
            networkMode: 'offlineFirst',
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
