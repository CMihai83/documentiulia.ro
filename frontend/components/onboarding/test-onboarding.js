/**
 * Onboarding Wizard - Browser Console Test Script
 *
 * Copy and paste this script into the browser console to test the onboarding wizard.
 * This script provides utilities for testing and debugging the onboarding flow.
 */

const OnboardingTestUtils = {
  /**
   * Reset onboarding to initial state
   */
  reset() {
    localStorage.removeItem('onboarding_complete');
    localStorage.removeItem('onboarding_data');
    console.log('✅ Onboarding reset successfully');
    console.log('🔄 Reload the page to see the onboarding wizard');
  },

  /**
   * Mark onboarding as complete
   */
  complete() {
    localStorage.setItem('onboarding_complete', 'true');
    console.log('✅ Onboarding marked as complete');
    console.log('🔄 Reload the page to see the dashboard');
  },

  /**
   * Check current onboarding status
   */
  status() {
    const isComplete = localStorage.getItem('onboarding_complete') === 'true';
    const data = localStorage.getItem('onboarding_data');

    console.log('📊 Onboarding Status:');
    console.log('  Complete:', isComplete ? '✅ Yes' : '❌ No');

    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log('  Current Step:', parsed.currentStep);
        console.log('  Completed Steps:', parsed.completedSteps);
        console.log('  User Name:', parsed.userName || '(not set)');
        console.log('  Company Name:', parsed.companyData?.name || '(not set)');
        console.log('  Modules:', Object.entries(parsed.modules || {})
          .filter(([_, enabled]) => enabled)
          .map(([module]) => module)
          .join(', ') || '(none)');
        console.log('  Integrations:', Object.entries(parsed.integrations || {})
          .filter(([_, enabled]) => enabled)
          .map(([integration]) => integration)
          .join(', ') || '(none)');
      } catch (e) {
        console.error('❌ Error parsing onboarding data:', e);
      }
    } else {
      console.log('  Data:', '(none stored)');
    }
  },

  /**
   * View complete onboarding data
   */
  viewData() {
    const data = localStorage.getItem('onboarding_data');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log('📦 Complete Onboarding Data:');
        console.table(parsed);
        return parsed;
      } catch (e) {
        console.error('❌ Error parsing onboarding data:', e);
      }
    } else {
      console.log('ℹ️  No onboarding data stored');
    }
  },

  /**
   * Set fake onboarding data for testing
   */
  setTestData() {
    const testData = {
      currentStep: 'module-selection',
      completedSteps: ['welcome', 'company-setup'],
      userName: 'Test User',
      companyData: {
        name: 'Test Company SRL',
        cui: 'RO12345678',
        industry: 'it',
        address: 'Str. Test nr. 1',
        city: 'București',
        county: 'Ilfov',
        postalCode: '012345',
        phone: '+40 700 000 000',
        email: 'test@company.ro'
      },
      modules: {
        finance: true,
        hr: true,
        warehouse: false,
        procurement: false,
        crm: false,
        logistics: false,
        quality: false,
        hse: false
      },
      integrations: {
        anaf: false,
        saga: false,
        bank: false,
        efactura: false
      },
      isComplete: false
    };

    localStorage.setItem('onboarding_data', JSON.stringify(testData));
    localStorage.removeItem('onboarding_complete');
    console.log('✅ Test data set successfully');
    console.log('🔄 Reload the page to continue from step 3 (Module Selection)');
  },

  /**
   * Skip to specific step
   */
  skipToStep(stepName) {
    const validSteps = ['welcome', 'company-setup', 'module-selection', 'integrations', 'completion'];

    if (!validSteps.includes(stepName)) {
      console.error('❌ Invalid step. Valid steps:', validSteps.join(', '));
      return;
    }

    const stepIndex = validSteps.indexOf(stepName);
    const completedSteps = validSteps.slice(0, stepIndex);

    const data = {
      currentStep: stepName,
      completedSteps: completedSteps,
      userName: 'Test User',
      companyData: {
        name: 'Test Company SRL',
        cui: 'RO12345678',
        industry: 'it'
      },
      modules: {
        finance: true,
        hr: false,
        warehouse: false,
        procurement: false,
        crm: false,
        logistics: false,
        quality: false,
        hse: false
      },
      integrations: {
        anaf: false,
        saga: false,
        bank: false,
        efactura: false
      },
      isComplete: false
    };

    localStorage.setItem('onboarding_data', JSON.stringify(data));
    localStorage.removeItem('onboarding_complete');
    console.log(`✅ Skipped to step: ${stepName}`);
    console.log('🔄 Reload the page to see the selected step');
  },

  /**
   * Test all steps sequentially
   */
  testAllSteps() {
    console.log('🧪 Testing all onboarding steps...');
    console.log('');

    const steps = ['welcome', 'company-setup', 'module-selection', 'integrations', 'completion'];

    steps.forEach((step, index) => {
      console.log(`Step ${index + 1}: ${step}`);
      console.log(`  Run: OnboardingTestUtils.skipToStep('${step}')`);
    });

    console.log('');
    console.log('💡 Tip: After each reload, inspect the UI and then run the next step');
  },

  /**
   * Clear all localStorage (nuclear option)
   */
  clearAll() {
    const confirm = window.confirm('⚠️  This will clear ALL localStorage data. Continue?');
    if (confirm) {
      localStorage.clear();
      console.log('✅ All localStorage cleared');
      console.log('🔄 Reload the page');
    }
  },

  /**
   * Export onboarding data as JSON
   */
  export() {
    const data = localStorage.getItem('onboarding_data');
    if (data) {
      console.log('📤 Onboarding Data (copy this):');
      console.log(data);
      return JSON.parse(data);
    } else {
      console.log('ℹ️  No onboarding data to export');
    }
  },

  /**
   * Import onboarding data from JSON
   */
  import(jsonString) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      localStorage.setItem('onboarding_data', JSON.stringify(data));
      console.log('✅ Data imported successfully');
      console.log('🔄 Reload the page to see the imported state');
    } catch (e) {
      console.error('❌ Error importing data:', e);
    }
  },

  /**
   * Show help
   */
  help() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║         Onboarding Wizard Test Utilities - Help              ║
╚══════════════════════════════════════════════════════════════╝

Available Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  OnboardingTestUtils.reset()
    Reset onboarding to initial state (force show wizard)

  OnboardingTestUtils.complete()
    Mark onboarding as complete (force show dashboard)

  OnboardingTestUtils.status()
    Check current onboarding status and data

  OnboardingTestUtils.viewData()
    View complete onboarding data in table format

  OnboardingTestUtils.setTestData()
    Set realistic test data and skip to module selection

  OnboardingTestUtils.skipToStep(stepName)
    Skip to specific step (welcome, company-setup,
    module-selection, integrations, completion)
    Example: OnboardingTestUtils.skipToStep('completion')

  OnboardingTestUtils.testAllSteps()
    Show instructions for testing all steps sequentially

  OnboardingTestUtils.export()
    Export current onboarding data as JSON

  OnboardingTestUtils.import(jsonData)
    Import onboarding data from JSON string or object

  OnboardingTestUtils.clearAll()
    Clear ALL localStorage data (requires confirmation)

  OnboardingTestUtils.help()
    Show this help message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quick Start:
  1. OnboardingTestUtils.reset()    - Reset to see wizard
  2. OnboardingTestUtils.status()   - Check current state
  3. OnboardingTestUtils.complete() - Skip to dashboard

Testing Specific Steps:
  OnboardingTestUtils.skipToStep('company-setup')
  OnboardingTestUtils.skipToStep('integrations')
  OnboardingTestUtils.skipToStep('completion')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }
};

// Auto-run help on load
OnboardingTestUtils.help();

// Make available globally
window.OnboardingTestUtils = OnboardingTestUtils;

console.log('✅ OnboardingTestUtils loaded');
console.log('💡 Type OnboardingTestUtils.help() for available commands');
