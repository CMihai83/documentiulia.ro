<?php
/**
 * Bank Statement Import API
 * POST /api/v1/bank/import-statement.php
 * Content-Type: multipart/form-data
 * - bank_account_id: UUID
 * - file: CSV or OFX file
 * - format: csv|ofx (optional, auto-detected)
 * - mapping: JSON column mapping for CSV (optional)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/RomanianBankService.php';
require_once __DIR__ . '/../../helpers/headers.php';

// Authenticate
$authHeader = getHeader('authorization', '') ?? '';
if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authorization required']);
    exit;
}

$authService = new AuthService();
try {
    $auth = $authService->verifyToken($matches[1]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = getHeader('x-company-id', '');
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

// Check for file upload
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File upload required']);
    exit;
}

$bankAccountId = $_POST['bank_account_id'] ?? '';
if (!$bankAccountId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'bank_account_id required']);
    exit;
}

try {
    $bankService = RomanianBankService::getInstance();

    // Read file content
    $content = file_get_contents($_FILES['file']['tmp_name']);
    $filename = $_FILES['file']['name'];
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

    // Detect format
    $format = $_POST['format'] ?? $extension;

    // Parse column mapping if provided
    $mapping = [];
    if (isset($_POST['mapping'])) {
        $mapping = json_decode($_POST['mapping'], true) ?? [];
    }

    // Import based on format
    if ($format === 'csv') {
        $result = $bankService->importCSV($companyId, $bankAccountId, $content, $mapping);
    } elseif ($format === 'ofx' || $format === 'qfx') {
        $result = $bankService->importOFX($companyId, $bankAccountId, $content);
    } else {
        throw new Exception("Unsupported format: {$format}. Use CSV or OFX.");
    }

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
