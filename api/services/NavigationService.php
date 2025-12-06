<?php
/**
 * Navigation Service
 * Manages persona-specific navigation with favorites and recent items
 */

class NavigationService
{
    private static ?NavigationService $instance = null;
    private PDO $db;
    private ?FeatureToggleService $featureService = null;

    private function __construct()
    {
        require_once __DIR__ . '/../config/Database.php';
        $this->db = Database::getInstance()->getConnection();
    }

    public static function getInstance(): NavigationService
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function getFeatureService(): FeatureToggleService
    {
        if ($this->featureService === null) {
            require_once __DIR__ . '/FeatureToggleService.php';
            $this->featureService = FeatureToggleService::getInstance();
        }
        return $this->featureService;
    }

    /**
     * Get navigation for a user/company
     * Returns items filtered by persona and feature access
     */
    public function getNavigation(string $userId, string $companyId, string $language = 'en'): array
    {
        $personaId = $this->getCompanyPersona($companyId);

        // Get all items
        $items = $this->getNavigationItems($companyId, $personaId, $language);

        // Get favorites
        $favorites = $this->getFavorites($userId, $companyId, $language);

        // Get recent
        $recent = $this->getRecentItems($userId, $companyId, $language);

        // Build tree structure
        $tree = $this->buildTree($items);

        return [
            'main' => $tree,
            'favorites' => $favorites,
            'recent' => $recent,
            'persona_id' => $personaId
        ];
    }

    /**
     * Get navigation items filtered for company
     */
    private function getNavigationItems(string $companyId, string $personaId, string $language): array
    {
        $nameCol = $language === 'ro' ? 'name_ro' : 'name_en';

        $stmt = $this->db->prepare("
            SELECT
                id,
                $nameCol as name,
                icon,
                href,
                parent_id,
                sort_order,
                is_section,
                badge_source,
                required_feature,
                required_tier,
                enabled_for_personas
            FROM navigation_items
            WHERE is_active = true
            ORDER BY sort_order, name
        ");
        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Filter by persona and feature access
        $filtered = [];
        foreach ($items as $item) {
            if (!$this->isItemAccessible($item, $companyId, $personaId)) {
                continue;
            }

            // Clean up the item
            unset($item['enabled_for_personas'], $item['required_feature'], $item['required_tier']);
            $filtered[] = $item;
        }

        return $filtered;
    }

    /**
     * Check if navigation item is accessible
     */
    private function isItemAccessible(array $item, string $companyId, string $personaId): bool
    {
        // Check persona restriction
        $enabledPersonas = json_decode($item['enabled_for_personas'] ?? '[]', true);
        if (!empty($enabledPersonas) && !in_array($personaId, $enabledPersonas)) {
            return false;
        }

        // Check feature requirement
        if (!empty($item['required_feature'])) {
            if (!$this->getFeatureService()->isEnabled($item['required_feature'], $companyId)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Build tree structure from flat items
     */
    private function buildTree(array $items): array
    {
        $itemsById = [];
        foreach ($items as $item) {
            $item['children'] = [];
            $itemsById[$item['id']] = $item;
        }

        $tree = [];
        foreach ($itemsById as $id => $item) {
            if ($item['parent_id'] && isset($itemsById[$item['parent_id']])) {
                $itemsById[$item['parent_id']]['children'][] = &$itemsById[$id];
            } else if (!$item['parent_id']) {
                $tree[] = &$itemsById[$id];
            }
        }

        // Sort tree by sort_order
        usort($tree, fn($a, $b) => $a['sort_order'] <=> $b['sort_order']);

        return $tree;
    }

    /**
     * Get user favorites
     */
    public function getFavorites(string $userId, string $companyId, string $language = 'en'): array
    {
        $nameCol = $language === 'ro' ? 'name_ro' : 'name_en';

        $stmt = $this->db->prepare("
            SELECT
                ni.id,
                ni.$nameCol as name,
                ni.icon,
                ni.href,
                f.sort_order
            FROM user_navigation_favorites f
            JOIN navigation_items ni ON f.item_id = ni.id
            WHERE f.user_id = :user_id AND f.company_id = :company_id
            ORDER BY f.sort_order, ni.$nameCol
        ");
        $stmt->execute([':user_id' => $userId, ':company_id' => $companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Add item to favorites
     */
    public function addFavorite(string $userId, string $companyId, string $itemId): bool
    {
        // Get max sort order
        $stmt = $this->db->prepare("
            SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order
            FROM user_navigation_favorites
            WHERE user_id = :user_id AND company_id = :company_id
        ");
        $stmt->execute([':user_id' => $userId, ':company_id' => $companyId]);
        $nextOrder = $stmt->fetch(PDO::FETCH_ASSOC)['next_order'];

        $stmt = $this->db->prepare("
            INSERT INTO user_navigation_favorites (user_id, company_id, item_id, sort_order)
            VALUES (:user_id, :company_id, :item_id, :sort_order)
            ON CONFLICT (user_id, company_id, item_id) DO NOTHING
        ");
        return $stmt->execute([
            ':user_id' => $userId,
            ':company_id' => $companyId,
            ':item_id' => $itemId,
            ':sort_order' => $nextOrder
        ]);
    }

    /**
     * Remove item from favorites
     */
    public function removeFavorite(string $userId, string $companyId, string $itemId): bool
    {
        $stmt = $this->db->prepare("
            DELETE FROM user_navigation_favorites
            WHERE user_id = :user_id AND company_id = :company_id AND item_id = :item_id
        ");
        return $stmt->execute([
            ':user_id' => $userId,
            ':company_id' => $companyId,
            ':item_id' => $itemId
        ]);
    }

    /**
     * Get recent items
     */
    public function getRecentItems(string $userId, string $companyId, string $language = 'en', int $limit = 5): array
    {
        $nameCol = $language === 'ro' ? 'name_ro' : 'name_en';

        $stmt = $this->db->prepare("
            SELECT
                ni.id,
                ni.$nameCol as name,
                ni.icon,
                ni.href,
                r.visited_at
            FROM user_navigation_recent r
            JOIN navigation_items ni ON r.item_id = ni.id
            WHERE r.user_id = :user_id AND r.company_id = :company_id
            ORDER BY r.visited_at DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':user_id', $userId);
        $stmt->bindValue(':company_id', $companyId);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record item visit
     */
    public function recordVisit(string $userId, string $companyId, string $itemId): bool
    {
        $stmt = $this->db->prepare("
            INSERT INTO user_navigation_recent (user_id, company_id, item_id, visited_at)
            VALUES (:user_id, :company_id, :item_id, NOW())
            ON CONFLICT (user_id, company_id, item_id) DO UPDATE SET
                visited_at = NOW()
        ");
        return $stmt->execute([
            ':user_id' => $userId,
            ':company_id' => $companyId,
            ':item_id' => $itemId
        ]);
    }

    /**
     * Search navigation items
     */
    public function search(string $query, string $companyId, string $language = 'en'): array
    {
        $nameCol = $language === 'ro' ? 'name_ro' : 'name_en';
        $personaId = $this->getCompanyPersona($companyId);

        $stmt = $this->db->prepare("
            SELECT
                id,
                $nameCol as name,
                icon,
                href,
                parent_id,
                enabled_for_personas,
                required_feature
            FROM navigation_items
            WHERE is_active = true
              AND (LOWER($nameCol) LIKE LOWER(:query) OR LOWER(href) LIKE LOWER(:query))
            ORDER BY $nameCol
            LIMIT 10
        ");
        $stmt->execute([':query' => '%' . $query . '%']);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Filter by access
        return array_filter($items, fn($item) => $this->isItemAccessible($item, $companyId, $personaId));
    }

    /**
     * Get company persona
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
}
