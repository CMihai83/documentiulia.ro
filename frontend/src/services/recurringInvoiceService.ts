import axios from 'axios';

const API_BASE_URL = '/api/v1';

// Create axios instance
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

export interface RecurringInvoice {
  id: number;
  user_id: string;
  subscription_id?: number;
  invoice_id?: string;
  frequency: string;
  next_invoice_date: string;
  amount: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  customer_name?: string;
  description?: string;
}

export interface RecurringInvoiceFormData {
  customer_id?: string;
  frequency: string;
  next_invoice_date: string;
  amount: number;
  currency?: string;
  description?: string;
  line_items?: any[];
}

export interface RecurringInvoiceStats {
  total_active: number;
  total_paused: number;
  monthly_revenue: number;
}

export const recurringInvoiceService = {
  list: async (): Promise<{ recurring_invoices: RecurringInvoice[]; statistics: RecurringInvoiceStats }> => {
    const response = await api.get('/recurring-invoices/list.php');
    return response.data.data || { recurring_invoices: [], statistics: {} };
  },

  getById: async (id: number): Promise<RecurringInvoice> => {
    const response = await api.get(`/recurring-invoices/get.php?id=${id}`);
    return response.data.data;
  },

  create: async (data: RecurringInvoiceFormData): Promise<{ id: number }> => {
    const response = await api.post('/recurring-invoices/create.php', data);
    return response.data.data;
  },

  update: async (id: number, data: Partial<RecurringInvoiceFormData>): Promise<void> => {
    await api.put('/recurring-invoices/update.php', { id, ...data });
  },

  cancel: async (id: number): Promise<void> => {
    await api.post('/recurring-invoices/cancel.php', { id });
  },
};
