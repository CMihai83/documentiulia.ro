<?php
/**
 * Purchase Order Service
 *
 * Handles all business logic for Purchase Orders module
 * - Complete CRUD operations
 * - PO number auto-generation
 * - Approval workflow
 * - Goods receiving
 * - Status transitions
 *
 * @version 1.0
 * @date 2025-11-18
 */

class PurchaseOrderService {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * List purchase orders with optional filtering
     *
     * @param string $companyId
     * @param array $filters (status, vendor_id, from_date, to_date, search)
     * @return array
     */
    public function listPurchaseOrders($companyId, $filters = []) {
        $sql = "SELECT
                    po.*,
                    c.display_name as vendor_name,
                    c.email as vendor_email,
                    c.phone as vendor_phone,
                    u.first_name || ' ' || u.last_name as created_by_name,
                    approver.first_name || ' ' || approver.last_name as approved_by_name,
                    (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) as items_count,
                    (SELECT SUM(quantity) FROM purchase_order_items WHERE purchase_order_id = po.id) as total_quantity,
                    (SELECT SUM(quantity_received) FROM purchase_order_items WHERE purchase_order_id = po.id) as total_received
                FROM purchase_orders po
                LEFT JOIN contacts c ON po.vendor_id = c.id
                LEFT JOIN users u ON po.created_by = u.id
                LEFT JOIN users approver ON po.approved_by = approver.id
                WHERE po.company_id = :company_id";

        $params = ['company_id' => $companyId];

        // Filter by status
        if (!empty($filters['status'])) {
            $sql .= " AND po.status = :status";
            $params['status'] = $filters['status'];
        }

        // Filter by vendor
        if (!empty($filters['vendor_id'])) {
            $sql .= " AND po.vendor_id = :vendor_id";
            $params['vendor_id'] = $filters['vendor_id'];
        }

        // Filter by date range
        if (!empty($filters['from_date'])) {
            $sql .= " AND po.order_date >= :from_date";
            $params['from_date'] = $filters['from_date'];
        }

        if (!empty($filters['to_date'])) {
            $sql .= " AND po.order_date <= :to_date";
            $params['to_date'] = $filters['to_date'];
        }

        // Search by PO number or vendor name
        if (!empty($filters['search'])) {
            $sql .= " AND (po.po_number ILIKE :search OR po.vendor_name ILIKE :search)";
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $sql .= " ORDER BY po.order_date DESC, po.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get single purchase order with items and receipts
     *
     * @param string $companyId
     * @param string $purchaseOrderId
     * @return array|null
     */
    public function getPurchaseOrder($companyId, $purchaseOrderId) {
        // Get PO header
        $sql = "SELECT
                    po.*,
                    c.display_name as vendor_name,
                    c.email as vendor_email,
                    c.phone as vendor_phone,
                    u.first_name || ' ' || u.last_name as created_by_name,
                    approver.first_name || ' ' || approver.last_name as approved_by_name,
                    rejector.first_name || ' ' || rejector.last_name as rejected_by_name
                FROM purchase_orders po
                LEFT JOIN contacts c ON po.vendor_id = c.id
                LEFT JOIN users u ON po.created_by = u.id
                LEFT JOIN users approver ON po.approved_by = approver.id
                LEFT JOIN users rejector ON po.rejected_by = rejector.id
                WHERE po.company_id = :company_id AND po.id = :id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['company_id' => $companyId, 'id' => $purchaseOrderId]);
        $po = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$po) {
            return null;
        }

        // Get PO items
        $sql = "SELECT
                    poi.*,
                    ip.name as product_name,
                    ip.code as product_code
                FROM purchase_order_items poi
                LEFT JOIN inventory_products ip ON poi.product_id = ip.id
                WHERE poi.purchase_order_id = :purchase_order_id
                ORDER BY poi.sort_order, poi.created_at";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['purchase_order_id' => $purchaseOrderId]);
        $po['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get receipts for each item
        foreach ($po['items'] as &$item) {
            $sql = "SELECT
                        por.*,
                        u.first_name || ' ' || u.last_name as received_by_name
                    FROM purchase_order_receipts por
                    LEFT JOIN users u ON por.received_by = u.id
                    WHERE por.purchase_order_item_id = :item_id
                    ORDER BY por.receipt_date DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute(['item_id' => $item['id']]);
            $item['receipts'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        return $po;
    }

    /**
     * Create new purchase order
     *
     * @param string $companyId
     * @param string $userId
     * @param array $data
     * @return array
     */
    public function createPurchaseOrder($companyId, $userId, $data) {
        $this->db->beginTransaction();

        try {
            // Generate PO number
            $poNumber = $this->generatePONumber($companyId);

            // Insert PO header
            $sql = "INSERT INTO purchase_orders (
                        company_id, po_number, reference_number,
                        vendor_id, vendor_name, vendor_email, vendor_phone, vendor_address,
                        quotation_id,
                        subtotal, tax_amount, discount_amount, shipping_amount, total_amount, currency,
                        status, order_date, expected_delivery_date,
                        notes, terms_and_conditions, payment_terms, delivery_address,
                        created_by
                    ) VALUES (
                        :company_id, :po_number, :reference_number,
                        :vendor_id, :vendor_name, :vendor_email, :vendor_phone, :vendor_address,
                        :quotation_id,
                        :subtotal, :tax_amount, :discount_amount, :shipping_amount, :total_amount, :currency,
                        :status, :order_date, :expected_delivery_date,
                        :notes, :terms_and_conditions, :payment_terms, :delivery_address,
                        :created_by
                    ) RETURNING id";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                'company_id' => $companyId,
                'po_number' => $poNumber,
                'reference_number' => $data['reference_number'] ?? null,
                'vendor_id' => $data['vendor_id'] ?? null,
                'vendor_name' => $data['vendor_name'],
                'vendor_email' => $data['vendor_email'] ?? null,
                'vendor_phone' => $data['vendor_phone'] ?? null,
                'vendor_address' => $data['vendor_address'] ?? null,
                'quotation_id' => $data['quotation_id'] ?? null,
                'subtotal' => $data['subtotal'] ?? 0,
                'tax_amount' => $data['tax_amount'] ?? 0,
                'discount_amount' => $data['discount_amount'] ?? 0,
                'shipping_amount' => $data['shipping_amount'] ?? 0,
                'total_amount' => $data['total_amount'] ?? 0,
                'currency' => $data['currency'] ?? 'RON',
                'status' => $data['status'] ?? 'draft',
                'order_date' => $data['order_date'] ?? date('Y-m-d'),
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'terms_and_conditions' => $data['terms_and_conditions'] ?? null,
                'payment_terms' => $data['payment_terms'] ?? null,
                'delivery_address' => $data['delivery_address'] ?? null,
                'created_by' => $userId
            ]);

            $poId = $stmt->fetch(PDO::FETCH_ASSOC)['id'];

            // Insert PO items
            if (!empty($data['items'])) {
                $this->insertPurchaseOrderItems($poId, $data['items']);
            }

            $this->db->commit();

            return $this->getPurchaseOrder($companyId, $poId);
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Update purchase order
     *
     * @param string $companyId
     * @param string $purchaseOrderId
     * @param string $userId
     * @param array $data
     * @return array
     */
    public function updatePurchaseOrder($companyId, $purchaseOrderId, $userId, $data) {
        $this->db->beginTransaction();

        try {
            // Update PO header
            $sql = "UPDATE purchase_orders SET
                        reference_number = :reference_number,
                        vendor_id = :vendor_id,
                        vendor_name = :vendor_name,
                        vendor_email = :vendor_email,
                        vendor_phone = :vendor_phone,
                        vendor_address = :vendor_address,
                        subtotal = :subtotal,
                        tax_amount = :tax_amount,
                        discount_amount = :discount_amount,
                        shipping_amount = :shipping_amount,
                        total_amount = :total_amount,
                        currency = :currency,
                        status = :status,
                        order_date = :order_date,
                        expected_delivery_date = :expected_delivery_date,
                        notes = :notes,
                        terms_and_conditions = :terms_and_conditions,
                        payment_terms = :payment_terms,
                        delivery_address = :delivery_address,
                        updated_by = :updated_by
                    WHERE company_id = :company_id AND id = :id";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                'reference_number' => $data['reference_number'] ?? null,
                'vendor_id' => $data['vendor_id'] ?? null,
                'vendor_name' => $data['vendor_name'],
                'vendor_email' => $data['vendor_email'] ?? null,
                'vendor_phone' => $data['vendor_phone'] ?? null,
                'vendor_address' => $data['vendor_address'] ?? null,
                'subtotal' => $data['subtotal'] ?? 0,
                'tax_amount' => $data['tax_amount'] ?? 0,
                'discount_amount' => $data['discount_amount'] ?? 0,
                'shipping_amount' => $data['shipping_amount'] ?? 0,
                'total_amount' => $data['total_amount'] ?? 0,
                'currency' => $data['currency'] ?? 'RON',
                'status' => $data['status'] ?? 'draft',
                'order_date' => $data['order_date'] ?? date('Y-m-d'),
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'terms_and_conditions' => $data['terms_and_conditions'] ?? null,
                'payment_terms' => $data['payment_terms'] ?? null,
                'delivery_address' => $data['delivery_address'] ?? null,
                'updated_by' => $userId,
                'company_id' => $companyId,
                'id' => $purchaseOrderId
            ]);

            // Update items if provided
            if (isset($data['items'])) {
                // Delete existing items
                $sql = "DELETE FROM purchase_order_items WHERE purchase_order_id = :purchase_order_id";
                $stmt = $this->db->prepare($sql);
                $stmt->execute(['purchase_order_id' => $purchaseOrderId]);

                // Insert new items
                $this->insertPurchaseOrderItems($purchaseOrderId, $data['items']);
            }

            $this->db->commit();

            return $this->getPurchaseOrder($companyId, $purchaseOrderId);
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Delete purchase order
     *
     * @param string $companyId
     * @param string $purchaseOrderId
     * @return bool
     */
    public function deletePurchaseOrder($companyId, $purchaseOrderId) {
        $sql = "DELETE FROM purchase_orders WHERE company_id = :company_id AND id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['company_id' => $companyId, 'id' => $purchaseOrderId]);
    }

    /**
     * Approve purchase order
     *
     * @param string $companyId
     * @param string $purchaseOrderId
     * @param string $userId
     * @return array
     */
    public function approvePurchaseOrder($companyId, $purchaseOrderId, $userId) {
        $sql = "UPDATE purchase_orders SET
                    status = 'approved',
                    approved_by = :approved_by,
                    approved_at = CURRENT_TIMESTAMP
                WHERE company_id = :company_id AND id = :id
                AND status IN ('draft', 'pending_approval')";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'approved_by' => $userId,
            'company_id' => $companyId,
            'id' => $purchaseOrderId
        ]);

        return $this->getPurchaseOrder($companyId, $purchaseOrderId);
    }

    /**
     * Reject purchase order
     *
     * @param string $companyId
     * @param string $purchaseOrderId
     * @param string $userId
     * @param string $reason
     * @return array
     */
    public function rejectPurchaseOrder($companyId, $purchaseOrderId, $userId, $reason) {
        $sql = "UPDATE purchase_orders SET
                    status = 'rejected',
                    rejected_by = :rejected_by,
                    rejected_at = CURRENT_TIMESTAMP,
                    rejection_reason = :reason
                WHERE company_id = :company_id AND id = :id
                AND status IN ('draft', 'pending_approval')";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'rejected_by' => $userId,
            'reason' => $reason,
            'company_id' => $companyId,
            'id' => $purchaseOrderId
        ]);

        return $this->getPurchaseOrder($companyId, $purchaseOrderId);
    }

    /**
     * Receive goods against purchase order
     *
     * @param string $companyId
     * @param string $purchaseOrderItemId
     * @param string $userId
     * @param array $data
     * @return array
     */
    public function receiveGoods($companyId, $purchaseOrderItemId, $userId, $data) {
        $this->db->beginTransaction();

        try {
            // Get item and PO details
            $sql = "SELECT poi.*, po.id as purchase_order_id
                    FROM purchase_order_items poi
                    JOIN purchase_orders po ON poi.purchase_order_id = po.id
                    WHERE poi.id = :item_id AND po.company_id = :company_id";

            $stmt = $this->db->prepare($sql);
            $stmt->execute(['item_id' => $purchaseOrderItemId, 'company_id' => $companyId]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$item) {
                throw new Exception('Purchase order item not found');
            }

            // Generate receipt number
            $receiptNumber = $this->generateReceiptNumber($companyId);

            // Insert receipt
            $sql = "INSERT INTO purchase_order_receipts (
                        company_id, purchase_order_id, purchase_order_item_id,
                        receipt_number, receipt_date,
                        quantity_received, quality_status,
                        quantity_accepted, quantity_rejected, rejection_reason,
                        warehouse_id, location, notes,
                        received_by
                    ) VALUES (
                        :company_id, :purchase_order_id, :purchase_order_item_id,
                        :receipt_number, :receipt_date,
                        :quantity_received, :quality_status,
                        :quantity_accepted, :quantity_rejected, :rejection_reason,
                        :warehouse_id, :location, :notes,
                        :received_by
                    ) RETURNING id";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                'company_id' => $companyId,
                'purchase_order_id' => $item['purchase_order_id'],
                'purchase_order_item_id' => $purchaseOrderItemId,
                'receipt_number' => $receiptNumber,
                'receipt_date' => $data['receipt_date'] ?? date('Y-m-d'),
                'quantity_received' => $data['quantity_received'],
                'quality_status' => $data['quality_status'] ?? 'accepted',
                'quantity_accepted' => $data['quantity_accepted'] ?? $data['quantity_received'],
                'quantity_rejected' => $data['quantity_rejected'] ?? 0,
                'rejection_reason' => $data['rejection_reason'] ?? null,
                'warehouse_id' => $data['warehouse_id'] ?? null,
                'location' => $data['location'] ?? null,
                'notes' => $data['notes'] ?? null,
                'received_by' => $userId
            ]);

            $receiptId = $stmt->fetch(PDO::FETCH_ASSOC)['id'];

            $this->db->commit();

            // Return the updated PO
            return $this->getPurchaseOrder($companyId, $item['purchase_order_id']);
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Generate PO number (format: PO-YYYY-NNNN)
     *
     * @param string $companyId
     * @return string
     */
    private function generatePONumber($companyId) {
        $year = date('Y');
        $prefix = "PO-{$year}-";

        $sql = "SELECT po_number FROM purchase_orders
                WHERE company_id = :company_id
                AND po_number LIKE :pattern
                ORDER BY po_number DESC LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'company_id' => $companyId,
            'pattern' => $prefix . '%'
        ]);

        $lastPO = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($lastPO) {
            // Extract number and increment
            $lastNumber = (int) substr($lastPO['po_number'], -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Generate receipt number (format: RCP-YYYY-NNNN)
     *
     * @param string $companyId
     * @return string
     */
    private function generateReceiptNumber($companyId) {
        $year = date('Y');
        $prefix = "RCP-{$year}-";

        $sql = "SELECT receipt_number FROM purchase_order_receipts
                WHERE company_id = :company_id
                AND receipt_number LIKE :pattern
                ORDER BY receipt_number DESC LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'company_id' => $companyId,
            'pattern' => $prefix . '%'
        ]);

        $lastReceipt = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($lastReceipt) {
            $lastNumber = (int) substr($lastReceipt['receipt_number'], -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Insert purchase order items
     *
     * @param string $purchaseOrderId
     * @param array $items
     * @return void
     */
    private function insertPurchaseOrderItems($purchaseOrderId, $items) {
        $sql = "INSERT INTO purchase_order_items (
                    purchase_order_id, product_id, product_name, product_code, description,
                    quantity, unit_price, tax_rate, discount_rate,
                    subtotal, tax_amount, discount_amount, total_amount,
                    quantity_pending, sort_order
                ) VALUES (
                    :purchase_order_id, :product_id, :product_name, :product_code, :description,
                    :quantity, :unit_price, :tax_rate, :discount_rate,
                    :subtotal, :tax_amount, :discount_amount, :total_amount,
                    :quantity_pending, :sort_order
                )";

        $stmt = $this->db->prepare($sql);

        foreach ($items as $index => $item) {
            $subtotal = $item['quantity'] * $item['unit_price'];
            $taxAmount = $subtotal * ($item['tax_rate'] ?? 0) / 100;
            $discountAmount = $subtotal * ($item['discount_rate'] ?? 0) / 100;
            $totalAmount = $subtotal + $taxAmount - $discountAmount;

            $stmt->execute([
                'purchase_order_id' => $purchaseOrderId,
                'product_id' => $item['product_id'] ?? null,
                'product_name' => $item['product_name'],
                'product_code' => $item['product_code'] ?? null,
                'description' => $item['description'] ?? null,
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'tax_rate' => $item['tax_rate'] ?? 0,
                'discount_rate' => $item['discount_rate'] ?? 0,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'quantity_pending' => $item['quantity'],
                'sort_order' => $index
            ]);
        }
    }
}
