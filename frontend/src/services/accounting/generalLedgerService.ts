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

export interface GeneralLedgerEntry {
  id: string;
  transaction_date: string;
  account_id: string;
  account_code: string;
  account_name: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  entry_type: string;
  created_at: string;
}

export interface GeneralLedgerFilters {
  account_id?: string;
  start_date?: string;
  end_date?: string;
  entry_type?: string;
  limit?: number;
  offset?: number;
}

export interface GeneralLedgerSummary {
  account_id: string;
  account_code: string;
  account_name: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
}

export const generalLedgerService = {
  list: async (filters?: GeneralLedgerFilters): Promise<{ entries: GeneralLedgerEntry[]; count: number }> => {
    const params = new URLSearchParams();
    if (filters?.account_id) params.append('account_id', filters.account_id);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.entry_type) params.append('entry_type', filters.entry_type);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const url = `/accounting/general-ledger.php${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return response.data.data || { entries: [], count: 0 };
  },

  getSummary: async (filters?: GeneralLedgerFilters): Promise<GeneralLedgerSummary[]> => {
    const params = new URLSearchParams();
    params.append('summary', 'true');
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const response = await api.get(`/accounting/general-ledger.php?${params.toString()}`);
    return response.data.data?.summary || [];
  },

  exportToExcel: async (filters?: GeneralLedgerFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    params.append('export', 'excel');
    if (filters?.account_id) params.append('account_id', filters.account_id);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const response = await api.get(`/accounting/general-ledger.php?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
