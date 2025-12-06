/**
 * DocumentIulia API Client
 * Connects Next.js frontend to NestJS API v2
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface RequestOptions extends RequestInit {
  token?: string;
  companyId?: string;
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { token, companyId, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (companyId) {
      headers['x-company-id'] = companyId;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.message || 'An error occurred',
          statusCode: response.status,
        };
      }

      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        statusCode: 500,
      };
    }
  }

  // Auth endpoints
  auth = {
    me: (token: string) => this.request('/auth/me', { token }),
  };

  // Users endpoints
  users = {
    me: (token: string) => this.request('/users/me', { token }),
    myCompanies: (token: string) => this.request('/users/me/companies', { token }),
    update: (token: string, data: Record<string, unknown>) =>
      this.request('/users/me', { method: 'PUT', token, body: JSON.stringify(data) }),
  };

  // Companies endpoints
  companies = {
    list: (token: string) => this.request('/companies', { token }),
    get: (token: string, id: string) => this.request(`/companies/${id}`, { token }),
    create: (token: string, data: Record<string, unknown>) =>
      this.request('/companies', { method: 'POST', token, body: JSON.stringify(data) }),
    update: (token: string, id: string, data: Record<string, unknown>) =>
      this.request(`/companies/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),
    delete: (token: string, id: string) =>
      this.request(`/companies/${id}`, { method: 'DELETE', token }),
    stats: (token: string, id: string) => this.request(`/companies/${id}/stats`, { token }),
    members: (token: string, id: string) => this.request(`/companies/${id}/members`, { token }),
  };

  // Clients endpoints
  clients = {
    list: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/clients${query}`, { token });
    },
    get: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/clients/${id}`, { token }),
    create: (token: string, companyId: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/clients`, { method: 'POST', token, body: JSON.stringify(data) }),
    update: (token: string, companyId: string, id: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/clients/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),
    delete: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/clients/${id}`, { method: 'DELETE', token }),
    stats: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/clients/${id}/stats`, { token }),
  };

  // Products endpoints
  products = {
    list: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/products${query}`, { token });
    },
    get: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/products/${id}`, { token }),
    create: (token: string, companyId: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/products`, { method: 'POST', token, body: JSON.stringify(data) }),
    update: (token: string, companyId: string, id: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/products/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),
    delete: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/products/${id}`, { method: 'DELETE', token }),
    lowStock: (token: string, companyId: string) =>
      this.request(`/companies/${companyId}/products/low-stock`, { token }),
  };

  // Invoices endpoints
  invoices = {
    list: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/invoices${query}`, { token, companyId });
    },
    get: (token: string, companyId: string, id: string) =>
      this.request(`/invoices/${id}`, { token, companyId }),
    create: (token: string, companyId: string, data: Record<string, unknown>) =>
      this.request('/invoices', { method: 'POST', token, companyId, body: JSON.stringify(data) }),
    update: (token: string, companyId: string, id: string, data: Record<string, unknown>) =>
      this.request(`/invoices/${id}`, { method: 'PUT', token, companyId, body: JSON.stringify(data) }),
    delete: (token: string, companyId: string, id: string) =>
      this.request(`/invoices/${id}`, { method: 'DELETE', token, companyId }),
    send: (token: string, companyId: string, id: string) =>
      this.request(`/invoices/${id}/send`, { method: 'POST', token, companyId }),
    pay: (token: string, companyId: string, id: string, data: Record<string, unknown>) =>
      this.request(`/invoices/${id}/pay`, { method: 'POST', token, companyId, body: JSON.stringify(data) }),
    stats: (token: string, companyId: string) =>
      this.request('/invoices/stats', { token, companyId }),
  };

  // Expenses endpoints
  expenses = {
    list: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/expenses${query}`, { token });
    },
    get: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/expenses/${id}`, { token }),
    create: (token: string, companyId: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/expenses`, { method: 'POST', token, body: JSON.stringify(data) }),
    update: (token: string, companyId: string, id: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/expenses/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),
    delete: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/expenses/${id}`, { method: 'DELETE', token }),
    markPaid: (token: string, companyId: string, id: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/expenses/${id}/mark-paid`, { method: 'PUT', token, body: JSON.stringify(data) }),
    unpaid: (token: string, companyId: string) =>
      this.request(`/companies/${companyId}/expenses/unpaid`, { token }),
    byCategory: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/expenses/by-category${query}`, { token });
    },
    monthlyTotals: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/expenses/monthly-totals${query}`, { token });
    },
  };

  // Reports endpoints
  reports = {
    dashboard: (token: string, companyId: string) =>
      this.request(`/companies/${companyId}/reports/dashboard`, { token }),
    revenue: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/reports/revenue${query}`, { token });
    },
    expenses: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/reports/expenses${query}`, { token });
    },
    profitLoss: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/reports/profit-loss${query}`, { token });
    },
    vat: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/reports/vat${query}`, { token });
    },
    cashflow: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/reports/cashflow${query}`, { token });
    },
  };

  // e-Factura endpoints
  efactura = {
    config: (token: string, companyId: string) =>
      this.request(`/companies/${companyId}/efactura/config`, { token }),
    saveConfig: (token: string, companyId: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/efactura/config`, { method: 'POST', token, body: JSON.stringify(data) }),
    validate: (token: string, companyId: string, invoiceId: string) =>
      this.request(`/companies/${companyId}/efactura/validate`, { method: 'POST', token, body: JSON.stringify({ invoiceId }) }),
    generateXml: (token: string, companyId: string, invoiceId: string) =>
      this.request(`/companies/${companyId}/efactura/generate-xml`, { method: 'POST', token, body: JSON.stringify({ invoiceId }) }),
    submit: (token: string, companyId: string, invoiceId: string) =>
      this.request(`/companies/${companyId}/efactura/submit`, { method: 'POST', token, body: JSON.stringify({ invoiceId }) }),
    status: (token: string, companyId: string) =>
      this.request(`/companies/${companyId}/efactura/status`, { token }),
    history: (token: string, companyId: string) =>
      this.request(`/companies/${companyId}/efactura/history`, { token }),
  };

  // SAF-T endpoints
  saft = {
    generate: (token: string, companyId: string, params: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/saft/generate`, { method: 'POST', token, body: JSON.stringify(params) }),
    validate: (token: string, companyId: string, params: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/saft/validate`, { method: 'POST', token, body: JSON.stringify(params) }),
    preview: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/saft/preview${query}`, { token });
    },
    history: (token: string, companyId: string) =>
      this.request(`/companies/${companyId}/saft/history`, { token }),
    download: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/saft/download/${id}`, { token }),
  };

  // Receipts endpoints
  receipts = {
    list: (token: string, companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/receipts${query}`, { token });
    },
    get: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/receipts/${id}`, { token }),
    upload: async (token: string, companyId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/companies/${companyId}/receipts/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      return response.json();
    },
    updateOcr: (token: string, companyId: string, id: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/receipts/${id}/ocr`, { method: 'PUT', token, body: JSON.stringify(data) }),
    linkExpense: (token: string, companyId: string, id: string, expenseId: string) =>
      this.request(`/companies/${companyId}/receipts/${id}/link-expense`, { method: 'POST', token, body: JSON.stringify({ expenseId }) }),
    createExpense: (token: string, companyId: string, id: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/receipts/${id}/create-expense`, { method: 'POST', token, body: JSON.stringify(data) }),
    reprocess: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/receipts/${id}/reprocess`, { method: 'POST', token }),
    unprocessed: (token: string, companyId: string) =>
      this.request(`/companies/${companyId}/receipts/unprocessed`, { token }),
    needsReview: (token: string, companyId: string) =>
      this.request(`/companies/${companyId}/receipts/needs-review`, { token }),
  };

  // Bank Accounts endpoints
  bankAccounts = {
    list: (token: string, companyId: string) =>
      this.request(`/companies/${companyId}/bank-accounts`, { token }),
    get: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/bank-accounts/${id}`, { token }),
    create: (token: string, companyId: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/bank-accounts`, { method: 'POST', token, body: JSON.stringify(data) }),
    update: (token: string, companyId: string, id: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/bank-accounts/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),
    delete: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/bank-accounts/${id}`, { method: 'DELETE', token }),
    setDefault: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/bank-accounts/${id}/set-default`, { method: 'PUT', token }),
    transactions: (token: string, companyId: string, id: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/companies/${companyId}/bank-accounts/${id}/transactions${query}`, { token });
    },
    sync: (token: string, companyId: string, id: string) =>
      this.request(`/companies/${companyId}/bank-accounts/${id}/sync`, { method: 'POST', token }),
    connect: (token: string, companyId: string, data: Record<string, unknown>) =>
      this.request(`/companies/${companyId}/bank-accounts/connect`, { method: 'POST', token, body: JSON.stringify(data) }),
  };

  // Notifications endpoints
  notifications = {
    list: (token: string) => this.request('/notifications', { token }),
    markRead: (token: string, id: string) =>
      this.request(`/notifications/${id}/read`, { method: 'PUT', token }),
    markAllRead: (token: string) =>
      this.request('/notifications/read-all', { method: 'PUT', token }),
  };

  // Activity endpoints
  activity = {
    list: (token: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/activity${query}`, { token });
    },
    recent: (token: string, limit?: number) =>
      this.request(`/activity/recent${limit ? `?limit=${limit}` : ''}`, { token }),
    stats: (token: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return this.request(`/activity/stats${query}`, { token });
    },
    me: (token: string, limit?: number) =>
      this.request(`/activity/me${limit ? `?limit=${limit}` : ''}`, { token }),
    byEntity: (token: string, entityType: string, entityId: string) =>
      this.request(`/activity/entity/${entityType}/${entityId}`, { token }),
  };
}

// Export singleton instance
export const api = new ApiClient();

// Export types
export type { ApiResponse, RequestOptions };
