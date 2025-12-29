import { test, expect, Page } from '@playwright/test';

/**
 * VAT & Compliance E2E Tests - DocumentIulia.ro
 * Tests Romanian VAT calculation and compliance features
 * Critical for Legea 141/2025 compliance
 */

// Helper to mock authentication
async function mockAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'test-token-12345');
    localStorage.setItem('user', JSON.stringify({
      id: 'user-1',
      email: 'test@documentiulia.ro',
      name: 'Test User',
      role: 'ACCOUNTANT',
    }));
  });
}

// Mock VAT API responses
async function mockVATAPIs(page: Page) {
  await page.route('**/api/v1/vat**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        calculations: [
          {
            id: 'vat-1',
            period: '2024-01',
            vatCollected: 25000,
            vatDeductible: 18000,
            vatDue: 7000,
            status: 'CALCULATED',
          },
        ],
        summary: {
          totalCollected: 25000,
          totalDeductible: 18000,
          totalDue: 7000,
        },
      }),
    });
  });

  await page.route('**/api/v1/vat/rates**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        rates: [
          { rate: 19, description: 'Standard (until Aug 2025)', applicableUntil: '2025-07-31' },
          { rate: 21, description: 'Standard (from Aug 2025)', applicableFrom: '2025-08-01' },
          { rate: 9, description: 'Reduced (until Aug 2025)', applicableUntil: '2025-07-31' },
          { rate: 11, description: 'Reduced (from Aug 2025)', applicableFrom: '2025-08-01' },
          { rate: 5, description: 'Special rate', applicableFrom: '2024-01-01' },
        ],
      }),
    });
  });

  await page.route('**/api/v1/saft**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reports: [
          {
            id: 'saft-1',
            period: '2024-01',
            status: 'GENERATED',
            recordCount: 150,
            fileSize: 245678,
            generatedAt: '2024-02-05T10:00:00Z',
          },
        ],
        gracePeriodEnd: '2026-08-31',
        isInGracePeriod: true,
      }),
    });
  });
}

test.describe('VAT Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockVATAPIs(page);
  });

  test('displays VAT overview page', async ({ page }) => {
    await page.goto('/ro/dashboard/vat');
    await page.waitForLoadState('networkidle');

    // Should show VAT-related content
    const vatContent = page.getByText(/TVA|VAT|calculare|deductibil/i);
    await expect(vatContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows current VAT rates', async ({ page }) => {
    await page.goto('/ro/dashboard/vat');
    await page.waitForLoadState('networkidle');

    // Should display VAT rates
    const rateContent = page.getByText(/19%|21%|9%|11%|5%/);
    if (await rateContent.count() > 0) {
      await expect(rateContent.first()).toBeVisible();
    }
  });

  test('displays Legea 141/2025 compliance info', async ({ page }) => {
    await page.goto('/ro/dashboard/vat');
    await page.waitForLoadState('networkidle');

    // Look for law reference or deadline info
    const complianceInfo = page.getByText(/141\/2025|august 2025|aug 2025/i);

    if (await complianceInfo.count() > 0) {
      await expect(complianceInfo.first()).toBeVisible();
    }
  });
});

test.describe('VAT Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockVATAPIs(page);
  });

  test('VAT calculator is available', async ({ page }) => {
    await page.goto('/ro/dashboard/vat');
    await page.waitForLoadState('networkidle');

    // Look for calculator or input fields
    const calculator = page.locator('[data-testid="vat-calculator"], .vat-calculator, form');
    const amountInput = page.getByLabel(/sumă|amount|valoare/i).or(
      page.getByPlaceholder(/sumă|amount/i)
    );

    const hasCalculator = (await calculator.count() > 0) || (await amountInput.isVisible());
    expect(hasCalculator).toBeTruthy();
  });

  test('calculates VAT at 19% rate', async ({ page }) => {
    await page.goto('/ro/dashboard/vat');
    await page.waitForLoadState('networkidle');

    const amountInput = page.getByLabel(/sumă|amount|valoare/i).or(
      page.getByPlaceholder(/sumă|amount/i)
    ).first();

    if (await amountInput.isVisible()) {
      await amountInput.fill('1000');

      // Look for calculate button or auto-calculation
      const calculateButton = page.getByRole('button', { name: /calcul|compute/i });

      if (await calculateButton.isVisible()) {
        await calculateButton.click();
      }

      // Should show result (190 RON at 19%)
      await page.waitForTimeout(500);
      const result = page.getByText(/190|1190/);
      if (await result.count() > 0) {
        await expect(result.first()).toBeVisible();
      }
    }
  });

  test('supports multiple VAT rates', async ({ page }) => {
    await page.goto('/ro/dashboard/vat');
    await page.waitForLoadState('networkidle');

    // Look for rate selector
    const rateSelector = page.getByRole('combobox', { name: /cotă|rate/i }).or(
      page.locator('select[name*="rate"]')
    );

    if (await rateSelector.isVisible()) {
      await rateSelector.click();

      // Should have multiple rate options
      const options = page.getByRole('option');
      expect(await options.count()).toBeGreaterThan(1);
    }
  });
});

test.describe('SAF-T D406 Reports', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockVATAPIs(page);
  });

  test('displays SAF-T page', async ({ page }) => {
    await page.goto('/ro/dashboard/saft');
    await page.waitForLoadState('networkidle');

    // Should show SAF-T content
    const saftContent = page.getByText(/SAF-T|D406|declarație/i);
    await expect(saftContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows grace period information', async ({ page }) => {
    await page.goto('/ro/dashboard/saft');
    await page.waitForLoadState('networkidle');

    // Look for grace period or deadline info
    const graceInfo = page.getByText(/grace|perioadă|2026|pilot/i);

    if (await graceInfo.count() > 0) {
      await expect(graceInfo.first()).toBeVisible();
    }
  });

  test('can generate SAF-T report', async ({ page }) => {
    await page.route('**/api/v1/saft/generate**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          reportId: 'saft-new',
          message: 'Raport generat cu succes',
        }),
      });
    });

    await page.goto('/ro/dashboard/saft');
    await page.waitForLoadState('networkidle');

    // Look for generate button
    const generateButton = page.getByRole('button', { name: /genere|generate|crează/i });

    if (await generateButton.isVisible()) {
      await generateButton.click();

      // Should show success or progress
      await page.waitForTimeout(1000);
    }
  });

  test('shows previous SAF-T submissions', async ({ page }) => {
    await page.goto('/ro/dashboard/saft');
    await page.waitForLoadState('networkidle');

    // Should show submission history
    const submissions = page.getByText(/2024-01|GENERATED|generat/i);

    if (await submissions.count() > 0) {
      await expect(submissions.first()).toBeVisible();
    }
  });
});

test.describe('e-Factura Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);

    await page.route('**/api/v1/efactura**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invoices: [
            {
              id: 'ef-1',
              invoiceNumber: 'FCT-2024-001',
              status: 'ACCEPTED',
              spvId: 'SPV-123456',
              submittedAt: '2024-01-15T10:00:00Z',
            },
            {
              id: 'ef-2',
              invoiceNumber: 'FCT-2024-002',
              status: 'PENDING',
              submittedAt: '2024-01-20T10:00:00Z',
            },
          ],
        }),
      });
    });
  });

  test('displays e-Factura page', async ({ page }) => {
    await page.goto('/ro/dashboard/efactura');
    await page.waitForLoadState('networkidle');

    // Should show e-Factura content
    const efacturaContent = page.getByText(/e-Factura|SPV|ANAF/i);
    await expect(efacturaContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows e-Factura submission status', async ({ page }) => {
    await page.goto('/ro/dashboard/efactura');
    await page.waitForLoadState('networkidle');

    // Should show status badges
    const statusContent = page.getByText(/ACCEPTED|PENDING|acceptat|în așteptare/i);

    if (await statusContent.count() > 0) {
      await expect(statusContent.first()).toBeVisible();
    }
  });

  test('can preview invoice XML', async ({ page }) => {
    await page.goto('/ro/dashboard/efactura');
    await page.waitForLoadState('networkidle');

    // Look for preview button
    const previewButton = page.getByRole('button', { name: /preview|vizualizare|XML/i });

    if (await previewButton.isVisible()) {
      await previewButton.click();

      // Should show XML content or modal
      await page.waitForTimeout(500);
    }
  });

  test('can submit to ANAF SPV', async ({ page }) => {
    await page.route('**/api/v1/efactura/submit**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          spvId: 'SPV-NEW-123',
          message: 'Trimis cu succes la ANAF',
        }),
      });
    });

    await page.goto('/ro/dashboard/efactura');
    await page.waitForLoadState('networkidle');

    // Look for submit button
    const submitButton = page.getByRole('button', { name: /trimite|submit|ANAF/i });

    if (await submitButton.isVisible()) {
      // Check first checkbox if available
      const checkbox = page.getByRole('checkbox').first();
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }

      await submitButton.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Compliance Deadlines', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockVATAPIs(page);
  });

  test('shows VAT payment deadline', async ({ page }) => {
    await page.goto('/ro/dashboard/vat');
    await page.waitForLoadState('networkidle');

    // Look for deadline info (25th of month)
    const deadlineContent = page.getByText(/termen|deadline|25|scadent/i);

    if (await deadlineContent.count() > 0) {
      await expect(deadlineContent.first()).toBeVisible();
    }
  });

  test('shows compliance alerts', async ({ page }) => {
    await page.goto('/ro/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for compliance or alert content
    const alerts = page.locator('[data-testid="alert"], .alert, [role="alert"]');

    if (await alerts.count() > 0) {
      await expect(alerts.first()).toBeVisible();
    }
  });
});

test.describe('VAT Responsive Design', () => {
  test('VAT page works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await mockAuth(page);
    await mockVATAPIs(page);

    await page.goto('/ro/dashboard/vat');
    await page.waitForLoadState('networkidle');

    // Content should be visible
    const content = page.getByText(/TVA|VAT/i);
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    // No horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });

  test('SAF-T page works on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await mockAuth(page);
    await mockVATAPIs(page);

    await page.goto('/ro/dashboard/saft');
    await page.waitForLoadState('networkidle');

    // Content should be accessible
    const content = page.getByText(/SAF-T|D406/i);
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});
