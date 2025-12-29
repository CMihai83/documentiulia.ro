/**
 * k6 Load Testing Configuration for DocumentIulia.ro
 *
 * Performance Targets (per Grok Guidelines):
 * - API Response: < 200ms for 95% of calls at 100 concurrent users
 * - Page Load: < 2s on 3G
 * - Database Queries: < 50ms for 90% of operations
 * - Target: 1,000 concurrent users with < 5% degradation
 * - Bulk Operations: < 5min for 1,000 invoices
 */

export const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api';

export const thresholds = {
  // Response time thresholds
  http_req_duration: ['p(95)<200', 'p(99)<500'],  // 95th percentile < 200ms
  http_req_waiting: ['p(95)<150'],                 // Time to first byte < 150ms
  http_req_failed: ['rate<0.01'],                  // Error rate < 1%

  // Custom thresholds for specific endpoints
  'http_req_duration{endpoint:integration}': ['p(95)<300'],
  'http_req_duration{endpoint:finance}': ['p(95)<250'],
  'http_req_duration{endpoint:hr}': ['p(95)<250'],
  'http_req_duration{endpoint:logistics}': ['p(95)<300'],

  // Iteration duration
  iteration_duration: ['p(95)<2000'],              // Full iteration < 2s

  // Virtual user checks
  checks: ['rate>0.95'],                           // 95% of checks pass
};

// Test scenarios
export const scenarios = {
  // Smoke test - basic functionality
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '1m',
  },

  // Load test - normal expected load
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },   // Ramp up to 50 users
      { duration: '5m', target: 100 },  // Stay at 100 users (target)
      { duration: '2m', target: 0 },    // Ramp down
    ],
  },

  // Stress test - beyond normal capacity
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 500 },  // Push to 500 users
      { duration: '5m', target: 1000 }, // Target: 1000 concurrent
      { duration: '2m', target: 0 },
    ],
  },

  // Spike test - sudden traffic spike
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 50 },
      { duration: '30s', target: 500 }, // Sudden spike
      { duration: '1m', target: 500 },
      { duration: '30s', target: 50 },  // Quick drop
      { duration: '1m', target: 0 },
    ],
  },

  // Soak test - extended duration
  soak: {
    executor: 'constant-vus',
    vus: 100,
    duration: '30m',
  },
};

// Helper functions
export function getAuthHeaders(token = '') {
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
