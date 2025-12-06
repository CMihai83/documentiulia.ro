<?php
/**
 * Permit Management Service
 * E3-US08: Track permits and inspections for construction projects
 *
 * Features:
 * - Permit requirement lookup
 * - Application tracking
 * - Inspection scheduling
 * - Result recording
 * - Document storage
 */

require_once __DIR__ . '/../config/database.php';

class PermitManagementService {
    private static ?PermitManagementService $instance = null;
    private PDO $pdo;

    // Permit types for construction/electrical
    private array $permitTypes = [
        'construction' => [
            'name' => 'Autorizație de Construire',
            'authority' => 'Primărie',
            'typical_duration' => '30 zile',
            'validity' => '24 luni',
            'required_for' => ['Construcții noi', 'Extinderi', 'Modificări structurale']
        ],
        'demolition' => [
            'name' => 'Autorizație de Demolare',
            'authority' => 'Primărie',
            'typical_duration' => '30 zile',
            'validity' => '12 luni',
            'required_for' => ['Demolări totale', 'Demolări parțiale']
        ],
        'electrical' => [
            'name' => 'Aviz Tehnic de Racordare (ATR)',
            'authority' => 'Distribuitor Energie (E-Distribuție, etc.)',
            'typical_duration' => '30 zile',
            'validity' => '24 luni',
            'required_for' => ['Racordări noi', 'Măriri putere', 'Modificări instalație']
        ],
        'gas' => [
            'name' => 'Aviz Tehnic Gaze',
            'authority' => 'Distribuitor Gaze (Distrigaz, Engie)',
            'typical_duration' => '30 zile',
            'validity' => '12 luni',
            'required_for' => ['Racordare gaze', 'Modificări instalație gaze']
        ],
        'water' => [
            'name' => 'Aviz Apă-Canal',
            'authority' => 'Operator Apă (Apa Nova, etc.)',
            'typical_duration' => '15 zile',
            'validity' => '12 luni',
            'required_for' => ['Racordare apă', 'Racordare canalizare']
        ],
        'fire' => [
            'name' => 'Aviz PSI (Pompieri)',
            'authority' => 'ISU',
            'typical_duration' => '30 zile',
            'validity' => 'Pe durata AC',
            'required_for' => ['Clădiri publice', 'Clădiri > 28m', 'Spații comerciale']
        ],
        'environment' => [
            'name' => 'Acord de Mediu',
            'authority' => 'APM (Agenția pentru Protecția Mediului)',
            'typical_duration' => '45 zile',
            'validity' => 'Pe durata AC',
            'required_for' => ['Proiecte mari', 'Zone protejate']
        ],
        'heritage' => [
            'name' => 'Aviz Monument Istoric',
            'authority' => 'Ministerul Culturii / DJPC',
            'typical_duration' => '45 zile',
            'validity' => 'Pe durata AC',
            'required_for' => ['Clădiri monument', 'Zone protejate']
        ],
        'occupancy' => [
            'name' => 'Certificat de Urbanism',
            'authority' => 'Primărie',
            'typical_duration' => '30 zile',
            'validity' => '24 luni',
            'required_for' => ['Informare urbanism', 'Pregătire AC']
        ]
    ];

    // Permit statuses
    private array $statuses = [
        'required' => 'Necesar',
        'preparing' => 'În Pregătire',
        'submitted' => 'Depus',
        'under_review' => 'În Analiză',
        'additional_info' => 'Necesită Completări',
        'approved' => 'Aprobat',
        'rejected' => 'Respins',
        'expired' => 'Expirat',
        'not_required' => 'Nu e Necesar'
    ];

    // Inspection types
    private array $inspectionTypes = [
        'foundation' => 'Recepție Fundație',
        'structure' => 'Recepție Structură',
        'roof' => 'Recepție Acoperiș',
        'electrical' => 'Verificare Instalație Electrică',
        'plumbing' => 'Verificare Instalații Sanitare',
        'gas' => 'Verificare Instalație Gaze',
        'fire' => 'Verificare PSI',
        'final' => 'Recepție Finală',
        'partial' => 'Recepție Parțială'
    ];

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): PermitManagementService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getPermitTypes(): array {
        return $this->permitTypes;
    }

    public function getStatuses(): array {
        return $this->statuses;
    }

    public function getInspectionTypes(): array {
        return $this->inspectionTypes;
    }

    /**
     * Create permit record
     */
    public function createPermit(string $companyId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO project_permits
            (company_id, project_id, permit_type, permit_number, status,
             authority, application_date, approval_date, expiry_date,
             fee_amount, fee_paid, document_path, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'required', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            RETURNING *
        ");

        $feePaid = isset($data['fee_paid']) && $data['fee_paid'] ? 'true' : 'false';

        $stmt->execute([
            $companyId,
            $data['project_id'],
            $data['permit_type'],
            $data['permit_number'] ?? null,
            $data['authority'] ?? $this->permitTypes[$data['permit_type']]['authority'] ?? null,
            $data['application_date'] ?? null,
            $data['approval_date'] ?? null,
            $data['expiry_date'] ?? null,
            isset($data['fee_amount']) ? floatval($data['fee_amount']) : null,
            $feePaid,
            $data['document_path'] ?? null,
            $data['notes'] ?? null
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get permit by ID
     */
    public function getPermit(string $companyId, string $permitId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT pp.*, p.name as project_name
            FROM project_permits pp
            LEFT JOIN construction_projects p ON pp.project_id = p.id
            WHERE pp.id = ? AND pp.company_id = ?
        ");
        $stmt->execute([$permitId, $companyId]);
        $permit = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($permit) {
            // Get inspections for this permit
            $stmt2 = $this->pdo->prepare("
                SELECT * FROM permit_inspections WHERE permit_id = ? ORDER BY scheduled_date
            ");
            $stmt2->execute([$permitId]);
            $permit['inspections'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        }

        return $permit ?: null;
    }

    /**
     * List permits
     */
    public function listPermits(string $companyId, array $filters = []): array {
        $sql = "
            SELECT pp.*, p.name as project_name,
                   CASE
                       WHEN pp.expiry_date IS NOT NULL AND pp.expiry_date < CURRENT_DATE THEN 'expired'
                       WHEN pp.expiry_date IS NOT NULL AND pp.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
                       ELSE pp.status
                   END as current_status
            FROM project_permits pp
            LEFT JOIN construction_projects p ON pp.project_id = p.id
            WHERE pp.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['project_id'])) {
            $sql .= " AND pp.project_id = ?";
            $params[] = $filters['project_id'];
        }

        if (!empty($filters['permit_type'])) {
            $sql .= " AND pp.permit_type = ?";
            $params[] = $filters['permit_type'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND pp.status = ?";
            $params[] = $filters['status'];
        }

        $sql .= " ORDER BY pp.created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update permit
     */
    public function updatePermit(string $companyId, string $permitId, array $data): ?array {
        $stmt = $this->pdo->prepare("
            UPDATE project_permits SET
                permit_number = COALESCE(?, permit_number),
                status = COALESCE(?, status),
                authority = COALESCE(?, authority),
                application_date = COALESCE(?, application_date),
                approval_date = COALESCE(?, approval_date),
                expiry_date = COALESCE(?, expiry_date),
                fee_amount = COALESCE(?, fee_amount),
                fee_paid = COALESCE(?, fee_paid),
                document_path = COALESCE(?, document_path),
                notes = COALESCE(?, notes),
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
            RETURNING *
        ");

        $feePaid = null;
        if (isset($data['fee_paid'])) {
            $feePaid = $data['fee_paid'] ? 'true' : 'false';
        }

        $stmt->execute([
            $data['permit_number'] ?? null,
            $data['status'] ?? null,
            $data['authority'] ?? null,
            $data['application_date'] ?? null,
            $data['approval_date'] ?? null,
            $data['expiry_date'] ?? null,
            isset($data['fee_amount']) ? floatval($data['fee_amount']) : null,
            $feePaid,
            $data['document_path'] ?? null,
            $data['notes'] ?? null,
            $permitId,
            $companyId
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Schedule inspection
     */
    public function scheduleInspection(string $permitId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO permit_inspections
            (permit_id, inspection_type, scheduled_date, scheduled_time, inspector_name,
             inspector_phone, location_notes, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())
            RETURNING *
        ");

        $stmt->execute([
            $permitId,
            $data['inspection_type'],
            $data['scheduled_date'],
            $data['scheduled_time'] ?? null,
            $data['inspector_name'] ?? null,
            $data['inspector_phone'] ?? null,
            $data['location_notes'] ?? null
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Record inspection result
     */
    public function recordInspectionResult(string $inspectionId, array $data): array {
        $stmt = $this->pdo->prepare("
            UPDATE permit_inspections SET
                status = ?,
                result = ?,
                result_date = COALESCE(?, CURRENT_DATE),
                result_notes = ?,
                deficiencies = ?,
                follow_up_required = ?,
                follow_up_date = ?,
                document_path = ?
            WHERE id = ?
            RETURNING *
        ");

        $followUpRequired = isset($data['follow_up_required']) && $data['follow_up_required'] ? 'true' : 'false';

        $stmt->execute([
            $data['passed'] ? 'passed' : 'failed',
            $data['passed'] ? 'approved' : 'rejected',
            $data['result_date'] ?? null,
            $data['result_notes'] ?? null,
            $data['deficiencies'] ?? null,
            $followUpRequired,
            $data['follow_up_date'] ?? null,
            $data['document_path'] ?? null,
            $inspectionId
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get project permit checklist
     */
    public function getProjectPermitChecklist(string $companyId, string $projectId): array {
        // Get project details to determine required permits
        $stmt = $this->pdo->prepare("SELECT * FROM construction_projects WHERE id = ?");
        $stmt->execute([$projectId]);
        $project = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get existing permits for project
        $stmt2 = $this->pdo->prepare("
            SELECT permit_type, status, approval_date, expiry_date
            FROM project_permits
            WHERE project_id = ?
        ");
        $stmt2->execute([$projectId]);
        $existingPermits = [];
        foreach ($stmt2->fetchAll(PDO::FETCH_ASSOC) as $p) {
            $existingPermits[$p['permit_type']] = $p;
        }

        // Build checklist
        $checklist = [];
        $recommendedPermits = ['occupancy', 'construction', 'electrical'];

        foreach ($recommendedPermits as $permitType) {
            $existing = $existingPermits[$permitType] ?? null;
            $typeInfo = $this->permitTypes[$permitType];

            $checklist[] = [
                'permit_type' => $permitType,
                'name' => $typeInfo['name'],
                'authority' => $typeInfo['authority'],
                'required' => true,
                'status' => $existing['status'] ?? 'required',
                'approval_date' => $existing['approval_date'] ?? null,
                'expiry_date' => $existing['expiry_date'] ?? null,
                'has_permit' => $existing !== null
            ];
        }

        return $checklist;
    }

    /**
     * Get upcoming inspections
     */
    public function getUpcomingInspections(string $companyId, int $daysAhead = 14): array {
        $stmt = $this->pdo->prepare("
            SELECT pi.*, pp.permit_type, pp.permit_number, p.name as project_name
            FROM permit_inspections pi
            JOIN project_permits pp ON pi.permit_id = pp.id
            JOIN construction_projects p ON pp.project_id = p.id
            WHERE pp.company_id = ?
              AND pi.status = 'scheduled'
              AND pi.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * ?
            ORDER BY pi.scheduled_date, pi.scheduled_time
        ");
        $stmt->execute([$companyId, $daysAhead]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get expiring permits
     */
    public function getExpiringPermits(string $companyId, int $daysAhead = 30): array {
        $stmt = $this->pdo->prepare("
            SELECT pp.*, p.name as project_name,
                   pp.expiry_date - CURRENT_DATE as days_until_expiry
            FROM project_permits pp
            JOIN construction_projects p ON pp.project_id = p.id
            WHERE pp.company_id = ?
              AND pp.status = 'approved'
              AND pp.expiry_date IS NOT NULL
              AND pp.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * ?
            ORDER BY pp.expiry_date
        ");
        $stmt->execute([$companyId, $daysAhead]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get permit status summary
     */
    public function getPermitSummary(string $companyId): array {
        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(*) as total_permits,
                COUNT(CASE WHEN status = 'approved' AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE) THEN 1 END) as approved,
                COUNT(CASE WHEN status IN ('submitted', 'under_review', 'additional_info') THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'required' OR status = 'preparing' THEN 1 END) as not_submitted,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN status = 'approved' AND expiry_date < CURRENT_DATE THEN 1 END) as expired
            FROM project_permits
            WHERE company_id = ?
        ");
        $stmt->execute([$companyId]);
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        // By type
        $stmt2 = $this->pdo->prepare("
            SELECT permit_type, COUNT(*) as count,
                   COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
            FROM project_permits
            WHERE company_id = ?
            GROUP BY permit_type
        ");
        $stmt2->execute([$companyId]);
        $byType = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        // Upcoming inspections
        $upcomingInspections = count($this->getUpcomingInspections($companyId, 7));

        // Expiring soon
        $expiringSoon = count($this->getExpiringPermits($companyId, 30));

        return [
            'summary' => $summary,
            'by_type' => $byType,
            'upcoming_inspections' => $upcomingInspections,
            'expiring_soon' => $expiringSoon,
            'alerts' => $upcomingInspections + $expiringSoon + intval($summary['not_submitted'])
        ];
    }
}
