// Sentry server-side configuration for DocumentIulia.ro
// This file configures error tracking for Next.js server components and API routes

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // Performance monitoring - lower sample rate for server to reduce overhead
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Server-specific integrations
  integrations: [
    Sentry.prismaIntegration(), // If using Prisma ORM
  ],

  // Filter and enhance events
  beforeSend(event, hint) {
    // Add server-specific context
    event.tags = {
      ...event.tags,
      runtime: 'server',
      platform: 'documentiulia-backend',
    };

    // Capture ANAF API errors with extra context
    const error = hint.originalException as Error;
    if (error?.message?.includes('ANAF')) {
      event.tags = {
        ...event.tags,
        integration: 'anaf',
        compliance_critical: 'true',
      };
      event.level = 'error';
    }

    return event;
  },

  // Ignore specific server errors
  ignoreErrors: [
    // Expected authentication errors
    'UNAUTHENTICATED',
    'JWT expired',
    // Rate limiting (handled gracefully)
    'Too Many Requests',
  ],
});
