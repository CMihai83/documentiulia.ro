<?php
/**
 * ANRE Certification Tracking Service
 * E3-US07: Track electrical certifications and compliance
 *
 * Features:
 * - ANRE grade tracking (A, B, C, D)
 * - Expiry date alerts
 * - Renewal process guidance
 * - Certification document storage
 * - Employee certification matrix
 */

require_once __DIR__ . '/../config/database.php';

class ANRECertificationService {
    private static ?ANRECertificationService $instance = null;
    private PDO $pdo;

    // ANRE certification grades
    private array $grades = [
        'A' => [
            'name' => 'Gradul A - Executant',
            'description' => 'Execută lucrări de instalații electrice sub supraveghere',
            'max_voltage' => '1kV',
            'requirements' => ['Studii medii electrice', 'Experiență 1 an']
        ],
        'B' => [
            'name' => 'Gradul B - Verificator',
            'description' => 'Verifică și recepționează lucrări de instalații electrice',
            'max_voltage' => '1kV',
            'requirements' => ['Studii superioare electrice', 'Experiență 3 ani', 'Gradul A anterior']
        ],
        'C' => [
            'name' => 'Gradul C - Proiectant',
            'description' => 'Proiectează instalații electrice',
            'max_voltage' => '1kV',
            'requirements' => ['Studii superioare electrice', 'Experiență 5 ani', 'Gradul B anterior']
        ],
        'D' => [
            'name' => 'Gradul D - Expert',
            'description' => 'Expert tehnic în instalații electrice',
            'max_voltage' => 'Nelimitat',
            'requirements' => ['Studii superioare electrice', 'Experiență 10 ani', 'Gradul C anterior']
        ],
        'PRAM' => [
            'name' => 'PRAM - Proiectant Rețele',
            'description' => 'Proiectare rețele electrice de medie și joasă tensiune',
            'max_voltage' => '20kV',
            'requirements' => ['Studii superioare electrice', 'Experiență în rețele']
        ],
        'EEJT' => [
            'name' => 'EEJT - Executant Exterior JT',
            'description' => 'Execută lucrări pe rețele de joasă tensiune',
            'max_voltage' => '1kV exterior',
            'requirements' => ['Calificare electrician', 'Atestat SSM']
        ]
    ];

    // Certification types
    private array $certificationTypes = [
        'anre' => 'Atestat ANRE',
        'ssm' => 'Atestat SSM Electrician',
        'iscir' => 'Autorizație ISCIR',
        'medical' => 'Fișa Aptitudine Medicală',
        'first_aid' => 'Curs Prim Ajutor',
        'heights' => 'Autorizație Lucru la Înălțime',
        'confined' => 'Autorizație Spații Înguste'
    ];

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): ANRECertificationService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getGrades(): array {
        return $this->grades;
    }

    public function getCertificationTypes(): array {
        return $this->certificationTypes;
    }

    /**
     * Add certification to employee
     */
    public function addCertification(string $companyId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO employee_certifications
            (company_id, employee_id, certification_type, grade, certificate_number,
             issue_date, expiry_date, issuing_authority, document_path, notes, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
            RETURNING *
        ");

        $stmt->execute([
            $companyId,
            $data['employee_id'],
            $data['certification_type'],
            $data['grade'] ?? null,
            $data['certificate_number'] ?? null,
            $data['issue_date'],
            $data['expiry_date'] ?? null,
            $data['issuing_authority'] ?? 'ANRE',
            $data['document_path'] ?? null,
            $data['notes'] ?? null
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get certification by ID
     */
    public function getCertification(string $companyId, string $certId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT ec.*, w.name as employee_name
            FROM employee_certifications ec
            LEFT JOIN crew_workers w ON ec.employee_id = w.id
            WHERE ec.id = ? AND ec.company_id = ?
        ");
        $stmt->execute([$certId, $companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * List certifications
     */
    public function listCertifications(string $companyId, array $filters = []): array {
        $sql = "
            SELECT ec.*, w.name as employee_name,
                   CASE
                       WHEN ec.expiry_date IS NULL THEN 'permanent'
                       WHEN ec.expiry_date < CURRENT_DATE THEN 'expired'
                       WHEN ec.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
                       ELSE 'valid'
                   END as validity_status
            FROM employee_certifications ec
            LEFT JOIN crew_workers w ON ec.employee_id = w.id
            WHERE ec.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['employee_id'])) {
            $sql .= " AND ec.employee_id = ?";
            $params[] = $filters['employee_id'];
        }

        if (!empty($filters['certification_type'])) {
            $sql .= " AND ec.certification_type = ?";
            $params[] = $filters['certification_type'];
        }

        if (!empty($filters['grade'])) {
            $sql .= " AND ec.grade = ?";
            $params[] = $filters['grade'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND ec.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['expiring_within_days'])) {
            $sql .= " AND ec.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '? days'";
            $params[] = intval($filters['expiring_within_days']);
        }

        $sql .= " ORDER BY ec.expiry_date ASC NULLS LAST";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update certification
     */
    public function updateCertification(string $companyId, string $certId, array $data): ?array {
        $stmt = $this->pdo->prepare("
            UPDATE employee_certifications SET
                certification_type = COALESCE(?, certification_type),
                grade = COALESCE(?, grade),
                certificate_number = COALESCE(?, certificate_number),
                issue_date = COALESCE(?, issue_date),
                expiry_date = COALESCE(?, expiry_date),
                issuing_authority = COALESCE(?, issuing_authority),
                document_path = COALESCE(?, document_path),
                notes = COALESCE(?, notes),
                status = COALESCE(?, status),
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
            RETURNING *
        ");

        $stmt->execute([
            $data['certification_type'] ?? null,
            $data['grade'] ?? null,
            $data['certificate_number'] ?? null,
            $data['issue_date'] ?? null,
            $data['expiry_date'] ?? null,
            $data['issuing_authority'] ?? null,
            $data['document_path'] ?? null,
            $data['notes'] ?? null,
            $data['status'] ?? null,
            $certId,
            $companyId
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get expiring certifications
     */
    public function getExpiringCertifications(string $companyId, int $daysAhead = 30): array {
        $stmt = $this->pdo->prepare("
            SELECT ec.*, w.name as employee_name, w.phone as employee_phone,
                   ec.expiry_date - CURRENT_DATE as days_until_expiry
            FROM employee_certifications ec
            JOIN crew_workers w ON ec.employee_id = w.id
            WHERE ec.company_id = ?
              AND ec.status = 'active'
              AND ec.expiry_date IS NOT NULL
              AND ec.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * ?
            ORDER BY ec.expiry_date ASC
        ");
        $stmt->execute([$companyId, $daysAhead]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get expired certifications
     */
    public function getExpiredCertifications(string $companyId): array {
        $stmt = $this->pdo->prepare("
            SELECT ec.*, w.name as employee_name,
                   CURRENT_DATE - ec.expiry_date as days_expired
            FROM employee_certifications ec
            JOIN crew_workers w ON ec.employee_id = w.id
            WHERE ec.company_id = ?
              AND ec.status = 'active'
              AND ec.expiry_date IS NOT NULL
              AND ec.expiry_date < CURRENT_DATE
            ORDER BY ec.expiry_date ASC
        ");
        $stmt->execute([$companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get employee certification matrix
     */
    public function getCertificationMatrix(string $companyId): array {
        $stmt = $this->pdo->prepare("
            SELECT
                w.id as employee_id,
                w.name as employee_name,
                w.trade,
                ec.certification_type,
                ec.grade,
                ec.expiry_date,
                CASE
                    WHEN ec.expiry_date IS NULL THEN 'permanent'
                    WHEN ec.expiry_date < CURRENT_DATE THEN 'expired'
                    WHEN ec.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
                    ELSE 'valid'
                END as status
            FROM crew_workers w
            LEFT JOIN employee_certifications ec ON w.id = ec.employee_id AND ec.status = 'active'
            WHERE w.company_id = ?
              AND w.status = 'active'
              AND w.trade IN ('electrician', 'general')
            ORDER BY w.name, ec.certification_type
        ");
        $stmt->execute([$companyId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Pivot to matrix format
        $matrix = [];
        foreach ($rows as $row) {
            $empId = $row['employee_id'];
            if (!isset($matrix[$empId])) {
                $matrix[$empId] = [
                    'employee_id' => $empId,
                    'employee_name' => $row['employee_name'],
                    'trade' => $row['trade'],
                    'certifications' => []
                ];
            }
            if ($row['certification_type']) {
                $matrix[$empId]['certifications'][$row['certification_type']] = [
                    'grade' => $row['grade'],
                    'expiry_date' => $row['expiry_date'],
                    'status' => $row['status']
                ];
            }
        }

        return array_values($matrix);
    }

    /**
     * Get renewal guidance
     */
    public function getRenewalGuidance(string $certificationType, ?string $grade = null): array {
        $guidance = [
            'anre' => [
                'authority' => 'ANRE - Autoritatea Națională de Reglementare în Energie',
                'website' => 'https://www.anre.ro',
                'validity' => '5 ani',
                'renewal_steps' => [
                    'Completați cererea de reînnoire (Formular tip)',
                    'Atașați certificatul existent (copie)',
                    'Dovada activității în domeniu (minim 2 ani)',
                    'Certificat medical de aptitudine',
                    'Achitați taxa de reînnoire',
                    'Depuneți dosarul online sau la sediul ANRE'
                ],
                'documents_required' => [
                    'Cerere tip ANRE',
                    'Copie CI/BI',
                    'Copie certificat existent',
                    'Adeverință de la angajator',
                    'Certificat medical',
                    'Dovada plății taxei'
                ],
                'fees' => [
                    'A' => '200 RON',
                    'B' => '300 RON',
                    'C' => '400 RON',
                    'D' => '500 RON'
                ],
                'processing_time' => '30-45 zile'
            ],
            'ssm' => [
                'authority' => 'Furnizor autorizat SSM',
                'validity' => '2 ani',
                'renewal_steps' => [
                    'Participare la curs de reautorizare',
                    'Susținere examen',
                    'Eliberare certificat nou'
                ],
                'documents_required' => [
                    'Certificat SSM existent',
                    'CI/BI'
                ],
                'processing_time' => '1-2 zile (după curs)'
            ],
            'medical' => [
                'authority' => 'Medicina Muncii',
                'validity' => '1 an',
                'renewal_steps' => [
                    'Programare la cabinetul de medicina muncii',
                    'Examen medical complet',
                    'Eliberare fișă de aptitudine'
                ],
                'processing_time' => '1 zi'
            ]
        ];

        return $guidance[$certificationType] ?? [
            'message' => 'Contact ANRE pentru detalii specifice'
        ];
    }

    /**
     * Get compliance summary
     */
    public function getComplianceSummary(string $companyId): array {
        // Total employees requiring certifications
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as total_electricians
            FROM crew_workers
            WHERE company_id = ? AND status = 'active' AND trade = 'electrician'
        ");
        $stmt->execute([$companyId]);
        $totalElectricians = $stmt->fetchColumn();

        // Employees with valid ANRE
        $stmt2 = $this->pdo->prepare("
            SELECT COUNT(DISTINCT employee_id) as with_valid_anre
            FROM employee_certifications
            WHERE company_id = ?
              AND certification_type = 'anre'
              AND status = 'active'
              AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
        ");
        $stmt2->execute([$companyId]);
        $withValidAnre = $stmt2->fetchColumn();

        // Expiring within 30 days
        $expiringCount = count($this->getExpiringCertifications($companyId, 30));

        // Expired count
        $expiredCount = count($this->getExpiredCertifications($companyId));

        // By grade breakdown
        $stmt3 = $this->pdo->prepare("
            SELECT grade, COUNT(*) as count
            FROM employee_certifications
            WHERE company_id = ?
              AND certification_type = 'anre'
              AND status = 'active'
              AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
            GROUP BY grade
        ");
        $stmt3->execute([$companyId]);
        $byGrade = $stmt3->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total_electricians' => intval($totalElectricians),
            'with_valid_anre' => intval($withValidAnre),
            'compliance_rate' => $totalElectricians > 0
                ? round(($withValidAnre / $totalElectricians) * 100, 1)
                : 100,
            'expiring_soon' => $expiringCount,
            'expired' => $expiredCount,
            'by_grade' => $byGrade,
            'alerts' => $expiringCount + $expiredCount
        ];
    }
}
