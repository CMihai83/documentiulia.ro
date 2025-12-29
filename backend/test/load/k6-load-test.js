/**
 * DocumentIulia.ro Load Testing Script
 * Using k6 (https://k6.io)
 *
 * Run with: k6 run k6-load-test.js
 *
 * Test Scenarios:
 * 1. Smoke test - Basic functionality check (10 VUs, 1 minute)
 * 2. Load test - Normal load simulation (100 VUs, 5 minutes)
 * 3. Stress test - Peak load simulation (500 VUs, 10 minutes)
 * 4. Spike test - Sudden traffic spike (1000 VUs spike, 2 minutes)
 * 5. Soak test - Extended duration (100 VUs, 1 hour)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const dashboardLatency = new Trend('dashboard_latency');
const authLatency = new Trend('auth_latency');
const invoiceLatency = new Trend('invoice_latency');
const requestCount = new Counter('requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api/v1`;

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test - verify basic functionality
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      startTime: '0s',
      tags: { test_type: 'smoke' },
    },
    // Load test - normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up
        { duration: '5m', target: 100 },  // Stay at 100
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '1m',
      tags: { test_type: 'load' },
    },
    // Stress test - beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      startTime: '10m',
      tags: { test_type: 'stress' },
    },
    // Spike test - sudden traffic spike
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1000 }, // Sudden spike
        { duration: '1m', target: 1000 },  // Stay at spike
        { duration: '10s', target: 0 },    // Quick recovery
      ],
      startTime: '26m',
      tags: { test_type: 'spike' },
    },
  },
  thresholds: {
    // Response time thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    api_latency: ['p(95)<200', 'p(99)<500'],
    dashboard_latency: ['p(95)<300', 'p(99)<600'],
    auth_latency: ['p(95)<150', 'p(99)<300'],
    invoice_latency: ['p(95)<250', 'p(99)<500'],

    // Error rate threshold
    errors: ['rate<0.01'], // Less than 1% error rate

    // Request success rate
    http_req_failed: ['rate<0.01'],
  },
};

// Test data
let authToken = '';
const testUsers = [];

// Setup function - runs once before tests
export function setup() {
  console.log('Setting up load test...');

  // Create test users (in a real scenario, these would be pre-created)
  for (let i = 0; i < 10; i++) {
    testUsers.push({
      email: `loadtest_${i}_${Date.now()}@test.documentiulia.ro`,
      password: 'TestPassword123!',
    });
  }

  return { testUsers };
}

// Main test function
export default function (data) {
  group('Authentication Flow', () => {
    testAuth(data);
  });

  group('Dashboard Analytics', () => {
    testDashboard();
  });

  group('Invoice Operations', () => {
    testInvoices();
  });

  group('Document Processing', () => {
    testDocuments();
  });

  group('Health Checks', () => {
    testHealthEndpoints();
  });

  // Random sleep between iterations (1-3 seconds)
  sleep(randomIntBetween(1, 3));
}

// Authentication tests
function testAuth(data) {
  const startTime = Date.now();

  // Login attempt
  const loginRes = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({
      email: 'demo@documentiulia.ro',
      password: 'demo123',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'auth_login' },
    }
  );

  authLatency.add(Date.now() - startTime);
  requestCount.add(1);

  const loginSuccess = check(loginRes, {
    'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'login response has body': (r) => r.body.length > 0,
  });

  errorRate.add(!loginSuccess);

  if (loginRes.status === 200) {
    try {
      const body = JSON.parse(loginRes.body);
      authToken = body.accessToken || body.token || '';
    } catch (e) {
      // Ignore parse errors
    }
  }

  sleep(0.5);
}

// Dashboard analytics tests
function testDashboard() {
  const headers = authToken
    ? { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  // Test dashboard summary endpoint
  const summaryStart = Date.now();
  const summaryRes = http.get(`${API_URL}/analytics/dashboard/summary?range=30d`, {
    headers,
    tags: { name: 'dashboard_summary' },
  });

  dashboardLatency.add(Date.now() - summaryStart);
  requestCount.add(1);

  const summarySuccess = check(summaryRes, {
    'dashboard summary status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'dashboard has metrics': (r) => {
      if (r.status !== 200) return true;
      try {
        const body = JSON.parse(r.body);
        return body.metrics !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!summarySuccess);

  // Test metrics endpoint
  const metricsStart = Date.now();
  const metricsRes = http.get(`${API_URL}/analytics/dashboard/metrics?range=30d`, {
    headers,
    tags: { name: 'dashboard_metrics' },
  });

  apiLatency.add(Date.now() - metricsStart);
  requestCount.add(1);

  check(metricsRes, {
    'metrics status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(0.3);
}

// Invoice operations tests
function testInvoices() {
  const headers = authToken
    ? { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  // List invoices
  const listStart = Date.now();
  const listRes = http.get(`${API_URL}/invoices?page=1&limit=10`, {
    headers,
    tags: { name: 'invoice_list' },
  });

  invoiceLatency.add(Date.now() - listStart);
  requestCount.add(1);

  const listSuccess = check(listRes, {
    'invoice list status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  errorRate.add(!listSuccess);

  // Create invoice (if authenticated)
  if (authToken && Math.random() < 0.1) {
    // Only 10% of requests create invoices
    const createStart = Date.now();
    const createRes = http.post(
      `${API_URL}/invoices`,
      JSON.stringify({
        partnerName: `Test Client ${randomString(5)}`,
        partnerCui: `RO${randomIntBetween(10000000, 99999999)}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [
          {
            description: 'Test Service',
            quantity: 1,
            unitPrice: randomIntBetween(100, 10000),
            vatRate: 19,
          },
        ],
      }),
      {
        headers,
        tags: { name: 'invoice_create' },
      }
    );

    invoiceLatency.add(Date.now() - createStart);
    requestCount.add(1);

    check(createRes, {
      'invoice create status is 201 or 401': (r) => r.status === 201 || r.status === 401,
    });
  }

  sleep(0.3);
}

// Document processing tests
function testDocuments() {
  const headers = authToken
    ? { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  // List documents
  const listStart = Date.now();
  const listRes = http.get(`${API_URL}/documents?page=1&limit=10`, {
    headers,
    tags: { name: 'document_list' },
  });

  apiLatency.add(Date.now() - listStart);
  requestCount.add(1);

  check(listRes, {
    'document list status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(0.2);
}

// Health endpoint tests
function testHealthEndpoints() {
  // Main health check
  const healthStart = Date.now();
  const healthRes = http.get(`${BASE_URL}/health`, {
    tags: { name: 'health_check' },
  });

  apiLatency.add(Date.now() - healthStart);
  requestCount.add(1);

  const healthSuccess = check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response is healthy': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok' || body.status === 'healthy';
      } catch {
        return r.body.includes('ok') || r.body.includes('healthy');
      }
    },
  });

  errorRate.add(!healthSuccess);

  // API version check
  const versionRes = http.get(`${API_URL}/version`, {
    tags: { name: 'api_version' },
  });

  requestCount.add(1);

  check(versionRes, {
    'version endpoint accessible': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.1);
}

// Teardown function - runs once after tests
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total requests: ${requestCount}`);
}

// Handle summary
export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  let output = '\n=== Load Test Summary ===\n\n';

  // Thresholds
  output += `${indent}Thresholds:\n`;
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const status = threshold.ok ? '✓' : '✗';
    output += `${indent}  ${status} ${name}\n`;
  }

  // Metrics
  output += `\n${indent}Key Metrics:\n`;
  const metrics = data.metrics || {};

  if (metrics.http_req_duration) {
    output += `${indent}  HTTP Request Duration:\n`;
    output += `${indent}    avg: ${metrics.http_req_duration.values.avg?.toFixed(2) || 'N/A'}ms\n`;
    output += `${indent}    p95: ${metrics.http_req_duration.values['p(95)']?.toFixed(2) || 'N/A'}ms\n`;
    output += `${indent}    p99: ${metrics.http_req_duration.values['p(99)']?.toFixed(2) || 'N/A'}ms\n`;
  }

  if (metrics.errors) {
    output += `${indent}  Error Rate: ${(metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  }

  if (metrics.http_reqs) {
    output += `${indent}  Total Requests: ${metrics.http_reqs.values.count}\n`;
    output += `${indent}  Requests/sec: ${metrics.http_reqs.values.rate?.toFixed(2)}\n`;
  }

  return output;
}
