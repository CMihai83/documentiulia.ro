<?php
/**
 * Update Receipt Endpoint
 * PUT /api/v1/receipts/update.php
 *
 * Allows users to correct OCR-extracted receipt data
 * Automatically saves/updates templates for future recognition
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ReceiptService.php';
require_once __DIR__ . '/../../services/ReceiptParser.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company ID
    $companyId = getHeader('x-company-id') ?? null;
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    // Get input data
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['receipt_id'])) {
        throw new Exception('Receipt ID is required');
    }

    $receiptId = $input['receipt_id'];
    $saveTemplate = $input['save_template'] ?? true; // Default to saving template

    // Validate required fields for update
    $updateData = [];

    if (isset($input['merchant_name'])) {
        $updateData['merchant_name'] = trim($input['merchant_name']);
    }

    if (isset($input['receipt_date'])) {
        $updateData['receipt_date'] = $input['receipt_date'];
    }

    if (isset($input['total_amount'])) {
        $updateData['total_amount'] = floatval($input['total_amount']);
    }

    if (isset($input['vat_amount'])) {
        $updateData['vat_amount'] = floatval($input['vat_amount']);
    }

    if (isset($input['category'])) {
        $updateData['category'] = trim($input['category']);
    }

    if (isset($input['notes'])) {
        $updateData['notes'] = trim($input['notes']);
    }

    if (empty($updateData)) {
        throw new Exception('No update data provided');
    }

    // Initialize services
    $receiptService = new ReceiptService();
    $receiptParser = new ReceiptParser();

    // Get current receipt data
    $database = Database::getInstance();
    $db = $database->getConnection();

    $query = "SELECT * FROM receipts WHERE id = :receipt_id AND company_id = :company_id";
    $stmt = $db->prepare($query);
    $stmt->execute([
        ':receipt_id' => $receiptId,
        ':company_id' => $companyId
    ]);

    $receipt = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$receipt) {
        throw new Exception('Receipt not found or access denied');
    }

    // Update receipt data
    $updateFields = [];
    $params = [':receipt_id' => $receiptId];

    foreach ($updateData as $key => $value) {
        $updateFields[] = "$key = :$key";
        $params[":$key"] = $value;
    }

    // Mark as manually corrected
    $updateFields[] = "was_corrected = true";

    // Build corrections JSON tracking what was changed
    $corrections = [];
    foreach ($updateData as $key => $value) {
        $corrections[$key] = [
            'old' => $receipt[$key] ?? null,
            'new' => $value,
            'corrected_at' => date('Y-m-d H:i:s'),
            'corrected_by' => $userData['user_id']
        ];
    }

    $updateFields[] = "corrections = :corrections";
    $params[':corrections'] = json_encode($corrections);

    $updateQuery = "UPDATE receipts SET " . implode(', ', $updateFields) . " WHERE id = :receipt_id";
    $stmt = $db->prepare($updateQuery);
    $stmt->execute($params);

    // Save template if requested and we have merchant name
    $templateSaved = false;
    if ($saveTemplate && !empty($updateData['merchant_name']) && !empty($receipt['ocr_raw_text'])) {
        // Merge corrected data with existing receipt data
        $correctedData = array_merge([
            'merchant_name' => $receipt['merchant_name'],
            'receipt_date' => $receipt['receipt_date'],
            'total_amount' => $receipt['total_amount'],
            'vat_amount' => $receipt['vat_amount']
        ], $updateData);

        $templateSaved = $receiptParser->saveTemplate(
            $companyId,
            $updateData['merchant_name'],
            $receipt['ocr_raw_text'],
            $correctedData
        );
    }

    // Get updated receipt
    $stmt = $db->prepare("SELECT * FROM receipts WHERE id = :receipt_id");
    $stmt->execute([':receipt_id' => $receiptId]);
    $updatedReceipt = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'Receipt updated successfully',
        'data' => [
            'receipt' => $updatedReceipt,
            'template_saved' => $templateSaved
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
