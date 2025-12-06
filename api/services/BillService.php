<?php
/**
 * Bill & Payables Management Service
 * Handles vendor bills and payments
 */

require_once __DIR__ . '/../config/database.php';

class BillService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Create a new bill
     */
    public function createBill($companyId, $data) {
        $this->db->beginTransaction();

        try {
            // Validate vendor exists
            $vendor = $this->db->fetchOne(
                "SELECT id FROM contacts WHERE id = :id AND company_id = :company_id AND contact_type = 'vendor'",
                ['id' => $data['vendor_id'], 'company_id' => $companyId]
            );

            if (!$vendor) {
                throw new Exception('Vendor not found');
            }

            // Calculate totals from line items
            $subtotal = 0;
            foreach ($data['line_items'] as $item) {
                $subtotal += $item['quantity'] * $item['unit_price'];
            }

            $taxAmount = $data['tax_amount'] ?? 0;
            $totalAmount = $subtotal + $taxAmount;

            // Create bill
            $billId = $this->db->insert('bills', [
                'company_id' => $companyId,
                'vendor_id' => $data['vendor_id'],
                'bill_number' => $data['bill_number'] ?? null,
                'bill_date' => $data['bill_date'] ?? date('Y-m-d'),
                'due_date' => $data['due_date'] ?? date('Y-m-d', strtotime('+30 days')),
                'status' => 'draft',
                'total_amount' => $totalAmount,
                'amount_paid' => 0,
                'amount_due' => $totalAmount
            ]);

            // Create line items
            $lineNumber = 1;
            foreach ($data['line_items'] as $item) {
                $this->db->insert('bill_line_items', [
                    'bill_id' => $billId,
                    'line_number' => $lineNumber++,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'amount' => $item['quantity'] * $item['unit_price']
                ]);
            }

            $this->db->commit();

            return $this->getBill($billId);

        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Get bill by ID
     */
    public function getBill($billId) {
        $bill = $this->db->fetchOne(
            "SELECT b.*, v.display_name as vendor_name, v.email as vendor_email
             FROM bills b
             JOIN contacts v ON b.vendor_id = v.id
             WHERE b.id = :id",
            ['id' => $billId]
        );

        if (!$bill) {
            throw new Exception('Bill not found');
        }

        // Get line items
        $bill['line_items'] = $this->db->fetchAll(
            "SELECT * FROM bill_line_items WHERE bill_id = :id ORDER BY line_number",
            ['id' => $billId]
        );

        return $bill;
    }

    /**
     * List bills for a company
     */
    public function listBills($companyId, $filters = []) {
        $where = ['b.company_id = :company_id'];
        $params = ['company_id' => $companyId];

        if (!empty($filters['status'])) {
            $where[] = 'b.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['vendor_id'])) {
            $where[] = 'b.vendor_id = :vendor_id';
            $params['vendor_id'] = $filters['vendor_id'];
        }

        if (!empty($filters['from_date'])) {
            $where[] = 'b.bill_date >= :from_date';
            $params['from_date'] = $filters['from_date'];
        }

        if (!empty($filters['to_date'])) {
            $where[] = 'b.bill_date <= :to_date';
            $params['to_date'] = $filters['to_date'];
        }

        $whereClause = implode(' AND ', $where);
        $limit = $filters['limit'] ?? 50;
        $offset = $filters['offset'] ?? 0;

        $sql = "SELECT b.*, v.display_name as vendor_name
                FROM bills b
                JOIN contacts v ON b.vendor_id = v.id
                WHERE $whereClause
                ORDER BY b.bill_date DESC, b.created_at DESC
                LIMIT :limit OFFSET :offset";

        $params['limit'] = $limit;
        $params['offset'] = $offset;

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Update bill
     */
    public function updateBill($billId, $data) {
        $this->db->beginTransaction();

        try {
            $bill = $this->db->fetchOne("SELECT * FROM bills WHERE id = :id", ['id' => $billId]);
            if (!$bill) {
                throw new Exception('Bill not found');
            }

            // Only allow updates if status is draft
            if ($bill['status'] !== 'draft') {
                throw new Exception('Only draft bills can be updated');
            }

            $updateData = [];
            $allowedFields = ['bill_number', 'bill_date', 'due_date', 'status'];

            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateData[$field] = $data[$field];
                }
            }

            if (!empty($updateData)) {
                $this->db->update('bills', $updateData, "id = '$billId'");
            }

            // Update line items if provided
            if (isset($data['line_items'])) {
                // Delete existing line items
                $this->db->delete('bill_line_items', 'bill_id = :id', ['id' => $billId]);

                // Recalculate totals
                $subtotal = 0;
                $lineNumber = 1;
                foreach ($data['line_items'] as $item) {
                    $amount = $item['quantity'] * $item['unit_price'];
                    $subtotal += $amount;

                    $this->db->insert('bill_line_items', [
                        'bill_id' => $billId,
                        'line_number' => $lineNumber++,
                        'description' => $item['description'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'amount' => $amount
                    ]);
                }

                // Update bill totals
                $taxAmount = $data['tax_amount'] ?? $bill['tax_amount'];
                $totalAmount = $subtotal + $taxAmount;

                $this->db->query(
                    "UPDATE bills SET total_amount = :total, amount_due = :due WHERE id = :id",
                    [
                        'total' => $totalAmount,
                        'due' => $totalAmount - $bill['amount_paid'],
                        'id' => $billId
                    ]
                );
            }

            $this->db->commit();

            return $this->getBill($billId);

        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Mark bill as open (approve for payment)
     */
    public function approveBill($billId) {
        $this->db->query(
            "UPDATE bills SET status = 'open' WHERE id = :id AND status = 'draft'",
            ['id' => $billId]
        );

        return $this->getBill($billId);
    }

    /**
     * Record payment for bill
     */
    public function recordPayment($billId, $amount, $paymentDate = null, $paymentMethod = 'bank_transfer') {
        $this->db->beginTransaction();

        try {
            $bill = $this->db->fetchOne("SELECT * FROM bills WHERE id = :id", ['id' => $billId]);
            if (!$bill) {
                throw new Exception('Bill not found');
            }

            if ($amount > $bill['amount_due']) {
                throw new Exception('Payment amount exceeds amount due');
            }

            // Create payment record
            $paymentId = $this->db->insert('payments', [
                'company_id' => $bill['company_id'],
                'payment_type' => 'sent',
                'payment_date' => $paymentDate ?? date('Y-m-d'),
                'amount' => $amount,
                'contact_id' => $bill['vendor_id'],
                'status' => 'completed'
            ]);

            // Update bill
            $newPaid = $bill['amount_paid'] + $amount;
            $newDue = $bill['amount_due'] - $amount;
            $newStatus = $newDue <= 0.01 ? 'paid' : 'partial';

            $this->db->query(
                "UPDATE bills SET amount_paid = :paid, amount_due = :due, status = :status, paid_at = CASE WHEN :status = 'paid' THEN NOW() ELSE paid_at END WHERE id = :id",
                [
                    'paid' => $newPaid,
                    'due' => $newDue,
                    'status' => $newStatus,
                    'id' => $billId
                ]
            );

            $this->db->commit();

            return [
                'payment_id' => $paymentId,
                'bill' => $this->getBill($billId)
            ];

        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Delete bill (only drafts)
     */
    public function deleteBill($billId) {
        $bill = $this->db->fetchOne("SELECT status FROM bills WHERE id = :id", ['id' => $billId]);
        if (!$bill) {
            throw new Exception('Bill not found');
        }

        if ($bill['status'] !== 'draft') {
            throw new Exception('Only draft bills can be deleted');
        }

        $this->db->delete('bills', 'id = :id', ['id' => $billId]);
        return true;
    }

    /**
     * Get bill statistics
     */
    public function getStats($companyId, $fromDate = null, $toDate = null) {
        $where = ['bills.company_id = :company_id'];
        $params = ['company_id' => $companyId];

        if ($fromDate) {
            $where[] = 'bills.bill_date >= :from_date';
            $params['from_date'] = $fromDate;
        }

        if ($toDate) {
            $where[] = 'bills.bill_date <= :to_date';
            $params['to_date'] = $toDate;
        }

        $whereClause = implode(' AND ', $where);

        $stats = $this->db->fetchOne("
            SELECT
                COUNT(*) as total_bills,
                COUNT(CASE WHEN bills.status = 'draft' THEN 1 END) as draft_count,
                COUNT(CASE WHEN bills.status = 'open' THEN 1 END) as open_count,
                COUNT(CASE WHEN bills.status = 'partial' THEN 1 END) as partial_count,
                COUNT(CASE WHEN bills.status = 'paid' THEN 1 END) as paid_count,
                COUNT(CASE WHEN bills.status = 'overdue' THEN 1 END) as overdue_count,
                COALESCE(SUM(bills.total_amount), 0) as total_billed,
                COALESCE(SUM(bills.amount_paid), 0) as total_paid,
                COALESCE(SUM(bills.amount_due), 0) as total_outstanding
            FROM bills
            WHERE $whereClause
        ", $params);

        return $stats;
    }
}
