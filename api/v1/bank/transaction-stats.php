<?php
/**
 * Get transaction statistics for a company
 *
 * GET /api/v1/bank/transaction-stats?from_date=2025-01-01&to_date=2025-01-21
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
    // Authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company ID
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance()->getConnection();

    // Date range
    $fromDate = $_GET['from_date'] ?? date('Y-01-01');
    $toDate = $_GET['to_date'] ?? date('Y-m-d');

    // Get transaction stats from bank_transactions via bank_accounts
    $sql = "
        SELECT
            COUNT(*) as total_transactions,
            COUNT(DISTINCT ba.id) as active_accounts,
            COALESCE(SUM(CASE WHEN bt.amount > 0 THEN bt.amount ELSE 0 END), 0) as total_credits,
            COALESCE(SUM(CASE WHEN bt.amount < 0 THEN ABS(bt.amount) ELSE 0 END), 0) as total_debits,
            COALESCE(SUM(bt.amount), 0) as net_flow
        FROM bank_accounts ba
        LEFT JOIN bank_transactions bt ON ba.id = bt.bank_account_id
            AND bt.transaction_date BETWEEN :from_date AND :to_date
        WHERE ba.company_id = :company_id
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        'company_id' => $companyId,
        'from_date' => $fromDate,
        'to_date' => $toDate
    ]);

    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    // Get transaction breakdown by type
    $typeSql = "
        SELECT
            COALESCE(bt.transaction_type, 'other') as type,
            COUNT(*) as count,
            COALESCE(SUM(bt.amount), 0) as total
        FROM bank_accounts ba
        LEFT JOIN bank_transactions bt ON ba.id = bt.bank_account_id
            AND bt.transaction_date BETWEEN :from_date AND :to_date
        WHERE ba.company_id = :company_id
        GROUP BY bt.transaction_type
    ";

    $typeStmt = $db->prepare($typeSql);
    $typeStmt->execute([
        'company_id' => $companyId,
        'from_date' => $fromDate,
        'to_date' => $toDate
    ]);

    $breakdown = $typeStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => [
            'summary' => $stats,
            'breakdown_by_type' => $breakdown
        ],
        'date_range' => [
            'from' => $fromDate,
            'to' => $toDate
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
