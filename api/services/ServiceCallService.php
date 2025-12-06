<?php
/**
 * Service Call Management Service
 * E3-US06: Service request management for electrical contractors
 *
 * Features:
 * - Service request intake
 * - Technician assignment
 * - Dispatch optimization
 * - Parts tracking per call
 * - Customer notifications
 * - Invoice generation on completion
 */

require_once __DIR__ . '/../config/database.php';

class ServiceCallService {
    private static ?ServiceCallService $instance = null;
    private PDO $pdo;

    // Service call types
    private array $serviceTypes = [
        'emergency' => ['name' => 'Urgență', 'priority' => 1, 'response_hours' => 2],
        'repair' => ['name' => 'Reparație', 'priority' => 2, 'response_hours' => 24],
        'maintenance' => ['name' => 'Mentenanță', 'priority' => 3, 'response_hours' => 72],
        'installation' => ['name' => 'Instalare', 'priority' => 2, 'response_hours' => 48],
        'inspection' => ['name' => 'Inspecție', 'priority' => 3, 'response_hours' => 72],
        'consultation' => ['name' => 'Consultanță', 'priority' => 4, 'response_hours' => 120]
    ];

    // Service call statuses
    private array $statuses = [
        'new' => 'Nouă',
        'assigned' => 'Atribuită',
        'en_route' => 'În Drum',
        'on_site' => 'La Locație',
        'in_progress' => 'În Lucru',
        'parts_needed' => 'Necesită Piese',
        'completed' => 'Finalizată',
        'invoiced' => 'Facturată',
        'cancelled' => 'Anulată'
    ];

    // Problem categories (electrical)
    private array $problemCategories = [
        'power_outage' => 'Pană de Curent',
        'short_circuit' => 'Scurtcircuit',
        'wiring' => 'Cablaj',
        'outlets' => 'Prize/Întrerupătoare',
        'lighting' => 'Iluminat',
        'panel' => 'Tablou Electric',
        'grounding' => 'Împământare',
        'appliances' => 'Electrocasnice',
        'safety' => 'Siguranță/Protecție',
        'upgrade' => 'Modernizare',
        'other' => 'Altele'
    ];

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): ServiceCallService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getServiceTypes(): array {
        return $this->serviceTypes;
    }

    public function getStatuses(): array {
        return $this->statuses;
    }

    public function getProblemCategories(): array {
        return $this->problemCategories;
    }

    /**
     * Create service call
     */
    public function createServiceCall(string $companyId, array $data): array {
        $callNumber = 'SC-' . date('Ymd') . '-' . substr(uniqid(), -4);

        $stmt = $this->pdo->prepare("
            INSERT INTO service_calls
            (company_id, call_number, customer_id, customer_name, customer_phone, customer_email,
             service_address, service_type, problem_category, problem_description, priority,
             preferred_date, preferred_time_start, preferred_time_end,
             status, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, NOW(), NOW())
            RETURNING *
        ");

        $serviceType = $data['service_type'] ?? 'repair';
        $priority = $this->serviceTypes[$serviceType]['priority'] ?? 2;

        $stmt->execute([
            $companyId,
            $callNumber,
            $data['customer_id'] ?? null,
            $data['customer_name'],
            $data['customer_phone'],
            $data['customer_email'] ?? null,
            $data['service_address'],
            $serviceType,
            $data['problem_category'] ?? 'other',
            $data['problem_description'] ?? null,
            $data['priority'] ?? $priority,
            $data['preferred_date'] ?? null,
            $data['preferred_time_start'] ?? null,
            $data['preferred_time_end'] ?? null,
            $data['created_by'] ?? null
        ]);

        $call = $stmt->fetch(PDO::FETCH_ASSOC);

        // Log status change
        $this->logStatusChange($call['id'], null, 'new', $data['created_by'] ?? null, 'Service call created');

        return $call;
    }

    /**
     * Get service call
     */
    public function getServiceCall(string $companyId, string $callId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT sc.*, t.name as technician_name
            FROM service_calls sc
            LEFT JOIN crew_workers t ON sc.assigned_technician = t.id
            WHERE sc.id = ? AND sc.company_id = ?
        ");
        $stmt->execute([$callId, $companyId]);
        $call = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($call) {
            // Get parts used
            $stmt2 = $this->pdo->prepare("
                SELECT scp.*, m.name as part_name, m.unit
                FROM service_call_parts scp
                LEFT JOIN material_catalog m ON scp.material_id = m.id
                WHERE scp.service_call_id = ?
            ");
            $stmt2->execute([$callId]);
            $call['parts'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            // Get status history
            $stmt3 = $this->pdo->prepare("
                SELECT * FROM service_call_logs WHERE service_call_id = ? ORDER BY created_at DESC
            ");
            $stmt3->execute([$callId]);
            $call['history'] = $stmt3->fetchAll(PDO::FETCH_ASSOC);
        }

        return $call ?: null;
    }

    /**
     * List service calls
     */
    public function listServiceCalls(string $companyId, array $filters = []): array {
        $sql = "
            SELECT sc.*, t.name as technician_name
            FROM service_calls sc
            LEFT JOIN crew_workers t ON sc.assigned_technician = t.id
            WHERE sc.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['status'])) {
            $sql .= " AND sc.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['technician_id'])) {
            $sql .= " AND sc.assigned_technician = ?";
            $params[] = $filters['technician_id'];
        }

        if (!empty($filters['service_type'])) {
            $sql .= " AND sc.service_type = ?";
            $params[] = $filters['service_type'];
        }

        if (!empty($filters['date_from'])) {
            $sql .= " AND DATE(sc.created_at) >= ?";
            $params[] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $sql .= " AND DATE(sc.created_at) <= ?";
            $params[] = $filters['date_to'];
        }

        if (!empty($filters['priority'])) {
            $sql .= " AND sc.priority <= ?";
            $params[] = intval($filters['priority']);
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (sc.customer_name ILIKE ? OR sc.call_number ILIKE ? OR sc.service_address ILIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        $sql .= " ORDER BY sc.priority ASC, sc.created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Assign technician
     */
    public function assignTechnician(string $companyId, string $callId, string $technicianId, ?string $scheduledDate = null, ?string $scheduledTime = null): array {
        $stmt = $this->pdo->prepare("
            UPDATE service_calls SET
                assigned_technician = ?,
                scheduled_date = COALESCE(?, scheduled_date),
                scheduled_time = COALESCE(?, scheduled_time),
                status = CASE WHEN status = 'new' THEN 'assigned' ELSE status END,
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
            RETURNING *
        ");

        $stmt->execute([$technicianId, $scheduledDate, $scheduledTime, $callId, $companyId]);
        $call = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($call) {
            $this->logStatusChange($callId, null, 'assigned', null, "Assigned to technician");
        }

        return $call;
    }

    /**
     * Update status
     */
    public function updateStatus(string $companyId, string $callId, string $status, ?string $notes = null, ?string $userId = null): ?array {
        if (!array_key_exists($status, $this->statuses)) {
            throw new Exception("Invalid status: $status");
        }

        // Get current status
        $stmt = $this->pdo->prepare("SELECT status FROM service_calls WHERE id = ? AND company_id = ?");
        $stmt->execute([$callId, $companyId]);
        $oldStatus = $stmt->fetchColumn();

        // Update status
        $updateSql = "
            UPDATE service_calls SET
                status = ?,
                updated_at = NOW()
        ";
        $params = [$status];

        // Set timestamps based on status
        if ($status === 'on_site') {
            $updateSql .= ", arrival_time = NOW()";
        } elseif ($status === 'completed') {
            $updateSql .= ", completion_time = NOW()";
        }

        $updateSql .= " WHERE id = ? AND company_id = ? RETURNING *";
        $params[] = $callId;
        $params[] = $companyId;

        $stmt2 = $this->pdo->prepare($updateSql);
        $stmt2->execute($params);
        $call = $stmt2->fetch(PDO::FETCH_ASSOC);

        if ($call) {
            $this->logStatusChange($callId, $oldStatus, $status, $userId, $notes);
        }

        return $call ?: null;
    }

    /**
     * Add parts used
     */
    public function addParts(string $callId, array $parts): array {
        $addedParts = [];

        $stmt = $this->pdo->prepare("
            INSERT INTO service_call_parts
            (service_call_id, material_id, description, quantity, unit_price)
            VALUES (?, ?, ?, ?, ?)
            RETURNING *
        ");

        foreach ($parts as $part) {
            $stmt->execute([
                $callId,
                $part['material_id'] ?? null,
                $part['description'],
                floatval($part['quantity']),
                floatval($part['unit_price'] ?? 0)
            ]);
            $addedParts[] = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        // Update total parts cost
        $this->recalculateTotals($callId);

        return $addedParts;
    }

    /**
     * Set labor hours and rate
     */
    public function setLabor(string $callId, float $hours, float $hourlyRate): array {
        $laborCost = $hours * $hourlyRate;

        $stmt = $this->pdo->prepare("
            UPDATE service_calls SET
                labor_hours = ?,
                labor_rate = ?,
                labor_cost = ?,
                updated_at = NOW()
            WHERE id = ?
            RETURNING *
        ");

        $stmt->execute([$hours, $hourlyRate, $laborCost, $callId]);
        $call = $stmt->fetch(PDO::FETCH_ASSOC);

        $this->recalculateTotals($callId);

        return $call;
    }

    /**
     * Recalculate totals
     */
    private function recalculateTotals(string $callId): void {
        $stmt = $this->pdo->prepare("
            UPDATE service_calls SET
                parts_cost = COALESCE((
                    SELECT SUM(quantity * unit_price) FROM service_call_parts WHERE service_call_id = ?
                ), 0),
                total_cost = COALESCE(labor_cost, 0) + COALESCE((
                    SELECT SUM(quantity * unit_price) FROM service_call_parts WHERE service_call_id = ?
                ), 0)
            WHERE id = ?
        ");
        $stmt->execute([$callId, $callId, $callId]);
    }

    /**
     * Log status change
     */
    private function logStatusChange(string $callId, ?string $oldStatus, string $newStatus, ?string $userId, ?string $notes): void {
        $stmt = $this->pdo->prepare("
            INSERT INTO service_call_logs
            (service_call_id, old_status, new_status, changed_by, notes, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$callId, $oldStatus, $newStatus, $userId, $notes]);
    }

    /**
     * Generate invoice from service call
     */
    public function generateInvoice(string $companyId, string $callId): array {
        $call = $this->getServiceCall($companyId, $callId);
        if (!$call) {
            throw new Exception("Service call not found");
        }

        // Create invoice data
        $invoiceData = [
            'customer_name' => $call['customer_name'],
            'customer_email' => $call['customer_email'],
            'customer_phone' => $call['customer_phone'],
            'service_address' => $call['service_address'],
            'service_call_id' => $callId,
            'call_number' => $call['call_number'],
            'items' => [],
            'labor_hours' => $call['labor_hours'],
            'labor_rate' => $call['labor_rate'],
            'labor_cost' => $call['labor_cost'],
            'parts_cost' => $call['parts_cost'],
            'total_cost' => $call['total_cost']
        ];

        // Add labor as line item
        if ($call['labor_hours'] > 0) {
            $invoiceData['items'][] = [
                'description' => 'Manoperă - ' . $call['labor_hours'] . ' ore',
                'quantity' => $call['labor_hours'],
                'unit_price' => $call['labor_rate'],
                'total' => $call['labor_cost']
            ];
        }

        // Add parts as line items
        foreach ($call['parts'] as $part) {
            $invoiceData['items'][] = [
                'description' => $part['description'] ?? $part['part_name'],
                'quantity' => $part['quantity'],
                'unit_price' => $part['unit_price'],
                'total' => $part['quantity'] * $part['unit_price']
            ];
        }

        // Update service call status
        $this->updateStatus($companyId, $callId, 'invoiced', 'Invoice generated');

        return $invoiceData;
    }

    /**
     * Get available technicians for date
     */
    public function getAvailableTechnicians(string $companyId, string $date): array {
        $stmt = $this->pdo->prepare("
            SELECT w.*
            FROM crew_workers w
            WHERE w.company_id = ?
              AND w.status = 'active'
              AND w.trade IN ('electrician', 'general')
              AND w.id NOT IN (
                  SELECT assigned_technician FROM service_calls
                  WHERE scheduled_date = ?
                    AND status IN ('assigned', 'en_route', 'on_site', 'in_progress')
                    AND assigned_technician IS NOT NULL
                  GROUP BY assigned_technician
                  HAVING COUNT(*) >= 4
              )
            ORDER BY w.skill_level DESC, w.name
        ");
        $stmt->execute([$companyId, $date]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get technician schedule
     */
    public function getTechnicianSchedule(string $technicianId, string $dateFrom, string $dateTo): array {
        $stmt = $this->pdo->prepare("
            SELECT sc.*
            FROM service_calls sc
            WHERE sc.assigned_technician = ?
              AND sc.scheduled_date BETWEEN ? AND ?
              AND sc.status NOT IN ('completed', 'invoiced', 'cancelled')
            ORDER BY sc.scheduled_date, sc.scheduled_time
        ");
        $stmt->execute([$technicianId, $dateFrom, $dateTo]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get service call statistics
     */
    public function getStatistics(string $companyId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $dateFrom = $dateFrom ?? date('Y-m-01');
        $dateTo = $dateTo ?? date('Y-m-t');

        // Total calls
        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(*) as total_calls,
                COUNT(CASE WHEN status = 'completed' OR status = 'invoiced' THEN 1 END) as completed_calls,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_calls,
                SUM(CASE WHEN status IN ('completed', 'invoiced') THEN total_cost ELSE 0 END) as total_revenue,
                AVG(CASE WHEN completion_time IS NOT NULL AND arrival_time IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (completion_time - arrival_time))/3600 END) as avg_duration_hours
            FROM service_calls
            WHERE company_id = ? AND DATE(created_at) BETWEEN ? AND ?
        ");
        $stmt->execute([$companyId, $dateFrom, $dateTo]);
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        // By service type
        $stmt2 = $this->pdo->prepare("
            SELECT service_type, COUNT(*) as count,
                   SUM(CASE WHEN status IN ('completed', 'invoiced') THEN total_cost ELSE 0 END) as revenue
            FROM service_calls
            WHERE company_id = ? AND DATE(created_at) BETWEEN ? AND ?
            GROUP BY service_type
        ");
        $stmt2->execute([$companyId, $dateFrom, $dateTo]);
        $byType = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        // By technician
        $stmt3 = $this->pdo->prepare("
            SELECT w.name as technician_name, COUNT(sc.id) as calls_handled,
                   COUNT(CASE WHEN sc.status IN ('completed', 'invoiced') THEN 1 END) as completed,
                   SUM(CASE WHEN sc.status IN ('completed', 'invoiced') THEN sc.total_cost ELSE 0 END) as revenue
            FROM service_calls sc
            JOIN crew_workers w ON sc.assigned_technician = w.id
            WHERE sc.company_id = ? AND DATE(sc.created_at) BETWEEN ? AND ?
            GROUP BY w.id, w.name
            ORDER BY calls_handled DESC
        ");
        $stmt3->execute([$companyId, $dateFrom, $dateTo]);
        $byTechnician = $stmt3->fetchAll(PDO::FETCH_ASSOC);

        return [
            'period' => ['from' => $dateFrom, 'to' => $dateTo],
            'summary' => $summary,
            'by_type' => $byType,
            'by_technician' => $byTechnician
        ];
    }
}
