<?php
/**
 * ReportService.php
 *
 * Service for generating custom financial reports, analytics, and insights
 * Supports budget vs actual comparisons, P&L statements, balance sheets
 *
 * @category Service
 * @package  DocumentIulia
 * @author   DocumentIulia Platform
 * @created  2025-01-21
 */

require_once __DIR__ . '/../config/database.php';

class ReportService
{
    private $db;

    public function __construct()
    {
        $database = Database::getInstance();
        $this->db = $database->getConnection();
    }

    // ========================================
    // PROFIT & LOSS REPORT
    // ========================================

    /**
     * Generate Profit & Loss statement
     *
     * @param string $companyId Company ID
     * @param string $startDate Start date (Y-m-d)
     * @param string $endDate End date (Y-m-d)
     * @return array P&L data
     */
    public function getProfitAndLoss($companyId, $startDate, $endDate)
    {
        try {
            // Get revenue (invoices)
            $revenueQuery = "SELECT
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(*) as invoice_count
            FROM invoices
            WHERE company_id = :company_id
            AND status = 'paid'
            AND issue_date BETWEEN :start_date AND :end_date";

            $revenueStmt = $this->db->prepare($revenueQuery);
            $revenueStmt->bindParam(':company_id', $companyId);
            $revenueStmt->bindParam(':start_date', $startDate);
            $revenueStmt->bindParam(':end_date', $endDate);
            $revenueStmt->execute();
            $revenue = $revenueStmt->fetch(PDO::FETCH_ASSOC);

            // Get expenses by category
            $expensesQuery = "SELECT
                category,
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as expense_count
            FROM expenses
            WHERE company_id = :company_id
            AND expense_date BETWEEN :start_date AND :end_date
            GROUP BY category
            ORDER BY total_amount DESC";

            $expensesStmt = $this->db->prepare($expensesQuery);
            $expensesStmt->bindParam(':company_id', $companyId);
            $expensesStmt->bindParam(':start_date', $startDate);
            $expensesStmt->bindParam(':end_date', $endDate);
            $expensesStmt->execute();
            $expensesByCategory = $expensesStmt->fetchAll(PDO::FETCH_ASSOC);

            $totalExpenses = array_sum(array_column($expensesByCategory, 'total_amount'));
            $netIncome = $revenue['total_revenue'] - $totalExpenses;
            $profitMargin = $revenue['total_revenue'] > 0
                ? ($netIncome / $revenue['total_revenue']) * 100
                : 0;

            return [
                'success' => true,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ],
                'revenue' => [
                    'total' => round($revenue['total_revenue'], 2),
                    'invoice_count' => (int)$revenue['invoice_count']
                ],
                'expenses' => [
                    'total' => round($totalExpenses, 2),
                    'by_category' => array_map(function($cat) {
                        return [
                            'category' => $cat['category'],
                            'amount' => round($cat['total_amount'], 2),
                            'count' => (int)$cat['expense_count']
                        ];
                    }, $expensesByCategory)
                ],
                'net_income' => round($netIncome, 2),
                'profit_margin' => round($profitMargin, 2)
            ];
        } catch (PDOException $e) {
            error_log("ReportService::getProfitAndLoss Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to generate P&L report'
            ];
        }
    }

    // ========================================
    // BUDGET VS ACTUAL REPORT
    // ========================================

    /**
     * Generate Budget vs Actual comparison
     *
     * @param string $companyId Company ID
     * @param int $year Year
     * @param int|null $month Month (null for yearly)
     * @return array Budget comparison data
     */
    public function getBudgetVsActual($companyId, $year, $month = null)
    {
        try {
            // Determine date range
            if ($month) {
                $startDate = sprintf('%04d-%02d-01', $year, $month);
                $endDate = date('Y-m-t', strtotime($startDate));
            } else {
                $startDate = sprintf('%04d-01-01', $year);
                $endDate = sprintf('%04d-12-31', $year);
            }

            // Get budget (if exists)
            $budgetQuery = "SELECT
                budget_category,
                budgeted_amount,
                period_type
            FROM company_budgets
            WHERE company_id = :company_id
            AND budget_year = :year" .
            ($month ? " AND budget_month = :month" : "");

            $budgetStmt = $this->db->prepare($budgetQuery);
            $budgetStmt->bindParam(':company_id', $companyId);
            $budgetStmt->bindParam(':year', $year, PDO::PARAM_INT);
            if ($month) {
                $budgetStmt->bindParam(':month', $month, PDO::PARAM_INT);
            }
            $budgetStmt->execute();
            $budgets = $budgetStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get actual revenue
            $actualRevenueQuery = "SELECT COALESCE(SUM(total_amount), 0) as actual_revenue
            FROM invoices
            WHERE company_id = :company_id
            AND status = 'paid'
            AND issue_date BETWEEN :start_date AND :end_date";

            $revenueStmt = $this->db->prepare($actualRevenueQuery);
            $revenueStmt->bindParam(':company_id', $companyId);
            $revenueStmt->bindParam(':start_date', $startDate);
            $revenueStmt->bindParam(':end_date', $endDate);
            $revenueStmt->execute();
            $actualRevenue = $revenueStmt->fetch(PDO::FETCH_ASSOC)['actual_revenue'];

            // Get actual expenses by category
            $actualExpensesQuery = "SELECT
                category,
                COALESCE(SUM(amount), 0) as actual_amount
            FROM expenses
            WHERE company_id = :company_id
            AND expense_date BETWEEN :start_date AND :end_date
            GROUP BY category";

            $expensesStmt = $this->db->prepare($actualExpensesQuery);
            $expensesStmt->bindParam(':company_id', $companyId);
            $expensesStmt->bindParam(':start_date', $startDate);
            $expensesStmt->bindParam(':end_date', $endDate);
            $expensesStmt->execute();
            $actualExpenses = $expensesStmt->fetchAll(PDO::FETCH_ASSOC);

            // Map budgets to actuals
            $budgetComparison = [];
            $totalBudgeted = 0;
            $totalActual = 0;

            // Revenue budget
            $revenueBudget = array_values(array_filter($budgets, function($b) {
                return $b['budget_category'] === 'revenue';
            }));
            $budgetedRevenue = !empty($revenueBudget) ? $revenueBudget[0]['budgeted_amount'] : 0;
            $totalBudgeted += $budgetedRevenue;
            $totalActual += $actualRevenue;

            $budgetComparison[] = [
                'category' => 'Revenue',
                'budgeted' => round($budgetedRevenue, 2),
                'actual' => round($actualRevenue, 2),
                'variance' => round($actualRevenue - $budgetedRevenue, 2),
                'variance_percent' => $budgetedRevenue > 0
                    ? round((($actualRevenue - $budgetedRevenue) / $budgetedRevenue) * 100, 2)
                    : 0,
                'performance' => $actualRevenue >= $budgetedRevenue ? 'on_track' : 'under'
            ];

            // Expense budgets
            foreach ($budgets as $budget) {
                if ($budget['budget_category'] === 'revenue') continue;

                $actualExpense = array_values(array_filter($actualExpenses, function($e) use ($budget) {
                    return $e['category'] === $budget['budget_category'];
                }));
                $actualAmount = !empty($actualExpense) ? $actualExpense[0]['actual_amount'] : 0;

                $budgetComparison[] = [
                    'category' => ucfirst($budget['budget_category']),
                    'budgeted' => round($budget['budgeted_amount'], 2),
                    'actual' => round($actualAmount, 2),
                    'variance' => round($actualAmount - $budget['budgeted_amount'], 2),
                    'variance_percent' => $budget['budgeted_amount'] > 0
                        ? round((($actualAmount - $budget['budgeted_amount']) / $budget['budgeted_amount']) * 100, 2)
                        : 0,
                    'performance' => $actualAmount <= $budget['budgeted_amount'] ? 'on_track' : 'over'
                ];
            }

            return [
                'success' => true,
                'period' => [
                    'year' => $year,
                    'month' => $month,
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ],
                'summary' => [
                    'budgeted_revenue' => round($budgetedRevenue, 2),
                    'actual_revenue' => round($actualRevenue, 2),
                    'revenue_variance' => round($actualRevenue - $budgetedRevenue, 2),
                    'total_budgeted' => round($totalBudgeted, 2),
                    'total_actual' => round($totalActual, 2),
                    'overall_variance' => round($totalActual - $totalBudgeted, 2)
                ],
                'comparison' => $budgetComparison
            ];
        } catch (PDOException $e) {
            error_log("ReportService::getBudgetVsActual Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to generate budget report'
            ];
        }
    }

    // ========================================
    // CASH FLOW REPORT
    // ========================================

    /**
     * Generate Cash Flow statement
     *
     * @param string $companyId Company ID
     * @param string $startDate Start date
     * @param string $endDate End date
     * @return array Cash flow data
     */
    public function getCashFlow($companyId, $startDate, $endDate)
    {
        try {
            // Operating activities (revenue & expenses)
            $operatingQuery = "
                SELECT
                    COALESCE(SUM(CASE WHEN type = 'invoice' THEN amount ELSE 0 END), 0) as cash_in,
                    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as cash_out
                FROM (
                    SELECT total_amount as amount, 'invoice' as type, payment_date as date
                    FROM invoices
                    WHERE company_id = :company_id AND status = 'paid' AND payment_date BETWEEN :start_date AND :end_date
                    UNION ALL
                    SELECT amount, 'expense' as type, expense_date as date
                    FROM expenses
                    WHERE company_id = :company_id AND expense_date BETWEEN :start_date AND :end_date
                ) combined";

            $stmt = $this->db->prepare($operatingQuery);
            $stmt->bindParam(':company_id', $companyId);
            $stmt->bindParam(':start_date', $startDate);
            $stmt->bindParam(':end_date', $endDate);
            $stmt->execute();
            $operating = $stmt->fetch(PDO::FETCH_ASSOC);

            $netCashFlow = $operating['cash_in'] - $operating['cash_out'];

            return [
                'success' => true,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ],
                'operating_activities' => [
                    'cash_in' => round($operating['cash_in'], 2),
                    'cash_out' => round($operating['cash_out'], 2),
                    'net_cash_flow' => round($netCashFlow, 2)
                ],
                'summary' => [
                    'net_cash_flow' => round($netCashFlow, 2),
                    'cash_flow_positive' => $netCashFlow >= 0
                ]
            ];
        } catch (PDOException $e) {
            error_log("ReportService::getCashFlow Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to generate cash flow report'
            ];
        }
    }

    // ========================================
    // CUSTOM REPORT BUILDER
    // ========================================

    /**
     * Execute custom report query
     *
     * @param array $reportConfig Report configuration
     * @return array Report results
     */
    public function executeCustomReport($reportConfig)
    {
        try {
            $dataSource = $reportConfig['data_source']; // 'invoices', 'expenses', 'bills'
            $metrics = $reportConfig['metrics']; // ['sum', 'count', 'avg']
            $groupBy = $reportConfig['group_by'] ?? null; // 'month', 'category', 'customer'
            $filters = $reportConfig['filters'] ?? [];
            $dateRange = $reportConfig['date_range'];

            $query = $this->buildCustomQuery($dataSource, $metrics, $groupBy, $filters, $dateRange);

            $stmt = $this->db->prepare($query['sql']);
            foreach ($query['params'] as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();

            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'results' => $results,
                'metadata' => [
                    'data_source' => $dataSource,
                    'row_count' => count($results),
                    'generated_at' => date('Y-m-d H:i:s')
                ]
            ];
        } catch (Exception $e) {
            error_log("ReportService::executeCustomReport Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to execute custom report: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Build custom SQL query from report config
     *
     * @param string $dataSource Data source table
     * @param array $metrics Metrics to calculate
     * @param string|null $groupBy Group by field
     * @param array $filters Filter conditions
     * @param array $dateRange Date range filter
     * @return array SQL query and parameters
     */
    private function buildCustomQuery($dataSource, $metrics, $groupBy, $filters, $dateRange)
    {
        $select = [];
        $params = [];

        // Build SELECT clause
        foreach ($metrics as $metric) {
            switch ($metric['type']) {
                case 'sum':
                    $select[] = "SUM({$metric['field']}) as {$metric['alias']}";
                    break;
                case 'count':
                    $select[] = "COUNT(*) as {$metric['alias']}";
                    break;
                case 'avg':
                    $select[] = "AVG({$metric['field']}) as {$metric['alias']}";
                    break;
            }
        }

        if ($groupBy) {
            $select[] = $groupBy;
        }

        $sql = "SELECT " . implode(', ', $select) . " FROM {$dataSource}";

        // Build WHERE clause
        $where = [];
        $where[] = "company_id = :company_id";
        $params[':company_id'] = $filters['company_id'];

        if (isset($dateRange['start']) && isset($dateRange['end'])) {
            $dateField = $dataSource === 'invoices' ? 'issue_date' :
                        ($dataSource === 'expenses' ? 'expense_date' : 'date');
            $where[] = "{$dateField} BETWEEN :start_date AND :end_date";
            $params[':start_date'] = $dateRange['start'];
            $params[':end_date'] = $dateRange['end'];
        }

        if (!empty($where)) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }

        if ($groupBy) {
            $sql .= " GROUP BY {$groupBy}";
            $sql .= " ORDER BY {$groupBy}";
        }

        return ['sql' => $sql, 'params' => $params];
    }

    // ========================================
    // ANALYTICS & INSIGHTS
    // ========================================

    /**
     * Get key financial metrics
     *
     * @param string $companyId Company ID
     * @param string $startDate Start date
     * @param string $endDate End date
     * @return array Key metrics
     */
    public function getKeyMetrics($companyId, $startDate, $endDate)
    {
        try {
            $pl = $this->getProfitAndLoss($companyId, $startDate, $endDate);
            $cashFlow = $this->getCashFlow($companyId, $startDate, $endDate);

            // Calculate additional metrics
            $revenueGrowth = $this->calculateGrowthRate($companyId, 'revenue', $startDate, $endDate);
            $averageInvoiceValue = $pl['revenue']['invoice_count'] > 0
                ? $pl['revenue']['total'] / $pl['revenue']['invoice_count']
                : 0;

            return [
                'success' => true,
                'metrics' => [
                    'revenue' => $pl['revenue']['total'],
                    'expenses' => $pl['expenses']['total'],
                    'net_income' => $pl['net_income'],
                    'profit_margin' => $pl['profit_margin'],
                    'cash_flow' => $cashFlow['summary']['net_cash_flow'],
                    'revenue_growth' => $revenueGrowth,
                    'average_invoice_value' => round($averageInvoiceValue, 2)
                ]
            ];
        } catch (Exception $e) {
            error_log("ReportService::getKeyMetrics Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to calculate key metrics'
            ];
        }
    }

    /**
     * Calculate growth rate for a metric
     *
     * @param string $companyId Company ID
     * @param string $metric Metric to calculate (revenue, expenses)
     * @param string $startDate Start date
     * @param string $endDate End date
     * @return float Growth rate percentage
     */
    private function calculateGrowthRate($companyId, $metric, $startDate, $endDate)
    {
        // TODO: Implement comparison with previous period
        return 0.0;
    }
}
