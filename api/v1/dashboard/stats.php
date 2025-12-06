<?php
/**
 * Dashboard Statistics Endpoint
 * GET /api/v1/dashboard/stats
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';

    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company context
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company context required (X-Company-ID header)');
    }

    // Verify user has access to this company
    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        http_response_code(403);
        throw new Exception('Access denied to this company');
    }

    $db = Database::getInstance();

    // Get total revenue (sum of all invoices)
    $revenueResult = $db->fetchOne(
        "SELECT COALESCE(SUM(total_amount), 0) as total_revenue
         FROM invoices
         WHERE company_id = :company_id",
        ['company_id' => $companyId]
    );
    $totalRevenue = (float) $revenueResult['total_revenue'];

    // Get total expenses
    $expensesResult = $db->fetchOne(
        "SELECT COALESCE(SUM(amount), 0) as total_expenses
         FROM expenses
         WHERE company_id = :company_id",
        ['company_id' => $companyId]
    );
    $totalExpenses = (float) $expensesResult['total_expenses'];

    // Get outstanding invoices (unpaid amount)
    $outstandingResult = $db->fetchOne(
        "SELECT COALESCE(SUM(amount_due), 0) as outstanding
         FROM invoices
         WHERE company_id = :company_id AND status != 'paid'",
        ['company_id' => $companyId]
    );
    $outstandingInvoices = (float) $outstandingResult['outstanding'];

    // Get overdue invoices count
    $overdueResult = $db->fetchOne(
        "SELECT COUNT(*) as overdue_count
         FROM invoices
         WHERE company_id = :company_id AND status = 'overdue'",
        ['company_id' => $companyId]
    );
    $overdueInvoices = (int) $overdueResult['overdue_count'];

    // Calculate net profit
    $netProfit = $totalRevenue - $totalExpenses;

    // Get cash balance (total paid - total expenses)
    $paidResult = $db->fetchOne(
        "SELECT COALESCE(SUM(amount_paid), 0) as total_paid
         FROM invoices
         WHERE company_id = :company_id",
        ['company_id' => $companyId]
    );
    $totalPaid = (float) $paidResult['total_paid'];
    $cashBalance = $totalPaid - $totalExpenses;

    echo json_encode([
        'success' => true,
        'data' => [
            'total_revenue' => $totalRevenue,
            'total_expenses' => $totalExpenses,
            'net_profit' => $netProfit,
            'outstanding_invoices' => $outstandingInvoices,
            'overdue_invoices' => $overdueInvoices,
            'cash_balance' => $cashBalance
        ]
    ]);

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
