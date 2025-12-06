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

export interface JournalEntryLine {
  id?: string;
  account_id: string;
  account_code?: string;
  account_name?: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_number: string;
  entry_date: string;
  entry_type: string;
  description: string;
  reference?: string;
  status: 'draft' | 'posted' | 'voided';
  total_debit: number;
  total_credit: number;
  created_by: string;
  posted_by?: string;
  posted_at?: string;
  created_at: string;
  updated_at: string;
  lines: JournalEntryLine[];
}

export interface JournalEntryFormData {
  entry_date: string;
  entry_type: string;
  description: string;
  reference?: string;
  lines: JournalEntryLine[];
}

export interface JournalEntryFilters {
  status?: string;
  entry_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export const journalEntryService = {
  list: async (filters?: JournalEntryFilters): Promise<{ entries: JournalEntry[]; count: number }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.entry_type) params.append('entry_type', filters.entry_type);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await api.get(`/accounting/journal-entries.php?${params.toString()}`);
    return response.data.data || { entries: [], count: 0 };
  },

  getById: async (id: string): Promise<JournalEntry> => {
    const response = await api.get(`/accounting/journal-entries.php?id=${id}`);
    return response.data.data.entry;
  },

  create: async (data: JournalEntryFormData): Promise<{ entry_id: string; entry: JournalEntry }> => {
    const response = await api.post('/accounting/journal-entries.php', data);
    return response.data.data;
  },

  post: async (entryId: string): Promise<void> => {
    await api.post('/accounting/journal-entries.php?action=post', { entry_id: entryId });
  },
};
