<?php
/**
 * Construction Estimate Service
 * E3-US01: Create estimates/quotes for construction projects
 *
 * Features:
 * - Estimate builder with line items
 * - Material cost calculator
 * - Labor hour calculator
 * - Markup/margin settings
 * - Client acceptance tracking
 * - Convert to project
 */

require_once __DIR__ . '/../config/database.php';

class ConstructionEstimateService {
    private static ?ConstructionEstimateService $instance = null;
    private PDO $pdo;

    // Default labor rates (RON/hour)
    private array $defaultLaborRates = [
        'electrician' => ['apprentice' => 35, 'journeyman' => 55, 'master' => 80],
        'plumber' => ['apprentice' => 30, 'journeyman' => 50, 'master' => 75],
        'carpenter' => ['apprentice' => 28, 'journeyman' => 45, 'master' => 65],
        'mason' => ['apprentice' => 25, 'journeyman' => 40, 'master' => 60],
        'painter' => ['apprentice' => 22, 'journeyman' => 35, 'master' => 50],
        'general' => ['apprentice' => 20, 'journeyman' => 35, 'master' => 50],
        'hvac' => ['apprentice' => 35, 'journeyman' => 55, 'master' => 85],
        'welder' => ['apprentice' => 35, 'journeyman' => 60, 'master' => 90]
    ];

    // Common material categories
    private array $materialCategories = [
        'electrical' => 'Materiale Electrice',
        'plumbing' => 'Instalații Sanitare',
        'lumber' => 'Lemn & Cherestea',
        'concrete' => 'Beton & Ciment',
        'masonry' => 'Zidărie',
        'paint' => 'Vopsea & Finisaje',
        'hardware' => 'Feronerie',
        'insulation' => 'Izolații',
        'roofing' => 'Acoperiș',
        'flooring' => 'Pardoseli',
        'hvac' => 'Climatizare',
        'other' => 'Altele'
    ];

    // Estimate statuses
    public const STATUS_DRAFT = 'draft';
    public const STATUS_SENT = 'sent';
    public const STATUS_VIEWED = 'viewed';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_CONVERTED = 'converted';

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): ConstructionEstimateService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get labor rate categories
     */
    public function getLaborRates(): array {
        return $this->defaultLaborRates;
    }

    /**
     * Get material categories
     */
    public function getMaterialCategories(): array {
        return $this->materialCategories;
    }

    /**
     * Create new estimate
     */
    public function createEstimate(string $companyId, array $data): array {
        $this->pdo->beginTransaction();

        try {
            // Generate estimate number
            $estimateNumber = $this->generateEstimateNumber($companyId);

            // Insert estimate header
            $stmt = $this->pdo->prepare("
                INSERT INTO estimates
                (company_id, estimate_number, customer_id, customer_name, customer_email,
                 customer_phone, customer_address, project_name, project_description,
                 project_address, valid_until, status, subtotal, tax_rate, tax_amount,
                 discount_type, discount_value, discount_amount, total, markup_percentage,
                 notes, terms, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, ?, 0, ?, ?, 0, 0, ?, ?, ?, ?, NOW(), NOW())
                RETURNING *
            ");

            $validUntil = $data['valid_until'] ?? date('Y-m-d', strtotime('+30 days'));
            $taxRate = $data['tax_rate'] ?? 19.00;
            $markupPercentage = $data['markup_percentage'] ?? 0;

            $stmt->execute([
                $companyId,
                $estimateNumber,
                $data['customer_id'] ?? null,
                $data['customer_name'],
                $data['customer_email'] ?? null,
                $data['customer_phone'] ?? null,
                $data['customer_address'] ?? null,
                $data['project_name'],
                $data['project_description'] ?? null,
                $data['project_address'] ?? null,
                $validUntil,
                $taxRate,
                $data['discount_type'] ?? 'none',
                $data['discount_value'] ?? 0,
                $markupPercentage,
                $data['notes'] ?? null,
                $data['terms'] ?? $this->getDefaultTerms(),
                $data['created_by'] ?? null
            ]);

            $estimate = $stmt->fetch(PDO::FETCH_ASSOC);

            // Add line items if provided
            if (!empty($data['items'])) {
                foreach ($data['items'] as $item) {
                    $this->addEstimateItem($estimate['id'], $item);
                }
                // Recalculate totals
                $estimate = $this->recalculateTotals($estimate['id']);
            }

            $this->pdo->commit();
            return $estimate;

        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Add item to estimate
     */
    public function addEstimateItem(string $estimateId, array $item): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO estimate_items
            (estimate_id, item_type, category, description, quantity, unit,
             unit_cost, labor_hours, labor_rate, labor_cost, material_cost,
             markup_percentage, total, sort_order, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        ");

        $itemType = $item['item_type'] ?? 'material'; // material, labor, combined
        $quantity = floatval($item['quantity'] ?? 1);
        $unit = $item['unit'] ?? 'buc';
        $unitCost = floatval($item['unit_cost'] ?? 0);
        $laborHours = floatval($item['labor_hours'] ?? 0);
        $laborRate = floatval($item['labor_rate'] ?? 0);
        $laborCost = $laborHours * $laborRate;
        $materialCost = $quantity * $unitCost;
        $markupPct = floatval($item['markup_percentage'] ?? 0);
        $subtotal = $materialCost + $laborCost;
        $total = $subtotal * (1 + $markupPct / 100);

        $stmt->execute([
            $estimateId,
            $itemType,
            $item['category'] ?? 'other',
            $item['description'],
            $quantity,
            $unit,
            $unitCost,
            $laborHours,
            $laborRate,
            $laborCost,
            $materialCost,
            $markupPct,
            $total,
            $item['sort_order'] ?? 0,
            $item['notes'] ?? null
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Update estimate item
     */
    public function updateEstimateItem(string $itemId, array $data): ?array {
        $stmt = $this->pdo->prepare("
            UPDATE estimate_items SET
                category = COALESCE(?, category),
                description = COALESCE(?, description),
                quantity = COALESCE(?, quantity),
                unit = COALESCE(?, unit),
                unit_cost = COALESCE(?, unit_cost),
                labor_hours = COALESCE(?, labor_hours),
                labor_rate = COALESCE(?, labor_rate),
                markup_percentage = COALESCE(?, markup_percentage),
                notes = COALESCE(?, notes)
            WHERE id = ?
            RETURNING *
        ");

        $stmt->execute([
            $data['category'] ?? null,
            $data['description'] ?? null,
            isset($data['quantity']) ? floatval($data['quantity']) : null,
            $data['unit'] ?? null,
            isset($data['unit_cost']) ? floatval($data['unit_cost']) : null,
            isset($data['labor_hours']) ? floatval($data['labor_hours']) : null,
            isset($data['labor_rate']) ? floatval($data['labor_rate']) : null,
            isset($data['markup_percentage']) ? floatval($data['markup_percentage']) : null,
            $data['notes'] ?? null,
            $itemId
        ]);

        $item = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($item) {
            // Recalculate item totals
            $laborCost = $item['labor_hours'] * $item['labor_rate'];
            $materialCost = $item['quantity'] * $item['unit_cost'];
            $subtotal = $materialCost + $laborCost;
            $total = $subtotal * (1 + $item['markup_percentage'] / 100);

            $stmt = $this->pdo->prepare("
                UPDATE estimate_items SET
                    labor_cost = ?,
                    material_cost = ?,
                    total = ?
                WHERE id = ?
                RETURNING *
            ");
            $stmt->execute([$laborCost, $materialCost, $total, $itemId]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);

            // Recalculate estimate totals
            $this->recalculateTotals($item['estimate_id']);
        }

        return $item ?: null;
    }

    /**
     * Delete estimate item
     */
    public function deleteEstimateItem(string $itemId): bool {
        // Get estimate_id first
        $stmt = $this->pdo->prepare("SELECT estimate_id FROM estimate_items WHERE id = ?");
        $stmt->execute([$itemId]);
        $estimateId = $stmt->fetchColumn();

        if (!$estimateId) return false;

        $stmt = $this->pdo->prepare("DELETE FROM estimate_items WHERE id = ?");
        $stmt->execute([$itemId]);

        if ($stmt->rowCount() > 0) {
            $this->recalculateTotals($estimateId);
            return true;
        }
        return false;
    }

    /**
     * Recalculate estimate totals
     */
    public function recalculateTotals(string $estimateId): array {
        // Get sum of all items
        $stmt = $this->pdo->prepare("
            SELECT
                COALESCE(SUM(material_cost), 0) as total_materials,
                COALESCE(SUM(labor_cost), 0) as total_labor,
                COALESCE(SUM(total), 0) as subtotal
            FROM estimate_items
            WHERE estimate_id = ?
        ");
        $stmt->execute([$estimateId]);
        $sums = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get estimate details
        $stmt = $this->pdo->prepare("SELECT * FROM estimates WHERE id = ?");
        $stmt->execute([$estimateId]);
        $estimate = $stmt->fetch(PDO::FETCH_ASSOC);

        $subtotal = floatval($sums['subtotal']);

        // Apply markup
        $markup = $estimate['markup_percentage'] ?? 0;
        $subtotalWithMarkup = $subtotal * (1 + $markup / 100);

        // Apply discount
        $discountAmount = 0;
        if ($estimate['discount_type'] === 'percentage') {
            $discountAmount = $subtotalWithMarkup * ($estimate['discount_value'] / 100);
        } elseif ($estimate['discount_type'] === 'fixed') {
            $discountAmount = floatval($estimate['discount_value']);
        }

        $subtotalAfterDiscount = $subtotalWithMarkup - $discountAmount;

        // Calculate tax
        $taxRate = floatval($estimate['tax_rate'] ?? 19);
        $taxAmount = $subtotalAfterDiscount * ($taxRate / 100);

        $total = $subtotalAfterDiscount + $taxAmount;

        // Update estimate
        $stmt = $this->pdo->prepare("
            UPDATE estimates SET
                subtotal = ?,
                discount_amount = ?,
                tax_amount = ?,
                total = ?,
                updated_at = NOW()
            WHERE id = ?
            RETURNING *
        ");
        $stmt->execute([$subtotalWithMarkup, $discountAmount, $taxAmount, $total, $estimateId]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get estimate by ID
     */
    public function getEstimate(string $companyId, string $estimateId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT e.*,
                   (SELECT COUNT(*) FROM estimate_items WHERE estimate_id = e.id) as item_count
            FROM estimates e
            WHERE e.id = ? AND e.company_id = ?
        ");
        $stmt->execute([$estimateId, $companyId]);
        $estimate = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($estimate) {
            $estimate['items'] = $this->getEstimateItems($estimateId);
        }

        return $estimate ?: null;
    }

    /**
     * Get estimate items
     */
    public function getEstimateItems(string $estimateId): array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM estimate_items
            WHERE estimate_id = ?
            ORDER BY sort_order, created_at
        ");
        $stmt->execute([$estimateId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * List estimates
     */
    public function listEstimates(string $companyId, array $filters = []): array {
        $sql = "
            SELECT e.*,
                   (SELECT COUNT(*) FROM estimate_items WHERE estimate_id = e.id) as item_count
            FROM estimates e
            WHERE e.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['status'])) {
            $sql .= " AND e.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['customer_id'])) {
            $sql .= " AND e.customer_id = ?";
            $params[] = $filters['customer_id'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (e.estimate_number ILIKE ? OR e.customer_name ILIKE ? OR e.project_name ILIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        if (!empty($filters['date_from'])) {
            $sql .= " AND e.created_at >= ?";
            $params[] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $sql .= " AND e.created_at <= ?";
            $params[] = $filters['date_to'];
        }

        $sql .= " ORDER BY e.created_at DESC LIMIT 100";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update estimate status
     */
    public function updateStatus(string $estimateId, string $status, ?string $reason = null): bool {
        $validStatuses = [
            self::STATUS_DRAFT, self::STATUS_SENT, self::STATUS_VIEWED,
            self::STATUS_ACCEPTED, self::STATUS_REJECTED, self::STATUS_EXPIRED,
            self::STATUS_CONVERTED
        ];

        if (!in_array($status, $validStatuses)) {
            throw new Exception("Invalid status: $status");
        }

        $stmt = $this->pdo->prepare("
            UPDATE estimates SET
                status = ?,
                status_reason = ?,
                status_changed_at = NOW(),
                accepted_at = CASE WHEN ? = 'accepted' THEN NOW() ELSE accepted_at END,
                rejected_at = CASE WHEN ? = 'rejected' THEN NOW() ELSE rejected_at END,
                updated_at = NOW()
            WHERE id = ?
        ");

        return $stmt->execute([$status, $reason, $status, $status, $estimateId]);
    }

    /**
     * Send estimate to customer
     */
    public function sendEstimate(string $companyId, string $estimateId, array $options = []): array {
        $estimate = $this->getEstimate($companyId, $estimateId);

        if (!$estimate) {
            throw new Exception('Estimate not found');
        }

        // Update status to sent
        $this->updateStatus($estimateId, self::STATUS_SENT);

        // Generate view link token
        $viewToken = bin2hex(random_bytes(32));
        $stmt = $this->pdo->prepare("
            UPDATE estimates SET
                view_token = ?,
                sent_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$viewToken, $estimateId]);

        // Here would integrate with email/WhatsApp services
        return [
            'success' => true,
            'estimate_id' => $estimateId,
            'view_url' => "https://documentiulia.ro/estimate/view/{$viewToken}",
            'sent_via' => $options['send_via'] ?? 'email'
        ];
    }

    /**
     * Clone estimate
     */
    public function cloneEstimate(string $companyId, string $estimateId): array {
        $original = $this->getEstimate($companyId, $estimateId);

        if (!$original) {
            throw new Exception('Estimate not found');
        }

        // Create new estimate with same data
        $newData = $original;
        unset($newData['id'], $newData['estimate_number'], $newData['created_at'],
              $newData['updated_at'], $newData['status'], $newData['sent_at'],
              $newData['accepted_at'], $newData['rejected_at'], $newData['view_token']);

        $newEstimate = $this->createEstimate($companyId, $newData);

        // Clone items
        foreach ($original['items'] as $item) {
            unset($item['id'], $item['estimate_id'], $item['created_at']);
            $this->addEstimateItem($newEstimate['id'], $item);
        }

        return $this->recalculateTotals($newEstimate['id']);
    }

    /**
     * Convert estimate to project
     */
    public function convertToProject(string $companyId, string $estimateId): array {
        $estimate = $this->getEstimate($companyId, $estimateId);

        if (!$estimate) {
            throw new Exception('Estimate not found');
        }

        if ($estimate['status'] !== self::STATUS_ACCEPTED) {
            throw new Exception('Only accepted estimates can be converted to projects');
        }

        // Create project
        $stmt = $this->pdo->prepare("
            INSERT INTO construction_projects
            (company_id, estimate_id, project_number, name, description, customer_id,
             customer_name, address, budget, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planning', NOW(), NOW())
            RETURNING *
        ");

        $projectNumber = $this->generateProjectNumber($companyId);

        $stmt->execute([
            $companyId,
            $estimateId,
            $projectNumber,
            $estimate['project_name'],
            $estimate['project_description'],
            $estimate['customer_id'],
            $estimate['customer_name'],
            $estimate['project_address'],
            $estimate['total']
        ]);

        $project = $stmt->fetch(PDO::FETCH_ASSOC);

        // Update estimate status
        $this->updateStatus($estimateId, self::STATUS_CONVERTED);

        // Link estimate to project
        $stmt = $this->pdo->prepare("UPDATE estimates SET project_id = ? WHERE id = ?");
        $stmt->execute([$project['id'], $estimateId]);

        return $project;
    }

    /**
     * Get estimate summary/breakdown
     */
    public function getEstimateSummary(string $estimateId): array {
        $stmt = $this->pdo->prepare("
            SELECT
                category,
                COUNT(*) as item_count,
                SUM(material_cost) as material_total,
                SUM(labor_cost) as labor_total,
                SUM(labor_hours) as labor_hours_total,
                SUM(total) as category_total
            FROM estimate_items
            WHERE estimate_id = ?
            GROUP BY category
            ORDER BY category_total DESC
        ");
        $stmt->execute([$estimateId]);
        $byCategory = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $this->pdo->prepare("
            SELECT
                SUM(material_cost) as total_materials,
                SUM(labor_cost) as total_labor,
                SUM(labor_hours) as total_hours,
                SUM(total) as subtotal,
                COUNT(*) as total_items
            FROM estimate_items
            WHERE estimate_id = ?
        ");
        $stmt->execute([$estimateId]);
        $totals = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'by_category' => $byCategory,
            'totals' => $totals
        ];
    }

    /**
     * Generate estimate number
     */
    private function generateEstimateNumber(string $companyId): string {
        $year = date('Y');
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) + 1 as next_num
            FROM estimates
            WHERE company_id = ?
              AND EXTRACT(YEAR FROM created_at) = ?
        ");
        $stmt->execute([$companyId, $year]);
        $nextNum = $stmt->fetchColumn();

        return sprintf('EST-%s-%05d', $year, $nextNum);
    }

    /**
     * Generate project number
     */
    private function generateProjectNumber(string $companyId): string {
        $year = date('Y');
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) + 1 as next_num
            FROM construction_projects
            WHERE company_id = ?
              AND EXTRACT(YEAR FROM created_at) = ?
        ");
        $stmt->execute([$companyId, $year]);
        $nextNum = $stmt->fetchColumn();

        return sprintf('PRJ-%s-%05d', $year, $nextNum);
    }

    /**
     * Get default terms and conditions
     */
    private function getDefaultTerms(): string {
        return "1. Acest deviz este valabil 30 de zile de la data emiterii.\n" .
               "2. Prețurile includ TVA 19%.\n" .
               "3. Plata se efectuează în avans 50%, restul la finalizare.\n" .
               "4. Termenul de execuție se stabilește la semnarea contractului.\n" .
               "5. Materialele pot varia în funcție de disponibilitate.";
    }
}
