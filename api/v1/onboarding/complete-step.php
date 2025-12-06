<?php
/**
 * Complete Onboarding Step Endpoint
 * POST /api/v1/onboarding/complete-step.php
 *
 * Marks an onboarding step as manually completed (for optional steps)
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

    $input = json_decode(file_get_contents('php://input'), true);
    $stepId = $input['step_id'] ?? '';

    if (!$stepId) {
        throw new Exception('step_id is required');
    }

    $db = Database::getInstance()->getConnection();

    // Create onboarding_progress table if not exists
    $db->exec("
        CREATE TABLE IF NOT EXISTS onboarding_progress (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            company_id UUID NOT NULL,
            step_id VARCHAR(50) NOT NULL,
            completed_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, company_id, step_id)
        )
    ");

    // Mark step as completed
    $stmt = $db->prepare("
        INSERT INTO onboarding_progress (user_id, company_id, step_id)
        VALUES (:user_id, :company_id, :step_id)
        ON CONFLICT (user_id, company_id, step_id) DO NOTHING
    ");

    $stmt->execute([
        ':user_id' => $userId,
        ':company_id' => $companyId,
        ':step_id' => $stepId
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Step marked as complete'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
