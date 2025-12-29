// Sentry client-side configuration for DocumentIulia.ro
// This file configures error tracking for the browser

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay for debugging user issues
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out known non-critical errors
  beforeSend(event, hint) {
    // Don't send errors in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
      return null;
    }

    // Filter out network errors for known flaky endpoints
    const error = hint.originalException as Error;
    if (error?.message?.includes('NetworkError')) {
      return null;
    }

    // Add Romanian-specific context
    event.tags = {
      ...event.tags,
      locale: typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'ro' : 'ro',
      platform: 'documentiulia-frontend',
    };

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'chrome-extension://',
    'moz-extension://',
    // Network errors
    'NetworkError',
    'Failed to fetch',
    'Load failed',
    // Common non-issues
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
  ],

  // Only track errors from our domain
  allowUrls: [
    /https?:\/\/documentiulia\.ro/,
    /https?:\/\/localhost/,
  ],
});
