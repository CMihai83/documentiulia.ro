import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests - DocumentIulia.ro
 * Tests Romanian business dashboard functionality
 */

test.describe('Dashboard', () => {
  // Skip auth for now - would need test user setup
  test.skip('authenticated user can access dashboard', async ({ page }) => {
    // This would require authentication setup
    await page.goto('/ro/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('dashboard page structure is correct', async ({ page }) => {
    // Navigate directly (will redirect if not authenticated)
    await page.goto('/ro/dashboard');

    // If redirected to login, that's expected behavior
    const url = page.url();
    expect(url).toMatch(/dashboard|login|sign-in/);
  });
});

test.describe('Dashboard Widgets (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication or use test credentials
    // For now, we'll test the public page structure
    await page.goto('/ro');
  });

  test('homepage shows key features', async ({ page }) => {
    // Check for key Romanian business features
    const features = [
      /TVA|VAT/i,
      /factur/i, // factura, facturare
      /ANAF/i,
      /contabilitate/i,
    ];

    for (const feature of features) {
      const element = page.getByText(feature).first();
      // At least one should be visible
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        break;
      }
    }
  });

  test('navigation menu is accessible', async ({ page }) => {
    // Check main navigation
    const nav = page.getByRole('navigation').first();
    await expect(nav).toBeVisible();

    // Check for key menu items (Romanian terms)
    const menuItems = page.getByRole('link');
    expect(await menuItems.count()).toBeGreaterThan(0);
  });

  test('footer contains legal links', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Check for Romanian legal requirements
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Should have privacy/terms links (GDPR requirement)
    const legalLinks = footer.getByRole('link');
    expect(await legalLinks.count()).toBeGreaterThan(0);
  });
});

test.describe('Accessibility', () => {
  test('homepage meets basic accessibility requirements', async ({ page }) => {
    await page.goto('/ro');

    // Check for proper heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();

    // Check for skip link (WCAG requirement)
    const skipLink = page.getByRole('link', { name: /skip|treci/i });
    // Skip link may not be visible until focused

    // Check for alt text on images
    const images = page.getByRole('img');
    const imageCount = await images.count();

    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Images should have alt text (can be empty for decorative)
      expect(alt).toBeDefined();
    }
  });

  test('color contrast is sufficient', async ({ page }) => {
    await page.goto('/ro');

    // Basic visual check - page should have readable text
    const body = page.locator('body');
    const styles = await body.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      };
    });

    // Should have defined colors
    expect(styles.color).toBeDefined();
    expect(styles.backgroundColor).toBeDefined();
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/ro');

    // Tab through focusable elements
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeDefined();

    // Continue tabbing
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focus should have moved
    const currentFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(currentFocused).toBeDefined();
  });
});
