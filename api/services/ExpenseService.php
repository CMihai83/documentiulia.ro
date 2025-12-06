<?php
/**
 * Expense Management Service
 * Handles expense tracking with receipt uploads
 */

require_once __DIR__ . '/../config/database.php';

class ExpenseService {
    private $db;
    private $uploadDir = '/var/www/documentiulia.ro/storage/receipts/';

    public function __construct() {
        $this->db = Database::getInstance();

        // Create upload directory if it doesn't exist
        if (!is_dir($this->uploadDir)) {
            @mkdir($this->uploadDir, 0755, true);
        }
    }

    /**
     * Create a new expense
     */
    public function createExpense($companyId, $data, $receiptFile = null) {
        $this->db->beginTransaction();

        try {
            // Create expense record
            $expenseId = $this->db->insert('expenses', [
                'company_id' => $companyId,
                'expense_date' => $data['expense_date'] ?? date('Y-m-d'),
                'vendor_id' => $data['vendor_id'] ?? null,
                'amount' => $data['amount'],
                'currency' => $data['currency'] ?? 'USD',
                'description' => $data['description'] ?? '',
                'category' => $data['category'] ?? 'general',
                'status' => 'pending'
            ]);

            // Handle receipt upload if provided
            if ($receiptFile && $receiptFile['error'] === UPLOAD_ERR_OK) {
                $receiptId = $this->uploadReceipt($expenseId, $receiptFile);
            }

            $this->db->commit();

            return $this->getExpense($expenseId);

        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Upload receipt file
     */
    private function uploadReceipt($expenseId, $file) {
        $allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

        if (!in_array($file['type'], $allowedTypes)) {
            throw new Exception('Invalid file type. Only JPG, PNG, and PDF allowed.');
        }

        // Maximum file size: 5MB
        if ($file['size'] > 5 * 1024 * 1024) {
            throw new Exception('File too large. Maximum size is 5MB.');
        }

        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = $expenseId . '_' . uniqid() . '.' . $extension;
        $filepath = $this->uploadDir . $filename;

        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            throw new Exception('Failed to upload file');
        }

        // TODO: Implement OCR here using Google Vision API or AWS Textract
        // For now, just store the file reference

        // Store receipt record (we need to create expense_receipts table first)
        // For now, just return the filename
        return $filename;
    }

    /**
     * Get expense by ID
     */
    public function getExpense($expenseId) {
        $expense = $this->db->fetchOne(
            "SELECT e.*, v.display_name as vendor_name
             FROM expenses e
             LEFT JOIN contacts v ON e.vendor_id = v.id
             WHERE e.id = :id",
            ['id' => $expenseId]
        );

        if (!$expense) {
            throw new Exception('Expense not found');
        }

        return $expense;
    }

    /**
     * List expenses
     */
    public function listExpenses($companyId, $filters = []) {
        $where = ['e.company_id = :company_id'];
        $params = ['company_id' => $companyId];

        if (!empty($filters['status'])) {
            $where[] = 'e.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['category'])) {
            $where[] = 'e.category = :category';
            $params['category'] = $filters['category'];
        }

        if (!empty($filters['vendor_id'])) {
            $where[] = 'e.vendor_id = :vendor_id';
            $params['vendor_id'] = $filters['vendor_id'];
        }

        if (!empty($filters['from_date'])) {
            $where[] = 'e.expense_date >= :from_date';
            $params['from_date'] = $filters['from_date'];
        }

        if (!empty($filters['to_date'])) {
            $where[] = 'e.expense_date <= :to_date';
            $params['to_date'] = $filters['to_date'];
        }

        $whereClause = implode(' AND ', $where);
        $limit = $filters['limit'] ?? 50;
        $offset = $filters['offset'] ?? 0;

        $sql = "SELECT e.*, v.display_name as vendor_name
                FROM expenses e
                LEFT JOIN contacts v ON e.vendor_id = v.id
                WHERE $whereClause
                ORDER BY e.expense_date DESC, e.created_at DESC
                LIMIT :limit OFFSET :offset";

        $params['limit'] = $limit;
        $params['offset'] = $offset;

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Update expense
     */
    public function updateExpense($expenseId, $data) {
        $expense = $this->db->fetchOne("SELECT * FROM expenses WHERE id = :id", ['id' => $expenseId]);
        if (!$expense) {
            throw new Exception('Expense not found');
        }

        // Only allow updates if not approved
        if ($expense['status'] === 'approved') {
            throw new Exception('Approved expenses cannot be updated');
        }

        $updateData = [];
        $allowedFields = ['expense_date', 'vendor_id', 'amount', 'description', 'category', 'status'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (empty($updateData)) {
            throw new Exception('No valid fields to update');
        }

        $this->db->update('expenses', $updateData, "id = '$expenseId'");
        return $this->getExpense($expenseId);
    }

    /**
     * Approve expense
     */
    public function approveExpense($expenseId, $userId) {
        $this->db->query(
            "UPDATE expenses SET status = 'approved', approved_by = :user_id, approved_at = NOW() WHERE id = :id",
            ['id' => $expenseId, 'user_id' => $userId]
        );

        return $this->getExpense($expenseId);
    }

    /**
     * Reject expense
     */
    public function rejectExpense($expenseId) {
        $this->db->query(
            "UPDATE expenses SET status = 'rejected' WHERE id = :id",
            ['id' => $expenseId]
        );

        return $this->getExpense($expenseId);
    }

    /**
     * Delete expense
     */
    public function deleteExpense($expenseId) {
        $expense = $this->db->fetchOne("SELECT status FROM expenses WHERE id = :id", ['id' => $expenseId]);
        if (!$expense) {
            throw new Exception('Expense not found');
        }

        if ($expense['status'] === 'approved') {
            throw new Exception('Approved expenses cannot be deleted');
        }

        $this->db->delete('expenses', 'id = :id', ['id' => $expenseId]);
        return true;
    }

    /**
     * Get expense statistics
     */
    public function getStats($companyId, $fromDate = null, $toDate = null) {
        $where = ['company_id = :company_id'];
        $params = ['company_id' => $companyId];

        if ($fromDate) {
            $where[] = 'expense_date >= :from_date';
            $params['from_date'] = $fromDate;
        }

        if ($toDate) {
            $where[] = 'expense_date <= :to_date';
            $params['to_date'] = $toDate;
        }

        $whereClause = implode(' AND ', $where);

        // Overall stats
        $stats = $this->db->fetchOne("
            SELECT
                COUNT(*) as total_expenses,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_amount,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
            FROM expenses
            WHERE $whereClause
        ", $params);

        // By category
        $byCategory = $this->db->fetchAll("
            SELECT
                category,
                COUNT(*) as count,
                SUM(amount) as total_amount
            FROM expenses
            WHERE $whereClause
            GROUP BY category
            ORDER BY total_amount DESC
        ", $params);

        return [
            'overall' => $stats,
            'by_category' => $byCategory
        ];
    }

    /**
     * Categorize expense using AI (placeholder)
     * TODO: Implement actual AI categorization
     */
    public function categorizeExpense($description, $vendor = null) {
        // Simple keyword matching for now
        $categories = [
            'office' => ['office', 'supplies', 'stationery', 'printer'],
            'travel' => ['flight', 'hotel', 'uber', 'taxi', 'airbnb'],
            'meals' => ['restaurant', 'lunch', 'dinner', 'coffee', 'starbucks'],
            'software' => ['saas', 'subscription', 'software', 'license'],
            'utilities' => ['electric', 'water', 'internet', 'phone'],
            'marketing' => ['advertising', 'ads', 'facebook', 'google ads'],
            'rent' => ['rent', 'lease', 'office space']
        ];

        $description = strtolower($description);

        foreach ($categories as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($description, $keyword) !== false) {
                    return $category;
                }
            }
        }

        return 'general';
    }
}
