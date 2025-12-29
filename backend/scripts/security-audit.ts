#!/usr/bin/env npx ts-node
/**
 * Security Audit Script for DocumentIulia.ro Backend
 * Checks for common security issues in new routes
 */

const BASE_URL = process.env.BASE_URL || 'https://documentiulia.ro';
const API_URL = `${BASE_URL}/api/v1`;

interface SecurityCheck {
  name: string;
  test: () => Promise<{ passed: boolean; message: string }>;
}

const securityChecks: SecurityCheck[] = [
  // Rate Limiting Tests
  {
    name: 'Forum rate limiting (30 req/min)',
    test: async () => {
      const requests = [];
      for (let i = 0; i < 35; i++) {
        requests.push(fetch(`${API_URL}/forum/categories`));
      }
      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(r => r.status === 429).length;
      return {
        passed: tooManyRequests > 0,
        message: tooManyRequests > 0
          ? `Rate limiting active: ${tooManyRequests} requests blocked`
          : 'Rate limiting may not be active',
      };
    },
  },

  // Input Validation Tests
  {
    name: 'Forum category slug validation (reject invalid)',
    test: async () => {
      const response = await fetch(`${API_URL}/forum/categories/<script>alert(1)</script>`);
      return {
        passed: response.status === 400,
        message: response.status === 400
          ? 'XSS in slug properly rejected'
          : `Unexpected status: ${response.status}`,
      };
    },
  },
  {
    name: 'Forum thread slug validation (reject SQL injection)',
    test: async () => {
      const response = await fetch(`${API_URL}/forum/threads/'; DROP TABLE users;--`);
      return {
        passed: response.status === 400,
        message: response.status === 400
          ? 'SQL injection in slug properly rejected'
          : `Unexpected status: ${response.status}`,
      };
    },
  },
  {
    name: 'Forum threads limit validation (reject invalid)',
    test: async () => {
      const response = await fetch(`${API_URL}/forum/threads?limit=999999`);
      return {
        passed: response.status === 400,
        message: response.status === 400
          ? 'Invalid limit properly rejected'
          : `Unexpected status: ${response.status}`,
      };
    },
  },

  // Auth Protection Tests
  {
    name: 'Invoice bulk-delete requires auth',
    test: async () => {
      const response = await fetch(`${API_URL}/bulk/invoices/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['1', '2'] }),
      });
      return {
        passed: response.status === 401,
        message: response.status === 401
          ? 'Bulk delete properly protected'
          : `Unexpected status: ${response.status}`,
      };
    },
  },
  {
    name: 'Invoice bulk-spv requires auth',
    test: async () => {
      const response = await fetch(`${API_URL}/anaf/efactura/bulk-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds: ['1', '2'] }),
      });
      return {
        passed: response.status === 401,
        message: response.status === 401
          ? 'Bulk SPV properly protected'
          : `Unexpected status: ${response.status}`,
      };
    },
  },

  // Security Headers Tests
  {
    name: 'Security headers present',
    test: async () => {
      const response = await fetch(`${BASE_URL}/`);
      const headers = response.headers;
      const requiredHeaders = [
        'strict-transport-security',
        'x-content-type-options',
        'x-frame-options',
      ];
      const missingHeaders = requiredHeaders.filter(h => !headers.get(h));
      return {
        passed: missingHeaders.length === 0,
        message: missingHeaders.length === 0
          ? 'All security headers present'
          : `Missing headers: ${missingHeaders.join(', ')}`,
      };
    },
  },

  // CORS Tests
  {
    name: 'CORS not overly permissive',
    test: async () => {
      const response = await fetch(`${API_URL}/health`, {
        headers: { 'Origin': 'https://malicious-site.com' },
      });
      const corsHeader = response.headers.get('access-control-allow-origin');
      return {
        passed: corsHeader !== '*',
        message: corsHeader !== '*'
          ? 'CORS properly configured'
          : 'WARNING: CORS allows all origins',
      };
    },
  },
];

async function runSecurityAudit(): Promise<void> {
  console.log('========================================');
  console.log('  DocumentIulia.ro Security Audit');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Running ${securityChecks.length} checks...`);
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  for (const check of securityChecks) {
    try {
      const result = await check.test();
      const status = result.passed ? '✓' : '✗';
      const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
      const resetColor = '\x1b[0m';

      console.log(`${statusColor}${status}${resetColor} ${check.name}`);
      console.log(`  ${result.message}`);

      if (result.passed) passed++;
      else failed++;
    } catch (error: any) {
      console.log(`\x1b[31m✗\x1b[0m ${check.name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log('  SUMMARY');
  console.log('========================================');
  console.log(`  Total: ${securityChecks.length}`);
  console.log(`  Passed: \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed: \x1b[31m${failed}\x1b[0m`);
  console.log('========================================\n');

  if (failed > 0) {
    console.log('\x1b[33mWARNING: Some security checks failed. Review before production.\x1b[0m');
    process.exit(1);
  }

  console.log('\x1b[32mAll security checks passed!\x1b[0m');
  process.exit(0);
}

runSecurityAudit().catch(console.error);
