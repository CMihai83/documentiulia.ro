'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode, useCallback } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

// Cache time configurations by endpoint type
const CACHE_CONFIG = {
  // Static data - cache for 1 hour
  static: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  },
  // Dashboard data - cache for 30 seconds, auto-refetch
  dashboard: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
  },
  // User-specific data - cache for 2 minutes
  user: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  // Real-time data (e-Factura status) - short cache
  realtime: {
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  },
};

// Helper to get cache config based on query key
function getCacheConfig(queryKey: readonly unknown[]) {
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
  const keyStr = typeof key === 'string' ? key : '';

  if (keyStr.includes('efactura') || keyStr.includes('notifications')) {
    return CACHE_CONFIG.realtime;
  }
  if (keyStr.includes('dashboard') || keyStr.includes('summary')) {
    return CACHE_CONFIG.dashboard;
  }
  if (keyStr.includes('vat-rates') || keyStr.includes('capabilities') || keyStr.includes('config')) {
    return CACHE_CONFIG.static;
  }
  return CACHE_CONFIG.user;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Default stale time - 1 minute
            staleTime: 60 * 1000,
            // Garbage collection time - 5 minutes
            gcTime: 5 * 60 * 1000,
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
            // Retry failed requests up to 2 times
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Network mode - always try to fetch
            networkMode: 'offlineFirst',
          },
          mutations: {
            // Retry mutations once
            retry: 1,
            // Network mode for mutations
            networkMode: 'offlineFirst',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Export cache config for use in individual queries
export { CACHE_CONFIG, getCacheConfig };
