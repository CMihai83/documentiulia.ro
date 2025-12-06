<?php
/**
 * Current Persona Endpoint
 * GET /api/v1/personas/current.php
 * Returns the current persona settings for the company
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get current persona for company
        $personaData = $db->fetchOne(
            "SELECT
                cps.persona_id,
                cps.onboarding_completed,
                cps.selection_method,
                cps.quiz_score,
                cps.created_at as selected_at,
                bp.id as persona_code,
                bp.name_ro,
                bp.name_en,
                bp.description_ro,
                bp.description_en,
                bp.icon,
                bp.color,
                bp.default_features as features
             FROM company_persona_settings cps
             LEFT JOIN business_personas bp ON cps.persona_id = bp.id
             WHERE cps.company_id = :company_id",
            ['company_id' => $companyId]
        );

        if (!$personaData || !$personaData['persona_id']) {
            // Return default persona if none set
            $defaultPersona = $db->fetchOne(
                "SELECT id, name_ro, name_en, description_ro, description_en, icon, color, default_features as features
                 FROM business_personas
                 WHERE id = 'general' OR is_active = true
                 ORDER BY display_order ASC
                 LIMIT 1"
            );

            if ($defaultPersona) {
                $personaData = [
                    'persona_id' => $defaultPersona['id'],
                    'persona_code' => $defaultPersona['id'],
                    'name_ro' => $defaultPersona['name_ro'],
                    'name_en' => $defaultPersona['name_en'],
                    'description_ro' => $defaultPersona['description_ro'],
                    'description_en' => $defaultPersona['description_en'],
                    'icon' => $defaultPersona['icon'],
                    'color' => $defaultPersona['color'],
                    'features' => $defaultPersona['features'],
                    'onboarding_completed' => false,
                    'selection_method' => null,
                    'quiz_score' => null,
                    'selected_at' => null,
                    'is_default' => true
                ];
            } else {
                // Fallback if no personas exist
                $personaData = [
                    'persona_id' => 'general',
                    'persona_code' => 'general',
                    'name_ro' => 'Afacere Generală',
                    'name_en' => 'General Business',
                    'description_ro' => 'Configurare standard pentru toate tipurile de afaceri',
                    'description_en' => 'Standard configuration for all business types',
                    'icon' => 'Briefcase',
                    'color' => '#6366f1',
                    'features' => json_encode(['invoicing', 'expenses', 'contacts', 'projects']),
                    'onboarding_completed' => false,
                    'selection_method' => null,
                    'quiz_score' => null,
                    'selected_at' => null,
                    'is_default' => true
                ];
            }
        }

        // Parse features if it's a string
        if (is_string($personaData['features'] ?? null)) {
            $personaData['features'] = json_decode($personaData['features'], true) ?? [];
        }

        echo json_encode([
            'success' => true,
            'data' => $personaData
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Update persona for company
        $input = json_decode(file_get_contents('php://input'), true);
        $personaId = $input['persona_id'] ?? '';

        if (empty($personaId)) {
            throw new Exception('Persona ID required');
        }

        // Verify persona exists
        $persona = $db->fetchOne(
            "SELECT id FROM business_personas WHERE id = :id",
            ['id' => $personaId]
        );

        if (!$persona) {
            throw new Exception('Invalid persona ID');
        }

        // Upsert persona settings
        $db->execute(
            "INSERT INTO company_persona_settings (company_id, persona_id, selection_method, updated_at)
             VALUES (:company_id, :persona_id, 'manual', NOW())
             ON CONFLICT (company_id) DO UPDATE SET
                persona_id = EXCLUDED.persona_id,
                selection_method = 'manual',
                updated_at = NOW()",
            ['company_id' => $companyId, 'persona_id' => $personaId]
        );

        // Also update company table
        $db->execute(
            "UPDATE companies SET persona_id = :persona_id, updated_at = NOW() WHERE id = :company_id",
            ['persona_id' => $personaId, 'company_id' => $companyId]
        );

        echo json_encode([
            'success' => true,
            'message' => 'Persona updated successfully',
            'data' => ['persona_id' => $personaId]
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
