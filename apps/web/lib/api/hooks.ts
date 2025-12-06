/**
 * React Query hooks for DocumentIulia API
 * TanStack Query integration for data fetching and caching
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// Query keys factory
export const queryKeys = {
  // Auth
  user: ['user'] as const,
  userCompanies: ['user', 'companies'] as const,

  // Companies
  companies: ['companies'] as const,
  company: (id: string) => ['companies', id] as const,
  companyStats: (id: string) => ['companies', id, 'stats'] as const,
  companyMembers: (id: string) => ['companies', id, 'members'] as const,

  // Clients
  clients: (companyId: string) => ['companies', companyId, 'clients'] as const,
  client: (companyId: string, id: string) => ['companies', companyId, 'clients', id] as const,

  // Products
  products: (companyId: string) => ['companies', companyId, 'products'] as const,
  product: (companyId: string, id: string) => ['companies', companyId, 'products', id] as const,
  lowStock: (companyId: string) => ['companies', companyId, 'products', 'low-stock'] as const,

  // Invoices
  invoices: (companyId: string) => ['companies', companyId, 'invoices'] as const,
  invoice: (companyId: string, id: string) => ['companies', companyId, 'invoices', id] as const,
  invoiceStats: (companyId: string) => ['companies', companyId, 'invoices', 'stats'] as const,

  // Expenses
  expenses: (companyId: string) => ['companies', companyId, 'expenses'] as const,
  expense: (companyId: string, id: string) => ['companies', companyId, 'expenses', id] as const,
  unpaidExpenses: (companyId: string) => ['companies', companyId, 'expenses', 'unpaid'] as const,
  expensesByCategory: (companyId: string) => ['companies', companyId, 'expenses', 'by-category'] as const,

  // Reports
  dashboard: (companyId: string) => ['companies', companyId, 'reports', 'dashboard'] as const,
  revenue: (companyId: string) => ['companies', companyId, 'reports', 'revenue'] as const,
  profitLoss: (companyId: string) => ['companies', companyId, 'reports', 'profit-loss'] as const,
  vatReport: (companyId: string) => ['companies', companyId, 'reports', 'vat'] as const,

  // e-Factura
  efacturaConfig: (companyId: string) => ['companies', companyId, 'efactura', 'config'] as const,
  efacturaStatus: (companyId: string) => ['companies', companyId, 'efactura', 'status'] as const,
  efacturaHistory: (companyId: string) => ['companies', companyId, 'efactura', 'history'] as const,

  // SAF-T
  saftHistory: (companyId: string) => ['companies', companyId, 'saft', 'history'] as const,

  // Receipts
  receipts: (companyId: string) => ['companies', companyId, 'receipts'] as const,
  receipt: (companyId: string, id: string) => ['companies', companyId, 'receipts', id] as const,
  unprocessedReceipts: (companyId: string) => ['companies', companyId, 'receipts', 'unprocessed'] as const,

  // Bank Accounts
  bankAccounts: (companyId: string) => ['companies', companyId, 'bank-accounts'] as const,
  bankAccount: (companyId: string, id: string) => ['companies', companyId, 'bank-accounts', id] as const,

  // Notifications
  notifications: ['notifications'] as const,

  // Activity
  activity: (companyId: string) => ['companies', companyId, 'activity'] as const,
};

// Dev mode token - in production, this would come from Clerk
const DEV_TOKEN = 'dev_test_token';

// Helper hook for authenticated requests (dev mode - no Clerk)
function useToken() {
  // In dev mode, return a static token
  // In production with Clerk: const { getToken } = useAuth();
  return async () => DEV_TOKEN;
}

// ============================================
// User Hooks
// ============================================

export function useCurrentUser() {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      const token = await getToken();
      return api.users.me(token);
    },
  });
}

export function useUserCompanies() {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.userCompanies,
    queryFn: async () => {
      const token = await getToken();
      return api.users.myCompanies(token);
    },
  });
}

// ============================================
// Company Hooks
// ============================================

export function useCompanies() {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.companies,
    queryFn: async () => {
      const token = await getToken();
      return api.companies.list(token);
    },
  });
}

export function useCompany(id: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.company(id),
    queryFn: async () => {
      const token = await getToken();
      return api.companies.get(token, id);
    },
    enabled: !!id,
  });
}

export function useCompanyStats(companyId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.companyStats(companyId),
    queryFn: async () => {
      const token = await getToken();
      return api.companies.stats(token, companyId);
    },
    enabled: !!companyId,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const token = await getToken();
      return api.companies.create(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies });
      queryClient.invalidateQueries({ queryKey: queryKeys.userCompanies });
    },
  });
}

// ============================================
// Client Hooks
// ============================================

export function useClients(companyId: string, params?: Record<string, string>) {
  const getToken = useToken();
  return useQuery({
    queryKey: [...queryKeys.clients(companyId), params],
    queryFn: async () => {
      const token = await getToken();
      return api.clients.list(token, companyId, params);
    },
    enabled: !!companyId,
  });
}

export function useClient(companyId: string, id: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.client(companyId, id),
    queryFn: async () => {
      const token = await getToken();
      return api.clients.get(token, companyId, id);
    },
    enabled: !!companyId && !!id,
  });
}

export function useCreateClient(companyId: string) {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const token = await getToken();
      return api.clients.create(token, companyId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(companyId) });
    },
  });
}

export function useUpdateClient(companyId: string, id: string) {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const token = await getToken();
      return api.clients.update(token, companyId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.client(companyId, id) });
    },
  });
}

// ============================================
// Product Hooks
// ============================================

export function useProducts(companyId: string, params?: Record<string, string>) {
  const getToken = useToken();
  return useQuery({
    queryKey: [...queryKeys.products(companyId), params],
    queryFn: async () => {
      const token = await getToken();
      return api.products.list(token, companyId, params);
    },
    enabled: !!companyId,
  });
}

export function useLowStockProducts(companyId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.lowStock(companyId),
    queryFn: async () => {
      const token = await getToken();
      return api.products.lowStock(token, companyId);
    },
    enabled: !!companyId,
  });
}

export function useCreateProduct(companyId: string) {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const token = await getToken();
      return api.products.create(token, companyId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products(companyId) });
    },
  });
}

// ============================================
// Invoice Hooks
// ============================================

export function useInvoices(companyId: string, params?: Record<string, string>) {
  const getToken = useToken();
  return useQuery({
    queryKey: [...queryKeys.invoices(companyId), params],
    queryFn: async () => {
      const token = await getToken();
      return api.invoices.list(token, companyId, params);
    },
    enabled: !!companyId,
  });
}

export function useInvoice(companyId: string, id: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.invoice(companyId, id),
    queryFn: async () => {
      const token = await getToken();
      return api.invoices.get(token, companyId, id);
    },
    enabled: !!companyId && !!id,
  });
}

export function useInvoiceStats(companyId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.invoiceStats(companyId),
    queryFn: async () => {
      const token = await getToken();
      return api.invoices.stats(token, companyId);
    },
    enabled: !!companyId,
  });
}

export function useCreateInvoice(companyId: string) {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const token = await getToken();
      return api.invoices.create(token, companyId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoiceStats(companyId) });
    },
  });
}

export function useSendInvoice(companyId: string, id: string) {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return api.invoices.send(token, companyId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice(companyId, id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices(companyId) });
    },
  });
}

// ============================================
// Expense Hooks
// ============================================

export function useExpenses(companyId: string, params?: Record<string, string>) {
  const getToken = useToken();
  return useQuery({
    queryKey: [...queryKeys.expenses(companyId), params],
    queryFn: async () => {
      const token = await getToken();
      return api.expenses.list(token, companyId, params);
    },
    enabled: !!companyId,
  });
}

export function useUnpaidExpenses(companyId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.unpaidExpenses(companyId),
    queryFn: async () => {
      const token = await getToken();
      return api.expenses.unpaid(token, companyId);
    },
    enabled: !!companyId,
  });
}

export function useExpensesByCategory(companyId: string, params?: Record<string, string>) {
  const getToken = useToken();
  return useQuery({
    queryKey: [...queryKeys.expensesByCategory(companyId), params],
    queryFn: async () => {
      const token = await getToken();
      return api.expenses.byCategory(token, companyId, params);
    },
    enabled: !!companyId,
  });
}

export function useCreateExpense(companyId: string) {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const token = await getToken();
      return api.expenses.create(token, companyId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.unpaidExpenses(companyId) });
    },
  });
}

// ============================================
// Reports Hooks
// ============================================

export function useDashboard(companyId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.dashboard(companyId),
    queryFn: async () => {
      const token = await getToken();
      return api.reports.dashboard(token, companyId);
    },
    enabled: !!companyId,
  });
}

export function useRevenueReport(companyId: string, params?: Record<string, string>) {
  const getToken = useToken();
  return useQuery({
    queryKey: [...queryKeys.revenue(companyId), params],
    queryFn: async () => {
      const token = await getToken();
      return api.reports.revenue(token, companyId, params);
    },
    enabled: !!companyId,
  });
}

export function useProfitLossReport(companyId: string, params?: Record<string, string>) {
  const getToken = useToken();
  return useQuery({
    queryKey: [...queryKeys.profitLoss(companyId), params],
    queryFn: async () => {
      const token = await getToken();
      return api.reports.profitLoss(token, companyId, params);
    },
    enabled: !!companyId,
  });
}

export function useVatReport(companyId: string, params?: Record<string, string>) {
  const getToken = useToken();
  return useQuery({
    queryKey: [...queryKeys.vatReport(companyId), params],
    queryFn: async () => {
      const token = await getToken();
      return api.reports.vat(token, companyId, params);
    },
    enabled: !!companyId,
  });
}

// ============================================
// e-Factura Hooks
// ============================================

export function useEfacturaConfig(companyId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.efacturaConfig(companyId),
    queryFn: async () => {
      const token = await getToken();
      return api.efactura.config(token, companyId);
    },
    enabled: !!companyId,
  });
}

export function useEfacturaStatus(companyId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.efacturaStatus(companyId),
    queryFn: async () => {
      const token = await getToken();
      return api.efactura.status(token, companyId);
    },
    enabled: !!companyId,
  });
}

export function useSubmitEfactura(companyId: string) {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const token = await getToken();
      return api.efactura.submit(token, companyId, invoiceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.efacturaStatus(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.efacturaHistory(companyId) });
    },
  });
}

// ============================================
// SAF-T Hooks
// ============================================

export function useSaftHistory(companyId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.saftHistory(companyId),
    queryFn: async () => {
      const token = await getToken();
      return api.saft.history(token, companyId);
    },
    enabled: !!companyId,
  });
}

export function useGenerateSaft(companyId: string) {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      const token = await getToken();
      return api.saft.generate(token, companyId, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.saftHistory(companyId) });
    },
  });
}

// ============================================
// Receipt Hooks
// ============================================

export function useReceipts(companyId: string, params?: Record<string, string>) {
  const getToken = useToken();
  return useQuery({
    queryKey: [...queryKeys.receipts(companyId), params],
    queryFn: async () => {
      const token = await getToken();
      return api.receipts.list(token, companyId, params);
    },
    enabled: !!companyId,
  });
}

export function useUnprocessedReceipts(companyId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.unprocessedReceipts(companyId),
    queryFn: async () => {
      const token = await getToken();
      return api.receipts.unprocessed(token, companyId);
    },
    enabled: !!companyId,
  });
}

export function useUploadReceipt(companyId: string) {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken();
      return api.receipts.upload(token, companyId, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.receipts(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.unprocessedReceipts(companyId) });
    },
  });
}

// ============================================
// Bank Account Hooks
// ============================================

export function useBankAccounts(companyId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.bankAccounts(companyId),
    queryFn: async () => {
      const token = await getToken();
      return api.bankAccounts.list(token, companyId);
    },
    enabled: !!companyId,
  });
}

export function useCreateBankAccount(companyId: string) {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const token = await getToken();
      return api.bankAccounts.create(token, companyId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts(companyId) });
    },
  });
}

// ============================================
// Notification Hooks
// ============================================

export function useNotifications() {
  const getToken = useToken();
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const token = await getToken();
      return api.notifications.list(token);
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const getToken = useToken();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.notifications.markRead(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}
