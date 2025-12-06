<?php
/**
 * Select Persona for Company
 * POST /api/v1/personas/select.php
 *
 * Sets the persona for a company (requires authentication)
 * Body: { "persona_id": "construction" }
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
    // Verify authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    // Get company ID
    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    // Get input
    $input = json_decode(file_get_contents('php://input'), true);
    $personaId = $input['persona_id'] ?? '';
    $selectionMethod = $input['selection_method'] ?? 'manual';
    $quizScore = $input['quiz_score'] ?? null;

    if (empty($personaId)) {
        throw new Exception('persona_id is required');
    }

    $db = Database::getInstance()->getConnection();

    // Verify persona exists
    $checkStmt = $db->prepare("SELECT id FROM business_personas WHERE id = :id AND is_active = true");
    $checkStmt->execute([':id' => $personaId]);
    if (!$checkStmt->fetch()) {
        throw new Exception('Invalid persona ID');
    }

    // Begin transaction
    $db->beginTransaction();

    try {
        // Update or insert company_persona_settings
        $stmt = $db->prepare("
            INSERT INTO company_persona_settings
                (company_id, persona_id, selection_method, quiz_score)
            VALUES
                (:company_id, :persona_id, :selection_method, :quiz_score)
            ON CONFLICT (company_id)
            DO UPDATE SET
                persona_id = :persona_id,
                selection_method = :selection_method,
                quiz_score = :quiz_score,
                updated_at = NOW()
            RETURNING id
        ");

        $stmt->execute([
            ':company_id' => $companyId,
            ':persona_id' => $personaId,
            ':selection_method' => $selectionMethod,
            ':quiz_score' => $quizScore
        ]);

        // Also update companies table for quick lookup
        $updateCompanyStmt = $db->prepare("
            UPDATE companies
            SET persona_id = :persona_id, updated_at = NOW()
            WHERE id = :company_id
        ");
        $updateCompanyStmt->execute([
            ':company_id' => $companyId,
            ':persona_id' => $personaId
        ]);

        $db->commit();

        // Get the persona details to return
        $personaStmt = $db->prepare("
            SELECT id, name_ro, name_en, icon, color, default_features, navigation_config
            FROM business_personas WHERE id = :id
        ");
        $personaStmt->execute([':id' => $personaId]);
        $persona = $personaStmt->fetch(PDO::FETCH_ASSOC);
        $persona['default_features'] = json_decode($persona['default_features'], true) ?? [];
        $persona['navigation_config'] = json_decode($persona['navigation_config'], true) ?? [];

        echo json_encode([
            'success' => true,
            'message' => 'Persona selected successfully',
            'data' => [
                'persona' => $persona,
                'company_id' => $companyId
            ]
        ]);

    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
