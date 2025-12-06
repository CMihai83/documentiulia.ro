<?php
/**
 * Receipt Scanner API
 * Processes receipt images and extracts data using OCR
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

// Check authentication
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

// Get image data from request
$input = json_decode(file_get_contents('php://input'), true);
$imageData = $input['image'] ?? null;

if (!$imageData) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No image data provided']);
    exit;
}

// Validate base64 image
if (!preg_match('/^data:image\/(jpeg|png|gif|webp);base64,/', $imageData)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid image format']);
    exit;
}

// Extract base64 data
$base64 = preg_replace('/^data:image\/\w+;base64,/', '', $imageData);
$imageBytes = base64_decode($base64);

if (!$imageBytes) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Failed to decode image']);
    exit;
}

// Save image temporarily
$uploadDir = __DIR__ . '/../../../uploads/receipts/' . $companyId . '/' . date('Y') . '/' . date('m');
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$filename = 'receipt_' . uniqid() . '_' . time() . '.jpg';
$filepath = $uploadDir . '/' . $filename;
file_put_contents($filepath, $imageBytes);

// OCR Processing using Tesseract (if available)
$extractedText = '';
$parsedData = [];

if (function_exists('exec')) {
    $tesseractPath = '/usr/bin/tesseract';
    if (file_exists($tesseractPath)) {
        $output = [];
        exec("$tesseractPath " . escapeshellarg($filepath) . " stdout -l ron 2>/dev/null", $output);
        $extractedText = implode("\n", $output);
    }
}

// Parse extracted text for common receipt patterns
if ($extractedText) {
    $parsedData = parseReceiptText($extractedText);
}

// If OCR not available, return simulated data for demo
if (empty($parsedData)) {
    $parsedData = [
        'vendor' => null,
        'date' => date('Y-m-d'),
        'total' => null,
        'vat' => null,
        'items' => [],
        'receipt_number' => null,
        'ocr_available' => !empty($extractedText),
        'raw_text' => $extractedText ?: null,
    ];
}

// Store in database for later processing
try {
    $db = getDbConnection();
    $stmt = $db->prepare("
        INSERT INTO receipt_scans (
            id, company_id, user_id, image_path, extracted_text,
            parsed_data, status, created_at
        ) VALUES (
            :id, :company_id, :user_id, :image_path, :extracted_text,
            :parsed_data, 'pending', NOW()
        )
    ");

    $scanId = generateUUID();
    $stmt->execute([
        'id' => $scanId,
        'company_id' => $companyId,
        'user_id' => $user['user_id'],
        'image_path' => str_replace(__DIR__ . '/../../../', '', $filepath),
        'extracted_text' => $extractedText,
        'parsed_data' => json_encode($parsedData),
    ]);
} catch (Exception $e) {
    // Log error but don't fail the request
    error_log('Failed to store receipt scan: ' . $e->getMessage());
    $scanId = null;
}

$response = [
    'success' => true,
    'data' => [
        'scan_id' => $scanId,
        'image_path' => 'uploads/receipts/' . $companyId . '/' . date('Y') . '/' . date('m') . '/' . $filename,
        'extracted' => $parsedData,
        'confidence' => !empty($extractedText) ? 0.7 : 0,
        'needs_review' => true,
    ],
];

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

/**
 * Parse receipt text to extract structured data
 */
function parseReceiptText(string $text): array {
    $data = [
        'vendor' => null,
        'date' => null,
        'total' => null,
        'vat' => null,
        'items' => [],
        'receipt_number' => null,
    ];

    $lines = explode("\n", $text);

    // Romanian patterns
    $patterns = [
        'total' => '/(?:TOTAL|Total|SUMA|Suma|DE PLAT[AĂ])[:\s]*(\d+[,\.]\d{2})/i',
        'vat' => '/(?:TVA|T\.V\.A\.|Valoare TVA)[:\s]*(\d+[,\.]\d{2})/i',
        'date' => '/(\d{2}[\.\/\-]\d{2}[\.\/\-]\d{4})/i',
        'receipt_number' => '/(?:BON|Nr\.|Bon fiscal|FACTURA|NR)[:\s]*([A-Z0-9\-]+)/i',
        'cui' => '/(?:CUI|C\.U\.I\.|CIF)[:\s]*([A-Z]?\d+)/i',
    ];

    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) continue;

        // First non-empty line is often the vendor name
        if (!$data['vendor'] && strlen($line) > 3 && !preg_match('/^\d/', $line)) {
            $data['vendor'] = $line;
        }

        // Match patterns
        foreach ($patterns as $key => $pattern) {
            if (!$data[$key] && preg_match($pattern, $line, $matches)) {
                $value = $matches[1];
                if (in_array($key, ['total', 'vat'])) {
                    $value = floatval(str_replace(',', '.', $value));
                }
                $data[$key] = $value;
            }
        }

        // Parse items (price at end of line)
        if (preg_match('/^(.+?)\s+(\d+[,\.]\d{2})$/', $line, $matches)) {
            $itemName = trim($matches[1]);
            $itemPrice = floatval(str_replace(',', '.', $matches[2]));

            // Skip if it looks like a total/vat line
            if (!preg_match('/total|tva|suma|plat/i', $itemName) && $itemPrice > 0) {
                $data['items'][] = [
                    'name' => $itemName,
                    'price' => $itemPrice,
                    'quantity' => 1,
                ];
            }
        }
    }

    return $data;
}

function generateUUID(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
