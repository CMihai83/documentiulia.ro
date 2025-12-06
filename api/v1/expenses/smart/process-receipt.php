<?php
/**
 * Smart Receipt Processing API
 * Processes receipt images with OCR and extracts expense data
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

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/auth.php';

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

// Handle file upload or base64 image
$imageData = null;
$imagePath = null;

if (isset($_FILES['receipt'])) {
    // File upload
    $file = $_FILES['receipt'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'File upload failed']);
        exit;
    }

    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!in_array($file['type'], $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid file type']);
        exit;
    }

    $uploadDir = '/var/www/documentiulia.ro/uploads/receipts/' . $companyId . '/' . date('Y/m');
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $filename = 'receipt_' . uniqid() . '_' . time() . '.' . pathinfo($file['name'], PATHINFO_EXTENSION);
    $imagePath = $uploadDir . '/' . $filename;
    move_uploaded_file($file['tmp_name'], $imagePath);
} else {
    // Base64 image
    $input = json_decode(file_get_contents('php://input'), true);
    if (empty($input['image'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No image provided']);
        exit;
    }

    // Decode base64
    $imageData = $input['image'];
    if (preg_match('/^data:image\/(\w+);base64,/', $imageData, $matches)) {
        $imageData = substr($imageData, strpos($imageData, ',') + 1);
    }
    $imageData = base64_decode($imageData);

    $uploadDir = '/var/www/documentiulia.ro/uploads/receipts/' . $companyId . '/' . date('Y/m');
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $filename = 'receipt_' . uniqid() . '_' . time() . '.jpg';
    $imagePath = $uploadDir . '/' . $filename;
    file_put_contents($imagePath, $imageData);
}

// Process with OCR (using Tesseract)
$ocrText = '';
$outputFile = tempnam('/tmp', 'ocr_');

// Run Tesseract with Romanian language
$cmd = "tesseract " . escapeshellarg($imagePath) . " " . escapeshellarg($outputFile) . " -l ron+eng 2>&1";
exec($cmd, $output, $returnCode);

if ($returnCode === 0 && file_exists($outputFile . '.txt')) {
    $ocrText = file_get_contents($outputFile . '.txt');
    unlink($outputFile . '.txt');
}
@unlink($outputFile);

// Parse OCR text to extract expense data
$extractedData = parseReceiptText($ocrText);

// Auto-categorize based on vendor/description
$category = categorizeExpense($extractedData['vendor'] ?? '', $extractedData['description'] ?? $ocrText);

$db = getDbConnection();

// Check for duplicate receipts
$duplicateCheck = checkDuplicate($db, $companyId, $extractedData);

// Store processing result
$result = [
    'success' => true,
    'data' => [
        'receipt_path' => str_replace('/var/www/documentiulia.ro', '', $imagePath),
        'ocr_text' => $ocrText,
        'extracted' => $extractedData,
        'suggested_category' => $category,
        'is_duplicate' => $duplicateCheck['is_duplicate'],
        'duplicate_info' => $duplicateCheck['info'],
        'confidence' => calculateExtractionConfidence($extractedData),
    ],
];

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

// Helper functions
function parseReceiptText(string $text): array {
    $data = [
        'vendor' => null,
        'date' => null,
        'total' => null,
        'vat' => null,
        'items' => [],
        'fiscal_code' => null,
    ];

    $lines = explode("\n", $text);

    // Extract vendor (usually first non-empty line)
    foreach ($lines as $line) {
        $line = trim($line);
        if (!empty($line) && strlen($line) > 3) {
            $data['vendor'] = $line;
            break;
        }
    }

    // Extract fiscal code (CIF/CUI)
    if (preg_match('/(?:CIF|CUI|C\.?I\.?F\.?|C\.?U\.?I\.?)[\s:]*([A-Z]?\d{6,10})/i', $text, $matches)) {
        $data['fiscal_code'] = strtoupper($matches[1]);
    }

    // Extract date (Romanian formats)
    $datePatterns = [
        '/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/',  // DD/MM/YYYY or DD.MM.YYYY
        '/(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/',    // YYYY-MM-DD
    ];
    foreach ($datePatterns as $pattern) {
        if (preg_match($pattern, $text, $matches)) {
            if (strlen($matches[1]) === 4) {
                $data['date'] = $matches[1] . '-' . str_pad($matches[2], 2, '0', STR_PAD_LEFT) . '-' . str_pad($matches[3], 2, '0', STR_PAD_LEFT);
            } else {
                $year = strlen($matches[3]) === 2 ? '20' . $matches[3] : $matches[3];
                $data['date'] = $year . '-' . str_pad($matches[2], 2, '0', STR_PAD_LEFT) . '-' . str_pad($matches[1], 2, '0', STR_PAD_LEFT);
            }
            break;
        }
    }

    // Extract total amount (various Romanian patterns)
    $totalPatterns = [
        '/TOTAL[\s:]+[A-Z]*[\s:]*(\d+[,\.]\d{2})/i',
        '/TOTAL\s*(?:RON|LEI)?[\s:]*(\d+[,\.]\d{2})/i',
        '/DE\s+PLAT[AĂ][\s:]+(\d+[,\.]\d{2})/i',
        '/PLAT[AĂ][\s:]+(\d+[,\.]\d{2})/i',
        '/(\d+[,\.]\d{2})\s*(?:RON|LEI)\s*$/im',
    ];
    foreach ($totalPatterns as $pattern) {
        if (preg_match($pattern, $text, $matches)) {
            $data['total'] = floatval(str_replace(',', '.', $matches[1]));
            break;
        }
    }

    // Extract VAT amount
    $vatPatterns = [
        '/TVA[\s:]+[A-Z\d%]*[\s:]*(\d+[,\.]\d{2})/i',
        '/TVA\s*(?:\d+%)?[\s:]*(\d+[,\.]\d{2})/i',
    ];
    foreach ($vatPatterns as $pattern) {
        if (preg_match($pattern, $text, $matches)) {
            $data['vat'] = floatval(str_replace(',', '.', $matches[1]));
            break;
        }
    }

    // Extract line items (amount patterns on separate lines)
    if (preg_match_all('/(.+?)\s+(\d+[,\.]\d{2})\s*(?:RON|LEI)?/i', $text, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $item = trim($match[1]);
            $amount = floatval(str_replace(',', '.', $match[2]));
            // Filter out total/vat lines
            if (!preg_match('/TOTAL|TVA|SUBTOTAL|PLAT[AĂ]/i', $item) && $amount > 0) {
                $data['items'][] = [
                    'description' => $item,
                    'amount' => $amount,
                ];
            }
        }
    }

    return $data;
}

function categorizeExpense(string $vendor, string $text): array {
    $categories = [
        'transport' => ['uber', 'bolt', 'taxi', 'benzina', 'motorina', 'carburant', 'omv', 'petrom', 'mol', 'lukoil', 'rompetrol'],
        'office_supplies' => ['papetarie', 'birou', 'hartie', 'emag', 'altex', 'dedeman', 'bricostore'],
        'utilities' => ['enel', 'engie', 'digi', 'vodafone', 'orange', 'telekom', 'upc', 'rds'],
        'meals' => ['restaurant', 'cafenea', 'coffee', 'mc', 'kfc', 'subway', 'starbucks', 'tazz', 'glovo', 'foodpanda'],
        'software' => ['microsoft', 'google', 'adobe', 'aws', 'zoom', 'slack'],
        'travel' => ['hotel', 'booking', 'airbnb', 'aeroport', 'cfr', 'wizz', 'tarom', 'blue air'],
        'marketing' => ['facebook', 'google ads', 'linkedin', 'tiktok'],
        'equipment' => ['pcgarage', 'cel.ro', 'mediagalaxy', 'flanco'],
    ];

    $searchText = strtolower($vendor . ' ' . $text);
    $bestMatch = ['category' => 'other', 'confidence' => 0];

    foreach ($categories as $categoryId => $keywords) {
        $matchCount = 0;
        foreach ($keywords as $keyword) {
            if (strpos($searchText, $keyword) !== false) {
                $matchCount++;
            }
        }
        if ($matchCount > $bestMatch['confidence']) {
            $bestMatch = [
                'category' => $categoryId,
                'confidence' => min($matchCount * 30 + 40, 95),
            ];
        }
    }

    $categoryNames = [
        'transport' => ['ro' => 'Transport', 'en' => 'Transportation'],
        'office_supplies' => ['ro' => 'Rechizite birou', 'en' => 'Office Supplies'],
        'utilities' => ['ro' => 'Utilități', 'en' => 'Utilities'],
        'meals' => ['ro' => 'Mese și protocol', 'en' => 'Meals'],
        'software' => ['ro' => 'Software', 'en' => 'Software'],
        'travel' => ['ro' => 'Deplasări', 'en' => 'Travel'],
        'marketing' => ['ro' => 'Marketing', 'en' => 'Marketing'],
        'equipment' => ['ro' => 'Echipamente', 'en' => 'Equipment'],
        'other' => ['ro' => 'Altele', 'en' => 'Other'],
    ];

    return [
        'category_id' => $bestMatch['category'],
        'category_name_ro' => $categoryNames[$bestMatch['category']]['ro'],
        'category_name_en' => $categoryNames[$bestMatch['category']]['en'],
        'confidence' => $bestMatch['confidence'],
    ];
}

function checkDuplicate(PDO $db, string $companyId, array $data): array {
    if (empty($data['total']) || empty($data['date'])) {
        return ['is_duplicate' => false, 'info' => null];
    }

    try {
        $stmt = $db->prepare("
            SELECT id, description, vendor, amount, expense_date
            FROM expenses
            WHERE company_id = :company_id
            AND amount = :amount
            AND ABS(EXTRACT(EPOCH FROM (expense_date::date - :date::date))) < 86400 * 3
            LIMIT 1
        ");
        $stmt->execute([
            'company_id' => $companyId,
            'amount' => $data['total'],
            'date' => $data['date'],
        ]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            return [
                'is_duplicate' => true,
                'info' => [
                    'existing_id' => $existing['id'],
                    'existing_vendor' => $existing['vendor'],
                    'existing_date' => $existing['expense_date'],
                    'message_ro' => 'Posibilă cheltuială duplicată găsită',
                    'message_en' => 'Possible duplicate expense found',
                ],
            ];
        }
    } catch (Exception $e) {
        // Ignore duplicate check errors
    }

    return ['is_duplicate' => false, 'info' => null];
}

function calculateExtractionConfidence(array $data): int {
    $confidence = 0;

    if (!empty($data['vendor'])) $confidence += 20;
    if (!empty($data['date'])) $confidence += 25;
    if (!empty($data['total'])) $confidence += 30;
    if (!empty($data['fiscal_code'])) $confidence += 15;
    if (!empty($data['items'])) $confidence += 10;

    return min($confidence, 95);
}
