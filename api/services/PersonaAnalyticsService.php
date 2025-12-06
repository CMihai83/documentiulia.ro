<?php
/**
 * Persona Analytics Service
 * E1-US06: Track persona adoption and feature usage
 */

class PersonaAnalyticsService
{
    private static ?PersonaAnalyticsService $instance = null;
    private PDO $db;

    private function __construct()
    {
        require_once __DIR__ . '/../config/Database.php';
        $this->db = Database::getInstance()->getConnection();
    }

    public static function getInstance(): PersonaAnalyticsService
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Record persona selection event
     */
    public function recordPersonaSelection(
        string $companyId,
        string $userId,
        string $personaId,
        ?string $previousPersonaId = null,
        string $source = 'settings'
    ): bool {
        $stmt = $this->db->prepare("
            INSERT INTO persona_selection_events (company_id, user_id, persona_id, previous_persona_id, source)
            VALUES (:company_id, :user_id, :persona_id, :previous_persona_id, :source)
        ");
        return $stmt->execute([
            ':company_id' => $companyId,
            ':user_id' => $userId,
            ':persona_id' => $personaId,
            ':previous_persona_id' => $previousPersonaId,
            ':source' => $source
        ]);
    }

    /**
     * Record feature usage
     */
    public function recordFeatureUsage(
        string $companyId,
        string $userId,
        string $personaId,
        string $featureKey,
        string $action = 'view',
        array $metadata = []
    ): bool {
        $stmt = $this->db->prepare("
            SELECT record_feature_usage(:company_id, :user_id, :persona_id, :feature_key, :action, :metadata::jsonb)
        ");
        return $stmt->execute([
            ':company_id' => $companyId,
            ':user_id' => $userId,
            ':persona_id' => $personaId,
            ':feature_key' => $featureKey,
            ':action' => $action,
            ':metadata' => json_encode($metadata)
        ]);
    }

    /**
     * Get persona adoption stats
     */
    public function getPersonaAdoptionStats(): array
    {
        $stmt = $this->db->query("
            SELECT
                bp.id as persona_id,
                bp.name_en as persona_name,
                bp.icon,
                COALESCE(pas.total_companies, 0) as total_companies,
                COALESCE(pas.new_this_week, 0) as new_this_week,
                COALESCE(pas.new_this_month, 0) as new_this_month
            FROM business_personas bp
            LEFT JOIN v_persona_adoption_stats pas ON bp.id = pas.persona_id
            ORDER BY COALESCE(pas.total_companies, 0) DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get feature usage by persona
     */
    public function getFeatureUsageByPersona(?string $personaId = null, int $days = 30): array
    {
        $sql = "
            SELECT
                persona_id,
                feature_key,
                total_usage,
                unique_users,
                unique_companies,
                last_used
            FROM v_feature_usage_by_persona
        ";

        if ($personaId) {
            $sql .= " WHERE persona_id = :persona_id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':persona_id' => $personaId]);
        } else {
            $stmt = $this->db->query($sql);
        }

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get unused features by persona
     */
    public function getUnusedFeatures(?string $personaId = null): array
    {
        $sql = "
            SELECT persona_id, persona_name, feature_key, enabled
            FROM v_unused_features_by_persona
        ";

        if ($personaId) {
            $sql .= " WHERE persona_id = :persona_id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':persona_id' => $personaId]);
        } else {
            $stmt = $this->db->query($sql);
        }

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get daily analytics for a date range
     */
    public function getDailyAnalytics(string $startDate, string $endDate, ?string $personaId = null): array
    {
        $sql = "
            SELECT
                date,
                persona_id,
                total_companies,
                new_selections,
                active_users,
                feature_usage
            FROM persona_analytics_daily
            WHERE date BETWEEN :start_date AND :end_date
        ";

        $params = [':start_date' => $startDate, ':end_date' => $endDate];

        if ($personaId) {
            $sql .= " AND persona_id = :persona_id";
            $params[':persona_id'] = $personaId;
        }

        $sql .= " ORDER BY date, persona_id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Parse JSON feature_usage
        foreach ($results as &$row) {
            $row['feature_usage'] = json_decode($row['feature_usage'] ?? '{}', true);
        }

        return $results;
    }

    /**
     * Get feature stats for a persona
     */
    public function getFeatureStats(string $personaId): array
    {
        $stmt = $this->db->prepare("
            SELECT
                feature_key,
                usage_count,
                unique_users,
                last_used_at,
                first_used_at
            FROM persona_feature_stats
            WHERE persona_id = :persona_id
            ORDER BY usage_count DESC
        ");
        $stmt->execute([':persona_id' => $personaId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get dashboard summary for admin
     */
    public function getDashboardSummary(): array
    {
        // Total companies by persona
        $stmt = $this->db->query("
            SELECT
                cps.persona_id,
                bp.name_en as persona_name,
                bp.icon,
                COUNT(*) as company_count
            FROM company_persona_settings cps
            JOIN business_personas bp ON cps.persona_id = bp.id
            GROUP BY cps.persona_id, bp.name_en, bp.icon
            ORDER BY company_count DESC
        ");
        $personaDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Recent selections (last 7 days)
        $stmt = $this->db->query("
            SELECT
                persona_id,
                COUNT(*) as selection_count,
                COUNT(DISTINCT company_id) as unique_companies
            FROM persona_selection_events
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY persona_id
        ");
        $recentSelections = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Top features (last 30 days)
        $stmt = $this->db->query("
            SELECT
                feature_key,
                COUNT(*) as usage_count,
                COUNT(DISTINCT user_id) as unique_users
            FROM feature_usage_events
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY feature_key
            ORDER BY usage_count DESC
            LIMIT 10
        ");
        $topFeatures = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Active users (last 7 days)
        $stmt = $this->db->query("
            SELECT COUNT(DISTINCT user_id) as active_users
            FROM feature_usage_events
            WHERE created_at >= NOW() - INTERVAL '7 days'
        ");
        $activeUsers = $stmt->fetch(PDO::FETCH_ASSOC)['active_users'] ?? 0;

        return [
            'persona_distribution' => $personaDistribution,
            'recent_selections' => $recentSelections,
            'top_features' => $topFeatures,
            'active_users_7d' => (int)$activeUsers,
            'generated_at' => date('c')
        ];
    }

    /**
     * Export analytics data as CSV-ready array
     */
    public function exportAnalytics(string $type, array $filters = []): array
    {
        switch ($type) {
            case 'persona_adoption':
                return $this->getPersonaAdoptionStats();

            case 'feature_usage':
                return $this->getFeatureUsageByPersona($filters['persona_id'] ?? null);

            case 'unused_features':
                return $this->getUnusedFeatures($filters['persona_id'] ?? null);

            case 'daily_analytics':
                $startDate = $filters['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
                $endDate = $filters['end_date'] ?? date('Y-m-d');
                return $this->getDailyAnalytics($startDate, $endDate, $filters['persona_id'] ?? null);

            default:
                throw new Exception("Unknown export type: $type");
        }
    }

    /**
     * Run daily aggregation (called by cron)
     */
    public function runDailyAggregation(): bool
    {
        $stmt = $this->db->query("SELECT aggregate_persona_analytics_daily()");
        return true;
    }

    /**
     * Get persona change history for a company
     */
    public function getCompanyPersonaHistory(string $companyId): array
    {
        $stmt = $this->db->prepare("
            SELECT
                pse.persona_id,
                pse.previous_persona_id,
                pse.source,
                pse.created_at,
                bp.name_en as persona_name
            FROM persona_selection_events pse
            JOIN business_personas bp ON pse.persona_id = bp.id
            WHERE pse.company_id = :company_id
            ORDER BY pse.created_at DESC
        ");
        $stmt->execute([':company_id' => $companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
