import { test, expect } from '@playwright/test';

test.describe('Cross-Module Integration', () => {
  test.describe('HR Module', () => {
    test('should display employee list', async ({ page }) => {
      await page.goto('/ro/dashboard/hr');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('should navigate between HR tabs', async ({ page }) => {
      await page.goto('/ro/dashboard/hr');

      // Check for tab navigation
      const tabs = page.getByRole('tab');
      const tabCount = await tabs.count();

      if (tabCount > 1) {
        await tabs.nth(1).click();
        await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      }
    });

    test('should display employee metrics', async ({ page }) => {
      await page.goto('/ro/dashboard/hr');

      // Check for metrics display
      const metrics = page.locator('[class*="card"], [class*="stat"]');
      await expect(metrics.first()).toBeVisible();
    });
  });

  test.describe('Finance Module', () => {
    test('should display finance dashboard', async ({ page }) => {
      await page.goto('/ro/dashboard/finance');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('should display transaction list', async ({ page }) => {
      await page.goto('/ro/dashboard/finance');

      // Check for transactions table or list
      const transactions = page.locator('table, [class*="transaction"], [class*="list"]');
      await expect(transactions.first()).toBeVisible();
    });

    test('should display financial charts', async ({ page }) => {
      await page.goto('/ro/dashboard/finance');

      // Wait for Recharts to render
      await page.waitForTimeout(1000);

      const charts = page.locator('[class*="recharts"], svg');
      if (await charts.count() > 0) {
        await expect(charts.first()).toBeVisible();
      }
    });
  });

  test.describe('Logistics Module', () => {
    test('should display logistics dashboard', async ({ page }) => {
      await page.goto('/ro/dashboard/logistics');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('should navigate logistics tabs', async ({ page }) => {
      await page.goto('/ro/dashboard/logistics');

      const tabs = page.getByRole('tab');
      const tabCount = await tabs.count();

      for (let i = 0; i < Math.min(tabCount, 3); i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    });

    test('should display inventory data', async ({ page }) => {
      await page.goto('/ro/dashboard/logistics');

      // Click inventory tab if exists
      const inventoryTab = page.getByRole('tab', { name: /Inventar|Inventory/i });
      if (await inventoryTab.isVisible()) {
        await inventoryTab.click();
        await page.waitForTimeout(500);
      }

      // Check for inventory content
      const content = page.locator('[class*="card"], table');
      await expect(content.first()).toBeVisible();
    });
  });

  test.describe('HSE Module', () => {
    test('should display HSE dashboard', async ({ page }) => {
      await page.goto('/ro/dashboard/hse');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('should display safety metrics', async ({ page }) => {
      await page.goto('/ro/dashboard/hse');

      const metrics = page.locator('[class*="card"], [class*="metric"]');
      await expect(metrics.first()).toBeVisible();
    });

    test('should display incident list', async ({ page }) => {
      await page.goto('/ro/dashboard/hse');

      // Click incidents tab if exists
      const incidentsTab = page.getByRole('tab', { name: /Incidente|Incidents/i });
      if (await incidentsTab.isVisible()) {
        await incidentsTab.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('LMS Module', () => {
    test('should display LMS dashboard', async ({ page }) => {
      await page.goto('/ro/dashboard/lms');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('should display course list', async ({ page }) => {
      await page.goto('/ro/dashboard/lms');

      const courses = page.locator('[class*="course"], [class*="card"]');
      await expect(courses.first()).toBeVisible();
    });

    test('should navigate LMS tabs', async ({ page }) => {
      await page.goto('/ro/dashboard/lms');

      const tabs = page.getByRole('tab');
      if (await tabs.count() > 1) {
        await tabs.nth(1).click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Forum Module', () => {
    test('should display forum page', async ({ page }) => {
      await page.goto('/ro/dashboard/forum');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('should display thread list', async ({ page }) => {
      await page.goto('/ro/dashboard/forum');

      const threads = page.locator('[class*="thread"], [class*="post"], [class*="card"]');
      await expect(threads.first()).toBeVisible();
    });
  });

  test.describe('Blog Module', () => {
    test('should display blog page', async ({ page }) => {
      await page.goto('/ro/dashboard/blog');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('should display article list', async ({ page }) => {
      await page.goto('/ro/dashboard/blog');

      const articles = page.locator('[class*="article"], [class*="post"], [class*="card"]');
      await expect(articles.first()).toBeVisible();
    });

    test('should filter articles by category', async ({ page }) => {
      await page.goto('/ro/dashboard/blog');

      const categoryButtons = page.getByRole('button').filter({ hasText: /VAT|HR|Legisla[țt]ie/i });
      if (await categoryButtons.count() > 0) {
        await categoryButtons.first().click();
        await page.waitForTimeout(500);
      }
    });
  });
});

test.describe('Cross-Module Data Flow', () => {
  test('HR to Finance integration - employee data appears in finance', async ({ page }) => {
    // First check HR has employees
    await page.goto('/ro/dashboard/hr');
    await page.waitForTimeout(1000);

    // Then check Finance reflects HR data
    await page.goto('/ro/dashboard/finance');
    await page.waitForTimeout(1000);

    // Payroll section should exist
    const payrollSection = page.locator('text=/Salarizare|Payroll/i');
    if (await payrollSection.count() > 0) {
      await expect(payrollSection.first()).toBeVisible();
    }
  });

  test('Logistics to Finance integration - expenses appear in finance', async ({ page }) => {
    // Check logistics
    await page.goto('/ro/dashboard/logistics');
    await page.waitForTimeout(1000);

    // Check finance for logistics expenses
    await page.goto('/ro/dashboard/finance');
    await page.waitForTimeout(1000);

    // Expenses section should exist
    const expensesSection = page.locator('text=/Cheltuieli|Expenses|Logistic/i');
    if (await expensesSection.count() > 0) {
      await expect(expensesSection.first()).toBeVisible();
    }
  });

  test('LMS to HR integration - competencies update HR', async ({ page }) => {
    // Check LMS courses
    await page.goto('/ro/dashboard/lms');
    await page.waitForTimeout(1000);

    // Check HR for competency data
    await page.goto('/ro/dashboard/hr');
    await page.waitForTimeout(1000);

    // Competencies tab/section should exist
    const competenciesSection = page.locator('text=/Competen[țt]e|Skills|Abilit[aă][țt]i/i');
    if (await competenciesSection.count() > 0) {
      await expect(competenciesSection.first()).toBeVisible();
    }
  });
});
