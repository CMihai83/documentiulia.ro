<?php
/**
 * Dismiss Onboarding Endpoint
 * POST /api/v1/onboarding/dismiss.php
 *
 * Allows user to dismiss/skip the onboarding wizard
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    $companyId = getHeader('x-company-id') ?? '';
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance()->getConnection();

    // Update user preference to hide onboarding
    $stmt = $db->prepare("
        INSERT INTO user_preferences (user_id, preference_key, preference_value)
        VALUES (:user_id, 'onboarding_dismissed', 'true')
        ON CONFLICT (user_id, preference_key)
        DO UPDATE SET preference_value = 'true', updated_at = NOW()
    ");

    $stmt->execute([':user_id' => $userId]);

    echo json_encode([
        'success' => true,
        'message' => 'Onboarding dismissed. You can re-enable it from Settings.'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
