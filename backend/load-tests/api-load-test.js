/**
 * k6 Load Test - Full API Suite
 *
 * Comprehensive load testing for all major API endpoints:
 * - Health & Status
 * - Finance Module
 * - HR Module
 * - Logistics Module
 * - Database endpoints
 * - Cache endpoints
 *
 * Run: k6 run --env API_URL=http://localhost:3001/api api-load-test.js
 * Run stress: k6 run --env API_URL=http://localhost:3001/api -e SCENARIO=stress api-load-test.js
 */

import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';
import { BASE_URL, thresholds, scenarios, getAuthHeaders, randomElement, randomInt } from './k6-config.js';

// Custom metrics per module
const financeLatency = new Trend('finance_latency');
const hrLatency = new Trend('hr_latency');
const logisticsLatency = new Trend('logistics_latency');
const databaseLatency = new Trend('database_latency');
const cacheLatency = new Trend('cache_latency');
const errorCount = new Counter('error_count');
const successRate = new Rate('overall_success_rate');
const activeVUs = new Gauge('active_virtual_users');

// Select scenario based on environment variable
const selectedScenario = __ENV.SCENARIO || 'load';

export const options = {
  scenarios: {
    default: scenarios[selectedScenario] || scenarios.load,
  },
  thresholds: {
    ...thresholds,
    'finance_latency': ['p(95)<250'],
    'hr_latency': ['p(95)<250'],
    'logistics_latency': ['p(95)<300'],
    'database_latency': ['p(95)<150'],
    'cache_latency': ['p(95)<100'],
  },
};

export function setup() {
  // Verify API is up before starting tests
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    fail('API health check failed - cannot proceed with load test');
  }

  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Scenario: ${selectedScenario}`);

  return { startTime: Date.now() };
}

export default function (data) {
  const headers = getAuthHeaders();
  activeVUs.add(__VU);

  // ============================================
  // HEALTH & STATUS
  // ============================================
  group('Health & Status', () => {
    const res = http.get(`${BASE_URL}/health`, { headers });

    const passed = check(res, {
      'health status 200': (r) => r.status === 200,
      'health response < 100ms': (r) => r.timings.duration < 100,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);
  });

  sleep(0.2);

  // ============================================
  // DATABASE MODULE
  // ============================================
  group('Database Operations', () => {
    // Health check
    let res = http.get(`${BASE_URL}/database/health`, { headers });
    databaseLatency.add(res.timings.duration);

    let passed = check(res, {
      'db health status 200': (r) => r.status === 200,
      'db health response < 150ms': (r) => r.timings.duration < 150,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);

    sleep(0.1);

    // Stats (less frequent)
    if (randomInt(1, 5) === 1) {
      res = http.get(`${BASE_URL}/database/stats`, { headers });
      databaseLatency.add(res.timings.duration);

      passed = check(res, {
        'db stats status 200': (r) => r.status === 200,
        'db stats response < 300ms': (r) => r.timings.duration < 300,
      });

      successRate.add(passed);
    }
  });

  sleep(0.2);

  // ============================================
  // CACHE MODULE
  // ============================================
  group('Cache Operations', () => {
    const res = http.get(`${BASE_URL}/cache/stats`, { headers });
    cacheLatency.add(res.timings.duration);

    const passed = check(res, {
      'cache stats status 200': (r) => r.status === 200,
      'cache stats response < 100ms': (r) => r.timings.duration < 100,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);
  });

  sleep(0.2);

  // ============================================
  // FINANCE MODULE
  // ============================================
  group('Finance Operations', () => {
    // Dashboard
    let res = http.get(`${BASE_URL}/finance/dashboard`, { headers, tags: { endpoint: 'finance' } });
    financeLatency.add(res.timings.duration);

    let passed = check(res, {
      'finance dashboard status ok': (r) => r.status === 200 || r.status === 404,
      'finance dashboard response < 300ms': (r) => r.timings.duration < 300,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);

    sleep(0.1);

    // Transactions
    res = http.get(`${BASE_URL}/finance/transactions?limit=20`, { headers, tags: { endpoint: 'finance' } });
    financeLatency.add(res.timings.duration);

    passed = check(res, {
      'finance transactions status ok': (r) => r.status === 200 || r.status === 404,
      'finance transactions response < 250ms': (r) => r.timings.duration < 250,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);
  });

  sleep(0.3);

  // ============================================
  // HR MODULE
  // ============================================
  group('HR Operations', () => {
    // Employees list
    let res = http.get(`${BASE_URL}/hr/employees?limit=20`, { headers, tags: { endpoint: 'hr' } });
    hrLatency.add(res.timings.duration);

    let passed = check(res, {
      'hr employees status ok': (r) => r.status === 200 || r.status === 404,
      'hr employees response < 250ms': (r) => r.timings.duration < 250,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);

    sleep(0.1);

    // Departments
    res = http.get(`${BASE_URL}/hr/departments`, { headers, tags: { endpoint: 'hr' } });
    hrLatency.add(res.timings.duration);

    passed = check(res, {
      'hr departments status ok': (r) => r.status === 200 || r.status === 404,
      'hr departments response < 200ms': (r) => r.timings.duration < 200,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);
  });

  sleep(0.3);

  // ============================================
  // LOGISTICS MODULE
  // ============================================
  group('Logistics Operations', () => {
    // Inventory
    let res = http.get(`${BASE_URL}/logistics/inventory?limit=20`, { headers, tags: { endpoint: 'logistics' } });
    logisticsLatency.add(res.timings.duration);

    let passed = check(res, {
      'logistics inventory status ok': (r) => r.status === 200 || r.status === 404,
      'logistics inventory response < 300ms': (r) => r.timings.duration < 300,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);

    sleep(0.1);

    // Warehouses
    res = http.get(`${BASE_URL}/warehouse/list`, { headers, tags: { endpoint: 'logistics' } });
    logisticsLatency.add(res.timings.duration);

    passed = check(res, {
      'warehouse list status ok': (r) => r.status === 200 || r.status === 404,
      'warehouse list response < 250ms': (r) => r.timings.duration < 250,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);
  });

  sleep(0.3);

  // ============================================
  // INTEGRATION MODULE
  // ============================================
  group('Integration Operations', () => {
    // Status
    let res = http.get(`${BASE_URL}/integration/status`, { headers, tags: { endpoint: 'integration' } });

    let passed = check(res, {
      'integration status 200': (r) => r.status === 200,
      'integration status response < 200ms': (r) => r.timings.duration < 200,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);

    sleep(0.1);

    // Dashboard metrics
    res = http.get(`${BASE_URL}/integration/dashboard/metrics`, { headers, tags: { endpoint: 'integration' } });

    passed = check(res, {
      'integration metrics 200': (r) => r.status === 200,
      'integration metrics response < 500ms': (r) => r.timings.duration < 500,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);
  });

  sleep(0.3);

  // ============================================
  // CONTENT MODULE (Forum/Blog)
  // ============================================
  group('Content Operations', () => {
    // Forum threads
    let res = http.get(`${BASE_URL}/content/forum/threads?limit=10`, { headers });

    let passed = check(res, {
      'forum threads status ok': (r) => r.status === 200 || r.status === 404,
      'forum threads response < 300ms': (r) => r.timings.duration < 300,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);

    sleep(0.1);

    // Blog articles
    res = http.get(`${BASE_URL}/content/blog/articles?limit=10`, { headers });

    passed = check(res, {
      'blog articles status ok': (r) => r.status === 200 || r.status === 404,
      'blog articles response < 300ms': (r) => r.timings.duration < 300,
    });

    successRate.add(passed);
    if (!passed) errorCount.add(1);
  });

  // Think time between iterations
  sleep(randomInt(1, 2));
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}

export function handleSummary(data) {
  const { metrics } = data;

  const summary = generateSummaryReport(metrics);

  return {
    'stdout': summary,
    'api-load-test-results.json': JSON.stringify(data, null, 2),
    'api-load-test-summary.html': generateHTMLReport(metrics),
  };
}

function generateSummaryReport(metrics) {
  const p95 = metrics.http_req_duration?.values?.['p(95)'] || 0;
  const avg = metrics.http_req_duration?.values?.avg || 0;
  const totalReqs = metrics.http_reqs?.values?.count || 0;
  const errorRate = (metrics.http_req_failed?.values?.rate || 0) * 100;
  const successRateVal = ((metrics.checks?.values?.passes || 0) /
    ((metrics.checks?.values?.passes || 0) + (metrics.checks?.values?.fails || 1))) * 100;

  // Determine pass/fail status
  const passed = p95 < 200 && errorRate < 1;
  const status = passed ? '✅ PASSED' : '❌ FAILED';

  return `
╔══════════════════════════════════════════════════════════════════════════╗
║              DocumentIulia.ro - API Load Test Results                    ║
║                          ${status}                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║ OVERALL METRICS
║ ────────────────────────────────────────────────────────────────────────
║ Total Requests:          ${totalReqs.toLocaleString()}
║ Request Rate:            ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)} req/s
║ Success Rate:            ${successRateVal.toFixed(2)}%
║ Error Rate:              ${errorRate.toFixed(2)}%
╠══════════════════════════════════════════════════════════════════════════╣
║ RESPONSE TIMES
║ ────────────────────────────────────────────────────────────────────────
║ Average:                 ${avg.toFixed(2)}ms
║ 95th Percentile:         ${p95.toFixed(2)}ms ${p95 < 200 ? '✅' : '❌'} (target: <200ms)
║ 99th Percentile:         ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms
║ Max:                     ${(metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms
╠══════════════════════════════════════════════════════════════════════════╣
║ MODULE LATENCIES (95th percentile)
║ ────────────────────────────────────────────────────────────────────────
║ Finance:                 ${(metrics.finance_latency?.values?.['p(95)'] || 0).toFixed(2)}ms
║ HR:                      ${(metrics.hr_latency?.values?.['p(95)'] || 0).toFixed(2)}ms
║ Logistics:               ${(metrics.logistics_latency?.values?.['p(95)'] || 0).toFixed(2)}ms
║ Database:                ${(metrics.database_latency?.values?.['p(95)'] || 0).toFixed(2)}ms
║ Cache:                   ${(metrics.cache_latency?.values?.['p(95)'] || 0).toFixed(2)}ms
╠══════════════════════════════════════════════════════════════════════════╣
║ PERFORMANCE TARGETS (per Grok Guidelines)
║ ────────────────────────────────────────────────────────────────────────
║ API Response <200ms (p95):     ${p95 < 200 ? '✅ PASS' : '❌ FAIL'}
║ Error Rate <1%:                ${errorRate < 1 ? '✅ PASS' : '❌ FAIL'}
║ Success Rate >95%:             ${successRateVal > 95 ? '✅ PASS' : '❌ FAIL'}
╚══════════════════════════════════════════════════════════════════════════╝
`;
}

function generateHTMLReport(metrics) {
  const p95 = metrics.http_req_duration?.values?.['p(95)'] || 0;
  const errorRate = (metrics.http_req_failed?.values?.rate || 0) * 100;
  const passed = p95 < 200 && errorRate < 1;

  return `
<!DOCTYPE html>
<html>
<head>
  <title>DocumentIulia.ro - Load Test Report</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2563eb; margin-bottom: 10px; }
    .status { font-size: 24px; margin: 20px 0; padding: 15px; border-radius: 8px; }
    .status.pass { background: #dcfce7; color: #166534; }
    .status.fail { background: #fee2e2; color: #991b1b; }
    .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
    .metric { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 28px; font-weight: bold; color: #1e40af; }
    .metric-label { color: #64748b; margin-top: 5px; }
    .check { margin: 10px 0; padding: 10px; background: #f1f5f9; border-radius: 4px; }
    .check.pass { border-left: 4px solid #22c55e; }
    .check.fail { border-left: 4px solid #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <h1>DocumentIulia.ro - Load Test Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>

    <div class="status ${passed ? 'pass' : 'fail'}">
      ${passed ? '✅ TEST PASSED' : '❌ TEST FAILED'}
    </div>

    <div class="metric-grid">
      <div class="metric">
        <div class="metric-value">${(metrics.http_reqs?.values?.count || 0).toLocaleString()}</div>
        <div class="metric-label">Total Requests</div>
      </div>
      <div class="metric">
        <div class="metric-value">${p95.toFixed(0)}ms</div>
        <div class="metric-label">Response Time (p95)</div>
      </div>
      <div class="metric">
        <div class="metric-value">${errorRate.toFixed(2)}%</div>
        <div class="metric-label">Error Rate</div>
      </div>
    </div>

    <h2>Performance Targets</h2>
    <div class="check ${p95 < 200 ? 'pass' : 'fail'}">
      API Response Time < 200ms (p95): ${p95.toFixed(2)}ms
    </div>
    <div class="check ${errorRate < 1 ? 'pass' : 'fail'}">
      Error Rate < 1%: ${errorRate.toFixed(2)}%
    </div>

    <h2>Module Latencies</h2>
    <table>
      <tr><th>Module</th><th>p95 Latency</th><th>Target</th><th>Status</th></tr>
      <tr>
        <td>Finance</td>
        <td>${(metrics.finance_latency?.values?.['p(95)'] || 0).toFixed(2)}ms</td>
        <td>&lt;250ms</td>
        <td>${(metrics.finance_latency?.values?.['p(95)'] || 0) < 250 ? '✅' : '❌'}</td>
      </tr>
      <tr>
        <td>HR</td>
        <td>${(metrics.hr_latency?.values?.['p(95)'] || 0).toFixed(2)}ms</td>
        <td>&lt;250ms</td>
        <td>${(metrics.hr_latency?.values?.['p(95)'] || 0) < 250 ? '✅' : '❌'}</td>
      </tr>
      <tr>
        <td>Logistics</td>
        <td>${(metrics.logistics_latency?.values?.['p(95)'] || 0).toFixed(2)}ms</td>
        <td>&lt;300ms</td>
        <td>${(metrics.logistics_latency?.values?.['p(95)'] || 0) < 300 ? '✅' : '❌'}</td>
      </tr>
      <tr>
        <td>Database</td>
        <td>${(metrics.database_latency?.values?.['p(95)'] || 0).toFixed(2)}ms</td>
        <td>&lt;150ms</td>
        <td>${(metrics.database_latency?.values?.['p(95)'] || 0) < 150 ? '✅' : '❌'}</td>
      </tr>
      <tr>
        <td>Cache</td>
        <td>${(metrics.cache_latency?.values?.['p(95)'] || 0).toFixed(2)}ms</td>
        <td>&lt;100ms</td>
        <td>${(metrics.cache_latency?.values?.['p(95)'] || 0) < 100 ? '✅' : '❌'}</td>
      </tr>
    </table>
  </div>
</body>
</html>
`;
}
