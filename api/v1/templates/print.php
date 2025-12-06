<?php
/**
 * Print Templates API
 * Manage print layouts and configurations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
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

$method = $_SERVER['REQUEST_METHOD'];

// Paper sizes
$paperSizes = [
    'A4' => ['ro' => 'A4 (210 × 297 mm)', 'en' => 'A4 (210 × 297 mm)', 'width' => 210, 'height' => 297],
    'A5' => ['ro' => 'A5 (148 × 210 mm)', 'en' => 'A5 (148 × 210 mm)', 'width' => 148, 'height' => 210],
    'letter' => ['ro' => 'Letter (216 × 279 mm)', 'en' => 'Letter (216 × 279 mm)', 'width' => 216, 'height' => 279],
    'legal' => ['ro' => 'Legal (216 × 356 mm)', 'en' => 'Legal (216 × 356 mm)', 'width' => 216, 'height' => 356],
    'thermal_80mm' => ['ro' => 'Termic 80mm', 'en' => 'Thermal 80mm', 'width' => 80, 'height' => 0],
    'thermal_58mm' => ['ro' => 'Termic 58mm', 'en' => 'Thermal 58mm', 'width' => 58, 'height' => 0],
    'label_100x150' => ['ro' => 'Etichetă 100×150mm', 'en' => 'Label 100×150mm', 'width' => 100, 'height' => 150],
    'label_60x40' => ['ro' => 'Etichetă 60×40mm', 'en' => 'Label 60×40mm', 'width' => 60, 'height' => 40],
];

// Orientation options
$orientations = [
    'portrait' => ['ro' => 'Portret', 'en' => 'Portrait'],
    'landscape' => ['ro' => 'Peisaj', 'en' => 'Landscape'],
];

// Print quality options
$qualityOptions = [
    'draft' => ['ro' => 'Ciornă', 'en' => 'Draft', 'dpi' => 72],
    'normal' => ['ro' => 'Normal', 'en' => 'Normal', 'dpi' => 150],
    'high' => ['ro' => 'Înaltă', 'en' => 'High', 'dpi' => 300],
];

// Default print settings
$defaultSettings = [
    'paper_size' => 'A4',
    'orientation' => 'portrait',
    'quality' => 'normal',
    'margins' => [
        'top' => 20,
        'right' => 15,
        'bottom' => 20,
        'left' => 15,
    ],
    'header_height' => 25,
    'footer_height' => 15,
    'show_page_numbers' => true,
    'show_date' => true,
    'copies' => 1,
    'duplex' => false,
    'color_mode' => 'auto',
    'scale' => 100,
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        $documentType = $_GET['document_type'] ?? null;

        // Get company print settings
        $stmt = $db->prepare("
            SELECT document_type, settings FROM print_settings
            WHERE company_id = :company_id
        ");
        $stmt->execute(['company_id' => $companyId]);
        $savedSettings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        if ($documentType) {
            // Return settings for specific document type
            $settings = json_decode($savedSettings[$documentType] ?? '{}', true);
            $settings = array_merge($defaultSettings, $settings);

            echo json_encode([
                'success' => true,
                'data' => [
                    'document_type' => $documentType,
                    'settings' => $settings,
                    'paper_sizes' => $paperSizes,
                    'orientations' => $orientations,
                    'quality_options' => $qualityOptions,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } else {
            // Return all print configurations
            $configurations = [];
            $documentTypes = ['invoice', 'quote', 'receipt', 'delivery_note', 'report', 'label'];

            foreach ($documentTypes as $type) {
                $settings = json_decode($savedSettings[$type] ?? '{}', true);
                $configurations[$type] = [
                    'document_type' => $type,
                    'settings' => array_merge($defaultSettings, $settings),
                    'is_customized' => isset($savedSettings[$type]),
                ];
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'configurations' => $configurations,
                    'paper_sizes' => $paperSizes,
                    'orientations' => $orientations,
                    'quality_options' => $qualityOptions,
                    'defaults' => $defaultSettings,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }

    } elseif ($method === 'POST' || $method === 'PUT') {
        if (!in_array($user['role'], ['admin', 'manager'])) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Nu aveți permisiunea de a modifica setările de printare',
                'error' => 'You do not have permission to modify print settings'
            ]);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $documentType = $input['document_type'] ?? null;
        $settings = $input['settings'] ?? null;

        if (!$documentType || !$settings) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Tipul documentului și setările sunt obligatorii',
                'error' => 'Document type and settings are required'
            ]);
            exit;
        }

        // Validate paper size
        if (isset($settings['paper_size']) && !isset($paperSizes[$settings['paper_size']])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Dimensiune hârtie invalidă',
                'error' => 'Invalid paper size'
            ]);
            exit;
        }

        // Save settings
        $stmt = $db->prepare("
            INSERT INTO print_settings (company_id, document_type, settings, updated_at)
            VALUES (:company_id, :document_type, :settings, NOW())
            ON CONFLICT (company_id, document_type)
            DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()
        ");
        $stmt->execute([
            'company_id' => $companyId,
            'document_type' => $documentType,
            'settings' => json_encode($settings),
        ]);

        echo json_encode([
            'success' => true,
            'message_ro' => 'Setări de printare salvate',
            'message_en' => 'Print settings saved',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
