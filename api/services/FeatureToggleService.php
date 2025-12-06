<?php
/**
 * Feature Toggle Service
 * Manages feature access based on persona and subscription tier
 */

class FeatureToggleService
{
    private static ?FeatureToggleService $instance = null;
    private PDO $db;
    private array $featureCache = [];
    private array $companyCache = [];

    // Subscription tier hierarchy
    private array $tierHierarchy = [
        'free' => 0,
        'starter' => 1,
        'professional' => 2,
        'business' => 3,
        'enterprise' => 4
    ];

    private function __construct()
    {
        require_once __DIR__ . '/../config/Database.php';
        $this->db = Database::getInstance()->getConnection();
    }

    public static function getInstance(): FeatureToggleService
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Check if a feature is enabled for a company
     */
    public function isEnabled(string $featureId, string $companyId): bool
    {
        $access = $this->getFeatureAccess($featureId, $companyId);
        return $access['enabled'];
    }

    /**
     * Get detailed feature access info
     */
    public function getFeatureAccess(string $featureId, string $companyId): array
    {
        // Get company context
        $company = $this->getCompanyContext($companyId);
        if (!$company) {
            return [
                'enabled' => false,
                'reason' => 'company_not_found',
                'feature_id' => $featureId
            ];
        }

        // Get feature details
        $feature = $this->getFeature($featureId);
        if (!$feature) {
            return [
                'enabled' => false,
                'reason' => 'feature_not_found',
                'feature_id' => $featureId
            ];
        }

        // Check if feature is globally active
        if (!$feature['is_active']) {
            return [
                'enabled' => false,
                'reason' => 'feature_disabled',
                'feature_id' => $featureId,
                'feature_name' => $feature['name']
            ];
        }

        // Check tier requirement
        $companyTier = $company['subscription_tier'] ?? 'free';
        $requiredTier = $feature['required_tier'] ?? 'free';

        if ($this->tierHierarchy[$companyTier] < $this->tierHierarchy[$requiredTier]) {
            return [
                'enabled' => false,
                'reason' => 'tier_required',
                'feature_id' => $featureId,
                'feature_name' => $feature['name'],
                'required_tier' => $requiredTier,
                'current_tier' => $companyTier,
                'upgrade_url' => '/settings/subscription'
            ];
        }

        // Check persona access
        $enabledPersonas = $feature['enabled_for_personas'] ?? [];
        $companyPersona = $company['persona_id'];

        // Empty array means available to all personas
        if (!empty($enabledPersonas) && !in_array($companyPersona, $enabledPersonas)) {
            return [
                'enabled' => false,
                'reason' => 'persona_restricted',
                'feature_id' => $featureId,
                'feature_name' => $feature['name'],
                'enabled_personas' => $enabledPersonas,
                'current_persona' => $companyPersona
            ];
        }

        // Check custom company overrides
        $override = $this->getCompanyOverride($companyId, $featureId);
        if ($override !== null) {
            return [
                'enabled' => $override,
                'reason' => $override ? 'company_override_enabled' : 'company_override_disabled',
                'feature_id' => $featureId,
                'feature_name' => $feature['name']
            ];
        }

        // Feature is enabled
        return [
            'enabled' => true,
            'reason' => 'allowed',
            'feature_id' => $featureId,
            'feature_name' => $feature['name'],
            'category' => $feature['category'],
            'is_beta' => $feature['is_beta'] ?? false,
            'requires_setup' => $feature['requires_setup'] ?? false
        ];
    }

    /**
     * Get all features for a company with access status
     */
    public function getAllFeaturesForCompany(string $companyId): array
    {
        $company = $this->getCompanyContext($companyId);
        if (!$company) {
            return [];
        }

        // Get all active features
        $stmt = $this->db->prepare("
            SELECT *
            FROM feature_toggles
            WHERE is_active = true
            ORDER BY category, name
        ");
        $stmt->execute();
        $features = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [];
        foreach ($features as $feature) {
            $access = $this->getFeatureAccess($feature['id'], $companyId);
            $result[] = array_merge($feature, [
                'access' => $access
            ]);
        }

        return $result;
    }

    /**
     * Get features grouped by category
     */
    public function getFeaturesByCategory(string $companyId): array
    {
        $features = $this->getAllFeaturesForCompany($companyId);

        $grouped = [];
        foreach ($features as $feature) {
            $category = $feature['category'] ?? 'other';
            if (!isset($grouped[$category])) {
                $grouped[$category] = [
                    'category' => $category,
                    'features' => []
                ];
            }
            $grouped[$category]['features'][] = $feature;
        }

        return array_values($grouped);
    }

    /**
     * Get enabled features for a company (for UI rendering)
     */
    public function getEnabledFeatures(string $companyId): array
    {
        $features = $this->getAllFeaturesForCompany($companyId);
        return array_filter($features, fn($f) => $f['access']['enabled']);
    }

    /**
     * Get feature by ID
     */
    private function getFeature(string $featureId): ?array
    {
        if (isset($this->featureCache[$featureId])) {
            return $this->featureCache[$featureId];
        }

        $stmt = $this->db->prepare("
            SELECT *
            FROM feature_toggles
            WHERE id = :id
        ");
        $stmt->execute([':id' => $featureId]);
        $feature = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($feature) {
            $feature['enabled_for_personas'] = json_decode($feature['enabled_for_personas'] ?? '[]', true);
            $this->featureCache[$featureId] = $feature;
        }

        return $feature ?: null;
    }

    /**
     * Get company context (persona, tier, etc.)
     */
    private function getCompanyContext(string $companyId): ?array
    {
        if (isset($this->companyCache[$companyId])) {
            return $this->companyCache[$companyId];
        }

        $stmt = $this->db->prepare("
            SELECT
                c.id,
                c.name,
                COALESCE(c.subscription_tier, 'free') as subscription_tier,
                COALESCE(cps.persona_id, 'freelancer') as persona_id
            FROM companies c
            LEFT JOIN company_persona_settings cps ON c.id = cps.company_id
            WHERE c.id = :id
        ");
        $stmt->execute([':id' => $companyId]);
        $company = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($company) {
            $this->companyCache[$companyId] = $company;
        }

        return $company ?: null;
    }

    /**
     * Get company-specific feature override
     */
    private function getCompanyOverride(string $companyId, string $featureId): ?bool
    {
        $stmt = $this->db->prepare("
            SELECT is_enabled
            FROM company_feature_overrides
            WHERE company_id = :company_id AND feature_id = :feature_id
        ");
        $stmt->execute([
            ':company_id' => $companyId,
            ':feature_id' => $featureId
        ]);
        $override = $stmt->fetch(PDO::FETCH_ASSOC);

        return $override ? (bool)$override['is_enabled'] : null;
    }

    /**
     * Set company-specific feature override (admin function)
     */
    public function setCompanyOverride(string $companyId, string $featureId, bool $enabled): void
    {
        $stmt = $this->db->prepare("
            INSERT INTO company_feature_overrides (company_id, feature_id, is_enabled)
            VALUES (:company_id, :feature_id, :enabled)
            ON CONFLICT (company_id, feature_id) DO UPDATE SET
                is_enabled = :enabled,
                updated_at = NOW()
        ");
        $stmt->execute([
            ':company_id' => $companyId,
            ':feature_id' => $featureId,
            ':enabled' => $enabled
        ]);

        // Clear cache
        unset($this->companyCache[$companyId]);
    }

    /**
     * Remove company-specific override
     */
    public function removeCompanyOverride(string $companyId, string $featureId): void
    {
        $stmt = $this->db->prepare("
            DELETE FROM company_feature_overrides
            WHERE company_id = :company_id AND feature_id = :feature_id
        ");
        $stmt->execute([
            ':company_id' => $companyId,
            ':feature_id' => $featureId
        ]);

        // Clear cache
        unset($this->companyCache[$companyId]);
    }

    /**
     * Clear all caches
     */
    public function clearCache(): void
    {
        $this->featureCache = [];
        $this->companyCache = [];
    }
}
