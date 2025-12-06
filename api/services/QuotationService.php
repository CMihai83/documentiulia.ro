<?php

class QuotationService {
    private $conn;

    public function __construct() {
        $this->conn = $this->getConnection();
    }

    private function getConnection() {
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $dbname = getenv('DB_NAME') ?: 'accountech_production';
        $user = getenv('DB_USER') ?: 'accountech_app';
        $password = getenv('DB_PASSWORD') ?: 'AccTech2025Prod@Secure';

        try {
            $conn = new PDO("pgsql:host=$host;dbname=$dbname", $user, $password);
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            return $conn;
        } catch(PDOException $e) {
            throw new Exception("Connection failed: " . $e->getMessage());
        }
    }

    /**
     * List quotations with optional filters
     */
    public function listQuotations($companyId, $filters = []) {
        $sql = "SELECT
                    q.*,
                    c.display_name as contact_name,
                    c.email as contact_email
                FROM quotations q
                LEFT JOIN contacts c ON q.contact_id = c.id
                WHERE q.company_id = :company_id";

        $params = ['company_id' => $companyId];

        // Apply filters
        if (!empty($filters['status'])) {
            $sql .= " AND q.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['contact_id'])) {
            $sql .= " AND q.contact_id = :contact_id";
            $params['contact_id'] = $filters['contact_id'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (q.quotation_number ILIKE :search OR q.title ILIKE :search)";
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $sql .= " ORDER BY q.created_at DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get single quotation by ID with items
     */
    public function getQuotation($companyId, $quotationId) {
        $sql = "SELECT
                    q.*,
                    c.display_name as contact_name,
                    c.email as contact_email,
                    c.phone as contact_phone,
                    c.address,
                    c.tax_id
                FROM quotations q
                LEFT JOIN contacts c ON q.contact_id = c.id
                WHERE q.id = :quotation_id AND q.company_id = :company_id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'quotation_id' => $quotationId,
            'company_id' => $companyId
        ]);

        $quotation = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$quotation) {
            throw new Exception('Quotation not found');
        }

        // Get quotation items
        $quotation['items'] = $this->getQuotationItems($quotationId);

        return $quotation;
    }

    /**
     * Create new quotation with items
     */
    public function createQuotation($companyId, $data) {
        try {
            $this->conn->beginTransaction();

            // Generate quotation number
            $quotationNumber = $this->generateQuotationNumber($companyId);

            // Create quotation
            $sql = "INSERT INTO quotations (
                        company_id, contact_id, opportunity_id, quotation_number, title, description,
                        issue_date, expiry_date, subtotal, tax_rate, tax_amount, discount_amount,
                        total_amount, currency, status, payment_terms, terms_and_conditions, notes
                    ) VALUES (
                        :company_id, :contact_id, :opportunity_id, :quotation_number, :title, :description,
                        :issue_date, :expiry_date, :subtotal, :tax_rate, :tax_amount, :discount_amount,
                        :total_amount, :currency, :status, :payment_terms, :terms_and_conditions, :notes
                    ) RETURNING id";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                'company_id' => $companyId,
                'contact_id' => $data['contact_id'],
                'opportunity_id' => $data['opportunity_id'] ?? null,
                'quotation_number' => $quotationNumber,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'issue_date' => $data['issue_date'] ?? date('Y-m-d'),
                'expiry_date' => $data['expiry_date'],
                'subtotal' => $data['subtotal'],
                'tax_rate' => $data['tax_rate'] ?? 19.00,
                'tax_amount' => $data['tax_amount'],
                'discount_amount' => $data['discount_amount'] ?? 0,
                'total_amount' => $data['total_amount'],
                'currency' => $data['currency'] ?? 'RON',
                'status' => $data['status'] ?? 'draft',
                'payment_terms' => $data['payment_terms'] ?? 30,
                'terms_and_conditions' => $data['terms_and_conditions'] ?? null,
                'notes' => $data['notes'] ?? null
            ]);

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $quotationId = $result['id'];

            // Create quotation items
            if (!empty($data['items'])) {
                foreach ($data['items'] as $index => $item) {
                    $this->createQuotationItem($quotationId, $item, $index);
                }
            }

            $this->conn->commit();
            return $quotationId;

        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    /**
     * Update quotation
     */
    public function updateQuotation($companyId, $quotationId, $data) {
        try {
            $this->conn->beginTransaction();

            $fields = [];
            $params = ['quotation_id' => $quotationId, 'company_id' => $companyId];

            $allowedFields = [
                'contact_id', 'opportunity_id', 'title', 'description', 'issue_date', 'expiry_date',
                'subtotal', 'tax_rate', 'tax_amount', 'discount_amount', 'total_amount',
                'currency', 'status', 'payment_terms', 'terms_and_conditions', 'notes'
            ];

            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $fields[] = "$field = :$field";
                    $params[$field] = $data[$field];
                }
            }

            if (!empty($fields)) {
                $sql = "UPDATE quotations SET " . implode(', ', $fields) .
                       " WHERE id = :quotation_id AND company_id = :company_id";

                $stmt = $this->conn->prepare($sql);
                $stmt->execute($params);
            }

            // Update items if provided
            if (isset($data['items'])) {
                // Delete existing items
                $stmt = $this->conn->prepare("DELETE FROM quotation_items WHERE quotation_id = :quotation_id");
                $stmt->execute(['quotation_id' => $quotationId]);

                // Create new items
                foreach ($data['items'] as $index => $item) {
                    $this->createQuotationItem($quotationId, $item, $index);
                }
            }

            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    /**
     * Delete quotation
     */
    public function deleteQuotation($companyId, $quotationId) {
        $sql = "DELETE FROM quotations WHERE id = :quotation_id AND company_id = :company_id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'quotation_id' => $quotationId,
            'company_id' => $companyId
        ]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Send quotation (mark as sent)
     */
    public function sendQuotation($companyId, $quotationId) {
        $sql = "UPDATE quotations
                SET status = 'sent', sent_at = NOW()
                WHERE id = :quotation_id AND company_id = :company_id AND status = 'draft'";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'quotation_id' => $quotationId,
            'company_id' => $companyId
        ]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Accept quotation
     */
    public function acceptQuotation($companyId, $quotationId) {
        $sql = "UPDATE quotations
                SET status = 'accepted', accepted_at = NOW()
                WHERE id = :quotation_id AND company_id = :company_id AND status = 'sent'";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'quotation_id' => $quotationId,
            'company_id' => $companyId
        ]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Reject quotation
     */
    public function rejectQuotation($companyId, $quotationId) {
        $sql = "UPDATE quotations
                SET status = 'rejected', rejected_at = NOW()
                WHERE id = :quotation_id AND company_id = :company_id AND status = 'sent'";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'quotation_id' => $quotationId,
            'company_id' => $companyId
        ]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Private helper methods
     */
    private function generateQuotationNumber($companyId) {
        $year = date('Y');
        $sql = "SELECT quotation_number FROM quotations
                WHERE company_id = :company_id
                AND quotation_number LIKE :pattern
                ORDER BY quotation_number DESC LIMIT 1";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_id' => $companyId,
            'pattern' => "QT-$year-%"
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result) {
            $lastNumber = intval(substr($result['quotation_number'], -4));
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return sprintf("QT-%s-%04d", $year, $newNumber);
    }

    private function createQuotationItem($quotationId, $item, $order) {
        $sql = "INSERT INTO quotation_items (
                    quotation_id, item_order, description, quantity, unit_price, unit_of_measure,
                    tax_rate, tax_amount, line_total, product_id
                ) VALUES (
                    :quotation_id, :item_order, :description, :quantity, :unit_price, :unit_of_measure,
                    :tax_rate, :tax_amount, :line_total, :product_id
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'quotation_id' => $quotationId,
            'item_order' => $order,
            'description' => $item['description'],
            'quantity' => $item['quantity'],
            'unit_price' => $item['unit_price'],
            'unit_of_measure' => $item['unit_of_measure'] ?? 'buc',
            'tax_rate' => $item['tax_rate'] ?? 19.00,
            'tax_amount' => $item['tax_amount'] ?? 0,
            'line_total' => $item['line_total'],
            'product_id' => $item['product_id'] ?? null
        ]);
    }

    private function getQuotationItems($quotationId) {
        $sql = "SELECT * FROM quotation_items
                WHERE quotation_id = :quotation_id
                ORDER BY item_order ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute(['quotation_id' => $quotationId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
