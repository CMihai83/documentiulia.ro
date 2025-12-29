/**
 * ANAF API Client
 *
 * Centralized API client for all ANAF-related endpoints with:
 * - Authentication (Bearer token from localStorage)
 * - Rate limiting (10 requests/second for ANAF compliance)
 * - Retry logic with exponential backoff
 * - Mock data fallback during development
 * - Error handling and logging
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// Environment configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_ANAF === 'true';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RATE_LIMIT_DELAY_MS = 100; // 10 requests per second

// Rate limiting queue
let lastRequestTime = 0;
const requestQueue: Array<() => void> = [];
let processingQueue = false;

/**
 * Process queued requests with rate limiting
 */
const processQueue = () => {
  if (processingQueue || requestQueue.length === 0) return;

  processingQueue = true;
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest >= RATE_LIMIT_DELAY_MS) {
    const nextRequest = requestQueue.shift();
    if (nextRequest) {
      lastRequestTime = Date.now();
      nextRequest();
    }
    processingQueue = false;
    if (requestQueue.length > 0) {
      setTimeout(processQueue, RATE_LIMIT_DELAY_MS);
    }
  } else {
    processingQueue = false;
    setTimeout(processQueue, RATE_LIMIT_DELAY_MS - timeSinceLastRequest);
  }
};

/**
 * Create Axios instance with base configuration
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds for XML generation
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: Add authentication token
  client.interceptors.request.use(
    (config) => {
      // Get token from localStorage (set by auth system)
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('accessToken') || localStorage.getItem('auth_token')
        : null;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor: Handle errors and retries
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: number };

      // Handle 401 Unauthorized: Redirect to login
      if (error.response?.status === 401) {
        if (typeof window !== 'undefined') {
          // Clear tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('auth_token');

          // Redirect to login (unless already on login page)
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login?expired=true';
          }
        }
        return Promise.reject(error);
      }

      // Handle 429 Rate Limit: Wait and retry
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return client(originalRequest);
      }

      // Handle 503 Service Unavailable or network errors: Retry with exponential backoff
      if (
        (error.response?.status === 503 || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') &&
        (!originalRequest._retry || originalRequest._retry < MAX_RETRIES)
      ) {
        originalRequest._retry = (originalRequest._retry || 0) + 1;
        const delay = RETRY_DELAY_MS * Math.pow(2, originalRequest._retry - 1);

        console.warn(`Retrying request (attempt ${originalRequest._retry}/${MAX_RETRIES}) after ${delay}ms`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return client(originalRequest);
      }

      // Handle ANAF-specific errors with friendly messages
      if (error.response?.status === 400) {
        const message = (error.response.data as any)?.message || 'Date invalide trimise către ANAF';
        return Promise.reject({ ...error, friendlyMessage: message });
      }

      // Log error for debugging
      console.error('ANAF API Error:', {
        url: originalRequest.url,
        method: originalRequest.method,
        status: error.response?.status,
        message: error.message,
      });

      return Promise.reject(error);
    }
  );

  return client;
};

// Create singleton instance
export const apiClient = createApiClient();

/**
 * Make a rate-limited API request
 */
export const rateLimitedRequest = <T = any>(
  requestFn: () => Promise<T>
): Promise<T> => {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    processQueue();
  });
};

/**
 * Make API request with mock data fallback
 */
export const apiRequest = async <T = any>(
  config: AxiosRequestConfig,
  mockData?: T
): Promise<T> => {
  // Use mock data if enabled or if backend is unavailable
  if (USE_MOCK_DATA && mockData !== undefined) {
    console.log(`Using mock data for ${config.method} ${config.url}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockData;
  }

  try {
    const response = await apiClient(config);
    return response.data;
  } catch (error) {
    // Fallback to mock data on error if provided
    if (mockData !== undefined) {
      console.warn(`API request failed, falling back to mock data for ${config.url}`, error);
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockData;
    }
    throw error;
  }
};

/**
 * Helper functions for common HTTP methods
 */
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig, mockData?: T): Promise<T> => {
    return apiRequest({ ...config, method: 'GET', url }, mockData);
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig, mockData?: T): Promise<T> => {
    return apiRequest({ ...config, method: 'POST', url, data }, mockData);
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig, mockData?: T): Promise<T> => {
    return apiRequest({ ...config, method: 'PUT', url, data }, mockData);
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig, mockData?: T): Promise<T> => {
    return apiRequest({ ...config, method: 'DELETE', url }, mockData);
  },

  /**
   * Download file (e.g., XML)
   */
  download: async (url: string, filename: string): Promise<void> => {
    try {
      const response = await apiClient.get(url, {
        responseType: 'blob',
      });

      // Create blob link to download
      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  },
};

export default api;
