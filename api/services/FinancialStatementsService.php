<?php

require_once __DIR__ . '/../config/database.php';

class FinancialStatementsService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Generate Income Statement (Profit & Loss)
     */
    public function getIncomeStatement($companyId, $startDate, $endDate) {
        // Revenue accounts
        $revenue = $this->getAccountsByType($companyId, 'revenue', $startDate, $endDate);
        $totalRevenue = array_sum(array_column($revenue, 'balance'));

        // Cost of Goods Sold
        $cogs = $this->getAccountsByType($companyId, 'cost_of_goods_sold', $startDate, $endDate);
        $totalCogs = array_sum(array_column($cogs, 'balance'));

        // Gross Profit
        $grossProfit = $totalRevenue - $totalCogs;

        // Operating Expenses
        $expenses = $this->getAccountsByType($companyId, 'expense', $startDate, $endDate);
        $totalExpenses = array_sum(array_column($expenses, 'balance'));

        // Net Income
        $netIncome = $grossProfit - $totalExpenses;

        return [
            'revenue' => [
                'accounts' => $revenue,
                'total' => $totalRevenue
            ],
            'cost_of_goods_sold' => [
                'accounts' => $cogs,
                'total' => $totalCogs
            ],
            'gross_profit' => $grossProfit,
            'operating_expenses' => [
                'accounts' => $expenses,
                'total' => $totalExpenses
            ],
            'net_income' => $netIncome,
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ]
        ];
    }

    /**
     * Generate Balance Sheet
     */
    public function getBalanceSheet($companyId, $asOfDate) {
        // Assets
        $currentAssets = $this->getAccountsBySubtype($companyId, 'current_asset', $asOfDate);
        $fixedAssets = $this->getAccountsBySubtype($companyId, 'fixed_asset', $asOfDate);
        $totalAssets = array_sum(array_column($currentAssets, 'balance')) +
                       array_sum(array_column($fixedAssets, 'balance'));

        // Liabilities
        $currentLiabilities = $this->getAccountsBySubtype($companyId, 'current_liability', $asOfDate);
        $longTermLiabilities = $this->getAccountsBySubtype($companyId, 'long_term_liability', $asOfDate);
        $totalLiabilities = array_sum(array_column($currentLiabilities, 'balance')) +
                           array_sum(array_column($longTermLiabilities, 'balance'));

        // Equity
        $equity = $this->getAccountsByType($companyId, 'equity', '1970-01-01', $asOfDate);
        $totalEquity = array_sum(array_column($equity, 'balance'));

        return [
            'assets' => [
                'current_assets' => [
                    'accounts' => $currentAssets,
                    'total' => array_sum(array_column($currentAssets, 'balance'))
                ],
                'fixed_assets' => [
                    'accounts' => $fixedAssets,
                    'total' => array_sum(array_column($fixedAssets, 'balance'))
                ],
                'total' => $totalAssets
            ],
            'liabilities' => [
                'current_liabilities' => [
                    'accounts' => $currentLiabilities,
                    'total' => array_sum(array_column($currentLiabilities, 'balance'))
                ],
                'long_term_liabilities' => [
                    'accounts' => $longTermLiabilities,
                    'total' => array_sum(array_column($longTermLiabilities, 'balance'))
                ],
                'total' => $totalLiabilities
            ],
            'equity' => [
                'accounts' => $equity,
                'total' => $totalEquity
            ],
            'liabilities_and_equity_total' => $totalLiabilities + $totalEquity,
            'as_of_date' => $asOfDate
        ];
    }

    /**
     * Generate Cash Flow Statement
     */
    public function getCashFlowStatement($companyId, $startDate, $endDate) {
        // Operating Activities
        $operatingQuery = "
            SELECT
                SUM(CASE WHEN jel.debit > 0 THEN jel.debit ELSE -jel.credit END) as net_cash_operating
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN accounts a ON jel.account_id = a.id
            WHERE je.company_id = $1
              AND je.entry_date BETWEEN $2 AND $3
              AND je.status = 'posted'
              AND a.account_type IN ('revenue', 'expense')
        ";

        $operating = $this->db->fetchOne($operatingQuery, [$companyId, $startDate, $endDate]);

        // Investing Activities
        $investingQuery = "
            SELECT
                SUM(CASE WHEN jel.debit > 0 THEN jel.debit ELSE -jel.credit END) as net_cash_investing
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN accounts a ON jel.account_id = a.id
            WHERE je.company_id = $1
              AND je.entry_date BETWEEN $2 AND $3
              AND je.status = 'posted'
              AND a.account_subtype = 'fixed_asset'
        ";

        $investing = $this->db->fetchOne($investingQuery, [$companyId, $startDate, $endDate]);

        // Financing Activities
        $financingQuery = "
            SELECT
                SUM(CASE WHEN jel.debit > 0 THEN jel.debit ELSE -jel.credit END) as net_cash_financing
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN accounts a ON jel.account_id = a.id
            WHERE je.company_id = $1
              AND je.entry_date BETWEEN $2 AND $3
              AND je.status = 'posted'
              AND a.account_type IN ('liability', 'equity')
        ";

        $financing = $this->db->fetchOne($financingQuery, [$companyId, $startDate, $endDate]);

        $netCashFlow = ($operating['net_cash_operating'] ?? 0) +
                      ($investing['net_cash_investing'] ?? 0) +
                      ($financing['net_cash_financing'] ?? 0);

        return [
            'operating_activities' => $operating['net_cash_operating'] ?? 0,
            'investing_activities' => $investing['net_cash_investing'] ?? 0,
            'financing_activities' => $financing['net_cash_financing'] ?? 0,
            'net_cash_flow' => $netCashFlow,
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ]
        ];
    }

    /**
     * Get accounts by type with balances for a period
     */
    private function getAccountsByType($companyId, $type, $startDate, $endDate) {
        return $this->db->fetchAll(
            "SELECT
                a.id,
                a.code,
                a.name,
                COALESCE(SUM(jel.credit) - SUM(jel.debit), 0) as balance
             FROM accounts a
             LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
             LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                 AND je.company_id = $1
                 AND je.entry_date BETWEEN $2 AND $3
                 AND je.status = 'posted'
             WHERE a.company_id = $1
               AND a.account_type = $4
               AND a.is_active = true
             GROUP BY a.id, a.code, a.name
             HAVING COALESCE(SUM(jel.credit) - SUM(jel.debit), 0) != 0
             ORDER BY a.code",
            [$companyId, $startDate, $endDate, $type]
        );
    }

    /**
     * Get accounts by subtype with balances as of date
     */
    private function getAccountsBySubtype($companyId, $subtype, $asOfDate) {
        return $this->db->fetchAll(
            "SELECT
                a.id,
                a.code,
                a.name,
                COALESCE(SUM(jel.debit) - SUM(jel.credit), 0) as balance
             FROM accounts a
             LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
             LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                 AND je.company_id = $1
                 AND je.entry_date <= $2
                 AND je.status = 'posted'
             WHERE a.company_id = $1
               AND a.account_subtype = $3
               AND a.is_active = true
             GROUP BY a.id, a.code, a.name
             HAVING COALESCE(SUM(jel.debit) - SUM(jel.credit), 0) != 0
             ORDER BY a.code",
            [$companyId, $asOfDate, $subtype]
        );
    }
}
