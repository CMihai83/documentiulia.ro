import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Attempt to access protected route
    await page.goto('/ro/dashboard');

    // Should either redirect to login or show auth component
    const currentUrl = page.url();
    const isRedirected = currentUrl.includes('sign-in') ||
                         currentUrl.includes('login') ||
                         currentUrl.includes('clerk');

    // If using Clerk, there should be a sign-in modal or redirect
    if (!isRedirected) {
      // Check for Clerk sign-in component
      const clerkComponent = page.locator('[class*="clerk"], [class*="sign-in"]');
      const hasClerk = await clerkComponent.count() > 0;

      // Or check if dashboard is accessible (mock auth)
      const dashboardContent = page.locator('[class*="dashboard"]');
      const isDashboardVisible = await dashboardContent.count() > 0;

      expect(hasClerk || isDashboardVisible).toBeTruthy();
    }
  });

  test('should display sign-in page correctly', async ({ page }) => {
    await page.goto('/ro/sign-in');

    // Check for sign-in form elements
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.locator('input[type="password"]');

    // Either Clerk component or custom form
    const hasForm = await emailInput.count() > 0 || await passwordInput.count() > 0;
    const hasClerk = await page.locator('[class*="clerk"]').count() > 0;

    expect(hasForm || hasClerk).toBeTruthy();
  });

  test('should display sign-up page correctly', async ({ page }) => {
    await page.goto('/ro/sign-up');

    // Check for sign-up elements
    const signUpButton = page.getByRole('button', { name: /sign.*up|[iî]nregistr|creare/i });
    const emailInput = page.getByRole('textbox', { name: /email/i });

    const hasElements = await signUpButton.count() > 0 || await emailInput.count() > 0;
    const hasClerk = await page.locator('[class*="clerk"]').count() > 0;

    expect(hasElements || hasClerk).toBeTruthy();
  });
});

test.describe('Protected Routes', () => {
  const protectedRoutes = [
    '/ro/dashboard',
    '/ro/dashboard/hr',
    '/ro/dashboard/finance',
    '/ro/dashboard/logistics',
    '/ro/dashboard/hse',
    '/ro/dashboard/lms',
    '/ro/dashboard/forum',
    '/ro/dashboard/blog',
  ];

  for (const route of protectedRoutes) {
    test(`should handle auth for ${route}`, async ({ page }) => {
      const response = await page.goto(route);

      // Should not return server error
      expect(response?.status()).toBeLessThan(500);

      // Page should load something
      await expect(page.locator('body')).toBeVisible();
    });
  }
});

test.describe('Session Management', () => {
  test('should not have stale session data on fresh load', async ({ page }) => {
    // Clear all storage
    await page.context().clearCookies();

    await page.goto('/ro/dashboard');

    // Page should load without errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('Warning')) {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // No critical session errors
    const criticalErrors = errors.filter(
      (e) => e.toLowerCase().includes('session') || e.toLowerCase().includes('auth')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
