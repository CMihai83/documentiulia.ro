<?php
/**
 * Get Features for a Persona or Company
 * GET /api/v1/personas/features.php?persona_id={id}
 * GET /api/v1/personas/features.php (with auth - gets company's features)
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
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $db = Database::getInstance()->getConnection();

    $personaId = $_GET['persona_id'] ?? null;
    $companyId = getHeader('x-company-id') ?? null;

    // If no persona_id provided, try to get from company
    if (empty($personaId) && !empty($companyId)) {
        $stmt = $db->prepare("SELECT persona_id FROM companies WHERE id = :company_id");
        $stmt->execute([':company_id' => $companyId]);
        $company = $stmt->fetch(PDO::FETCH_ASSOC);
        $personaId = $company['persona_id'] ?? null;
    }

    // Build query based on persona
    if ($personaId) {
        $stmt = $db->prepare("
            SELECT
                f.id,
                f.name,
                f.description,
                f.category,
                f.required_tier,
                f.is_beta,
                f.requires_setup,
                CASE
                    WHEN f.enabled_for_personas = '[]'::jsonb THEN true
                    WHEN f.enabled_for_personas @> :persona_json THEN true
                    ELSE false
                END as is_enabled
            FROM feature_toggles f
            WHERE f.is_active = true
            ORDER BY
                CASE f.category
                    WHEN 'core' THEN 1
                    WHEN 'vertical' THEN 2
                    WHEN 'premium' THEN 3
                    WHEN 'regional' THEN 4
                    ELSE 5
                END,
                f.name
        ");
        $stmt->execute([':persona_json' => json_encode([$personaId])]);
    } else {
        // Return all features if no persona specified
        $stmt = $db->prepare("
            SELECT
                id,
                name,
                description,
                category,
                required_tier,
                is_beta,
                requires_setup,
                true as is_enabled
            FROM feature_toggles
            WHERE is_active = true
            ORDER BY category, name
        ");
        $stmt->execute();
    }

    $features = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Group by category
    $grouped = [];
    foreach ($features as $feature) {
        $category = $feature['category'];
        if (!isset($grouped[$category])) {
            $grouped[$category] = [];
        }
        $grouped[$category][] = $feature;
    }

    echo json_encode([
        'success' => true,
        'data' => $features,
        'grouped' => $grouped,
        'persona_id' => $personaId,
        'total' => count($features)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
