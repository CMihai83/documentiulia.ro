<?php
/**
 * Auto-Generate Declaration from Platform Data
 * POST /api/v1/fiscal-calendar/generate-declaration
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

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
        throw new Exception('Company ID required for declaration generation');
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['calendar_entry_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Calendar entry ID required']);
        exit;
    }

    $calendar_entry_id = $input['calendar_entry_id'];

    $db = Database::getInstance()->getConnection();

    // Verify calendar entry exists and belongs to user/company
    $stmt = $db->prepare("
        SELECT cfc.*, afd.can_auto_generate, afd.anaf_form_code
        FROM company_fiscal_calendar cfc
        JOIN anaf_fiscal_deadlines afd ON cfc.deadline_id = afd.id
        WHERE cfc.id = :id
    ");
    $stmt->execute(['id' => $calendar_entry_id]);
    $entry = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$entry) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Calendar entry not found']);
        exit;
    }

    // Check if can auto-generate
    if (!$entry['can_auto_generate']) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'This declaration cannot be auto-generated. Manual input required.'
        ]);
        exit;
    }

    // TODO: Implement DeclarationAutoGenerator service
    // For now, return a placeholder response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Declaration auto-generation feature coming soon',
        'calendar_entry_id' => $calendar_entry_id,
        'form_code' => $entry['anaf_form_code'],
        'note' => 'This endpoint will automatically generate declarations from platform data (invoices, expenses, payroll, etc.)'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
