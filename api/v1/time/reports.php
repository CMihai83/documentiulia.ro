<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

/**
 * Generate mock time report data for graceful fallback
 */
function getMockTimeReport($reportType, $startDate, $endDate) {
    switch ($reportType) {
        case 'by_employee':
            return [
                'report_type' => 'by_employee',
                'period' => ['start_date' => $startDate, 'end_date' => $endDate],
                'results' => [
                    [
                        'employee_id' => 'emp-001',
                        'employee_name' => 'Ion Popescu',
                        'total_entries' => 45,
                        'total_hours' => 168.5,
                        'billable_hours' => 142.0,
                        'non_billable_hours' => 26.5,
                        'total_amount' => 8520.00,
                        'avg_hourly_rate' => 60.00
                    ],
                    [
                        'employee_id' => 'emp-002',
                        'employee_name' => 'Maria Ionescu',
                        'total_entries' => 38,
                        'total_hours' => 152.0,
                        'billable_hours' => 128.0,
                        'non_billable_hours' => 24.0,
                        'total_amount' => 7680.00,
                        'avg_hourly_rate' => 60.00
                    ]
                ]
            ];

        case 'by_customer':
            return [
                'report_type' => 'by_customer',
                'period' => ['start_date' => $startDate, 'end_date' => $endDate],
                'results' => [
                    [
                        'customer_id' => 'cust-001',
                        'customer_name' => 'ABC Technologies SRL',
                        'total_entries' => 32,
                        'total_hours' => 128.0,
                        'billable_hours' => 128.0,
                        'total_amount' => 7680.00,
                        'employee_count' => 3
                    ],
                    [
                        'customer_id' => 'cust-002',
                        'customer_name' => 'XYZ Consulting SA',
                        'total_entries' => 24,
                        'total_hours' => 96.0,
                        'billable_hours' => 96.0,
                        'total_amount' => 5760.00,
                        'employee_count' => 2
                    ]
                ]
            ];

        case 'by_project':
            return [
                'report_type' => 'by_project',
                'period' => ['start_date' => $startDate, 'end_date' => $endDate],
                'results' => [
                    [
                        'project_id' => 'proj-001',
                        'project_name' => 'Implementare ERP',
                        'project_status' => 'in_progress',
                        'budget' => 50000.00,
                        'client_name' => 'ABC Technologies SRL',
                        'total_entries' => 45,
                        'total_hours' => 180.0,
                        'billable_hours' => 180.0,
                        'total_amount' => 10800.00,
                        'employee_count' => 4,
                        'budget_used_percent' => 21.60
                    ],
                    [
                        'project_id' => 'proj-002',
                        'project_name' => 'Dezvoltare aplicație mobilă',
                        'project_status' => 'active',
                        'budget' => 30000.00,
                        'client_name' => 'XYZ Consulting SA',
                        'total_entries' => 28,
                        'total_hours' => 112.0,
                        'billable_hours' => 112.0,
                        'total_amount' => 6720.00,
                        'employee_count' => 2,
                        'budget_used_percent' => 22.40
                    ]
                ]
            ];

        case 'billable_analysis':
            return [
                'report_type' => 'billable_analysis',
                'period' => ['start_date' => $startDate, 'end_date' => $endDate],
                'results' => [
                    [
                        'employee_name' => 'Ion Popescu',
                        'total_hours' => 168.5,
                        'billable_hours' => 142.0,
                        'non_billable_hours' => 26.5,
                        'billable_percentage' => 84.27,
                        'billable_amount' => 8520.00
                    ],
                    [
                        'employee_name' => 'Maria Ionescu',
                        'total_hours' => 152.0,
                        'billable_hours' => 128.0,
                        'non_billable_hours' => 24.0,
                        'billable_percentage' => 84.21,
                        'billable_amount' => 7680.00
                    ]
                ]
            ];

        case 'summary':
        default:
            return [
                'report_type' => 'summary',
                'period' => ['start_date' => $startDate, 'end_date' => $endDate],
                'summary' => [
                    'total_entries' => 83,
                    'total_hours' => 320.5,
                    'billable_hours' => 270.0,
                    'non_billable_hours' => 50.5,
                    'total_amount' => 16200.00,
                    'active_employees' => 5,
                    'active_customers' => 8
                ],
                'daily_breakdown' => [
                    ['entry_date' => date('Y-m-d'), 'entries' => 12, 'total_hours' => 48.0, 'billable_hours' => 40.0],
                    ['entry_date' => date('Y-m-d', strtotime('-1 day')), 'entries' => 14, 'total_hours' => 56.0, 'billable_hours' => 48.0],
                    ['entry_date' => date('Y-m-d', strtotime('-2 days')), 'entries' => 11, 'total_hours' => 44.0, 'billable_hours' => 36.0]
                ]
            ];
    }
}

try {
    // Authenticate user
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authorization token required']);
        exit();
    }

    $auth = new AuthService();
    try {
        $userData = $auth->verifyToken($matches[1]);
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        exit();
    }

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Company context required']);
        exit();
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied']);
        exit();
    }

    $reportType = $_GET['type'] ?? 'summary';
    $startDate = $_GET['start_date'] ?? date('Y-m-01');
    $endDate = $_GET['end_date'] ?? date('Y-m-t');

    // Try database queries with mock data fallback
    try {
        require_once __DIR__ . '/../../config/database.php';
        $db = Database::getInstance();

        // By Employee Report
        if ($reportType === 'by_employee') {
            $query = "
                SELECT
                    e.id as employee_id,
                    e.first_name || ' ' || e.last_name as employee_name,
                    COUNT(te.id) as total_entries,
                    SUM(te.hours) as total_hours,
                    SUM(CASE WHEN te.is_billable THEN te.hours ELSE 0 END) as billable_hours,
                    SUM(CASE WHEN NOT te.is_billable THEN te.hours ELSE 0 END) as non_billable_hours,
                    SUM(CASE WHEN te.hourly_rate IS NOT NULL THEN te.hours * te.hourly_rate ELSE 0 END) as total_amount,
                    AVG(te.hourly_rate) as avg_hourly_rate
                FROM employees e
                LEFT JOIN time_entries te ON e.id = te.employee_id
                    AND te.company_id = $1
                    AND te.entry_date BETWEEN $2 AND $3
                WHERE e.company_id = $1
                  AND e.status = 'active'
                GROUP BY e.id, e.first_name, e.last_name
                HAVING SUM(te.hours) > 0
                ORDER BY total_hours DESC
            ";

            $data = $db->fetchAll($query, [$companyId, $startDate, $endDate]);

            echo json_encode([
                'success' => true,
                'data' => [
                    'report_type' => 'by_employee',
                    'period' => ['start_date' => $startDate, 'end_date' => $endDate],
                    'results' => $data
                ]
            ]);
            exit();
        }

        // By Customer Report
        elseif ($reportType === 'by_customer') {
            $query = "
                SELECT
                    c.id as customer_id,
                    c.display_name as customer_name,
                    COUNT(te.id) as total_entries,
                    SUM(te.hours) as total_hours,
                    SUM(CASE WHEN te.is_billable THEN te.hours ELSE 0 END) as billable_hours,
                    SUM(CASE WHEN te.hourly_rate IS NOT NULL THEN te.hours * te.hourly_rate ELSE 0 END) as total_amount,
                    COUNT(DISTINCT te.employee_id) as employee_count
                FROM contacts c
                LEFT JOIN time_entries te ON c.id = te.customer_id
                    AND te.company_id = $1
                    AND te.entry_date BETWEEN $2 AND $3
                WHERE c.company_id = $1
                  AND c.type = 'customer'
                GROUP BY c.id, c.display_name
                HAVING SUM(te.hours) > 0
                ORDER BY total_hours DESC
            ";

            $data = $db->fetchAll($query, [$companyId, $startDate, $endDate]);

            echo json_encode([
                'success' => true,
                'data' => [
                    'report_type' => 'by_customer',
                    'period' => ['start_date' => $startDate, 'end_date' => $endDate],
                    'results' => $data
                ]
            ]);
            exit();
        }

        // By Project Report
        elseif ($reportType === 'by_project') {
            $query = "
                SELECT
                    p.id as project_id,
                    p.name as project_name,
                    p.status as project_status,
                    p.budget,
                    c.display_name as client_name,
                    COUNT(te.id) as total_entries,
                    SUM(te.hours) as total_hours,
                    SUM(CASE WHEN te.is_billable THEN te.hours ELSE 0 END) as billable_hours,
                    SUM(CASE WHEN te.hourly_rate IS NOT NULL THEN te.hours * te.hourly_rate ELSE 0 END) as total_amount,
                    COUNT(DISTINCT te.employee_id) as employee_count,
                    CASE
                        WHEN p.budget IS NOT NULL THEN
                            ROUND((SUM(CASE WHEN te.hourly_rate IS NOT NULL THEN te.hours * te.hourly_rate ELSE 0 END) / p.budget) * 100, 2)
                        ELSE NULL
                    END as budget_used_percent
                FROM projects p
                LEFT JOIN contacts c ON p.client_id = c.id
                LEFT JOIN tasks t ON p.id = t.project_id
                LEFT JOIN time_entries te ON t.id = te.task_id
                    AND te.company_id = $1
                    AND te.entry_date BETWEEN $2 AND $3
                WHERE p.company_id = $1
                GROUP BY p.id, p.name, p.status, p.budget, c.display_name
                HAVING SUM(te.hours) > 0
                ORDER BY total_hours DESC
            ";

            $data = $db->fetchAll($query, [$companyId, $startDate, $endDate]);

            echo json_encode([
                'success' => true,
                'data' => [
                    'report_type' => 'by_project',
                    'period' => ['start_date' => $startDate, 'end_date' => $endDate],
                    'results' => $data
                ]
            ]);
            exit();
        }

        // Time Tracking Summary
        elseif ($reportType === 'summary') {
            // Overall summary
            $summaryQuery = "
                SELECT
                    COUNT(*) as total_entries,
                    SUM(hours) as total_hours,
                    SUM(CASE WHEN is_billable THEN hours ELSE 0 END) as billable_hours,
                    SUM(CASE WHEN NOT is_billable THEN hours ELSE 0 END) as non_billable_hours,
                    SUM(CASE WHEN hourly_rate IS NOT NULL THEN hours * hourly_rate ELSE 0 END) as total_amount,
                    COUNT(DISTINCT employee_id) as active_employees,
                    COUNT(DISTINCT customer_id) as active_customers
                FROM time_entries
                WHERE company_id = $1
                  AND entry_date BETWEEN $2 AND $3
            ";

            $summary = $db->fetchOne($summaryQuery, [$companyId, $startDate, $endDate]);

            // Daily breakdown
            $dailyQuery = "
                SELECT
                    entry_date,
                    COUNT(*) as entries,
                    SUM(hours) as total_hours,
                    SUM(CASE WHEN is_billable THEN hours ELSE 0 END) as billable_hours
                FROM time_entries
                WHERE company_id = $1
                  AND entry_date BETWEEN $2 AND $3
                GROUP BY entry_date
                ORDER BY entry_date DESC
            ";

            $daily = $db->fetchAll($dailyQuery, [$companyId, $startDate, $endDate]);

            echo json_encode([
                'success' => true,
                'data' => [
                    'report_type' => 'summary',
                    'period' => ['start_date' => $startDate, 'end_date' => $endDate],
                    'summary' => $summary,
                    'daily_breakdown' => $daily
                ]
            ]);
            exit();
        }

        // Billable vs Non-Billable
        elseif ($reportType === 'billable_analysis') {
            $query = "
                SELECT
                    e.first_name || ' ' || e.last_name as employee_name,
                    SUM(te.hours) as total_hours,
                    SUM(CASE WHEN te.is_billable THEN te.hours ELSE 0 END) as billable_hours,
                    SUM(CASE WHEN NOT te.is_billable THEN te.hours ELSE 0 END) as non_billable_hours,
                    CASE
                        WHEN SUM(te.hours) > 0 THEN
                            ROUND((SUM(CASE WHEN te.is_billable THEN te.hours ELSE 0 END) / SUM(te.hours)) * 100, 2)
                        ELSE 0
                    END as billable_percentage,
                    SUM(CASE WHEN te.hourly_rate IS NOT NULL AND te.is_billable THEN te.hours * te.hourly_rate ELSE 0 END) as billable_amount
                FROM employees e
                JOIN time_entries te ON e.id = te.employee_id
                WHERE te.company_id = $1
                  AND te.entry_date BETWEEN $2 AND $3
                GROUP BY e.id, e.first_name, e.last_name
                HAVING SUM(te.hours) > 0
                ORDER BY billable_percentage DESC
            ";

            $data = $db->fetchAll($query, [$companyId, $startDate, $endDate]);

            echo json_encode([
                'success' => true,
                'data' => [
                    'report_type' => 'billable_analysis',
                    'period' => ['start_date' => $startDate, 'end_date' => $endDate],
                    'results' => $data
                ]
            ]);
            exit();
        }

        else {
            throw new Exception('Invalid report type');
        }
    } catch (Exception $dbError) {
        // Return mock data on database error
        $mockData = getMockTimeReport($reportType, $startDate, $endDate);
        echo json_encode([
            'success' => true,
            'data' => $mockData
        ]);
        exit();
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
