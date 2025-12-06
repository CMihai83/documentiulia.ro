<?php
/**
 * Construction Supplier Management Service
 * E3-US05: Manage supplier relationships for construction
 *
 * Features:
 * - Supplier database with categories
 * - Payment terms tracking
 * - Purchase history
 * - Price comparison
 * - Credit limit tracking
 */

require_once __DIR__ . '/../config/database.php';

class ConstructionSupplierService {
    private static ?ConstructionSupplierService $instance = null;
    private PDO $pdo;

    // Supplier categories for construction
    private array $categories = [
        'materials' => 'Materiale Construcții',
        'electrical' => 'Materiale Electrice',
        'plumbing' => 'Instalații Sanitare',
        'hvac' => 'Echipamente HVAC',
        'tools' => 'Unelte și Echipamente',
        'rental' => 'Închirieri Utilaje',
        'finishes' => 'Finisaje',
        'safety' => 'Echipamente Protecție',
        'transport' => 'Transport și Logistică',
        'services' => 'Servicii Specializate'
    ];

    // Payment terms options
    private array $paymentTerms = [
        'immediate' => ['name' => 'Plată Imediată', 'days' => 0],
        'net15' => ['name' => 'Net 15 Zile', 'days' => 15],
        'net30' => ['name' => 'Net 30 Zile', 'days' => 30],
        'net45' => ['name' => 'Net 45 Zile', 'days' => 45],
        'net60' => ['name' => 'Net 60 Zile', 'days' => 60],
        'cod' => ['name' => 'Ramburs', 'days' => 0],
        'advance' => ['name' => 'Avans 50%', 'days' => -1]
    ];

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): ConstructionSupplierService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getCategories(): array {
        return $this->categories;
    }

    public function getPaymentTerms(): array {
        return $this->paymentTerms;
    }

    /**
     * Create supplier
     */
    public function createSupplier(string $companyId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO construction_suppliers
            (company_id, name, contact_name, email, phone, address, cui, category,
             payment_terms, credit_limit, website, notes, rating, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
            RETURNING *
        ");

        $stmt->execute([
            $companyId,
            $data['name'],
            $data['contact_name'] ?? null,
            $data['email'] ?? null,
            $data['phone'] ?? null,
            $data['address'] ?? null,
            $data['cui'] ?? null,
            $data['category'] ?? 'materials',
            $data['payment_terms'] ?? 'net30',
            isset($data['credit_limit']) ? floatval($data['credit_limit']) : null,
            $data['website'] ?? null,
            $data['notes'] ?? null,
            isset($data['rating']) ? intval($data['rating']) : 3
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get supplier by ID
     */
    public function getSupplier(string $companyId, string $supplierId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT s.*,
                   (SELECT COUNT(*) FROM supplier_purchase_orders WHERE supplier_id = s.id) as order_count,
                   (SELECT SUM(total_amount) FROM supplier_purchase_orders WHERE supplier_id = s.id AND status != 'cancelled') as total_ordered,
                   (SELECT SUM(amount_paid) FROM supplier_purchase_orders WHERE supplier_id = s.id) as total_paid
            FROM construction_suppliers s
            WHERE s.id = ? AND s.company_id = ?
        ");
        $stmt->execute([$supplierId, $companyId]);
        $supplier = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($supplier) {
            $supplier['outstanding_balance'] = floatval($supplier['total_ordered'] ?? 0) - floatval($supplier['total_paid'] ?? 0);
        }

        return $supplier ?: null;
    }

    /**
     * List suppliers
     */
    public function listSuppliers(string $companyId, array $filters = []): array {
        $sql = "
            SELECT s.*,
                   (SELECT COUNT(*) FROM supplier_purchase_orders WHERE supplier_id = s.id) as order_count,
                   (SELECT SUM(total_amount) FROM supplier_purchase_orders WHERE supplier_id = s.id AND status != 'cancelled') as total_ordered
            FROM construction_suppliers s
            WHERE s.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['category'])) {
            $sql .= " AND s.category = ?";
            $params[] = $filters['category'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND s.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (s.name ILIKE ? OR s.contact_name ILIKE ? OR s.cui ILIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        if (!empty($filters['min_rating'])) {
            $sql .= " AND s.rating >= ?";
            $params[] = intval($filters['min_rating']);
        }

        $sql .= " ORDER BY s.name";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update supplier
     */
    public function updateSupplier(string $companyId, string $supplierId, array $data): ?array {
        $stmt = $this->pdo->prepare("
            UPDATE construction_suppliers SET
                name = COALESCE(?, name),
                contact_name = COALESCE(?, contact_name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                address = COALESCE(?, address),
                cui = COALESCE(?, cui),
                category = COALESCE(?, category),
                payment_terms = COALESCE(?, payment_terms),
                credit_limit = COALESCE(?, credit_limit),
                website = COALESCE(?, website),
                notes = COALESCE(?, notes),
                rating = COALESCE(?, rating),
                status = COALESCE(?, status),
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
            RETURNING *
        ");

        $stmt->execute([
            $data['name'] ?? null,
            $data['contact_name'] ?? null,
            $data['email'] ?? null,
            $data['phone'] ?? null,
            $data['address'] ?? null,
            $data['cui'] ?? null,
            $data['category'] ?? null,
            $data['payment_terms'] ?? null,
            isset($data['credit_limit']) ? floatval($data['credit_limit']) : null,
            $data['website'] ?? null,
            $data['notes'] ?? null,
            isset($data['rating']) ? intval($data['rating']) : null,
            $data['status'] ?? null,
            $supplierId,
            $companyId
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Create purchase order
     */
    public function createPurchaseOrder(string $companyId, array $data): array {
        $this->pdo->beginTransaction();

        try {
            $poNumber = 'PO-' . date('Ymd') . '-' . substr(uniqid(), -4);

            $stmt = $this->pdo->prepare("
                INSERT INTO supplier_purchase_orders
                (company_id, supplier_id, project_id, po_number, status, order_date,
                 expected_delivery, delivery_address, notes, created_by, created_at)
                VALUES (?, ?, ?, ?, 'draft', CURRENT_DATE, ?, ?, ?, ?, NOW())
                RETURNING *
            ");

            $stmt->execute([
                $companyId,
                $data['supplier_id'],
                $data['project_id'] ?? null,
                $poNumber,
                $data['expected_delivery'] ?? null,
                $data['delivery_address'] ?? null,
                $data['notes'] ?? null,
                $data['created_by'] ?? null
            ]);

            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            // Add items
            $totalAmount = 0;
            if (!empty($data['items'])) {
                $stmt2 = $this->pdo->prepare("
                    INSERT INTO supplier_po_items
                    (po_id, material_id, description, quantity, unit, unit_price)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");

                foreach ($data['items'] as $item) {
                    $itemTotal = floatval($item['quantity']) * floatval($item['unit_price']);
                    $stmt2->execute([
                        $order['id'],
                        $item['material_id'] ?? null,
                        $item['description'],
                        floatval($item['quantity']),
                        $item['unit'] ?? 'buc',
                        floatval($item['unit_price'])
                    ]);
                    $totalAmount += $itemTotal;
                }
            }

            // Update total
            $stmt3 = $this->pdo->prepare("UPDATE supplier_purchase_orders SET total_amount = ? WHERE id = ?");
            $stmt3->execute([$totalAmount, $order['id']]);
            $order['total_amount'] = $totalAmount;

            $this->pdo->commit();
            return $order;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Get purchase order
     */
    public function getPurchaseOrder(string $companyId, string $orderId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT po.*, s.name as supplier_name, p.name as project_name
            FROM supplier_purchase_orders po
            LEFT JOIN construction_suppliers s ON po.supplier_id = s.id
            LEFT JOIN construction_projects p ON po.project_id = p.id
            WHERE po.id = ? AND po.company_id = ?
        ");
        $stmt->execute([$orderId, $companyId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($order) {
            $stmt2 = $this->pdo->prepare("
                SELECT poi.*, m.name as material_name
                FROM supplier_po_items poi
                LEFT JOIN material_catalog m ON poi.material_id = m.id
                WHERE poi.po_id = ?
            ");
            $stmt2->execute([$orderId]);
            $order['items'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        }

        return $order ?: null;
    }

    /**
     * List purchase orders
     */
    public function listPurchaseOrders(string $companyId, array $filters = []): array {
        $sql = "
            SELECT po.*, s.name as supplier_name, p.name as project_name,
                   (SELECT COUNT(*) FROM supplier_po_items WHERE po_id = po.id) as item_count
            FROM supplier_purchase_orders po
            LEFT JOIN construction_suppliers s ON po.supplier_id = s.id
            LEFT JOIN construction_projects p ON po.project_id = p.id
            WHERE po.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['supplier_id'])) {
            $sql .= " AND po.supplier_id = ?";
            $params[] = $filters['supplier_id'];
        }

        if (!empty($filters['project_id'])) {
            $sql .= " AND po.project_id = ?";
            $params[] = $filters['project_id'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND po.status = ?";
            $params[] = $filters['status'];
        }

        $sql .= " ORDER BY po.created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update PO status
     */
    public function updatePOStatus(string $companyId, string $orderId, string $status): ?array {
        $validStatuses = ['draft', 'sent', 'confirmed', 'shipped', 'received', 'cancelled'];
        if (!in_array($status, $validStatuses)) {
            throw new Exception("Invalid status: $status");
        }

        $stmt = $this->pdo->prepare("
            UPDATE supplier_purchase_orders SET
                status = ?,
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
            RETURNING *
        ");

        $stmt->execute([$status, $orderId, $companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Record payment
     */
    public function recordPayment(string $companyId, string $orderId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO supplier_payments
            (company_id, po_id, amount, payment_date, payment_method, reference, notes, created_at)
            VALUES (?, ?, ?, COALESCE(?, CURRENT_DATE), ?, ?, ?, NOW())
            RETURNING *
        ");

        $stmt->execute([
            $companyId,
            $orderId,
            floatval($data['amount']),
            $data['payment_date'] ?? null,
            $data['payment_method'] ?? 'transfer',
            $data['reference'] ?? null,
            $data['notes'] ?? null
        ]);

        $payment = $stmt->fetch(PDO::FETCH_ASSOC);

        // Update amount_paid on PO
        $stmt2 = $this->pdo->prepare("
            UPDATE supplier_purchase_orders SET
                amount_paid = COALESCE(amount_paid, 0) + ?
            WHERE id = ?
        ");
        $stmt2->execute([$data['amount'], $orderId]);

        return $payment;
    }

    /**
     * Get purchase history for supplier
     */
    public function getSupplierHistory(string $supplierId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $sql = "
            SELECT po.*, p.name as project_name
            FROM supplier_purchase_orders po
            LEFT JOIN construction_projects p ON po.project_id = p.id
            WHERE po.supplier_id = ?
        ";
        $params = [$supplierId];

        if ($dateFrom) {
            $sql .= " AND po.order_date >= ?";
            $params[] = $dateFrom;
        }
        if ($dateTo) {
            $sql .= " AND po.order_date <= ?";
            $params[] = $dateTo;
        }

        $sql .= " ORDER BY po.order_date DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Compare prices across suppliers for a material
     */
    public function comparePrices(string $companyId, string $materialId): array {
        $stmt = $this->pdo->prepare("
            SELECT s.id as supplier_id, s.name as supplier_name, s.rating,
                   sp.price, sp.last_updated, sp.min_quantity
            FROM supplier_prices sp
            JOIN construction_suppliers s ON sp.supplier_id = s.id
            WHERE sp.material_id = ? AND s.company_id = ? AND s.status = 'active'
            ORDER BY sp.price ASC
        ");
        $stmt->execute([$materialId, $companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update supplier price for material
     */
    public function updatePrice(string $supplierId, string $materialId, float $price, ?int $minQuantity = null): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO supplier_prices (supplier_id, material_id, price, min_quantity, last_updated)
            VALUES (?, ?, ?, ?, NOW())
            ON CONFLICT (supplier_id, material_id) DO UPDATE SET
                price = EXCLUDED.price,
                min_quantity = COALESCE(EXCLUDED.min_quantity, supplier_prices.min_quantity),
                last_updated = NOW()
            RETURNING *
        ");

        $stmt->execute([$supplierId, $materialId, $price, $minQuantity]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get suppliers with credit issues
     */
    public function getOverCreditSuppliers(string $companyId): array {
        $stmt = $this->pdo->prepare("
            SELECT s.*,
                   COALESCE(SUM(po.total_amount), 0) - COALESCE(SUM(po.amount_paid), 0) as outstanding
            FROM construction_suppliers s
            LEFT JOIN supplier_purchase_orders po ON po.supplier_id = s.id AND po.status NOT IN ('cancelled', 'received')
            WHERE s.company_id = ? AND s.credit_limit IS NOT NULL
            GROUP BY s.id
            HAVING COALESCE(SUM(po.total_amount), 0) - COALESCE(SUM(po.amount_paid), 0) >= s.credit_limit
        ");
        $stmt->execute([$companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
