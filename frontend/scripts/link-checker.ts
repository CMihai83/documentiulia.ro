#!/usr/bin/env npx ts-node
/**
 * Automated Link Checker for DocumentIulia.ro
 * Validates all internal links return expected HTTP status codes
 * Run: npx ts-node scripts/link-checker.ts
 */

const BASE_URL = process.env.BASE_URL || 'https://documentiulia.ro';

interface LinkCheck {
  url: string;
  expectedStatus: number | number[];
  description: string;
  category: 'public' | 'auth' | 'api';
}

const LINKS_TO_CHECK: LinkCheck[] = [
  // Public Pages
  { url: '/', expectedStatus: 200, description: 'Homepage', category: 'public' },
  { url: '/features', expectedStatus: 200, description: 'Features page', category: 'public' },
  { url: '/pricing', expectedStatus: 200, description: 'Pricing page', category: 'public' },
  { url: '/contact', expectedStatus: 200, description: 'Contact page', category: 'public' },
  { url: '/login', expectedStatus: 200, description: 'Login page', category: 'public' },
  { url: '/register', expectedStatus: 200, description: 'Register page', category: 'public' },
  { url: '/terms', expectedStatus: 200, description: 'Terms page', category: 'public' },
  { url: '/privacy', expectedStatus: 200, description: 'Privacy page', category: 'public' },
  { url: '/gdpr', expectedStatus: 200, description: 'GDPR page', category: 'public' },
  { url: '/help', expectedStatus: 200, description: 'Help page', category: 'public' },
  { url: '/blog', expectedStatus: 200, description: 'Blog page', category: 'public' },

  // Forum Pages
  { url: '/forum', expectedStatus: 200, description: 'Forum main', category: 'public' },
  { url: '/forum/all', expectedStatus: 200, description: 'Forum all threads', category: 'public' },
  { url: '/forum/new', expectedStatus: 200, description: 'Forum new thread', category: 'public' },
  { url: '/forum/category/general', expectedStatus: 200, description: 'Forum category', category: 'public' },
  { url: '/forum/thread/test', expectedStatus: 200, description: 'Forum thread', category: 'public' },

  // Auth Protected (expect redirect)
  { url: '/dashboard', expectedStatus: [307, 302], description: 'Dashboard (auth)', category: 'auth' },
  { url: '/dashboard/invoices', expectedStatus: [307, 302], description: 'Invoices (auth)', category: 'auth' },
  { url: '/dashboard/invoices/new', expectedStatus: [307, 302], description: 'New invoice (auth)', category: 'auth' },
  { url: '/dashboard/invoices/bulk-delete', expectedStatus: [307, 302], description: 'Bulk delete (auth)', category: 'auth' },
  { url: '/dashboard/invoices/bulk-spv', expectedStatus: [307, 302], description: 'Bulk SPV (auth)', category: 'auth' },
  { url: '/dashboard/forum', expectedStatus: [307, 302], description: 'Dashboard forum (auth)', category: 'auth' },
  { url: '/dashboard/hr', expectedStatus: [307, 302], description: 'HR (auth)', category: 'auth' },
  { url: '/dashboard/finance', expectedStatus: [307, 302], description: 'Finance (auth)', category: 'auth' },
  { url: '/dashboard/settings', expectedStatus: [307, 302], description: 'Settings (auth)', category: 'auth' },

  // API Endpoints
  { url: '/api/v1/health', expectedStatus: 200, description: 'API health', category: 'api' },
  { url: '/api/health', expectedStatus: 200, description: 'Frontend API health', category: 'api' },
];

interface CheckResult {
  url: string;
  description: string;
  expectedStatus: number | number[];
  actualStatus: number;
  passed: boolean;
  responseTime: number;
  error?: string;
}

async function checkLink(link: LinkCheck): Promise<CheckResult> {
  const fullUrl = `${BASE_URL}${link.url}`;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(fullUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    const expectedStatuses = Array.isArray(link.expectedStatus)
      ? link.expectedStatus
      : [link.expectedStatus];

    const passed = expectedStatuses.includes(response.status);

    return {
      url: link.url,
      description: link.description,
      expectedStatus: link.expectedStatus,
      actualStatus: response.status,
      passed,
      responseTime,
    };
  } catch (error: any) {
    return {
      url: link.url,
      description: link.description,
      expectedStatus: link.expectedStatus,
      actualStatus: 0,
      passed: false,
      responseTime: Date.now() - startTime,
      error: error.message || 'Unknown error',
    };
  }
}

async function runLinkChecker(): Promise<void> {
  console.log('========================================');
  console.log('  DocumentIulia.ro Link Checker');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Checking ${LINKS_TO_CHECK.length} links...`);
  console.log('========================================\n');

  const results: CheckResult[] = [];
  const categories = ['public', 'auth', 'api'] as const;

  for (const category of categories) {
    const categoryLinks = LINKS_TO_CHECK.filter(l => l.category === category);
    console.log(`\n[${category.toUpperCase()}] Checking ${categoryLinks.length} links...`);

    for (const link of categoryLinks) {
      const result = await checkLink(link);
      results.push(result);

      const status = result.passed ? '✓' : '✗';
      const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
      const resetColor = '\x1b[0m';

      console.log(
        `  ${statusColor}${status}${resetColor} ${result.url} ` +
        `[${result.actualStatus}] ${result.responseTime}ms` +
        (result.error ? ` - ${result.error}` : '')
      );
    }
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const avgResponseTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
  );

  console.log('\n========================================');
  console.log('  SUMMARY');
  console.log('========================================');
  console.log(`  Total: ${results.length}`);
  console.log(`  Passed: \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed: \x1b[31m${failed}\x1b[0m`);
  console.log(`  Avg Response Time: ${avgResponseTime}ms`);
  console.log('========================================\n');

  if (failed > 0) {
    console.log('\nFailed Links:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.url}: expected ${r.expectedStatus}, got ${r.actualStatus}`);
        if (r.error) console.log(`    Error: ${r.error}`);
      });
    process.exit(1);
  }

  console.log('\x1b[32mAll links passed!\x1b[0m');
  process.exit(0);
}

// Run if executed directly
runLinkChecker().catch(console.error);
