<?php
/**
 * Delete Document Template API
 * DELETE - Delete a custom template
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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

$templateId = $_GET['id'] ?? null;

if (!$templateId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Template ID required']);
    exit;
}

// Cannot delete system templates
if (strpos($templateId, 'system_') === 0) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Șabloanele sistem nu pot fi șterse',
        'error' => 'System templates cannot be deleted'
    ]);
    exit;
}

try {
    $db = getDbConnection();
    
    // Check template exists and belongs to company
    $stmt = $db->prepare("
        SELECT id, name, is_default FROM document_templates 
        WHERE id = :id AND company_id = :company_id
    ");
    $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);
    $template = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$template) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Template not found']);
        exit;
    }
    
    // Warn if deleting default template
    if ($template['is_default']) {
        // Delete anyway but warn
        $warning = 'Atenție: Ați șters șablonul implicit. Selectați un alt șablon ca implicit.';
    }
    
    // Delete template
    $stmt = $db->prepare("
        DELETE FROM document_templates 
        WHERE id = :id AND company_id = :company_id
    ");
    $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);
    
    $response = [
        'success' => true,
        'message_ro' => 'Șablon șters cu succes',
        'message_en' => 'Template deleted successfully',
        'data' => [
            'id' => $templateId,
            'name' => $template['name'],
        ],
    ];
    
    if (isset($warning)) {
        $response['warning_ro'] = $warning;
        $response['warning_en'] = 'Warning: You deleted the default template. Please select another as default.';
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}
