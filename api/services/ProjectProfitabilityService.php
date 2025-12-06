<?php
/**
 * Project Profitability Dashboard Service
 * E3-US09: Calculate and track project profitability metrics
 *
 * Features:
 * - Revenue tracking (invoices, payments)
 * - Cost tracking (materials, labor, overhead)
 * - Profit margin calculations
 * - Budget vs actual analysis
 * - Profitability trends
 * - Project comparison
 */

require_once __DIR__ . '/../config/database.php';

class ProjectProfitabilityService {
    private static ?ProjectProfitabilityService $instance = null;
    private PDO $pdo;

    // Cost categories
    private array $costCategories = [
        'materials' => [
            'name' => 'Materiale',
            'icon' => 'package',
            'color' => '#3B82F6'
        ],
        'labor' => [
            'name' => 'Manoperă',
            'icon' => 'users',
            'color' => '#10B981'
        ],
        'equipment' => [
            'name' => 'Echipamente',
            'icon' => 'tool',
            'color' => '#F59E0B'
        ],
        'subcontractors' => [
            'name' => 'Subcontractori',
            'icon' => 'briefcase',
            'color' => '#8B5CF6'
        ],
        'transport' => [
            'name' => 'Transport',
            'icon' => 'truck',
            'color' => '#EC4899'
        ],
        'permits' => [
            'name' => 'Autorizații/Taxe',
            'icon' => 'file-text',
            'color' => '#6366F1'
        ],
        'overhead' => [
            'name' => 'Cheltuieli Generale',
            'icon' => 'settings',
            'color' => '#64748B'
        ],
        'other' => [
            'name' => 'Altele',
            'icon' => 'more-horizontal',
            'color' => '#94A3B8'
        ]
    ];

    // Profitability thresholds
    private array $thresholds = [
        'excellent' => ['min' => 25, 'label' => 'Excelent', 'color' => '#10B981'],
        'good' => ['min' => 15, 'label' => 'Bun', 'color' => '#3B82F6'],
        'acceptable' => ['min' => 8, 'label' => 'Acceptabil', 'color' => '#F59E0B'],
        'poor' => ['min' => 0, 'label' => 'Slab', 'color' => '#EF4444'],
        'loss' => ['min' => -100, 'label' => 'Pierdere', 'color' => '#DC2626']
    ];

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): ProjectProfitabilityService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getCostCategories(): array {
        return $this->costCategories;
    }

    public function getThresholds(): array {
        return $this->thresholds;
    }

    /**
     * Get project profitability summary
     */
    public function getProjectProfitability(string $companyId, string $projectId): array {
        // Get project details (using correct column names: budget, actual_cost, progress_percentage)
        $stmt = $this->pdo->prepare("
            SELECT * FROM construction_projects WHERE id = ? AND company_id = ?
        ");
        $stmt->execute([$projectId, $companyId]);
        $project = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$project) {
            throw new Exception('Project not found');
        }

        // Get revenue (budget is the contract/revenue value)
        $contractValue = floatval($project['budget'] ?? 0);

        // Get invoiced amount from project expenses (since invoices don't have project_id)
        // We'll use budget as contract value and actual_cost as spent
        $invoicedAmount = floatval($project['actual_cost'] ?? 0);

        // Get costs by category
        $costs = $this->getProjectCosts($companyId, $projectId);

        // Calculate metrics
        $totalRevenue = $contractValue;
        $totalCosts = $costs['total'] > 0 ? $costs['total'] : $invoicedAmount;
        $grossProfit = $totalRevenue - $totalCosts;
        $grossMargin = $totalRevenue > 0 ? ($grossProfit / $totalRevenue) * 100 : 0;

        // Budget analysis (actual_cost vs budget)
        $budgetedCost = $contractValue * 0.8; // Assume 80% of budget should be costs
        $budgetVariance = $budgetedCost > 0 ? (($budgetedCost - $totalCosts) / $budgetedCost) * 100 : 0;
        $costOverrun = $totalCosts > $budgetedCost;

        // Determine profitability status
        $status = $this->getProfitabilityStatus($grossMargin);

        return [
            'project' => [
                'id' => $project['id'],
                'name' => $project['name'],
                'status' => $project['status'],
                'start_date' => $project['start_date'],
                'end_date' => $project['end_date'],
                'completion_percentage' => floatval($project['progress_percentage'] ?? 0)
            ],
            'revenue' => [
                'contract_value' => $contractValue,
                'invoiced' => $invoicedAmount,
                'collected' => $invoicedAmount,
                'outstanding' => 0
            ],
            'costs' => $costs,
            'profitability' => [
                'gross_profit' => round($grossProfit, 2),
                'gross_margin' => round($grossMargin, 2),
                'status' => $status,
                'budgeted_cost' => $budgetedCost,
                'actual_cost' => $totalCosts,
                'budget_variance' => round($budgetVariance, 2),
                'cost_overrun' => $costOverrun
            ]
        ];
    }

    /**
     * Get project costs breakdown
     */
    public function getProjectCosts(string $companyId, string $projectId): array {
        $breakdown = [];
        $total = 0;

        // Materials from material_usage_log joined to material_catalog for pricing
        $stmt = $this->pdo->prepare("
            SELECT COALESCE(SUM(mul.quantity_used * COALESCE(mc.unit_price, 0)), 0) as cost
            FROM material_usage_log mul
            LEFT JOIN material_catalog mc ON mul.material_id = mc.id
            WHERE mul.project_id = ?
        ");
        $stmt->execute([$projectId]);
        $materialCost = floatval($stmt->fetchColumn());
        $breakdown['materials'] = $materialCost;
        $total += $materialCost;

        // Labor from worker_time_entries
        $stmt2 = $this->pdo->prepare("
            SELECT COALESCE(SUM(wte.hours * COALESCE(wte.hourly_rate, 50)), 0) as cost
            FROM worker_time_entries wte
            WHERE wte.project_id = ?
        ");
        $stmt2->execute([$projectId]);
        $laborCost = floatval($stmt2->fetchColumn());
        $breakdown['labor'] = $laborCost;
        $total += $laborCost;

        // Project expenses
        $stmt3 = $this->pdo->prepare("
            SELECT category, COALESCE(SUM(amount), 0) as cost
            FROM project_expenses
            WHERE project_id = ?
            GROUP BY category
        ");
        $stmt3->execute([$projectId]);
        while ($row = $stmt3->fetch(PDO::FETCH_ASSOC)) {
            $cat = $row['category'] ?? 'other';
            if (!isset($breakdown[$cat])) {
                $breakdown[$cat] = 0;
            }
            $breakdown[$cat] += floatval($row['cost']);
            $total += floatval($row['cost']);
        }

        // Permit fees
        $stmt4 = $this->pdo->prepare("
            SELECT COALESCE(SUM(fee_amount), 0) as cost
            FROM project_permits
            WHERE project_id = ? AND fee_paid = true
        ");
        $stmt4->execute([$projectId]);
        $permitCost = floatval($stmt4->fetchColumn());
        $breakdown['permits'] = ($breakdown['permits'] ?? 0) + $permitCost;
        $total += $permitCost;

        // Format breakdown with category info
        $formattedBreakdown = [];
        foreach ($this->costCategories as $key => $info) {
            $cost = $breakdown[$key] ?? 0;
            $formattedBreakdown[] = [
                'category' => $key,
                'name' => $info['name'],
                'icon' => $info['icon'],
                'color' => $info['color'],
                'amount' => round($cost, 2),
                'percentage' => $total > 0 ? round(($cost / $total) * 100, 1) : 0
            ];
        }

        // Sort by amount descending
        usort($formattedBreakdown, fn($a, $b) => $b['amount'] <=> $a['amount']);

        return [
            'breakdown' => $formattedBreakdown,
            'total' => round($total, 2)
        ];
    }

    /**
     * Get profitability dashboard for all projects
     */
    public function getDashboard(string $companyId, array $filters = []): array {
        $sql = "
            SELECT cp.*,
                   COALESCE(cp.budget, 0) as budget,
                   COALESCE(cp.actual_cost, 0) as actual_cost
            FROM construction_projects cp
            WHERE cp.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['status'])) {
            $sql .= " AND cp.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['year'])) {
            $sql .= " AND EXTRACT(YEAR FROM cp.start_date) = ?";
            $params[] = $filters['year'];
        }

        $sql .= " ORDER BY cp.created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $dashboard = [
            'summary' => [
                'total_projects' => count($projects),
                'total_contract_value' => 0,
                'total_costs' => 0,
                'total_profit' => 0,
                'average_margin' => 0,
                'profitable_projects' => 0,
                'loss_projects' => 0
            ],
            'projects' => [],
            'by_status' => []
        ];

        $margins = [];
        $byStatus = [];

        foreach ($projects as $project) {
            try {
                $profitability = $this->getProjectProfitability($companyId, $project['id']);

                $contractValue = $profitability['revenue']['contract_value'];
                $totalCosts = $profitability['costs']['total'];
                $grossProfit = $profitability['profitability']['gross_profit'];
                $grossMargin = $profitability['profitability']['gross_margin'];

                $dashboard['summary']['total_contract_value'] += $contractValue;
                $dashboard['summary']['total_costs'] += $totalCosts;
                $dashboard['summary']['total_profit'] += $grossProfit;

                if ($grossProfit >= 0) {
                    $dashboard['summary']['profitable_projects']++;
                } else {
                    $dashboard['summary']['loss_projects']++;
                }

                $margins[] = $grossMargin;

                // Track by status
                $status = $project['status'];
                if (!isset($byStatus[$status])) {
                    $byStatus[$status] = ['count' => 0, 'revenue' => 0, 'profit' => 0];
                }
                $byStatus[$status]['count']++;
                $byStatus[$status]['revenue'] += $contractValue;
                $byStatus[$status]['profit'] += $grossProfit;

                $dashboard['projects'][] = [
                    'id' => $project['id'],
                    'name' => $project['name'],
                    'status' => $project['status'],
                    'contract_value' => $contractValue,
                    'total_costs' => $totalCosts,
                    'gross_profit' => $grossProfit,
                    'gross_margin' => $grossMargin,
                    'profitability_status' => $profitability['profitability']['status'],
                    'completion' => floatval($project['progress_percentage'] ?? 0)
                ];
            } catch (Exception $e) {
                // Skip projects with errors
                continue;
            }
        }

        // Calculate average margin
        if (count($margins) > 0) {
            $dashboard['summary']['average_margin'] = round(array_sum($margins) / count($margins), 2);
        }

        // Overall margin
        if ($dashboard['summary']['total_contract_value'] > 0) {
            $dashboard['summary']['overall_margin'] = round(
                ($dashboard['summary']['total_profit'] / $dashboard['summary']['total_contract_value']) * 100,
                2
            );
        }

        $dashboard['by_status'] = $byStatus;

        return $dashboard;
    }

    /**
     * Get profitability trends over time
     */
    public function getTrends(string $companyId, int $months = 12): array {
        $stmt = $this->pdo->prepare("
            SELECT
                DATE_TRUNC('month', cp.start_date) as month,
                COUNT(*) as project_count,
                COALESCE(SUM(cp.budget), 0) as total_revenue,
                COALESCE(SUM(cp.actual_cost), 0) as estimated_costs
            FROM construction_projects cp
            WHERE cp.company_id = ?
              AND cp.start_date >= CURRENT_DATE - INTERVAL '1 month' * ?
            GROUP BY DATE_TRUNC('month', cp.start_date)
            ORDER BY month
        ");
        $stmt->execute([$companyId, $months]);
        $monthlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $trends = [];
        foreach ($monthlyData as $data) {
            $revenue = floatval($data['total_revenue']);
            $costs = floatval($data['estimated_costs']);
            $profit = $revenue - $costs;
            $margin = $revenue > 0 ? ($profit / $revenue) * 100 : 0;

            $trends[] = [
                'month' => $data['month'],
                'project_count' => intval($data['project_count']),
                'revenue' => round($revenue, 2),
                'costs' => round($costs, 2),
                'profit' => round($profit, 2),
                'margin' => round($margin, 2)
            ];
        }

        return $trends;
    }

    /**
     * Compare projects profitability
     */
    public function compareProjects(string $companyId, array $projectIds): array {
        $comparison = [];

        foreach ($projectIds as $projectId) {
            try {
                $profitability = $this->getProjectProfitability($companyId, $projectId);
                $comparison[] = [
                    'project' => $profitability['project'],
                    'revenue' => $profitability['revenue']['contract_value'],
                    'costs' => $profitability['costs']['total'],
                    'profit' => $profitability['profitability']['gross_profit'],
                    'margin' => $profitability['profitability']['gross_margin'],
                    'status' => $profitability['profitability']['status'],
                    'cost_breakdown' => $profitability['costs']['breakdown']
                ];
            } catch (Exception $e) {
                continue;
            }
        }

        // Sort by margin descending
        usort($comparison, fn($a, $b) => $b['margin'] <=> $a['margin']);

        return [
            'projects' => $comparison,
            'best_performer' => $comparison[0] ?? null,
            'worst_performer' => end($comparison) ?: null
        ];
    }

    /**
     * Get cost efficiency metrics
     */
    public function getCostEfficiency(string $companyId, string $projectId): array {
        $profitability = $this->getProjectProfitability($companyId, $projectId);

        $contractValue = $profitability['revenue']['contract_value'];
        $totalCosts = $profitability['costs']['total'];
        $completion = $profitability['project']['completion_percentage'];

        // Calculate efficiency metrics
        $costPerCompletion = $completion > 0 ? $totalCosts / ($completion / 100) : 0;
        $projectedFinalCost = $completion > 0 ? ($totalCosts / $completion) * 100 : $totalCosts;
        $projectedProfit = $contractValue - $projectedFinalCost;
        $projectedMargin = $contractValue > 0 ? ($projectedProfit / $contractValue) * 100 : 0;

        // Labor efficiency
        $laborCost = 0;
        foreach ($profitability['costs']['breakdown'] as $item) {
            if ($item['category'] === 'labor') {
                $laborCost = $item['amount'];
                break;
            }
        }
        $laborRatio = $totalCosts > 0 ? ($laborCost / $totalCosts) * 100 : 0;

        return [
            'current' => [
                'costs' => $totalCosts,
                'completion' => $completion,
                'margin' => $profitability['profitability']['gross_margin']
            ],
            'projected' => [
                'final_cost' => round($projectedFinalCost, 2),
                'profit' => round($projectedProfit, 2),
                'margin' => round($projectedMargin, 2)
            ],
            'efficiency' => [
                'cost_per_percent' => round($costPerCompletion, 2),
                'labor_ratio' => round($laborRatio, 2),
                'on_budget' => $projectedFinalCost <= $profitability['profitability']['budgeted_cost']
            ]
        ];
    }

    /**
     * Get profitability status label
     */
    private function getProfitabilityStatus(float $margin): array {
        foreach ($this->thresholds as $key => $threshold) {
            if ($margin >= $threshold['min']) {
                return [
                    'key' => $key,
                    'label' => $threshold['label'],
                    'color' => $threshold['color']
                ];
            }
        }
        return $this->thresholds['loss'];
    }
}
