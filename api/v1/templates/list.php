<?php
/**
 * Document Templates List API
 * Lists all available templates for invoices, quotes, receipts
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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

$documentType = $_GET['type'] ?? null; // invoice, quote, receipt, delivery_note

// Default system templates
$systemTemplates = [
    'invoice' => [
        [
            'id' => 'system_factura_standard',
            'name_ro' => 'Factură Standard',
            'name_en' => 'Standard Invoice',
            'type' => 'invoice',
            'subtype' => 'factura',
            'is_system' => true,
            'is_default' => true,
            'preview_image' => '/assets/templates/factura_standard.png',
            'features' => ['logo', 'bank_details', 'payment_terms', 'notes'],
            'created_at' => '2024-01-01T00:00:00Z',
        ],
        [
            'id' => 'system_factura_simplificata',
            'name_ro' => 'Factură Simplificată',
            'name_en' => 'Simplified Invoice',
            'type' => 'invoice',
            'subtype' => 'factura_simplificata',
            'is_system' => true,
            'is_default' => false,
            'preview_image' => '/assets/templates/factura_simplificata.png',
            'features' => ['logo', 'minimal_layout'],
            'created_at' => '2024-01-01T00:00:00Z',
        ],
        [
            'id' => 'system_factura_proforma',
            'name_ro' => 'Factură Proforma',
            'name_en' => 'Proforma Invoice',
            'type' => 'invoice',
            'subtype' => 'factura_proforma',
            'is_system' => true,
            'is_default' => false,
            'preview_image' => '/assets/templates/factura_proforma.png',
            'features' => ['logo', 'watermark', 'validity_date'],
            'created_at' => '2024-01-01T00:00:00Z',
        ],
    ],
    'quote' => [
        [
            'id' => 'system_oferta_standard',
            'name_ro' => 'Ofertă Standard',
            'name_en' => 'Standard Quote',
            'type' => 'quote',
            'subtype' => 'oferta',
            'is_system' => true,
            'is_default' => true,
            'preview_image' => '/assets/templates/oferta_standard.png',
            'features' => ['logo', 'validity_period', 'terms', 'optional_items'],
            'created_at' => '2024-01-01T00:00:00Z',
        ],
        [
            'id' => 'system_deviz_constructii',
            'name_ro' => 'Deviz Construcții',
            'name_en' => 'Construction Estimate',
            'type' => 'quote',
            'subtype' => 'deviz',
            'is_system' => true,
            'is_default' => false,
            'preview_image' => '/assets/templates/deviz_constructii.png',
            'features' => ['logo', 'material_breakdown', 'labor_costs', 'phases'],
            'created_at' => '2024-01-01T00:00:00Z',
        ],
    ],
    'receipt' => [
        [
            'id' => 'system_chitanta_standard',
            'name_ro' => 'Chitanță Standard',
            'name_en' => 'Standard Receipt',
            'type' => 'receipt',
            'subtype' => 'chitanta',
            'is_system' => true,
            'is_default' => true,
            'preview_image' => '/assets/templates/chitanta_standard.png',
            'features' => ['amount_in_words', 'signature', 'stamp_area'],
            'created_at' => '2024-01-01T00:00:00Z',
        ],
        [
            'id' => 'system_bon_fiscal',
            'name_ro' => 'Bon Fiscal',
            'name_en' => 'Fiscal Receipt',
            'type' => 'receipt',
            'subtype' => 'bon_fiscal',
            'is_system' => true,
            'is_default' => false,
            'preview_image' => '/assets/templates/bon_fiscal.png',
            'features' => ['thermal_format', 'fiscal_code'],
            'created_at' => '2024-01-01T00:00:00Z',
        ],
    ],
    'delivery_note' => [
        [
            'id' => 'system_aviz_standard',
            'name_ro' => 'Aviz de Însoțire Standard',
            'name_en' => 'Standard Delivery Note',
            'type' => 'delivery_note',
            'subtype' => 'aviz',
            'is_system' => true,
            'is_default' => true,
            'preview_image' => '/assets/templates/aviz_standard.png',
            'features' => ['logo', 'vehicle_info', 'driver_signature', 'receiver_signature'],
            'created_at' => '2024-01-01T00:00:00Z',
        ],
        [
            'id' => 'system_nir',
            'name_ro' => 'NIR (Notă Intrare Recepție)',
            'name_en' => 'Goods Receipt Note',
            'type' => 'delivery_note',
            'subtype' => 'nir',
            'is_system' => true,
            'is_default' => false,
            'preview_image' => '/assets/templates/nir_standard.png',
            'features' => ['inspection_fields', 'quality_check', 'warehouse_location'],
            'created_at' => '2024-01-01T00:00:00Z',
        ],
    ],
];

try {
    $db = getDbConnection();
    
    // Get custom company templates from database
    $customTemplates = [];
    $stmt = $db->prepare("
        SELECT 
            id, name, name_en, type, subtype, is_default, 
            preview_image, features, settings, created_at, updated_at
        FROM document_templates
        WHERE company_id = :company_id
        " . ($documentType ? "AND type = :type" : "") . "
        ORDER BY is_default DESC, name ASC
    ");
    
    $params = ['company_id' => $companyId];
    if ($documentType) {
        $params['type'] = $documentType;
    }
    
    $stmt->execute($params);
    $customTemplates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Decode JSON fields
    foreach ($customTemplates as &$template) {
        $template['is_system'] = false;
        $template['name_ro'] = $template['name'];
        $template['features'] = json_decode($template['features'], true) ?? [];
        $template['settings'] = json_decode($template['settings'], true) ?? [];
    }
    
} catch (Exception $e) {
    $customTemplates = [];
}

// Combine system and custom templates
$allTemplates = [];
if ($documentType) {
    $allTemplates = array_merge(
        $systemTemplates[$documentType] ?? [],
        $customTemplates
    );
} else {
    foreach ($systemTemplates as $type => $templates) {
        $allTemplates = array_merge($allTemplates, $templates);
    }
    $allTemplates = array_merge($allTemplates, $customTemplates);
}

// Group by type for better organization
$groupedTemplates = [];
foreach ($allTemplates as $template) {
    $type = $template['type'];
    if (!isset($groupedTemplates[$type])) {
        $groupedTemplates[$type] = [];
    }
    $groupedTemplates[$type][] = $template;
}

echo json_encode([
    'success' => true,
    'data' => [
        'templates' => $allTemplates,
        'grouped' => $groupedTemplates,
        'document_types' => [
            'invoice' => ['name_ro' => 'Facturi', 'name_en' => 'Invoices'],
            'quote' => ['name_ro' => 'Oferte', 'name_en' => 'Quotes'],
            'receipt' => ['name_ro' => 'Chitanțe', 'name_en' => 'Receipts'],
            'delivery_note' => ['name_ro' => 'Avize', 'name_en' => 'Delivery Notes'],
        ],
        'total' => count($allTemplates),
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
