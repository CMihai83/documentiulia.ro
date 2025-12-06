<?php
/**
 * ANAF CUI/CIF Validation Service
 * Validates Romanian company tax identification codes
 * Optionally queries ANAF API for company details
 */

class ANAFValidationService
{
    private static ?ANAFValidationService $instance = null;
    private string $anafApiUrl = 'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva';
    private int $timeout = 10; // seconds
    private ?PDO $db = null;

    // Romanian CUI check digit weights
    private array $cuiWeights = [7, 5, 3, 2, 1, 7, 5, 3, 2];

    private function __construct()
    {
        try {
            require_once __DIR__ . '/../config/Database.php';
            $this->db = Database::getInstance()->getConnection();
        } catch (Exception $e) {
            // Database optional - validation still works
            $this->db = null;
        }
    }

    public static function getInstance(): ANAFValidationService
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Normalize CUI - remove RO prefix and spaces
     */
    public function normalizeCUI(string $cui): string
    {
        // Remove whitespace
        $cui = preg_replace('/\s+/', '', $cui);

        // Remove RO prefix if present (case insensitive)
        $cui = preg_replace('/^ro/i', '', $cui);

        // Remove any non-digit characters
        $cui = preg_replace('/[^0-9]/', '', $cui);

        return $cui;
    }

    /**
     * Validate CUI format and check digit
     */
    public function validateCUIFormat(string $cui): array
    {
        $normalizedCui = $this->normalizeCUI($cui);

        // Check length (Romanian CUI is 2-10 digits)
        $length = strlen($normalizedCui);
        if ($length < 2 || $length > 10) {
            return [
                'valid' => false,
                'normalized_cui' => $normalizedCui,
                'error' => 'CUI must be between 2 and 10 digits',
                'error_code' => 'INVALID_LENGTH'
            ];
        }

        // Check if all digits
        if (!ctype_digit($normalizedCui)) {
            return [
                'valid' => false,
                'normalized_cui' => $normalizedCui,
                'error' => 'CUI must contain only digits',
                'error_code' => 'INVALID_FORMAT'
            ];
        }

        // Calculate check digit
        $checkDigit = $this->calculateCheckDigit($normalizedCui);
        $lastDigit = (int)substr($normalizedCui, -1);

        if ($checkDigit !== $lastDigit) {
            return [
                'valid' => false,
                'normalized_cui' => $normalizedCui,
                'error' => 'Invalid check digit',
                'error_code' => 'INVALID_CHECK_DIGIT',
                'expected_check_digit' => $checkDigit
            ];
        }

        return [
            'valid' => true,
            'normalized_cui' => $normalizedCui,
            'formatted_cui' => 'RO' . $normalizedCui
        ];
    }

    /**
     * Calculate CUI check digit using Romanian algorithm
     */
    private function calculateCheckDigit(string $cui): int
    {
        // Remove last digit (check digit) for calculation
        $cuiBase = substr($cui, 0, -1);

        // Pad to 9 digits on the left
        $cuiBase = str_pad($cuiBase, 9, '0', STR_PAD_LEFT);

        // Calculate weighted sum
        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            $sum += (int)$cuiBase[$i] * $this->cuiWeights[$i];
        }

        // Calculate check digit
        $sum *= 10;
        $checkDigit = $sum % 11;

        // If result is 10, check digit is 0
        if ($checkDigit === 10) {
            $checkDigit = 0;
        }

        return $checkDigit;
    }

    /**
     * Query ANAF API for company details
     */
    public function queryANAF(string $cui, ?string $date = null): array
    {
        // Validate CUI format first
        $validation = $this->validateCUIFormat($cui);
        if (!$validation['valid']) {
            return [
                'success' => false,
                'error' => $validation['error'],
                'error_code' => $validation['error_code']
            ];
        }

        $normalizedCui = $validation['normalized_cui'];
        $date = $date ?? date('Y-m-d');

        // Check cache first
        $cachedData = $this->getCachedData($normalizedCui);
        if ($cachedData && $this->isCacheValid($cachedData)) {
            return [
                'success' => true,
                'source' => 'cache',
                'data' => $cachedData['data'],
                'cached_at' => $cachedData['cached_at']
            ];
        }

        // Query ANAF API
        try {
            $requestData = [[
                'cui' => (int)$normalizedCui,
                'data' => $date
            ]];

            $ch = curl_init($this->anafApiUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($requestData),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Accept: application/json'
                ],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => $this->timeout,
                CURLOPT_SSL_VERIFYPEER => true
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($error) {
                return [
                    'success' => false,
                    'error' => 'ANAF API connection error: ' . $error,
                    'error_code' => 'ANAF_CONNECTION_ERROR'
                ];
            }

            if ($httpCode !== 200) {
                return [
                    'success' => false,
                    'error' => 'ANAF API returned HTTP ' . $httpCode,
                    'error_code' => 'ANAF_HTTP_ERROR'
                ];
            }

            $data = json_decode($response, true);

            if (!$data || !isset($data['found'])) {
                return [
                    'success' => false,
                    'error' => 'Invalid response from ANAF API',
                    'error_code' => 'ANAF_INVALID_RESPONSE'
                ];
            }

            if (empty($data['found'])) {
                return [
                    'success' => false,
                    'error' => 'Company not found in ANAF database',
                    'error_code' => 'COMPANY_NOT_FOUND',
                    'cui' => $normalizedCui
                ];
            }

            // Parse company data
            $companyData = $this->parseANAFResponse($data['found'][0]);

            // Cache the result
            $this->cacheData($normalizedCui, $companyData);

            return [
                'success' => true,
                'source' => 'anaf_api',
                'data' => $companyData,
                'queried_at' => date('Y-m-d H:i:s')
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'ANAF API error: ' . $e->getMessage(),
                'error_code' => 'ANAF_EXCEPTION'
            ];
        }
    }

    /**
     * Parse ANAF API response into structured data
     */
    private function parseANAFResponse(array $data): array
    {
        $generalData = $data['date_generale'] ?? [];
        $vatData = $data['inregistrare_scop_Tva'] ?? null;
        $splitTvaData = $data['inregistrare_RTVAI'] ?? null;
        $inactiveData = $data['stare_inactiv'] ?? null;

        return [
            'cui' => $generalData['cui'] ?? null,
            'cif' => isset($generalData['cui']) ? 'RO' . $generalData['cui'] : null,
            'name' => $generalData['denumire'] ?? null,
            'address' => $generalData['adresa'] ?? null,
            'registration_number' => $generalData['nrRegCom'] ?? null,
            'phone' => $generalData['telefon'] ?? null,
            'fax' => $generalData['fax'] ?? null,
            'postal_code' => $generalData['codPostal'] ?? null,
            'status' => $generalData['statusRO'] ?? null,
            'caen_code' => $generalData['cod_CAEN'] ?? null,
            'caen_name' => $generalData['iban'] ?? null, // Field name in ANAF response

            // VAT status
            'vat_registered' => $vatData !== null,
            'vat_registration_date' => $vatData['dataInceputTvaRO'] ?? null,
            'vat_deregistration_date' => $vatData['dataAnulareTvaRO'] ?? null,
            'vat_status' => $vatData['statusTvaRO'] ?? 'not_registered',

            // Split VAT
            'split_vat_registered' => $splitTvaData !== null,
            'split_vat_date' => $splitTvaData['dataInceputSplitTVA'] ?? null,

            // Inactive status
            'is_inactive' => $inactiveData !== null && isset($inactiveData['dataInactivare']),
            'inactive_from' => $inactiveData['dataInactivare'] ?? null,
            'inactive_until' => $inactiveData['dataReactivare'] ?? null,
            'inactive_status' => $inactiveData['statusInactivi'] ?? null
        ];
    }

    /**
     * Get cached company data
     */
    private function getCachedData(string $cui): ?array
    {
        if (!$this->db) {
            return null;
        }

        try {
            $stmt = $this->db->prepare("
                SELECT data, cached_at
                FROM anaf_cache
                WHERE cui = :cui
                ORDER BY cached_at DESC
                LIMIT 1
            ");
            $stmt->execute([':cui' => $cui]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                return [
                    'data' => json_decode($row['data'], true),
                    'cached_at' => $row['cached_at']
                ];
            }
        } catch (Exception $e) {
            // Cache miss
        }

        return null;
    }

    /**
     * Check if cached data is still valid (24 hours)
     */
    private function isCacheValid(array $cachedData): bool
    {
        $cachedAt = strtotime($cachedData['cached_at']);
        $now = time();
        $maxAge = 24 * 60 * 60; // 24 hours

        return ($now - $cachedAt) < $maxAge;
    }

    /**
     * Cache company data
     */
    private function cacheData(string $cui, array $data): void
    {
        if (!$this->db) {
            return;
        }

        try {
            $stmt = $this->db->prepare("
                INSERT INTO anaf_cache (cui, data, cached_at)
                VALUES (:cui, :data, NOW())
                ON CONFLICT (cui) DO UPDATE SET
                    data = :data,
                    cached_at = NOW()
            ");
            $stmt->execute([
                ':cui' => $cui,
                ':data' => json_encode($data)
            ]);
        } catch (Exception $e) {
            // Cache failure - non-critical
        }
    }

    /**
     * Validate and optionally lookup CUI
     */
    public function validate(string $cui, bool $queryAnaf = false): array
    {
        // First validate format
        $validation = $this->validateCUIFormat($cui);

        $result = [
            'cui' => $cui,
            'normalized_cui' => $validation['normalized_cui'] ?? null,
            'format_valid' => $validation['valid'],
            'validation_errors' => []
        ];

        if (!$validation['valid']) {
            $result['validation_errors'][] = $validation['error'];
        } else {
            $result['formatted_cui'] = $validation['formatted_cui'];
        }

        // Optionally query ANAF
        if ($queryAnaf && $validation['valid']) {
            $anafResult = $this->queryANAF($cui);
            $result['anaf_lookup'] = $anafResult;

            if ($anafResult['success']) {
                $result['company'] = $anafResult['data'];
            }
        }

        return $result;
    }

    /**
     * Batch validate multiple CUIs
     */
    public function validateBatch(array $cuis, bool $queryAnaf = false): array
    {
        $results = [];
        foreach ($cuis as $cui) {
            $results[$cui] = $this->validate($cui, $queryAnaf);
        }
        return $results;
    }

    /**
     * Generate valid CUI (for testing purposes)
     */
    public function generateTestCUI(int $length = 8): string
    {
        // Generate random base (length - 1 digits)
        $base = '';
        for ($i = 0; $i < $length - 1; $i++) {
            $base .= mt_rand(0, 9);
        }

        // Remove leading zeros
        $base = ltrim($base, '0') ?: '1';

        // Pad back to correct length
        $base = str_pad($base, $length - 1, '0', STR_PAD_LEFT);

        // Add check digit
        $padded = str_pad($base, 9, '0', STR_PAD_LEFT);
        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            $sum += (int)$padded[$i] * $this->cuiWeights[$i];
        }
        $sum *= 10;
        $checkDigit = $sum % 11;
        if ($checkDigit === 10) {
            $checkDigit = 0;
        }

        return $base . $checkDigit;
    }
}
