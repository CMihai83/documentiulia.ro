<?php
/**
 * Barcode Lookup API
 * Looks up product information from barcode
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

// Check authentication
$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

// Get barcode from request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $barcode = $input['barcode'] ?? null;
    $format = $input['format'] ?? 'unknown';
} else {
    $barcode = $_GET['code'] ?? null;
    $format = $_GET['format'] ?? 'unknown';
}

if (!$barcode) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Barcode required']);
    exit;
}

// Clean barcode
$barcode = preg_replace('/[^0-9A-Za-z\-]/', '', $barcode);

$product = null;
$source = null;

// 1. First check company's own products
if ($companyId) {
    try {
        $db = getDbConnection();
        $stmt = $db->prepare("
            SELECT id, name, sku, barcode, price, unit, category, vat_rate
            FROM products
            WHERE company_id = :company_id AND barcode = :barcode
            LIMIT 1
        ");
        $stmt->execute(['company_id' => $companyId, 'barcode' => $barcode]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($product) {
            $source = 'company_inventory';
        }
    } catch (Exception $e) {
        error_log('Barcode lookup error: ' . $e->getMessage());
    }
}

// 2. Check global product database
if (!$product) {
    try {
        $db = getDbConnection();
        $stmt = $db->prepare("
            SELECT name, brand, category, description, image_url
            FROM global_products
            WHERE barcode = :barcode
            LIMIT 1
        ");
        $stmt->execute(['barcode' => $barcode]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($product) {
            $source = 'global_database';
        }
    } catch (Exception $e) {
        // Table may not exist, continue
    }
}

// 3. Try external API (Open Food Facts for EAN codes)
if (!$product && preg_match('/^\d{8,13}$/', $barcode)) {
    $externalData = lookupExternalDatabase($barcode);
    if ($externalData) {
        $product = $externalData;
        $source = 'open_food_facts';
    }
}

// 4. QR code handling - might contain URL or custom data
if (!$product && $format === 'qr_code') {
    // Check if it's a URL
    if (filter_var($barcode, FILTER_VALIDATE_URL)) {
        $product = [
            'type' => 'url',
            'url' => $barcode,
            'description' => 'Link extern',
        ];
        $source = 'qr_url';
    } else {
        // Try to parse as JSON
        $decoded = json_decode($barcode, true);
        if ($decoded) {
            $product = [
                'type' => 'data',
                'data' => $decoded,
                'description' => 'Date structurate',
            ];
            $source = 'qr_data';
        }
    }
}

if (!$product) {
    echo json_encode([
        'success' => true,
        'data' => [
            'found' => false,
            'barcode' => $barcode,
            'format' => $format,
            'message' => 'Produsul nu a fost găsit. Puteți adăuga manual.',
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Log successful scan for analytics
logBarcodeScan($barcode, $format, $source, $companyId);

$response = [
    'success' => true,
    'data' => [
        'found' => true,
        'barcode' => $barcode,
        'format' => $format,
        'source' => $source,
        'product' => $product,
    ],
];

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

/**
 * Look up product in external database (Open Food Facts)
 */
function lookupExternalDatabase(string $barcode): ?array {
    $url = "https://world.openfoodfacts.org/api/v2/product/{$barcode}.json";

    $context = stream_context_create([
        'http' => [
            'timeout' => 5,
            'user_agent' => 'DocumentIulia/1.0 (+https://documentiulia.ro)',
        ],
    ]);

    $response = @file_get_contents($url, false, $context);
    if (!$response) {
        return null;
    }

    $data = json_decode($response, true);
    if (!$data || $data['status'] !== 1) {
        return null;
    }

    $product = $data['product'] ?? [];

    return [
        'name' => $product['product_name'] ?? $product['product_name_ro'] ?? null,
        'brand' => $product['brands'] ?? null,
        'category' => $product['categories'] ?? null,
        'quantity' => $product['quantity'] ?? null,
        'image_url' => $product['image_url'] ?? null,
        'nutrition_grade' => $product['nutrition_grades'] ?? null,
    ];
}

/**
 * Log barcode scan for analytics
 */
function logBarcodeScan(string $barcode, string $format, string $source, ?string $companyId): void {
    try {
        $db = getDbConnection();
        $stmt = $db->prepare("
            INSERT INTO barcode_scan_logs (barcode, format, source, company_id, scanned_at)
            VALUES (:barcode, :format, :source, :company_id, NOW())
        ");
        $stmt->execute([
            'barcode' => $barcode,
            'format' => $format,
            'source' => $source,
            'company_id' => $companyId,
        ]);
    } catch (Exception $e) {
        // Ignore logging errors
    }
}
