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

export interface FixedAsset {
  id: string;
  company_id: string;
  asset_code: string;
  asset_name: string;
  description?: string;
  category: string;
  purchase_date: string;
  purchase_price: number;
  salvage_value: number;
  useful_life_years: number;
  depreciation_method: 'straight_line' | 'declining_balance' | 'units_of_production';
  accumulated_depreciation: number;
  book_value: number;
  disposal_date?: string;
  disposal_value?: number;
  status: 'active' | 'disposed' | 'fully_depreciated';
  location?: string;
  serial_number?: string;
  created_at: string;
  updated_at: string;
}

export interface FixedAssetFormData {
  asset_code: string;
  asset_name: string;
  description?: string;
  category: string;
  purchase_date: string;
  purchase_price: number;
  salvage_value: number;
  useful_life_years: number;
  depreciation_method: 'straight_line' | 'declining_balance' | 'units_of_production';
  location?: string;
  serial_number?: string;
}

export interface DepreciationSchedule {
  year: number;
  opening_value: number;
  depreciation: number;
  accumulated_depreciation: number;
  closing_value: number;
}

export const fixedAssetService = {
  list: async (): Promise<FixedAsset[]> => {
    const response = await api.get('/accounting/fixed-assets.php');
    return response.data.data || [];
  },

  get: async (id: string): Promise<FixedAsset> => {
    const response = await api.get(`/accounting/fixed-assets.php?id=${id}`);
    return response.data.data;
  },

  create: async (data: FixedAssetFormData): Promise<FixedAsset> => {
    const response = await api.post('/accounting/fixed-assets.php', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<FixedAssetFormData>): Promise<FixedAsset> => {
    const response = await api.put(`/accounting/fixed-assets.php?id=${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/accounting/fixed-assets.php?id=${id}`);
  },

  dispose: async (id: string, disposalDate: string, disposalValue: number): Promise<FixedAsset> => {
    const response = await api.post('/accounting/fixed-assets.php', {
      action: 'dispose',
      id,
      disposal_date: disposalDate,
      disposal_value: disposalValue
    });
    return response.data.data;
  },

  getDepreciationSchedule: async (id: string): Promise<DepreciationSchedule[]> => {
    const response = await api.get(`/accounting/fixed-assets.php?id=${id}&schedule=true`);
    return response.data.data?.schedule || [];
  },

  calculateDepreciation: async (assetId: string, toDate: string): Promise<number> => {
    const response = await api.post('/accounting/fixed-assets.php', {
      action: 'calculate_depreciation',
      id: assetId,
      to_date: toDate
    });
    return response.data.data?.depreciation || 0;
  }
};
