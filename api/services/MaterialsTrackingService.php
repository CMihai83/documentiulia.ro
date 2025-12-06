<?php
/**
 * Materials Tracking Service
 * E3-US04: Track construction materials usage and costs
 *
 * Features:
 * - Material catalog with categories
 * - Project material allocation
 * - Usage tracking and waste monitoring
 * - Cost tracking per project
 * - Low stock alerts
 * - Material orders
 */

require_once __DIR__ . '/../config/database.php';

class MaterialsTrackingService {
    private static ?MaterialsTrackingService $instance = null;
    private PDO $pdo;

    // Material categories
    private array $categories = [
        'structural' => 'Materiale Structurale',
        'finishing' => 'Finisaje',
        'electrical' => 'Electrice',
        'plumbing' => 'Instalații Sanitare',
        'hvac' => 'HVAC',
        'insulation' => 'Izolații',
        'flooring' => 'Pardoseli',
        'roofing' => 'Acoperișuri',
        'doors_windows' => 'Uși și Ferestre',
        'paint' => 'Vopsele și Lacuri',
        'tools' => 'Unelte',
        'safety' => 'Protecția Muncii',
        'other' => 'Altele'
    ];

    // Units of measure
    private array $units = [
        'buc' => 'Bucăți',
        'mp' => 'Metri Pătrați',
        'ml' => 'Metri Liniari',
        'mc' => 'Metri Cubi',
        'kg' => 'Kilograme',
        'l' => 'Litri',
        'sac' => 'Saci',
        'palet' => 'Paleți',
        'role' => 'Role',
        'set' => 'Seturi'
    ];

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): MaterialsTrackingService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get categories
     */
    public function getCategories(): array {
        return $this->categories;
    }

    /**
     * Get units
     */
    public function getUnits(): array {
        return $this->units;
    }

    /**
     * Create material in catalog
     */
    public function createMaterial(string $companyId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO material_catalog
            (company_id, name, description, category, unit, unit_price,
             supplier_id, sku, min_stock_level, current_stock, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            RETURNING *
        ");

        $stmt->execute([
            $companyId,
            $data['name'],
            $data['description'] ?? null,
            $data['category'] ?? 'other',
            $data['unit'] ?? 'buc',
            floatval($data['unit_price'] ?? 0),
            $data['supplier_id'] ?? null,
            $data['sku'] ?? null,
            intval($data['min_stock_level'] ?? 0),
            floatval($data['current_stock'] ?? 0)
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get material by ID
     */
    public function getMaterial(string $companyId, string $materialId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT m.*, s.name as supplier_name
            FROM material_catalog m
            LEFT JOIN suppliers s ON m.supplier_id = s.id
            WHERE m.id = ? AND m.company_id = ?
        ");
        $stmt->execute([$materialId, $companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * List materials
     */
    public function listMaterials(string $companyId, array $filters = []): array {
        $sql = "
            SELECT m.*, s.name as supplier_name,
                   CASE WHEN m.current_stock <= m.min_stock_level THEN true ELSE false END as low_stock
            FROM material_catalog m
            LEFT JOIN suppliers s ON m.supplier_id = s.id
            WHERE m.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['category'])) {
            $sql .= " AND m.category = ?";
            $params[] = $filters['category'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (m.name ILIKE ? OR m.sku ILIKE ? OR m.description ILIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        if (!empty($filters['low_stock'])) {
            $sql .= " AND m.current_stock <= m.min_stock_level";
        }

        $sql .= " ORDER BY m.name";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update material
     */
    public function updateMaterial(string $companyId, string $materialId, array $data): ?array {
        $stmt = $this->pdo->prepare("
            UPDATE material_catalog SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                unit = COALESCE(?, unit),
                unit_price = COALESCE(?, unit_price),
                supplier_id = COALESCE(?, supplier_id),
                sku = COALESCE(?, sku),
                min_stock_level = COALESCE(?, min_stock_level),
                current_stock = COALESCE(?, current_stock),
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
            RETURNING *
        ");

        $stmt->execute([
            $data['name'] ?? null,
            $data['description'] ?? null,
            $data['category'] ?? null,
            $data['unit'] ?? null,
            isset($data['unit_price']) ? floatval($data['unit_price']) : null,
            $data['supplier_id'] ?? null,
            $data['sku'] ?? null,
            isset($data['min_stock_level']) ? intval($data['min_stock_level']) : null,
            isset($data['current_stock']) ? floatval($data['current_stock']) : null,
            $materialId,
            $companyId
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Allocate material to project
     */
    public function allocateToProject(string $projectId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO project_materials
            (project_id, material_id, quantity_allocated, quantity_used,
             quantity_wasted, unit_price_at_allocation, notes, created_at)
            VALUES (?, ?, ?, 0, 0, ?, ?, NOW())
            ON CONFLICT (project_id, material_id) DO UPDATE SET
                quantity_allocated = project_materials.quantity_allocated + EXCLUDED.quantity_allocated,
                unit_price_at_allocation = EXCLUDED.unit_price_at_allocation,
                notes = COALESCE(EXCLUDED.notes, project_materials.notes)
            RETURNING *
        ");

        // Get current unit price if not provided
        $unitPrice = $data['unit_price'] ?? null;
        if (!$unitPrice && !empty($data['material_id'])) {
            $stmt2 = $this->pdo->prepare("SELECT unit_price FROM material_catalog WHERE id = ?");
            $stmt2->execute([$data['material_id']]);
            $unitPrice = $stmt2->fetchColumn() ?: 0;
        }

        $stmt->execute([
            $projectId,
            $data['material_id'],
            floatval($data['quantity']),
            $unitPrice,
            $data['notes'] ?? null
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Record material usage
     */
    public function recordUsage(string $projectId, array $data): array {
        $this->pdo->beginTransaction();

        try {
            // Update project materials
            $stmt = $this->pdo->prepare("
                UPDATE project_materials SET
                    quantity_used = quantity_used + ?,
                    quantity_wasted = quantity_wasted + ?
                WHERE project_id = ? AND material_id = ?
                RETURNING *
            ");

            $stmt->execute([
                floatval($data['quantity_used'] ?? 0),
                floatval($data['quantity_wasted'] ?? 0),
                $projectId,
                $data['material_id']
            ]);

            $projectMaterial = $stmt->fetch(PDO::FETCH_ASSOC);

            // Update stock in catalog
            $totalUsed = floatval($data['quantity_used'] ?? 0) + floatval($data['quantity_wasted'] ?? 0);
            $stmt2 = $this->pdo->prepare("
                UPDATE material_catalog SET
                    current_stock = current_stock - ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $stmt2->execute([$totalUsed, $data['material_id']]);

            // Record usage log
            $stmt3 = $this->pdo->prepare("
                INSERT INTO material_usage_log
                (project_id, material_id, quantity_used, quantity_wasted, task_id, recorded_by, notes, usage_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE))
                RETURNING *
            ");

            $stmt3->execute([
                $projectId,
                $data['material_id'],
                floatval($data['quantity_used'] ?? 0),
                floatval($data['quantity_wasted'] ?? 0),
                $data['task_id'] ?? null,
                $data['recorded_by'] ?? null,
                $data['notes'] ?? null,
                $data['usage_date'] ?? null
            ]);

            $usageLog = $stmt3->fetch(PDO::FETCH_ASSOC);

            $this->pdo->commit();

            return [
                'project_material' => $projectMaterial,
                'usage_log' => $usageLog
            ];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Get project materials
     */
    public function getProjectMaterials(string $projectId): array {
        $stmt = $this->pdo->prepare("
            SELECT pm.*, m.name as material_name, m.category, m.unit, m.sku,
                   (pm.quantity_allocated - pm.quantity_used - pm.quantity_wasted) as quantity_remaining,
                   (pm.quantity_used * pm.unit_price_at_allocation) as cost_used,
                   (pm.quantity_wasted * pm.unit_price_at_allocation) as cost_wasted
            FROM project_materials pm
            JOIN material_catalog m ON pm.material_id = m.id
            WHERE pm.project_id = ?
            ORDER BY m.category, m.name
        ");
        $stmt->execute([$projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get material usage log
     */
    public function getUsageLog(string $projectId, ?string $materialId = null): array {
        $sql = "
            SELECT ul.*, m.name as material_name, m.unit, t.name as task_name
            FROM material_usage_log ul
            JOIN material_catalog m ON ul.material_id = m.id
            LEFT JOIN project_tasks t ON ul.task_id = t.id
            WHERE ul.project_id = ?
        ";
        $params = [$projectId];

        if ($materialId) {
            $sql .= " AND ul.material_id = ?";
            $params[] = $materialId;
        }

        $sql .= " ORDER BY ul.usage_date DESC, ul.created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Create material order
     */
    public function createOrder(string $companyId, array $data): array {
        $this->pdo->beginTransaction();

        try {
            // Create order
            $stmt = $this->pdo->prepare("
                INSERT INTO material_orders
                (company_id, project_id, supplier_id, order_number, status,
                 expected_delivery, notes, created_by, created_at)
                VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, NOW())
                RETURNING *
            ");

            $orderNumber = 'ORD-' . date('Ymd') . '-' . substr(uniqid(), -4);

            $stmt->execute([
                $companyId,
                $data['project_id'] ?? null,
                $data['supplier_id'] ?? null,
                $orderNumber,
                $data['expected_delivery'] ?? null,
                $data['notes'] ?? null,
                $data['created_by'] ?? null
            ]);

            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            // Add order items
            if (!empty($data['items'])) {
                $stmt2 = $this->pdo->prepare("
                    INSERT INTO material_order_items
                    (order_id, material_id, quantity, unit_price)
                    VALUES (?, ?, ?, ?)
                ");

                $totalAmount = 0;
                foreach ($data['items'] as $item) {
                    $stmt2->execute([
                        $order['id'],
                        $item['material_id'],
                        floatval($item['quantity']),
                        floatval($item['unit_price'] ?? 0)
                    ]);
                    $totalAmount += floatval($item['quantity']) * floatval($item['unit_price'] ?? 0);
                }

                // Update order total
                $stmt3 = $this->pdo->prepare("UPDATE material_orders SET total_amount = ? WHERE id = ?");
                $stmt3->execute([$totalAmount, $order['id']]);
                $order['total_amount'] = $totalAmount;
            }

            $this->pdo->commit();

            return $order;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Get order by ID
     */
    public function getOrder(string $companyId, string $orderId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT o.*, s.name as supplier_name, p.name as project_name
            FROM material_orders o
            LEFT JOIN suppliers s ON o.supplier_id = s.id
            LEFT JOIN construction_projects p ON o.project_id = p.id
            WHERE o.id = ? AND o.company_id = ?
        ");
        $stmt->execute([$orderId, $companyId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($order) {
            $stmt2 = $this->pdo->prepare("
                SELECT oi.*, m.name as material_name, m.unit, m.sku
                FROM material_order_items oi
                JOIN material_catalog m ON oi.material_id = m.id
                WHERE oi.order_id = ?
            ");
            $stmt2->execute([$orderId]);
            $order['items'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        }

        return $order ?: null;
    }

    /**
     * List orders
     */
    public function listOrders(string $companyId, array $filters = []): array {
        $sql = "
            SELECT o.*, s.name as supplier_name, p.name as project_name,
                   (SELECT COUNT(*) FROM material_order_items WHERE order_id = o.id) as item_count
            FROM material_orders o
            LEFT JOIN suppliers s ON o.supplier_id = s.id
            LEFT JOIN construction_projects p ON o.project_id = p.id
            WHERE o.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['status'])) {
            $sql .= " AND o.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['project_id'])) {
            $sql .= " AND o.project_id = ?";
            $params[] = $filters['project_id'];
        }

        $sql .= " ORDER BY o.created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update order status
     */
    public function updateOrderStatus(string $companyId, string $orderId, string $status): ?array {
        $validStatuses = ['pending', 'ordered', 'shipped', 'delivered', 'cancelled'];
        if (!in_array($status, $validStatuses)) {
            throw new Exception("Invalid status: $status");
        }

        $stmt = $this->pdo->prepare("
            UPDATE material_orders SET
                status = ?,
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
            RETURNING *
        ");

        $stmt->execute([$status, $orderId, $companyId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        // If delivered, update stock
        if ($status === 'delivered' && $order) {
            $stmt2 = $this->pdo->prepare("
                SELECT material_id, quantity FROM material_order_items WHERE order_id = ?
            ");
            $stmt2->execute([$orderId]);
            $items = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            foreach ($items as $item) {
                $stmt3 = $this->pdo->prepare("
                    UPDATE material_catalog SET
                        current_stock = current_stock + ?,
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $stmt3->execute([$item['quantity'], $item['material_id']]);
            }
        }

        return $order ?: null;
    }

    /**
     * Get low stock materials
     */
    public function getLowStockMaterials(string $companyId): array {
        $stmt = $this->pdo->prepare("
            SELECT m.*, s.name as supplier_name,
                   (m.min_stock_level - m.current_stock) as quantity_needed
            FROM material_catalog m
            LEFT JOIN suppliers s ON m.supplier_id = s.id
            WHERE m.company_id = ?
              AND m.current_stock <= m.min_stock_level
            ORDER BY (m.min_stock_level - m.current_stock) DESC
        ");
        $stmt->execute([$companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get material cost summary for project
     */
    public function getProjectMaterialCosts(string $projectId): array {
        $stmt = $this->pdo->prepare("
            SELECT
                SUM(pm.quantity_allocated * pm.unit_price_at_allocation) as total_allocated_cost,
                SUM(pm.quantity_used * pm.unit_price_at_allocation) as total_used_cost,
                SUM(pm.quantity_wasted * pm.unit_price_at_allocation) as total_wasted_cost,
                COUNT(DISTINCT pm.material_id) as material_count
            FROM project_materials pm
            WHERE pm.project_id = ?
        ");
        $stmt->execute([$projectId]);
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get by category
        $stmt2 = $this->pdo->prepare("
            SELECT m.category,
                   SUM(pm.quantity_used * pm.unit_price_at_allocation) as cost
            FROM project_materials pm
            JOIN material_catalog m ON pm.material_id = m.id
            WHERE pm.project_id = ?
            GROUP BY m.category
            ORDER BY cost DESC
        ");
        $stmt2->execute([$projectId]);
        $byCategory = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        return [
            'summary' => $summary,
            'by_category' => $byCategory
        ];
    }
}
