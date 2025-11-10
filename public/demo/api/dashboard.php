<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Verify token (simplified for demo - just check if present)
$headers = getallheaders();
$token = $headers['Authorization'] ?? '';

// For demo purposes, any non-empty token is valid
if (empty($token) || strlen($token) < 10) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

// Generate realistic multi-period financial data
$currentMonth = date('Y-m');
$months = [];
for ($i = 11; $i >= 0; $i--) {
    $months[] = date('Y-m', strtotime("-$i months"));
}

// Revenue data with growth trend
$baseRevenue = 45000;
$revenueData = [];
foreach ($months as $index => $month) {
    $growth = 1 + ($index * 0.08); // 8% monthly growth
    $variance = rand(-10, 15) / 100; // Random variance
    $revenue = round($baseRevenue * $growth * (1 + $variance), 2);
    $revenueData[] = [
        'month' => $month,
        'revenue' => $revenue,
        'label' => date('M Y', strtotime($month))
    ];
}

// Expense data
$baseExpenses = 32000;
$expenseData = [];
foreach ($months as $index => $month) {
    $growth = 1 + ($index * 0.05); // 5% monthly growth
    $variance = rand(-8, 12) / 100;
    $expenses = round($baseExpenses * $growth * (1 + $variance), 2);
    $expenseData[] = [
        'month' => $month,
        'expenses' => $expenses,
        'label' => date('M Y', strtotime($month))
    ];
}

// Calculate profit
$profitData = [];
foreach ($revenueData as $index => $rev) {
    $profitData[] = [
        'month' => $rev['month'],
        'profit' => $rev['revenue'] - $expenseData[$index]['expenses'],
        'label' => $rev['label']
    ];
}

// Current month summary
$currentRevenue = end($revenueData)['revenue'];
$currentExpenses = end($expenseData)['expenses'];
$currentProfit = $currentRevenue - $currentExpenses;
$previousRevenue = $revenueData[count($revenueData) - 2]['revenue'];
$previousExpenses = $expenseData[count($expenseData) - 2]['expenses'];
$previousProfit = $previousRevenue - $previousExpenses;

$revenueChange = (($currentRevenue - $previousRevenue) / $previousRevenue) * 100;
$expenseChange = (($currentExpenses - $previousExpenses) / $previousExpenses) * 100;
$profitChange = (($currentProfit - $previousProfit) / $previousProfit) * 100;

// Cash runway calculation
$cashBalance = 145230;
$avgMonthlyBurn = $currentExpenses - $currentRevenue;
$runway = $avgMonthlyBurn > 0 ? round($cashBalance / abs($avgMonthlyBurn), 1) : 999;

// Customer metrics
$customers = [
    ['month' => $months[0], 'count' => 23, 'label' => date('M', strtotime($months[0]))],
    ['month' => $months[1], 'count' => 28, 'label' => date('M', strtotime($months[1]))],
    ['month' => $months[2], 'count' => 31, 'label' => date('M', strtotime($months[2]))],
    ['month' => $months[3], 'count' => 35, 'label' => date('M', strtotime($months[3]))],
    ['month' => $months[4], 'count' => 42, 'label' => date('M', strtotime($months[4]))],
    ['month' => $months[5], 'count' => 48, 'label' => date('M', strtotime($months[5]))],
    ['month' => $months[6], 'count' => 53, 'label' => date('M', strtotime($months[6]))],
    ['month' => $months[7], 'count' => 59, 'label' => date('M', strtotime($months[7]))],
    ['month' => $months[8], 'count' => 67, 'label' => date('M', strtotime($months[8]))],
    ['month' => $months[9], 'count' => 74, 'label' => date('M', strtotime($months[9]))],
    ['month' => $months[10], 'count' => 82, 'label' => date('M', strtotime($months[10]))],
    ['month' => $months[11], 'count' => 89, 'label' => date('M', strtotime($months[11]))]
];

// Recent transactions
$transactions = [
    ['date' => date('Y-m-d', strtotime('-2 days')), 'description' => 'Client Payment - ABC Corp', 'amount' => 8500, 'type' => 'income', 'category' => 'Revenue'],
    ['date' => date('Y-m-d', strtotime('-3 days')), 'description' => 'Office Rent', 'amount' => -3200, 'type' => 'expense', 'category' => 'Rent'],
    ['date' => date('Y-m-d', strtotime('-5 days')), 'description' => 'Employee Salaries', 'amount' => -18500, 'type' => 'expense', 'category' => 'Payroll'],
    ['date' => date('Y-m-d', strtotime('-7 days')), 'description' => 'Client Payment - XYZ Ltd', 'amount' => 12300, 'type' => 'income', 'category' => 'Revenue'],
    ['date' => date('Y-m-d', strtotime('-9 days')), 'description' => 'Software Licenses', 'amount' => -1850, 'type' => 'expense', 'category' => 'Software'],
    ['date' => date('Y-m-d', strtotime('-12 days')), 'description' => 'Marketing Campaign', 'amount' => -4200, 'type' => 'expense', 'category' => 'Marketing'],
    ['date' => date('Y-m-d', strtotime('-14 days')), 'description' => 'Consulting Services', 'amount' => 6800, 'type' => 'income', 'category' => 'Revenue'],
    ['date' => date('Y-m-d', strtotime('-16 days')), 'description' => 'Office Supplies', 'amount' => -580, 'type' => 'expense', 'category' => 'Supplies']
];

// Invoices
$invoices = [
    ['id' => 'INV-2025-089', 'client' => 'ABC Corporation', 'amount' => 8500, 'status' => 'paid', 'date' => date('Y-m-d', strtotime('-2 days')), 'dueDate' => date('Y-m-d', strtotime('-2 days'))],
    ['id' => 'INV-2025-088', 'client' => 'XYZ Limited', 'amount' => 12300, 'status' => 'paid', 'date' => date('Y-m-d', strtotime('-7 days')), 'dueDate' => date('Y-m-d', strtotime('-7 days'))],
    ['id' => 'INV-2025-087', 'client' => 'Tech Solutions Inc', 'amount' => 5400, 'status' => 'overdue', 'date' => date('Y-m-d', strtotime('-45 days')), 'dueDate' => date('Y-m-d', strtotime('-15 days'))],
    ['id' => 'INV-2025-086', 'client' => 'Global Enterprises', 'amount' => 9200, 'status' => 'pending', 'date' => date('Y-m-d', strtotime('-8 days')), 'dueDate' => date('Y-m-d', strtotime('+7 days'))],
    ['id' => 'INV-2025-085', 'client' => 'Startup Ventures', 'amount' => 3800, 'status' => 'pending', 'date' => date('Y-m-d', strtotime('-5 days')), 'dueDate' => date('Y-m-d', strtotime('+10 days'))]
];

// Smart insights
$insights = [
    [
        'type' => 'warning',
        'title' => 'Invoice Overdue',
        'message' => 'INV-2025-087 from Tech Solutions Inc is 30 days overdue ($5,400). Following up could improve cash flow.',
        'action' => 'Send Reminder',
        'priority' => 'high'
    ],
    [
        'type' => 'opportunity',
        'title' => 'Revenue Growth',
        'message' => 'Revenue increased ' . round($revenueChange, 1) . '% this month. Consider expanding marketing to maintain momentum.',
        'action' => 'View Details',
        'priority' => 'medium'
    ],
    [
        'type' => 'info',
        'title' => 'Cash Runway',
        'message' => ($runway < 999 ? "At current spending, you have approximately $runway months of runway." : "Your cash position is strong with positive cash flow."),
        'action' => 'Create Plan',
        'priority' => $runway < 6 ? 'high' : 'low'
    ],
    [
        'type' => 'success',
        'title' => 'Customer Growth',
        'message' => 'Customer base grew 8.5% this month. Your retention strategy is working well.',
        'action' => 'View Metrics',
        'priority' => 'low'
    ]
];

// Decision support scenarios
$decisions = [
    [
        'id' => 'hire-001',
        'title' => 'Should you hire a new developer?',
        'context' => 'Strong revenue growth but increased workload',
        'options' => [
            [
                'title' => 'Hire Full-Time Developer',
                'pros' => ['Long-term capacity increase', 'Better team cohesion', 'Knowledge retention'],
                'cons' => ['Higher fixed costs ($6,500/month)', 'Longer hiring process'],
                'impact' => 'Reduces runway by 3 months',
                'recommendation' => 'Recommended if revenue trend continues'
            ],
            [
                'title' => 'Contract Freelancer',
                'pros' => ['Flexible commitment', 'Quick start', 'Lower fixed costs'],
                'cons' => ['Higher hourly rate', 'Less integration', 'Knowledge transfer risk'],
                'impact' => 'Variable cost, minimal runway impact',
                'recommendation' => 'Safe option for testing demand'
            ],
            [
                'title' => 'Wait 2-3 Months',
                'pros' => ['More data on revenue trend', 'Better cash position', 'Reduced risk'],
                'cons' => ['Potential opportunity cost', 'Team burnout risk'],
                'impact' => 'Extends runway, may miss opportunities',
                'recommendation' => 'Conservative approach'
            ]
        ]
    ]
];

echo json_encode([
    'success' => true,
    'data' => [
        'summary' => [
            'cashBalance' => $cashBalance,
            'revenue' => $currentRevenue,
            'expenses' => $currentExpenses,
            'profit' => $currentProfit,
            'revenueChange' => round($revenueChange, 1),
            'expenseChange' => round($expenseChange, 1),
            'profitChange' => round($profitChange, 1),
            'runway' => $runway,
            'customers' => end($customers)['count']
        ],
        'charts' => [
            'revenue' => $revenueData,
            'expenses' => $expenseData,
            'profit' => $profitData,
            'customers' => $customers
        ],
        'transactions' => $transactions,
        'invoices' => $invoices,
        'insights' => $insights,
        'decisions' => $decisions
    ]
]);
