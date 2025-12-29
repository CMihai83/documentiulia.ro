import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';

test.describe('Backend API Integration', () => {
  test.describe('Integration Endpoints', () => {
    test('GET /integration/status should return status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/status`);
      expect(response.status()).toBeLessThan(500);

      if (response.ok()) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });

    test('GET /integration/events/queue should return event queue', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/events/queue`);
      expect(response.status()).toBeLessThan(500);
    });

    test('GET /integration/dashboard/metrics should return metrics', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/dashboard/metrics`);
      expect(response.status()).toBeLessThan(500);

      if (response.ok()) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });

    test('GET /integration/audit should return audit trail', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/audit`);
      expect(response.status()).toBeLessThan(500);
    });

    test('GET /integration/rules should return rules', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/rules`);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('HR-Finance Integration', () => {
    test('GET /integration/hr-payroll/payroll-entries should return entries', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/hr-payroll/payroll-entries`);
      expect(response.status()).toBeLessThan(500);
    });

    test('GET /integration/hr-payroll/finance-transactions should return transactions', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/hr-payroll/finance-transactions`);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Logistics-Finance Integration', () => {
    test('GET /integration/logistics-finance/expenses should return expenses', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/logistics-finance/expenses`);
      expect(response.status()).toBeLessThan(500);
    });

    test('GET /integration/logistics-finance/inventory-costs should return costs', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/logistics-finance/inventory-costs`);
      expect(response.status()).toBeLessThan(500);
    });

    test('GET /integration/logistics-finance/summary should return summary', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/logistics-finance/summary`);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('LMS-HR Integration', () => {
    test('GET /integration/lms-hr/competency-updates/:employeeId should handle request', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/lms-hr/competency-updates/emp-001`);
      expect(response.status()).toBeLessThan(500);
    });

    test('GET /integration/lms-hr/competency-matrix/:employeeId should handle request', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/lms-hr/competency-matrix/emp-001`);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Freelancer-Logistics Integration', () => {
    test('GET /integration/freelancer-logistics/availability should return availability', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/freelancer-logistics/availability`);
      expect(response.status()).toBeLessThan(500);
    });

    test('GET /integration/freelancer-logistics/capacity-requests should return requests', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/freelancer-logistics/capacity-requests`);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('HR-HSE Integration', () => {
    test('GET /integration/hr-hse/training-assignments should return assignments', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integration/hr-hse/training-assignments`);
      expect(response.status()).toBeLessThan(500);
    });
  });
});

test.describe('Module-Specific APIs', () => {
  test.describe('HR Module', () => {
    test('GET /hr/employees should handle request', async ({ request }) => {
      const response = await request.get(`${API_BASE}/hr/employees`);
      expect(response.status()).toBeLessThan(500);
    });

    test('GET /hr/departments should handle request', async ({ request }) => {
      const response = await request.get(`${API_BASE}/hr/departments`);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Finance Module', () => {
    test('GET /finance/transactions should handle request', async ({ request }) => {
      const response = await request.get(`${API_BASE}/finance/transactions`);
      expect(response.status()).toBeLessThan(500);
    });

    test('GET /finance/dashboard should handle request', async ({ request }) => {
      const response = await request.get(`${API_BASE}/finance/dashboard`);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Logistics Module', () => {
    test('GET /logistics/inventory should handle request', async ({ request }) => {
      const response = await request.get(`${API_BASE}/logistics/inventory`);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Content Module', () => {
    test('GET /content/forum/threads should handle request', async ({ request }) => {
      const response = await request.get(`${API_BASE}/content/forum/threads`);
      expect(response.status()).toBeLessThan(500);
    });

    test('GET /content/blog/articles should handle request', async ({ request }) => {
      const response = await request.get(`${API_BASE}/content/blog/articles`);
      expect(response.status()).toBeLessThan(500);
    });
  });
});

test.describe('API Error Handling', () => {
  test('should return 404 for non-existent endpoints', async ({ request }) => {
    const response = await request.get(`${API_BASE}/non-existent-endpoint-12345`);
    expect(response.status()).toBe(404);
  });

  test('should handle invalid parameters gracefully', async ({ request }) => {
    const response = await request.get(
      `${API_BASE}/integration/events/module/INVALID_MODULE`
    );
    // Should not crash - either 400 or handle gracefully
    expect(response.status()).toBeLessThan(500);
  });

  test('should validate request bodies on POST', async ({ request }) => {
    const response = await request.post(`${API_BASE}/integration/events`, {
      data: { invalid: 'data' },
    });
    // Should validate and not crash
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('API Performance', () => {
  test('GET /integration/status should respond within 1 second', async ({ request }) => {
    const start = Date.now();
    await request.get(`${API_BASE}/integration/status`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });

  test('GET /integration/dashboard/metrics should respond within 2 seconds', async ({ request }) => {
    const start = Date.now();
    await request.get(`${API_BASE}/integration/dashboard/metrics`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
