<?php
/**
 * Template Editor Endpoint
 * GET /api/v1/receipts/template-editor.php?receipt_id=xxx - Get receipt with OCR data for template creation
 * POST /api/v1/receipts/template-editor.php - Save/update template with field mappings
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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

    $database = Database::getInstance();
    $db = $database->getConnection();

    // Handle GET - Get receipt data for template creation
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $receiptId = $_GET['receipt_id'] ?? null;

        if (empty($receiptId)) {
            throw new Exception('Receipt ID required');
        }

        // Get receipt with OCR data
        $query = "SELECT
                    r.*,
                    CASE
                        WHEN r.file_path LIKE '/var/www/%' THEN REPLACE(r.file_path, '/var/www/documentiulia.ro', '')
                        ELSE r.file_path
                    END as web_path
                  FROM receipts r
                  WHERE r.id = :receipt_id AND r.company_id = :company_id";

        $stmt = $db->prepare($query);
        $stmt->execute([
            ':receipt_id' => $receiptId,
            ':company_id' => $companyId
        ]);

        $receipt = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$receipt) {
            throw new Exception('Receipt not found');
        }

        // Parse OCR text into lines with positions (if available)
        $ocrLines = [];
        if (!empty($receipt['ocr_raw_text'])) {
            $lines = explode("\n", $receipt['ocr_raw_text']);
            foreach ($lines as $index => $line) {
                $line = trim($line);
                if (!empty($line)) {
                    $ocrLines[] = [
                        'index' => $index,
                        'text' => $line,
                        'length' => strlen($line)
                    ];
                }
            }
        }

        // Get existing template if available
        $templateQuery = "SELECT * FROM receipt_templates
                         WHERE company_id = :company_id
                         AND merchant_name = :merchant_name
                         LIMIT 1";
        $stmt = $db->prepare($templateQuery);
        $stmt->execute([
            ':company_id' => $companyId,
            ':merchant_name' => $receipt['merchant_name'] ?? ''
        ]);
        $existingTemplate = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => [
                'receipt' => $receipt,
                'ocr_lines' => $ocrLines,
                'existing_template' => $existingTemplate,
                'image_url' => $receipt['web_path']
            ]
        ]);
        exit();
    }

    // Handle POST - Save template with field mappings
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        $receiptId = $input['receipt_id'] ?? null;
        $merchantName = $input['merchant_name'] ?? null;
        $fieldMappings = $input['field_mappings'] ?? [];

        if (empty($receiptId) || empty($merchantName)) {
            throw new Exception('Receipt ID and merchant name are required');
        }

        // Get receipt for validation
        $query = "SELECT * FROM receipts WHERE id = :receipt_id AND company_id = :company_id";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':receipt_id' => $receiptId,
            ':company_id' => $companyId
        ]);
        $receipt = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$receipt) {
            throw new Exception('Receipt not found');
        }

        // Build patterns from field mappings
        $merchantPattern = $input['merchant_pattern'] ?? preg_quote($merchantName, '/');
        $datePattern = null;
        $amountPattern = null;
        $vatPattern = null;
        $receiptNumberPattern = null;
        $addressPattern = null;

        // Process field mappings to create patterns
        foreach ($fieldMappings as $field => $mapping) {
            if (empty($mapping['pattern'])) continue;

            switch ($field) {
                case 'receipt_date':
                    $datePattern = $mapping['pattern'];
                    break;
                case 'total_amount':
                    $amountPattern = $mapping['pattern'];
                    break;
                case 'vat_amount':
                    $vatPattern = $mapping['pattern'];
                    break;
                case 'receipt_number':
                    $receiptNumberPattern = $mapping['pattern'];
                    break;
                case 'merchant_address':
                    $addressPattern = $mapping['pattern'];
                    break;
            }
        }

        // Store all field mappings as JSON
        $fieldMappingsJson = json_encode($fieldMappings);

        // Check if template exists
        $checkQuery = "SELECT id FROM receipt_templates
                      WHERE company_id = :company_id AND merchant_name = :merchant_name";
        $stmt = $db->prepare($checkQuery);
        $stmt->execute([
            ':company_id' => $companyId,
            ':merchant_name' => $merchantName
        ]);
        $existingTemplate = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existingTemplate) {
            // Update existing template
            $updateQuery = "UPDATE receipt_templates SET
                           merchant_pattern = :merchant_pattern,
                           date_pattern = :date_pattern,
                           amount_pattern = :amount_pattern,
                           vat_pattern = :vat_pattern,
                           field_mappings = :field_mappings,
                           updated_at = CURRENT_TIMESTAMP
                           WHERE id = :id";

            $stmt = $db->prepare($updateQuery);
            $stmt->execute([
                ':id' => $existingTemplate['id'],
                ':merchant_pattern' => $merchantPattern,
                ':date_pattern' => $datePattern,
                ':amount_pattern' => $amountPattern,
                ':vat_pattern' => $vatPattern,
                ':field_mappings' => $fieldMappingsJson
            ]);

            $templateId = $existingTemplate['id'];
        } else {
            // Insert new template
            $insertQuery = "INSERT INTO receipt_templates
                           (company_id, merchant_name, merchant_pattern, date_pattern,
                            amount_pattern, vat_pattern, field_mappings, usage_count)
                           VALUES (:company_id, :merchant_name, :merchant_pattern,
                                  :date_pattern, :amount_pattern, :vat_pattern,
                                  :field_mappings, 1)
                           RETURNING id";

            $stmt = $db->prepare($insertQuery);
            $stmt->execute([
                ':company_id' => $companyId,
                ':merchant_name' => $merchantName,
                ':merchant_pattern' => $merchantPattern,
                ':date_pattern' => $datePattern,
                ':amount_pattern' => $amountPattern,
                ':vat_pattern' => $vatPattern,
                ':field_mappings' => $fieldMappingsJson
            ]);

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $templateId = $result['id'];
        }

        echo json_encode([
            'success' => true,
            'message' => 'Template saved successfully',
            'data' => [
                'template_id' => $templateId
            ]
        ]);
        exit();
    }

    throw new Exception('Method not allowed');

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
