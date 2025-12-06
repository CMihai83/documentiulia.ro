#!/usr/bin/env php
<?php
/**
 * Advanced Accounting Module API Test Suite
 *
 * Tests all endpoints for:
 * - Chart of Accounts (hierarchical)
 * - Journal Entries (double-entry bookkeeping)
 * - Fixed Assets (with depreciation)
 * - Tax Codes (VAT management)
 * - Financial Reports (trial balance, balance sheet, P&L, cash flow)
 *
 * Run: php tests/advanced_accounting_api_test_suite.php
 */

class AdvancedAccountingAPITest {
    private $baseUrl = 'http://127.0.0.1/api/v1';
    private $token;
    private $companyId;
    private $testResults = [];
    private $createdResources = [
        'accounts' => [],
        'journal_entries' => [],
        'assets' => [],
        'tax_codes' => []
    ];

    public function __construct() {
        echo "\n" . str_repeat("=", 80) . "\n";
        echo "🧪 ADVANCED ACCOUNTING MODULE API TEST SUITE\n";
        echo str_repeat("=", 80) . "\n\n";
    }

    /**
     * Run all tests
     */
    public function runAllTests() {
        $this->authenticate();

        // Chart of Accounts Tests
        $this->testCreateAccount();
        $this->testCreateAccountWithParent();
        $this->testListAccounts();
        $this->testGetSingleAccount();
        $this->testAccountHierarchy();
        $this->testUpdateAccount();

        // Journal Entry Tests
        $this->testCreateJournalEntry();
        $this->testCreateUnbalancedEntry();
        $this->testPostJournalEntry();
        $this->testListJournalEntries();
        $this->testGetSingleJournalEntry();

        // Fixed Asset Tests
        $this->testCreateFixedAsset();
        $this->testCalculateStraightLineDepreciation();
        $this->testCalculateDecliningBalanceDepreciation();
        $this->testListFixedAssets();

        // Tax Code Tests
        $this->testCreateTaxCode();
        $this->testListTaxCodes();
        $this->testFilterActiveTaxCodes();

        // Financial Reports Tests
        $this->testGetTrialBalance();
        $this->testGetBalanceSheet();
        $this->testGetIncomeStatement();
        $this->testGetCashFlowStatement();

        // Error Handling Tests
        $this->testUnauthorizedAccess();
        $this->testMissingCompanyContext();

        $this->printSummary();
    }

    /**
     * Authenticate and get token
     */
    private function authenticate() {
        echo "🔐 Authenticating...\n";

        $response = $this->makeRequest('POST', '/auth/login.php', [
            'email' => 'test_admin@accountech.com',
            'password' => 'TestPass123!'
        ], false);

        if ($response['success'] ?? false) {
            $this->token = $response['data']['token'];
            $this->companyId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
            echo "✅ Authentication successful\n\n";
        } else {
            die("❌ Authentication failed: " . ($response['message'] ?? 'Unknown error') . "\n");
        }
    }

    // ==================== CHART OF ACCOUNTS TESTS ====================

    /**
     * Test 1: Create account
     */
    private function testCreateAccount() {
        $this->test(
            "Create Account - Cash Account",
            'POST',
            '/accounting/chart-of-accounts.php',
            [
                'code' => '1010',
                'name' => 'Cash and Cash Equivalents',
                'account_type' => 'asset',
                'normal_balance' => 'debit',
                'is_active' => true
            ],
            function($response) {
                return isset($response['data']['account_id']) &&
                       $response['success'] === true;
            }
        );

        if (end($this->testResults)['passed']) {
            $this->createdResources['accounts'][] = end($this->testResults)['response']['data']['account_id'];
        }
    }

    /**
     * Test 2: Create account with parent
     */
    private function testCreateAccountWithParent() {
        $parentAccountId = $this->createdResources['accounts'][0] ?? null;

        $this->test(
            "Create Sub-Account - Petty Cash",
            'POST',
            '/accounting/chart-of-accounts.php',
            [
                'code' => '1011',
                'name' => 'Petty Cash',
                'account_type' => 'asset',
                'normal_balance' => 'debit',
                'parent_account_id' => $parentAccountId,
                'is_active' => true
            ],
            function($response) {
                return isset($response['data']['account_id']) &&
                       $response['data']['account']['level'] === 2;
            }
        );

        if (end($this->testResults)['passed']) {
            $this->createdResources['accounts'][] = end($this->testResults)['response']['data']['account_id'];
        }
    }

    /**
     * Test 3: List accounts
     */
    private function testListAccounts() {
        $this->test(
            "List All Accounts",
            'GET',
            '/accounting/chart-of-accounts.php',
            null,
            function($response) {
                return isset($response['data']['accounts']) &&
                       is_array($response['data']['accounts']) &&
                       $response['data']['count'] >= 2;
            }
        );
    }

    /**
     * Test 4: Get single account
     */
    private function testGetSingleAccount() {
        $accountId = $this->createdResources['accounts'][0] ?? null;

        $this->test(
            "Get Single Account",
            'GET',
            "/accounting/chart-of-accounts.php?id={$accountId}",
            null,
            function($response) {
                return isset($response['data']['account']['id']) &&
                       $response['data']['account']['code'] === '1010';
            }
        );
    }

    /**
     * Test 5: Account hierarchy
     */
    private function testAccountHierarchy() {
        $this->test(
            "Verify Account Hierarchy Structure",
            'GET',
            '/accounting/chart-of-accounts.php',
            null,
            function($response) {
                $accounts = $response['data']['accounts'] ?? [];
                // Check if parent accounts have children array
                foreach ($accounts as $account) {
                    if (isset($account['children']) && !empty($account['children'])) {
                        return true;
                    }
                }
                return false;
            }
        );
    }

    /**
     * Test 6: Update account
     */
    private function testUpdateAccount() {
        $accountId = $this->createdResources['accounts'][0] ?? null;

        $this->test(
            "Update Account Name",
            'PUT',
            '/accounting/chart-of-accounts.php',
            [
                'id' => $accountId,
                'name' => 'Cash and Cash Equivalents - Updated'
            ],
            function($response) {
                return $response['success'] === true;
            }
        );
    }

    // ==================== JOURNAL ENTRY TESTS ====================

    /**
     * Test 7: Create journal entry
     */
    private function testCreateJournalEntry() {
        $cashAccountId = $this->createdResources['accounts'][0] ?? null;

        // Create a revenue account first
        $revenueResponse = $this->makeRequest('POST', '/accounting/chart-of-accounts.php', [
            'code' => '4010',
            'name' => 'Service Revenue',
            'account_type' => 'revenue',
            'normal_balance' => 'credit',
            'is_active' => true
        ]);

        $revenueAccountId = $revenueResponse['data']['account_id'] ?? null;
        $this->createdResources['accounts'][] = $revenueAccountId;

        $this->test(
            "Create Balanced Journal Entry",
            'POST',
            '/accounting/journal-entries.php',
            [
                'entry_date' => date('Y-m-d'),
                'description' => 'Initial revenue entry',
                'entry_type' => 'manual',
                'lines' => [
                    [
                        'account_id' => $cashAccountId,
                        'line_type' => 'debit',
                        'amount' => 1000.00,
                        'description' => 'Cash received'
                    ],
                    [
                        'account_id' => $revenueAccountId,
                        'line_type' => 'credit',
                        'amount' => 1000.00,
                        'description' => 'Service revenue'
                    ]
                ]
            ],
            function($response) {
                return isset($response['data']['entry_id']) &&
                       $response['success'] === true;
            }
        );

        if (end($this->testResults)['passed']) {
            $this->createdResources['journal_entries'][] = end($this->testResults)['response']['data']['entry_id'];
        }
    }

    /**
     * Test 8: Create unbalanced entry (should fail)
     */
    private function testCreateUnbalancedEntry() {
        $cashAccountId = $this->createdResources['accounts'][0] ?? null;
        $revenueAccountId = $this->createdResources['accounts'][2] ?? null;

        $this->test(
            "Reject Unbalanced Journal Entry",
            'POST',
            '/accounting/journal-entries.php',
            [
                'entry_date' => date('Y-m-d'),
                'description' => 'Unbalanced entry',
                'entry_type' => 'manual',
                'lines' => [
                    [
                        'account_id' => $cashAccountId,
                        'line_type' => 'debit',
                        'amount' => 1000.00,
                        'description' => 'Cash received'
                    ],
                    [
                        'account_id' => $revenueAccountId,
                        'line_type' => 'credit',
                        'amount' => 900.00,
                        'description' => 'Service revenue'
                    ]
                ]
            ],
            function($response) {
                // Should fail with error message about unbalanced entry
                return $response['success'] === false &&
                       stripos($response['message'], 'balanced') !== false;
            }
        );
    }

    /**
     * Test 9: Post journal entry
     */
    private function testPostJournalEntry() {
        $entryId = $this->createdResources['journal_entries'][0] ?? null;

        $this->test(
            "Post Journal Entry (Make Permanent)",
            'POST',
            '/accounting/journal-entries.php?action=post',
            [
                'entry_id' => $entryId
            ],
            function($response) {
                return $response['success'] === true;
            }
        );
    }

    /**
     * Test 10: List journal entries
     */
    private function testListJournalEntries() {
        $this->test(
            "List All Journal Entries",
            'GET',
            '/accounting/journal-entries.php',
            null,
            function($response) {
                return isset($response['data']['entries']) &&
                       is_array($response['data']['entries']) &&
                       $response['data']['count'] >= 1;
            }
        );
    }

    /**
     * Test 11: Get single journal entry
     */
    private function testGetSingleJournalEntry() {
        $entryId = $this->createdResources['journal_entries'][0] ?? null;

        $this->test(
            "Get Single Journal Entry with Lines",
            'GET',
            "/accounting/journal-entries.php?id={$entryId}",
            null,
            function($response) {
                return isset($response['data']['entry']['id']) &&
                       isset($response['data']['entry']['lines']) &&
                       count($response['data']['entry']['lines']) >= 2;
            }
        );
    }

    // ==================== FIXED ASSET TESTS ====================

    /**
     * Test 12: Create fixed asset
     */
    private function testCreateFixedAsset() {
        $this->test(
            "Create Fixed Asset - Computer Equipment",
            'POST',
            '/accounting/fixed-assets.php',
            [
                'asset_name' => 'Dell Laptop',
                'asset_number' => 'COMP-001',
                'category' => 'computer_equipment',
                'acquisition_date' => '2025-01-01',
                'acquisition_cost' => 5000.00,
                'salvage_value' => 500.00,
                'useful_life_years' => 5,
                'depreciation_method' => 'straight_line',
                'status' => 'active'
            ],
            function($response) {
                return isset($response['data']['asset_id']) &&
                       $response['success'] === true;
            }
        );

        if (end($this->testResults)['passed']) {
            $this->createdResources['assets'][] = end($this->testResults)['response']['data']['asset_id'];
        }
    }

    /**
     * Test 13: Calculate straight-line depreciation
     */
    private function testCalculateStraightLineDepreciation() {
        $assetId = $this->createdResources['assets'][0] ?? null;

        $this->test(
            "Calculate Straight-Line Depreciation",
            'POST',
            '/accounting/fixed-assets.php?action=depreciate',
            [
                'asset_id' => $assetId,
                'period_date' => '2025-01-31'
            ],
            function($response) {
                // ($5000 - $500) / (5 * 12) = $75/month
                $expectedMonthly = 75.00;
                return isset($response['data']['depreciation']['depreciation_amount']) &&
                       abs($response['data']['depreciation']['depreciation_amount'] - $expectedMonthly) < 0.01;
            }
        );
    }

    /**
     * Test 14: Calculate declining balance depreciation
     */
    private function testCalculateDecliningBalanceDepreciation() {
        // Create asset with declining balance method
        $response = $this->makeRequest('POST', '/accounting/fixed-assets.php', [
            'asset_name' => 'Manufacturing Equipment',
            'asset_number' => 'EQUIP-001',
            'category' => 'machinery',
            'acquisition_date' => '2025-01-01',
            'acquisition_cost' => 10000.00,
            'salvage_value' => 1000.00,
            'useful_life_years' => 5,
            'depreciation_method' => 'double_declining',
            'status' => 'active'
        ]);

        $assetId = $response['data']['asset_id'] ?? null;
        $this->createdResources['assets'][] = $assetId;

        $this->test(
            "Calculate Double-Declining Depreciation",
            'POST',
            '/accounting/fixed-assets.php?action=depreciate',
            [
                'asset_id' => $assetId,
                'period_date' => '2025-01-31'
            ],
            function($response) {
                // Double declining: (2 / 5) = 40% annual, 3.33% monthly
                // First month: $10000 * 0.0333 = $333.33
                return isset($response['data']['depreciation']['depreciation_amount']) &&
                       $response['data']['depreciation']['depreciation_amount'] > 300 &&
                       $response['data']['depreciation']['depreciation_amount'] < 350;
            }
        );
    }

    /**
     * Test 15: List fixed assets
     */
    private function testListFixedAssets() {
        $this->test(
            "List All Fixed Assets",
            'GET',
            '/accounting/fixed-assets.php',
            null,
            function($response) {
                return isset($response['data']['assets']) &&
                       is_array($response['data']['assets']) &&
                       $response['data']['count'] >= 2;
            }
        );
    }

    // ==================== TAX CODE TESTS ====================

    /**
     * Test 16: Create tax code
     */
    private function testCreateTaxCode() {
        $this->test(
            "Create Tax Code - Standard VAT 19%",
            'POST',
            '/accounting/tax-codes.php',
            [
                'code' => 'VAT_19',
                'name' => 'Standard VAT Rate',
                'tax_type' => 'vat',
                'rate' => 19.00,
                'is_included_in_price' => false,
                'is_active' => true,
                'description' => 'Standard VAT rate for Romania'
            ],
            function($response) {
                return isset($response['data']['tax_code_id']) &&
                       $response['success'] === true;
            }
        );

        if (end($this->testResults)['passed']) {
            $this->createdResources['tax_codes'][] = end($this->testResults)['response']['data']['tax_code_id'];
        }
    }

    /**
     * Test 17: List tax codes
     */
    private function testListTaxCodes() {
        $this->test(
            "List All Tax Codes",
            'GET',
            '/accounting/tax-codes.php',
            null,
            function($response) {
                return isset($response['data']['tax_codes']) &&
                       is_array($response['data']['tax_codes']) &&
                       $response['data']['count'] >= 1;
            }
        );
    }

    /**
     * Test 18: Filter active tax codes
     */
    private function testFilterActiveTaxCodes() {
        $this->test(
            "Filter Active Tax Codes Only",
            'GET',
            '/accounting/tax-codes.php?is_active=true',
            null,
            function($response) {
                $taxCodes = $response['data']['tax_codes'] ?? [];
                foreach ($taxCodes as $code) {
                    if (!$code['is_active']) {
                        return false;
                    }
                }
                return count($taxCodes) >= 1;
            }
        );
    }

    // ==================== FINANCIAL REPORTS TESTS ====================

    /**
     * Test 19: Get trial balance
     */
    private function testGetTrialBalance() {
        $this->test(
            "Generate Trial Balance Report",
            'GET',
            '/accounting/reports.php?type=trial_balance',
            null,
            function($response) {
                return isset($response['data']['report_data']) &&
                       is_array($response['data']['report_data']) &&
                       $response['data']['report_type'] === 'trial_balance';
            }
        );
    }

    /**
     * Test 20: Get balance sheet
     */
    private function testGetBalanceSheet() {
        $this->test(
            "Generate Balance Sheet",
            'GET',
            '/accounting/reports.php?type=balance_sheet&as_of_date=' . date('Y-m-d'),
            null,
            function($response) {
                return isset($response['data']['report_data']) &&
                       $response['data']['report_type'] === 'balance_sheet' &&
                       isset($response['data']['parameters']['as_of_date']);
            }
        );
    }

    /**
     * Test 21: Get income statement
     */
    private function testGetIncomeStatement() {
        $startDate = date('Y-m-01');
        $endDate = date('Y-m-t');

        $this->test(
            "Generate Income Statement (P&L)",
            'GET',
            "/accounting/reports.php?type=income_statement&start_date={$startDate}&end_date={$endDate}",
            null,
            function($response) {
                return isset($response['data']['report_data']) &&
                       in_array($response['data']['report_type'], ['income_statement', 'profit_loss']) &&
                       isset($response['data']['parameters']['start_date']);
            }
        );
    }

    /**
     * Test 22: Get cash flow statement
     */
    private function testGetCashFlowStatement() {
        $startDate = date('Y-m-01');
        $endDate = date('Y-m-t');

        $this->test(
            "Generate Cash Flow Statement",
            'GET',
            "/accounting/reports.php?type=cash_flow&start_date={$startDate}&end_date={$endDate}",
            null,
            function($response) {
                return isset($response['data']['report_data']) &&
                       $response['data']['report_type'] === 'cash_flow' &&
                       isset($response['data']['parameters']['start_date']);
            }
        );
    }

    // ==================== ERROR HANDLING TESTS ====================

    /**
     * Test 23: Unauthorized access
     */
    private function testUnauthorizedAccess() {
        echo "📋 Test 23: Unauthorized Access\n";

        $ch = curl_init("{$this->baseUrl}/accounting/chart-of-accounts.php");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Host: documentiulia.ro'
            ]
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $response = json_decode($result, true);
        $passed = $response['success'] === false &&
                  $httpCode === 400 &&
                  stripos($response['message'], 'token') !== false;

        $this->testResults[] = [
            'name' => "Unauthorized Access",
            'passed' => $passed,
            'response' => $response
        ];

        echo $passed ? "   ✅ PASSED\n" : "   ❌ FAILED\n";
        echo "   HTTP Code: $httpCode\n\n";
    }

    /**
     * Test 24: Missing company context
     */
    private function testMissingCompanyContext() {
        echo "📋 Test 24: Missing Company Context\n";

        $ch = curl_init("{$this->baseUrl}/accounting/chart-of-accounts.php");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->token,
                'Host: documentiulia.ro'
            ]
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $response = json_decode($result, true);
        $passed = $response['success'] === false &&
                  stripos($response['message'], 'company') !== false;

        $this->testResults[] = [
            'name' => "Missing Company Context",
            'passed' => $passed,
            'response' => $response
        ];

        echo $passed ? "   ✅ PASSED\n" : "   ❌ FAILED\n";
        echo "   Message: " . ($response['message'] ?? 'N/A') . "\n\n";
    }

    // ==================== HELPER METHODS ====================

    /**
     * Make API request
     */
    private function makeRequest($method, $endpoint, $data = null, $includeAuth = true) {
        $url = $this->baseUrl . $endpoint;

        $ch = curl_init();

        $headers = [
            'Content-Type: application/json',
            'Host: documentiulia.ro'
        ];

        if ($includeAuth && $this->token) {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }

        if ($includeAuth && $this->companyId) {
            $headers[] = 'X-Company-ID: ' . $this->companyId;
        }

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CUSTOMREQUEST => $method
        ]);

        if ($data !== null && in_array($method, ['POST', 'PUT'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $result = curl_exec($ch);
        curl_close($ch);

        return json_decode($result, true) ?? [];
    }

    /**
     * Run a single test
     */
    private function test($name, $method, $endpoint, $data, $validator) {
        echo "📋 Test " . (count($this->testResults) + 1) . ": $name\n";

        $response = $this->makeRequest($method, $endpoint, $data);
        $passed = $validator($response);

        $this->testResults[] = [
            'name' => $name,
            'passed' => $passed,
            'response' => $response
        ];

        echo $passed ? "   ✅ PASSED\n" : "   ❌ FAILED\n";
        if (!$passed) {
            echo "   Response: " . json_encode($response, JSON_PRETTY_PRINT) . "\n";
        }
        echo "\n";
    }

    /**
     * Print test summary
     */
    private function printSummary() {
        $total = count($this->testResults);
        $passed = count(array_filter($this->testResults, fn($r) => $r['passed']));
        $failed = $total - $passed;
        $percentage = $total > 0 ? round(($passed / $total) * 100, 1) : 0;

        echo str_repeat("=", 80) . "\n";
        echo "📊 TEST SUMMARY\n";
        echo str_repeat("=", 80) . "\n\n";

        echo "Total Tests:    $total\n";
        echo "✅ Passed:      $passed\n";
        echo "❌ Failed:      $failed\n";
        echo "Success Rate:   $percentage%\n\n";

        if ($failed > 0) {
            echo "Failed Tests:\n";
            foreach ($this->testResults as $i => $result) {
                if (!$result['passed']) {
                    echo "  - Test " . ($i + 1) . ": " . $result['name'] . "\n";
                }
            }
            echo "\n";
        }

        echo str_repeat("=", 80) . "\n";

        if ($percentage >= 95) {
            echo "🎉 EXCELLENT! All tests passed successfully!\n";
        } elseif ($percentage >= 80) {
            echo "✅ GOOD! Most tests passed. Review failed tests.\n";
        } else {
            echo "⚠️  WARNING! Multiple test failures detected. Review implementation.\n";
        }

        echo str_repeat("=", 80) . "\n\n";
    }
}

// Run tests
$tester = new AdvancedAccountingAPITest();
$tester->runAllTests();
