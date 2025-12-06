<?php
/**
 * EU VAT Service
 * Handles EU VAT validation (VIES), rates, Intrastat, and OSS
 */

require_once __DIR__ . '/../config/Database.php';

class EUVATService {
    private static ?EUVATService $instance = null;
    private PDO $pdo;

    // VIES SOAP endpoint
    private string $viesWsdl = 'https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl';

    // EU member states
    private array $euCountries = [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
        'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
        'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
    ];

    private function __construct() {
        $database = Database::getInstance();
        $this->pdo = $database->getConnection();
    }

    public static function getInstance(): EUVATService {
        if (self::$instance === null) {
            self::$instance = new EUVATService();
        }
        return self::$instance;
    }

    /**
     * Validate VAT number via VIES
     */
    public function validateVAT(string $countryCode, string $vatNumber): array {
        $countryCode = strtoupper(trim($countryCode));
        $vatNumber = preg_replace('/[^A-Z0-9]/i', '', $vatNumber);

        // Remove country prefix if included in VAT number
        if (strpos($vatNumber, $countryCode) === 0) {
            $vatNumber = substr($vatNumber, strlen($countryCode));
        }

        if (!in_array($countryCode, $this->euCountries)) {
            throw new Exception("Invalid EU country code: $countryCode");
        }

        // Check cache first
        $cached = $this->getCachedValidation($countryCode, $vatNumber);
        if ($cached) {
            return $cached;
        }

        // Call VIES API
        try {
            $client = new SoapClient($this->viesWsdl, [
                'trace' => true,
                'exceptions' => true,
                'connection_timeout' => 10,
                'cache_wsdl' => WSDL_CACHE_BOTH
            ]);

            $response = $client->checkVat([
                'countryCode' => $countryCode,
                'vatNumber' => $vatNumber
            ]);

            $result = [
                'valid' => $response->valid,
                'country_code' => $countryCode,
                'vat_number' => $vatNumber,
                'full_vat_number' => $countryCode . $vatNumber,
                'company_name' => $response->name ?? null,
                'company_address' => $response->address ?? null,
                'request_date' => date('Y-m-d H:i:s'),
                'source' => 'VIES'
            ];

            // Cache the result
            $this->cacheValidation($countryCode, $vatNumber, $result);

            return $result;

        } catch (SoapFault $e) {
            // Handle VIES service errors
            $errorMsg = $e->getMessage();

            // Common VIES errors
            if (strpos($errorMsg, 'INVALID_INPUT') !== false) {
                throw new Exception("Invalid VAT number format for $countryCode");
            }
            if (strpos($errorMsg, 'SERVICE_UNAVAILABLE') !== false) {
                throw new Exception("VIES service temporarily unavailable, please try later");
            }
            if (strpos($errorMsg, 'MS_UNAVAILABLE') !== false) {
                throw new Exception("Member state $countryCode service unavailable");
            }
            if (strpos($errorMsg, 'TIMEOUT') !== false) {
                throw new Exception("VIES service timeout, please try later");
            }

            throw new Exception("VIES validation failed: $errorMsg");
        }
    }

    /**
     * Get cached validation result
     */
    private function getCachedValidation(string $countryCode, string $vatNumber): ?array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM vies_validation_cache
            WHERE country_code = ? AND vat_number = ?
            AND validated_at > NOW() - INTERVAL '24 hours'
        ");
        $stmt->execute([$countryCode, $vatNumber]);
        $cached = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($cached) {
            return [
                'valid' => $cached['is_valid'],
                'country_code' => $cached['country_code'],
                'vat_number' => $cached['vat_number'],
                'full_vat_number' => $cached['country_code'] . $cached['vat_number'],
                'company_name' => $cached['company_name'],
                'company_address' => $cached['company_address'],
                'request_date' => $cached['validated_at'],
                'source' => 'cache'
            ];
        }

        return null;
    }

    /**
     * Cache validation result
     */
    private function cacheValidation(string $countryCode, string $vatNumber, array $result): void {
        $stmt = $this->pdo->prepare("
            INSERT INTO vies_validation_cache
            (country_code, vat_number, is_valid, company_name, company_address, raw_response)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (country_code, vat_number) DO UPDATE SET
                is_valid = EXCLUDED.is_valid,
                company_name = EXCLUDED.company_name,
                company_address = EXCLUDED.company_address,
                raw_response = EXCLUDED.raw_response,
                validated_at = NOW()
        ");
        $stmt->execute([
            $countryCode,
            $vatNumber,
            $result['valid'],
            $result['company_name'],
            $result['company_address'],
            json_encode($result)
        ]);
    }

    /**
     * Get VAT rates for a country
     */
    public function getVATRates(?string $countryCode = null): array {
        if ($countryCode) {
            $countryCode = strtoupper(trim($countryCode));
            $stmt = $this->pdo->prepare("
                SELECT * FROM eu_vat_rates
                WHERE country_code = ? AND is_active = true
            ");
            $stmt->execute([$countryCode]);
            $rate = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$rate) {
                throw new Exception("VAT rates not found for country: $countryCode");
            }

            return $rate;
        }

        $stmt = $this->pdo->query("
            SELECT * FROM eu_vat_rates
            WHERE is_active = true
            ORDER BY country_name
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Calculate VAT amount
     */
    public function calculateVAT(
        float $amount,
        string $countryCode,
        string $rateType = 'standard',
        bool $priceIncludesVAT = false
    ): array {
        $rates = $this->getVATRates($countryCode);

        $rateField = match($rateType) {
            'standard' => 'standard_rate',
            'reduced' => 'reduced_rate',
            'reduced2' => 'reduced_rate_2',
            'super_reduced' => 'super_reduced_rate',
            'parking' => 'parking_rate',
            default => throw new Exception("Invalid rate type: $rateType")
        };

        $vatRate = $rates[$rateField];

        if ($vatRate === null) {
            throw new Exception("$rateType rate not available for $countryCode");
        }

        if ($priceIncludesVAT) {
            $netAmount = $amount / (1 + $vatRate / 100);
            $vatAmount = $amount - $netAmount;
        } else {
            $netAmount = $amount;
            $vatAmount = $amount * ($vatRate / 100);
        }

        return [
            'country_code' => $countryCode,
            'country_name' => $rates['country_name'],
            'rate_type' => $rateType,
            'vat_rate' => $vatRate,
            'net_amount' => round($netAmount, 2),
            'vat_amount' => round($vatAmount, 2),
            'gross_amount' => round($netAmount + $vatAmount, 2),
            'price_includes_vat' => $priceIncludesVAT
        ];
    }

    /**
     * Determine if reverse charge applies
     */
    public function checkReverseCharge(
        string $sellerCountry,
        string $buyerCountry,
        bool $buyerIsBusinessWithVAT
    ): array {
        $sellerCountry = strtoupper($sellerCountry);
        $buyerCountry = strtoupper($buyerCountry);

        $sellerInEU = in_array($sellerCountry, $this->euCountries);
        $buyerInEU = in_array($buyerCountry, $this->euCountries);

        $reverseCharge = false;
        $reason = '';
        $vatApplies = true;

        if ($sellerCountry === $buyerCountry) {
            // Domestic sale
            $reason = 'Domestic sale - standard VAT applies';
            $vatApplies = true;
        } elseif ($sellerInEU && $buyerInEU && $buyerIsBusinessWithVAT) {
            // B2B intra-EU
            $reverseCharge = true;
            $reason = 'Intra-EU B2B sale - reverse charge applies';
            $vatApplies = false;
        } elseif ($sellerInEU && $buyerInEU && !$buyerIsBusinessWithVAT) {
            // B2C intra-EU - OSS may apply
            $reason = 'Intra-EU B2C sale - destination country VAT applies (OSS)';
            $vatApplies = true;
        } elseif ($sellerInEU && !$buyerInEU) {
            // Export outside EU
            $reason = 'Export outside EU - zero-rated';
            $vatApplies = false;
        } elseif (!$sellerInEU && $buyerInEU && $buyerIsBusinessWithVAT) {
            // Import B2B
            $reverseCharge = true;
            $reason = 'Import from outside EU - reverse charge applies';
        } else {
            $reason = 'Standard VAT rules apply';
        }

        return [
            'seller_country' => $sellerCountry,
            'buyer_country' => $buyerCountry,
            'seller_in_eu' => $sellerInEU,
            'buyer_in_eu' => $buyerInEU,
            'buyer_is_business' => $buyerIsBusinessWithVAT,
            'reverse_charge' => $reverseCharge,
            'vat_applies' => $vatApplies,
            'reason' => $reason,
            'vat_country' => $vatApplies ? ($reverseCharge ? $buyerCountry : $sellerCountry) : null
        ];
    }

    /**
     * Get EU country list
     */
    public function getEUCountries(): array {
        return $this->euCountries;
    }

    /**
     * Check if country is EU member
     */
    public function isEUMember(string $countryCode): bool {
        return in_array(strtoupper($countryCode), $this->euCountries);
    }

    // ==================== INTRASTAT ====================

    /**
     * Create Intrastat declaration
     */
    public function createIntrastatDeclaration(
        string $companyId,
        string $type,
        int $year,
        int $month
    ): array {
        if (!in_array($type, ['arrival', 'dispatch'])) {
            throw new Exception("Invalid Intrastat type: $type");
        }

        $referencePeriod = sprintf('%04d-%02d', $year, $month);

        // Check for existing declaration
        $stmt = $this->pdo->prepare("
            SELECT id FROM intrastat_declarations
            WHERE company_id = ? AND declaration_type = ? AND reference_period = ?
        ");
        $stmt->execute([$companyId, $type, $referencePeriod]);
        if ($stmt->fetch()) {
            throw new Exception("Declaration already exists for $type $referencePeriod");
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO intrastat_declarations
            (company_id, declaration_type, reference_period, declaration_status)
            VALUES (?, ?, ?, 'draft')
            RETURNING *
        ");
        $stmt->execute([$companyId, $type, $referencePeriod]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Add item to Intrastat declaration
     */
    public function addIntrastatItem(string $declarationId, array $data): array {
        $statisticalValue = $data['statistical_value'] ?? $data['invoice_value'];

        $stmt = $this->pdo->prepare("
            INSERT INTO intrastat_items
            (declaration_id, cn_code, description, partner_country,
             transaction_type, transport_mode, delivery_terms, net_mass_kg,
             supplementary_units, statistical_value, invoice_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        ");
        $stmt->execute([
            $declarationId,
            $data['cn_code'],
            $data['description'] ?? null,
            $data['country_partner'],
            $data['transaction_type'] ?? '11',
            $data['transport_mode'] ?? '3',
            $data['delivery_terms'] ?? 'EXW',
            $data['net_mass_kg'] ?? 0,
            $data['supplementary_units'] ?? null,
            $statisticalValue,
            $data['invoice_id'] ?? null
        ]);

        // Update declaration totals
        $this->updateDeclarationTotals($declarationId);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Update declaration totals
     */
    private function updateDeclarationTotals(string $declarationId): void {
        $stmt = $this->pdo->prepare("
            UPDATE intrastat_declarations SET
                total_value = (SELECT COALESCE(SUM(statistical_value), 0) FROM intrastat_items WHERE declaration_id = ?),
                total_mass_kg = (SELECT COALESCE(SUM(net_mass_kg), 0) FROM intrastat_items WHERE declaration_id = ?),
                updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$declarationId, $declarationId, $declarationId]);
    }

    /**
     * Get Intrastat declaration with items
     */
    public function getIntrastatDeclaration(string $declarationId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM intrastat_declarations WHERE id = ?
        ");
        $stmt->execute([$declarationId]);
        $declaration = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$declaration) {
            return null;
        }

        $stmt = $this->pdo->prepare("
            SELECT * FROM intrastat_items WHERE declaration_id = ? ORDER BY created_at
        ");
        $stmt->execute([$declarationId]);
        $declaration['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $declaration;
    }

    /**
     * List Intrastat declarations for company
     */
    public function listIntrastatDeclarations(
        string $companyId,
        ?string $type = null,
        ?int $year = null
    ): array {
        $sql = "SELECT * FROM intrastat_declarations WHERE company_id = ?";
        $params = [$companyId];

        if ($type) {
            $sql .= " AND declaration_type = ?";
            $params[] = $type;
        }
        if ($year) {
            $sql .= " AND reference_period LIKE ?";
            $params[] = $year . '-%';
        }

        $sql .= " ORDER BY reference_period DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Submit Intrastat declaration
     */
    public function submitIntrastatDeclaration(string $declarationId): array {
        $declaration = $this->getIntrastatDeclaration($declarationId);

        if (!$declaration) {
            throw new Exception("Declaration not found");
        }

        if ($declaration['declaration_status'] !== 'draft') {
            throw new Exception("Only draft declarations can be submitted");
        }

        if (empty($declaration['items'])) {
            throw new Exception("Cannot submit declaration with no items");
        }

        $stmt = $this->pdo->prepare("
            UPDATE intrastat_declarations SET
                declaration_status = 'submitted',
                submitted_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
            RETURNING *
        ");
        $stmt->execute([$declarationId]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // ==================== OSS (One-Stop Shop) ====================

    /**
     * Register company for OSS
     */
    public function registerOSS(string $companyId, string $registrationCountry): array {
        if (!in_array($registrationCountry, $this->euCountries)) {
            throw new Exception("Invalid EU country for OSS registration");
        }

        // Check existing registration
        $stmt = $this->pdo->prepare("
            SELECT * FROM oss_registrations
            WHERE company_id = ? AND is_active = true
        ");
        $stmt->execute([$companyId]);
        if ($stmt->fetch()) {
            throw new Exception("Company already has active OSS registration");
        }

        $ossNumber = sprintf('EU%s%09d', $registrationCountry, rand(100000000, 999999999));

        $stmt = $this->pdo->prepare("
            INSERT INTO oss_registrations
            (company_id, registration_type, home_country, registration_number, is_active, registration_date)
            VALUES (?, 'union', ?, ?, true, CURRENT_DATE)
            RETURNING *
        ");
        $stmt->execute([$companyId, $registrationCountry, $ossNumber]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Record OSS sale
     */
    public function recordOSSSale(string $companyId, array $data): array {
        // Verify OSS registration
        $stmt = $this->pdo->prepare("
            SELECT * FROM oss_registrations
            WHERE company_id = ? AND is_active = true
        ");
        $stmt->execute([$companyId]);
        $registration = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$registration) {
            throw new Exception("Company not registered for OSS");
        }

        $customerCountry = strtoupper($data['destination_country']);
        if (!in_array($customerCountry, $this->euCountries)) {
            throw new Exception("Invalid EU destination country");
        }

        // Get VAT rate for destination country
        $vatRates = $this->getVATRates($customerCountry);
        $vatRate = $vatRates['standard_rate'];

        $netAmount = $data['net_amount'];
        $vatAmount = round($netAmount * (floatval($vatRate) / 100), 2);

        $declarationPeriod = date('Y-m', strtotime($data['sale_date']));

        $stmt = $this->pdo->prepare("
            INSERT INTO oss_sales
            (company_id, sale_date, customer_country, vat_rate, net_amount, vat_amount, declaration_period)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        ");

        $stmt->execute([
            $companyId,
            $data['sale_date'],
            $customerCountry,
            $vatRate,
            $netAmount,
            $vatAmount,
            $declarationPeriod
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get OSS report for period
     */
    public function getOSSReport(string $companyId, string $period): array {
        $stmt = $this->pdo->prepare("
            SELECT
                customer_country,
                COUNT(*) as transaction_count,
                SUM(net_amount) as total_net,
                vat_rate,
                SUM(vat_amount) as total_vat
            FROM oss_sales
            WHERE company_id = ? AND declaration_period = ?
            GROUP BY customer_country, vat_rate
            ORDER BY customer_country
        ");
        $stmt->execute([$companyId, $period]);
        $breakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate totals
        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(*) as total_transactions,
                SUM(net_amount) as total_net,
                SUM(vat_amount) as total_vat
            FROM oss_sales
            WHERE company_id = ? AND declaration_period = ?
        ");
        $stmt->execute([$companyId, $period]);
        $totals = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'company_id' => $companyId,
            'period' => $period,
            'country_breakdown' => $breakdown,
            'totals' => $totals,
            'generated_at' => date('Y-m-d H:i:s')
        ];
    }

    /**
     * Get OSS registration for company
     */
    public function getOSSRegistration(string $companyId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM oss_registrations
            WHERE company_id = ? AND is_active = true
        ");
        $stmt->execute([$companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}
