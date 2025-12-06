<?php
/**
 * Get Single Persona Details
 * GET /api/v1/personas/get.php?id={persona_id}
 *
 * Returns detailed information about a specific persona
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID, Accept-Language');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';

try {
    $personaId = $_GET['id'] ?? '';

    if (empty($personaId)) {
        throw new Exception('Persona ID is required');
    }

    // Get language preference
    $lang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'ro';
    $lang = substr($lang, 0, 2);
    if (!in_array($lang, ['ro', 'en'])) {
        $lang = 'ro';
    }

    $db = Database::getInstance()->getConnection();

    // Get persona details
    $stmt = $db->prepare("
        SELECT
            id,
            name_ro,
            name_en,
            description_ro,
            description_en,
            icon,
            color,
            category,
            default_features,
            dashboard_layout,
            navigation_config,
            onboarding_steps,
            recommended_tier,
            display_order
        FROM business_personas
        WHERE id = :id AND is_active = true
    ");

    $stmt->execute([':id' => $personaId]);
    $persona = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$persona) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Persona not found'
        ]);
        exit();
    }

    // Parse JSON fields
    $persona['default_features'] = json_decode($persona['default_features'], true) ?? [];
    $persona['dashboard_layout'] = json_decode($persona['dashboard_layout'], true) ?? [];
    $persona['navigation_config'] = json_decode($persona['navigation_config'], true) ?? [];
    $persona['onboarding_steps'] = json_decode($persona['onboarding_steps'], true) ?? [];

    // Get features enabled for this persona
    $featuresStmt = $db->prepare("
        SELECT
            id,
            name,
            description,
            category,
            required_tier
        FROM feature_toggles
        WHERE is_active = true
        AND (
            enabled_for_personas = '[]'::jsonb
            OR enabled_for_personas @> :persona_json
        )
        ORDER BY category, name
    ");

    $featuresStmt->execute([':persona_json' => json_encode([$personaId])]);
    $features = $featuresStmt->fetchAll(PDO::FETCH_ASSOC);

    // Add localized name/description
    $persona['name'] = $lang === 'en' ? $persona['name_en'] : $persona['name_ro'];
    $persona['description'] = $lang === 'en' ? $persona['description_en'] : $persona['description_ro'];

    echo json_encode([
        'success' => true,
        'data' => $persona,
        'features' => $features,
        'language' => $lang
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
