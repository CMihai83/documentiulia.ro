<?php
/**
 * MBA Knowledge Service
 * Integrates Personal MBA library with fiscal/legal consultation
 *
 * Features:
 * - Access to 99 Personal MBA books
 * - Framework extraction and application
 * - MBA-enhanced fiscal recommendations
 * - User learning progress tracking
 * - Business strategy + fiscal optimization hybrid
 */

require_once __DIR__ . '/../config/database.php';

class MBAKnowledgeService {
    private $db;

    // Core MBA frameworks for business decisions
    private $coreFrameworks = [
        '80_20_principle' => [
            'name' => 'The 80/20 Principle (Pareto)',
            'book_id' => 39,
            'when_to_use' => 'Identifying which activities/customers drive most results',
            'fiscal_application' => 'Focus deductible expense tracking on top 20% cost categories that represent 80% of expenses'
        ],
        'value_creation' => [
            'name' => 'Value Creation Methods',
            'book_id' => 1,
            'when_to_use' => 'Deciding what products/services to offer',
            'fiscal_application' => 'Structure revenue streams to optimize tax regime (microenterprise vs profit tax)'
        ],
        'lean_thinking' => [
            'name' => 'Lean Methodology',
            'book_id' => 3,
            'when_to_use' => 'Starting new venture or testing business ideas',
            'fiscal_application' => 'Minimize initial capital requirements to stay under microenterprise threshold'
        ],
        'blue_ocean_strategy' => [
            'name' => 'Blue Ocean Strategy',
            'book_id' => 85,
            'when_to_use' => 'Finding uncontested market spaces',
            'fiscal_application' => 'Position business in category with favorable fiscal treatment'
        ],
        'systems_thinking' => [
            'name' => 'Systems Thinking',
            'book_id' => 72,
            'when_to_use' => 'Understanding interconnected business processes',
            'fiscal_application' => 'Optimize entire tax system (CAS, CASS, TVA) not individual components'
        ],
        'financial_intelligence' => [
            'name' => 'Financial Intelligence',
            'book_id' => 23,
            'when_to_use' => 'Reading financial statements and making fiscal decisions',
            'fiscal_application' => 'Understand how fiscal choices impact balance sheet and cash flow'
        ]
    ];

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get all MBA books with optional filtering
     */
    public function getAllBooks($category = null, $limit = null) {
        try {
            $sql = "SELECT
                        id,
                        book_number,
                        title,
                        author,
                        category,
                        core_concept,
                        key_frameworks,
                        summary,
                        practical_applications
                    FROM mba_books
                    WHERE is_active = TRUE";

            $params = [];

            if ($category) {
                $sql .= " AND category = :category";
                $params['category'] = $category;
            }

            $sql .= " ORDER BY book_number ASC";

            if ($limit) {
                $sql .= " LIMIT :limit";
                $params['limit'] = $limit;
            }

            $books = $this->db->fetchAll($sql, $params);

            return [
                'success' => true,
                'books' => $books,
                'total' => count($books)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load books: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get books by category grouped
     */
    public function getBooksByCategory() {
        try {
            $sql = "SELECT
                        category,
                        COUNT(*) as book_count,
                        json_agg(
                            json_build_object(
                                'id', id,
                                'book_number', book_number,
                                'title', title,
                                'author', author,
                                'core_concept', core_concept
                            ) ORDER BY book_number
                        ) as books
                    FROM mba_books
                    WHERE is_active = TRUE
                    GROUP BY category
                    ORDER BY category";

            $categories = $this->db->fetchAll($sql);

            foreach ($categories as &$cat) {
                $cat['books'] = json_decode($cat['books'], true);
            }

            return [
                'success' => true,
                'categories' => $categories
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load categories: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get MBA recommendations for a fiscal situation
     */
    public function getMBARecommendations($fiscalSituation, $userContext = null) {
        try {
            $recommendations = [];

            // Analyze situation and suggest relevant MBA frameworks
            $situationType = $this->analyzeSituationType($fiscalSituation);

            switch ($situationType) {
                case 'business_start':
                    $recommendations = $this->getStartupRecommendations($userContext);
                    break;

                case 'tax_optimization':
                    $recommendations = $this->getTaxOptimizationRecommendations($userContext);
                    break;

                case 'growth_scaling':
                    $recommendations = $this->getGrowthRecommendations($userContext);
                    break;

                case 'profitability':
                    $recommendations = $this->getProfitabilityRecommendations($userContext);
                    break;

                case 'employee_management':
                    $recommendations = $this->getEmployeeRecommendations($userContext);
                    break;

                default:
                    $recommendations = $this->getGeneralRecommendations($userContext);
            }

            return [
                'success' => true,
                'situation_type' => $situationType,
                'recommendations' => $recommendations
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to generate recommendations: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Analyze what type of situation the user is in
     */
    private function analyzeSituationType($fiscalSituation) {
        $situation = mb_strtolower($fiscalSituation);

        if (preg_match('/start|început|lansare|deschid|nou/i', $situation)) {
            return 'business_start';
        }

        if (preg_match('/optimiz|reduc|economic|impozit|taxă/i', $situation)) {
            return 'tax_optimization';
        }

        if (preg_match('/creșt|scalare|expand|dezvolt/i', $situation)) {
            return 'growth_scaling';
        }

        if (preg_match('/profit|venit|cash.*flow|lichiditate/i', $situation)) {
            return 'profitability';
        }

        if (preg_match('/angajat|salariat|echipă|personal/i', $situation)) {
            return 'employee_management';
        }

        return 'general';
    }

    /**
     * Get recommendations for business startup
     */
    private function getStartupRecommendations($userContext) {
        return [
            [
                'framework' => 'Lean Startup',
                'book' => 'The Lean Startup - Eric Ries',
                'book_id' => 3,
                'recommendation' => 'Start with minimum viable product (MVP) to test market demand before committing capital',
                'fiscal_benefit' => 'Keep initial investment under microenterprise threshold (500,000 EUR) for 1% tax rate',
                'tactical_steps' => [
                    'Register as PFA or microenterprise initially (lowest setup cost)',
                    'Test business model with minimal expenses',
                    'Track revenue carefully to anticipate TVA registration threshold',
                    'Plan transition to SRL only when validated and profitable'
                ],
                'estimated_savings' => '40-60% lower tax burden in first 2 years vs SRL'
            ],
            [
                'framework' => 'Value Creation Methods',
                'book' => 'The Personal MBA - Josh Kaufman',
                'book_id' => 1,
                'recommendation' => 'Choose business model that creates clear value: Product, Service, Shared Resource, Subscription, or Resale',
                'fiscal_benefit' => 'Different business models have different fiscal implications (services = lower inventory costs = simpler accounting)',
                'tactical_steps' => [
                    'Service businesses: Simpler tax compliance, lower overhead',
                    'Product businesses: Inventory management affects cash flow and taxation',
                    'Digital products: Minimal marginal cost, favorable profit margins',
                    'Choose model that aligns with available fiscal regime benefits'
                ]
            ],
            [
                'framework' => '80/20 Principle',
                'book' => 'The 80/20 Principle - Richard Koch',
                'book_id' => 39,
                'recommendation' => 'Focus on the 20% of activities that will generate 80% of results',
                'fiscal_benefit' => 'Prioritize revenue-generating activities over complex administrative setup',
                'tactical_steps' => [
                    'Start selling before perfecting accounting system',
                    'Use simple cloud accounting (reduces accountant costs)',
                    'Focus on high-margin offerings first',
                    'Delegate low-value tasks (use PFA freelancers instead of employees initially)'
                ]
            ]
        ];
    }

    /**
     * Get tax optimization recommendations
     */
    private function getTaxOptimizationRecommendations($userContext) {
        $revenue = $userContext['current_year_revenue'] ?? 0;
        $employees = $userContext['employee_count'] ?? 0;

        $recommendations = [
            [
                'framework' => 'Systems Thinking',
                'book' => 'Thinking in Systems - Donella Meadows',
                'book_id' => 72,
                'recommendation' => 'Optimize the entire fiscal system, not individual components',
                'fiscal_benefit' => 'Total tax burden reduction by understanding interactions between taxes',
                'tactical_steps' => [
                    'Map all taxes: microenterprise (1-3%), CAS (25%), CASS (10%), TVA (19%)',
                    'Identify leverage points (e.g., hiring 1 employee → 2% tax savings on all revenue)',
                    'Model scenarios: PFA vs Micro vs SRL vs Dividends',
                    'Calculate effective tax rate across all components'
                ]
            ],
            [
                'framework' => 'Financial Intelligence',
                'book' => 'Financial Intelligence for Entrepreneurs - Berman & Knight',
                'book_id' => 23,
                'recommendation' => 'Understand how fiscal choices impact financial statements',
                'fiscal_benefit' => 'Make tax decisions based on cash flow impact, not just tax rate',
                'tactical_steps' => [
                    'Calculate real cash impact of each tax scenario',
                    'Consider timing: when are taxes paid vs when cash is received?',
                    'Evaluate: Is 16% profit tax + reinvestment better than 1% micro + dividends?',
                    'Track: Revenue - All Taxes - Operating Costs = True Profitability'
                ]
            ]
        ];

        // Add specific recommendation based on revenue
        if ($revenue > 0 && $revenue < 300000) {
            $recommendations[] = [
                'framework' => 'The 1% Windfall',
                'book' => 'The 1% Windfall - Rafi Mohammed',
                'book_id' => 25,
                'recommendation' => 'Strategic pricing to stay under TVA threshold while maximizing profit',
                'fiscal_benefit' => 'Avoid 19% TVA registration saves administrative burden and cash flow',
                'tactical_steps' => [
                    'Current revenue: ' . number_format($revenue, 0, ',', '.') . ' lei',
                    'TVA threshold: 300,000 lei',
                    'Safety margin: Keep revenue at ~280,000 lei max',
                    'Increase prices by 10-15% to compensate for volume limitation',
                    'Focus on high-margin clients (80/20 principle)'
                ]
            ];
        }

        return $recommendations;
    }

    /**
     * Get growth/scaling recommendations
     */
    private function getGrowthRecommendations($userContext) {
        return [
            [
                'framework' => 'Blue Ocean Strategy',
                'book' => 'Blue Ocean Strategy - Kim & Mauborgne',
                'book_id' => 85,
                'recommendation' => 'Create uncontested market space instead of competing in crowded markets',
                'fiscal_benefit' => 'Higher margins = same revenue with better profitability and tax efficiency',
                'tactical_steps' => [
                    'Identify what competitors compete on (price, features, service)',
                    'Find dimension that NO ONE competes on',
                    'Example: If everyone competes on price → compete on convenience',
                    'Higher perceived value = higher prices = fewer transactions to reach goals'
                ]
            ],
            [
                'framework' => 'Competitive Strategy',
                'book' => 'Competitive Strategy - Michael Porter',
                'book_id' => 84,
                'recommendation' => 'Choose strategic position: Cost Leadership, Differentiation, or Focus',
                'fiscal_benefit' => 'Strategic clarity improves resource allocation and tax planning',
                'tactical_steps' => [
                    'Cost Leadership: Optimize for efficiency, deductible expenses critical',
                    'Differentiation: Invest in brand, R&D (check deductibility limits)',
                    'Focus (niche): Lower competition, higher margins, better fiscal outcomes',
                    'Align fiscal structure with strategic choice'
                ]
            ]
        ];
    }

    /**
     * Get profitability recommendations
     */
    private function getProfitabilityRecommendations($userContext) {
        $profitMargin = $userContext['profit_margin'] ?? 0;

        return [
            [
                'framework' => 'The Goal (Theory of Constraints)',
                'book' => 'The Goal - Eliyahu Goldratt',
                'book_id' => 21,
                'recommendation' => 'Identify and eliminate your #1 constraint (bottleneck)',
                'fiscal_benefit' => 'Increase throughput without proportional increase in costs = better margins = more profit to optimize fiscally',
                'tactical_steps' => [
                    'Current margin: ' . round($profitMargin, 1) . '%',
                    'Find bottleneck: What limits your revenue generation?',
                    'Examples: Time? Client acquisition? Production capacity?',
                    'Focus ALL resources on eliminating that constraint',
                    'Result: More revenue with same or lower costs = higher taxable base but better ROI'
                ]
            ],
            [
                'framework' => 'Lean Thinking',
                'book' => 'Lean Thinking - Womack & Jones',
                'book_id' => 22,
                'recommendation' => 'Eliminate all forms of waste (muda) in your processes',
                'fiscal_benefit' => 'Lower costs = higher profitability = more flexibility in fiscal structure choice',
                'tactical_steps' => [
                    '7 types of waste: Overproduction, Waiting, Transport, Extra Processing, Inventory, Motion, Defects',
                    'Map your value stream: What adds value? What does not?',
                    'Cut non-value-adding expenses (more deductibility does not justify waste)',
                    'Redirect savings to high-ROI investments'
                ]
            ]
        ];
    }

    /**
     * Get employee management recommendations
     */
    private function getEmployeeRecommendations($userContext) {
        return [
            [
                'framework' => 'First, Break All The Rules',
                'book' => 'First, Break All The Rules - Buckingham & Coffman',
                'book_id' => 61,
                'recommendation' => 'Hire for talent, not just skills; manage to strengths',
                'fiscal_benefit' => 'Better employees = higher productivity = revenue growth exceeds salary costs',
                'tactical_steps' => [
                    'For microenterprise: Hire 1 great employee → 2% tax savings on ALL revenue',
                    'Calculate: Tax savings = Revenue × 2% (example: 200k revenue = 4k savings/year)',
                    'Employee cost: Gross salary + 2.25% CAM',
                    'Break-even: If tax savings >= 40% of employee cost, it is profitable',
                    'Plus: Employee generates revenue, not just tax savings!'
                ]
            ],
            [
                'framework' => '12 Elements of Great Managing',
                'book' => '12: The Elements of Great Managing - Wagner & Harter',
                'book_id' => 62,
                'recommendation' => 'Focus on these 12 questions to maximize employee engagement and productivity',
                'fiscal_benefit' => 'Engaged employees generate more revenue per salary cost = better ROI on labor costs',
                'tactical_steps' => [
                    'Key questions: Do I know what is expected? Do I have the tools? Recognition?',
                    'Engagement drives productivity by 20-40%',
                    'Same salary cost, 20-40% more output',
                    'Fiscal impact: Better profitability justifies employee investments'
                ]
            ]
        ];
    }

    /**
     * Get general recommendations
     */
    private function getGeneralRecommendations($userContext) {
        return [
            [
                'framework' => 'The Personal MBA Core Principles',
                'book' => 'The Personal MBA - Josh Kaufman',
                'book_id' => 1,
                'recommendation' => 'Every business succeeds by: Creating value → Marketing → Sales → Delivering → Finance',
                'fiscal_benefit' => 'Understanding the value chain helps optimize fiscal structure at each stage',
                'tactical_steps' => [
                    'Value Creation: What problem do you solve? (Drives pricing strategy)',
                    'Marketing: How do people discover you? (Deductible marketing expenses)',
                    'Sales: How do you convert interest to revenue? (TVA timing considerations)',
                    'Delivery: How do you fulfill? (Deductible operational costs)',
                    'Finance: How do you manage cash? (Working capital for tax payments)'
                ]
            ]
        ];
    }

    /**
     * Get user's MBA learning progress
     */
    public function getUserProgress($userId) {
        try {
            $sql = "SELECT
                        ump.book_id,
                        mb.title,
                        mb.author,
                        mb.category,
                        ump.status,
                        ump.rating,
                        ump.frameworks_mastered,
                        ump.started_at,
                        ump.completed_at
                    FROM user_mba_progress ump
                    JOIN mba_books mb ON ump.book_id = mb.id
                    WHERE ump.user_id = :user_id
                    ORDER BY COALESCE(ump.completed_at, ump.started_at, ump.created_at) DESC";

            $progress = $this->db->fetchAll($sql, ['user_id' => $userId]);

            // Calculate statistics
            $totalBooks = 99;
            $completed = count(array_filter($progress, fn($p) => $p['status'] === 'completed'));
            $reading = count(array_filter($progress, fn($p) => $p['status'] === 'reading'));

            return [
                'success' => true,
                'progress' => $progress,
                'statistics' => [
                    'total_books' => $totalBooks,
                    'completed' => $completed,
                    'reading' => $reading,
                    'not_started' => $totalBooks - $completed - $reading,
                    'completion_percentage' => round(($completed / $totalBooks) * 100, 1)
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load progress: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update user's reading status for a book
     */
    public function updateReadingStatus($userId, $bookId, $status, $rating = null) {
        try {
            $sql = "INSERT INTO user_mba_progress (user_id, book_id, status, rating, started_at, completed_at)
                    VALUES (:user_id, :book_id, :status, :rating,
                            CASE WHEN :status != 'not_started' THEN NOW() ELSE NULL END,
                            CASE WHEN :status = 'completed' THEN NOW() ELSE NULL END)
                    ON CONFLICT (user_id, book_id)
                    DO UPDATE SET
                        status = :status,
                        rating = COALESCE(:rating, user_mba_progress.rating),
                        started_at = COALESCE(user_mba_progress.started_at,
                                            CASE WHEN :status != 'not_started' THEN NOW() ELSE NULL END),
                        completed_at = CASE WHEN :status = 'completed' THEN NOW() ELSE NULL END,
                        updated_at = NOW()";

            $this->db->execute($sql, [
                'user_id' => $userId,
                'book_id' => $bookId,
                'status' => $status,
                'rating' => $rating
            ]);

            return ['success' => true];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to update status: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Search books by keyword
     */
    public function searchBooks($keyword) {
        try {
            $sql = "SELECT
                        id,
                        book_number,
                        title,
                        author,
                        category,
                        core_concept,
                        ts_rank(
                            to_tsvector('english', title || ' ' || author || ' ' || core_concept),
                            plainto_tsquery('english', :keyword)
                        ) as relevance
                    FROM mba_books
                    WHERE is_active = TRUE
                    AND to_tsvector('english', title || ' ' || author || ' ' || core_concept || ' ' || category)
                        @@ plainto_tsquery('english', :keyword)
                    ORDER BY relevance DESC
                    LIMIT 20";

            $results = $this->db->fetchAll($sql, ['keyword' => $keyword]);

            return [
                'success' => true,
                'results' => $results,
                'count' => count($results)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Search failed: ' . $e->getMessage()
            ];
        }
    }
}
