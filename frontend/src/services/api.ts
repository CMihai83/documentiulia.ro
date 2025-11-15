import axios from 'axios';
import type {
  AuthResponse,
  User,
  Invoice,
  Contact,
  Expense,
  Insight,
  CashFlowForecast,
  DashboardStats
} from '../types';

const API_BASE_URL = '/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  const companyId = localStorage.getItem('company_id');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (companyId) {
    config.headers['X-Company-ID'] = companyId;
  }

  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('company_id');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Company API
export const companyAPI = {
  create: async (data: { name: string; tax_id: string; currency: string }) => {
    const response = await api.post('/companies/create', data);
    return response.data;
  },
};

// Invoice API
export const invoiceAPI = {
  list: async (): Promise<Invoice[]> => {
    const response = await api.get('/invoices/list');
    return response.data.data || [];
  },

  create: async (data: Partial<Invoice>): Promise<Invoice> => {
    const response = await api.post('/invoices/create', data);
    return response.data.invoice;
  },

  update: async (id: number, data: Partial<Invoice>): Promise<Invoice> => {
    const response = await api.put(`/invoices/${id}`, data);
    return response.data.invoice;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/invoices/${id}`);
  },

  sendEmail: async (id: number): Promise<void> => {
    await api.post(`/invoices/${id}/send`);
  },
};

// Contact API
export const contactAPI = {
  list: async (type?: string): Promise<Contact[]> => {
    const params = type ? { type } : {};
    const response = await api.get('/contacts/list', { params });
    return response.data.data?.contacts || [];
  },

  create: async (data: Partial<Contact>): Promise<Contact> => {
    const response = await api.post('/contacts/create', data);
    return response.data.contact;
  },

  update: async (id: number, data: Partial<Contact>): Promise<Contact> => {
    const response = await api.put(`/contacts/${id}`, data);
    return response.data.contact;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/contacts/${id}`);
  },
};

// Expense API
export const expenseAPI = {
  list: async (): Promise<Expense[]> => {
    const response = await api.get('/expenses/list');
    return response.data.data?.expenses || [];
  },

  create: async (data: FormData): Promise<Expense> => {
    const response = await api.post('/expenses/create', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.expense;
  },

  update: async (id: number, data: Partial<Expense>): Promise<Expense> => {
    const response = await api.put(`/expenses/${id}`, data);
    return response.data.expense;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/expenses/${id}`);
  },
};

// Insights API
export const insightsAPI = {
  list: async (): Promise<Insight[]> => {
    const response = await api.get('/insights/list');
    return response.data.insights || [];
  },

  generate: async (): Promise<Insight[]> => {
    const response = await api.post('/insights/generate');
    return response.data.insights || [];
  },

  dismiss: async (id: number): Promise<void> => {
    await api.post('/insights/dismiss', { insight_id: id });
  },
};

// Forecasting API
export const forecastingAPI = {
  getCashFlow: async (): Promise<CashFlowForecast[]> => {
    const response = await api.get('/forecasting/cash-flow');
    return response.data.forecast || [];
  },

  generate: async (): Promise<CashFlowForecast[]> => {
    const response = await api.post('/forecasting/generate');
    return response.data.forecast || [];
  },

  getRunway: async (): Promise<{ months: number; burn_rate: number }> => {
    const response = await api.get('/forecasting/runway');
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data.data;
  },
};

// Reports API
export const reportsAPI = {
  getProfitLoss: async (startDate: string, endDate: string) => {
    const response = await api.get('/reports/profit-loss', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  getBalanceSheet: async (date: string) => {
    const response = await api.get('/reports/balance-sheet', {
      params: { date },
    });
    return response.data;
  },

  getCashFlow: async (startDate: string, endDate: string) => {
    const response = await api.get('/reports/cash-flow', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },
};

export default api;
