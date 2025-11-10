<?php
/**
 * AI Insights & Decision Support Service
 * Generates smart prompts, insights, and decision scenarios
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/ForecastingService.php';
require_once __DIR__ . '/ReportingService.php';

class InsightsService {
    private $db;
    private $forecasting;
    private $reporting;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->forecasting = new ForecastingService();
        $this->reporting = new ReportingService();
    }

    /**
     * Generate all insights for a company
     */
    public function generateInsights($companyId) {
        $insights = [];

        // Cash flow insights
        $insights = array_merge($insights, $this->cashFlowInsights($companyId));

        // Receivables insights
        $insights = array_merge($insights, $this->receivablesInsights($companyId));

        // Payables insights
        $insights = array_merge($insights, $this->payablesInsights($companyId));

        // Revenue insights
        $insights = array_merge($insights, $this->revenueInsights($companyId));

        // Expense insights
        $insights = array_merge($insights, $this->expenseInsights($companyId));

        // Store insights in database
        foreach ($insights as $insight) {
            $this->storeInsight($companyId, $insight);
        }

        return $insights;
    }

    /**
     * Cash flow related insights
     */
    private function cashFlowInsights($companyId) {
        $insights = [];
        $runway = $this->forecasting->calculateRunway($companyId);

        // Runway warning
        if ($runway['status'] === 'critical') {
            $insights[] = [
                'insight_type' => 'warning',
                'category' => 'cash_flow',
                'priority' => 'critical',
                'title' => 'Critical Cash Runway',
                'message' => "You have only {$runway['runway_months']} months of cash runway at current burn rate. Immediate action needed to reduce expenses or increase revenue.",
                'action_label' => 'Create Action Plan',
                'action_url' => '/dashboard/cash-flow'
            ];
        } elseif ($runway['status'] === 'warning') {
            $insights[] = [
                'insight_type' => 'warning',
                'category' => 'cash_flow',
                'priority' => 'high',
                'title' => 'Cash Runway Alert',
                'message' => "You have {$runway['runway_months']} months of runway. Consider reviewing expenses or accelerating collections.",
                'action_label' => 'View Forecast',
                'action_url' => '/reports/cash-flow'
            ];
        }

        // Positive cash flow
        if ($runway['status'] === 'positive') {
            $insights[] = [
                'insight_type' => 'success',
                'category' => 'cash_flow',
                'priority' => 'low',
                'title' => 'Strong Cash Position',
                'message' => 'You have positive cash flow. Consider investing surplus or expanding operations.',
                'action_label' => 'View Opportunities',
                'action_url' => '/dashboard/opportunities'
            ];
        }

        return $insights;
    }

    /**
     * Receivables insights
     */
    private function receivablesInsights($companyId) {
        $insights = [];
        $aged = $this->reporting->agedReceivables($companyId);

        // Overdue invoices
        $overdue = $aged['summary']['over_90_days'] +
                  $aged['summary']['61_90_days'] +
                  $aged['summary']['31_60_days'] +
                  $aged['summary']['1_30_days'];

        if ($overdue > 0) {
            $count = $aged['aging_buckets']['over_90']['count'] +
                    $aged['aging_buckets']['days_61_90']['count'] +
                    $aged['aging_buckets']['days_31_60']['count'] +
                    $aged['aging_buckets']['days_1_30']['count'];

            $insights[] = [
                'insight_type' => 'warning',
                'category' => 'invoice',
                'priority' => 'high',
                'title' => 'Overdue Invoices',
                'message' => "$count invoices are overdue totaling $" . number_format($overdue, 2) . ". Following up could improve cash flow by up to $" . number_format($overdue, 2) . ".",
                'action_label' => 'Send Reminders',
                'action_url' => '/invoices?status=overdue'
            ];
        }

        // 90+ days overdue - critical
        if ($aged['summary']['over_90_days'] > 0) {
            $insights[] = [
                'insight_type' => 'warning',
                'category' => 'invoice',
                'priority' => 'critical',
                'title' => 'Very Overdue Invoices',
                'message' => "{$aged['aging_buckets']['over_90']['count']} invoices are 90+ days overdue ($" . number_format($aged['summary']['over_90_days'], 2) . "). These may become uncollectible.",
                'action_label' => 'Review & Act',
                'action_url' => '/invoices?aging=90plus'
            ];
        }

        return $insights;
    }

    /**
     * Payables insights
     */
    private function payablesInsights($companyId) {
        $insights = [];
        $aged = $this->reporting->agedPayables($companyId);

        // Overdue bills
        $overdue = $aged['summary']['over_90_days'] +
                  $aged['summary']['61_90_days'] +
                  $aged['summary']['31_60_days'];

        if ($overdue > 0) {
            $count = $aged['aging_buckets']['over_90']['count'] +
                    $aged['aging_buckets']['days_61_90']['count'] +
                    $aged['aging_buckets']['days_31_60']['count'];

            $insights[] = [
                'insight_type' => 'warning',
                'category' => 'bill',
                'priority' => 'high',
                'title' => 'Overdue Vendor Payments',
                'message' => "$count bills are overdue ($" . number_format($overdue, 2) . "). Late payments may damage vendor relationships.",
                'action_label' => 'Schedule Payments',
                'action_url' => '/bills?status=overdue'
            ];
        }

        return $insights;
    }

    /**
     * Revenue insights
     */
    private function revenueInsights($companyId) {
        $insights = [];

        // Compare current month vs last month
        $thisMonthStart = date('Y-m-01');
        $thisMonthEnd = date('Y-m-t');
        $lastMonthStart = date('Y-m-01', strtotime('-1 month'));
        $lastMonthEnd = date('Y-m-t', strtotime('-1 month'));

        $thisMonth = $this->reporting->profitAndLoss($companyId, $thisMonthStart, $thisMonthEnd);
        $lastMonth = $this->reporting->profitAndLoss($companyId, $lastMonthStart, $lastMonthEnd);

        $thisRevenue = $thisMonth['revenue']['total'];
        $lastRevenue = $lastMonth['revenue']['total'];

        if ($lastRevenue > 0) {
            $changePercent = (($thisRevenue - $lastRevenue) / $lastRevenue) * 100;

            if ($changePercent > 10) {
                $insights[] = [
                    'insight_type' => 'success',
                    'category' => 'revenue',
                    'priority' => 'medium',
                    'title' => 'Strong Revenue Growth',
                    'message' => "Revenue increased " . round($changePercent, 1) . "% this month. Consider expanding successful strategies.",
                    'action_label' => 'View Details',
                    'action_url' => '/reports/profit-loss'
                ];
            } elseif ($changePercent < -10) {
                $insights[] = [
                    'insight_type' => 'warning',
                    'category' => 'revenue',
                    'priority' => 'high',
                    'title' => 'Revenue Decline',
                    'message' => "Revenue decreased " . round(abs($changePercent), 1) . "% this month. Investigate causes and take corrective action.",
                    'action_label' => 'Analyze Trends',
                    'action_url' => '/reports/revenue-analysis'
                ];
            }
        }

        return $insights;
    }

    /**
     * Expense insights
     */
    private function expenseInsights($companyId) {
        $insights = [];

        // Get expense statistics
        $thisMonthStart = date('Y-m-01');
        $thisMonthEnd = date('Y-m-t');

        $expenseStats = $this->db->fetchOne("
            SELECT
                COUNT(*) as pending_count,
                SUM(amount) as pending_amount
            FROM expenses
            WHERE company_id = :company_id
                AND status = 'pending'
        ", ['company_id' => $companyId]);

        if ($expenseStats['pending_count'] > 0) {
            $insights[] = [
                'insight_type' => 'info',
                'category' => 'expense',
                'priority' => 'medium',
                'title' => 'Pending Expense Approvals',
                'message' => "{$expenseStats['pending_count']} expenses pending approval totaling $" . number_format($expenseStats['pending_amount'], 2) . ".",
                'action_label' => 'Review Expenses',
                'action_url' => '/expenses?status=pending'
            ];
        }

        return $insights;
    }

    /**
     * Store insight in database
     */
    private function storeInsight($companyId, $insight) {
        // Check if similar insight already exists and is not dismissed
        $existing = $this->db->fetchOne("
            SELECT id FROM insights
            WHERE company_id = :company_id
                AND category = :category
                AND title = :title
                AND is_dismissed = false
                AND created_at > NOW() - INTERVAL '7 days'
        ", [
            'company_id' => $companyId,
            'category' => $insight['category'],
            'title' => $insight['title']
        ]);

        if (!$existing) {
            $this->db->insert('insights', [
                'company_id' => $companyId,
                'insight_type' => $insight['insight_type'],
                'category' => $insight['category'],
                'priority' => $insight['priority'],
                'title' => $insight['title'],
                'message' => $insight['message'],
                'action_label' => $insight['action_label'] ?? null,
                'is_dismissed' => false
            ]);
        }
    }

    /**
     * Get active insights for a company
     */
    public function getInsights($companyId, $limit = 10) {
        return $this->db->fetchAll("
            SELECT *
            FROM insights
            WHERE company_id = :company_id
                AND is_dismissed = false
            ORDER BY
                CASE priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END,
                created_at DESC
            LIMIT :limit
        ", [
            'company_id' => $companyId,
            'limit' => $limit
        ]);
    }

    /**
     * Dismiss an insight
     */
    public function dismissInsight($insightId, $userId) {
        $this->db->query("
            UPDATE insights
            SET is_dismissed = true,
                dismissed_at = NOW(),
                dismissed_by = :user_id
            WHERE id = :id
        ", [
            'id' => $insightId,
            'user_id' => $userId
        ]);
    }

    /**
     * Generate decision scenario (e.g., "Should you hire?")
     */
    public function generateDecisionScenario($companyId, $scenarioType, $context = []) {
        $scenario = null;

        switch ($scenarioType) {
            case 'hiring':
                $scenario = $this->hiringDecision($companyId, $context);
                break;
            case 'pricing':
                $scenario = $this->pricingDecision($companyId, $context);
                break;
            case 'expansion':
                $scenario = $this->expansionDecision($companyId, $context);
                break;
        }

        if ($scenario) {
            $this->storeDecisionScenario($companyId, $scenario);
        }

        return $scenario;
    }

    /**
     * Hiring decision analysis
     */
    private function hiringDecision($companyId, $context) {
        $runway = $this->forecasting->calculateRunway($companyId);
        $summary = $this->reporting->dashboardSummary($companyId);

        $newSalary = $context['salary'] ?? 5000;
        $newRunway = $runway['current_balance'] / ($runway['monthly_burn'] + $newSalary);

        $options = [
            [
                'title' => 'Hire Full-Time',
                'pros' => [
                    'Long-term capacity increase',
                    'Better team cohesion',
                    'Knowledge retention'
                ],
                'cons' => [
                    "Fixed cost increase: $" . number_format($newSalary, 2) . "/month",
                    'Longer hiring process',
                    'Commitment risk'
                ],
                'impact' => "Reduces runway from {$runway['runway_months']} to " . round($newRunway, 1) . " months",
                'recommendation' => $runway['runway_months'] > 12 && $summary['month_to_date']['revenue'] > 0 ?
                    'Recommended if revenue trend continues' :
                    'Not recommended - improve cash position first'
            ],
            [
                'title' => 'Hire Contractor',
                'pros' => [
                    'Flexible commitment',
                    'Quick start',
                    'Lower fixed costs'
                ],
                'cons' => [
                    'Higher hourly rate',
                    'Less integration',
                    'Knowledge transfer risk'
                ],
                'impact' => 'Variable cost, minimal runway impact',
                'recommendation' => 'Safe option for testing demand'
            ],
            [
                'title' => 'Wait 2-3 Months',
                'pros' => [
                    'More data on revenue trend',
                    'Better cash position',
                    'Reduced risk'
                ],
                'cons' => [
                    'Potential opportunity cost',
                    'Team burnout risk',
                    'Market timing risk'
                ],
                'impact' => 'Extends runway, preserves capital',
                'recommendation' => $runway['status'] === 'critical' ? 'Strongly recommended' : 'Conservative approach'
            ]
        ];

        return [
            'scenario_type' => 'hiring',
            'title' => 'Should you hire a new team member?',
            'context' => "Current runway: {$runway['runway_months']} months, Monthly revenue: $" . number_format($summary['month_to_date']['revenue'], 2),
            'options' => $options,
            'ai_recommendation' => $runway['status'] === 'healthy' && $summary['month_to_date']['revenue'] > $newSalary * 2 ?
                'Based on your financials, hiring is viable. Recommend starting with a contractor to validate need.' :
                'Cash position suggests waiting. Focus on revenue growth first.'
        ];
    }

    /**
     * Store decision scenario
     */
    private function storeDecisionScenario($companyId, $scenario) {
        $this->db->insert('decision_scenarios', [
            'company_id' => $companyId,
            'scenario_type' => $scenario['scenario_type'],
            'title' => $scenario['title'],
            'context' => $scenario['context'],
            'options' => json_encode($scenario['options']),
            'ai_recommendation' => $scenario['ai_recommendation']
        ]);
    }

    /**
     * Pricing decision (placeholder)
     */
    private function pricingDecision($companyId, $context) {
        // TODO: Implement pricing analysis
        return null;
    }

    /**
     * Expansion decision (placeholder)
     */
    private function expansionDecision($companyId, $context) {
        // TODO: Implement expansion analysis
        return null;
    }
}
