// Sentry Edge Runtime configuration for DocumentIulia.ro
// This file configures error tracking for Edge functions and middleware

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // Lower sample rate for edge to minimize latency impact
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.5,

  // Edge-specific filtering
  beforeSend(event) {
    event.tags = {
      ...event.tags,
      runtime: 'edge',
      platform: 'documentiulia-edge',
    };
    return event;
  },
});
