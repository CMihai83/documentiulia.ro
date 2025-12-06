<?php
/**
 * Dashboard Quick Stats Endpoint
 * GET /api/v1/dashboard/quick-stats.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance();

    // Get quick stats for the company
    $stats = [];

    // Total invoices this month
    $invoiceStats = $db->fetchOne(
        "SELECT
            COUNT(*) as total_invoices,
            COALESCE(SUM(total_amount), 0) as total_revenue
         FROM invoices
         WHERE company_id = :company_id
         AND created_at >= date_trunc('month', CURRENT_DATE)",
        ['company_id' => $companyId]
    );
    $stats['invoices_this_month'] = (int)($invoiceStats['total_invoices'] ?? 0);
    $stats['revenue_this_month'] = (float)($invoiceStats['total_revenue'] ?? 0);

    // Total expenses this month
    $expenseStats = $db->fetchOne(
        "SELECT
            COUNT(*) as total_expenses,
            COALESCE(SUM(amount), 0) as total_spent
         FROM expenses
         WHERE company_id = :company_id
         AND created_at >= date_trunc('month', CURRENT_DATE)",
        ['company_id' => $companyId]
    );
    $stats['expenses_this_month'] = (int)($expenseStats['total_expenses'] ?? 0);
    $stats['spent_this_month'] = (float)($expenseStats['total_spent'] ?? 0);

    // Active projects
    $projectStats = $db->fetchOne(
        "SELECT COUNT(*) as active_projects
         FROM projects
         WHERE company_id = :company_id
         AND status IN ('active', 'in_progress', 'planning')",
        ['company_id' => $companyId]
    );
    $stats['active_projects'] = (int)($projectStats['active_projects'] ?? 0);

    // Open tasks
    $taskStats = $db->fetchOne(
        "SELECT COUNT(*) as open_tasks
         FROM tasks
         WHERE company_id = :company_id
         AND status NOT IN ('completed', 'done', 'cancelled')",
        ['company_id' => $companyId]
    );
    $stats['open_tasks'] = (int)($taskStats['open_tasks'] ?? 0);

    // Total contacts
    $contactStats = $db->fetchOne(
        "SELECT COUNT(*) as total_contacts
         FROM contacts
         WHERE company_id = :company_id",
        ['company_id' => $companyId]
    );
    $stats['total_contacts'] = (int)($contactStats['total_contacts'] ?? 0);

    // Net profit this month
    $stats['net_profit_this_month'] = $stats['revenue_this_month'] - $stats['spent_this_month'];

    echo json_encode([
        'success' => true,
        'data' => $stats
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
