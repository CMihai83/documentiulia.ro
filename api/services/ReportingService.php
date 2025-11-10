<?php
/**
 * Financial Reporting Service
 * Generates P&L, Balance Sheet, Cash Flow, and custom reports
 */

require_once __DIR__ . '/../config/database.php';

class ReportingService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Generate Profit & Loss Statement
     */
    public function profitAndLoss($companyId, $fromDate, $toDate) {
        // Get revenue
        $revenue = $this->db->fetchAll("
            SELECT
                a.name as account_name,
                a.code as account_code,
                COALESCE(SUM(i.total_amount), 0) as amount
            FROM accounts a
            LEFT JOIN invoices i ON i.company_id = a.company_id
                AND i.status IN ('sent', 'partial', 'paid')
                AND i.invoice_date BETWEEN :from_date AND :to_date
            WHERE a.company_id = :company_id
                AND a.account_type = 'revenue'
            GROUP BY a.id, a.name, a.code
            ORDER BY a.code
        ", [
            'company_id' => $companyId,
            'from_date' => $fromDate,
            'to_date' => $toDate
        ]);

        // Get expenses
        $expenses = $this->db->fetchAll("
            SELECT
                a.name as account_name,
                a.code as account_code,
                COALESCE(SUM(e.amount), 0) as amount
            FROM accounts a
            LEFT JOIN expenses e ON e.company_id = a.company_id
                AND e.category = a.account_subtype
                AND e.expense_date BETWEEN :from_date AND :to_date
                AND e.status = 'approved'
            WHERE a.company_id = :company_id
                AND a.account_type = 'expense'
            GROUP BY a.id, a.name, a.code
            ORDER BY a.code
        ", [
            'company_id' => $companyId,
            'from_date' => $fromDate,
            'to_date' => $toDate
        ]);

        // Also get bill expenses (COGS and operating)
        $billExpenses = $this->db->fetchAll("
            SELECT
                'Bill Expenses' as account_name,
                '5000' as account_code,
                COALESCE(SUM(b.total_amount), 0) as amount
            FROM bills b
            WHERE b.company_id = :company_id
                AND b.bill_date BETWEEN :from_date AND :to_date
                AND b.status IN ('open', 'partial', 'paid')
        ", [
            'company_id' => $companyId,
            'from_date' => $fromDate,
            'to_date' => $toDate
        ]);

        // Calculate totals
        $totalRevenue = array_sum(array_column($revenue, 'amount'));
        $totalExpenses = array_sum(array_column($expenses, 'amount')) +
                        array_sum(array_column($billExpenses, 'amount'));
        $netIncome = $totalRevenue - $totalExpenses;

        return [
            'period' => [
                'from' => $fromDate,
                'to' => $toDate
            ],
            'revenue' => [
                'accounts' => $revenue,
                'total' => $totalRevenue
            ],
            'expenses' => [
                'accounts' => array_merge($expenses, $billExpenses),
                'total' => $totalExpenses
            ],
            'net_income' => $netIncome,
            'net_margin_percent' => $totalRevenue > 0 ? round(($netIncome / $totalRevenue) * 100, 2) : 0
        ];
    }

    /**
     * Generate Balance Sheet
     */
    public function balanceSheet($companyId, $asOfDate) {
        // Assets
        $assets = $this->db->fetchAll("
            SELECT
                name as account_name,
                code as account_code,
                account_subtype,
                balance as amount
            FROM accounts
            WHERE company_id = :company_id
                AND account_type = 'asset'
                AND is_active = true
            ORDER BY code
        ", ['company_id' => $companyId]);

        // Liabilities
        $liabilities = $this->db->fetchAll("
            SELECT
                name as account_name,
                code as account_code,
                account_subtype,
                balance as amount
            FROM accounts
            WHERE company_id = :company_id
                AND account_type = 'liability'
                AND is_active = true
            ORDER BY code
        ", ['company_id' => $companyId]);

        // Equity
        $equity = $this->db->fetchAll("
            SELECT
                name as account_name,
                code as account_code,
                account_subtype,
                balance as amount
            FROM accounts
            WHERE company_id = :company_id
                AND account_type = 'equity'
                AND is_active = true
            ORDER BY code
        ", ['company_id' => $companyId]);

        // Calculate totals
        $totalAssets = array_sum(array_column($assets, 'amount'));
        $totalLiabilities = array_sum(array_column($liabilities, 'amount'));
        $totalEquity = array_sum(array_column($equity, 'amount'));

        // Add current year earnings to equity
        $yearStart = date('Y-01-01', strtotime($asOfDate));
        $ytdPL = $this->profitAndLoss($companyId, $yearStart, $asOfDate);
        $totalEquity += $ytdPL['net_income'];

        return [
            'as_of_date' => $asOfDate,
            'assets' => [
                'accounts' => $assets,
                'total' => $totalAssets
            ],
            'liabilities' => [
                'accounts' => $liabilities,
                'total' => $totalLiabilities
            ],
            'equity' => [
                'accounts' => $equity,
                'current_year_earnings' => $ytdPL['net_income'],
                'total' => $totalEquity
            ],
            'total_liabilities_and_equity' => $totalLiabilities + $totalEquity,
            'balanced' => abs($totalAssets - ($totalLiabilities + $totalEquity)) < 0.01
        ];
    }

    /**
     * Generate Cash Flow Statement
     */
    public function cashFlowStatement($companyId, $fromDate, $toDate) {
        // Operating activities - cash from customers
        $cashFromCustomers = $this->db->fetchOne("
            SELECT COALESCE(SUM(amount), 0) as amount
            FROM payments
            WHERE company_id = :company_id
                AND payment_type = 'received'
                AND payment_date BETWEEN :from_date AND :to_date
                AND status = 'completed'
        ", [
            'company_id' => $companyId,
            'from_date' => $fromDate,
            'to_date' => $toDate
        ])['amount'];

        // Operating activities - cash to suppliers
        $cashToSuppliers = $this->db->fetchOne("
            SELECT COALESCE(SUM(amount), 0) as amount
            FROM payments
            WHERE company_id = :company_id
                AND payment_type = 'sent'
                AND payment_date BETWEEN :from_date AND :to_date
                AND status = 'completed'
        ", [
            'company_id' => $companyId,
            'from_date' => $fromDate,
            'to_date' => $toDate
        ])['amount'];

        // Operating activities - expenses paid
        $expensesPaid = $this->db->fetchOne("
            SELECT COALESCE(SUM(amount), 0) as amount
            FROM expenses
            WHERE company_id = :company_id
                AND expense_date BETWEEN :from_date AND :to_date
                AND status = 'approved'
        ", [
            'company_id' => $companyId,
            'from_date' => $fromDate,
            'to_date' => $toDate
        ])['amount'];

        $netCashFromOperations = $cashFromCustomers - $cashToSuppliers - $expensesPaid;

        // TODO: Add investing and financing activities when we have those features

        $netCashFlow = $netCashFromOperations;

        // Get beginning and ending cash balance
        $beginningCash = $this->getCashBalance($companyId, $fromDate);
        $endingCash = $beginningCash + $netCashFlow;

        return [
            'period' => [
                'from' => $fromDate,
                'to' => $toDate
            ],
            'operating_activities' => [
                'cash_from_customers' => $cashFromCustomers,
                'cash_to_suppliers' => -$cashToSuppliers,
                'expenses_paid' => -$expensesPaid,
                'net_cash_from_operations' => $netCashFromOperations
            ],
            'investing_activities' => [
                'net_cash_from_investing' => 0 // TODO: Implement
            ],
            'financing_activities' => [
                'net_cash_from_financing' => 0 // TODO: Implement
            ],
            'net_cash_flow' => $netCashFlow,
            'beginning_cash_balance' => $beginningCash,
            'ending_cash_balance' => $endingCash
        ];
    }

    /**
     * Get cash balance as of a date
     */
    private function getCashBalance($companyId, $asOfDate) {
        $result = $this->db->fetchOne("
            SELECT COALESCE(SUM(balance), 0) as total
            FROM accounts
            WHERE company_id = :company_id
                AND account_type = 'asset'
                AND account_subtype = 'cash'
        ", ['company_id' => $companyId]);

        return $result['total'];
    }

    /**
     * Aged Receivables Report
     */
    public function agedReceivables($companyId, $asOfDate = null) {
        $asOfDate = $asOfDate ?? date('Y-m-d');

        $invoices = $this->db->fetchAll("
            SELECT
                i.id,
                i.invoice_number,
                i.invoice_date,
                i.due_date,
                i.amount_due,
                c.display_name as customer_name,
                CURRENT_DATE - i.due_date as days_overdue
            FROM invoices i
            JOIN contacts c ON i.customer_id = c.id
            WHERE i.company_id = :company_id
                AND i.status IN ('sent', 'partial', 'overdue')
                AND i.amount_due > 0
            ORDER BY days_overdue DESC, i.due_date
        ", ['company_id' => $companyId]);

        // Categorize by aging buckets
        $aging = [
            'current' => ['count' => 0, 'amount' => 0, 'invoices' => []],
            'days_1_30' => ['count' => 0, 'amount' => 0, 'invoices' => []],
            'days_31_60' => ['count' => 0, 'amount' => 0, 'invoices' => []],
            'days_61_90' => ['count' => 0, 'amount' => 0, 'invoices' => []],
            'over_90' => ['count' => 0, 'amount' => 0, 'invoices' => []]
        ];

        foreach ($invoices as $invoice) {
            $days = $invoice['days_overdue'];

            if ($days <= 0) {
                $bucket = 'current';
            } elseif ($days <= 30) {
                $bucket = 'days_1_30';
            } elseif ($days <= 60) {
                $bucket = 'days_31_60';
            } elseif ($days <= 90) {
                $bucket = 'days_61_90';
            } else {
                $bucket = 'over_90';
            }

            $aging[$bucket]['count']++;
            $aging[$bucket]['amount'] += $invoice['amount_due'];
            $aging[$bucket]['invoices'][] = $invoice;
        }

        $totalOutstanding = array_sum(array_column($invoices, 'amount_due'));

        return [
            'as_of_date' => $asOfDate,
            'total_outstanding' => $totalOutstanding,
            'aging_buckets' => $aging,
            'summary' => [
                'current' => $aging['current']['amount'],
                '1_30_days' => $aging['days_1_30']['amount'],
                '31_60_days' => $aging['days_31_60']['amount'],
                '61_90_days' => $aging['days_61_90']['amount'],
                'over_90_days' => $aging['over_90']['amount']
            ]
        ];
    }

    /**
     * Aged Payables Report
     */
    public function agedPayables($companyId, $asOfDate = null) {
        $asOfDate = $asOfDate ?? date('Y-m-d');

        $bills = $this->db->fetchAll("
            SELECT
                b.id,
                b.bill_number,
                b.bill_date,
                b.due_date,
                b.amount_due,
                v.display_name as vendor_name,
                CURRENT_DATE - b.due_date as days_overdue
            FROM bills b
            JOIN contacts v ON b.vendor_id = v.id
            WHERE b.company_id = :company_id
                AND b.status IN ('open', 'partial', 'overdue')
                AND b.amount_due > 0
            ORDER BY days_overdue DESC, b.due_date
        ", ['company_id' => $companyId]);

        // Same aging buckets as receivables
        $aging = [
            'current' => ['count' => 0, 'amount' => 0, 'bills' => []],
            'days_1_30' => ['count' => 0, 'amount' => 0, 'bills' => []],
            'days_31_60' => ['count' => 0, 'amount' => 0, 'bills' => []],
            'days_61_90' => ['count' => 0, 'amount' => 0, 'bills' => []],
            'over_90' => ['count' => 0, 'amount' => 0, 'bills' => []]
        ];

        foreach ($bills as $bill) {
            $days = $bill['days_overdue'];

            if ($days <= 0) {
                $bucket = 'current';
            } elseif ($days <= 30) {
                $bucket = 'days_1_30';
            } elseif ($days <= 60) {
                $bucket = 'days_31_60';
            } elseif ($days <= 90) {
                $bucket = 'days_61_90';
            } else {
                $bucket = 'over_90';
            }

            $aging[$bucket]['count']++;
            $aging[$bucket]['amount'] += $bill['amount_due'];
            $aging[$bucket]['bills'][] = $bill;
        }

        $totalOutstanding = array_sum(array_column($bills, 'amount_due'));

        return [
            'as_of_date' => $asOfDate,
            'total_outstanding' => $totalOutstanding,
            'aging_buckets' => $aging,
            'summary' => [
                'current' => $aging['current']['amount'],
                '1_30_days' => $aging['days_1_30']['amount'],
                '31_60_days' => $aging['days_31_60']['amount'],
                '61_90_days' => $aging['days_61_90']['amount'],
                'over_90_days' => $aging['over_90']['amount']
            ]
        ];
    }

    /**
     * Dashboard Summary
     */
    public function dashboardSummary($companyId) {
        $today = date('Y-m-d');
        $monthStart = date('Y-m-01');
        $yearStart = date('Y-01-01');

        // This month P&L
        $monthPL = $this->profitAndLoss($companyId, $monthStart, $today);

        // YTD P&L
        $ytdPL = $this->profitAndLoss($companyId, $yearStart, $today);

        // Cash flow this month
        $monthCF = $this->cashFlowStatement($companyId, $monthStart, $today);

        // Receivables
        $receivables = $this->agedReceivables($companyId);

        // Payables
        $payables = $this->agedPayables($companyId);

        return [
            'current_date' => $today,
            'month_to_date' => [
                'revenue' => $monthPL['revenue']['total'],
                'expenses' => $monthPL['expenses']['total'],
                'net_income' => $monthPL['net_income'],
                'cash_flow' => $monthCF['net_cash_flow']
            ],
            'year_to_date' => [
                'revenue' => $ytdPL['revenue']['total'],
                'expenses' => $ytdPL['expenses']['total'],
                'net_income' => $ytdPL['net_income']
            ],
            'receivables' => [
                'total_outstanding' => $receivables['total_outstanding'],
                'overdue' => $receivables['summary']['over_90_days'] +
                           $receivables['summary']['61_90_days'] +
                           $receivables['summary']['31_60_days'] +
                           $receivables['summary']['1_30_days']
            ],
            'payables' => [
                'total_outstanding' => $payables['total_outstanding'],
                'overdue' => $payables['summary']['over_90_days'] +
                           $payables['summary']['61_90_days'] +
                           $payables['summary']['31_60_days'] +
                           $payables['summary']['1_30_days']
            ],
            'cash_balance' => $monthCF['ending_cash_balance']
        ];
    }
}
