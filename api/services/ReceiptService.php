<?php
/**
 * Receipt Service - Main service for receipt management
 *
 * Handles:
 * - Receipt file upload
 * - OCR processing coordination
 * - Receipt data storage
 * - Linking receipts to expenses
 */

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/OCRService.php';
require_once __DIR__ . '/ReceiptParser.php';

class ReceiptService
{
    private $db;
    private $ocrService;
    private $parser;
    private $uploadDir;

    public function __construct()
    {
        $database = Database::getInstance();
        $this->db = $database->getConnection();
        $this->ocrService = new OCRService();
        $this->parser = new ReceiptParser();

        // Set upload directory
        $this->uploadDir = '/var/www/documentiulia.ro/uploads/receipts/';

        // Create directory if doesn't exist
        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }

    /**
     * Upload receipt file
     *
     * @param array $file $_FILES array
     * @param string $companyId Company UUID
     * @param string $userId User UUID
     * @return array Receipt ID and details
     */
    public function uploadReceipt(array $file, string $companyId, string $userId): array
    {
        try {
            $this->db->beginTransaction();

            // Validate file
            if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
                throw new Exception("Invalid file upload");
            }

            // Validate image
            $validation = $this->ocrService->validateImage($file['tmp_name']);
            if (!$validation['valid']) {
                throw new Exception($validation['error']);
            }

            // Generate unique filename
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = uniqid('receipt_') . '_' . time() . '.' . $extension;

            // Create company/year/month directory structure
            $year = date('Y');
            $month = date('m');
            $targetDir = $this->uploadDir . "{$companyId}/{$year}/{$month}/";

            if (!is_dir($targetDir)) {
                mkdir($targetDir, 0755, true);
            }

            $targetPath = $targetDir . $filename;

            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                throw new Exception("Failed to move uploaded file");
            }

            // Store receipt record in database
            $query = "INSERT INTO receipts (
                company_id, user_id, filename, file_path, file_size, file_type,
                ocr_status, image_width, image_height
            ) VALUES (
                :company_id, :user_id, :filename, :file_path, :file_size, :file_type,
                'pending', :width, :height
            ) RETURNING id";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':company_id' => $companyId,
                ':user_id' => $userId,
                ':filename' => $filename,
                ':file_path' => $targetPath,
                ':file_size' => $validation['file_size'],
                ':file_type' => $validation['mime_type'],
                ':width' => $validation['width'] ?? null,
                ':height' => $validation['height'] ?? null
            ]);

            $receiptId = $stmt->fetchColumn();

            $this->db->commit();

            return [
                'receipt_id' => $receiptId,
                'filename' => $filename,
                'file_path' => $targetPath,
                'status' => 'pending',
                'message' => 'Receipt uploaded successfully'
            ];

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("ReceiptService::uploadReceipt Error: " . $e->getMessage());
            throw new Exception("Upload failed: " . $e->getMessage());
        }
    }

    /**
     * Process receipt with OCR
     *
     * @param string $receiptId Receipt UUID
     * @return array Processed receipt data
     */
    public function processReceipt(string $receiptId): array
    {
        try {
            $this->db->beginTransaction();

            // Get receipt details
            $receipt = $this->getReceipt($receiptId);

            if ($receipt['ocr_status'] === 'completed') {
                throw new Exception("Receipt already processed");
            }

            // Update status to processing
            $this->updateReceiptStatus($receiptId, 'processing');

            // Perform OCR
            $ocrResult = $this->ocrService->processReceipt($receipt['file_path']);

            if (!$ocrResult['success']) {
                throw new Exception("OCR processing failed");
            }

            // Parse OCR results
            $parsedData = $this->parser->parse(
                $ocrResult['raw_text'],
                $ocrResult['structure'],
                $receipt['company_id']
            );

            // Calculate overall confidence
            $overallConfidence = $this->parser->calculateOverallConfidence($parsedData);

            // Update receipt with parsed data
            $query = "UPDATE receipts SET
                ocr_status = 'completed',
                ocr_provider = :provider,
                ocr_raw_text = :raw_text,
                ocr_confidence = :confidence,
                processed_at = CURRENT_TIMESTAMP,
                merchant_name = :merchant_name,
                merchant_confidence = :merchant_confidence,
                receipt_date = :receipt_date,
                date_confidence = :date_confidence,
                total_amount = :total_amount,
                amount_confidence = :amount_confidence,
                vat_amount = :vat_amount,
                vat_rate = :vat_rate,
                vat_confidence = :vat_confidence,
                currency = :currency,
                payment_method = :payment_method,
                receipt_number = :receipt_number,
                line_items = :line_items,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = :receipt_id";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':receipt_id' => $receiptId,
                ':provider' => $ocrResult['provider'],
                ':raw_text' => $ocrResult['raw_text'],
                ':confidence' => $overallConfidence,
                ':merchant_name' => $parsedData['merchant_name']['value'] ?? null,
                ':merchant_confidence' => $parsedData['merchant_name']['confidence'] ?? null,
                ':receipt_date' => $parsedData['receipt_date']['value'] ?? null,
                ':date_confidence' => $parsedData['receipt_date']['confidence'] ?? null,
                ':total_amount' => $parsedData['total_amount']['value'] ?? null,
                ':amount_confidence' => $parsedData['total_amount']['confidence'] ?? null,
                ':vat_amount' => $parsedData['vat_amount']['value'] ?? null,
                ':vat_rate' => $parsedData['vat_rate'],
                ':vat_confidence' => $parsedData['vat_amount']['confidence'] ?? null,
                ':currency' => $parsedData['currency'],
                ':payment_method' => $parsedData['payment_method'],
                ':receipt_number' => $parsedData['receipt_number'],
                ':line_items' => json_encode($parsedData['line_items'])
            ]);

            $this->db->commit();

            return $this->getReceipt($receiptId);

        } catch (Exception $e) {
            $this->db->rollBack();

            // Update status to failed
            $this->updateReceiptStatus($receiptId, 'failed', $e->getMessage());

            error_log("ReceiptService::processReceipt Error: " . $e->getMessage());
            throw new Exception("Processing failed: " . $e->getMessage());
        }
    }

    /**
     * Get receipt by ID
     *
     * @param string $receiptId Receipt UUID
     * @return array Receipt details
     */
    public function getReceipt(string $receiptId): array
    {
        $query = "SELECT * FROM receipts WHERE id = :receipt_id";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':receipt_id' => $receiptId]);

        $receipt = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$receipt) {
            throw new Exception("Receipt not found");
        }

        // Decode JSON fields
        if ($receipt['line_items']) {
            $receipt['line_items'] = json_decode($receipt['line_items'], true);
        }
        if ($receipt['corrections']) {
            $receipt['corrections'] = json_decode($receipt['corrections'], true);
        }
        if ($receipt['metadata']) {
            $receipt['metadata'] = json_decode($receipt['metadata'], true);
        }

        return $receipt;
    }

    /**
     * List receipts for a company
     *
     * @param string $companyId Company UUID
     * @param array $filters Optional filters
     * @param int $limit Pagination limit
     * @param int $offset Pagination offset
     * @return array Receipts list
     */
    public function listReceipts(
        string $companyId,
        array $filters = [],
        int $limit = 50,
        int $offset = 0
    ): array {
        $query = "SELECT
            id, filename, file_size, file_type,
            ocr_status, ocr_confidence, processed_at,
            merchant_name, receipt_date, total_amount, currency,
            expense_id, created_at
            FROM receipts
            WHERE company_id = :company_id";

        $params = [':company_id' => $companyId];

        // Apply filters
        if (!empty($filters['status'])) {
            $query .= " AND ocr_status = :status";
            $params[':status'] = $filters['status'];
        }

        if (!empty($filters['date_from'])) {
            $query .= " AND receipt_date >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $query .= " AND receipt_date <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        if (!empty($filters['merchant'])) {
            $query .= " AND merchant_name ILIKE :merchant";
            $params[':merchant'] = '%' . $filters['merchant'] . '%';
        }

        if (isset($filters['linked'])) {
            if ($filters['linked']) {
                $query .= " AND expense_id IS NOT NULL";
            } else {
                $query .= " AND expense_id IS NULL";
            }
        }

        $query .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Link receipt to expense
     *
     * @param string $receiptId Receipt UUID
     * @param string $expenseId Expense UUID
     * @return bool Success
     */
    public function linkToExpense(string $receiptId, string $expenseId): bool
    {
        try {
            $query = "UPDATE receipts SET
                expense_id = :expense_id,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = :receipt_id";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':receipt_id' => $receiptId,
                ':expense_id' => $expenseId
            ]);

            return $stmt->rowCount() > 0;

        } catch (Exception $e) {
            error_log("ReceiptService::linkToExpense Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update receipt status
     */
    private function updateReceiptStatus(string $receiptId, string $status, ?string $errorMessage = null): void
    {
        $query = "UPDATE receipts SET
            ocr_status = :status,
            error_message = :error_message,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = :receipt_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':receipt_id' => $receiptId,
            ':status' => $status,
            ':error_message' => $errorMessage
        ]);
    }

    /**
     * Delete receipt
     *
     * @param string $receiptId Receipt UUID
     * @return bool Success
     */
    public function deleteReceipt(string $receiptId): bool
    {
        try {
            $this->db->beginTransaction();

            // Get receipt details
            $receipt = $this->getReceipt($receiptId);

            // Delete file
            if (file_exists($receipt['file_path'])) {
                unlink($receipt['file_path']);
            }

            // Delete database record
            $query = "DELETE FROM receipts WHERE id = :receipt_id";
            $stmt = $this->db->prepare($query);
            $stmt->execute([':receipt_id' => $receiptId]);

            $this->db->commit();

            return true;

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("ReceiptService::deleteReceipt Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update receipt fields (user corrections)
     *
     * @param string $receiptId Receipt UUID
     * @param array $updates Fields to update
     * @return bool Success
     */
    public function updateReceiptFields(string $receiptId, array $updates): bool
    {
        try {
            // Get current receipt
            $receipt = $this->getReceipt($receiptId);

            // Track corrections
            $corrections = $receipt['corrections'] ?? [];

            $setParts = [];
            $params = [':receipt_id' => $receiptId];

            foreach ($updates as $field => $value) {
                $allowedFields = ['merchant_name', 'receipt_date', 'total_amount', 'vat_amount', 'currency', 'payment_method'];

                if (in_array($field, $allowedFields)) {
                    $setParts[] = "{$field} = :{$field}";
                    $params[":{$field}"] = $value;

                    // Track correction
                    if (isset($receipt[$field]) && $receipt[$field] != $value) {
                        $corrections[$field] = [
                            'original' => $receipt[$field],
                            'corrected' => $value
                        ];
                    }
                }
            }

            if (empty($setParts)) {
                return false;
            }

            // Mark as corrected
            $setParts[] = "was_corrected = true";
            $setParts[] = "corrections = :corrections";
            $setParts[] = "updated_at = CURRENT_TIMESTAMP";
            $params[':corrections'] = json_encode($corrections);

            $query = "UPDATE receipts SET " . implode(', ', $setParts) . " WHERE id = :receipt_id";

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);

            return $stmt->rowCount() > 0;

        } catch (Exception $e) {
            error_log("ReceiptService::updateReceiptFields Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get receipt statistics
     *
     * @param string $companyId Company UUID
     * @return array Statistics
     */
    public function getReceiptStats(string $companyId): array
    {
        $query = "SELECT * FROM receipt_stats WHERE company_id = :company_id";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':company_id' => $companyId]);

        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$stats) {
            return [
                'total_receipts' => 0,
                'completed' => 0,
                'pending' => 0,
                'failed' => 0,
                'linked_to_expense' => 0,
                'avg_confidence' => 0
            ];
        }

        return $stats;
    }
}
