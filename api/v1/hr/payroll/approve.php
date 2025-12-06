<?php
/**
 * POST /api/v1/hr/payroll/approve
 * Approve a payroll period
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Verify authentication
    $authHeader = getHeader('authorization', '');

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company context
    $companyId = getHeader('x-company-id');
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['period_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Period ID required']);
        exit;
    }

    $period_id = $input['period_id'];

    $db = Database::getInstance()->getConnection();

    // Verify period exists and belongs to company
    $stmt = $db->prepare("
        SELECT * FROM payroll_periods
        WHERE id = :id AND company_id = :company_id
    ");
    $stmt->execute([
        'id' => $period_id,
        'company_id' => $companyId
    ]);
    $period = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$period) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Payroll period not found']);
        exit;
    }

    if ($period['status'] !== 'calculated') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Can only approve calculated payroll']);
        exit;
    }

    // Approve period
    $stmt = $db->prepare("
        UPDATE payroll_periods SET
            status = 'approved',
            approved_at = NOW(),
            approved_by = :user_id,
            updated_at = NOW()
        WHERE id = :id
    ");
    $stmt->execute([
        'id' => $period_id,
        'user_id' => $userData['user_id']
    ]);

    // Update all items to approved
    $stmt = $db->prepare("
        UPDATE payroll_items SET
            status = 'approved',
            updated_at = NOW()
        WHERE payroll_period_id = :period_id
    ");
    $stmt->execute(['period_id' => $period_id]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Payroll approved successfully'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
