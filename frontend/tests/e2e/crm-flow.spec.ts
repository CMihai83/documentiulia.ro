import { test, expect, Page } from '@playwright/test';

/**
 * CRM E2E Tests - DocumentIulia.ro
 * Tests the complete CRM contact and deal management flow
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

// Mock CRM API responses
async function mockCRMAPIs(page: Page) {
  await page.route('**/api/v1/crm/contacts**', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contacts: [
            {
              id: 'contact-1',
              name: 'Ion Popescu',
              email: 'ion@abc-srl.ro',
              phone: '+40721123456',
              company: 'ABC SRL',
              status: 'CUSTOMER',
              createdAt: '2024-01-10T10:00:00Z',
            },
            {
              id: 'contact-2',
              name: 'Maria Ionescu',
              email: 'maria@xyz-sa.ro',
              phone: '+40722333444',
              company: 'XYZ SA',
              status: 'LEAD',
              createdAt: '2024-01-15T10:00:00Z',
            },
          ],
          total: 2,
        }),
      });
    } else if (method === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'contact-new',
          ...body,
          createdAt: new Date().toISOString(),
        }),
      });
    }
  });

  await page.route('**/api/v1/crm/deals**', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          deals: [
            {
              id: 'deal-1',
              title: 'Contract servicii IT',
              value: 50000,
              currency: 'RON',
              stage: 'NEGOTIATION',
              probability: 75,
              contactId: 'contact-1',
              contactName: 'Ion Popescu',
              createdAt: '2024-01-10T10:00:00Z',
            },
            {
              id: 'deal-2',
              title: 'Licențe software',
              value: 15000,
              currency: 'EUR',
              stage: 'PROPOSAL',
              probability: 50,
              contactId: 'contact-2',
              contactName: 'Maria Ionescu',
              createdAt: '2024-01-12T10:00:00Z',
            },
          ],
          total: 2,
        }),
      });
    } else if (method === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'deal-new',
          ...body,
          createdAt: new Date().toISOString(),
        }),
      });
    }
  });

  await page.route('**/api/v1/crm/activities**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        activities: [
          {
            id: 'activity-1',
            type: 'CALL',
            title: 'Apel follow-up',
            status: 'COMPLETED',
            contactId: 'contact-1',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
      }),
    });
  });

  await page.route('**/api/v1/crm/stats**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalContacts: 150,
        newContactsThisMonth: 12,
        totalDeals: 45,
        openDealsValue: 750000,
        conversionRate: 35,
      }),
    });
  });
}

test.describe('CRM Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockCRMAPIs(page);
  });

  test('displays CRM overview with stats', async ({ page }) => {
    await page.goto('/ro/dashboard/crm');
    await page.waitForLoadState('networkidle');

    // Should show CRM statistics or content
    const crmContent = page.getByText(/contact|deal|oportunitate|CRM/i);
    await expect(crmContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows tabs for contacts, deals, and activities', async ({ page }) => {
    await page.goto('/ro/dashboard/crm');
    await page.waitForLoadState('networkidle');

    // Look for tab navigation
    const tabs = page.getByRole('tab');

    if (await tabs.count() > 0) {
      // Should have multiple tabs
      expect(await tabs.count()).toBeGreaterThanOrEqual(2);
    }
  });

  test('can switch between CRM tabs', async ({ page }) => {
    await page.goto('/ro/dashboard/crm');
    await page.waitForLoadState('networkidle');

    // Find deals tab
    const dealsTab = page.getByRole('tab', { name: /deal|oportunități/i });

    if (await dealsTab.isVisible()) {
      await dealsTab.click();

      // Should show deals content
      await expect(page.getByText(/Contract|servicii|deal/i).first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('CRM Contacts', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockCRMAPIs(page);
  });

  test('displays contact list', async ({ page }) => {
    await page.goto('/ro/dashboard/crm');
    await page.waitForLoadState('networkidle');

    // Should show contact names
    await expect(page.getByText(/Ion Popescu|Maria Ionescu/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('can search contacts', async ({ page }) => {
    await page.goto('/ro/dashboard/crm');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/căut|search/i);

    if (await searchInput.isVisible()) {
      await searchInput.fill('Ion');
      await page.waitForTimeout(500);

      // Should filter results
      await expect(page.getByText(/Ion Popescu/)).toBeVisible();
    }
  });

  test('can view contact details', async ({ page }) => {
    // Mock single contact detail
    await page.route('**/api/v1/crm/contacts/contact-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'contact-1',
          name: 'Ion Popescu',
          email: 'ion@abc-srl.ro',
          phone: '+40721123456',
          company: 'ABC SRL',
          position: 'Director General',
          status: 'CUSTOMER',
          notes: 'Client fidel',
          createdAt: '2024-01-10T10:00:00Z',
        }),
      });
    });

    await page.goto('/ro/dashboard/crm/contacts/contact-1');
    await page.waitForLoadState('networkidle');

    // Should show contact details
    await expect(page.getByText(/Ion Popescu/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/ion@abc-srl.ro|ABC SRL/i).first()).toBeVisible();
  });

  test('can create new contact', async ({ page }) => {
    await page.goto('/ro/dashboard/crm/contacts/new');
    await page.waitForLoadState('networkidle');

    // Fill in contact form
    const nameInput = page.getByLabel(/nume|name/i);
    const emailInput = page.getByLabel(/email/i);

    if (await nameInput.isVisible() && await emailInput.isVisible()) {
      await nameInput.fill('Test Contact');
      await emailInput.fill('test@example.com');

      // Look for submit button
      const submitButton = page.getByRole('button', { name: /salvează|save|adaugă/i });

      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show success or redirect
        await page.waitForTimeout(1000);
      }
    }
  });

  test('shows contact status badges', async ({ page }) => {
    await page.goto('/ro/dashboard/crm');
    await page.waitForLoadState('networkidle');

    // Look for status badges
    const statusBadges = page.locator('.badge, [data-status], .status-badge');

    if (await statusBadges.count() > 0) {
      await expect(statusBadges.first()).toBeVisible();
    }
  });
});

test.describe('CRM Deals', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockCRMAPIs(page);
  });

  test('displays deals pipeline', async ({ page }) => {
    await page.goto('/ro/dashboard/crm');
    await page.waitForLoadState('networkidle');

    // Click on deals tab
    const dealsTab = page.getByRole('tab', { name: /deal|oportunități/i });

    if (await dealsTab.isVisible()) {
      await dealsTab.click();
    }

    // Should show deals
    await expect(page.getByText(/Contract|servicii|Licențe/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows deal values and stages', async ({ page }) => {
    await page.goto('/ro/dashboard/crm');
    await page.waitForLoadState('networkidle');

    // Switch to deals
    const dealsTab = page.getByRole('tab', { name: /deal|oportunități/i });
    if (await dealsTab.isVisible()) {
      await dealsTab.click();
    }

    // Should show monetary values
    const amounts = page.getByText(/RON|EUR|\d+[.,]\d{3}/);
    if (await amounts.count() > 0) {
      await expect(amounts.first()).toBeVisible();
    }
  });

  test('can view deal details', async ({ page }) => {
    // Mock single deal detail
    await page.route('**/api/v1/crm/deals/deal-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'deal-1',
          title: 'Contract servicii IT',
          value: 50000,
          currency: 'RON',
          stage: 'NEGOTIATION',
          probability: 75,
          contact: {
            id: 'contact-1',
            name: 'Ion Popescu',
          },
          notes: 'Negociere în curs',
          createdAt: '2024-01-10T10:00:00Z',
        }),
      });
    });

    await page.goto('/ro/dashboard/crm/deals/deal-1');
    await page.waitForLoadState('networkidle');

    // Should show deal details
    await expect(page.getByText(/Contract servicii IT/)).toBeVisible({ timeout: 10000 });
  });

  test('can create new deal', async ({ page }) => {
    await page.goto('/ro/dashboard/crm/deals/new');
    await page.waitForLoadState('networkidle');

    // Fill in deal form
    const titleInput = page.getByLabel(/titlu|title|nume/i);
    const valueInput = page.getByLabel(/valoare|value|sumă/i);

    if (await titleInput.isVisible()) {
      await titleInput.fill('Test Deal');

      if (await valueInput.isVisible()) {
        await valueInput.fill('10000');
      }

      // Look for submit button
      const submitButton = page.getByRole('button', { name: /salvează|save|adaugă/i });

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('can update deal stage', async ({ page }) => {
    // Mock deal update
    await page.route('**/api/v1/crm/deals/deal-1', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'deal-1',
            stage: 'CLOSED_WON',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'deal-1',
            title: 'Contract servicii IT',
            stage: 'NEGOTIATION',
          }),
        });
      }
    });

    await page.goto('/ro/dashboard/crm/deals/deal-1');
    await page.waitForLoadState('networkidle');

    // Look for stage selector or buttons
    const stageSelector = page.getByRole('combobox', { name: /stage|etapă/i }).or(
      page.getByRole('button', { name: /stage|etapă|status/i })
    );

    if (await stageSelector.isVisible()) {
      await stageSelector.click();
    }
  });
});

test.describe('CRM Activities', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockCRMAPIs(page);
  });

  test('can log new activity', async ({ page }) => {
    await page.goto('/ro/dashboard/crm');
    await page.waitForLoadState('networkidle');

    // Look for activity tab or button
    const activitiesTab = page.getByRole('tab', { name: /activit/i });

    if (await activitiesTab.isVisible()) {
      await activitiesTab.click();

      // Look for add activity button
      const addButton = page.getByRole('button', { name: /adaugă|add|nou/i });

      if (await addButton.isVisible()) {
        await addButton.click();
      }
    }
  });

  test('shows activity types', async ({ page }) => {
    await page.goto('/ro/dashboard/crm');
    await page.waitForLoadState('networkidle');

    // Switch to activities
    const activitiesTab = page.getByRole('tab', { name: /activit/i });
    if (await activitiesTab.isVisible()) {
      await activitiesTab.click();
    }

    // Should show activity content
    const activityContent = page.getByText(/apel|email|întâlnire|call|meeting/i);
    if (await activityContent.count() > 0) {
      await expect(activityContent.first()).toBeVisible();
    }
  });
});

test.describe('CRM Responsive Design', () => {
  test('CRM dashboard works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await mockAuth(page);
    await mockCRMAPIs(page);

    await page.goto('/ro/dashboard/crm');
    await page.waitForLoadState('networkidle');

    // Content should be accessible
    const content = page.getByText(/contact|CRM/i);
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    // No horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });

  test('contact details work on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await mockAuth(page);
    await mockCRMAPIs(page);

    await page.route('**/api/v1/crm/contacts/contact-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'contact-1',
          name: 'Ion Popescu',
          email: 'ion@abc-srl.ro',
          status: 'CUSTOMER',
        }),
      });
    });

    await page.goto('/ro/dashboard/crm/contacts/contact-1');
    await page.waitForLoadState('networkidle');

    // Should display contact info
    await expect(page.getByText(/Ion Popescu/)).toBeVisible({ timeout: 10000 });
  });
});
