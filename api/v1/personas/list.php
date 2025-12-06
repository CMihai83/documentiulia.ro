<?php
/**
 * List All Business Personas
 * GET /api/v1/personas/list.php
 *
 * Returns all available business personas for selection
 * Public endpoint - no auth required for listing
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
    // Get language preference from header (default: ro)
    $lang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'ro';
    $lang = substr($lang, 0, 2);
    if (!in_array($lang, ['ro', 'en'])) {
        $lang = 'ro';
    }

    $db = Database::getInstance()->getConnection();

    // Select appropriate language fields
    $nameField = $lang === 'en' ? 'name_en' : 'name_ro';
    $descField = $lang === 'en' ? 'description_en' : 'description_ro';

    $stmt = $db->prepare("
        SELECT
            id,
            $nameField as name,
            $descField as description,
            name_ro,
            name_en,
            icon,
            color,
            category,
            default_features,
            recommended_tier,
            display_order
        FROM business_personas
        WHERE is_active = true
        ORDER BY display_order ASC
    ");

    $stmt->execute();
    $personas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Parse JSON fields
    foreach ($personas as &$persona) {
        $persona['default_features'] = json_decode($persona['default_features'], true) ?? [];
    }

    echo json_encode([
        'success' => true,
        'data' => $personas,
        'language' => $lang,
        'total' => count($personas)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch personas',
        'error' => $e->getMessage()
    ]);
}
