import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://documentiulia.ro';

test.describe('Forum Pages E2E Tests', () => {
  test.describe('Public Forum Access', () => {
    test('should load forum main page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/forum`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page).toHaveTitle(/Forum|Comunitate/i);
    });

    test('should load forum all threads page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/forum/all`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toContainText(/Discuții|Threads/i);
    });

    test('should load forum new thread page with login prompt', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/forum/new`);
      expect(response?.status()).toBe(200);
      // Should show login required message
      await expect(page.locator('text=/Autentificare|Login/i')).toBeVisible();
    });

    test('should load forum category page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/forum/category/general`);
      expect(response?.status()).toBe(200);
      // Should have back to forum link
      await expect(page.locator('a[href="/forum"]')).toBeVisible();
    });

    test('should load forum thread page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/forum/thread/test`);
      expect(response?.status()).toBe(200);
      // Should have back to forum link
      await expect(page.locator('a[href="/forum"]')).toBeVisible();
    });
  });

  test.describe('Forum Navigation', () => {
    test('should navigate from forum main to all threads', async ({ page }) => {
      await page.goto(`${BASE_URL}/forum`);
      await page.click('a[href*="/forum/all"]');
      await expect(page).toHaveURL(/\/forum\/all/);
    });

    test('should navigate from forum to new thread', async ({ page }) => {
      await page.goto(`${BASE_URL}/forum`);
      await page.click('a[href*="/forum/new"]');
      await expect(page).toHaveURL(/\/forum\/new/);
    });

    test('should navigate back to forum from category page', async ({ page }) => {
      await page.goto(`${BASE_URL}/forum/category/general`);
      await page.click('a[href="/forum"]');
      await expect(page).toHaveURL(/\/forum$/);
    });
  });

  test.describe('Forum Mobile Responsiveness', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/forum`);

      // Page should load without horizontal scroll
      const body = page.locator('body');
      const bodyWidth = await body.evaluate(el => el.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(375);
    });

    test('should display forum all page on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const response = await page.goto(`${BASE_URL}/forum/all`);
      expect(response?.status()).toBe(200);
    });
  });

  test.describe('Forum Performance', () => {
    test('should load forum main under 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/forum`, { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('should load forum all threads under 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/forum/all`, { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });
  });
});

test.describe('Invoice Bulk Actions E2E Tests', () => {
  test.describe('Auth Protection', () => {
    test('bulk-delete should redirect to login', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/invoices/bulk-delete?ids=1,2,3`);
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('bulk-spv should redirect to login', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/invoices/bulk-spv?ids=1,2,3`);
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

test.describe('Critical User Journeys', () => {
  test('homepage to forum navigation flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Find and click forum link in navigation
    await page.click('a[href*="/forum"]');
    await expect(page).toHaveURL(/\/forum/);

    // Navigate to all threads
    const allThreadsLink = page.locator('a[href*="/forum/all"]').first();
    if (await allThreadsLink.isVisible()) {
      await allThreadsLink.click();
      await expect(page).toHaveURL(/\/forum\/all/);
    }
  });

  test('homepage to pricing to contact flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Go to pricing
    await page.click('a[href*="/pricing"]');
    await expect(page).toHaveURL(/\/pricing/);

    // Go to contact
    await page.click('a[href*="/contact"]');
    await expect(page).toHaveURL(/\/contact/);
  });

  test('login page has register link', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('a[href*="/register"]')).toBeVisible();
  });
});
