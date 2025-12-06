<?php
/**
 * Advanced Receipt OCR Processing Endpoint
 *
 * POST /api/v1/receipts/process
 *
 * Two modes:
 * 1. Process existing receipt: { "receipt_id": "uuid" }
 * 2. Process image file directly: { "image_path": "/path/to/image" }
 *
 * Uses advanced Python OCR engine with template-based extraction
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

// Configuration
define('OCR_ENGINE_PATH', '/var/www/documentiulia.ro/ocr_engine/advanced_ocr.py');
define('UPLOAD_DIR', '/var/www/documentiulia.ro/uploads/receipts/');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

// Check if ReceiptService exists for backward compatibility
$hasReceiptService = file_exists(__DIR__ . '/../../services/ReceiptService.php');
if ($hasReceiptService) {
    require_once __DIR__ . '/../../services/ReceiptService.php';
}

try {
    // Authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;

    // Parse input
    $input = json_decode(file_get_contents('php://input'), true);
    $useAdvancedOCR = $input['use_advanced_ocr'] ?? true;
    $template = $input['template'] ?? 'romanian_receipt';

    // Mode 1: Process existing receipt by ID
    if (isset($input['receipt_id']) && !empty($input['receipt_id'])) {
        $receiptId = $input['receipt_id'];

        if ($useAdvancedOCR && file_exists(OCR_ENGINE_PATH)) {
            // Get receipt file path from database
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("SELECT filename FROM receipts WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $receiptId, 'company_id' => $companyId]);
            $receipt = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$receipt) {
                throw new Exception('Receipt not found');
            }

            $filepath = UPLOAD_DIR . $receipt['filename'];

            if (!file_exists($filepath)) {
                throw new Exception('Receipt file not found');
            }

            // Process with advanced OCR
            $ocrResult = processWithAdvancedOCR($filepath, $template);

            if ($ocrResult['success']) {
                // Update receipt with new OCR data
                $stmt = $db->prepare("
                    UPDATE receipts SET
                        extracted_text = :extracted_text,
                        parsed_data = :parsed_data,
                        confidence = :confidence,
                        status = 'processed',
                        updated_at = NOW()
                    WHERE id = :id
                ");
                $stmt->execute([
                    'id' => $receiptId,
                    'extracted_text' => $ocrResult['full_text'] ?? '',
                    'parsed_data' => json_encode($ocrResult['parsed_data'] ?? []),
                    'confidence' => $ocrResult['overall_confidence'] ?? 0
                ]);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'receipt_id' => $receiptId,
                        'confidence' => round(($ocrResult['overall_confidence'] ?? 0) * 100, 1) . '%',
                        'parsed_data' => $ocrResult['parsed_data'] ?? [],
                        'extracted_text' => $ocrResult['full_text'] ?? '',
                        'engine' => 'advanced_python_ocr'
                    ],
                    'message' => 'Receipt processed with advanced OCR'
                ]);
                exit();
            }
        }

        // Fallback to legacy ReceiptService
        if ($hasReceiptService) {
            $receiptService = new ReceiptService();
            $receipt = $receiptService->processReceipt($receiptId);

            echo json_encode([
                'success' => true,
                'data' => $receipt,
                'message' => 'Receipt processed successfully'
            ]);
            exit();
        }

        throw new Exception('OCR processing failed');
    }

    // Mode 2: Process image file directly
    if (isset($input['image_path']) && !empty($input['image_path'])) {
        $filepath = $input['image_path'];

        if (!file_exists($filepath)) {
            throw new Exception('Image file not found');
        }

        $ocrResult = processWithAdvancedOCR($filepath, $template);

        echo json_encode([
            'success' => $ocrResult['success'],
            'data' => $ocrResult,
            'message' => $ocrResult['success'] ? 'Image processed successfully' : 'Processing failed'
        ]);
        exit();
    }

    throw new Exception('Receipt ID or image path required');

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Process image using advanced Python OCR engine
 */
function processWithAdvancedOCR(string $filepath, string $template): array
{
    if (!file_exists(OCR_ENGINE_PATH)) {
        return ['success' => false, 'error' => 'Advanced OCR engine not found'];
    }

    // Build command
    $cmd = sprintf(
        'python3 %s %s --template %s 2>&1',
        escapeshellarg(OCR_ENGINE_PATH),
        escapeshellarg($filepath),
        escapeshellarg($template)
    );

    // Execute with timeout
    $output = shell_exec($cmd);

    if ($output === null) {
        return ['success' => false, 'error' => 'Failed to execute OCR engine'];
    }

    // Parse JSON output
    $result = json_decode($output, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("OCR raw output: " . substr($output, 0, 1000));
        return ['success' => false, 'error' => 'Invalid OCR output', 'raw' => substr($output, 0, 500)];
    }

    return $result;
}
