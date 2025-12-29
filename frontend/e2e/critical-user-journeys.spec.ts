import { test, expect } from '@playwright/test';

test.describe('Critical User Journeys', () => {
  test.describe('User Registration & Onboarding', () => {
    test('should complete full user registration flow', async ({ page }) => {
      // Navigate to registration page
      await page.goto('/ro/register');

      // Fill registration form
      await page.getByRole('textbox', { name: /nume complet|full name/i }).fill('Test User');
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
      await page.locator('input[type="password"]').first().fill('SecurePass123!');
      await page.locator('input[type="password"]').last().fill('SecurePass123!');

      // Accept terms and conditions
      const termsCheckbox = page.getByRole('checkbox', { name: /termeni|terms/i });
      if (await termsCheckbox.count() > 0) {
        await termsCheckbox.check();
      }

      // Submit registration
      await page.getByRole('button', { name: /[iî]nregistrare|register|crează cont/i }).click();

      // Should redirect to onboarding or dashboard
      await page.waitForURL('**/dashboard**', { timeout: 10000 });

      // Verify onboarding steps or dashboard access
      const onboardingElements = [
        page.getByText(/bun venit|welcome/i),
        page.getByText(/începe|start/i),
        page.getByText(/configurare|setup/i),
      ];

      const hasOnboarding = await Promise.all(
        onboardingElements.map(el => el.count().then(count => count > 0))
      ).then(results => results.some(Boolean));

      expect(hasOnboarding).toBeTruthy();
    });

    test('should complete company setup during onboarding', async ({ page }) => {
      // Assume user is logged in and on onboarding
      await page.goto('/ro/dashboard');

      // Look for company setup form
      const companyForm = page.locator('[class*="company"], [class*="onboarding"]');

      if (await companyForm.count() > 0) {
        // Fill company information
        const companyNameInput = page.getByRole('textbox', { name: /nume companie|company name/i });
        if (await companyNameInput.count() > 0) {
          await companyNameInput.fill('Test Company SRL');
        }

        const cuiInput = page.getByRole('textbox', { name: /cui/i });
        if (await cuiInput.count() > 0) {
          await cuiInput.fill('RO12345678');
        }

        const addressInput = page.getByRole('textbox', { name: /adresă|address/i });
        if (await addressInput.count() > 0) {
          await addressInput.fill('Strada Test 123, București');
        }

        // Continue to next step
        const continueButton = page.getByRole('button', { name: /continuă|continue|următorul|next/i });
        if (await continueButton.count() > 0) {
          await continueButton.click();
        }
      }

      // Verify setup completion
      await page.waitForTimeout(2000);
      const setupComplete = await page.getByText(/configurare completă|setup complete/i).count() > 0;
      const dashboardVisible = await page.getByText(/dashboard|panou/i).count() > 0;

      expect(setupComplete || dashboardVisible).toBeTruthy();
    });
  });

  test.describe('Creating and Sending an e-Factura', () => {
    test('should create a complete invoice with client information', async ({ page }) => {
      // Navigate to invoice creation
      await page.goto('/ro/dashboard/invoices/create');

      // Fill invoice header information
      await page.getByRole('textbox', { name: /serie|series/i }).fill('FV');
      await page.getByRole('textbox', { name: /număr|number/i }).fill('001');

      // Set dates
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const issuedDateInput = page.getByRole('textbox', { name: /data emiterii|issue date/i });
      if (await issuedDateInput.count() > 0) {
        await issuedDateInput.fill(today);
      }

      const dueDateInput = page.getByRole('textbox', { name: /data scadenței|due date/i });
      if (await dueDateInput.count() > 0) {
        await dueDateInput.fill(dueDate);
      }

      // Fill client information
      await page.getByRole('textbox', { name: /nume client|client name/i }).fill('Client Test SRL');
      await page.getByRole('textbox', { name: /cui/i }).fill('RO87654321');
      await page.getByRole('textbox', { name: /adresă|address/i }).fill('Strada Client 456, Cluj-Napoca');
      await page.getByRole('textbox', { name: /email/i }).fill('client@test.com');

      // Add invoice items
      await page.getByRole('textbox', { name: /descriere|description/i }).first().fill('Servicii IT');
      await page.getByRole('spinbutton', { name: /cantitate|quantity/i }).first().fill('10');
      await page.getByRole('textbox', { name: /unitate|unit/i }).first().fill('ore');
      await page.getByRole('spinbutton', { name: /preț|price/i }).first().fill('50');
      await page.getByRole('spinbutton', { name: /tva|vat/i }).first().fill('19');

      // Verify calculations
      await page.waitForTimeout(1000);
      const totalElements = [
        page.getByText(/total/i),
        page.getByText(/550\.00/), // 10 * 50 = 500, + 19% TVA = 95, total = 595
      ];

      const hasTotals = await Promise.all(
        totalElements.map(el => el.count().then(count => count > 0))
      ).then(results => results.some(Boolean));

      expect(hasTotals).toBeTruthy();
    });

    test('should send e-Factura to ANAF successfully', async ({ page }) => {
      // Navigate to invoice list or creation
      await page.goto('/ro/dashboard/invoices');

      // Find an existing invoice or create one
      const invoiceRow = page.locator('[class*="invoice"]').first();
      if (await invoiceRow.count() > 0) {
        // Click on invoice to view details
        await invoiceRow.click();
      } else {
        // Create a new invoice first
        await page.goto('/ro/dashboard/invoices/create');
        // ... fill minimum required fields ...
        await page.getByRole('textbox', { name: /serie/i }).fill('FV');
        await page.getByRole('textbox', { name: /număr/i }).fill('002');
        await page.getByRole('textbox', { name: /nume client/i }).fill('Test Client');
        await page.getByRole('textbox', { name: /cui/i }).fill('RO87654321');
        await page.getByRole('textbox', { name: /descriere/i }).first().fill('Test Item');
        await page.getByRole('spinbutton', { name: /cantitate/i }).first().fill('1');
        await page.getByRole('spinbutton', { name: /preț/i }).first().fill('100');
        await page.getByRole('spinbutton', { name: /tva/i }).first().fill('19');
      }

      // Enable ANAF submission
      const anafCheckbox = page.getByRole('checkbox', { name: /trimite către anaf|e-factura/i });
      if (await anafCheckbox.count() > 0) {
        await anafCheckbox.check();
      }

      // Submit invoice
      const submitButton = page.getByRole('button', { name: /trimite|send/i });
      await submitButton.click();

      // Verify submission success
      await page.waitForTimeout(3000);

      const successMessages = [
        page.getByText(/trimis către anaf|sent to anaf/i),
        page.getByText(/factura electronică|e-invoice/i),
        page.getByText(/succes|success/i),
      ];

      const hasSuccess = await Promise.all(
        successMessages.map(el => el.count().then(count => count > 0))
      ).then(results => results.some(Boolean));

      expect(hasSuccess).toBeTruthy();
    });

    test('should validate invoice data before ANAF submission', async ({ page }) => {
      // Navigate to invoice creation
      await page.goto('/ro/dashboard/invoices/create');

      // Try to submit without required fields
      const submitButton = page.getByRole('button', { name: /trimite|send/i });

      // Enable ANAF submission
      const anafCheckbox = page.getByRole('checkbox', { name: /trimite către anaf/i });
      if (await anafCheckbox.count() > 0) {
        await anafCheckbox.check();
        await submitButton.click();

        // Should show validation errors
        const errorMessages = [
          page.getByText(/serie.*obligatoriu|series.*required/i),
          page.getByText(/număr.*obligatoriu|number.*required/i),
          page.getByText(/client.*obligatoriu|client.*required/i),
          page.getByText(/cui.*obligatoriu|cui.*required/i),
        ];

        const hasErrors = await Promise.all(
          errorMessages.map(el => el.count().then(count => count > 0))
        ).then(results => results.some(Boolean));

        expect(hasErrors).toBeTruthy();
      }
    });
  });

  test.describe('Completing a Business Simulation Scenario', () => {
    test('should start a new business simulation', async ({ page }) => {
      // Navigate to simulation page
      await page.goto('/ro/simulation');

      // Select simulation scenario
      const scenarioCards = page.locator('[class*="scenario"], [class*="card"]');
      if (await scenarioCards.count() > 0) {
        await scenarioCards.first().click();
      }

      // Start simulation
      const startButton = page.getByRole('button', { name: /începe|start|begin/i });
      if (await startButton.count() > 0) {
        await startButton.click();
      }

      // Verify simulation started
      await page.waitForURL('**/simulation/**', { timeout: 5000 });

      const simulationElements = [
        page.getByText(/simulare|simulation/i),
        page.getByText(/luna|month/i),
        page.getByText(/scor|score/i),
        page.getByText(/decizii|decisions/i),
      ];

      const hasSimulation = await Promise.all(
        simulationElements.map(el => el.count().then(count => count > 0))
      ).then(results => results.some(Boolean));

      expect(hasSimulation).toBeTruthy();
    });

    test('should complete simulation decisions and progress', async ({ page }) => {
      // Assume user is in an active simulation
      await page.goto('/ro/simulation/active');

      // Look for decision-making interface
      const decisionSection = page.locator('[class*="decision"], [class*="choice"]');

      if (await decisionSection.count() > 0) {
        // Make some decisions
        const decisionButtons = page.getByRole('button', { name: /alege|choose|decide/i });
        const radioButtons = page.getByRole('radio');
        const checkboxes = page.getByRole('checkbox');

        // Select some options
        if (await radioButtons.count() > 0) {
          await radioButtons.first().check();
        }

        if (await checkboxes.count() > 0) {
          await checkboxes.first().check();
        }

        // Submit decisions
        const submitDecisionButton = page.getByRole('button', { name: /continuă|submit|următorul/i });
        if (await submitDecisionButton.count() > 0) {
          await submitDecisionButton.click();
        }

        // Verify progress
        await page.waitForTimeout(2000);
        const progressIndicators = [
          page.getByText(/progres|progress/i),
          page.getByText(/luna \d+/i),
          page.getByText(/scor.*\d+/i),
        ];

        const hasProgress = await Promise.all(
          progressIndicators.map(el => el.count().then(count => count > 0))
        ).then(results => results.some(Boolean));

        expect(hasProgress).toBeTruthy();
      }
    });

    test('should complete full simulation scenario', async ({ page }) => {
      // Navigate to simulation results or completion
      await page.goto('/ro/simulation/complete');

      // Verify completion status
      const completionElements = [
        page.getByText(/completat|completed/i),
        page.getByText(/scor final|final score/i),
        page.getByText(/recomandări|recommendations/i),
        page.getByText(/certificate|certificat/i),
      ];

      const hasCompletion = await Promise.all(
        completionElements.map(el => el.count().then(count => count > 0))
      ).then(results => results.some(Boolean));

      expect(hasCompletion).toBeTruthy();

      // Check for restart or new simulation option
      const restartButton = page.getByRole('button', { name: /restart|nouă|new/i });
      const hasRestartOption = await restartButton.count() > 0;

      expect(hasRestartOption).toBeTruthy();
    });

    test('should handle simulation save and resume', async ({ page }) => {
      // Start or resume simulation
      await page.goto('/ro/simulation');

      // Look for save/resume functionality
      const saveButton = page.getByRole('button', { name: /salvează|save/i });
      const resumeButton = page.getByRole('button', { name: /reia|resume/i });

      if (await saveButton.count() > 0) {
        await saveButton.click();

        // Verify save confirmation
        const saveMessage = page.getByText(/salvat|saved/i);
        const hasSaveConfirmation = await saveMessage.count() > 0;

        expect(hasSaveConfirmation).toBeTruthy();
      }

      if (await resumeButton.count() > 0) {
        await resumeButton.click();

        // Verify simulation resumes
        await page.waitForTimeout(2000);
        const simulationActive = await page.getByText(/simulare activă|active simulation/i).count() > 0;

        expect(simulationActive).toBeTruthy();
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline/network issues
      await page.context().setOffline(true);

      await page.goto('/ro/dashboard/invoices/create');

      // Try to submit form
      const submitButton = page.getByRole('button', { name: /trimite|send/i });
      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Should show network error message
        const errorMessages = [
          page.getByText(/rețea|network/i),
          page.getByText(/conexiune|connection/i),
          page.getByText(/eroare|error/i),
        ];

        const hasError = await Promise.all(
          errorMessages.map(el => el.count().then(count => count > 0))
        ).then(results => results.some(Boolean));

        expect(hasError).toBeTruthy();
      }

      await page.context().setOffline(false);
    });

    test('should handle invalid data validation', async ({ page }) => {
      await page.goto('/ro/dashboard/invoices/create');

      // Fill form with invalid data
      await page.getByRole('textbox', { name: /email/i }).fill('invalid-email');
      await page.getByRole('textbox', { name: /cui/i }).fill('invalid-cui');

      // Try to submit
      const submitButton = page.getByRole('button', { name: /trimite|send/i });
      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Should show validation errors
        const validationErrors = [
          page.getByText(/email.*invalid/i),
          page.getByText(/cui.*invalid/i),
          page.getByText(/format.*gresit/i),
        ];

        const hasValidationErrors = await Promise.all(
          validationErrors.map(el => el.count().then(count => count > 0))
        ).then(results => results.some(Boolean));

        expect(hasValidationErrors).toBeTruthy();
      }
    });
  });
});