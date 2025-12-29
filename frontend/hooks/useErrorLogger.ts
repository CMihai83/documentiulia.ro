'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface ErrorLog {
  message: string;
  stack: string;
  type: 'ReactComponentError' | 'UnhandledError' | 'PromiseRejection' | 'NetworkError' | 'APIError';
  componentStack?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorLoggerOptions {
  enabled?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function useErrorLogger(options: ErrorLoggerOptions = {}) {
  const { enabled = true, batchSize = 5, flushInterval = 10000 } = options;
  const pathname = usePathname();
  const errorQueue = useRef<ErrorLog[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user info from localStorage
  const getUserId = useCallback(() => {
    if (typeof window === 'undefined') return 'anonymous';
    try {
      const user = localStorage.getItem('auth_user');
      if (user) {
        const parsed = JSON.parse(user);
        return parsed.id || parsed.email || 'anonymous';
      }
    } catch {
      // Ignore parse errors
    }
    return 'anonymous';
  }, []);

  // Get browser/device info
  const getBrowserInfo = useCallback(() => {
    if (typeof window === 'undefined') return {};
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      cookiesEnabled: navigator.cookieEnabled,
      online: navigator.onLine,
    };
  }, []);

  // Flush error queue to backend
  const flushErrors = useCallback(async () => {
    if (errorQueue.current.length === 0) return;

    const errorsToSend = [...errorQueue.current];
    errorQueue.current = [];

    try {
      await fetch(`${API_URL}/errors/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: JSON.stringify({ errors: errorsToSend }),
      });
    } catch (err) {
      // If batch fails, try individual errors
      console.error('[ErrorLogger] Batch send failed, trying individual:', err);
      for (const error of errorsToSend) {
        try {
          await fetch(`${API_URL}/errors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(error),
          });
        } catch {
          // Log to console as last resort
          console.error('[ErrorLogger] Failed to send error:', error);
        }
      }
    }
  }, []);

  // Log a single error
  const logError = useCallback(
    (error: Partial<ErrorLog> & { message: string }) => {
      if (!enabled) {
        console.error('[ErrorLogger] Error (logging disabled):', error);
        return;
      }

      const enrichedError: ErrorLog = {
        message: error.message,
        stack: error.stack || '',
        type: error.type || 'UnhandledError',
        componentStack: error.componentStack,
        url: typeof window !== 'undefined' ? window.location.href : pathname,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        userId: getUserId(),
        metadata: {
          ...error.metadata,
          ...getBrowserInfo(),
          timestamp: new Date().toISOString(),
          pathname,
        },
      };

      // Log to console in development but still send to server
      if (process.env.NODE_ENV === 'development') {
        console.error('[ErrorLogger]', enrichedError);
      }

      // Add to queue
      errorQueue.current.push(enrichedError);

      // Flush if batch size reached
      if (errorQueue.current.length >= batchSize) {
        flushErrors();
      }
    },
    [enabled, pathname, getUserId, getBrowserInfo, batchSize, flushErrors]
  );

  // Log API errors
  const logApiError = useCallback(
    (endpoint: string, status: number, message: string, requestData?: unknown) => {
      logError({
        message: `API Error: ${endpoint} returned ${status} - ${message}`,
        type: 'APIError',
        metadata: {
          endpoint,
          status,
          requestData: requestData ? JSON.stringify(requestData).slice(0, 500) : undefined,
        },
      });
    },
    [logError]
  );

  // Log network errors
  const logNetworkError = useCallback(
    (url: string, error: Error) => {
      logError({
        message: `Network Error: ${url} - ${error.message}`,
        stack: error.stack,
        type: 'NetworkError',
        metadata: { url },
      });
    },
    [logError]
  );

  // Set up global error handlers
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Capture unhandled errors
    const handleUnhandledError = (event: ErrorEvent) => {
      logError({
        message: event.message || 'Unknown error',
        stack: event.error?.stack || '',
        type: 'UnhandledError',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      logError({
        message: reason?.message || String(reason) || 'Unhandled Promise Rejection',
        stack: reason?.stack || '',
        type: 'PromiseRejection',
      });
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Set up periodic flush
    flushTimeoutRef.current = setInterval(() => {
      flushErrors();
    }, flushInterval);

    // Flush on page unload
    const handleUnload = () => {
      flushErrors();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('beforeunload', handleUnload);
      if (flushTimeoutRef.current) {
        clearInterval(flushTimeoutRef.current);
      }
      // Flush remaining errors on cleanup
      flushErrors();
    };
  }, [enabled, logError, flushErrors, flushInterval]);

  return {
    logError,
    logApiError,
    logNetworkError,
    flushErrors,
  };
}

// Singleton instance for use outside React components
let globalLogError: ((error: Partial<ErrorLog> & { message: string }) => void) | null = null;

export function setGlobalErrorLogger(logger: typeof globalLogError) {
  globalLogError = logger;
}

export function logErrorGlobal(error: Partial<ErrorLog> & { message: string }) {
  if (globalLogError) {
    globalLogError(error);
  } else {
    console.error('[ErrorLogger] Global logger not initialized:', error);
  }
}

export function getGlobalErrorLogger() {
  return globalLogError;
}
