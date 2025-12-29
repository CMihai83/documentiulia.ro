const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const ORG_STORAGE_KEY = 'current_organization_id';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  retryOn?: (status: number) => boolean;
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  organizationId?: string | null;
  skipOrgHeader?: boolean;
  params?: Record<string, string | number | boolean | undefined>;
  responseType?: 'json' | 'blob' | 'text';
  retry?: RetryOptions;
}

// Default retry configuration
const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  retryOn: (status: number) => status >= 500 || status === 0, // Retry on server errors or network failures
};

// Sleep with jitter for exponential backoff
function sleep(ms: number): Promise<void> {
  const jitter = Math.random() * ms * 0.1; // Add 10% jitter
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

// Calculate delay with exponential backoff
function getBackoffDelay(attempt: number, initialDelay: number, maxDelay: number): number {
  const delay = initialDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    // SSR: Cannot access localStorage or cookies directly
    // Token will be passed via headers from middleware or cookie
    return null;
  }

  // Client-side: Try localStorage first (faster)
  const localToken = localStorage.getItem('auth_token');
  if (localToken) return localToken;

  // Fallback: Try to read from cookie
  const cookieToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth_token='))
    ?.split('=')[1];

  return cookieToken || null;
}

function getStoredOrgId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ORG_STORAGE_KEY);
}

function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  document.cookie = 'auth_token=; path=/; max-age=0';
}

function redirectToLogin(returnUrl?: string): void {
  if (typeof window === 'undefined') return;
  const locale = window.location.pathname.split('/')[1] || 'ro';
  const loginPath = `/${locale}/login`;
  const url = returnUrl ? `${loginPath}?returnUrl=${encodeURIComponent(returnUrl)}` : loginPath;
  window.location.href = url;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    skipAuth = false,
    organizationId,
    skipOrgHeader = false,
    headers: customHeaders,
    params,
    responseType = 'json',
    retry: retryOptions,
    ...restOptions
  } = options;

  // Merge retry options with defaults
  const retry = retryOptions !== undefined ? { ...DEFAULT_RETRY, ...retryOptions } : DEFAULT_RETRY;
  const { maxRetries, initialDelay, maxDelay, retryOn } = retry;

  // Build URL with query parameters
  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  // Add organization header for tenant-scoped requests
  if (!skipOrgHeader) {
    const orgId = organizationId ?? getStoredOrgId();
    if (orgId) {
      (headers as Record<string, string>)['x-organization-id'] = orgId;
    }
  }

  let lastError: string = 'Request failed';
  let lastStatus: number = 0;

  for (let attempt = 0; attempt <= (maxRetries || 0); attempt++) {
    try {
      const response = await fetch(url, {
        ...restOptions,
        headers,
      });

      // Handle 401 Unauthorized - session expired or invalid (don't retry)
      if (response.status === 401) {
        clearAuthData();
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : undefined;
        redirectToLogin(currentPath);
        return { status: 401, error: 'Session expired. Please login again.' };
      }

      // Handle 403 Forbidden - insufficient permissions (don't retry)
      if (response.status === 403) {
        return { status: 403, error: 'You do not have permission to perform this action.' };
      }

      // Parse response
      let data: T | undefined;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      }

      // Check if we should retry on this status
      if (!response.ok) {
        lastStatus = response.status;
        lastError = (data as Record<string, unknown>)?.message as string || 'Request failed';

        // Retry if configured and this is a retryable status
        if (retryOn && retryOn(response.status) && attempt < (maxRetries || 0)) {
          const delay = getBackoffDelay(attempt, initialDelay || 1000, maxDelay || 10000);
          console.log(`API retry ${attempt + 1}/${maxRetries} for ${endpoint} after ${delay}ms (status: ${response.status})`);
          await sleep(delay);
          continue;
        }

        return { status: response.status, error: lastError };
      }

      return { status: response.status, data };
    } catch (error) {
      lastStatus = 0;
      lastError = 'Network error. Please check your connection.';
      console.error(`API request failed (attempt ${attempt + 1}/${(maxRetries || 0) + 1}):`, error);

      // Retry on network errors
      if (retryOn && retryOn(0) && attempt < (maxRetries || 0)) {
        const delay = getBackoffDelay(attempt, initialDelay || 1000, maxDelay || 10000);
        console.log(`API retry ${attempt + 1}/${maxRetries} for ${endpoint} after ${delay}ms (network error)`);
        await sleep(delay);
        continue;
      }
    }
  }

  return { status: lastStatus, error: lastError };
}

// Convenience methods
export const api = {
  get: <T = unknown>(endpoint: string, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),

  put: <T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),

  patch: <T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T = unknown>(endpoint: string, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Session validation hook helper
export async function validateSession(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      clearAuthData();
      return false;
    }

    return response.ok;
  } catch {
    return false;
  }
}

export { API_URL };
