import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse, User, DashboardMetrics, Invoice, OCRResult, VATCalculation } from '../types';

const API_BASE_URL = __DEV__
  ? 'http://localhost:4000/api/v1'
  : 'https://api.documentiulia.ro/api/v1';

class ApiService {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired, trigger logout
          this.clearAuthToken();
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
    try {
      const response = await this.client.post('/auth/login', { email, password });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  }

  async register(email: string, password: string, name: string): Promise<ApiResponse<{ token: string; user: User }>> {
    try {
      const response = await this.client.post('/auth/register', { email, password, name });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Registration failed' };
    }
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const response = await this.client.post('/auth/refresh');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Token refresh failed' };
    }
  }

  // Dashboard
  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    try {
      const response = await this.client.get('/dashboard/metrics');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch dashboard' };
    }
  }

  async getAIInsights(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/ai/insights/dashboard');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch AI insights' };
    }
  }

  // Invoices
  async getInvoices(params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<{ invoices: Invoice[]; total: number }>> {
    try {
      const response = await this.client.get('/invoices', { params });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch invoices' };
    }
  }

  async getInvoice(id: string): Promise<ApiResponse<Invoice>> {
    try {
      const response = await this.client.get(`/invoices/${id}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch invoice' };
    }
  }

  async createInvoice(invoice: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
    try {
      const response = await this.client.post('/invoices', invoice);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to create invoice' };
    }
  }

  async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
    try {
      const response = await this.client.put(`/invoices/${id}`, invoice);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to update invoice' };
    }
  }

  async deleteInvoice(id: string): Promise<ApiResponse<void>> {
    try {
      await this.client.delete(`/invoices/${id}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to delete invoice' };
    }
  }

  // OCR
  async processOCR(imageUri: string): Promise<ApiResponse<OCRResult>> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'invoice.jpg',
      } as any);

      const response = await this.client.post('/ocr/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'OCR processing failed' };
    }
  }

  // VAT Calculation
  async calculateVAT(amount: number, vatRate: number, currency: string = 'RON'): Promise<ApiResponse<VATCalculation>> {
    try {
      const response = await this.client.post('/vat/calculate', { amount, vatRate, currency });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'VAT calculation failed' };
    }
  }

  async getVATRates(): Promise<ApiResponse<{ standard: number; reduced: number[]; superReduced?: number }>> {
    try {
      const response = await this.client.get('/vat/rates');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch VAT rates' };
    }
  }

  // EU VAT
  async getEUVATCountries(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get('/eu-vat/countries');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch EU VAT countries' };
    }
  }

  async validateVATNumber(vatNumber: string): Promise<ApiResponse<{ valid: boolean; companyName?: string }>> {
    try {
      const response = await this.client.post('/eu-vat/validate-vies', { vatNumber });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'VAT validation failed' };
    }
  }

  // Notifications
  async registerPushToken(token: string): Promise<ApiResponse<void>> {
    try {
      await this.client.post('/notifications/register', { token });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to register push token' };
    }
  }

  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    try {
      const response = await this.client.get('/notifications');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch notifications' };
    }
  }

  // Subscription
  async getSubscriptionPlans(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get('/subscription/plans');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch plans' };
    }
  }

  async getCurrentSubscription(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/subscription/current');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch subscription' };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    try {
      const response = await this.client.get('/health');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: 'API not available' };
    }
  }
}

export default new ApiService();
