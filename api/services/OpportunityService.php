<?php

class OpportunityService {
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
     * List opportunities with optional filters
     */
    public function listOpportunities($companyId, $filters = []) {
        $sql = "SELECT
                    o.*,
                    c.display_name as contact_name,
                    u.first_name || ' ' || u.last_name as assigned_to_name
                FROM opportunities o
                LEFT JOIN contacts c ON o.contact_id = c.id
                LEFT JOIN users u ON o.assigned_to = u.id
                WHERE o.company_id = :company_id";

        $params = ['company_id' => $companyId];

        // Apply filters
        if (!empty($filters['stage'])) {
            $sql .= " AND o.stage = :stage";
            $params['stage'] = $filters['stage'];
        }

        if (!empty($filters['contact_id'])) {
            $sql .= " AND o.contact_id = :contact_id";
            $params['contact_id'] = $filters['contact_id'];
        }

        if (!empty($filters['assigned_to'])) {
            $sql .= " AND o.assigned_to = :assigned_to";
            $params['assigned_to'] = $filters['assigned_to'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (o.name ILIKE :search OR o.description ILIKE :search)";
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $sql .= " ORDER BY o.created_at DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get single opportunity by ID
     */
    public function getOpportunity($companyId, $opportunityId) {
        $sql = "SELECT
                    o.*,
                    c.display_name as contact_name,
                    c.email as contact_email,
                    c.phone as contact_phone,
                    u.first_name || ' ' || u.last_name as assigned_to_name
                FROM opportunities o
                LEFT JOIN contacts c ON o.contact_id = c.id
                LEFT JOIN users u ON o.assigned_to = u.id
                WHERE o.id = :opportunity_id AND o.company_id = :company_id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'opportunity_id' => $opportunityId,
            'company_id' => $companyId
        ]);

        $opportunity = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$opportunity) {
            throw new Exception('Opportunity not found');
        }

        // Get activities for this opportunity
        $opportunity['activities'] = $this->getOpportunityActivities($opportunityId);

        return $opportunity;
    }

    /**
     * Create new opportunity
     */
    public function createOpportunity($companyId, $data) {
        $sql = "INSERT INTO opportunities (
                    company_id, contact_id, name, description, amount, currency,
                    probability, expected_close_date, stage, assigned_to, source, campaign
                ) VALUES (
                    :company_id, :contact_id, :name, :description, :amount, :currency,
                    :probability, :expected_close_date, :stage, :assigned_to, :source, :campaign
                ) RETURNING id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_id' => $companyId,
            'contact_id' => $data['contact_id'] ?? null,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'amount' => $data['amount'] ?? 0,
            'currency' => $data['currency'] ?? 'RON',
            'probability' => $data['probability'] ?? 50,
            'expected_close_date' => $data['expected_close_date'] ?? null,
            'stage' => $data['stage'] ?? 'lead',
            'assigned_to' => $data['assigned_to'] ?? null,
            'source' => $data['source'] ?? null,
            'campaign' => $data['campaign'] ?? null
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['id'];
    }

    /**
     * Update opportunity
     */
    public function updateOpportunity($companyId, $opportunityId, $data) {
        // Check if stage is being changed
        $oldStage = null;
        if (isset($data['stage'])) {
            $stmt = $this->conn->prepare("SELECT stage FROM opportunities WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $opportunityId, 'company_id' => $companyId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($result) {
                $oldStage = $result['stage'];
            }
        }

        $fields = [];
        $params = ['opportunity_id' => $opportunityId, 'company_id' => $companyId];

        $allowedFields = [
            'contact_id', 'name', 'description', 'amount', 'currency',
            'probability', 'expected_close_date', 'stage', 'assigned_to',
            'loss_reason', 'loss_notes', 'source', 'campaign'
        ];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }

        if (empty($fields)) {
            throw new Exception('No fields to update');
        }

        // If stage is changing, update stage_changed_at and possibly closed_at
        if (isset($data['stage']) && $oldStage !== $data['stage']) {
            $fields[] = "stage_changed_at = NOW()";
            if (in_array($data['stage'], ['won', 'lost'])) {
                $fields[] = "closed_at = NOW()";
            }
        }

        $sql = "UPDATE opportunities SET " . implode(', ', $fields) .
               " WHERE id = :opportunity_id AND company_id = :company_id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount() > 0;
    }

    /**
     * Delete opportunity (soft delete by moving to 'lost' stage)
     */
    public function deleteOpportunity($companyId, $opportunityId) {
        $sql = "UPDATE opportunities
                SET stage = 'lost',
                    closed_at = NOW(),
                    loss_reason = 'deleted'
                WHERE id = :opportunity_id AND company_id = :company_id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'opportunity_id' => $opportunityId,
            'company_id' => $companyId
        ]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Get pipeline view (opportunities grouped by stage)
     */
    public function getPipeline($companyId) {
        $stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
        $pipeline = [];

        foreach ($stages as $stage) {
            $sql = "SELECT
                        o.*,
                        c.display_name as contact_name
                    FROM opportunities o
                    LEFT JOIN contacts c ON o.contact_id = c.id
                    WHERE o.company_id = :company_id AND o.stage = :stage
                    ORDER BY o.expected_close_date ASC NULLS LAST, o.created_at DESC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                'company_id' => $companyId,
                'stage' => $stage
            ]);

            $pipeline[$stage] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        return $pipeline;
    }

    /**
     * Add activity to opportunity
     */
    public function addActivity($opportunityId, $data) {
        $sql = "INSERT INTO opportunity_activities (
                    opportunity_id, user_id, activity_type, subject, description,
                    scheduled_at, completed_at, duration_minutes, outcome
                ) VALUES (
                    :opportunity_id, :user_id, :activity_type, :subject, :description,
                    :scheduled_at, :completed_at, :duration_minutes, :outcome
                ) RETURNING id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'opportunity_id' => $opportunityId,
            'user_id' => $data['user_id'] ?? null,
            'activity_type' => $data['activity_type'],
            'subject' => $data['subject'] ?? null,
            'description' => $data['description'] ?? null,
            'scheduled_at' => $data['scheduled_at'] ?? null,
            'completed_at' => $data['completed_at'] ?? null,
            'duration_minutes' => $data['duration_minutes'] ?? null,
            'outcome' => $data['outcome'] ?? null
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['id'];
    }

    /**
     * Get activities for opportunity
     */
    private function getOpportunityActivities($opportunityId) {
        $sql = "SELECT
                    a.*,
                    u.first_name || ' ' || u.last_name as user_name
                FROM opportunity_activities a
                LEFT JOIN users u ON a.user_id = u.id
                WHERE a.opportunity_id = :opportunity_id
                ORDER BY a.created_at DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute(['opportunity_id' => $opportunityId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
