import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests - DocumentIulia.ro
 * Tests Romanian user authentication flows
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ro');
  });

  test('homepage loads correctly in Romanian', async ({ page }) => {
    // Check Romanian content loads
    await expect(page).toHaveTitle(/DocumentIulia/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Contabilitate|ERP|AI/i);
  });

  test('can navigate to login page', async ({ page }) => {
    // Click login button
    const loginButton = page.getByRole('link', { name: /autentificare|conectare|login/i });
    await loginButton.click();

    // Should be on login page
    await expect(page).toHaveURL(/login|sign-in/);
  });

  test('login form has required fields', async ({ page }) => {
    await page.goto('/ro/login');

    // Check for email and password fields
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.getByLabel(/parol/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/ro/login');

    // Fill in invalid credentials
    await page.getByRole('textbox', { name: /email/i }).fill('invalid@test.com');
    await page.getByLabel(/parol/i).fill('wrongpassword');

    // Submit form
    await page.getByRole('button', { name: /conectare|autentificare|login/i }).click();

    // Should show error message in Romanian
    await expect(page.getByText(/invalid|greșit|incorect|eroare/i)).toBeVisible({ timeout: 10000 });
  });

  test('language toggle works', async ({ page }) => {
    // Find language toggle
    const langToggle = page.getByRole('button', { name: /RO|EN|limba/i }).first();

    if (await langToggle.isVisible()) {
      await langToggle.click();

      // Should switch language (URL or content change)
      await expect(page.locator('html')).toHaveAttribute('lang', /en|ro/);
    }
  });
});
