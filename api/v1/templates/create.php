<?php
/**
 * Create Custom Document Template API
 * POST - Create a new custom template for the company
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

// Validate required fields
$requiredFields = ['name', 'type'];
foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Field '$field' is required"]);
        exit;
    }
}

$validTypes = ['invoice', 'quote', 'receipt', 'delivery_note'];
if (!in_array($input['type'], $validTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid document type']);
    exit;
}

$templateId = 'tpl_' . bin2hex(random_bytes(12));

// Default settings structure
$defaultSettings = [
    'layout' => [
        'page_size' => 'A4',
        'orientation' => 'portrait',
        'margins' => ['top' => 20, 'right' => 20, 'bottom' => 20, 'left' => 20],
    ],
    'header' => [
        'show_logo' => true,
        'logo_position' => 'left',
        'logo_size' => 'medium',
        'show_company_name' => true,
        'show_company_details' => true,
    ],
    'body' => [
        'table_style' => 'bordered',
        'show_line_numbers' => true,
        'show_unit_prices' => true,
        'show_quantities' => true,
        'show_vat_breakdown' => true,
        'show_totals' => true,
    ],
    'footer' => [
        'show_bank_details' => true,
        'show_payment_terms' => true,
        'show_notes' => true,
        'show_signature_area' => true,
        'show_stamp_area' => true,
        'custom_text' => '',
    ],
    'colors' => [
        'primary' => '#1a5276',
        'secondary' => '#2980b9',
        'accent' => '#27ae60',
        'text' => '#2c3e50',
        'background' => '#ffffff',
        'table_header' => '#ecf0f1',
        'table_alternate' => '#f9f9f9',
    ],
    'fonts' => [
        'family' => 'DejaVu Sans',
        'size_title' => 16,
        'size_heading' => 12,
        'size_body' => 10,
        'size_small' => 8,
    ],
    'romanian_specific' => [
        'show_cif' => true,
        'show_reg_com' => true,
        'show_amount_in_words' => true,
        'date_format' => 'DD.MM.YYYY',
        'number_format' => 'european',
        'currency_position' => 'after',
    ],
];

$settings = array_merge_recursive($defaultSettings, $input['settings'] ?? []);
$features = $input['features'] ?? ['logo', 'bank_details', 'payment_terms'];

try {
    $db = getDbConnection();
    
    // If setting as default, unset other defaults for this type
    if (!empty($input['is_default'])) {
        $stmt = $db->prepare("
            UPDATE document_templates 
            SET is_default = false 
            WHERE company_id = :company_id AND type = :type
        ");
        $stmt->execute(['company_id' => $companyId, 'type' => $input['type']]);
    }
    
    $stmt = $db->prepare("
        INSERT INTO document_templates (
            id, company_id, name, name_en, type, subtype,
            is_default, features, settings, html_template, css_styles,
            created_by, created_at, updated_at
        ) VALUES (
            :id, :company_id, :name, :name_en, :type, :subtype,
            :is_default, :features, :settings, :html_template, :css_styles,
            :created_by, NOW(), NOW()
        )
    ");
    
    $stmt->execute([
        'id' => $templateId,
        'company_id' => $companyId,
        'name' => $input['name'],
        'name_en' => $input['name_en'] ?? $input['name'],
        'type' => $input['type'],
        'subtype' => $input['subtype'] ?? $input['type'],
        'is_default' => !empty($input['is_default']),
        'features' => json_encode($features),
        'settings' => json_encode($settings),
        'html_template' => $input['html_template'] ?? null,
        'css_styles' => $input['css_styles'] ?? null,
        'created_by' => $user['user_id'],
    ]);
    
    echo json_encode([
        'success' => true,
        'message_ro' => 'Șablon creat cu succes',
        'message_en' => 'Template created successfully',
        'data' => [
            'id' => $templateId,
            'name' => $input['name'],
            'type' => $input['type'],
            'settings' => $settings,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
