<?php
/**
 * WhatsApp Opt-out Management API
 * GET - Check if phone has opted out
 * POST - Record opt-out
 * DELETE - Remove opt-out (re-subscribe)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
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

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $phone = $_GET['phone'] ?? '';
        if (empty($phone)) {
            throw new Exception('Phone number required');
        }

        $optedOut = $whatsappService->hasOptedOut($companyId, $phone);
        echo json_encode([
            'success' => true,
            'data' => [
                'phone' => $phone,
                'opted_out' => $optedOut
            ]
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $phone = $input['phone'] ?? '';
        $reason = $input['reason'] ?? null;

        if (empty($phone)) {
            throw new Exception('Phone number required');
        }

        $success = $whatsappService->recordOptOut($companyId, $phone, $reason);
        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Opt-out recorded' : 'Failed to record opt-out'
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $phone = $_GET['phone'] ?? '';
        if (empty($phone)) {
            throw new Exception('Phone number required');
        }

        $success = $whatsappService->removeOptOut($companyId, $phone);
        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Opt-out removed' : 'No opt-out found'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
