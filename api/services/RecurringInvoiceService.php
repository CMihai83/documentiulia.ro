<?php
/**
 * Recurring Invoice Service
 *
 * Handles automated recurring invoice generation:
 * - Monthly/Quarterly/Yearly billing cycles
 * - Auto-generation via cron job
 * - Email notifications
 * - Template management
 *
 * @version 1.0.0
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/InvoiceService.php';
require_once __DIR__ . '/EmailService.php';
require_once __DIR__ . '/InvoicePDFService.php';

class RecurringInvoiceService {
    private $db;
    private $invoiceService;
    private $emailService;
    private $pdfService;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->invoiceService = new InvoiceService();
        $this->emailService = new EmailService();
        $this->pdfService = new InvoicePDFService();
    }

    // ==================== CRUD OPERATIONS ====================

    /**
     * Create recurring invoice template
     *
     * @param string $companyId Company UUID
     * @param string $userId User UUID
     * @param array $data Recurring invoice data
     * @return string Recurring invoice ID
     */
    public function createRecurringInvoice($companyId, $userId, $data) {
        if (empty($data['customer_id'])) {
            throw new Exception('Customer ID is required');
        }

        if (empty($data['frequency'])) {
            throw new Exception('Billing frequency is required');
        }

        // Validate frequency
        $validFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly'];
        if (!in_array($data['frequency'], $validFrequencies)) {
            throw new Exception('Invalid frequency. Use: weekly, monthly, quarterly, or yearly');
        }

        // Calculate next invoice date
        $startDate = $data['start_date'] ?? date('Y-m-d');
        $nextInvoiceDate = $this->calculateNextInvoiceDate($startDate, $data['frequency']);

        // Validate line items
        if (empty($data['line_items']) || !is_array($data['line_items'])) {
            throw new Exception('At least one line item is required');
        }

        // Calculate totals
        $totals = $this->calculateTotals($data['line_items']);

        // Create recurring invoice
        $result = $this->db->fetchOne(
            "INSERT INTO recurring_invoice_templates (
                company_id, customer_id, frequency, start_date,
                next_invoice_date, end_date, invoice_template,
                subtotal, tax_amount, total_amount, status,
                auto_send, created_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
            RETURNING id",
            [
                $companyId,
                $data['customer_id'],
                $data['frequency'],
                $startDate,
                $nextInvoiceDate,
                $data['end_date'] ?? null,
                json_encode([
                    'line_items' => $data['line_items'],
                    'notes' => $data['notes'] ?? null,
                    'terms' => $data['terms'] ?? null,
                    'due_days' => $data['due_days'] ?? 30
                ]),
                $totals['subtotal'],
                $totals['tax'],
                $totals['total'],
                'active',
                $data['auto_send'] ?? true,
                $userId
            ]
        );

        return $result['id'];
    }

    /**
     * List recurring invoices
     *
     * @param string $companyId Company UUID
     * @param array $filters Optional filters
     * @return array Recurring invoices
     */
    public function listRecurringInvoices($companyId, $filters = []) {
        $conditions = ['ri.company_id = $1'];
        $params = [$companyId];
        $paramCount = 1;

        if (!empty($filters['status'])) {
            $paramCount++;
            $conditions[] = "ri.status = $$paramCount";
            $params[] = $filters['status'];
        }

        if (!empty($filters['customer_id'])) {
            $paramCount++;
            $conditions[] = "ri.customer_id = $$paramCount";
            $params[] = $filters['customer_id'];
        }

        if (!empty($filters['frequency'])) {
            $paramCount++;
            $conditions[] = "ri.frequency = $$paramCount";
            $params[] = $filters['frequency'];
        }

        $whereClause = implode(' AND ', $conditions);

        return $this->db->fetchAll(
            "SELECT ri.*,
                    c.display_name as customer_name,
                    c.email as customer_email,
                    u.first_name || ' ' || u.last_name as created_by_name,
                    ri.invoices_generated_count as invoices_generated
             FROM recurring_invoice_templates ri
             JOIN contacts c ON ri.customer_id = c.id
             LEFT JOIN users u ON ri.created_by = u.id
             WHERE $whereClause
             ORDER BY ri.next_invoice_date ASC",
            $params
        );
    }

    /**
     * Get single recurring invoice
     *
     * @param string $recurringId Recurring invoice UUID
     * @param string $companyId Company UUID
     * @return array Recurring invoice details
     */
    public function getRecurringInvoice($recurringId, $companyId) {
        $recurring = $this->db->fetchOne(
            "SELECT ri.*,
                    c.display_name as customer_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    u.first_name || ' ' || u.last_name as created_by_name
             FROM recurring_invoice_templates ri
             JOIN contacts c ON ri.customer_id = c.id
             LEFT JOIN users u ON ri.created_by = u.id
             WHERE ri.id = $1 AND ri.company_id = $2",
            [$recurringId, $companyId]
        );

        if (!$recurring) {
            throw new Exception('Recurring invoice not found');
        }

        // Get generated invoices - Note: Currently no FK relationship exists
        // TODO: Add recurring_invoice_template_id column to invoices table for proper tracking
        $recurring['generated_invoices'] = [];

        return $recurring;
    }

    /**
     * Update recurring invoice
     *
     * @param string $recurringId Recurring invoice UUID
     * @param string $companyId Company UUID
     * @param array $data Update data
     */
    public function updateRecurringInvoice($recurringId, $companyId, $data) {
        $fields = [];
        $params = [];
        $paramCount = 0;

        $allowedFields = ['frequency', 'end_date', 'auto_send', 'status'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $paramCount++;
                $fields[] = "$field = $$paramCount";
                $params[] = $data[$field];
            }
        }

        // Update line items if provided
        if (isset($data['line_items'])) {
            // Recalculate totals
            $totals = $this->calculateTotals($data['line_items']);

            $template = [
                'line_items' => $data['line_items'],
                'notes' => $data['notes'] ?? null,
                'terms' => $data['terms'] ?? null,
                'due_days' => $data['due_days'] ?? 30
            ];

            $paramCount++;
            $fields[] = "invoice_template = $$paramCount";
            $params[] = json_encode($template);

            $paramCount++;
            $fields[] = "subtotal = $$paramCount";
            $params[] = $totals['subtotal'];

            $paramCount++;
            $fields[] = "tax_amount = $$paramCount";
            $params[] = $totals['tax'];

            $paramCount++;
            $fields[] = "total_amount = $$paramCount";
            $params[] = $totals['total'];
        }

        if (empty($fields)) {
            return;
        }

        $fields[] = 'updated_at = NOW()';
        $paramCount++;
        $params[] = $recurringId;
        $idParam = $paramCount;
        $paramCount++;
        $params[] = $companyId;
        $companyParam = $paramCount;

        $setClause = implode(', ', $fields);
        $this->db->query(
            "UPDATE recurring_invoice_templates SET $setClause
             WHERE id = $$idParam AND company_id = $$companyParam",
            $params
        );
    }

    /**
     * Cancel recurring invoice
     *
     * @param string $recurringId Recurring invoice UUID
     * @param string $companyId Company UUID
     */
    public function cancelRecurringInvoice($recurringId, $companyId) {
        $this->db->query(
            "UPDATE recurring_invoice_templates
             SET status = 'cancelled', updated_at = NOW()
             WHERE id = $1 AND company_id = $2",
            [$recurringId, $companyId]
        );
    }

    // ==================== AUTO-GENERATION ====================

    /**
     * Generate invoices for all due recurring invoices
     * Called by cron job
     *
     * @return array Generation report
     */
    public function generateDueInvoices() {
        // Get all active recurring invoices due today or earlier
        $dueRecurringInvoices = $this->db->fetchAll(
            "SELECT ri.*,
                    c.display_name as customer_name,
                    c.email as customer_email
             FROM recurring_invoice_templates ri
             JOIN contacts c ON ri.customer_id = c.id
             WHERE ri.status = 'active'
             AND ri.next_invoice_date <= CURRENT_DATE
             AND (ri.end_date IS NULL OR ri.end_date >= CURRENT_DATE)
             ORDER BY ri.next_invoice_date ASC"
        );

        $report = [
            'total_due' => count($dueRecurringInvoices),
            'generated' => 0,
            'failed' => 0,
            'errors' => []
        ];

        foreach ($dueRecurringInvoices as $recurring) {
            try {
                $invoiceId = $this->generateInvoiceFromRecurring($recurring);
                $report['generated']++;

                // Send email if auto_send is enabled
                if ($recurring['auto_send']) {
                    $this->sendGeneratedInvoice($invoiceId);
                }

            } catch (Exception $e) {
                $report['failed']++;
                $report['errors'][] = [
                    'recurring_id' => $recurring['id'],
                    'customer' => $recurring['customer_name'],
                    'error' => $e->getMessage()
                ];
            }
        }

        return $report;
    }

    /**
     * Generate single invoice from recurring template
     *
     * @param array $recurring Recurring invoice data
     * @return string Generated invoice ID
     */
    private function generateInvoiceFromRecurring($recurring) {
        $template = json_decode($recurring['invoice_template'], true);

        // Generate invoice number
        $invoiceNumber = $this->generateInvoiceNumber($recurring['company_id']);

        // Create invoice
        $invoiceData = [
            'customer_id' => $recurring['customer_id'],
            'invoice_number' => $invoiceNumber,
            'invoice_date' => date('Y-m-d'),
            'due_date' => date('Y-m-d', strtotime('+' . ($template['due_days'] ?? 30) . ' days')),
            'status' => 'sent',
            'subtotal' => $recurring['subtotal'],
            'tax_amount' => $recurring['tax_amount'],
            'total_amount' => $recurring['total_amount'],
            'notes' => $template['notes'] ?? null,
            'terms' => $template['terms'] ?? null,
            'recurring_invoice_template_id' => $recurring['id']
        ];

        $invoiceId = $this->invoiceService->createInvoice($recurring['company_id'], null, $invoiceData);

        // Add line items
        foreach ($template['line_items'] as $index => $item) {
            $this->db->query(
                "INSERT INTO invoice_line_items (
                    invoice_id, line_number, description, quantity,
                    unit_price, tax_rate, amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [
                    $invoiceId,
                    $index + 1,
                    $item['description'],
                    $item['quantity'],
                    $item['unit_price'],
                    $item['tax_rate'] ?? 19.00,
                    $item['amount']
                ]
            );
        }

        // Update recurring invoice next_invoice_date
        $nextDate = $this->calculateNextInvoiceDate(
            $recurring['next_invoice_date'],
            $recurring['frequency']
        );

        $this->db->query(
            "UPDATE recurring_invoice_templates
             SET next_invoice_date = $1,
                 last_generated_at = NOW(),
                 invoices_generated_count = COALESCE(invoices_generated_count, 0) + 1
             WHERE id = $2",
            [$nextDate, $recurring['id']]
        );

        return $invoiceId;
    }

    /**
     * Send generated invoice via email
     *
     * @param string $invoiceId Invoice UUID
     */
    private function sendGeneratedInvoice($invoiceId) {
        // Get invoice details
        $invoice = $this->db->fetchOne(
            "SELECT i.*, c.display_name as customer_name, c.email as customer_email,
                    co.name as company_name
             FROM invoices i
             JOIN contacts c ON i.customer_id = c.id
             JOIN companies co ON i.company_id = co.id
             WHERE i.id = $1",
            [$invoiceId]
        );

        if (!$invoice || !$invoice['customer_email']) {
            return;
        }

        // Generate PDF
        $pdfPath = $this->pdfService->generatePDF($invoiceId);

        // Send email
        $this->emailService->sendInvoiceEmail($invoice, $pdfPath);

        // Update last_sent_at
        $this->db->query(
            "UPDATE invoices SET last_sent_at = NOW() WHERE id = $1",
            [$invoiceId]
        );
    }

    // ==================== HELPER METHODS ====================

    /**
     * Calculate next invoice date based on frequency
     *
     * @param string $currentDate Current date
     * @param string $frequency Billing frequency
     * @return string Next invoice date
     */
    private function calculateNextInvoiceDate($currentDate, $frequency) {
        $date = new DateTime($currentDate);

        switch ($frequency) {
            case 'weekly':
                $date->modify('+1 week');
                break;
            case 'monthly':
                $date->modify('+1 month');
                break;
            case 'quarterly':
                $date->modify('+3 months');
                break;
            case 'yearly':
                $date->modify('+1 year');
                break;
        }

        return $date->format('Y-m-d');
    }

    /**
     * Calculate invoice totals from line items
     *
     * @param array $lineItems Line items array
     * @return array Totals (subtotal, tax, total)
     */
    private function calculateTotals($lineItems) {
        $subtotal = 0;
        $tax = 0;

        foreach ($lineItems as $item) {
            $itemAmount = $item['quantity'] * $item['unit_price'];
            $itemTax = $itemAmount * (($item['tax_rate'] ?? 19.00) / 100);

            $subtotal += $itemAmount;
            $tax += $itemTax;
        }

        return [
            'subtotal' => round($subtotal, 2),
            'tax' => round($tax, 2),
            'total' => round($subtotal + $tax, 2)
        ];
    }

    /**
     * Generate unique invoice number
     *
     * @param string $companyId Company UUID
     * @return string Invoice number
     */
    private function generateInvoiceNumber($companyId) {
        $result = $this->db->fetchOne(
            "SELECT MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+') AS INTEGER)) as max_num
             FROM invoices
             WHERE company_id = $1
             AND invoice_number ~ '^INV-[0-9]+$'",
            [$companyId]
        );

        $nextNum = ($result['max_num'] ?? 0) + 1;
        return 'INV-' . str_pad($nextNum, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get recurring invoice statistics
     *
     * @param string $companyId Company UUID
     * @return array Statistics
     */
    public function getStatistics($companyId) {
        return $this->db->fetchOne(
            "SELECT
                COUNT(*) as total_recurring,
                COUNT(*) FILTER (WHERE status = 'active') as active_recurring,
                SUM(total_amount) FILTER (WHERE status = 'active') as monthly_recurring_revenue,
                SUM(invoices_generated_count) as total_invoices_generated
             FROM recurring_invoice_templates
             WHERE company_id = $1",
            [$companyId]
        );
    }
}
