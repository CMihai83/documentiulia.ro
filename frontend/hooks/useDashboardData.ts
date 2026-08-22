'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Hook to check if component is mounted (client-side)
 * Prevents React Query from fetching during SSR hydration
 */
function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return isMounted;
}

// Dashboard data types
interface CashFlowItem {
  month: string;
  income: number;
  expenses: number;
}

interface VatSummaryItem {
  name: string;
  value: number;
  color: string;
}

interface ActivityItem {
  type: 'invoice' | 'document' | 'audit' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  entityId?: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

interface ComplianceStatusItem {
  name: string;
  status: 'ok' | 'pending' | 'error';
  date: string;
}

interface InvoiceStatusCount {
  status: string;
  count: number;
  color: string;
}

/**
 * Mirrors backend `DashboardSummaryDto` (GET /api/v1/dashboard/summary)
 * plus two client-side flags:
 * - `isEmpty`: true when the payload carries no real figures (no invoices yet,
 *   unauthenticated, or missing body) -- charts must render an empty state.
 * - `error`: set when the request failed -- charts must render an error state.
 * Series are NEVER invented: on 401/empty/error they are `[]`.
 */
export interface DashboardData {
  cashFlow: CashFlowItem[];
  vatSummary: VatSummaryItem[];
  complianceStatus: ComplianceStatusItem[];
  recentActivity: ActivityItem[];
  invoiceStatusBreakdown: InvoiceStatusCount[];
  totalIncome: number;
  totalExpenses: number;
  vatCollected: number;
  vatDeductible: number;
  vatPayable: number;
  invoiceCount: number;
  pendingInvoices: number;
  isEmpty: boolean;
  error?: string;
}

/** Raw server payload (no client flags). */
type DashboardSummaryPayload = Omit<DashboardData, 'isEmpty' | 'error'>;

interface DashboardStats {
  invoicesThisMonth: number;
  revenue: number;
  pendingInvoices: number;
  overdueAmount: number;
  efacturaSubmissions: number;
  trends: {
    revenue: number;
    invoices: number;
  };
}

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

interface InvoicesResponse {
  data: Invoice[];
  total: number;
  totalAmount: number;
  page: number;
  totalPages: number;
}

interface Partner {
  id: string;
  name: string;
  cui: string;
  type: 'client' | 'supplier';
  email: string;
  phone?: string;
  address?: string;
}

interface PartnersResponse {
  data: Partner[];
  total: number;
  page: number;
  totalPages: number;
}

// Query keys for cache management
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  dashboardSummary: ['dashboard', 'summary'] as const,
  dashboardStats: ['dashboard', 'stats'] as const,
  invoices: (params?: Record<string, unknown>) => ['invoices', params] as const,
  partners: (params?: Record<string, unknown>) => ['partners', params] as const,
  vatRates: ['config', 'vat-rates'] as const,
  anafStatus: ['anaf', 'status'] as const,
  cashFlow: (period?: string) => ['cashFlow', period] as const,
  vatSummary: (period?: string) => ['vatSummary', period] as const,
};

// Empty dashboard (no fabricated series) -- used on 401 / missing body / error.
// Exported so consumers can reuse the exact same zero shape.
export const EMPTY_DASHBOARD_DATA: DashboardData = {
  cashFlow: [],
  vatSummary: [],
  complianceStatus: [],
  recentActivity: [],
  invoiceStatusBreakdown: [],
  totalIncome: 0,
  totalExpenses: 0,
  vatCollected: 0,
  vatDeductible: 0,
  vatPayable: 0,
  invoiceCount: 0,
  pendingInvoices: 0,
  isEmpty: true,
};

function emptyDashboardData(error?: string): DashboardData {
  return error ? { ...EMPTY_DASHBOARD_DATA, error } : { ...EMPTY_DASHBOARD_DATA };
}

/**
 * The backend always returns 6 month buckets and 3 VAT rows, zero-filled when
 * the user has no invoices. Treat an all-zero payload as "empty" so the UI
 * shows "Nu există date încă" instead of a flat-line chart.
 */
function normalizeDashboardPayload(payload: Partial<DashboardSummaryPayload> | null | undefined): DashboardData {
  if (!payload || typeof payload !== 'object') {
    return emptyDashboardData();
  }

  const cashFlow = Array.isArray(payload.cashFlow) ? payload.cashFlow : [];
  const vatSummary = Array.isArray(payload.vatSummary) ? payload.vatSummary : [];
  const invoiceCount = Number(payload.invoiceCount ?? 0);

  const cashFlowHasValues = cashFlow.some(
    (item) => Number(item?.income ?? 0) !== 0 || Number(item?.expenses ?? 0) !== 0,
  );
  const vatHasValues = vatSummary.some((item) => Number(item?.value ?? 0) !== 0);
  const isEmpty = invoiceCount === 0 && !cashFlowHasValues && !vatHasValues;

  return {
    cashFlow,
    vatSummary,
    complianceStatus: Array.isArray(payload.complianceStatus) ? payload.complianceStatus : [],
    recentActivity: Array.isArray(payload.recentActivity) ? payload.recentActivity : [],
    invoiceStatusBreakdown: Array.isArray(payload.invoiceStatusBreakdown)
      ? payload.invoiceStatusBreakdown
      : [],
    totalIncome: Number(payload.totalIncome ?? 0),
    totalExpenses: Number(payload.totalExpenses ?? 0),
    vatCollected: Number(payload.vatCollected ?? 0),
    vatDeductible: Number(payload.vatDeductible ?? 0),
    vatPayable: Number(payload.vatPayable ?? 0),
    invoiceCount,
    pendingInvoices: Number(payload.pendingInvoices ?? 0),
    isEmpty,
  };
}

/**
 * Dashboard summary data hook with React Query caching
 * - Stale time: 5 minutes (data can be slightly outdated)
 * - Cache time: 30 minutes (keep in memory for fast navigation)
 * - Refetch interval: 30 seconds (background refresh for real-time feel)
 * - Only fetches on client-side (after mount) to avoid SSR issues
 */
export function useDashboardSummary() {
  const isMounted = useIsMounted();

  return useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: async (): Promise<DashboardData> => {
      const response = await api.get<DashboardSummaryPayload>('/dashboard/summary');
      // Don't throw on 401 - redirect is already happening in api.ts.
      // Return an EMPTY payload (never invented series) while redirect is in progress.
      if (response.status === 401) {
        return emptyDashboardData();
      }
      // Errors are surfaced as data with `error` set so the UI can render an
      // explicit error state (with retry) in place of the charts.
      if (response.error) {
        return emptyDashboardData(response.error);
      }
      return normalizeDashboardPayload(response.data);
    },
    enabled: isMounted, // Only fetch after client-side mount
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime in v4)
    refetchInterval: 30 * 1000, // 30 seconds background refresh
    refetchOnWindowFocus: true,
    // No placeholderData: while loading, `data` is undefined and the page shows a skeleton.
  });
}

/**
 * Dashboard stats hook for KPI cards
 * Only fetches on client-side (after mount) to avoid SSR issues
 */
export function useDashboardStats() {
  const isMounted = useIsMounted();

  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: async (): Promise<DashboardStats> => {
      const response = await api.get<DashboardStats>('/dashboard/stats');
      // Don't throw on 401 - redirect is already happening in api.ts
      if (response.status === 401) {
        return {
          invoicesThisMonth: 0,
          revenue: 0,
          pendingInvoices: 0,
          overdueAmount: 0,
          efacturaSubmissions: 0,
          trends: { revenue: 0, invoices: 0 },
        };
      }
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || {
        invoicesThisMonth: 0,
        revenue: 0,
        pendingInvoices: 0,
        overdueAmount: 0,
        efacturaSubmissions: 0,
        trends: { revenue: 0, invoices: 0 },
      };
    },
    enabled: isMounted, // Only fetch after client-side mount
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Invoices list hook with pagination support
 */
export function useInvoices(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.invoices(params),
    queryFn: async (): Promise<InvoicesResponse> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);
      if (params?.search) searchParams.set('search', params.search);

      const queryString = searchParams.toString();
      const endpoint = `/invoices${queryString ? `?${queryString}` : ''}`;

      const response = await api.get<InvoicesResponse>(endpoint);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || { data: [], total: 0, totalAmount: 0, page: 1, totalPages: 0 };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

/**
 * Partners list hook with pagination support
 */
export function usePartners(params?: {
  page?: number;
  limit?: number;
  type?: 'client' | 'supplier';
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.partners(params),
    queryFn: async (): Promise<PartnersResponse> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.type) searchParams.set('type', params.type);
      if (params?.search) searchParams.set('search', params.search);

      const queryString = searchParams.toString();
      const endpoint = `/partners${queryString ? `?${queryString}` : ''}`;

      const response = await api.get<PartnersResponse>(endpoint);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || { data: [], total: 0, page: 1, totalPages: 0 };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * VAT rates hook - cached longer since rates don't change often
 */
export function useVatRates() {
  return useQuery({
    queryKey: queryKeys.vatRates,
    queryFn: async () => {
      const response = await api.get<{
        standard: number;
        reduced: number;
        special: number;
        effectiveDate: string;
      }>('/config/vat-rates');
      if (response.error) {
        throw new Error(response.error);
      }
      // Default Romanian VAT rates (post Aug 2025 - Legea 141/2025)
      return response.data || {
        standard: 21,
        reduced: 11,
        special: 5,
        effectiveDate: '2025-08-01',
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
  });
}

/**
 * ANAF status hook - refreshed frequently for real-time status
 */
export function useAnafStatus() {
  return useQuery({
    queryKey: queryKeys.anafStatus,
    queryFn: async () => {
      const response = await api.get<{
        status: 'operational' | 'degraded' | 'down';
        lastCheck: string;
        services: {
          efactura: boolean;
          saft: boolean;
          spv: boolean;
        };
      }>('/anaf/status');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || {
        status: 'operational' as const,
        lastCheck: new Date().toISOString(),
        services: { efactura: true, saft: true, spv: true },
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Cash flow data hook with period filtering
 */
export function useCashFlow(period?: string) {
  return useQuery({
    queryKey: queryKeys.cashFlow(period),
    queryFn: async (): Promise<CashFlowItem[]> => {
      const endpoint = period ? `/reports/cash-flow?period=${period}` : '/reports/cash-flow';
      const response = await api.get<{ data: CashFlowItem[] }>(endpoint);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * VAT summary hook with period filtering
 */
export function useVatSummary(period?: string) {
  return useQuery({
    queryKey: queryKeys.vatSummary(period),
    queryFn: async (): Promise<VatSummaryItem[]> => {
      const endpoint = period ? `/reports/vat-summary?period=${period}` : '/reports/vat-summary';
      const response = await api.get<{ data: VatSummaryItem[] }>(endpoint);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook for invalidating dashboard cache on mutations
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
    invalidateSummary: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    },
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
    invalidateInvoices: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    invalidatePartners: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  };
}

/**
 * Prefetch dashboard data for instant navigation
 */
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboardSummary,
      queryFn: async (): Promise<DashboardData> => {
        const response = await api.get<DashboardSummaryPayload>('/dashboard/summary');
        if (response.status === 401) return emptyDashboardData();
        if (response.error) return emptyDashboardData(response.error);
        return normalizeDashboardPayload(response.data);
      },
      staleTime: 5 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboardStats,
      queryFn: async () => {
        const response = await api.get<DashboardStats>('/dashboard/stats');
        return response.data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };
}
