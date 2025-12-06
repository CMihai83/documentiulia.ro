<?php
/**
 * Expiring Certifications API
 * Returns certifications expiring within specified days
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
require_once __DIR__ . '/../../services/ANRECertificationService.php';
require_once __DIR__ . '/../../helpers/headers.php';

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
    $certService = ANRECertificationService::getInstance();

    $daysAhead = isset($_GET['days']) ? intval($_GET['days']) : 30;
    $daysAhead = min(max($daysAhead, 7), 180); // Between 7 and 180 days

    $expiring = $certService->getExpiringCertifications($companyId, $daysAhead);
    $expired = $certService->getExpiredCertifications($companyId);

    echo json_encode([
        'success' => true,
        'data' => [
            'expiring_soon' => $expiring,
            'already_expired' => $expired,
            'days_ahead' => $daysAhead,
            'total_alerts' => count($expiring) + count($expired)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
