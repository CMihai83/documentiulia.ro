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

export interface TaxCode {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description?: string;
  tax_type: 'vat' | 'income_tax' | 'sales_tax' | 'other';
  rate: number;
  is_default: boolean;
  is_active: boolean;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TaxCodeFormData {
  code: string;
  name: string;
  description?: string;
  tax_type: 'vat' | 'income_tax' | 'sales_tax' | 'other';
  rate: number;
  is_default?: boolean;
  is_active?: boolean;
}

export const taxCodeService = {
  list: async (): Promise<TaxCode[]> => {
    const response = await api.get('/accounting/tax-codes.php');
    return response.data.data || [];
  },

  get: async (id: string): Promise<TaxCode> => {
    const response = await api.get(`/accounting/tax-codes.php?id=${id}`);
    return response.data.data;
  },

  create: async (data: TaxCodeFormData): Promise<TaxCode> => {
    const response = await api.post('/accounting/tax-codes.php', data);
    return response.data.data;
  },

  update: async (id: string, data: TaxCodeFormData): Promise<TaxCode> => {
    const response = await api.put(`/accounting/tax-codes.php?id=${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/accounting/tax-codes.php?id=${id}`);
  },

  setDefault: async (id: string): Promise<void> => {
    await api.post('/accounting/tax-codes.php', {
      action: 'set_default',
      id
    });
  }
};
