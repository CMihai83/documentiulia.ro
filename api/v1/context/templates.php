<?php
/**
 * Get Context Templates
 * GET /api/v1/context/templates
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/PersonalContextService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    $templateKey = $_GET['template_key'] ?? null;

    $contextService = new PersonalContextService();

    if ($templateKey) {
        // Get specific template
        $template = $contextService->getTemplate($templateKey);

        if (!$template) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Template not found'
            ]);
            exit();
        }

        echo json_encode([
            'success' => true,
            'template' => $template
        ]);
    } else {
        // Get all public templates
        $db = Database::getInstance();
        $templates = $db->fetchAll(
            "SELECT * FROM context_templates WHERE is_public = TRUE ORDER BY template_name",
            []
        );

        foreach ($templates as &$template) {
            $template['template_structure'] = json_decode($template['template_structure'], true);
        }

        echo json_encode([
            'success' => true,
            'templates' => $templates
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
