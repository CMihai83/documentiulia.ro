'use client';

import useSWR, { SWRConfiguration, mutate as globalMutate } from 'swr';
import { withTimeout, withRetry, ApiError } from '@/lib/api/utils';

/**
 * SWR Data Fetching Hooks - DocumentIulia.ro
 * Advanced caching with automatic revalidation and SSE integration
 */

// Romanian error messages for data fetching
const FETCH_ERRORS = {
  network: 'Eroare de rețea. Verificați conexiunea.',
  timeout: 'Timpul de așteptare a expirat.',
  notFound: 'Datele nu au fost găsite.',
  server: 'Eroare de server. Încercați din nou.',
} as const;

// Default SWR configuration optimized for Romanian ERP
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  dedupingInterval: 60000, // 1 minute deduping
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors
    if (error instanceof ApiError && error.statusCode && error.statusCode < 500) {
      return false;
    }
    return true;
  },
};

// Base fetcher with timeout and retry logic
async function baseFetcher<T>(url: string): Promise<T> {
  return withRetry(
    async () => {
      const response = await withTimeout(
        fetch(url, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }),
        10000,
        FETCH_ERRORS.timeout
      );

      if (!response.ok) {
        const error = new ApiError(
          `HTTP ${response.status}`,
          response.status === 404 ? FETCH_ERRORS.notFound : FETCH_ERRORS.server,
          response.status
        );
        throw error;
      }

      return response.json();
    },
    { maxRetries: 2 }
  );
}

// Generic data fetching hook
export function useData<T>(
  key: string | null,
  config?: SWRConfiguration<T>
) {
  return useSWR<T, ApiError>(key, baseFetcher, {
    ...defaultConfig,
    ...config,
  });
}

// Document data hook
export function useDocument(id: string | null) {
  return useData<{
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    metadata: Record<string, any>;
  }>(id ? `/api/documents/${id}` : null);
}

// Documents list hook with pagination
export function useDocuments(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const queryString = searchParams.toString();
  const key = `/api/documents${queryString ? `?${queryString}` : ''}`;

  return useData<{
    data: Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }>(key);
}

// Invoices hook
export function useInvoices(params?: {
  page?: number;
  limit?: number;
  status?: 'draft' | 'sent' | 'paid' | 'overdue';
  dateFrom?: string;
  dateTo?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);

  const queryString = searchParams.toString();
  const key = `/api/invoices${queryString ? `?${queryString}` : ''}`;

  return useData<{
    data: Array<{
      id: string;
      number: string;
      clientName: string;
      amount: number;
      currency: string;
      status: string;
      dueDate: string;
      createdAt: string;
    }>;
    total: number;
    totalAmount: number;
    page: number;
    totalPages: number;
  }>(key);
}

// Single invoice hook
export function useInvoice(id: string | null) {
  return useData<{
    id: string;
    number: string;
    series: string;
    client: {
      name: string;
      cui: string;
      address: string;
      iban: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      vatRate: number;
      total: number;
    }>;
    subtotal: number;
    vat: number;
    total: number;
    currency: string;
    status: string;
    dueDate: string;
    issuedAt: string;
    efacturaStatus?: string;
    efacturaId?: string;
  }>(id ? `/api/invoices/${id}` : null);
}

// ANAF status hook (integrates with SSE)
export function useAnafStatus() {
  return useData<{
    status: 'operational' | 'degraded' | 'down';
    lastCheck: string;
    services: {
      efactura: boolean;
      saft: boolean;
      spv: boolean;
    };
  }>('/api/anaf/status', {
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: true,
  });
}

// VAT rates hook (cached longer since rates don't change often)
export function useVatRates() {
  return useData<{
    standard: number;
    reduced: number;
    special: number;
    effectiveDate: string;
  }>('/api/config/vat-rates', {
    dedupingInterval: 3600000, // 1 hour
    revalidateOnFocus: false,
  });
}

// Dashboard stats hook
export function useDashboardStats() {
  return useData<{
    invoicesThisMonth: number;
    revenue: number;
    pendingInvoices: number;
    overdueAmount: number;
    efacturaSubmissions: number;
    trends: {
      revenue: number; // percentage change
      invoices: number;
    };
  }>('/api/dashboard/stats');
}

// Utility to invalidate cache on SSE events
export function invalidateCache(key: string | string[]) {
  if (Array.isArray(key)) {
    key.forEach((k) => globalMutate(k));
  } else {
    globalMutate(key);
  }
}

// Optimistic update helper
export async function optimisticUpdate<T>(
  key: string,
  updateFn: (current: T | undefined) => T,
  apiCall: () => Promise<T>
) {
  try {
    // Optimistically update the cache
    globalMutate(key, updateFn, false);

    // Make the API call
    const result = await apiCall();

    // Update with actual data
    globalMutate(key, result, false);

    return result;
  } catch (error) {
    // Revalidate to get correct data on error
    globalMutate(key);
    throw error;
  }
}

export { globalMutate as mutate };
