'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';

// Web Vitals metrics endpoint (can be Google Analytics or custom endpoint)
const WEB_VITALS_ENDPOINT = process.env.NEXT_PUBLIC_VITALS_ENDPOINT || '/api/v1/analytics/vitals';
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  navigationType: string;
}

// Threshold values for Core Web Vitals
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 },   // Interaction to Next Paint
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function sendToAnalytics(metric: WebVitalsMetric) {
  const body = JSON.stringify({
    id: metric.id,
    name: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
    page: window.location.pathname,
    timestamp: Date.now(),
  });

  // Send to custom endpoint
  if (navigator.sendBeacon) {
    navigator.sendBeacon(WEB_VITALS_ENDPOINT, body);
  } else {
    fetch(WEB_VITALS_ENDPOINT, {
      body,
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send to Google Analytics 4
  if (GA_MEASUREMENT_ID && typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
    });
  }
}

// Log warnings for poor metrics in development
function logMetricWarning(metric: WebVitalsMetric) {
  if (process.env.NODE_ENV === 'development' && metric.rating === 'poor') {
    console.warn(
      `[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
      `\nPage: ${window.location.pathname}`
    );
  }
}

export function WebVitalsTracker() {
  useReportWebVitals((metric) => {
    const rating = getRating(metric.name, metric.value);
    const enhancedMetric: WebVitalsMetric = {
      ...metric,
      rating,
    };

    sendToAnalytics(enhancedMetric);
    logMetricWarning(enhancedMetric);
  });

  return null;
}

// Performance marks for custom metrics
export function usePerformanceMark(markName: string) {
  useEffect(() => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${markName}-start`);

      return () => {
        performance.mark(`${markName}-end`);
        performance.measure(markName, `${markName}-start`, `${markName}-end`);
      };
    }
  }, [markName]);
}

// Component render timing
export function measureComponentRender(componentName: string) {
  if (typeof performance !== 'undefined') {
    const startMark = `${componentName}-render-start`;
    const endMark = `${componentName}-render-end`;
    const measureName = `${componentName}-render`;

    performance.mark(startMark);

    return () => {
      performance.mark(endMark);
      try {
        const measure = performance.measure(measureName, startMark, endMark);
        if (process.env.NODE_ENV === 'development' && measure.duration > 16) {
          console.warn(
            `[Performance] ${componentName} render took ${measure.duration.toFixed(2)}ms`
          );
        }
      } catch (e) {
        // Measurement failed, ignore
      }
    };
  }
  return () => {};
}
