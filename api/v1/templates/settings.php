<?php
/**
 * Invoice Template Settings API
 * GET /api/v1/templates/settings.php - Get company invoice settings
 * POST /api/v1/templates/settings.php - Save company invoice settings
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/RomanianInvoiceTemplateService.php';
require_once __DIR__ . '/../../helpers/headers.php';

// Authenticate
$authHeader = getHeader('authorization', '') ?? '';
if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authorization required']);
    exit;
}

$authService = new AuthService();
try {
    $auth = $authService->verifyToken($matches[1]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = getHeader('x-company-id', '');
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

try {
    $templateService = RomanianInvoiceTemplateService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $settings = $templateService->getCompanySettings($companyId);

        echo json_encode([
            'success' => true,
            'data' => $settings ?? [
                'default_template_type' => 'factura',
                'invoice_prefix' => 'FCT',
                'auto_number' => true,
                'next_invoice_number' => 1,
                'default_payment_terms' => 30,
                'show_bank_details' => true,
                'primary_color' => '#1a5276'
            ]
        ]);
    } else {
        // POST - save settings
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            throw new Exception('Invalid JSON input');
        }

        $success = $templateService->saveCompanySettings($companyId, $input);

        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Settings saved' : 'Failed to save settings'
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
