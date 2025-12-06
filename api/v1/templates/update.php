<?php
/**
 * Update Document Template API
 * PUT - Update an existing custom template
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$templateId = $input['id'] ?? $_GET['id'] ?? null;

if (!$templateId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Template ID required']);
    exit;
}

// Cannot update system templates
if (strpos($templateId, 'system_') === 0) {
    http_response_code(403);
    echo json_encode([
        'success' => false, 
        'error_ro' => 'Șabloanele sistem nu pot fi modificate',
        'error' => 'System templates cannot be modified'
    ]);
    exit;
}

try {
    $db = getDbConnection();
    
    // Check template exists and belongs to company
    $stmt = $db->prepare("
        SELECT id, type, settings FROM document_templates 
        WHERE id = :id AND company_id = :company_id
    ");
    $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Template not found']);
        exit;
    }
    
    // Merge existing settings with updates
    $existingSettings = json_decode($existing['settings'], true) ?? [];
    $newSettings = array_merge_recursive($existingSettings, $input['settings'] ?? []);
    
    // If setting as default, unset other defaults
    if (!empty($input['is_default'])) {
        $stmt = $db->prepare("
            UPDATE document_templates 
            SET is_default = false 
            WHERE company_id = :company_id AND type = :type AND id != :id
        ");
        $stmt->execute([
            'company_id' => $companyId, 
            'type' => $existing['type'],
            'id' => $templateId
        ]);
    }
    
    // Build update query dynamically
    $updates = [];
    $params = ['id' => $templateId, 'company_id' => $companyId];
    
    $allowedFields = ['name', 'name_en', 'subtype', 'is_default', 'features', 'html_template', 'css_styles'];
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            if ($field === 'features') {
                $updates[] = "$field = :$field";
                $params[$field] = json_encode($input[$field]);
            } else {
                $updates[] = "$field = :$field";
                $params[$field] = $input[$field];
            }
        }
    }
    
    // Always update settings if provided
    if (isset($input['settings'])) {
        $updates[] = "settings = :settings";
        $params['settings'] = json_encode($newSettings);
    }
    
    $updates[] = "updated_at = NOW()";
    
    $sql = "UPDATE document_templates SET " . implode(', ', $updates) . 
           " WHERE id = :id AND company_id = :company_id";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    echo json_encode([
        'success' => true,
        'message_ro' => 'Șablon actualizat cu succes',
        'message_en' => 'Template updated successfully',
        'data' => [
            'id' => $templateId,
            'settings' => $newSettings,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}
