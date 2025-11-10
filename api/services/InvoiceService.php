<?php
/**
 * Invoice Management Service
 * Handles all invoice operations
 */

require_once __DIR__ . '/../config/database.php';

class InvoiceService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Create a new invoice
     */
    public function createInvoice($companyId, $data) {
        $this->db->beginTransaction();

        try {
            // Validate customer exists
            $customer = $this->db->fetchOne(
                "SELECT id FROM contacts WHERE id = :id AND company_id = :company_id AND contact_type = 'customer'",
                ['id' => $data['customer_id'], 'company_id' => $companyId]
            );

            if (!$customer) {
                throw new Exception('Customer not found');
            }

            // Generate invoice number if not provided
            if (empty($data['invoice_number'])) {
                $data['invoice_number'] = $this->generateInvoiceNumber($companyId);
            }

            // Calculate totals from line items
            $subtotal = 0;
            foreach ($data['line_items'] as $item) {
                $subtotal += $item['quantity'] * $item['unit_price'];
            }

            $taxAmount = $data['tax_amount'] ?? 0;
            $discountAmount = $data['discount_amount'] ?? 0;
            $totalAmount = $subtotal + $taxAmount - $discountAmount;

            // Create invoice
            $invoiceId = $this->db->insert('invoices', [
                'company_id' => $companyId,
                'customer_id' => $data['customer_id'],
                'invoice_number' => $data['invoice_number'],
                'invoice_date' => $data['invoice_date'] ?? date('Y-m-d'),
                'due_date' => $data['due_date'] ?? date('Y-m-d', strtotime('+30 days')),
                'payment_terms' => $data['payment_terms'] ?? 30,
                'status' => 'draft',
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'amount_paid' => 0,
                'amount_due' => $totalAmount,
                'currency' => $data['currency'] ?? 'USD',
                'notes' => $data['notes'] ?? null
            ]);

            // Create line items
            $lineNumber = 1;
            foreach ($data['line_items'] as $item) {
                $this->db->insert('invoice_line_items', [
                    'invoice_id' => $invoiceId,
                    'line_number' => $lineNumber++,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'amount' => $item['quantity'] * $item['unit_price']
                ]);
            }

            $this->db->commit();

            return $this->getInvoice($invoiceId);

        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Get invoice by ID
     */
    public function getInvoice($invoiceId) {
        $invoice = $this->db->fetchOne(
            "SELECT i.*, c.display_name as customer_name, c.email as customer_email
             FROM invoices i
             JOIN contacts c ON i.customer_id = c.id
             WHERE i.id = :id",
            ['id' => $invoiceId]
        );

        if (!$invoice) {
            throw new Exception('Invoice not found');
        }

        // Get line items
        $invoice['line_items'] = $this->db->fetchAll(
            "SELECT * FROM invoice_line_items WHERE invoice_id = :id ORDER BY line_number",
            ['id' => $invoiceId]
        );

        return $invoice;
    }

    /**
     * List invoices for a company
     */
    public function listInvoices($companyId, $filters = []) {
        $where = ['company_id = :company_id'];
        $params = ['company_id' => $companyId];

        if (!empty($filters['status'])) {
            $where[] = 'status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['customer_id'])) {
            $where[] = 'customer_id = :customer_id';
            $params['customer_id'] = $filters['customer_id'];
        }

        if (!empty($filters['from_date'])) {
            $where[] = 'invoice_date >= :from_date';
            $params['from_date'] = $filters['from_date'];
        }

        if (!empty($filters['to_date'])) {
            $where[] = 'invoice_date <= :to_date';
            $params['to_date'] = $filters['to_date'];
        }

        $whereClause = implode(' AND ', $where);
        $limit = $filters['limit'] ?? 50;
        $offset = $filters['offset'] ?? 0;

        $sql = "SELECT i.*, c.display_name as customer_name
                FROM invoices i
                JOIN contacts c ON i.customer_id = c.id
                WHERE $whereClause
                ORDER BY i.invoice_date DESC, i.created_at DESC
                LIMIT :limit OFFSET :offset";

        $params['limit'] = $limit;
        $params['offset'] = $offset;

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Update invoice
     */
    public function updateInvoice($invoiceId, $data) {
        $this->db->beginTransaction();

        try {
            $invoice = $this->db->fetchOne("SELECT * FROM invoices WHERE id = :id", ['id' => $invoiceId]);
            if (!$invoice) {
                throw new Exception('Invoice not found');
            }

            // Only allow updates if status is draft
            if ($invoice['status'] !== 'draft') {
                throw new Exception('Only draft invoices can be updated');
            }

            $updateData = [];
            $allowedFields = ['invoice_date', 'due_date', 'payment_terms', 'notes'];

            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateData[$field] = $data[$field];
                }
            }

            if (!empty($updateData)) {
                $this->db->update('invoices', $updateData, "id = '$invoiceId'");
            }

            // Update line items if provided
            if (isset($data['line_items'])) {
                // Delete existing line items
                $this->db->delete('invoice_line_items', 'invoice_id = :id', ['id' => $invoiceId]);

                // Recalculate totals
                $subtotal = 0;
                $lineNumber = 1;
                foreach ($data['line_items'] as $item) {
                    $amount = $item['quantity'] * $item['unit_price'];
                    $subtotal += $amount;

                    $this->db->insert('invoice_line_items', [
                        'invoice_id' => $invoiceId,
                        'line_number' => $lineNumber++,
                        'description' => $item['description'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'amount' => $amount
                    ]);
                }

                // Update invoice totals
                $taxAmount = $data['tax_amount'] ?? $invoice['tax_amount'];
                $discountAmount = $data['discount_amount'] ?? $invoice['discount_amount'];
                $totalAmount = $subtotal + $taxAmount - $discountAmount;

                $this->db->query(
                    "UPDATE invoices SET subtotal = :subtotal, total_amount = :total, amount_due = :due WHERE id = :id",
                    [
                        'subtotal' => $subtotal,
                        'total' => $totalAmount,
                        'due' => $totalAmount - $invoice['amount_paid'],
                        'id' => $invoiceId
                    ]
                );
            }

            $this->db->commit();

            return $this->getInvoice($invoiceId);

        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Send invoice (mark as sent)
     */
    public function sendInvoice($invoiceId) {
        $this->db->query(
            "UPDATE invoices SET status = 'sent', sent_at = NOW() WHERE id = :id AND status = 'draft'",
            ['id' => $invoiceId]
        );

        // TODO: Send email notification
        return $this->getInvoice($invoiceId);
    }

    /**
     * Record payment for invoice
     */
    public function recordPayment($invoiceId, $amount, $paymentDate = null, $paymentMethod = 'bank_transfer') {
        $this->db->beginTransaction();

        try {
            $invoice = $this->db->fetchOne("SELECT * FROM invoices WHERE id = :id", ['id' => $invoiceId]);
            if (!$invoice) {
                throw new Exception('Invoice not found');
            }

            if ($amount > $invoice['amount_due']) {
                throw new Exception('Payment amount exceeds amount due');
            }

            // Create payment record
            $paymentId = $this->db->insert('payments', [
                'company_id' => $invoice['company_id'],
                'payment_type' => 'received',
                'payment_date' => $paymentDate ?? date('Y-m-d'),
                'amount' => $amount,
                'currency' => $invoice['currency'],
                'contact_id' => $invoice['customer_id'],
                'status' => 'completed'
            ]);

            // Update invoice
            $newPaid = $invoice['amount_paid'] + $amount;
            $newDue = $invoice['amount_due'] - $amount;
            $newStatus = $newDue <= 0.01 ? 'paid' : 'partial';

            $this->db->query(
                "UPDATE invoices SET amount_paid = :paid, amount_due = :due, status = :status, paid_at = CASE WHEN :status = 'paid' THEN NOW() ELSE paid_at END WHERE id = :id",
                [
                    'paid' => $newPaid,
                    'due' => $newDue,
                    'status' => $newStatus,
                    'id' => $invoiceId
                ]
            );

            $this->db->commit();

            return [
                'payment_id' => $paymentId,
                'invoice' => $this->getInvoice($invoiceId)
            ];

        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Delete invoice (only drafts)
     */
    public function deleteInvoice($invoiceId) {
        $invoice = $this->db->fetchOne("SELECT status FROM invoices WHERE id = :id", ['id' => $invoiceId]);
        if (!$invoice) {
            throw new Exception('Invoice not found');
        }

        if ($invoice['status'] !== 'draft') {
            throw new Exception('Only draft invoices can be deleted');
        }

        // Line items will be deleted automatically due to CASCADE
        $this->db->delete('invoices', 'id = :id', ['id' => $invoiceId]);
        return true;
    }

    /**
     * Generate next invoice number
     */
    private function generateInvoiceNumber($companyId) {
        $result = $this->db->fetchOne(
            "SELECT invoice_number FROM invoices WHERE company_id = :company_id ORDER BY created_at DESC LIMIT 1",
            ['company_id' => $companyId]
        );

        if ($result && preg_match('/INV-(\d+)/', $result['invoice_number'], $matches)) {
            $nextNumber = intval($matches[1]) + 1;
        } else {
            $nextNumber = 1;
        }

        return 'INV-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get invoice statistics for dashboard
     */
    public function getStats($companyId, $fromDate = null, $toDate = null) {
        $where = ['company_id = :company_id'];
        $params = ['company_id' => $companyId];

        if ($fromDate) {
            $where[] = 'invoice_date >= :from_date';
            $params['from_date'] = $fromDate;
        }

        if ($toDate) {
            $where[] = 'invoice_date <= :to_date';
            $params['to_date'] = $toDate;
        }

        $whereClause = implode(' AND ', $where);

        $stats = $this->db->fetchOne("
            SELECT
                COUNT(*) as total_invoices,
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
                COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
                COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
                COALESCE(SUM(total_amount), 0) as total_billed,
                COALESCE(SUM(amount_paid), 0) as total_paid,
                COALESCE(SUM(amount_due), 0) as total_outstanding
            FROM invoices
            WHERE $whereClause
        ", $params);

        return $stats;
    }
}
