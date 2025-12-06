<?php
/**
 * Clone Document Template API
 * POST - Clone a system or custom template to create a new custom one
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
$sourceId = $input['source_id'] ?? null;
$newName = $input['name'] ?? null;

if (!$sourceId || !$newName) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'source_id and name are required']);
    exit;
}

// System templates definitions
$systemTemplates = [
    'system_factura_standard' => [
        'type' => 'invoice',
        'subtype' => 'factura',
        'features' => ['logo', 'bank_details', 'payment_terms', 'notes'],
        'settings' => [
            'layout' => ['page_size' => 'A4', 'orientation' => 'portrait'],
            'header' => ['show_logo' => true, 'logo_position' => 'left'],
            'body' => ['table_style' => 'bordered', 'show_vat_breakdown' => true],
            'footer' => ['show_bank_details' => true, 'show_signature_area' => true],
            'colors' => ['primary' => '#1a5276'],
        ],
    ],
    'system_factura_simplificata' => [
        'type' => 'invoice',
        'subtype' => 'factura_simplificata',
        'features' => ['logo', 'minimal_layout'],
        'settings' => [
            'layout' => ['page_size' => 'A4', 'orientation' => 'portrait'],
            'header' => ['show_logo' => true, 'logo_position' => 'center'],
            'body' => ['table_style' => 'simple', 'show_vat_breakdown' => false],
            'footer' => ['show_bank_details' => false],
            'colors' => ['primary' => '#2c3e50'],
        ],
    ],
    'system_factura_proforma' => [
        'type' => 'invoice',
        'subtype' => 'factura_proforma',
        'features' => ['logo', 'watermark', 'validity_date'],
        'settings' => [
            'layout' => ['page_size' => 'A4'],
            'header' => ['show_logo' => true],
            'body' => ['table_style' => 'bordered', 'watermark' => 'PROFORMA'],
            'colors' => ['primary' => '#7f8c8d'],
        ],
    ],
    'system_oferta_standard' => [
        'type' => 'quote',
        'subtype' => 'oferta',
        'features' => ['logo', 'validity_period', 'terms'],
        'settings' => [
            'layout' => ['page_size' => 'A4'],
            'header' => ['show_logo' => true],
            'body' => ['show_validity_date' => true],
            'colors' => ['primary' => '#27ae60'],
        ],
    ],
    'system_deviz_constructii' => [
        'type' => 'quote',
        'subtype' => 'deviz',
        'features' => ['logo', 'material_breakdown', 'labor_costs', 'phases'],
        'settings' => [
            'layout' => ['page_size' => 'A4'],
            'body' => ['show_phases' => true, 'show_materials_separate' => true],
            'colors' => ['primary' => '#e67e22'],
        ],
    ],
    'system_chitanta_standard' => [
        'type' => 'receipt',
        'subtype' => 'chitanta',
        'features' => ['amount_in_words', 'signature', 'stamp_area'],
        'settings' => [
            'layout' => ['page_size' => 'A5', 'orientation' => 'landscape'],
            'body' => ['show_amount_in_words' => true],
            'footer' => ['show_signature_area' => true, 'show_stamp_area' => true],
            'colors' => ['primary' => '#2980b9'],
        ],
    ],
    'system_aviz_standard' => [
        'type' => 'delivery_note',
        'subtype' => 'aviz',
        'features' => ['logo', 'vehicle_info', 'signatures'],
        'settings' => [
            'layout' => ['page_size' => 'A4'],
            'body' => ['show_vehicle_info' => true],
            'footer' => ['show_driver_signature' => true, 'show_receiver_signature' => true],
            'colors' => ['primary' => '#8e44ad'],
        ],
    ],
];

try {
    $db = getDbConnection();
    $sourceData = null;
    
    // Check if source is a system template
    if (isset($systemTemplates[$sourceId])) {
        $sourceData = $systemTemplates[$sourceId];
    } else {
        // Get from database
        $stmt = $db->prepare("
            SELECT type, subtype, features, settings, html_template, css_styles
            FROM document_templates
            WHERE id = :id AND company_id = :company_id
        ");
        $stmt->execute(['id' => $sourceId, 'company_id' => $companyId]);
        $sourceData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($sourceData) {
            $sourceData['features'] = json_decode($sourceData['features'], true) ?? [];
            $sourceData['settings'] = json_decode($sourceData['settings'], true) ?? [];
        }
    }
    
    if (!$sourceData) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Source template not found']);
        exit;
    }
    
    // Create new template ID
    $newId = 'tpl_' . bin2hex(random_bytes(12));
    
    // Merge any custom settings from input
    $settings = array_merge_recursive($sourceData['settings'], $input['settings'] ?? []);
    $features = $input['features'] ?? $sourceData['features'];
    
    $stmt = $db->prepare("
        INSERT INTO document_templates (
            id, company_id, name, name_en, type, subtype,
            is_default, features, settings, html_template, css_styles,
            cloned_from, created_by, created_at, updated_at
        ) VALUES (
            :id, :company_id, :name, :name_en, :type, :subtype,
            false, :features, :settings, :html_template, :css_styles,
            :cloned_from, :created_by, NOW(), NOW()
        )
    ");
    
    $stmt->execute([
        'id' => $newId,
        'company_id' => $companyId,
        'name' => $newName,
        'name_en' => $input['name_en'] ?? $newName,
        'type' => $sourceData['type'],
        'subtype' => $sourceData['subtype'],
        'features' => json_encode($features),
        'settings' => json_encode($settings),
        'html_template' => $sourceData['html_template'] ?? null,
        'css_styles' => $sourceData['css_styles'] ?? null,
        'cloned_from' => $sourceId,
        'created_by' => $user['user_id'],
    ]);
    
    echo json_encode([
        'success' => true,
        'message_ro' => 'Șablon clonat cu succes',
        'message_en' => 'Template cloned successfully',
        'data' => [
            'id' => $newId,
            'name' => $newName,
            'type' => $sourceData['type'],
            'cloned_from' => $sourceId,
            'settings' => $settings,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
