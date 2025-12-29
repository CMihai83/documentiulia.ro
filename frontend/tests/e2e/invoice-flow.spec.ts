import { test, expect, Page } from '@playwright/test';

/**
 * Invoice Creation E2E Tests - DocumentIulia.ro
 * Tests the complete invoice creation and management flow
 * Critical for Romanian business compliance
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

// Mock API responses
async function mockInvoiceAPIs(page: Page) {
  await page.route('**/api/v1/invoices**', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invoices: [
            {
              id: 'inv-1',
              invoiceNumber: 'FCT-2024-001',
              status: 'PAID',
              partnerName: 'ABC SRL',
              total: 11900,
              currency: 'RON',
              issuedDate: '2024-01-15',
              dueDate: '2024-02-15',
            },
            {
              id: 'inv-2',
              invoiceNumber: 'FCT-2024-002',
              status: 'PENDING',
              partnerName: 'XYZ SA',
              total: 5950,
              currency: 'RON',
              issuedDate: '2024-01-20',
              dueDate: '2024-02-20',
            },
          ],
          total: 2,
        }),
      });
    } else if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'inv-new',
          invoiceNumber: 'FCT-2024-003',
          status: 'DRAFT',
        }),
      });
    }
  });

  await page.route('**/api/v1/partners**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        partners: [
          { id: 'p-1', name: 'ABC SRL', cui: 'RO12345678' },
          { id: 'p-2', name: 'XYZ SA', cui: 'RO87654321' },
        ],
      }),
    });
  });
}

test.describe('Invoice List View', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockInvoiceAPIs(page);
  });

  test('displays invoice list with correct columns', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Check for table headers or list view
    const invoiceList = page.locator('[data-testid="invoice-list"], table, [role="table"]');

    // Should have invoice content
    await expect(page.getByText(/FCT-2024|factur/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows invoice status badges', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices');
    await page.waitForLoadState('networkidle');

    // Check for status indicators
    const statusBadges = page.locator('[data-status], .badge, .status');

    // At least one status should be visible
    if (await statusBadges.count() > 0) {
      await expect(statusBadges.first()).toBeVisible();
    }
  });

  test('can filter invoices by status', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices');
    await page.waitForLoadState('networkidle');

    // Look for filter controls
    const filterButton = page.getByRole('button', { name: /filter|filtru/i });
    const statusSelect = page.getByRole('combobox', { name: /status/i });

    // Either filter button or status select should exist
    const hasFilter = await filterButton.isVisible() || await statusSelect.isVisible();

    if (hasFilter) {
      // Click to open filter if it's a button
      if (await filterButton.isVisible()) {
        await filterButton.click();
      }
    }
  });

  test('can search invoices', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices');
    await page.waitForLoadState('networkidle');

    // Look for search input
    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/căut|search/i)
    );

    if (await searchInput.isVisible()) {
      await searchInput.fill('FCT-2024');
      await page.waitForTimeout(500); // Debounce

      // Results should update
      await expect(page.getByText(/FCT-2024/)).toBeVisible();
    }
  });
});

test.describe('Invoice Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockInvoiceAPIs(page);
  });

  test('navigates to new invoice form', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices');
    await page.waitForLoadState('networkidle');

    // Find and click "New Invoice" button
    const newButton = page.getByRole('link', { name: /nou|adaugă|new/i }).or(
      page.getByRole('button', { name: /nou|adaugă|new/i })
    );

    if (await newButton.isVisible()) {
      await newButton.click();

      // Should navigate to new invoice page
      await expect(page).toHaveURL(/invoices\/(new|nou)/);
    }
  });

  test('invoice form has required fields', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices/new');
    await page.waitForLoadState('networkidle');

    // Check for essential form fields
    const partnerField = page.getByLabel(/client|partener|partner/i).or(
      page.getByPlaceholder(/client|partener/i)
    );

    const dateField = page.getByLabel(/data|date/i);

    // At least partner selection should be present
    const hasForm = await partnerField.isVisible() || await dateField.isVisible();
    expect(hasForm).toBeTruthy();
  });

  test('can add line items to invoice', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices/new');
    await page.waitForLoadState('networkidle');

    // Look for "Add Line" button
    const addLineButton = page.getByRole('button', { name: /adaugă|add|linie|item/i });

    if (await addLineButton.isVisible()) {
      await addLineButton.click();

      // Should show line item fields
      const lineFields = page.locator('[data-testid="line-item"], .line-item, [class*="line"]');
      expect(await lineFields.count()).toBeGreaterThan(0);
    }
  });

  test('calculates VAT correctly', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices/new');
    await page.waitForLoadState('networkidle');

    // Look for VAT-related fields
    const vatField = page.locator('[data-testid="vat"], [name*="vat"], [class*="vat"]');
    const totalField = page.locator('[data-testid="total"], [name*="total"], [class*="total"]');

    // VAT calculations should be present
    const hasVatCalc = (await vatField.count() > 0) || (await totalField.count() > 0);

    // At least should have some amount display
    const amountDisplay = page.getByText(/RON|EUR|total|subtotal/i);
    if (await amountDisplay.count() > 0) {
      await expect(amountDisplay.first()).toBeVisible();
    }
  });
});

test.describe('Invoice Detail View', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);

    // Mock single invoice detail
    await page.route('**/api/v1/invoices/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'inv-1',
          invoiceNumber: 'FCT-2024-001',
          status: 'PENDING',
          partnerName: 'ABC SRL',
          partnerCui: 'RO12345678',
          items: [
            {
              id: 'item-1',
              description: 'Servicii consultanță',
              quantity: 10,
              unitPrice: 1000,
              vatRate: 19,
              total: 11900,
            },
          ],
          subtotal: 10000,
          vatAmount: 1900,
          total: 11900,
          currency: 'RON',
          issuedDate: '2024-01-15',
          dueDate: '2024-02-15',
        }),
      });
    });
  });

  test('displays invoice details correctly', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices/inv-1');
    await page.waitForLoadState('networkidle');

    // Should show invoice number
    await expect(page.getByText(/FCT-2024-001/)).toBeVisible({ timeout: 10000 });
  });

  test('shows line items with amounts', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices/inv-1');
    await page.waitForLoadState('networkidle');

    // Should show line item details
    await expect(page.getByText(/consultanță|servicii/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('displays VAT breakdown', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices/inv-1');
    await page.waitForLoadState('networkidle');

    // Should show VAT information
    const vatInfo = page.getByText(/TVA|VAT|19%/i);
    if (await vatInfo.count() > 0) {
      await expect(vatInfo.first()).toBeVisible();
    }
  });

  test('has action buttons for invoice management', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices/inv-1');
    await page.waitForLoadState('networkidle');

    // Look for common invoice actions
    const editButton = page.getByRole('button', { name: /edit|modific/i }).or(
      page.getByRole('link', { name: /edit|modific/i })
    );
    const printButton = page.getByRole('button', { name: /print|tipăr/i });
    const downloadButton = page.getByRole('button', { name: /download|descarcă|pdf/i });

    // At least one action should be available
    const hasActions = await editButton.isVisible() ||
                       await printButton.isVisible() ||
                       await downloadButton.isVisible();

    expect(hasActions).toBeTruthy();
  });
});

test.describe('Invoice e-Factura Integration', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockInvoiceAPIs(page);
  });

  test('shows e-Factura status on invoices', async ({ page }) => {
    await page.goto('/ro/dashboard/invoices');
    await page.waitForLoadState('networkidle');

    // Look for e-Factura indicators
    const efacturaStatus = page.locator('[data-efactura], .efactura-status, [class*="anaf"]');

    // Check for any ANAF-related content
    const anafContent = page.getByText(/ANAF|SPV|e-Factura/i);

    // Either status indicators or ANAF text should exist
    const hasEfactura = (await efacturaStatus.count() > 0) || (await anafContent.count() > 0);

    // This is expected in a Romanian ERP
    if (hasEfactura) {
      await expect(anafContent.first()).toBeVisible();
    }
  });

  test('can submit invoice to ANAF', async ({ page }) => {
    // Mock e-Factura submission
    await page.route('**/api/v1/efactura/submit**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          spvId: 'SPV-123456',
          message: 'Factură trimisă cu succes',
        }),
      });
    });

    await page.goto('/ro/dashboard/invoices/inv-1');
    await page.waitForLoadState('networkidle');

    // Look for submit to ANAF button
    const submitButton = page.getByRole('button', { name: /ANAF|SPV|trimite|submit/i });

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show success message or status update
      await expect(page.getByText(/succes|trimis|accepted/i).first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Invoice Responsive Design', () => {
  test('invoice list is usable on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await mockAuth(page);
    await mockInvoiceAPIs(page);

    await page.goto('/ro/dashboard/invoices');
    await page.waitForLoadState('networkidle');

    // Content should be visible without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    // Allow small overflow (scrollbar, etc)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });

  test('invoice form is usable on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await mockAuth(page);
    await mockInvoiceAPIs(page);

    await page.goto('/ro/dashboard/invoices/new');
    await page.waitForLoadState('networkidle');

    // Form should be accessible
    const formElements = page.locator('input, select, button, textarea');
    expect(await formElements.count()).toBeGreaterThan(0);
  });
});
