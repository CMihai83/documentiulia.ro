<?php
/**
 * Upload receipt image
 *
 * POST /api/v1/receipts/upload
 * Content-Type: multipart/form-data
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ReceiptService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company ID
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    // Validate file upload
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'File too large (exceeds server limit)',
            UPLOAD_ERR_FORM_SIZE => 'File too large',
            UPLOAD_ERR_PARTIAL => 'File upload incomplete',
            UPLOAD_ERR_NO_FILE => 'No file uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Temporary directory missing',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
        ];

        $error = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
        throw new Exception($errorMessages[$error] ?? 'File upload failed');
    }

    // Upload receipt
    $receiptService = new ReceiptService();
    $result = $receiptService->uploadReceipt($_FILES['file'], $companyId, $userData['user_id']);

    // Optionally auto-process
    $autoProcess = isset($_POST['auto_process']) && $_POST['auto_process'] === 'true';

    if ($autoProcess) {
        try {
            $processedReceipt = $receiptService->processReceipt($result['receipt_id']);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'data' => $processedReceipt,
                'message' => 'Receipt uploaded and processed successfully'
            ]);
        } catch (Exception $e) {
            // If processing fails, still return successful upload
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'data' => $result,
                'processing_error' => $e->getMessage(),
                'message' => 'Receipt uploaded but processing failed. You can retry processing later.'
            ]);
        }
    } else {
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'data' => $result,
            'message' => 'Receipt uploaded successfully. Call /process to extract data.'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
