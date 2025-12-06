<?php
/**
 * WhatsApp Messages History API
 * GET - Get message history
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/WhatsAppBusinessService.php';
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
    $whatsappService = WhatsAppBusinessService::getInstance();

    $phone = $_GET['phone'] ?? null;

    if ($phone) {
        // Get messages for specific contact
        $limit = intval($_GET['limit'] ?? 50);
        $messages = $whatsappService->getMessageHistory($companyId, $phone, $limit);
    } else {
        // Get all company messages with filters
        $filters = [
            'status' => $_GET['status'] ?? null,
            'template_key' => $_GET['template'] ?? null,
            'date_from' => $_GET['date_from'] ?? null,
            'date_to' => $_GET['date_to'] ?? null
        ];
        $messages = $whatsappService->getCompanyMessages($companyId, $filters);
    }

    echo json_encode([
        'success' => true,
        'data' => $messages,
        'count' => count($messages)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
