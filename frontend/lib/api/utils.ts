import * as Sentry from '@sentry/nextjs';

/**
 * API Utilities - DocumentIulia.ro
 * Timeout handling, retry logic, and error management
 */

// Romanian error messages
const ERROR_MESSAGES = {
  timeout: 'Operațiunea a expirat. Vă rugăm să încercați din nou.',
  network: 'Eroare de rețea. Verificați conexiunea la internet.',
  server: 'Eroare de server. Încercați din nou mai târziu.',
  unauthorized: 'Sesiunea a expirat. Vă rugăm să vă autentificați din nou.',
  forbidden: 'Nu aveți permisiunea de a efectua această operațiune.',
  notFound: 'Resursa solicitată nu a fost găsită.',
  validation: 'Date invalide. Verificați informațiile introduse.',
  rateLimit: 'Prea multe cereri. Așteptați câteva secunde.',
  unknown: 'A apărut o eroare neașteptată.',
} as const;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly messageRo: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Wrap a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 10000,
  errorMsg: string = ERROR_MESSAGES.timeout
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new ApiError('Request timeout', errorMsg, 408);
      Sentry.captureException(error, { extra: { timeout: ms } });
      reject(error);
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Retry a promise with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (err) => err?.statusCode >= 500 || err?.message?.includes('network'),
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Handle API response and convert to appropriate error
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return response.text() as unknown as T;
  }

  let errorMessage: string;
  let errorMessageRo: string;

  switch (response.status) {
    case 401:
      errorMessage = 'Unauthorized';
      errorMessageRo = ERROR_MESSAGES.unauthorized;
      break;
    case 403:
      errorMessage = 'Forbidden';
      errorMessageRo = ERROR_MESSAGES.forbidden;
      break;
    case 404:
      errorMessage = 'Not found';
      errorMessageRo = ERROR_MESSAGES.notFound;
      break;
    case 422:
      errorMessage = 'Validation error';
      errorMessageRo = ERROR_MESSAGES.validation;
      break;
    case 429:
      errorMessage = 'Rate limited';
      errorMessageRo = ERROR_MESSAGES.rateLimit;
      break;
    default:
      if (response.status >= 500) {
        errorMessage = 'Server error';
        errorMessageRo = ERROR_MESSAGES.server;
      } else {
        errorMessage = 'Unknown error';
        errorMessageRo = ERROR_MESSAGES.unknown;
      }
  }

  // Try to get error details from response body
  let details: Record<string, any> | undefined;
  try {
    details = await response.json();
    if (details?.message) {
      errorMessageRo = details.message;
    }
  } catch {
    // Ignore JSON parse errors
  }

  const error = new ApiError(errorMessage, errorMessageRo, response.status, details);
  Sentry.captureException(error, {
    extra: { status: response.status, url: response.url },
  });

  throw error;
}

/**
 * Create a fetch wrapper with timeout and error handling
 */
export function createApiClient(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
  return {
    async get<T>(path: string, options: { timeout?: number; headers?: Record<string, string> } = {}): Promise<T> {
      const response = await withTimeout(
        fetch(`${baseUrl}${path}`, {
          method: 'GET',
          headers: { ...defaultHeaders, ...options.headers },
        }),
        options.timeout
      );
      return handleApiResponse<T>(response);
    },

    async post<T>(
      path: string,
      data: any,
      options: { timeout?: number; headers?: Record<string, string> } = {}
    ): Promise<T> {
      const response = await withTimeout(
        fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...defaultHeaders,
            ...options.headers,
          },
          body: JSON.stringify(data),
        }),
        options.timeout
      );
      return handleApiResponse<T>(response);
    },

    async put<T>(
      path: string,
      data: any,
      options: { timeout?: number; headers?: Record<string, string> } = {}
    ): Promise<T> {
      const response = await withTimeout(
        fetch(`${baseUrl}${path}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...defaultHeaders,
            ...options.headers,
          },
          body: JSON.stringify(data),
        }),
        options.timeout
      );
      return handleApiResponse<T>(response);
    },

    async delete<T>(path: string, options: { timeout?: number; headers?: Record<string, string> } = {}): Promise<T> {
      const response = await withTimeout(
        fetch(`${baseUrl}${path}`, {
          method: 'DELETE',
          headers: { ...defaultHeaders, ...options.headers },
        }),
        options.timeout
      );
      return handleApiResponse<T>(response);
    },
  };
}

export { ERROR_MESSAGES };
