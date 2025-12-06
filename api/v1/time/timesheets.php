<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate user
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company context required');
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied');
    }

    $db = new Database();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET - Get timesheet data
    if ($method === 'GET') {
        $employeeId = $_GET['employee_id'] ?? null;
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-t');

        if (!$employeeId) {
            throw new Exception('Employee ID is required');
        }

        // Get daily entries
        $query = "
            SELECT
                te.entry_date,
                te.id,
                te.hours,
                te.description,
                te.is_billable,
                te.hourly_rate,
                c.display_name as customer_name,
                p.name as project_name,
                t.name as task_name
            FROM time_entries te
            LEFT JOIN contacts c ON te.customer_id = c.id
            LEFT JOIN tasks t ON te.task_id = t.id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE te.company_id = $1
              AND te.employee_id = $2
              AND te.entry_date BETWEEN $3 AND $4
            ORDER BY te.entry_date DESC, te.created_at DESC
        ";

        $entries = $db->fetchAll($query, [$companyId, $employeeId, $startDate, $endDate]);

        // Get summary
        $summaryQuery = "
            SELECT
                COUNT(*) as total_entries,
                SUM(hours) as total_hours,
                SUM(CASE WHEN is_billable THEN hours ELSE 0 END) as billable_hours,
                SUM(CASE WHEN NOT is_billable THEN hours ELSE 0 END) as non_billable_hours,
                SUM(CASE WHEN hourly_rate IS NOT NULL THEN hours * hourly_rate ELSE 0 END) as total_amount
            FROM time_entries
            WHERE company_id = $1
              AND employee_id = $2
              AND entry_date BETWEEN $3 AND $4
        ";

        $summary = $db->fetchOne($summaryQuery, [$companyId, $employeeId, $startDate, $endDate]);

        echo json_encode([
            'success' => true,
            'data' => [
                'entries' => $entries,
                'summary' => $summary,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ]
        ]);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
