<?php
/**
 * Dashboard Service
 * Manages adaptive dashboard layouts based on persona
 */

class DashboardService
{
    private static ?DashboardService $instance = null;
    private PDO $db;
    private ?FeatureToggleService $featureService = null;

    private function __construct()
    {
        require_once __DIR__ . '/../config/Database.php';
        $this->db = Database::getInstance()->getConnection();
    }

    public static function getInstance(): DashboardService
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get feature toggle service (lazy load)
     */
    private function getFeatureService(): FeatureToggleService
    {
        if ($this->featureService === null) {
            require_once __DIR__ . '/FeatureToggleService.php';
            $this->featureService = FeatureToggleService::getInstance();
        }
        return $this->featureService;
    }

    /**
     * Get dashboard layout for a user
     * Returns user's custom layout or persona default
     */
    public function getLayout(string $userId, string $companyId, string $language = 'en'): array
    {
        // First check for user's custom layout
        $customLayout = $this->getUserLayout($userId, $companyId);

        if ($customLayout) {
            return $this->enrichLayout($customLayout, $companyId, $language);
        }

        // Fall back to persona default
        $personaId = $this->getCompanyPersona($companyId);
        $defaultLayout = $this->getPersonaDefaultLayout($personaId);

        if ($defaultLayout) {
            return $this->enrichLayout($defaultLayout, $companyId, $language);
        }

        // Ultimate fallback: generic layout
        return $this->getGenericLayout($companyId, $language);
    }

    /**
     * Get user's custom layout
     */
    private function getUserLayout(string $userId, string $companyId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT widgets
            FROM user_dashboard_layouts
            WHERE user_id = :user_id AND company_id = :company_id AND is_active = true
            LIMIT 1
        ");
        $stmt->execute([':user_id' => $userId, ':company_id' => $companyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? json_decode($row['widgets'], true) : null;
    }

    /**
     * Get persona default layout from persona_dashboard_widgets table
     */
    private function getPersonaDefaultLayout(string $personaId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT
                widget_type as widget_id,
                grid_position
            FROM persona_dashboard_widgets
            WHERE persona_id = :persona_id AND is_default = true
            ORDER BY display_order
        ");
        $stmt->execute([':persona_id' => $personaId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) {
            return null;
        }

        // Convert to widget layout format
        $widgets = [];
        foreach ($rows as $row) {
            $position = json_decode($row['grid_position'], true);
            $widgets[] = [
                'widget_id' => $row['widget_id'],
                'x' => $position['x'] ?? 0,
                'y' => $position['y'] ?? 0,
                'w' => $position['w'] ?? 4,
                'h' => $position['h'] ?? 2
            ];
        }

        return $widgets;
    }

    /**
     * Get company's persona
     */
    private function getCompanyPersona(string $companyId): string
    {
        $stmt = $this->db->prepare("
            SELECT COALESCE(cps.persona_id, 'freelancer') as persona_id
            FROM companies c
            LEFT JOIN company_persona_settings cps ON c.id = cps.company_id
            WHERE c.id = :company_id
        ");
        $stmt->execute([':company_id' => $companyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row['persona_id'] ?? 'freelancer';
    }

    /**
     * Enrich layout with widget details and filter by access
     */
    private function enrichLayout(array $widgets, string $companyId, string $language): array
    {
        $enriched = [];

        foreach ($widgets as $widget) {
            $widgetId = $widget['widget_id'];
            $details = $this->getWidgetDetails($widgetId, $language);

            if (!$details) {
                continue;
            }

            // Check if widget is accessible
            if (!$this->isWidgetAccessible($details, $companyId)) {
                continue;
            }

            $enriched[] = array_merge($widget, [
                'name' => $details['name'],
                'description' => $details['description'],
                'category' => $details['category'],
                'component_name' => $details['component_name'],
                'data_source' => $details['data_source'],
                'refresh_interval' => $details['refresh_interval'],
                'min_width' => $details['min_width'],
                'min_height' => $details['min_height'],
                'max_width' => $details['max_width'],
                'max_height' => $details['max_height'],
                'is_resizable' => $details['is_resizable'],
                'is_removable' => $details['is_removable']
            ]);
        }

        return $enriched;
    }

    /**
     * Get widget details from registry
     */
    private function getWidgetDetails(string $widgetId, string $language): ?array
    {
        $nameCol = $language === 'ro' ? 'name_ro' : 'name_en';
        $descCol = $language === 'ro' ? 'description_ro' : 'description_en';

        $stmt = $this->db->prepare("
            SELECT
                id,
                $nameCol as name,
                $descCol as description,
                category,
                component_name,
                data_source,
                refresh_interval,
                min_width,
                min_height,
                max_width,
                max_height,
                is_resizable,
                is_removable,
                required_feature,
                required_tier,
                enabled_for_personas
            FROM widget_registry
            WHERE id = :id
        ");
        $stmt->execute([':id' => $widgetId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $row['enabled_for_personas'] = json_decode($row['enabled_for_personas'], true) ?? [];
        }

        return $row ?: null;
    }

    /**
     * Check if widget is accessible for company
     */
    private function isWidgetAccessible(array $widget, string $companyId): bool
    {
        // Check required feature
        if (!empty($widget['required_feature'])) {
            if (!$this->getFeatureService()->isEnabled($widget['required_feature'], $companyId)) {
                return false;
            }
        }

        // Check persona restriction
        $enabledPersonas = $widget['enabled_for_personas'] ?? [];
        if (!empty($enabledPersonas)) {
            $companyPersona = $this->getCompanyPersona($companyId);
            if (!in_array($companyPersona, $enabledPersonas)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get generic fallback layout
     */
    private function getGenericLayout(string $companyId, string $language): array
    {
        $defaultWidgets = [
            ['widget_id' => 'kpi_summary', 'x' => 0, 'y' => 0, 'w' => 12, 'h' => 2],
            ['widget_id' => 'revenue_chart', 'x' => 0, 'y' => 2, 'w' => 6, 'h' => 4],
            ['widget_id' => 'expense_chart', 'x' => 6, 'y' => 2, 'w' => 6, 'h' => 4],
            ['widget_id' => 'outstanding_invoices', 'x' => 0, 'y' => 6, 'w' => 4, 'h' => 3],
            ['widget_id' => 'quick_actions', 'x' => 4, 'y' => 6, 'w' => 4, 'h' => 2],
            ['widget_id' => 'recent_activity', 'x' => 8, 'y' => 6, 'w' => 4, 'h' => 4]
        ];

        return $this->enrichLayout($defaultWidgets, $companyId, $language);
    }

    /**
     * Get all available widgets for a company
     */
    public function getAvailableWidgets(string $companyId, string $language = 'en'): array
    {
        $nameCol = $language === 'ro' ? 'name_ro' : 'name_en';
        $descCol = $language === 'ro' ? 'description_ro' : 'description_en';

        $stmt = $this->db->prepare("
            SELECT
                id,
                $nameCol as name,
                $descCol as description,
                category,
                component_name,
                default_width,
                default_height,
                data_source,
                required_feature,
                required_tier,
                enabled_for_personas
            FROM widget_registry
            ORDER BY category, name
        ");
        $stmt->execute();
        $widgets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $available = [];
        foreach ($widgets as $widget) {
            $widget['enabled_for_personas'] = json_decode($widget['enabled_for_personas'], true) ?? [];

            if ($this->isWidgetAccessible($widget, $companyId)) {
                $available[] = $widget;
            }
        }

        return $available;
    }

    /**
     * Save user's custom layout
     */
    public function saveLayout(string $userId, string $companyId, array $widgets): bool
    {
        $stmt = $this->db->prepare("
            INSERT INTO user_dashboard_layouts (user_id, company_id, widgets, is_active)
            VALUES (:user_id, :company_id, :widgets, true)
            ON CONFLICT (user_id, company_id, layout_name) DO UPDATE SET
                widgets = :widgets,
                updated_at = NOW()
        ");

        return $stmt->execute([
            ':user_id' => $userId,
            ':company_id' => $companyId,
            ':widgets' => json_encode($widgets)
        ]);
    }

    /**
     * Reset user layout to persona default
     */
    public function resetToDefault(string $userId, string $companyId): bool
    {
        $stmt = $this->db->prepare("
            DELETE FROM user_dashboard_layouts
            WHERE user_id = :user_id AND company_id = :company_id
        ");

        return $stmt->execute([
            ':user_id' => $userId,
            ':company_id' => $companyId
        ]);
    }
}
