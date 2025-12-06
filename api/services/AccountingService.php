<?php
/**
 * Advanced Accounting Service - Enterprise Edition
 *
 * Comprehensive double-entry bookkeeping system with:
 * - Chart of accounts management
 * - Journal entries (double-entry)
 * - Bank reconciliation
 * - Multi-currency support
 * - Fixed assets & depreciation
 * - Tax management
 * - Financial statements (Trial Balance, Balance Sheet, P&L)
 *
 * @version 1.0.0
 * @author DocumentiUlia Enterprise Suite
 */

require_once __DIR__ . '/../config/database.php';

class AccountingService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    // ==================== CHART OF ACCOUNTS ====================

    /**
     * List chart of accounts with hierarchical structure
     */
    public function listChartOfAccounts($companyId, $filters = []) {
        $conditions = ['company_id = $1'];
        $params = [$companyId];
        $paramCount = 1;

        if (!empty($filters['account_type'])) {
            $paramCount++;
            $conditions[] = "account_type = $$paramCount";
            $params[] = $filters['account_type'];
        }

        if (isset($filters['is_active'])) {
            $paramCount++;
            $conditions[] = "is_active = $$paramCount";
            $params[] = $filters['is_active'];
        }

        if (!empty($filters['search'])) {
            $paramCount++;
            $conditions[] = "(code ILIKE $$paramCount OR name ILIKE $$paramCount)";
            $params[] = '%' . $filters['search'] . '%';
        }

        $whereClause = implode(' AND ', $conditions);

        $accounts = $this->db->fetchAll(
            "SELECT * FROM chart_of_accounts
             WHERE $whereClause
             ORDER BY code",
            $params
        );

        return $this->buildAccountHierarchy($accounts);
    }

    /**
     * Build hierarchical tree structure from flat account list
     */
    private function buildAccountHierarchy($accounts) {
        $tree = [];
        $indexed = [];

        // Index by ID
        foreach ($accounts as $account) {
            $account['children'] = [];
            $indexed[$account['id']] = $account;
        }

        // Build tree
        foreach ($indexed as $id => $account) {
            if ($account['parent_account_id']) {
                if (isset($indexed[$account['parent_account_id']])) {
                    $indexed[$account['parent_account_id']]['children'][] = &$indexed[$id];
                }
            } else {
                $tree[] = &$indexed[$id];
            }
        }

        return $tree;
    }

    /**
     * Get single account
     */
    public function getAccount($accountId, $companyId) {
        $account = $this->db->fetchOne(
            "SELECT * FROM chart_of_accounts
             WHERE id = $1 AND company_id = $2",
            [$accountId, $companyId]
        );

        if (!$account) {
            throw new Exception('Account not found');
        }

        // Get balance
        $balance = $this->db->fetchOne(
            "SELECT * FROM account_balances
             WHERE account_id = $1 AND company_id = $2",
            [$accountId, $companyId]
        );

        $account['balance'] = $balance ?? null;

        return $account;
    }

    /**
     * Create account
     */
    public function createAccount($companyId, $data) {
        if (empty($data['code']) || empty($data['name'])) {
            throw new Exception('Account code and name are required');
        }

        // Determine normal balance based on account type
        $normalBalance = $this->getNormalBalance($data['account_type'] ?? 'asset');

        $result = $this->db->fetchOne(
            "INSERT INTO chart_of_accounts (
                company_id, code, name, description, account_type, account_subtype,
                normal_balance, parent_account_id, level, is_active, allow_manual_entries,
                require_reconciliation, tags, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id",
            [
                $companyId,
                $data['code'],
                $data['name'],
                $data['description'] ?? null,
                $data['account_type'] ?? 'asset',
                $data['account_subtype'] ?? null,
                $data['normal_balance'] ?? $normalBalance,
                $data['parent_account_id'] ?? null,
                $data['level'] ?? 1,
                $data['is_active'] ?? true,
                $data['allow_manual_entries'] ?? true,
                $data['require_reconciliation'] ?? false,
                isset($data['tags']) ? '{' . implode(',', $data['tags']) . '}' : null,
                isset($data['metadata']) ? json_encode($data['metadata']) : null
            ]
        );

        return $result['id'];
    }

    /**
     * Get normal balance for account type
     */
    private function getNormalBalance($accountType) {
        $normalBalances = [
            'asset' => 'debit',
            'expense' => 'debit',
            'liability' => 'credit',
            'equity' => 'credit',
            'revenue' => 'credit'
        ];
        return $normalBalances[$accountType] ?? 'debit';
    }

    // ==================== JOURNAL ENTRIES ====================

    /**
     * List journal entries
     */
    public function listJournalEntries($companyId, $filters = []) {
        $conditions = ['company_id = $1'];
        $params = [$companyId];
        $paramCount = 1;

        if (!empty($filters['status'])) {
            $paramCount++;
            $conditions[] = "status = $$paramCount";
            $params[] = $filters['status'];
        }

        if (!empty($filters['entry_type'])) {
            $paramCount++;
            $conditions[] = "entry_type = $$paramCount";
            $params[] = $filters['entry_type'];
        }

        if (!empty($filters['start_date'])) {
            $paramCount++;
            $conditions[] = "posting_date >= $$paramCount";
            $params[] = $filters['start_date'];
        }

        if (!empty($filters['end_date'])) {
            $paramCount++;
            $conditions[] = "posting_date <= $$paramCount";
            $params[] = $filters['end_date'];
        }

        $whereClause = implode(' AND ', $conditions);
        $limit = $filters['limit'] ?? 100;
        $offset = $filters['offset'] ?? 0;

        $paramCount++;
        $params[] = $limit;
        $limitParam = $paramCount;

        $paramCount++;
        $params[] = $offset;
        $offsetParam = $paramCount;

        return $this->db->fetchAll(
            "SELECT je.*,
                    u.first_name || ' ' || u.last_name as created_by_name,
                    (SELECT SUM(amount) FROM journal_entry_lines WHERE journal_entry_id = je.id AND line_type = 'debit') as total_debits,
                    (SELECT SUM(amount) FROM journal_entry_lines WHERE journal_entry_id = je.id AND line_type = 'credit') as total_credits
             FROM journal_entries je
             LEFT JOIN users u ON je.created_by = u.id
             WHERE $whereClause
             ORDER BY je.posting_date DESC, je.created_at DESC
             LIMIT $$limitParam OFFSET $$offsetParam",
            $params
        );
    }

    /**
     * Get single journal entry with lines
     */
    public function getJournalEntry($entryId, $companyId) {
        $entry = $this->db->fetchOne(
            "SELECT * FROM journal_entries
             WHERE id = $1 AND company_id = $2",
            [$entryId, $companyId]
        );

        if (!$entry) {
            throw new Exception('Journal entry not found');
        }

        $entry['lines'] = $this->db->fetchAll(
            "SELECT jel.*,
                    a.code as account_code,
                    a.name as account_name
             FROM journal_entry_lines jel
             LEFT JOIN chart_of_accounts a ON jel.account_id = a.id
             WHERE jel.journal_entry_id = $1
             ORDER BY jel.line_type DESC, jel.amount DESC",
            [$entryId]
        );

        return $entry;
    }

    /**
     * Create journal entry (double-entry)
     */
    public function createJournalEntry($companyId, $userId, $data) {
        if (empty($data['lines']) || count($data['lines']) < 2) {
            throw new Exception('Journal entry must have at least 2 lines');
        }

        // Validate balance
        $debitTotal = 0;
        $creditTotal = 0;

        foreach ($data['lines'] as $line) {
            // Support both formats: {line_type, amount} and {debit, credit}
            if (isset($line['line_type'])) {
                if ($line['line_type'] === 'debit') {
                    $debitTotal += $line['amount'] ?? 0;
                } else {
                    $creditTotal += $line['amount'] ?? 0;
                }
            } else {
                $debitTotal += $line['debit'] ?? 0;
                $creditTotal += $line['credit'] ?? 0;
            }
        }

        if (abs($debitTotal - $creditTotal) > 0.01) {
            throw new Exception('Journal entry is not balanced: debits=' . $debitTotal . ', credits=' . $creditTotal);
        }

        // Create entry
        $entryDate = $data['entry_date'] ?? date('Y-m-d');
        $postingDate = $data['posting_date'] ?? $entryDate;

        $result = $this->db->fetchOne(
            "INSERT INTO journal_entries (
                company_id, entry_type, status, entry_date, posting_date, description,
                reference, created_by, tags, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id",
            [
                $companyId,
                $data['entry_type'] ?? 'manual',
                $data['status'] ?? 'draft',
                $entryDate,
                $postingDate,
                $data['description'] ?? null,
                $data['reference'] ?? null,
                $userId,
                isset($data['tags']) ? '{' . implode(',', $data['tags']) . '}' : null,
                isset($data['metadata']) ? json_encode($data['metadata']) : null
            ]
        );

        $entryId = $result['id'];

        // Create lines
        foreach ($data['lines'] as $line) {
            // Look up account_id from account_code if not provided
            $accountId = $line['account_id'] ?? null;
            if (!$accountId && isset($line['account_code'])) {
                $account = $this->db->fetchOne(
                    "SELECT id FROM accounts WHERE company_id = $1 AND code = $2",
                    [$companyId, $line['account_code']]
                );
                $accountId = $account ? $account['id'] : null;
            }

            // Determine line_type and amount from debit/credit if not provided
            $lineType = $line['line_type'] ?? null;
            $amount = $line['amount'] ?? 0;

            if (!$lineType) {
                if (!empty($line['debit']) && $line['debit'] > 0) {
                    $lineType = 'debit';
                    $amount = $line['debit'];
                } elseif (!empty($line['credit']) && $line['credit'] > 0) {
                    $lineType = 'credit';
                    $amount = $line['credit'];
                }
            }

            $this->db->query(
                "INSERT INTO journal_entry_lines (
                    journal_entry_id, account_id, line_type, amount,
                    description, quantity, unit_price, project_id,
                    customer_id, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
                [
                    $entryId,
                    $accountId,
                    $lineType,
                    $amount,
                    $line['description'] ?? null,
                    $line['quantity'] ?? null,
                    $line['unit_price'] ?? null,
                    $line['project_id'] ?? null,
                    $line['customer_id'] ?? null,
                    isset($line['metadata']) ? json_encode($line['metadata']) : null
                ]
            );
        }

        return $entryId;
    }

    /**
     * Post journal entry (make it permanent)
     */
    public function postJournalEntry($entryId, $companyId, $userId) {
        $entry = $this->getJournalEntry($entryId, $companyId);

        if ($entry['status'] === 'posted') {
            throw new Exception('Journal entry is already posted');
        }

        // Validate entry balance
        $debitTotal = 0;
        $creditTotal = 0;

        foreach ($entry['lines'] as $line) {
            if ($line['line_type'] === 'debit') {
                $debitTotal += $line['amount'];
            } else {
                $creditTotal += $line['amount'];
            }
        }

        if (abs($debitTotal - $creditTotal) > 0.01) {
            throw new Exception('Cannot post unbalanced entry');
        }

        $this->db->query(
            "UPDATE journal_entries
             SET status = 'posted', posted_by = $1, posted_at = NOW()
             WHERE id = $2 AND company_id = $3",
            [$userId, $entryId, $companyId]
        );

        // Refresh materialized view
        $this->db->query("REFRESH MATERIALIZED VIEW account_balances");
    }

    // ==================== FIXED ASSETS & DEPRECIATION ====================

    /**
     * List fixed assets
     */
    public function listFixedAssets($companyId, $filters = []) {
        $conditions = ['fa.company_id = $1'];
        $params = [$companyId];
        $paramCount = 1;

        if (!empty($filters['status'])) {
            $paramCount++;
            $conditions[] = "fa.status = $$paramCount";
            $params[] = $filters['status'];
        }

        if (!empty($filters['category'])) {
            $paramCount++;
            $conditions[] = "fa.category = $$paramCount";
            $params[] = $filters['category'];
        }

        $whereClause = implode(' AND ', $conditions);

        return $this->db->fetchAll(
            "SELECT fa.*,
                    a.name as asset_account_name,
                    ad.name as depreciation_account_name
             FROM fixed_assets fa
             LEFT JOIN chart_of_accounts a ON fa.asset_account_id = a.id
             LEFT JOIN chart_of_accounts ad ON fa.accumulated_depreciation_account_id = ad.id
             WHERE $whereClause
             ORDER BY fa.asset_number",
            $params
        );
    }

    /**
     * Create fixed asset
     */
    public function createFixedAsset($companyId, $data) {
        if (empty($data['asset_number']) || empty($data['name'])) {
            throw new Exception('Asset number and name are required');
        }

        $result = $this->db->fetchOne(
            "INSERT INTO fixed_assets (
                company_id, asset_number, name, description, category,
                asset_account_id, accumulated_depreciation_account_id, depreciation_expense_account_id,
                acquisition_date, acquisition_cost, salvage_value, useful_life_years,
                depreciation_method, placed_in_service_date, current_book_value,
                location, serial_number, status, tags, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING id",
            [
                $companyId,
                $data['asset_number'],
                $data['name'],
                $data['description'] ?? null,
                $data['category'] ?? null,
                $data['asset_account_id'],
                $data['accumulated_depreciation_account_id'],
                $data['depreciation_expense_account_id'],
                $data['acquisition_date'],
                $data['acquisition_cost'],
                $data['salvage_value'] ?? 0,
                $data['useful_life_years'],
                $data['depreciation_method'] ?? 'straight_line',
                $data['placed_in_service_date'] ?? $data['acquisition_date'],
                $data['acquisition_cost'], // Initial book value
                $data['location'] ?? null,
                $data['serial_number'] ?? null,
                'active',
                isset($data['tags']) ? '{' . implode(',', $data['tags']) . '}' : null,
                isset($data['metadata']) ? json_encode($data['metadata']) : null
            ]
        );

        return $result['id'];
    }

    /**
     * Calculate depreciation for a period
     */
    public function calculateDepreciation($assetId, $companyId, $periodDate) {
        $asset = $this->db->fetchOne(
            "SELECT * FROM fixed_assets WHERE id = $1 AND company_id = $2",
            [$assetId, $companyId]
        );

        if (!$asset) {
            throw new Exception('Asset not found');
        }

        $depreciableAmount = $asset['acquisition_cost'] - $asset['salvage_value'];
        $monthlyDepreciation = 0;

        switch ($asset['depreciation_method']) {
            case 'straight_line':
                $monthlyDepreciation = $depreciableAmount / ($asset['useful_life_years'] * 12);
                break;

            case 'declining_balance':
                $rate = $asset['depreciation_rate'] ?? (1 / $asset['useful_life_years']);
                $monthlyDepreciation = $asset['current_book_value'] * ($rate / 12);
                break;

            case 'double_declining':
                $rate = (2 / $asset['useful_life_years']);
                $monthlyDepreciation = $asset['current_book_value'] * ($rate / 12);
                break;
        }

        // Don't depreciate below salvage value
        $totalDepreciation = $asset['total_depreciation'] ?? 0;
        if ($totalDepreciation + $monthlyDepreciation > $depreciableAmount) {
            $monthlyDepreciation = $depreciableAmount - $totalDepreciation;
        }

        return [
            'period_date' => $periodDate,
            'opening_book_value' => $asset['current_book_value'],
            'depreciation_amount' => round($monthlyDepreciation, 2),
            'accumulated_depreciation' => $totalDepreciation + $monthlyDepreciation,
            'ending_book_value' => $asset['current_book_value'] - $monthlyDepreciation
        ];
    }

    // ==================== TAX MANAGEMENT ====================

    /**
     * List tax codes
     */
    public function listTaxCodes($companyId, $filters = []) {
        $conditions = ['company_id = $1'];
        $params = [$companyId];

        if (isset($filters['is_active'])) {
            $conditions[] = 'is_active = $2';
            $params[] = $filters['is_active'];
        }

        $whereClause = implode(' AND ', $conditions);

        return $this->db->fetchAll(
            "SELECT * FROM tax_codes WHERE $whereClause ORDER BY code",
            $params
        );
    }

    /**
     * Create tax code
     */
    public function createTaxCode($companyId, $data) {
        if (empty($data['code']) || empty($data['name'])) {
            throw new Exception('Tax code and name are required');
        }

        $result = $this->db->fetchOne(
            "INSERT INTO tax_codes (
                company_id, code, name, description, tax_type, rate,
                is_included_in_price, sales_tax_account_id, purchase_tax_account_id,
                applies_to, effective_from, is_active, country_code, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id",
            [
                $companyId,
                $data['code'],
                $data['name'],
                $data['description'] ?? null,
                $data['tax_type'],
                $data['rate'],
                $data['is_included_in_price'] ?? false,
                $data['sales_tax_account_id'] ?? null,
                $data['purchase_tax_account_id'] ?? null,
                $data['applies_to'] ?? 'both',
                $data['effective_from'] ?? date('Y-m-d'),
                $data['is_active'] ?? true,
                $data['country_code'] ?? 'RO',
                isset($data['metadata']) ? json_encode($data['metadata']) : null
            ]
        );

        return $result['id'];
    }

    // ==================== FINANCIAL REPORTS ====================

    /**
     * Get trial balance
     */
    public function getTrialBalance($companyId, $asOfDate = null) {
        // Refresh materialized view
        $this->db->query("REFRESH MATERIALIZED VIEW account_balances");

        return $this->db->fetchAll(
            "SELECT * FROM trial_balance_view WHERE company_id = $1 ORDER BY account_code",
            [$companyId]
        );
    }

    /**
     * Get balance sheet
     */
    public function getBalanceSheet($companyId, $asOfDate = null) {
        // Refresh materialized view
        $this->db->query("REFRESH MATERIALIZED VIEW account_balances");

        $data = $this->db->fetchAll(
            "SELECT * FROM balance_sheet_view WHERE company_id = $1",
            [$companyId]
        );

        $formatted = [
            'assets' => 0,
            'liabilities' => 0,
            'equity' => 0
        ];

        foreach ($data as $row) {
            $formatted[$row['account_type']] = $row['total_amount'];
        }

        $formatted['total_liabilities_and_equity'] = $formatted['liabilities'] + $formatted['equity'];

        return $formatted;
    }

    /**
     * Get income statement (P&L)
     */
    public function getIncomeStatement($companyId, $startDate, $endDate) {
        // Refresh materialized view
        $this->db->query("REFRESH MATERIALIZED VIEW account_balances");

        $data = $this->db->fetchAll(
            "SELECT * FROM income_statement_view WHERE company_id = $1",
            [$companyId]
        );

        $formatted = [
            'revenue' => 0,
            'expense' => 0,
            'net_income' => 0
        ];

        foreach ($data as $row) {
            $formatted[$row['account_type']] = $row['total_amount'];
        }

        $formatted['net_income'] = $formatted['revenue'] - $formatted['expense'];

        return $formatted;
    }

    /**
     * Get cash flow statement
     */
    public function getCashFlowStatement($companyId, $startDate, $endDate) {
        // Operating activities
        $operating = $this->db->fetchOne(
            "SELECT
                SUM(CASE WHEN a.account_type = 'revenue' THEN jel.amount ELSE 0 END) as cash_from_operations,
                SUM(CASE WHEN a.account_type = 'expense' THEN jel.amount ELSE 0 END) as cash_for_operations
             FROM journal_entry_lines jel
             LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
             LEFT JOIN chart_of_accounts a ON jel.account_id = a.id
             WHERE je.company_id = $1
               AND je.status = 'posted'
               AND je.posting_date BETWEEN $2 AND $3",
            [$companyId, $startDate, $endDate]
        );

        return [
            'operating_activities' => ($operating['cash_from_operations'] ?? 0) - ($operating['cash_for_operations'] ?? 0),
            'investing_activities' => 0, // To be calculated from fixed assets
            'financing_activities' => 0, // To be calculated from loans/equity
            'net_cash_flow' => ($operating['cash_from_operations'] ?? 0) - ($operating['cash_for_operations'] ?? 0)
        ];
    }
}
