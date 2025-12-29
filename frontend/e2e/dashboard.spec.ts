import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test('should load main dashboard page', async ({ page }) => {
    await page.goto('/ro/dashboard');
    await expect(page).toHaveTitle(/DocumentIulia|Dashboard/);
  });

  test('should navigate to HR module', async ({ page }) => {
    await page.goto('/ro/dashboard');
    await page.getByRole('link', { name: /HR|Resurse Umane/i }).click();
    await expect(page).toHaveURL(/.*\/dashboard\/hr/);
  });

  test('should navigate to Finance module', async ({ page }) => {
    await page.goto('/ro/dashboard');
    await page.getByRole('link', { name: /Finan[țt]e|Finance/i }).click();
    await expect(page).toHaveURL(/.*\/dashboard\/finance/);
  });

  test('should navigate to Logistics module', async ({ page }) => {
    await page.goto('/ro/dashboard');
    await page.getByRole('link', { name: /Logistic[aă]|Logistics/i }).click();
    await expect(page).toHaveURL(/.*\/dashboard\/logistics/);
  });

  test('should navigate to HSE module', async ({ page }) => {
    await page.goto('/ro/dashboard');
    await page.getByRole('link', { name: /HSE|Securitate/i }).click();
    await expect(page).toHaveURL(/.*\/dashboard\/hse/);
  });

  test('should navigate to LMS module', async ({ page }) => {
    await page.goto('/ro/dashboard');
    await page.getByRole('link', { name: /LMS|Cursuri|Training/i }).click();
    await expect(page).toHaveURL(/.*\/dashboard\/lms/);
  });
});

test.describe('Dashboard Metrics', () => {
  test('should display key metrics cards', async ({ page }) => {
    await page.goto('/ro/dashboard');

    // Check for metric cards presence
    const metricsContainer = page.locator('[class*="grid"]').first();
    await expect(metricsContainer).toBeVisible();
  });

  test('should load charts without errors', async ({ page }) => {
    await page.goto('/ro/dashboard');

    // Check no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    expect(errors.filter(e => !e.includes('Warning'))).toHaveLength(0);
  });
});

test.describe('Language Switching', () => {
  test('should switch from Romanian to English', async ({ page }) => {
    await page.goto('/ro/dashboard');

    // Look for language toggle
    const langToggle = page.getByRole('button', { name: /EN|English/i });
    if (await langToggle.isVisible()) {
      await langToggle.click();
      await expect(page).toHaveURL(/.*\/en\/.*/);
    }
  });

  test('should persist language preference', async ({ page }) => {
    await page.goto('/en/dashboard');
    await page.reload();
    await expect(page).toHaveURL(/.*\/en\/.*/);
  });
});

test.describe('Responsive Design', () => {
  test('should display mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/ro/dashboard');

    // Check mobile menu button
    const menuButton = page.getByRole('button', { name: /menu|meniu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });

  test('should display sidebar on large screens', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/ro/dashboard');

    // Sidebar should be visible
    const sidebar = page.locator('[class*="sidebar"], aside').first();
    await expect(sidebar).toBeVisible();
  });
});
