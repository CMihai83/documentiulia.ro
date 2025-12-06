<?php
/**
 * Romanian Supplier Database Service
 * E2-US05: Pre-populated Romanian supplier database
 *
 * Features:
 * - Major Romanian suppliers (Dedeman, Hornbach, etc.)
 * - Supplier categories
 * - Price tracking per supplier
 * - Integration with material calculations
 * - User can add custom suppliers
 */

require_once __DIR__ . '/../config/database.php';

class RomanianSupplierService {
    private static ?RomanianSupplierService $instance = null;
    private PDO $pdo;

    // Pre-populated Romanian suppliers
    private array $defaultSuppliers = [
        // Construction & DIY
        [
            'name' => 'Dedeman',
            'category' => 'construction',
            'subcategory' => 'DIY & Construction',
            'website' => 'https://www.dedeman.ro',
            'cui' => 'RO7605940',
            'description' => 'Cel mai mare retailer de bricolaj din România',
            'tags' => ['bricolaj', 'constructii', 'materiale', 'unelte', 'gradina']
        ],
        [
            'name' => 'Hornbach',
            'category' => 'construction',
            'subcategory' => 'DIY & Construction',
            'website' => 'https://www.hornbach.ro',
            'cui' => 'RO18339291',
            'description' => 'Retailer german de bricolaj și grădinărit',
            'tags' => ['bricolaj', 'constructii', 'gradina', 'amenajari']
        ],
        [
            'name' => 'Leroy Merlin',
            'category' => 'construction',
            'subcategory' => 'DIY & Construction',
            'website' => 'https://www.leroymerlin.ro',
            'cui' => 'RO16687480',
            'description' => 'Retailer francez de bricolaj',
            'tags' => ['bricolaj', 'decoratiuni', 'gradina']
        ],
        [
            'name' => 'Brico Depot',
            'category' => 'construction',
            'subcategory' => 'DIY & Construction',
            'website' => 'https://www.bricodepot.ro',
            'cui' => 'RO17215498',
            'description' => 'Bricolaj la prețuri mici',
            'tags' => ['bricolaj', 'constructii', 'discount']
        ],
        [
            'name' => 'MatHaus',
            'category' => 'construction',
            'subcategory' => 'Construction Materials',
            'website' => 'https://www.mathaus.ro',
            'cui' => 'RO7531367',
            'description' => 'Materiale de construcții și finisaje',
            'tags' => ['constructii', 'finisaje', 'ceramica']
        ],

        // Electrical
        [
            'name' => 'Elbi Electric',
            'category' => 'electrical',
            'subcategory' => 'Electrical Supplies',
            'website' => 'https://www.elbielectric.ro',
            'cui' => 'RO6734910',
            'description' => 'Distribuitor de materiale electrice',
            'tags' => ['electrice', 'cabluri', 'tablouri']
        ],
        [
            'name' => 'Volta',
            'category' => 'electrical',
            'subcategory' => 'Electrical Supplies',
            'website' => 'https://www.volta.ro',
            'cui' => 'RO8123456',
            'description' => 'Produse electrice și automatizări',
            'tags' => ['electrice', 'automatizari', 'iluminat']
        ],
        [
            'name' => 'ABB Romania',
            'category' => 'electrical',
            'subcategory' => 'Industrial Electrical',
            'website' => 'https://www.abb.com/ro',
            'cui' => 'RO1573697',
            'description' => 'Tehnologie pentru energie și automatizare',
            'tags' => ['industrial', 'automatizari', 'energie']
        ],
        [
            'name' => 'Schneider Electric Romania',
            'category' => 'electrical',
            'subcategory' => 'Industrial Electrical',
            'website' => 'https://www.se.com/ro',
            'cui' => 'RO1588925',
            'description' => 'Soluții digitale de energie și automatizare',
            'tags' => ['automatizari', 'energie', 'smart']
        ],

        // Plumbing & HVAC
        [
            'name' => 'Romstal',
            'category' => 'plumbing',
            'subcategory' => 'Plumbing & HVAC',
            'website' => 'https://www.romstal.ro',
            'cui' => 'RO6681820',
            'description' => 'Instalații sanitare și termice',
            'tags' => ['sanitare', 'termice', 'incalzire', 'apa']
        ],
        [
            'name' => 'Daikin Romania',
            'category' => 'plumbing',
            'subcategory' => 'HVAC',
            'website' => 'https://www.daikin.ro',
            'cui' => 'RO14823185',
            'description' => 'Aer condiționat și pompe de căldură',
            'tags' => ['climatizare', 'incalzire', 'pompe caldura']
        ],
        [
            'name' => 'Viessmann Romania',
            'category' => 'plumbing',
            'subcategory' => 'Heating',
            'website' => 'https://www.viessmann.ro',
            'cui' => 'RO15249330',
            'description' => 'Sisteme de încălzire și energie regenerabilă',
            'tags' => ['centrale', 'incalzire', 'solar']
        ],

        // Tools & Equipment
        [
            'name' => 'Stanley Black & Decker',
            'category' => 'tools',
            'subcategory' => 'Power Tools',
            'website' => 'https://www.stanleytools.ro',
            'cui' => 'RO17231890',
            'description' => 'Unelte electrice și manuale',
            'tags' => ['unelte', 'electrice', 'profesionale']
        ],
        [
            'name' => 'Bosch Romania',
            'category' => 'tools',
            'subcategory' => 'Power Tools',
            'website' => 'https://www.bosch-professional.ro',
            'cui' => 'RO1568290',
            'description' => 'Unelte profesionale Bosch',
            'tags' => ['unelte', 'electrice', 'profesionale']
        ],
        [
            'name' => 'Makita Romania',
            'category' => 'tools',
            'subcategory' => 'Power Tools',
            'website' => 'https://www.makita.ro',
            'cui' => 'RO18234567',
            'description' => 'Unelte electrice profesionale',
            'tags' => ['unelte', 'electrice', 'acumulatori']
        ],

        // Office Supplies
        [
            'name' => 'Office Direct',
            'category' => 'office',
            'subcategory' => 'Office Supplies',
            'website' => 'https://www.officedirect.ro',
            'cui' => 'RO12345678',
            'description' => 'Consumabile și echipamente birou',
            'tags' => ['birou', 'papetarie', 'IT']
        ],
        [
            'name' => 'Staples Romania',
            'category' => 'office',
            'subcategory' => 'Office Supplies',
            'website' => 'https://www.staples.ro',
            'cui' => 'RO16789012',
            'description' => 'Produse pentru birou',
            'tags' => ['birou', 'papetarie', 'mobila']
        ],

        // Automotive
        [
            'name' => 'Autonet',
            'category' => 'automotive',
            'subcategory' => 'Auto Parts',
            'website' => 'https://www.autonet.ro',
            'cui' => 'RO13456789',
            'description' => 'Piese auto și accesorii',
            'tags' => ['auto', 'piese', 'accesorii']
        ],
        [
            'name' => 'EuroAuto',
            'category' => 'automotive',
            'subcategory' => 'Auto Parts',
            'website' => 'https://www.euroauto.ro',
            'cui' => 'RO14567890',
            'description' => 'Piese auto originale și aftermarket',
            'tags' => ['auto', 'piese', 'originale']
        ],

        // Food & Beverage (for restaurants/catering)
        [
            'name' => 'Metro Cash & Carry',
            'category' => 'food',
            'subcategory' => 'Wholesale Food',
            'website' => 'https://www.metro.ro',
            'cui' => 'RO7254217',
            'description' => 'Angro pentru HoReCa și business',
            'tags' => ['alimentar', 'horeca', 'angro']
        ],
        [
            'name' => 'Selgros',
            'category' => 'food',
            'subcategory' => 'Wholesale Food',
            'website' => 'https://www.selgros.ro',
            'cui' => 'RO2762828',
            'description' => 'Cash & Carry pentru profesioniști',
            'tags' => ['alimentar', 'horeca', 'angro']
        ],

        // IT & Electronics
        [
            'name' => 'PCGarage',
            'category' => 'it',
            'subcategory' => 'IT Equipment',
            'website' => 'https://www.pcgarage.ro',
            'cui' => 'RO15827083',
            'description' => 'Echipamente IT și electronice',
            'tags' => ['IT', 'calculatoare', 'componente']
        ],
        [
            'name' => 'Emag',
            'category' => 'it',
            'subcategory' => 'Electronics',
            'website' => 'https://www.emag.ro',
            'cui' => 'RO14399840',
            'description' => 'Cel mai mare retailer online din România',
            'tags' => ['IT', 'electronice', 'electrocasnice']
        ],
        [
            'name' => 'Altex',
            'category' => 'it',
            'subcategory' => 'Electronics',
            'website' => 'https://www.altex.ro',
            'cui' => 'RO3332568',
            'description' => 'Electronice și electrocasnice',
            'tags' => ['electronice', 'electrocasnice', 'IT']
        ]
    ];

    // Supplier categories
    private array $categories = [
        'construction' => ['name' => 'Construcții', 'icon' => 'building'],
        'electrical' => ['name' => 'Materiale Electrice', 'icon' => 'bolt'],
        'plumbing' => ['name' => 'Instalații', 'icon' => 'water'],
        'tools' => ['name' => 'Unelte', 'icon' => 'wrench'],
        'office' => ['name' => 'Birou', 'icon' => 'briefcase'],
        'automotive' => ['name' => 'Auto', 'icon' => 'car'],
        'food' => ['name' => 'Alimentar', 'icon' => 'utensils'],
        'it' => ['name' => 'IT & Electronice', 'icon' => 'laptop'],
        'other' => ['name' => 'Altele', 'icon' => 'box']
    ];

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): RomanianSupplierService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get all categories
     */
    public function getCategories(): array {
        return array_map(function($key, $cat) {
            return [
                'key' => $key,
                'name' => $cat['name'],
                'icon' => $cat['icon']
            ];
        }, array_keys($this->categories), array_values($this->categories));
    }

    /**
     * Get default suppliers (pre-populated)
     */
    public function getDefaultSuppliers(?string $category = null): array {
        $suppliers = $this->defaultSuppliers;

        if ($category) {
            $suppliers = array_filter($suppliers, fn($s) => $s['category'] === $category);
        }

        return array_values($suppliers);
    }

    /**
     * Get company suppliers (custom + default)
     */
    public function getCompanySuppliers(string $companyId, array $filters = []): array {
        $sql = "
            SELECT s.*,
                   0 as purchase_count,
                   0 as total_purchased,
                   NULL as last_purchase
            FROM suppliers s
            WHERE s.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['category'])) {
            $sql .= " AND s.category = ?";
            $params[] = $filters['category'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (s.name ILIKE ? OR s.cui ILIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
        }

        if (isset($filters['is_default'])) {
            $sql .= " AND s.is_default = ?";
            $params[] = $filters['is_default'];
        }

        $sql .= " ORDER BY s.name";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Add custom supplier
     */
    public function addSupplier(string $companyId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO suppliers
            (company_id, name, category, subcategory, website, cui, phone, email,
             address, description, tags, is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false, NOW(), NOW())
            RETURNING *
        ");

        $stmt->execute([
            $companyId,
            $data['name'],
            $data['category'] ?? 'other',
            $data['subcategory'] ?? null,
            $data['website'] ?? null,
            $data['cui'] ?? null,
            $data['phone'] ?? null,
            $data['email'] ?? null,
            $data['address'] ?? null,
            $data['description'] ?? null,
            json_encode($data['tags'] ?? [])
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Update supplier
     */
    public function updateSupplier(string $companyId, string $supplierId, array $data): ?array {
        $stmt = $this->pdo->prepare("
            UPDATE suppliers SET
                name = COALESCE(?, name),
                category = COALESCE(?, category),
                subcategory = COALESCE(?, subcategory),
                website = COALESCE(?, website),
                cui = COALESCE(?, cui),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email),
                address = COALESCE(?, address),
                description = COALESCE(?, description),
                tags = COALESCE(?, tags),
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
            RETURNING *
        ");

        $stmt->execute([
            $data['name'] ?? null,
            $data['category'] ?? null,
            $data['subcategory'] ?? null,
            $data['website'] ?? null,
            $data['cui'] ?? null,
            $data['phone'] ?? null,
            $data['email'] ?? null,
            $data['address'] ?? null,
            $data['description'] ?? null,
            isset($data['tags']) ? json_encode($data['tags']) : null,
            $supplierId,
            $companyId
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Delete supplier
     */
    public function deleteSupplier(string $companyId, string $supplierId): bool {
        $stmt = $this->pdo->prepare("
            DELETE FROM suppliers
            WHERE id = ? AND company_id = ? AND is_default = false
        ");
        $stmt->execute([$supplierId, $companyId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Import default suppliers to company
     */
    public function importDefaultSuppliers(string $companyId, ?string $category = null): int {
        $suppliers = $this->getDefaultSuppliers($category);
        $imported = 0;

        $stmt = $this->pdo->prepare("
            INSERT INTO suppliers
            (company_id, name, category, subcategory, website, cui, description, tags, is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())
            ON CONFLICT (company_id, cui) DO NOTHING
        ");

        foreach ($suppliers as $supplier) {
            $result = $stmt->execute([
                $companyId,
                $supplier['name'],
                $supplier['category'],
                $supplier['subcategory'],
                $supplier['website'],
                $supplier['cui'],
                $supplier['description'],
                json_encode($supplier['tags'])
            ]);
            if ($result && $stmt->rowCount() > 0) {
                $imported++;
            }
        }

        return $imported;
    }

    /**
     * Track product price from supplier
     */
    public function trackPrice(string $companyId, string $supplierId, array $priceData): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO supplier_prices
            (company_id, supplier_id, product_name, product_code, unit, price, currency,
             valid_from, valid_until, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            RETURNING *
        ");

        $stmt->execute([
            $companyId,
            $supplierId,
            $priceData['product_name'],
            $priceData['product_code'] ?? null,
            $priceData['unit'] ?? 'buc',
            $priceData['price'],
            $priceData['currency'] ?? 'RON',
            $priceData['valid_from'] ?? date('Y-m-d'),
            $priceData['valid_until'] ?? null,
            $priceData['notes'] ?? null
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get prices for a product across suppliers
     */
    public function comparePrices(string $companyId, string $productName): array {
        $stmt = $this->pdo->prepare("
            SELECT sp.*, s.name as supplier_name
            FROM supplier_prices sp
            JOIN suppliers s ON sp.supplier_id = s.id
            WHERE sp.company_id = ?
              AND sp.product_name ILIKE ?
              AND (sp.valid_until IS NULL OR sp.valid_until >= CURRENT_DATE)
            ORDER BY sp.price ASC
        ");

        $stmt->execute([$companyId, '%' . $productName . '%']);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get price history for a product at a supplier
     */
    public function getPriceHistory(string $companyId, string $supplierId, string $productName): array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_prices
            WHERE company_id = ?
              AND supplier_id = ?
              AND product_name ILIKE ?
            ORDER BY valid_from DESC
            LIMIT 50
        ");

        $stmt->execute([$companyId, $supplierId, '%' . $productName . '%']);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Search suppliers by name or CUI
     */
    public function searchSuppliers(string $companyId, string $query): array {
        // First search company suppliers
        $stmt = $this->pdo->prepare("
            SELECT * FROM suppliers
            WHERE company_id = ?
              AND (name ILIKE ? OR cui ILIKE ? OR description ILIKE ?)
            ORDER BY name
            LIMIT 20
        ");

        $search = '%' . $query . '%';
        $stmt->execute([$companyId, $search, $search, $search]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Also search default suppliers not yet imported
        $defaults = array_filter($this->defaultSuppliers, function($s) use ($query) {
            return stripos($s['name'], $query) !== false ||
                   stripos($s['cui'], $query) !== false ||
                   stripos($s['description'], $query) !== false;
        });

        return [
            'company_suppliers' => $results,
            'available_defaults' => array_values($defaults)
        ];
    }

    /**
     * Get supplier statistics
     */
    public function getSupplierStats(string $companyId, string $supplierId): array {
        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(DISTINCT p.id) as total_purchases,
                SUM(p.total) as total_amount,
                AVG(p.total) as avg_purchase,
                MIN(p.created_at) as first_purchase,
                MAX(p.created_at) as last_purchase,
                COUNT(DISTINCT DATE_TRUNC('month', p.created_at)) as active_months
            FROM purchases p
            WHERE p.company_id = ? AND p.supplier_id = ?
        ");

        $stmt->execute([$companyId, $supplierId]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get top products
        $stmt = $this->pdo->prepare("
            SELECT
                pi.description as product,
                SUM(pi.quantity) as total_quantity,
                SUM(pi.total) as total_spent,
                COUNT(*) as purchase_count
            FROM purchase_items pi
            JOIN purchases p ON pi.purchase_id = p.id
            WHERE p.company_id = ? AND p.supplier_id = ?
            GROUP BY pi.description
            ORDER BY total_spent DESC
            LIMIT 10
        ");

        $stmt->execute([$companyId, $supplierId]);
        $topProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'summary' => $stats,
            'top_products' => $topProducts
        ];
    }
}
