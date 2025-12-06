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

export interface Payment {
  id: string;
  company_id: string;
  payment_type: string;
  payment_date: string;
  amount: number;
  currency: string;
  reference_number?: string;
  contact_id?: string;
  contact_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentFormData {
  payment_type: string;
  payment_date: string;
  amount: number;
  currency?: string;
  reference_number?: string;
  contact_id?: string;
  status?: string;
}

export const paymentService = {
  list: async (): Promise<Payment[]> => {
    const response = await api.get('/payments/payments.php');
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Payment> => {
    const response = await api.get(`/payments/payments.php?id=${id}`);
    return response.data.data;
  },

  create: async (data: PaymentFormData): Promise<{ id: string }> => {
    const response = await api.post('/payments/payments.php', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<PaymentFormData>): Promise<void> => {
    await api.put('/payments/payments.php', { id, ...data });
  },

  delete: async (id: string): Promise<void> => {
    await api.delete('/payments/payments.php', { data: { id } });
  },
};
