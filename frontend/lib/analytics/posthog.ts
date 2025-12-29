'use client';

import posthog from 'posthog-js';
import { useUIStore } from '@/lib/state/uiStore';
import type { FeatureFlag, ABTestVariant } from '@/lib/state/uiStore';

/**
 * PostHog Analytics & Feature Flags - DocumentIulia.ro
 * Handles A/B testing, feature flags, and user analytics
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';

let initialized = false;

/**
 * Initialize PostHog with Romanian business context
 */
export function initPostHog() {
  if (initialized || !POSTHOG_KEY || typeof window === 'undefined') {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.debug();
      }
    },
    persistence: 'localStorage',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
    disable_session_recording: true,
    opt_out_capturing_by_default: false,
  });

  initialized = true;
}

export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (!initialized) return;
  posthog.identify(userId, {
    ...properties,
    platform: 'documentiulia-frontend',
    locale: typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'ro' : 'ro',
  });
}

export function trackPageView(pageName?: string) {
  if (!initialized) return;
  posthog.capture('$pageview', {
    page_name: pageName,
    locale: typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'ro' : 'ro',
  });
}

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (!initialized) return;
  posthog.capture(eventName, { ...properties, platform: 'documentiulia-frontend' });
}

export function trackComplianceEvent(
  action: 'efactura_submitted' | 'saft_generated' | 'vat_calculated' | 'anaf_checked',
  properties?: Record<string, any>
) {
  trackEvent(`compliance_${action}`, { ...properties, compliance_type: action });
}

export function getFeatureFlag(flagKey: string): boolean | string | undefined {
  if (!initialized) return undefined;
  return posthog.getFeatureFlag(flagKey);
}

export function isFeatureEnabled(flagKey: FeatureFlag): boolean {
  if (!initialized) return false;
  return posthog.isFeatureEnabled(flagKey) ?? false;
}

export function getABTestVariant(testName: string): ABTestVariant {
  if (!initialized) return 'control';
  const variant = posthog.getFeatureFlag(testName);
  if (variant === 'variant-a' || variant === 'variant-b') return variant;
  return 'control';
}

export function syncFeatureFlags() {
  if (!initialized) return;
  const flags = posthog.featureFlags.getFlags() as FeatureFlag[];
  const enabledFlags = flags.filter((flag) => posthog.isFeatureEnabled(flag));
  useUIStore.getState().setFeatureFlags(enabledFlags);
}

export function loadFeatureFlags(): Promise<void> {
  return new Promise((resolve) => {
    if (!initialized) { resolve(); return; }
    posthog.onFeatureFlags(() => { syncFeatureFlags(); resolve(); });
  });
}

export function resetPostHog() {
  if (!initialized) return;
  posthog.reset();
}

export function setConsent(granted: boolean) {
  if (!initialized) return;
  if (granted) posthog.opt_in_capturing();
  else posthog.opt_out_capturing();
}

export { posthog };
