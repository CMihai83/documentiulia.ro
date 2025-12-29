/**
 * k6 Load Test - Integration Module
 *
 * Tests cross-module integration endpoints:
 * - HR → Finance
 * - Logistics → Finance
 * - LMS → HR
 * - Event Bus
 * - Dashboard Metrics
 *
 * Run: k6 run --env API_URL=http://localhost:3001/api integration-load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { BASE_URL, thresholds, scenarios, getAuthHeaders, randomElement, randomInt } from './k6-config.js';

// Custom metrics
const integrationErrors = new Counter('integration_errors');
const eventPublishTime = new Trend('event_publish_time');
const metricsAggregationTime = new Trend('metrics_aggregation_time');
const auditQueryTime = new Trend('audit_query_time');
const successRate = new Rate('success_rate');

export const options = {
  scenarios: {
    default: scenarios.load,
  },
  thresholds: {
    ...thresholds,
    'event_publish_time': ['p(95)<300'],
    'metrics_aggregation_time': ['p(95)<500'],
    'audit_query_time': ['p(95)<400'],
  },
};

// Test data
const moduleTypes = ['HR', 'FINANCE', 'LOGISTICS', 'HSE', 'FREELANCER', 'LMS'];
const eventTypes = ['employee.created', 'salary.changed', 'training.completed', 'expense.recorded'];

export default function () {
  const headers = getAuthHeaders();

  group('Integration Status', () => {
    const res = http.get(`${BASE_URL}/integration/status`, { headers, tags: { endpoint: 'integration' } });

    const passed = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'has connected modules': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.connectedModules !== undefined;
        } catch {
          return false;
        }
      },
    });

    successRate.add(passed);
    if (!passed) integrationErrors.add(1);
  });

  sleep(0.5);

  group('Dashboard Metrics', () => {
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/integration/dashboard/metrics`, { headers, tags: { endpoint: 'integration' } });
    metricsAggregationTime.add(Date.now() - startTime);

    const passed = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has metrics data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body !== null && typeof body === 'object';
        } catch {
          return false;
        }
      },
    });

    successRate.add(passed);
    if (!passed) integrationErrors.add(1);
  });

  sleep(0.3);

  group('Event Queue', () => {
    const res = http.get(`${BASE_URL}/integration/events/queue`, { headers, tags: { endpoint: 'integration' } });

    const passed = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
    });

    successRate.add(passed);
    if (!passed) integrationErrors.add(1);
  });

  sleep(0.3);

  group('Publish Event', () => {
    const event = {
      sourceModule: randomElement(moduleTypes),
      targetModule: randomElement(moduleTypes),
      eventType: randomElement(eventTypes),
      payload: {
        id: `test-${Date.now()}`,
        data: { value: randomInt(1, 1000) },
      },
    };

    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/integration/events`, JSON.stringify(event), { headers, tags: { endpoint: 'integration' } });
    eventPublishTime.add(Date.now() - startTime);

    const passed = check(res, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'response time < 300ms': (r) => r.timings.duration < 300,
      'returns event ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.eventId !== undefined;
        } catch {
          return false;
        }
      },
    });

    successRate.add(passed);
    if (!passed) integrationErrors.add(1);
  });

  sleep(0.3);

  group('Get Events by Module', () => {
    const module = randomElement(moduleTypes);
    const res = http.get(`${BASE_URL}/integration/events/module/${module}?limit=10`, { headers, tags: { endpoint: 'integration' } });

    const passed = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 300ms': (r) => r.timings.duration < 300,
    });

    successRate.add(passed);
    if (!passed) integrationErrors.add(1);
  });

  sleep(0.3);

  group('HR-Payroll Integration', () => {
    // Get payroll entries
    const res = http.get(`${BASE_URL}/integration/hr-payroll/payroll-entries`, { headers, tags: { endpoint: 'hr' } });

    const passed = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 250ms': (r) => r.timings.duration < 250,
    });

    successRate.add(passed);
    if (!passed) integrationErrors.add(1);
  });

  sleep(0.3);

  group('Finance Transactions', () => {
    const res = http.get(`${BASE_URL}/integration/hr-payroll/finance-transactions`, { headers, tags: { endpoint: 'finance' } });

    const passed = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 250ms': (r) => r.timings.duration < 250,
    });

    successRate.add(passed);
    if (!passed) integrationErrors.add(1);
  });

  sleep(0.3);

  group('Logistics-Finance Expenses', () => {
    const res = http.get(`${BASE_URL}/integration/logistics-finance/expenses`, { headers, tags: { endpoint: 'logistics' } });

    const passed = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 300ms': (r) => r.timings.duration < 300,
    });

    successRate.add(passed);
    if (!passed) integrationErrors.add(1);
  });

  sleep(0.3);

  group('Logistics-Finance Summary', () => {
    const res = http.get(`${BASE_URL}/integration/logistics-finance/summary`, { headers, tags: { endpoint: 'logistics' } });

    const passed = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 400ms': (r) => r.timings.duration < 400,
    });

    successRate.add(passed);
    if (!passed) integrationErrors.add(1);
  });

  sleep(0.3);

  group('Audit Trail', () => {
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/integration/audit`, { headers, tags: { endpoint: 'integration' } });
    auditQueryTime.add(Date.now() - startTime);

    const passed = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 400ms': (r) => r.timings.duration < 400,
    });

    successRate.add(passed);
    if (!passed) integrationErrors.add(1);
  });

  sleep(0.3);

  group('Integration Rules', () => {
    const res = http.get(`${BASE_URL}/integration/rules`, { headers, tags: { endpoint: 'integration' } });

    const passed = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
    });

    successRate.add(passed);
    if (!passed) integrationErrors.add(1);
  });

  sleep(randomInt(1, 3)); // Think time between iterations
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'integration-load-test-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const { metrics, root_group } = data;

  let summary = `
╔══════════════════════════════════════════════════════════════════╗
║           DocumentIulia.ro - Integration Load Test               ║
╠══════════════════════════════════════════════════════════════════╣
║ Test Duration: ${formatDuration(metrics.iteration_duration?.values?.avg || 0)}
║ Total Requests: ${metrics.http_reqs?.values?.count || 0}
║ Failed Requests: ${metrics.http_req_failed?.values?.passes || 0}
╠══════════════════════════════════════════════════════════════════╣
║ Response Time (95th percentile): ${formatMs(metrics.http_req_duration?.values?.['p(95)'] || 0)}
║ Response Time (avg): ${formatMs(metrics.http_req_duration?.values?.avg || 0)}
║ Response Time (max): ${formatMs(metrics.http_req_duration?.values?.max || 0)}
╠══════════════════════════════════════════════════════════════════╣
║ Success Rate: ${((metrics.checks?.values?.passes / (metrics.checks?.values?.passes + metrics.checks?.values?.fails || 1)) * 100).toFixed(2)}%
║ Error Rate: ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%
╠══════════════════════════════════════════════════════════════════╣
║ Custom Metrics:
║   Event Publish (p95): ${formatMs(metrics.event_publish_time?.values?.['p(95)'] || 0)}
║   Metrics Aggregation (p95): ${formatMs(metrics.metrics_aggregation_time?.values?.['p(95)'] || 0)}
║   Audit Query (p95): ${formatMs(metrics.audit_query_time?.values?.['p(95)'] || 0)}
╚══════════════════════════════════════════════════════════════════╝
`;

  return summary;
}

function formatMs(ms) {
  return `${Math.round(ms)}ms`;
}

function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  return `${seconds}s`;
}
